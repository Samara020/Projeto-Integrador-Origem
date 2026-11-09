import type { ReactNode } from "react";
import { AcessoPainel } from "@/components/painel/AcessoPainel";

export function AcessoAdmin({ children }: { children: ReactNode }) {
  return <AcessoPainel papel="ADMINISTRADOR">{children}</AcessoPainel>;
}
