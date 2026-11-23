import { ErroApp } from "../middleware/error";
import { toId } from "../lib/ids";
import { ticketRepository } from "../repositories";

const apresentar = (t: any) => ({
  ticketId: t.id, assunto: t.assunto, status: t.status, prioridade: t.prioridade, criadoEm: t.criadoEm,
  mensagens: t.mensagens.map((m: any) => ({ id: m.id, autor: m.autor, texto: m.texto, criadoEm: m.criadoEm, categoria: m.categoria, sugestoes: m.sugestoes })),
});

export const suporteService = {
  async abrir(dados: { usuarioId: string; assunto: string; mensagem: string; prioridade?: string }) {
    const ticket = await ticketRepository.criar(dados);
    return { ticketId: ticket.id, status: ticket.status };
  },
  async listarPorUsuario(usuarioId: string) {
    return { tickets: (await ticketRepository.listarPorUsuario(usuarioId)).map(apresentar) };
  },
  async buscarPorId(id: string, usuarioId: string) {
    const ticket = await ticketRepository.buscarPorId(id);
    if (!ticket || ticket.usuarioId !== toId(usuarioId)) throw new ErroApp(404, "Ticket não encontrado.");
    return apresentar(ticket);
  },
  async responder(id: string, usuarioId: string, texto: string) {
    await this.buscarPorId(id, usuarioId);
    const ticket = await ticketRepository.responder(id, texto);
    return apresentar(ticket);
  },
  async alterarStatus(id: string, usuarioId: string, status: string) {
    await this.buscarPorId(id, usuarioId);
    const ticket = await ticketRepository.alterarStatus(id, status);
    return apresentar(ticket);
  },
};
