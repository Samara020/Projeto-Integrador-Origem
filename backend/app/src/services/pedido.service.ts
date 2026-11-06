import { ErroApp } from "../middleware/error";
import {
  carrinhoRepository,
  enderecoRepository,
  pedidoRepository,
  pagamentoRepository,
} from "../repositories";

export const pedidoService = {
  async checkout(usuarioId: string, dados: {
      enderecoEntrega: {
        cep: string;
        rua: string;
        numero: string;
        bairro?: string;
        cidade?: string;
        cpf?: string;
      };
    }) {
    const carrinho = await carrinhoRepository.buscarPorUsuarioId(usuarioId);
    if (!carrinho || carrinho.itens.length === 0) {
      throw new ErroApp(400, "Carrinho vazio.");
    }

    let endereco = await enderecoRepository.buscarPorUsuarioId(usuarioId);
    if (!endereco) {
      const e = dados.enderecoEntrega;
      // O SQL exige bairro, cidade e CPF; sem eles no payload, usa valores neutros.
      endereco = await enderecoRepository.criar({
        logradouro: `${e.rua}, ${e.numero} - CEP ${e.cep}`,
        bairro: e.bairro ?? "Nao informado",
        cidade: e.cidade ?? "Nao informada",
        cpf: e.cpf ?? "00000000000",
      });
    }

    const valorTotal = carrinho.itens.reduce(
      (s: number, i: any) => s + Number(i.produto.preco) * i.quantidade,
      0
    );

    const pedido = await pedidoRepository.criarCheckout({
      usuarioId,
      enderecoEntregaId: endereco.id,
      itens: carrinho.itens.map((item: any) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        subtotal: Number(item.precoUnitario) * item.quantidade,
      })),
    });

    await carrinhoRepository.limpar(carrinho.id);

    return {
      pedidoId: pedido.id,
      status: pedido.status,
      valorTotal,
    };
  },

  async listarPorUsuario(usuarioId: string) {
    const pedidos = await pedidoRepository.listarPorUsuario(usuarioId);
    return {
      pedidos: pedidos.map((p: any) => ({
        id: p.id,
        status: p.status,
        valorTotal: p.itens.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
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
    // Buscar loja do usuário
    const { lojaRepository } = await import("../repositories/loja.repository");
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      return { pedidosRecebidos: [] };
    }

    const pedidos = await pedidoRepository.listarRecebidosPorLoja(loja.id);
    return {
      pedidosRecebidos: pedidos.map((p: any) => ({
        id: p.id,
        criadoEm: p.data,
        statusProducao: p.status,
        comprador: { nome: p.usuario.nome, local: "Pernambuco" },
        itens: p.itens.map((i: any) => ({
          produtoId: i.produtoId,
          nome: i.produto.nome,
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnitario),
        })),
        valorTotal: p.itens.reduce((s: number, i: any) => s + Number(i.subtotal), 0),
        proximaAcao: "ACEITAR",
        codigoRastreio: pedidoRepository.extrairRastreio(p.historico),
      })),
    };
  },

  async atualizarStatus(id: string, dados: { status: string; codigoRastreio?: string | null }) {
    return pedidoRepository.atualizarStatus(id, {
      status: dados.status,
      codigoRastreio: dados.codigoRastreio ?? null,
    });
  },
};
