import type { ReactNode } from "react";
import { CabecalhoPainel } from "@/components/painel/CabecalhoPainel";

// Moldura comum às telas do painel do artesão: cabeçalho próprio, conteúdo e
// rodapé curto. O cabeçalho e o rodapé do site ficam fora desse espaço.
export default function LayoutPainelArtesao({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-fundo">
      <CabecalhoPainel />
      <main id="conteudo" className="mx-auto flex w-full max-w-pagina flex-1 flex-col gap-4 px-margem py-6">
        {children}
      </main>
      <footer className="h-16 shrink-0 bg-tinta" aria-label="Rodapé do painel" />
    </div>
  );
}
