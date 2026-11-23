"use client";

import { ArrowRight } from "lucide-react";
import { BotaoLink } from "@/components/ui/Botao";
import { Foto } from "@/components/ui/Foto";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Estrelas } from "@/components/ui/Estrelas";
import { useIndicadores } from "@/hooks/useCatalogo";
import { formatarNota, plural } from "@/lib/formato";

export function Hero() {
  const indicadores = useIndicadores();

  return (
    <section
      aria-labelledby="hero-titulo"
      className="mx-auto grid w-full max-w-pagina md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div className="order-2 flex flex-col items-start gap-4 px-margem py-10 md:order-1 md:py-12">
        <h1
          id="hero-titulo"
          className="font-titulo text-display font-bold uppercase text-tinta"
        >
          Do sertão <span className="block text-terracota">para o mundo</span>
        </h1>
        <p className="max-w-sm text-corpo text-tinta-2">
          Artesanato, literatura e arte de Pernambuco, feitos por pessoas reais,
          com histórias reais.
        </p>

        <div className="flex flex-wrap gap-3">
          <BotaoLink href="/catalogo">
            Explorar o catálogo
            <ArrowRight className="size-4" aria-hidden="true" />
          </BotaoLink>
          <BotaoLink href="/catalogo?pecaUnica=true" variante="secundario">
            Ver peças únicas
          </BotaoLink>
        </div>

        {/* Os números vêm do recurso indicadores. Se falhar, a linha some: é apoio, não conteúdo. */}
        {indicadores.carregando && <Esqueleto className="h-4 w-64" />}
        {indicadores.dados && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-legenda text-tinta-3">
            <Estrelas nota={indicadores.dados.avaliacaoMedia} />
            <span>
              {formatarNota(indicadores.dados.avaliacaoMedia)} em{" "}
              {plural(
                indicadores.dados.totalAvaliacoes,
                "avaliação",
                "avaliações",
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {plural(indicadores.dados.totalArtesaos, "artesão", "artesãos")}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {plural(indicadores.dados.totalProdutos, "peça", "peças")}
            </span>
          </p>
        )}
      </div>

      <div className="relative order-1 aspect-3/2 w-full md:order-2 md:aspect-auto md:min-h-100">
        <Foto
          src="/produtos/vaso-ceramica.jpg"
          alt="Vaso de cerâmica pintado à mão, com flores secas, sobre a mesa de um ateliê"
          fill
          priority
          sizes="(min-width: 768px) 58vw, 100vw"
          className="object-cover"
        />
      </div>
    </section>
  );
}
