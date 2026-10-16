"use client";

import { BadgeCheck, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { FormularioAvaliacao } from "@/components/produto/FormularioAvaliacao";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Estrelas } from "@/components/ui/Estrelas";
import { useArtesao } from "@/hooks/useArtesaos";
import { useAvaliacoesDaPeca } from "@/hooks/useAvaliacoesDaPeca";
import { useProduto } from "@/hooks/useProdutos";
import { formatarData, formatarNota, plural } from "@/lib/formato";
import type { Avaliacao } from "@/types";

const NOTAS = [5, 4, 3, 2, 1] as const;
const CARTAO = "flex flex-col gap-3 rounded-raio border border-borda bg-superficie p-4";

function Chip({ ativo, children, onClick }: { ativo: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className={`inline-flex h-9 items-center rounded-full border px-3 text-apoio tabular-nums ${ativo ? "border-terracota bg-terracota text-white" : "border-borda bg-superficie text-tinta hover:border-borda-forte"}`}>
      {children}
    </button>
  );
}

function MediaDoArtesao({ artesaoId }: { artesaoId: string }) {
  const { dados } = useArtesao(artesaoId);
  if (!dados || dados.totalAvaliacoes === 0) return null;
  return (
    <span className="rounded-full bg-selo px-3 py-1 text-legenda font-bold uppercase tracking-wide text-superficie">
      Artesão {formatarNota(dados.avaliacaoMedia)}
    </span>
  );
}

function CartaoAvaliacao({ avaliacao, nomePeca }: { avaliacao: Avaliacao; nomePeca: string }) {
  return (
    <li className={CARTAO}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col">
          <p className="text-apoio font-bold text-tinta">{avaliacao.autor}</p>
          {avaliacao.compraVerificada && (
            <p className="inline-flex items-center gap-1 text-legenda font-medium uppercase tracking-wide text-selo">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Compra verificada
            </p>
          )}
        </div>
        <Estrelas nota={avaliacao.nota} />
      </div>
      <p className="font-titulo text-h3 font-bold text-tinta">{nomePeca}</p>
      <p className="text-apoio text-tinta-2">{avaliacao.comentario}</p>
      <p className="text-legenda text-tinta-3">{formatarData(avaliacao.criadoEm)}</p>
      {avaliacao.respostaArtesao && (
        <p className="rounded-raio bg-fundo px-3 py-2 text-apoio text-tinta-2">
          <span className="font-bold text-tinta">Resposta do artesão:</span> {avaliacao.respostaArtesao}
        </p>
      )}
    </li>
  );
}

