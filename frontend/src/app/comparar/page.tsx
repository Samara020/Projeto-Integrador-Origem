import type { Metadata } from "next";
import { Comparacao } from "@/components/comparacao/Comparacao";

export const metadata: Metadata = {
  title: "Comparar peças",
  description: "Compare até três peças de artesanato lado a lado: dimensões, material, técnica, região e avaliações.",
};

export default function PaginaComparar() {
  return <Comparacao />;
}
