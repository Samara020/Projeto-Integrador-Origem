import type { Metadata } from "next";
import { PaginaAvaliacoes } from "@/components/produto/PaginaAvaliacoes";

export const metadata: Metadata = { title: "Avaliações" };

export default async function PaginaAvaliacoesDaPeca({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaginaAvaliacoes produtoId={id} />;
}
