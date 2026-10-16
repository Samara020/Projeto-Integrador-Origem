import type { Metadata } from "next";
import { CentralSuporte } from "@/components/suporte/CentralSuporte";

export const metadata: Metadata = {
  title: "Central de suporte",
  description: "Respostas para pedido, pagamento e troca, e um ticket com atendimento na hora.",
};

export default function PaginaSuporte() {
  return <CentralSuporte />;
}
