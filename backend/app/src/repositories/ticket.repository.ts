import { Id, toId } from "../lib/ids";

/**
 * O esquema SQL nao tem tabelas de suporte. Os tickets ficam em memoria
 * e sao perdidos ao reiniciar a API.
 */
type Mensagem = { id: number; autor: string; texto: string; criadoEm: Date };
type Ticket = {
  id: number;
  usuarioId: number;
  assunto: string;
  mensagem: string;
  status: string;
  prioridade: string;
  criadoEm: Date;
  mensagens: Mensagem[];
};

const tickets: Ticket[] = [];
let proximoId = 1;

export const ticketRepository = {
  async criar(dados: {
    usuarioId: Id;
    assunto: string;
    mensagem: string;
    prioridade?: string;
  }) {
    const criadoEm = new Date();
    const ticket: Ticket = {
      id: proximoId++,
      usuarioId: toId(dados.usuarioId),
      assunto: dados.assunto,
      mensagem: dados.mensagem,
      prioridade: dados.prioridade ?? "NORMAL",
      status: "TRIAGEM_INTELIGENTE",
      criadoEm,
      mensagens: [{ id: 1, autor: "COMPRADOR", texto: dados.mensagem, criadoEm }],
    };
    tickets.push(ticket);
    return ticket;
  },

  async listarPorUsuario(usuarioId: Id) {
    const uid = toId(usuarioId);
    return tickets.filter((t) => t.usuarioId === uid).reverse();
  },

  async buscarPorId(id: Id) {
    const n = toId(id);
    return tickets.find((t) => t.id === n) ?? null;
  },
};
