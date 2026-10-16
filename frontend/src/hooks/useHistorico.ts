"use client";

import { useEffect, useSyncExternalStore } from "react";
import { historicoService, type PecaVista } from "@/services/historico";
import { historicoStore } from "@/store/historico";

const NADA: PecaVista[] = [];
let carregado = false;

function carregarUmaVez() {
  if (carregado) return;
  carregado = true;
  historicoStore.definir(historicoService.listar());
}

// Função fixa do módulo: pode entrar em dependência de efeito sem disparar render em cadeia.
export function registrarVisita(peca: PecaVista): void {
  carregarUmaVez();
  if (historicoStore.obter()[0]?.id === peca.id) return;
  historicoService.registrar(peca);
  historicoStore.definir(historicoService.listar());
}

// Peças vistas recentemente neste navegador.
export function useHistorico() {
  const vistos = useSyncExternalStore(historicoStore.assinar, historicoStore.obter, () => NADA);
  useEffect(() => {
    carregarUmaVez();
  }, []);
  return { vistos };
}
