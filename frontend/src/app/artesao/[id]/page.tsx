import type { Metadata } from "next";
import { LojaArtesao } from "@/components/artesao/LojaArtesao";

// O título com o nome da loja é definido no cliente, quando o dado chega.
export const metadata: Metadata = { title: "Loja do artesão" };

export default async function PaginaArtesao({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LojaArtesao id={id} />;
}
