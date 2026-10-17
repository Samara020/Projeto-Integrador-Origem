import type { Metadata } from "next";
import { Suspense } from "react";
import ValidacoesAdmin from "@/components/admin/ValidacoesAdmin";
import { Esqueleto } from "@/components/ui/Esqueleto";

export const metadata: Metadata = {
  title: "Validações | Painel administrativo",
  description: "Aprove ou reprove a origem das peças enviadas pelos artesãos.",
};

// useSearchParams exige Suspense (docs do Next 16, use-search-params).
export default function PaginaValidacoesAdmin() {
  return (
    <Suspense fallback={<Esqueleto className="h-96" />}>
      <ValidacoesAdmin />
    </Suspense>
  );
}
