import type { Metadata } from "next";
import { Recomendacoes } from "@/components/recomendacoes/Recomendacoes";

export const metadata: Metadata = {
  title: "Para você",
  description: "Peças de artesanato, literatura e arte de Pernambuco escolhidas a partir do que você viu na Origem.",
};

export default function PaginaRecomendacoes() {
  return <Recomendacoes />;
}
