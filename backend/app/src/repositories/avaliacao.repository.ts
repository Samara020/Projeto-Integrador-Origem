import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { avaliacoesRemovidas } from "../lib/memoria";

const removidas = () => Array.from(avaliacoesRemovidas);

export const avaliacaoRepository = {
  criar(dados: {
    usuarioId: Id;
    produtoId: Id;
    nota: number;
    comentario?: string | null;
  }) {
    return prisma.avaliacao.create({
      data: {
        nota: dados.nota,
        comentario: dados.comentario ?? null,
        usuarioId: toId(dados.usuarioId),
        produtoId: toId(dados.produtoId),
        dataAvaliacao: new Date(),
      },
    });
  },

  /** Retorna o pedido do usuario que contem o produto (compra verificada). */
  buscarPedidoDoProduto(usuarioId: Id, produtoId: Id) {
    return prisma.pedido.findFirst({
      where: {
        usuarioId: toId(usuarioId),
        itens: { some: { produtoId: toId(produtoId) } },
      },
      orderBy: { id: "desc" },
    });
  },

  listarPorProduto(produtoId: Id) {
    return prisma.avaliacao.findMany({
      where: { produtoId: toId(produtoId), id: { notIn: removidas() } },
      orderBy: { dataAvaliacao: "desc" },
      take: 20,
      include: { produto: true, usuario: true },
    });
  },

  listarPorLoja(lojaId: Id) {
    return prisma.avaliacao.findMany({
      where: { produto: { lojaId: toId(lojaId) }, id: { notIn: removidas() } },
      orderBy: { dataAvaliacao: "desc" },
      take: 20,
      include: { produto: true, usuario: true },
    });
  },

  buscarPorId(id: Id) {
    return prisma.avaliacao.findUnique({ where: { id: toId(id) } });
  },

  /** O SQL nao tem status de avaliacao: a moderacao fica em memoria. */
  moderar(id: Id, status: "PUBLICADO" | "REMOVIDO") {
    const n = toId(id);
    if (status === "REMOVIDO") avaliacoesRemovidas.add(n);
    else avaliacoesRemovidas.delete(n);
  },

  async listarParaModeracao(filtros: { status?: string }) {
    const onde =
      filtros.status === "REMOVIDO"
        ? { id: { in: removidas() } }
        : filtros.status
          ? { id: { notIn: removidas() } }
          : {};
    return prisma.avaliacao.findMany({
      where: onde,
      orderBy: { dataAvaliacao: "desc" },
      include: {
        produto: { select: { id: true, nome: true } },
        usuario: { select: { nome: true } },
      },
    });
  },

  listarPorComprador(usuarioId: Id) {
    return prisma.avaliacao.findMany({
      where: { usuarioId: toId(usuarioId) },
      orderBy: { dataAvaliacao: "desc" },
      include: { produto: { select: { nome: true, imagens: { take: 1 } } } },
    });
  },
};
