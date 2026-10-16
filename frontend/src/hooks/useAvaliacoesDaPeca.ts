"use client";

import { useAvaliacoes } from "@/hooks/useProdutos";
import { useMinhasAvaliacoes } from "@/hooks/useMinhasAvaliacoes";
import type { Avaliacao } from "@/types";

// Junta as avaliações da API com as que o comprador publicou neste navegador.
export function useAvaliacoesDaPeca(produtoId: string) {
  const consulta = useAvaliacoes(produtoId);
  const { minhas } = useMinhasAvaliacoes();

  const locais: Avaliacao[] = minhas
    .filter((a) => a.produtoId === produtoId && a.status === "PUBLICADO")
    .map((a) => ({ id: a.id, produtoId: a.produtoId, autor: "Você", nota: a.nota, comentario: a.comentario, criadoEm: a.criadoEm, compraVerificada: true }));
  const itens: Avaliacao[] = consulta.dados ? [...locais, ...consulta.dados.itens] : [];
  const total = itens.length;
  const media = total === 0 ? 0 : Math.round((itens.reduce((soma, a) => soma + a.nota, 0) / total) * 10) / 10;

  return { ...consulta, itens, total, media };
}
