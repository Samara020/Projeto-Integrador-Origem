"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useConsulta } from "@/hooks/useConsulta";
import { produtosService } from "@/services/produtos";
import { comparacaoService, MAXIMO_COMPARACAO } from "@/services/comparacao";
import { comparacaoStore } from "@/store/comparacao";
import type { ProdutoDetalhe } from "@/types";

const VAZIA: string[] = [];
let carregada = false;

export function useComparacao() {
  const ids = useSyncExternalStore(comparacaoStore.assinar, comparacaoStore.obter, () => VAZIA);
  useEffect(() => {
    if (carregada) return;
    carregada = true;
    comparacaoStore.definir(comparacaoService.listar());
  }, []);
  return {
    ids,
    maximo: MAXIMO_COMPARACAO,
    contem: (id: string) => ids.includes(id),
    alternar: (id: string) => comparacaoStore.definir(comparacaoService.alternar(id)),
    remover: (id: string) => comparacaoStore.definir(comparacaoService.remover(id)),
    limpar: () => {
      comparacaoService.limpar();
      comparacaoStore.definir([]);
    },
  };
}

// Busca o detalhe de cada peça da lista. Peça que não existe mais é ignorada.
export function useProdutosComparados(ids: string[]) {
  return useConsulta<ProdutoDetalhe[]>(`comparar:${ids.join(",")}`, async (sinal) => {
    const resultados = await Promise.allSettled(ids.map((id) => produtosService.buscar(id, sinal)));
    return resultados
      .filter((r): r is PromiseFulfilledResult<ProdutoDetalhe> => r.status === "fulfilled")
      .map((r) => r.value);
  });
}
