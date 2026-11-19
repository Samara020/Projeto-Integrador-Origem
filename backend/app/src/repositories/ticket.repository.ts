import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const ticketRepository = {
  criar(dados: { usuarioId: Id; assunto: string; mensagem: string; prioridade?: string }) {
    return prisma.ticket.create({
      data: { usuarioId: toId(dados.usuarioId), assunto: dados.assunto, prioridade: dados.prioridade ?? "NORMAL",
        mensagens: { create: { autor: "COMPRADOR", texto: dados.mensagem } } },
      include: { mensagens: { orderBy: { id: "asc" } } },
    });
  },
  listarPorUsuario(usuarioId: Id) {
    return prisma.ticket.findMany({ where: { usuarioId: toId(usuarioId) }, orderBy: { id: "desc" }, include: { mensagens: { orderBy: { id: "asc" } } } });
  },
  buscarPorId(id: Id) {
    return prisma.ticket.findUnique({ where: { id: toId(id) }, include: { mensagens: { orderBy: { id: "asc" } } } });
  },
};
