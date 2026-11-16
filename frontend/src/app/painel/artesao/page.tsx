import type { Metadata } from "next";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";
import PainelArtesao from "@/components/painel/PainelArtesao";

export const metadata: Metadata = {
  title: "Painel do artesão",
  description: "Vendas, estoque, pedidos e transporte do seu ateliê na Origem.",
};

export default function PaginaPainelArtesao() {
  return (
    <GuardaPapelPage papel="ARTESAO">
      <PainelArtesao />
    </GuardaPapelPage>
  );
}
