"use client";

import { Drawer, Portal } from "@chakra-ui/react";
import { Bell, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { useSessao } from "@/hooks/useSessao";

const LINKS = [
  { href: "/painel/artesao", nome: "Painel" },
  { href: "/painel/artesao/pecas/nova", nome: "Peças" },
  { href: "/painel/artesao/estoque", nome: "Estoque" },
  { href: "/painel/artesao/pedidos", nome: "Pedidos" },
  { href: "/painel/artesao/envio", nome: "Transporte" },
  { href: "/painel/artesao/perfil", nome: "Perfil" },
];

const BOTAO_ICONE =
  "inline-flex size-10 items-center justify-center rounded-raio text-tinta transition-colors duration-150 hover:bg-superficie-2";

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function ItemPerfil() {
  const { usuario, sair } = useSessao();
  if (!usuario) {
    return (
      <Link href="/entrar" className="text-apoio font-bold text-terracota">
        Entrar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-selo text-apoio font-bold text-superficie"
        aria-hidden="true"
      >
        {iniciais(usuario.nome)}
      </span>
      <span className="hidden text-apoio font-semibold text-tinta sm:inline">{usuario.nome}</span>
      <button
        type="button"
        onClick={() => void sair()}
        className={`${BOTAO_ICONE} w-auto px-2`}
        aria-label="Sair da conta"
      >
        <LogOut className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

// Cabeçalho do painel do artesão: uma navegação só, com o mesmo menu nas telas.
export function CabecalhoPainel() {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const { usuario } = useSessao();

  const linksDoAtelie = LINKS.map((link) => ({
    ...link,
    ativa:
      link.href === "/painel/artesao" ? pathname === link.href : pathname.startsWith(link.href),
  }));

  return (
    <header className="border-b border-borda bg-superficie">
      <Container className="flex min-h-19 flex-wrap items-center justify-between gap-3 py-3 lg:flex-nowrap">
        <Link href="/painel/artesao" aria-label="Origem, painel do artesão" className="shrink-0">
          <Image
            src="/marca/logo-origem.webp"
            alt="Origem"
            width={150}
            height={56}
            priority
            className="h-14 w-auto"
          />
        </Link>

        <nav
          aria-label="Menu do artesão"
          className="order-3 w-full overflow-x-auto lg:order-none lg:w-auto"
        >
          <ul className="flex min-w-max items-center gap-5 lg:gap-7">
            {linksDoAtelie.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.ativa ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center text-apoio hover:text-terracota ${
                    link.ativa ? "font-semibold text-terracota" : "text-tinta"
                  }`}
                >
                  {link.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/painel/artesao/pedidos"
            className={BOTAO_ICONE}
            aria-label="Avisos de pedidos novos"
          >
            <Bell className="size-5" aria-hidden="true" />
          </Link>
          <ItemPerfil />
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className={`${BOTAO_ICONE} lg:hidden`}
            aria-label="Abrir menu do ateliê"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </Container>

      <Drawer.Root
        open={menuAberto}
        onOpenChange={(detalhe) => setMenuAberto(detalhe.open)}
        placement="end"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header className="font-titulo text-h3 font-bold">
                Ateliê {usuario?.nome.split(" ")[0] ?? "do artesão"}
              </Drawer.Header>
              <Drawer.CloseTrigger asChild>
                <button type="button" className={BOTAO_ICONE} aria-label="Fechar menu">
                  <X className="size-5" aria-hidden="true" />
                </button>
              </Drawer.CloseTrigger>
              <Drawer.Body>
                <nav aria-label="Menu do artesão">
                  <ul className="flex flex-col">
                    {linksDoAtelie.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuAberto(false)}
                          aria-current={link.ativa ? "page" : undefined}
                          className={`flex min-h-12 items-center border-b border-borda text-corpo ${
                            link.ativa ? "font-bold text-terracota" : "text-tinta"
                          }`}
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
    </header>
  );
}
