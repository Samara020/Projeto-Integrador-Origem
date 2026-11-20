import { ErroApp } from "../middleware/error";
import {
  carrinhoRepository,
  pedidoRepository,
} from "../repositories";

const STATUS_FINAIS = ["ENTREGUE", "CANCELADO"];

function obterProximaAcao(status: string, codigoRastreio?: string | null): string {
  if (status === "ENVIADO" && codigoRastreio) return "VER_RASTREIO";
  switch (status) {
    case "NOVO":
    case "PAGO":
      return "ACEITAR";
    case "EM_PRODUCAO":
      return "MARCAR_PRONTO";
    case "PRONTO":
      return "INFORMAR_RASTREIO";
    case "ENVIADO":
      return "VER_RASTREIO";
    case "ENTREGUE":
    case "CANCELADO":
      return "NENHUMA";
    default:
      return "NENHUMA";
  }
}

export const pedidoService = {
  async checkout(
    usuarioId: string,
    dados: {
      opcaoEnvioId?: string;
      enderecoEntrega: {
        cep: string;
        rua: string;
        numero: string;
        bairro?: string;
        cidade?: string;
        cpf?: string;
      };
    }
  ) {
    const carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    if (!carrinho) {
      throw new ErroApp(400, "Carrinho vazio.");
    }

    const e = dados.enderecoEntrega;
    // O SQL exige bairro, cidade e CPF; sem eles no payload, usa valores neutros.
    const endereco = {
      logradouro: `${e.rua}, ${e.numero} - CEP ${e.cep}`,
      bairro: e.bairro ?? "Nao informado",
      cidade: e.cidade ?? "Nao informada",
      cpf: e.cpf ?? "00000000000",
    };

    const resultado = await pedidoRepository.criarCheckout({
      usuarioId,
      carrinhoId: carrinho.id,
      endereco,
      opcaoEnvioId: dados.opcaoEnvioId,
    });

    return {
      pedidoId: resultado.pedido.id,
      status: resultado.pedido.status,
      valorTotal: resultado.valorTotal,
      valorFrete: resultado.valorFrete,
    };
  },

  async buscarDoComprador(usuarioId: string, pedidoId: string) {
    const p: any = await pedidoRepository.buscarDetalhePorUsuario(pedidoId, usuarioId);
    if (!p) throw new ErroApp(404, "Pedido nao encontrado.");
    return {
      id: p.id,
      status: p.status,
      valorTotal: p.itens.reduce((s: number, i: any) => s + Number(i.subtotal), 0) + Number(p.valorFrete),
      criadoEm: p.data,
      itens: p.itens.map((i: any) => ({
        produtoId: i.produtoId,
        nome: i.produto.nome,
        imagemPrincipal: i.produto.imagens[0]?.url ?? "",
        quantidade: i.quantidade,
        precoUnitario: Number(i.precoUnitario),
      })),
      historico: p.historico.map((h: any) => ({ status: h.status, data: h.data })),
      codigoRastreio: pedidoRepository.extrairRastreio(p.historico),
      enderecoEntrega: p.enderecoEntrega
        ? {
            logradouro: p.enderecoEntrega.logradouro,
            bairro: p.enderecoEntrega.bairro,
            cidade: p.enderecoEntrega.cidade,
          }
        : null,
    };
  },

  async listarPorUsuario(usuarioId: string) {
    const pedidos = await pedidoRepository.listarPorUsuario(usuarioId);
    return {
      pedidos: pedidos.map((p: any) => ({
        id: p.id,
        status: p.status,
        valorTotal: p.itens.reduce((s: number, i: any) => s + Number(i.subtotal), 0) + Number(p.valorFrete),
        criadoEm: p.data,
        itens: p.itens.map((i: any) => ({
          produtoId: i.produtoId,
          nome: i.produto.nome,
          imagemPrincipal: i.produto.imagens[0]?.url ?? "",
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnitario),
        })),
      })),
    };
  },

  async listarRecebidosPorArtesao(usuarioId: string) {
    const { lojaRepository } = await import("../repositories/loja.repository");
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      return { pedidosRecebidos: [] };
    }

    const pedidos = await pedidoRepository.listarRecebidosPorLoja(loja.id);
    return {
      pedidosRecebidos: pedidos.map((p: any) => {
        const itensDaLoja = p.itens.filter(
          (i: any) => !i.produto?.lojaId || Number(i.produto.lojaId) === Number(loja.id)
        );
        const rastreio = pedidoRepository.extrairRastreio(p.historico);
        const statusProducao = p.status === "PAGO" ? "NOVO" : p.status;
        const local = p.enderecoEntrega?.cidade
          ? `${p.enderecoEntrega.cidade}, PE`
          : "Pernambuco";

        return {
          id: p.id,
          criadoEm: p.data,
          statusProducao,
          comprador: {
            nome: p.usuario?.nome ?? "Comprador",
            local,
          },
          itens: itensDaLoja.map((i: any) => ({
            produtoId: i.produtoId,
            nome: i.produto.nome,
            quantidade: i.quantidade,
            precoUnitario: Number(i.precoUnitario),
          })),
          valorTotal: itensDaLoja.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
          proximaAcao: obterProximaAcao(statusProducao, rastreio),
          codigoRastreio: rastreio,
        };
      }),
    };
  },

  async atualizarStatus(
    usuarioId: string,
    id: string,
    dados: { statusProducao: string; codigoRastreio?: string | null }
  ) {
    const { lojaRepository } = await import("../repositories/loja.repository");
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    const pedido = loja ? await pedidoRepository.buscarDaLoja(id, loja.id) : null;
    if (!pedido) throw new ErroApp(404, "Pedido nao encontrado.");

    if (STATUS_FINAIS.includes(pedido.status)) {
      throw new ErroApp(409, `Pedido ja esta ${pedido.status} e nao pode mais ser alterado.`);
    }

    const itens = (pedido as any).itens ?? [];
    const lojasDoPedido = new Set(itens.map((item: any) => Number(item.produto?.lojaId)));
    if (lojasDoPedido.size > 1) {
      throw new ErroApp(409, "Pedidos com itens de várias lojas não podem ser alterados globalmente. Separe em subpedidos antes.");
    }

    if (dados.statusProducao === "ENVIADO" && !dados.codigoRastreio) {
      throw new ErroApp(400, "Informe o codigo de rastreio para marcar como enviado.");
    }

    return pedidoRepository.atualizarStatus(pedido.id, {
      status: dados.statusProducao,
      codigoRastreio: dados.codigoRastreio ?? null,
    });
  },
};
