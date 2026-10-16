"use client";

import { useEffect, useSyncExternalStore } from "react";
import { suporteService } from "@/services/suporte";
import { ticketsStore } from "@/store/suporte";
import type { NovoTicket, Ticket } from "@/types";

let carregados = false;

async function carregarUmaVez() {
  if (carregados) return;
  carregados = true;
  ticketsStore.definir(await suporteService.listar());
}

function guardar(ticket: Ticket) {
  const atual = ticketsStore.obter() ?? [];
  ticketsStore.definir([ticket, ...atual.filter((t) => t.ticketId !== ticket.ticketId)]);
  return ticket;
}

export function useTickets() {
  const tickets = useSyncExternalStore(ticketsStore.assinar, ticketsStore.obter, () => null);
  useEffect(() => {
    void carregarUmaVez();
  }, []);
  return {
    tickets: tickets ?? [],
    carregando: tickets === null,
    abrir: async (novo: NovoTicket) => guardar(await suporteService.abrir(novo)),
    responder: async (id: string, texto: string) => guardar(await suporteService.responder(id, texto)),
    escalar: async (id: string) => guardar(await suporteService.escalar(id)),
    voltarParaAssistente: async (id: string) => guardar(await suporteService.voltarParaAssistente(id)),
    resolver: async (id: string) => guardar(await suporteService.resolver(id)),
  };
}

export function useTicket(ticketId: string) {
  const lista = useTickets();
  const ticket = lista.tickets.find((t) => t.ticketId === ticketId) ?? null;
  return { ...lista, ticket, naoEncontrado: !lista.carregando && ticket === null };
}
