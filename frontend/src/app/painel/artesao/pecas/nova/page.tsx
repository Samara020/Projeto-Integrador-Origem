import type { Metadata } from "next";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";
import NovaPecaArtesao from "@/components/painel/NovaPecaArtesao";

export const metadata: Metadata = {
  title: "Cadastrar peça | Painel do artesão",
  description: "Publique uma nova peça artesanal com fotos, preço, origem e certificação.",
};

export default function PaginaNovaPeca() {
  return (
    <GuardaPapelPage papel="ARTESAO">
      <NovaPecaArtesao />
    </GuardaPapelPage>
  );
}
