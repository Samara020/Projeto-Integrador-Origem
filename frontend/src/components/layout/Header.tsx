"use client";

import { CircleHelp, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BuscaForm } from "@/components/layout/BuscaForm";
import { FaixaFiltros } from "@/components/layout/FaixaFiltros";
import { MenuPerfil } from "@/components/layout/MenuPerfil";
import { MenuPrincipal } from "@/components/layout/MenuPrincipal";
import { useCarrinho } from "@/hooks/useCarrinho";
import { plural } from "@/lib/formato";

const BOTAO_ICONE =
  "relative inline-flex size-10 items-center justify-center rounded-raio text-tinta transition-colors duration-150 hover:bg-superficie-2 hover:text-terracota";

export default function Header() {
  const { totalItens } = useCarrinho();

  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-superficie">
      <div className="mx-auto flex h-19 w-full max-w-pagina items-center gap-3 px-margem lg:gap-5">
        <MenuPrincipal />

        <Link href="/" className="shrink-0" aria-label="Origem, página inicial">
          <Image
            src="/marca/logo-origem.webp"
            alt="Origem, cultura que conecta"
            width={150}
            height={62}
            priority
            className="h-14 w-auto"
          />
        </Link>

        <div className="hidden flex-1 lg:block">
          <div className="mx-auto max-w-xl">
            <BuscaForm id="busca-header" />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          <Link href="/suporte" className={BOTAO_ICONE} aria-label="Central de ajuda">
            <CircleHelp className="size-5" aria-hidden="true" />
          </Link>

          <Link
            href="/carrinho"
            className={BOTAO_ICONE}
            aria-label={
              totalItens > 0
                ? `Carrinho com ${plural(totalItens, "item", "itens")}`
                : "Carrinho vazio"
            }
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            {totalItens > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-terracota px-1 text-legenda font-bold tabular-nums text-white">
                {totalItens}
              </span>
            )}
          </Link>

          <MenuPerfil />
        </div>
      </div>

      <div className="border-t border-borda px-margem py-2 lg:hidden">
        <BuscaForm id="busca-header-mobile" />
      </div>

      <FaixaFiltros />
    </header>
  );
}
