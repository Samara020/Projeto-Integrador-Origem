"use client";

import { useAvaliacoes } from "@/hooks/useProdutos";
import type { Avaliacao } from "@/types";

export function useAvaliacoesDaPeca(produtoId: string) {
  const consulta = useAvaliacoes(produtoId);
  const itens: Avaliacao[] = consulta.dados?.itens ?? [];
  const total = consulta.dados?.total ?? itens.length;
  const media =
    consulta.dados?.media ??
    (itens.length === 0
      ? 0
      : Math.round((itens.reduce((soma, a) => soma + a.nota, 0) / itens.length) * 10) / 10);

  return { ...consulta, itens, total, media };
}
