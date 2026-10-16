import type { Metadata } from "next";
import PainelArtesao from "@/components/painel/PainelArtesao";

export const metadata: Metadata = {
  title: "Painel do artesão",
  description: "Vendas, estoque, pedidos e transporte do seu ateliê na Origem.",
};

export default function PaginaPainelArtesao() {
  return <PainelArtesao />;
}
