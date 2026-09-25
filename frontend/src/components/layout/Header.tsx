"use client";

import { Drawer, Portal } from "@chakra-ui/react";
import { LogOut, Menu, ShoppingCart, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BuscaForm } from "@/components/layout/BuscaForm";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useCarrinho } from "@/hooks/useCarrinho";
import { useCategorias } from "@/hooks/useCatalogo";
import { useSessao } from "@/hooks/useSessao";
import { plural } from "@/lib/formato";

const BOTAO_ICONE =
  "relative inline-flex size-10 items-center justify-center rounded-raio text-tinta transition-colors duration-150 hover:bg-superficie-2";

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const categorias = useCategorias();
  const { totalItens } = useCarrinho();
  const { usuario, sair } = useSessao();

 const links = [
    { href: "/", nome: "Artesanatos" },
    { href: "/artesao", nome: "Artesãos" },
    ...(categorias.dados ?? []).map((categoria) => ({
      href: `/catalogo?categoria=${categoria.id}`,
      nome: categoria.nome,
    })),
    { href: "/catalogo", nome: "Todas as peças" },
    { href: "/recomendacoes", nome: "Para você" },
    { href: "/comparar", nome: "Comparar" },
    { href: "/conta", nome: "Visualizar compras" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-superficie">
      <div className="mx-auto flex h-19 w-full max-w-pagina items-center justify-between gap-4 px-margem">
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

        <nav aria-label="Categorias" className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {categorias.carregando &&
              [0, 1, 2].map((i) => (
                <li key={i}>
                  <Esqueleto className="h-4 w-20" />
                </li>
              ))}
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`inline-flex min-h-10 items-center text-apoio hover:text-terracota ${
                    link.href === "/conta"
                      ? "font-bold text-terracota"
                      : "text-tinta"
                  }`}
                >
                  {link.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden w-62 lg:block">
            <BuscaForm id="busca-header" />
          </div>

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

          {usuario ? (
            <button
              type="button"
              onClick={() => void sair()}
              className={`${BOTAO_ICONE} w-auto gap-2 px-3 text-apoio font-medium`}
            >
              <LogOut className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline">
                Sair ({usuario.nome.split(" ")[0]})
              </span>
              <span className="sr-only sm:hidden">Sair da conta</span>
            </button>
          ) : (
            <Link href="/entrar" className={BOTAO_ICONE} aria-label="Entrar">
              <User className="size-5" aria-hidden="true" />
            </Link>
          )}

          <Drawer.Root
            open={menuAberto}
            onOpenChange={(detalhe) => setMenuAberto(detalhe.open)}
            placement="end"
          >
            <Drawer.Trigger asChild>
              <button
                type="button"
                className={`${BOTAO_ICONE} lg:hidden`}
                aria-label="Abrir menu"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </Drawer.Trigger>
            <Portal>
              <Drawer.Backdrop />
              <Drawer.Positioner>
                <Drawer.Content>
                  <Drawer.Header>
                    <Drawer.Title>Menu</Drawer.Title>
                    <Drawer.CloseTrigger asChild>
                      <button
                        type="button"
                        className={BOTAO_ICONE}
                        aria-label="Fechar menu"
                      >
                        <X className="size-5" aria-hidden="true" />
                      </button>
                    </Drawer.CloseTrigger>
                  </Drawer.Header>
                  <Drawer.Body>
                    <nav aria-label="Categorias">
                      <ul className="flex flex-col">
                        {links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setMenuAberto(false)}
                              className="flex h-12 items-center border-b border-borda text-corpo text-tinta"
                            >
                              {link.nome}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </Drawer.Body>
                </Drawer.Content>
              </Drawer.Positioner>
            </Portal>
          </Drawer.Root>
        </div>
      </div>

      <div className="border-t border-borda px-margem py-2 lg:hidden">
        <BuscaForm id="busca-header-mobile" />
      </div>
    </header>
  );
}
