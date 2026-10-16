"use client";

import { Check, GitCompareArrows } from "lucide-react";
import { useComparacao } from "@/hooks/useComparacao";

// Atalho de comparação sobre a foto do card. Fica acima do link que cobre o card.
export function BotaoCompararCard({ produtoId, nome }: { produtoId: string; nome: string }) {
  const { contem, alternar } = useComparacao();
  const marcado = contem(produtoId);

  return (
    <button
      type="button"
      onClick={() => alternar(produtoId)}
      aria-pressed={marcado}
      aria-label={marcado ? `Tirar ${nome} da comparação` : `Comparar ${nome}`}
      className={`relative z-10 inline-flex size-10 items-center justify-center rounded-raio border transition-colors duration-150 ${
        marcado
          ? "border-terracota bg-terracota text-white"
          : "border-borda bg-superficie text-tinta-2 hover:border-terracota hover:text-terracota"
      }`}
    >
      {marcado ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <GitCompareArrows className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
