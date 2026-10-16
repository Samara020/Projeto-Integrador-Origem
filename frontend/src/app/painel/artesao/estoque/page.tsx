import type { Metadata } from "next";
import { Suspense } from "react";
import EstoqueArtesao from "@/components/painel/EstoqueArtesao";
import { Esqueleto } from "@/components/ui/Esqueleto";

export const metadata: Metadata = {
  title: "Estoque | Painel do artesão",
  description: "Ajuste a quantidade, pause ou exclua as peças do seu ateliê.",
};

// useSearchParams exige Suspense (docs do Next 16, use-search-params).
export default function PaginaEstoqueArtesao() {
  return (
    <Suspense fallback={<Esqueleto className="h-96" />}>
      <EstoqueArtesao />
    </Suspense>
  );
}
