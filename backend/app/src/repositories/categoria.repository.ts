import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const categoriaRepository = {
  buscarPorNome(nome: string) {
    return prisma.categoria.findFirst({ where: { nome } });
  },

  async buscarOuCriar(nome: string) {
    let categoria = await prisma.categoria.findFirst({ where: { nome } });
    if (!categoria) {
      categoria = await prisma.categoria.create({ data: { nome } });
    }
    return categoria;
  },

  listar() {
    return prisma.categoria.findMany({ orderBy: { nome: "asc" } });
  },

  buscarPorId(id: Id) {
    return prisma.categoria.findUnique({ where: { id: toId(id) } });
  },
};
