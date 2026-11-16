import { ErroApp } from "../middleware/error";
import { ticketRepository } from "../repositories";

export const suporteService = {
  async abrir(dados: {
    usuarioId: string;
    assunto: string;
    mensagem: string;
    pedidoId?: string;
    prioridade?: string;
  }) {
    const ticket = await ticketRepository.criar({
      usuarioId: dados.usuarioId,
      assunto: dados.assunto,
      mensagem: dados.mensagem,
      prioridade: dados.prioridade,
    });

    return {
      ticketId: ticket.id,
      status: ticket.status,
    };
  },

  async listarPorUsuario(usuarioId: string) {
    const tickets = await ticketRepository.listarPorUsuario(usuarioId);
    return {
      tickets: tickets.map((t: any) => ({
        ticketId: t.id,
        assunto: t.assunto,
        status: t.status,
      })),
    };
  },

  async buscarPorId(id: string) {
    const ticket = await ticketRepository.buscarPorId(id);
    if (!ticket) throw new ErroApp(404, "Ticket nao encontrado.");

    return {
      ticketId: ticket.id,
      assunto: ticket.assunto,
      status: ticket.status,
      prioridade: ticket.prioridade,
      criadoEm: ticket.criadoEm,
      mensagens: ticket.mensagens.map((m: any) => ({
        id: m.id,
        autor: m.autor,
        texto: m.texto,
        criadoEm: m.criadoEm,
      })),
    };
  },
};
