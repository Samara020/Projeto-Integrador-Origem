import type { Metadata } from "next";
import { Personalizacao } from "@/components/produto/Personalizacao";

export const metadata: Metadata = { title: "Personalizar peça" };

export default async function PaginaPersonalizar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Personalizacao produtoId={id} />;
}
