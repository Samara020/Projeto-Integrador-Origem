import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

const incluir = { produto: true, usuario: true };
export const avaliacaoRepository = {
  criar(dados: { usuarioId: Id; produtoId: Id; nota: number; comentario?: string | null; status?: string; motivo?: string | null }) {
    return prisma.avaliacao.create({ data: {
      nota: dados.nota, comentario: dados.comentario ?? null, usuarioId: toId(dados.usuarioId),
      produtoId: toId(dados.produtoId), dataAvaliacao: new Date(), status: dados.status ?? "PUBLICADO",
      motivo: dados.motivo ?? null, sinalizadaEm: dados.motivo ? new Date() : null,
    } });
  },
  buscarPedidoDoProduto(usuarioId: Id, produtoId: Id) {
    return prisma.pedido.findFirst({
      where: { usuarioId: toId(usuarioId), status: { in: ["PAGO", "EM_PRODUCAO", "PRONTO", "ENVIADO", "ENTREGUE"] }, itens: { some: { produtoId: toId(produtoId) } } },
      orderBy: { id: "desc" },
    });
  },
  listarPorProduto(produtoId: Id) {
    return prisma.avaliacao.findMany({ where: { produtoId: toId(produtoId), status: "PUBLICADO" }, orderBy: { dataAvaliacao: "desc" }, include: incluir });
  },
  listarPorLoja(lojaId: Id) {
    return prisma.avaliacao.findMany({ where: { produto: { lojaId: toId(lojaId) }, status: "PUBLICADO" }, orderBy: { dataAvaliacao: "desc" }, include: incluir });
  },
  buscarPorId(id: Id) { return prisma.avaliacao.findUnique({ where: { id: toId(id) } }); },
  moderar(id: Id, status: "PUBLICADO" | "REMOVIDO") {
    return prisma.avaliacao.update({ where: { id: toId(id) }, data: { status, moderadaEm: new Date() } });
  },
  listarParaModeracao(filtros: { status?: string }) {
    return prisma.avaliacao.findMany({
      where: filtros.status ? { status: filtros.status } : { motivo: { not: null } },
      orderBy: { dataAvaliacao: "desc" },
      include: { produto: { select: { id: true, nome: true, imagens: { take: 1 } } }, usuario: { select: { nome: true } } },
    });
  },
  listarPorComprador(usuarioId: Id) {
    return prisma.avaliacao.findMany({ where: { usuarioId: toId(usuarioId) }, orderBy: { dataAvaliacao: "desc" }, include: { produto: { select: { nome: true, imagens: { take: 1 } } } } });
  },
};
