"use client";

import { useConsulta } from "@/hooks/useConsulta";
import { produtosService } from "@/services/produtos";
import type { FiltrosProdutos } from "@/types";

export function useProdutos(filtros: FiltrosProdutos) {
  return useConsulta(`produtos:${JSON.stringify(filtros)}`, (sinal) =>
    produtosService.listar(filtros, sinal),
  );
}

export function useDestaques() {
  return useConsulta("produtos:destaques", (sinal) =>
    produtosService.listarDestaques(sinal),
  );
}

export function useProduto(id: string) {
  return useConsulta(`produto:${id}`, (sinal) =>
    produtosService.buscar(id, sinal),
  );
}

export function useRecomendados(produtoId: string) {
  return useConsulta(`recomendados:${produtoId}`, (sinal) =>
    produtoId
      ? produtosService.recomendados(produtoId, sinal)
      : Promise.resolve({ recomendados: [] }),
  );
}

export function useAvaliacoes(produtoId: string) {
  return useConsulta(`avaliacoes:${produtoId}`, (sinal) =>
    produtosService.avaliacoes(produtoId, sinal),
  );
}
