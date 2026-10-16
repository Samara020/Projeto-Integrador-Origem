"use client";

import { useEffect, useSyncExternalStore } from "react";
import { avaliacoesService } from "@/services/avaliacoes";
import { avaliacoesStore } from "@/store/avaliacoes";

let carregadas = false;

async function carregarUmaVez() {
  if (carregadas) return;
  carregadas = true;
  avaliacoesStore.definir(await avaliacoesService.minhas());
}

// Avaliações que o comprador publicou neste navegador.
export function useMinhasAvaliacoes() {
  const minhas = useSyncExternalStore(avaliacoesStore.assinar, avaliacoesStore.obter, () => null);

  useEffect(() => {
    void carregarUmaVez();
  }, []);

  return {
    minhas: minhas ?? [],
    carregando: minhas === null,
    async recarregar() {
      avaliacoesStore.definir(await avaliacoesService.minhas());
    },
  };
}
