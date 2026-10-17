import type { Metadata } from "next";
import PerfilAdmin from "@/components/admin/PerfilAdmin";

export const metadata: Metadata = {
  title: "Perfil | Painel administrativo",
  description: "Dados da conta e senha de quem administra a Origem.",
};

export default function PaginaPerfilAdmin() {
  return <PerfilAdmin />;
}
