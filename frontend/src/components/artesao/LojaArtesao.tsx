"use client";

import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { Container } from "@/components/layout/Container";
import {
  ProdutoGrade,
  ProdutoGradeEsqueleto,
} from "@/components/produto/ProdutoGrade";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Estrelas } from "@/components/ui/Estrelas";
import { useArtesao } from "@/hooks/useArtesaos";
import { formatarInteiro, formatarNota, plural } from "@/lib/formato";
import type { ArtesaoPerfil } from "@/types";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

function Carregando() {
  return (
    <div role="status" aria-label="Carregando loja">
      <div className="bg-info">
        <Container className="flex flex-col gap-6 py-8 md:flex-row md:items-center">
          <Esqueleto className="size-32 shrink-0 rounded-full bg-superficie/20 md:size-36" />
          <div className="flex flex-1 flex-col gap-3">
            <Esqueleto className="h-8 w-64 bg-superficie/20" />
            <Esqueleto className="h-4 w-80 bg-superficie/20" />
            <Esqueleto className="h-12 w-full max-w-xl bg-superficie/20" />
          </div>
        </Container>
      </div>
      <Container className="py-secao">
        <ProdutoGradeEsqueleto quantidade={4} />
      </Container>
    </div>
  );
}

function Perfil({ artesao }: { artesao: ArtesaoPerfil }) {
  return (
    <section aria-labelledby="artesao-nome" className="bg-info text-superficie">
      <Container className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:gap-8">
        {artesao.foto ? (
          <Image
            src={artesao.foto}
            alt={`Foto de ${artesao.nome}`}
            width={144}
            height={144}
            priority
            className="size-32 shrink-0 rounded-full border-4 border-superficie/30 object-cover md:size-36"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-32 shrink-0 items-center justify-center rounded-full border-4 border-superficie/30 bg-superficie/15 font-titulo text-display font-bold md:size-36"
          >
            {iniciais(artesao.nome)}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 id="artesao-nome" className="font-titulo text-h1 font-bold">
              {artesao.nome}
            </h1>
            {artesao.verificado && (
              <span className="inline-flex items-center gap-1 rounded-full bg-fundo px-3 py-1 text-legenda font-bold uppercase tracking-wide text-info">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verificado pela Origem
              </span>
            )}
          </div>
          <p className="text-apoio text-fundo">
            {artesao.regiao} · {artesao.tecnica} · {artesao.especialidade}
          </p>
          <p className="max-w-2xl text-corpo">{artesao.biografia}</p>
          {artesao.totalAvaliacoes > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-apoio text-fundo">
              <Estrelas nota={artesao.avaliacaoMedia} />
              {formatarNota(artesao.avaliacaoMedia)} ·{" "}
              {plural(artesao.totalAvaliacoes, "avaliação", "avaliações")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start md:items-center">
          <span className="font-titulo text-display font-bold leading-none tabular-nums">
            {formatarInteiro(artesao.pecasVendidas)}
          </span>
          <span className="text-legenda text-fundo">peças vendidas</span>
        </div>
      </Container>
    </section>
  );
}

function Historia({ artesao }: { artesao: ArtesaoPerfil }) {
  const [capa, ...outras] = artesao.imagens;
  const primeiroNome = artesao.nome.split(" ")[0];

  return (
    <section
      aria-labelledby="historia-titulo"
      className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12"
    >
      <div className="flex flex-col gap-4">
        <h2 id="historia-titulo" className="font-titulo text-h2 font-bold text-tinta">
          A história de {primeiroNome}
        </h2>
        <p className="text-apoio text-tinta-3">
          {artesao.nomeLoja} · {artesao.regiao}
        </p>
        {capa && (
          <div className="relative aspect-3/2 w-full overflow-hidden rounded-raio border border-superficie-2 bg-superficie-2">
            <Image
              src={capa}
              alt={`${artesao.nome} trabalhando no ateliê`}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {artesao.historia.map((paragrafo) => (
          <p key={paragrafo.slice(0, 40)} className="text-corpo text-tinta-2">
            {paragrafo}
          </p>
        ))}
        <figure className="border-l-4 border-terracota pl-4">
          <blockquote className="font-titulo text-h3 font-bold text-tinta">
            {`"${artesao.citacao}"`}
          </blockquote>
          <figcaption className="mt-1 text-apoio text-tinta-3">
            {artesao.nome}, {artesao.regiao}
          </figcaption>
        </figure>
        {outras.length > 0 && (
          <ul className="grid grid-cols-2 gap-4">
            {outras.map((imagem) => (
              <li
                key={imagem}
                className="relative aspect-3/2 overflow-hidden rounded-raio border border-superficie-2 bg-superficie-2"
              >
                <Image
                  src={imagem}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 50vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function LojaArtesao({ id }: { id: string }) {
  const { dados: artesao, carregando, erro, recarregar } = useArtesao(id);

  useEffect(() => {
    if (artesao) document.title = `${artesao.nomeLoja} · Origem`;
  }, [artesao]);

  if (carregando) return <Carregando />;

  if (erro?.status === 404) {
    return (
      <Container className="py-secao">
        <EstadoVazio
          titulo="Não encontramos esse artesão"
          descricao="O perfil pode ter sido retirado ou o endereço mudou."
          acao={<BotaoLink href="/catalogo">Ver todas as peças</BotaoLink>}
        />
      </Container>
    );
  }

  if (erro) {
    return (
      <Container className="py-secao">
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      </Container>
    );
  }

  if (!artesao) return null;

  return (
    <>
      <Perfil artesao={artesao} />
      <Container className="flex flex-col gap-secao py-secao">
        <Historia artesao={artesao} />

        <section aria-labelledby="pecas-titulo" className="flex flex-col gap-4">
          <h2 id="pecas-titulo" className="font-titulo text-h2 font-bold text-tinta">
            Feito por {artesao.nome.split(" ")[0]}
          </h2>
          {artesao.produtos.length === 0 ? (
            <EstadoVazio
              titulo="Ainda não há peças nesta loja"
              descricao="O artesão está preparando o catálogo. Volte em breve."
              acao={<BotaoLink href="/catalogo">Ver outras peças</BotaoLink>}
            />
          ) : (
            <ProdutoGrade produtos={artesao.produtos} />
          )}
        </section>
      </Container>
    </>
  );
}
