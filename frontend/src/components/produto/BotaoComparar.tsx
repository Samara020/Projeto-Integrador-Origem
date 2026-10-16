"use client";

import { GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useComparacao } from "@/hooks/useComparacao";
import { Botao } from "@/components/ui/Botao";

export function BotaoComparar({ produtoId }: { produtoId: string }) {
  const { ids, contem, alternar, maximo } = useComparacao();
  const marcado = contem(produtoId);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Botao variante="secundario" aria-pressed={marcado} onClick={() => alternar(produtoId)}>
        <GitCompareArrows className="size-4" aria-hidden="true" />
        {marcado ? "Tirar da comparação" : "Comparar"}
      </Botao>
      {ids.length > 0 && (
        <Link href="/comparar" className="text-apoio text-terracota hover:underline">
          Ver comparação ({ids.length} de {maximo})
        </Link>
      )}
    </div>
  );
}
