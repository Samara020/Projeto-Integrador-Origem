import { ShieldCheck, Store, UserRound, type LucideIcon } from "lucide-react";
import { ROTA_PAINEL_ADMIN } from "@/lib/destino";
import type { Papel } from "@/types";

// Cada papel tem uma área diferente: o comprador vive em /conta, o artesão e o
// administrador em painéis próprios. O destino vem do papel do contrato.
export const AREA_POR_PAPEL: Record<Papel, { href: string; nome: string; Icone: LucideIcon }> = {
  COMPRADOR: { href: "/conta", nome: "Minha conta", Icone: UserRound },
  ARTESAO: { href: "/painel/artesao", nome: "Painel do ateliê", Icone: Store },
  ADMINISTRADOR: { href: ROTA_PAINEL_ADMIN, nome: "Painel administrativo", Icone: ShieldCheck },
};
