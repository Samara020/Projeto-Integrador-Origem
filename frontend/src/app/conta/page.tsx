import type { Metadata } from "next";
import { HistoricoCompras } from "@/components/conta/HistoricoCompras";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";

export const metadata: Metadata = {
  title: "Compras realizadas",
  description: "Acompanhe seus pedidos e reveja suas compras na Origem.",
};

export default function PaginaConta() {
  return (
    <GuardaPapelPage papel="COMPRADOR">
      <HistoricoCompras />
    </GuardaPapelPage>
  );
}