export function PaginaAvaliacoes({ produtoId }: { produtoId: string }) {
  const produto = useProduto(produtoId);
  const avaliacoes = useAvaliacoesDaPeca(produtoId);
  const [filtro, setFiltro] = useState<number | null>(null);

  useEffect(() => {
    if (produto.dados) document.title = `Avaliações de ${produto.dados.nome} · Origem`;
  }, [produto.dados]);

  const carregando = produto.carregando || avaliacoes.carregando;
  const erro = produto.erro ?? avaliacoes.erro;
  const visiveis = filtro ? avaliacoes.itens.filter((a) => a.nota === filtro) : avaliacoes.itens;

  return (
    <Container className="flex flex-col gap-6 py-secao">
      <header className="flex flex-col gap-3">
        <Link href={`/produto/${produtoId}`} className="inline-flex min-h-10 items-center gap-1 self-start text-apoio text-terracota hover:underline">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Voltar para a peça
        </Link>
        {produto.dados ? (
          <div className="flex items-center gap-4">
            <Image src={produto.dados.imagemPrincipal} alt="" width={64} height={64} className="size-16 rounded-raio object-cover" />
            <div className="flex flex-col gap-1">
              <h1 className="font-titulo text-h1 font-bold text-tinta">Avaliações</h1>
              <p className="text-apoio text-tinta-3">{produto.dados.nome} · {produto.dados.artesao.loja}</p>
            </div>
          </div>
        ) : (
          <h1 className="font-titulo text-h1 font-bold text-tinta">Avaliações</h1>
        )}
      </header>

      {carregando && (
        <div role="status" aria-label="Carregando avaliações" className="grid gap-4 lg:grid-cols-[18rem_1fr_20rem]">
          <Esqueleto className="h-56" /><Esqueleto className="h-56" /><Esqueleto className="h-32" />
        </div>
      )}
      {erro?.status === 404 && (
        <EstadoVazio titulo="Não encontramos essa peça" descricao="Ela pode ter sido vendida ou retirada pelo artesão." acao={<BotaoLink href="/catalogo">Voltar para o catálogo</BotaoLink>} />
      )}
      {erro && erro.status !== 404 && (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={() => { produto.recarregar(); avaliacoes.recarregar(); }} />
      )}

      {!carregando && !erro && produto.dados && (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
            <section aria-labelledby="media-titulo" className={CARTAO}>
              <h2 id="media-titulo" className="font-titulo text-h3 font-bold text-tinta">Média geral</h2>
              <p className="font-titulo text-display font-bold leading-none tabular-nums text-tinta">
                {avaliacoes.total ? formatarNota(avaliacoes.media) : "–"}
              </p>
              <Estrelas nota={avaliacoes.media} />
              <p className="text-legenda text-tinta-3">{plural(avaliacoes.total, "avaliação verificada", "avaliações verificadas")}</p>
              <div className="flex flex-wrap gap-2">
                <MediaDoArtesao artesaoId={produto.dados.artesao.id} />
                {avaliacoes.total > 0 && (
                  <span className="rounded-full bg-aviso px-3 py-1 text-legenda font-bold uppercase tracking-wide text-tinta">
                    Peça {formatarNota(avaliacoes.media)}
                  </span>
                )}
              </div>
            </section>

            <section aria-labelledby="distribuicao-titulo" className={CARTAO}>
              <h2 id="distribuicao-titulo" className="font-titulo text-h3 font-bold text-tinta">Distribuição de notas</h2>
              <dl className="flex flex-col gap-3">
                {NOTAS.map((nota) => {
                  const quantidade = avaliacoes.itens.filter((a) => a.nota === nota).length;
                  const percentual = avaliacoes.total ? Math.round((quantidade / avaliacoes.total) * 100) : 0;
                  return (
                    <div key={nota} className="flex flex-col gap-1">
                      <dt className="text-apoio text-tinta">{nota} ★</dt>
                      <dd className="h-2 overflow-hidden rounded-full bg-fundo">
                        <div className="h-full rounded-full bg-aviso" style={{ width: `${percentual}%` }} aria-hidden="true" />
                      </dd>
                      <dd className="text-legenda tabular-nums text-tinta-3">{percentual}%</dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            <section aria-labelledby="filtro-titulo" className={CARTAO}>
              <h2 id="filtro-titulo" className="font-titulo text-h3 font-bold text-tinta">Filtrar por nota</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por nota">
                <Chip ativo={filtro === null} onClick={() => setFiltro(null)}>Todas</Chip>
                {NOTAS.map((nota) => (
                  <Chip key={nota} ativo={filtro === nota} onClick={() => setFiltro(nota)}>{nota} ★</Chip>
                ))}
              </div>
            </section>
          </div>

          <FormularioAvaliacao produto={produto.dados} />

          <section aria-labelledby="lista-titulo" className="flex flex-col gap-4">
            <h2 id="lista-titulo" className="sr-only">Comentários</h2>
            {visiveis.length === 0 ? (
              <EstadoVazio titulo={filtro ? `Nenhuma avaliação com ${filtro} estrelas` : "Esta peça ainda não tem avaliações"} descricao={filtro ? "Tire o filtro para ver as outras." : "Quem compra pode avaliar depois que o pedido chega."} />
            ) : (
              <ul className="flex flex-col gap-4">
                {visiveis.map((avaliacao) => (
                  <CartaoAvaliacao key={avaliacao.id} avaliacao={avaliacao} nomePeca={produto.dados!.nome} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Container>
  );
}
