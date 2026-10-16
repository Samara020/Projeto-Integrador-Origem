import type { Metadata } from "next";
import NovaPecaArtesao from "@/components/painel/NovaPecaArtesao";

export const metadata: Metadata = {
  title: "Cadastrar peça | Painel do artesão",
  description: "Publique uma nova peça artesanal com fotos, preço, origem e certificação.",
};

export default function PaginaNovaPeca() {
  return <NovaPecaArtesao />;
}
