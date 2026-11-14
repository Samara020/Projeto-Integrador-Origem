import type { Metadata } from "next";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";
import TransporteArtesao from "@/components/painel/TransporteArtesao";

export const metadata: Metadata = {
  title: "Transporte | Painel do artesão",
  description: "Calcule o frete, configure as opções de envio e cuide da embalagem.",
};

export default function PaginaTransporteArtesao() {
  return (
    <GuardaPapelPage papel="ARTESAO">
      <TransporteArtesao />
    </GuardaPapelPage>
  );
}
