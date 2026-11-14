import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";

const PREFIXO_RASTREIO = "Rastreio: ";

export const pedidoRepository = {
  /**
   * Checkout atomico: valida e baixa o estoque, grava endereco, pedido, itens e
   * historico e esvazia o carrinho. Qualquer falha desfaz tudo (rollback).
   */
  criarCheckout(dados: {
    usuarioId: Id;
    carrinhoId: Id;
    endereco: { logradouro: string; bairro: string; cidade: string; cpf: string };
    itens: { produtoId: Id; quantidade: number; precoUnitario: any; subtotal: any }[];
  }) {
    return prisma.$transaction(async (tx) => {
      for (const item of dados.itens) {
        const baixa = await tx.estoque.updateMany({
          where: {
            produtoId: toId(item.produtoId),
            quantidadeDisponivel: { gte: item.quantidade },
          },
          data: { quantidadeDisponivel: { decrement: item.quantidade } },
        });
        if (baixa.count === 0) {
          throw new ErroApp(409, "Estoque insuficiente para um dos itens do carrinho.");
        }
      }

      const endereco = await tx.enderecoEntrega.create({ data: dados.endereco });

      const pedido = await tx.pedido.create({
        data: {
          usuarioId: toId(dados.usuarioId),
          enderecoEntregaId: endereco.id,
          status: "AGUARDANDO_PAGAMENTO",
          data: new Date(),
          itens: {
            create: dados.itens.map((i, indice) => ({
              numeroItem: indice + 1,
              produtoId: toId(i.produtoId),
              quantidade: i.quantidade,
              precoUnitario: i.precoUnitario,
              subtotal: i.subtotal,
            })),
          },
          historico: {
            create: { status: "AGUARDANDO_PAGAMENTO", observacao: null, data: new Date() },
          },
        },
        include: {
          itens: { include: { produto: { select: { nome: true, imagens: { take: 1 } } } } },
        },
      });

      await tx.itemCarrinho.deleteMany({ where: { carrinhoId: toId(dados.carrinhoId) } });
      return pedido;
    });
  },

  /** Pedido do comprador com itens, produto, historico e endereco de entrega. */
  buscarDetalhePorUsuario(id: Id, usuarioId: Id) {
    return prisma.pedido.findFirst({
      where: { id: toId(id), usuarioId: toId(usuarioId) },
      include: {
        itens: {
          orderBy: { numeroItem: "asc" },
          include: { produto: { select: { nome: true, imagens: { take: 1 } } } },
        },
        historico: { orderBy: { id: "asc" } },
        enderecoEntrega: true,
      },
    });
  },

  /** Pedido que contem ao menos um item da loja informada. */
  buscarDaLoja(id: Id, lojaId: Id) {
    return prisma.pedido.findFirst({
      where: { id: toId(id), itens: { some: { produto: { lojaId: toId(lojaId) } } } },
    });
  },

  buscarPorId(id: Id) {
    return prisma.pedido.findUnique({
      where: { id: toId(id) },
      include: { itens: true },
    });
  },

  listarPorUsuario(usuarioId: Id) {
    return prisma.pedido.findMany({
      where: { usuarioId: toId(usuarioId) },
      orderBy: { data: "desc" },
      include: {
        itens: {
          orderBy: { numeroItem: "asc" },
          include: {
            produto: { select: { nome: true, imagens: { take: 1 } } },
          },
        },
      },
    });
  },

  listarRecebidosPorLoja(lojaId: Id) {
    return prisma.pedido.findMany({
      where: { itens: { some: { produto: { lojaId: toId(lojaId) } } } },
      orderBy: { data: "desc" },
      include: {
        itens: { include: { produto: true } },
        usuario: { select: { nome: true } },
        historico: { orderBy: { id: "desc" } },
        enderecoEntrega: true,
      },
    });
  },

  /** O SQL nao tem coluna de rastreio: o codigo fica no historico do pedido. */
  async atualizarStatus(id: Id, dados: { status: string; codigoRastreio?: string | null }) {
    const pedidoId = toId(id);
    return prisma.$transaction(async (tx) => {
      const pedidoAnterior = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { itens: true },
      });
      if (!pedidoAnterior) {
        throw new ErroApp(404, "Pedido nao encontrado.");
      }

      const pedido = await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: dados.status },
      });

      await tx.historicoPedido.create({
        data: {
          pedidoId,
          status: dados.status,
          observacao: dados.codigoRastreio ? PREFIXO_RASTREIO + dados.codigoRastreio : null,
          data: new Date(),
        },
      });

      // Se o pedido for cancelado, restaura as quantidades no estoque
      if (dados.status === "CANCELADO" && pedidoAnterior.status !== "CANCELADO") {
        for (const item of pedidoAnterior.itens) {
          await tx.estoque.updateMany({
            where: { produtoId: item.produtoId },
            data: { quantidadeDisponivel: { increment: item.quantidade } },
          });
        }
      }

      return {
        id: pedido.id,
        statusProducao: pedido.status,
        codigoRastreio: dados.codigoRastreio ?? null,
      };
    });
  },

  extrairRastreio(historico: { observacao: string | null }[]): string | null {
    const h = historico.find((x) => x.observacao?.startsWith(PREFIXO_RASTREIO));
    return h ? h.observacao!.slice(PREFIXO_RASTREIO.length) : null;
  },
};
