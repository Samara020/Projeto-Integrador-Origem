import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const carrinhoRepository = {
  buscarPorUsuarioId(usuarioId: Id) {
    return prisma.carrinho.findUnique({
      where: { usuarioId: toId(usuarioId) },
      include: {
        itens: {
          orderBy: { numeroItem: "asc" },
          include: {
            produto: {
              include: { imagens: { take: 1 }, loja: { include: { usuario: { select: { nome: true } } } } },
            },
          },
        },
      },
    });
  },

  criar(usuarioId: Id) {
    return prisma.carrinho.create({
      data: { usuarioId: toId(usuarioId), status: "ATIVO", dataCriacao: new Date() },
    });
  },

  buscarItem(carrinhoId: Id, produtoId: Id) {
    return prisma.itemCarrinho.findFirst({
      where: { carrinhoId: toId(carrinhoId), produtoId: toId(produtoId) },
    });
  },

  async criarItem(dados: { carrinhoId: Id; produtoId: Id; quantidade: number; precoUnitario: any }) {
    const carrinhoId = toId(dados.carrinhoId);
    const ultimo = await prisma.itemCarrinho.aggregate({
      where: { carrinhoId },
      _max: { numeroItem: true },
    });
    return prisma.itemCarrinho.create({
      data: {
        carrinhoId,
        produtoId: toId(dados.produtoId),
        quantidade: dados.quantidade,
        precoUnitario: dados.precoUnitario,
        numeroItem: (ultimo._max.numeroItem ?? 0) + 1,
      },
    });
  },

  atualizarItem(carrinhoId: Id, numeroItem: number, quantidade: number) {
    return prisma.itemCarrinho.update({
      where: { carrinhoId_numeroItem: { carrinhoId: toId(carrinhoId), numeroItem } },
      data: { quantidade },
    });
  },

  removerItens(carrinhoId: Id, produtoId: Id) {
    return prisma.itemCarrinho.deleteMany({
      where: { carrinhoId: toId(carrinhoId), produtoId: toId(produtoId) },
    });
  },

  limpar(carrinhoId: Id) {
    return prisma.itemCarrinho.deleteMany({ where: { carrinhoId: toId(carrinhoId) } });
  },
};
