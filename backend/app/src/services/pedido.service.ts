import { ErroApp } from "../middleware/error";
import { pedidoRepository } from "../repositories";
import { compraRepository } from "../repositories/compra.repository";
import prisma from "../lib/prisma";
import { toId } from "../lib/ids";

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
    return compraRepository.checkout(usuarioId, dados.enderecoEntrega);
  },

  cancelar(usuarioId: string, pedidoId: string) {
    return compraRepository.cancelar(usuarioId, pedidoId);
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

  async atualizarStatus(id: string, dados: { status: string; codigoRastreio?: string | null }, usuarioId: string) {
    const pedido = await prisma.pedido.findUnique({ where: { id: toId(id) },
      include: { itens: { include: { produto: { include: { loja: true } } } } } });
    if (!pedido) throw new ErroApp(404, "Pedido nao encontrado.");
    // O status pertence ao pedido inteiro: uma loja não pode alterar um pedido misto.
    if (!pedido.itens.length || pedido.itens.some((i) => i.produto.loja.usuarioId !== toId(usuarioId))) {
      throw new ErroApp(403, "Voce so pode alterar pedidos da sua loja.");
    }
    if (!["EM_PRODUCAO", "PRONTO", "ENVIADO", "ENTREGUE"].includes(dados.status)) {
      throw new ErroApp(400, "Status de envio invalido.");
    }
    if (["AGUARDANDO_PAGAMENTO", "CANCELADO"].includes(pedido.status)) {
      throw new ErroApp(409, "Pedido ainda nao pode ser enviado.");
    }
    return pedidoRepository.atualizarStatus(id, {
      status: dados.status,
      codigoRastreio: dados.codigoRastreio ?? null,
    });
  },
};
