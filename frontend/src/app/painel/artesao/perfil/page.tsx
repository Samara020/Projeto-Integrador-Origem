import type { Metadata } from "next";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";
import PerfilArtesao from "@/components/painel/PerfilArtesao";

export const metadata: Metadata = {
  title: "Perfil | Painel do artesão",
  description: "Atualize sua história, técnicas, contato e certificações.",
};

export default function PaginaPerfilArtesao() {
  return (
    <GuardaPapelPage papel="ARTESAO">
      <PerfilArtesao />
    </GuardaPapelPage>
  );
}
