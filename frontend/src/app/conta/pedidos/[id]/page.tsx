import type { Metadata } from "next";
import { DetalhePedido } from "@/components/conta/DetalhePedido";
import { GuardaPapelPage } from "@/components/seguranca/GuardaPapelPage";

export const metadata: Metadata = {
  title: "Acompanhamento de pedido",
  description: "Acompanhe os detalhes da sua compra na Origem.",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PaginaPedido({ params }: Props) {
  const { id } = await params;
  return (
    <GuardaPapelPage papel="COMPRADOR">
      <DetalhePedido id={id} />
    </GuardaPapelPage>
  );
}
