import type { Metadata } from "next";
import { Suspense } from "react";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";
import EstoqueArtesao from "@/components/painel/EstoqueArtesao";
import { Esqueleto } from "@/components/ui/Esqueleto";

export const metadata: Metadata = {
  title: "Estoque | Painel do artesão",
  description: "Ajuste a quantidade, pause ou exclua as peças do seu ateliê.",
};

// useSearchParams exige Suspense (docs do Next 16, use-search-params).
export default function PaginaEstoqueArtesao() {
  return (
    <GuardaPapelPage papel="ARTESAO">
      <Suspense fallback={<Esqueleto className="h-96" />}>
        <EstoqueArtesao />
      </Suspense>
    </GuardaPapelPage>
  );
}
