"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSessao } from "@/hooks/useSessao";
import { ApiError } from "@/lib/http";
import { suporteService } from "@/services/suporte";
import { ticketsStore } from "@/store/suporte";
import type { NovoTicket, Ticket } from "@/types";

function normalizarTicket(ticket: Ticket): Ticket {
  return {
    ...ticket,
    ticketId: String(ticket.ticketId),
    mensagens: Array.isArray(ticket.mensagens) ? ticket.mensagens : [],
  };
}

function guardar(ticket: Ticket) {
  const normalizado = normalizarTicket(ticket);
  const atual = ticketsStore.obter() ?? [];
  ticketsStore.definir([
    normalizado,
    ...atual.filter((t) => String(t.ticketId) !== normalizado.ticketId),
  ]);
  return normalizado;
}

export function useTickets() {
  const { usuario, pronta } = useSessao();
  const ultimoUsuario = useRef<string | null>(null);
  const [erro, setErro] = useState<ApiError | null>(null);
  const tickets = useSyncExternalStore(ticketsStore.assinar, ticketsStore.obter, () => null);

  const recarregar = useCallback(() => {
    if (!pronta || !usuario) return;
    suporteService
      .listar()
      .then((lista) => {
        setErro(null);
        ticketsStore.definir(lista.map(normalizarTicket));
      })
      .catch((causa) => {
        setErro(
          causa instanceof ApiError
            ? causa
            : new ApiError(0, "Não foi possível carregar os tickets."),
        );
        ticketsStore.definir([]);
      });
  }, [pronta, usuario]);

  useEffect(() => {
    if (!pronta) return;
    if (!usuario) {
      ultimoUsuario.current = null;
      ticketsStore.definir([]);
      return;
    }
    if (ultimoUsuario.current === usuario.id) return;
    ultimoUsuario.current = usuario.id;
    let ativo = true;
    suporteService
      .listar()
      .then((lista) => {
        if (!ativo) return;
        setErro(null);
        ticketsStore.definir(lista.map(normalizarTicket));
      })
      .catch((causa) => {
        if (!ativo) return;
        setErro(
          causa instanceof ApiError
            ? causa
            : new ApiError(0, "Não foi possível carregar os tickets."),
        );
        ticketsStore.definir([]);
      });
    return () => {
      ativo = false;
    };
  }, [pronta, usuario]);

  return {
    tickets: tickets ?? [],
    carregando: !pronta || (Boolean(usuario) && tickets === null),
    erro: usuario ? erro : null,
    recarregar,
    autenticado: Boolean(usuario),
    abrir: async (novo: NovoTicket) => guardar(await suporteService.abrir(novo)),
    responder: async (id: string, texto: string) =>
      guardar(await suporteService.responder(id, texto)),
    escalar: async (id: string) => guardar(await suporteService.escalar(id)),
    voltarParaAssistente: async (id: string) =>
      guardar(await suporteService.voltarParaAssistente(id)),
    resolver: async (id: string) => guardar(await suporteService.resolver(id)),
  };
}

export function useTicket(ticketId: string) {
  const { usuario, pronta } = useSessao();
  const lista = useTickets();
  const [tentativa, setTentativa] = useState(0);
  const [estadoDetalhe, setEstadoDetalhe] = useState<{
    chave: string;
    ticket: Ticket | null;
    erro: ApiError | null;
  } | null>(null);

  const recarregar = useCallback(() => {
    lista.recarregar();
    setTentativa((n) => n + 1);
  }, [lista]);

  const chaveBusca =
    ticketId && pronta && usuario ? `${usuario.id}:${ticketId}:${tentativa}` : null;

  useEffect(() => {
    if (!chaveBusca || !ticketId) return;
    let ativo = true;
    suporteService
      .buscar(ticketId)
      .then((t) => {
        if (!ativo) return;
        const normalizado = guardar(t);
        setEstadoDetalhe({ chave: chaveBusca, ticket: normalizado, erro: null });
      })
      .catch((causa) => {
        if (!ativo) return;
        setEstadoDetalhe({
          chave: chaveBusca,
          ticket: null,
          erro:
            causa instanceof ApiError
              ? causa
              : new ApiError(0, "Não foi possível carregar o ticket."),
        });
      });
    return () => {
      ativo = false;
    };
  }, [chaveBusca, ticketId]);

  const detalheAtual =
    chaveBusca && estadoDetalhe?.chave === chaveBusca ? estadoDetalhe : null;
  const daLista =
    lista.tickets.find((t) => String(t.ticketId) === String(ticketId)) ?? null;
  const ticket =
    daLista && daLista.mensagens.length > 0
      ? daLista
      : (detalheAtual?.ticket ?? daLista);
  const erroDetalhe = detalheAtual?.erro ?? null;
  const erro = erroDetalhe?.status === 404 ? null : (erroDetalhe ?? lista.erro);
  const buscando = Boolean(chaveBusca && !detalheAtual);
  const carregando = Boolean(ticketId) && (lista.carregando || buscando) && !ticket;

  return {
    ...lista,
    ticket,
    carregando,
    erro,
    recarregar,
    naoEncontrado: Boolean(ticketId) && !carregando && !erro && ticket === null,
  };
}
