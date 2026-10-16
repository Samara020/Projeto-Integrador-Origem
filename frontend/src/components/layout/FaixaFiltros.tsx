"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useCategorias } from "@/hooks/useCatalogo";

const CHIP =
  "inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-apoio transition-colors duration-150";

// "todas" = catálogo sem categoria. null = fora do catálogo, nenhum chip aceso.
function Chips({ ativa }: { ativa: string | null }) {
  const { dados, carregando, erro } = useCategorias();
  if (erro || (dados && dados.length === 0)) return null;

  const classe = (id: string) =>
    `${CHIP} ${
      ativa === id
        ? "bg-terracota font-bold text-white"
        : "font-medium text-tinta-2 hover:bg-superficie-2 hover:text-terracota"
    }`;

  return (
    <nav aria-label="Filtrar por categoria" className="border-t border-borda bg-fundo">
      <div className="mx-auto flex w-full max-w-pagina items-center gap-2 overflow-x-auto px-margem py-2">
        <span className="shrink-0 pr-2 text-legenda text-tinta-3">Filtrar por</span>
        <Link
          href="/catalogo"
          className={classe("todas")}
          aria-current={ativa === "todas" ? "page" : undefined}
        >
          Todas as peças
        </Link>
        {carregando &&
          [0, 1, 2].map((i) => <Esqueleto key={i} className="h-6 w-24 shrink-0" />)}
        {dados?.map((categoria) => (
          <Link
            key={categoria.id}
            href={`/catalogo?categoria=${categoria.id}`}
            className={classe(categoria.id)}
            aria-current={ativa === categoria.id ? "page" : undefined}
          >
            {categoria.nome}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function ChipsComUrl() {
  const pathname = usePathname();
  const busca = useSearchParams();
  const ativa = pathname === "/catalogo" ? (busca.get("categoria") ?? "todas") : null;
  return <Chips ativa={ativa} />;
}

// useSearchParams pede Suspense nas páginas estáticas. O fallback é a mesma faixa, sem chip aceso.
export function FaixaFiltros() {
  return (
    <Suspense fallback={<Chips ativa={null} />}>
      <ChipsComUrl />
    </Suspense>
  );
}
