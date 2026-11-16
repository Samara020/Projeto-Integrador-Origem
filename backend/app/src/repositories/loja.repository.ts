import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const lojaRepository = {
  buscarPorUsuarioId(usuarioId: Id) {
    return prisma.loja.findFirst({
      where: { usuarioId: toId(usuarioId) },
      orderBy: { id: "asc" },
    });
  },

  buscarPorId(id: Id) {
    return prisma.loja.findUnique({ where: { id: toId(id) } });
  },

  criar(dados: { nome: string; usuarioId: Id }) {
    return prisma.loja.create({
      data: { nome: dados.nome, usuarioId: toId(dados.usuarioId) },
    });
  },

  atualizar(id: Id, dados: { nome?: string; descricao?: string }) {
    return prisma.loja.update({ where: { id: toId(id) }, data: dados });
  },

  listarProdutos(lojaId: Id) {
    return prisma.produto.findMany({ where: { lojaId: toId(lojaId) } });
  },
};
