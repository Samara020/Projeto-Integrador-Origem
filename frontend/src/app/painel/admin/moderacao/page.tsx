import type { Metadata } from "next";
import { Suspense } from "react";
import ModeracaoAdmin from "@/components/admin/ModeracaoAdmin";
import { Esqueleto } from "@/components/ui/Esqueleto";

export const metadata: Metadata = {
  title: "Moderação | Painel administrativo",
  description: "Revise as avaliações sinalizadas e decida o que fica no ar.",
};

// useSearchParams exige Suspense (docs do Next 16, use-search-params).
export default function PaginaModeracaoAdmin() {
  return (
    <Suspense fallback={<Esqueleto className="h-96" />}>
      <ModeracaoAdmin />
    </Suspense>
  );
}
