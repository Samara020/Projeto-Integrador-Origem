"use client";

import { BadgeCheck, MapPin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useCategorias } from "@/hooks/useCatalogo";

const LINK = "inline-flex min-h-8 items-center text-apoio text-borda hover:text-superficie hover:underline";

const COLUNAS = [
  {
    titulo: "Comprar",
    links: [
      { href: "/catalogo", nome: "Todas as peças" },
      { href: "/catalogo?pecaUnica=true", nome: "Peças únicas" },
      { href: "/recomendacoes", nome: "Para você" },
      { href: "/comparar", nome: "Comparar peças" },
    ],
  },
  {
    titulo: "Sua conta",
    links: [
      { href: "/entrar", nome: "Entrar" },
      { href: "/cadastro", nome: "Criar conta" },
      { href: "/conta", nome: "Visualizar compras" },
      { href: "/carrinho", nome: "Carrinho" },
    ],
  },
  {
    titulo: "Ajuda",
    links: [
      { href: "/suporte", nome: "Central de ajuda" },
      { href: "/suporte/chat", nome: "Falar com o suporte" },
      { href: "/recuperar-senha", nome: "Recuperar senha" },
    ],
  },
];

function Coluna({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <nav aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="font-titulo text-h3 font-bold text-superficie">{titulo}</h2>
      <ul className="flex flex-col">{children}</ul>
    </nav>
  );
}

export default function Footer() {
  const categorias = useCategorias();

  return (
    <footer className="mt-auto bg-tinta text-borda">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] lg:gap-8">
        <div className="col-span-2 flex flex-col items-start gap-4 lg:col-span-1">
          <p className="font-titulo text-h2 font-bold text-superficie">Origem</p>
          <p className="max-w-sm text-apoio text-borda">
            Artesanato, literatura e arte de Pernambuco, comprados direto de quem faz.
            Cada peça chega com a técnica, a região e a história de quem a produziu.
          </p>
          <ul className="flex flex-col gap-2 text-apoio text-borda">
            <li className="inline-flex items-center gap-2">
              <BadgeCheck className="size-4 shrink-0 text-selo-ponto" aria-hidden="true" />
              Selo de autenticidade validado pela equipe
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-aviso" aria-hidden="true" />
              Da Região Metropolitana ao Sertão de Pernambuco
            </li>
          </ul>
        </div>

        {!categorias.erro && (
          <Coluna titulo="Categorias">
            {categorias.carregando &&
              [0, 1, 2].map((i) => (
                <li key={i} className="py-1">
                  <Esqueleto className="h-5 w-28" />
                </li>
              ))}
            {categorias.dados?.map((categoria) => (
              <li key={categoria.id}>
                <Link href={`/catalogo?categoria=${categoria.id}`} className={LINK}>
                  {categoria.nome}
                </Link>
              </li>
            ))}
          </Coluna>
        )}

        {COLUNAS.map((coluna) => (
          <Coluna key={coluna.titulo} titulo={coluna.titulo}>
            {coluna.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.nome}
                </Link>
              </li>
            ))}
          </Coluna>
        ))}
      </Container>

      <div className="border-t border-tinta-2">
        <Container className="flex flex-col gap-2 py-4 text-legenda sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Origem · Projeto Integrador de ADS · CESAR School</p>
          <p>Feito em Pernambuco, Brasil</p>
        </Container>
      </div>
    </footer>
  );
}
