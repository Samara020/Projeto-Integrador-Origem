import type { ReactNode } from "react";
import { AcessoAdmin } from "@/components/admin/AcessoAdmin";
import { CabecalhoPainel } from "@/components/painel/CabecalhoPainel";
import { NAVEGACAO_ADMIN } from "@/components/painel/navegacao";

// Moldura comum às telas do painel administrativo: acesso restrito, cabeçalho
// próprio, conteúdo e rodapé curto.
export default function LayoutPainelAdmin({ children }: { children: ReactNode }) {
  return (
    <AcessoAdmin>
      <div className="flex min-h-dvh flex-1 flex-col bg-fundo">
        <CabecalhoPainel navegacao={NAVEGACAO_ADMIN} />
        <div className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-4 px-margem py-6">
          {children}
        </div>
        <footer className="h-16 shrink-0 bg-tinta" aria-label="Rodapé administrativo" />
      </div>
    </AcessoAdmin>
  );
}
