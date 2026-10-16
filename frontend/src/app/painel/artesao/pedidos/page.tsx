import type { Metadata } from "next";
import { Suspense } from "react";
import PedidosArtesao from "@/components/painel/PedidosArtesao";
import { Esqueleto } from "@/components/ui/Esqueleto";

export const metadata: Metadata = {
  title: "Pedidos | Painel do artesão",
  description: "Aceite pedidos, marque a produção e informe o rastreio das suas peças.",
};

// useSearchParams exige Suspense (docs do Next 16, use-search-params).
export default function PaginaPedidosArtesao() {
  return (
    <Suspense fallback={<Esqueleto className="h-96" />}>
      <PedidosArtesao />
    </Suspense>
  );
}
