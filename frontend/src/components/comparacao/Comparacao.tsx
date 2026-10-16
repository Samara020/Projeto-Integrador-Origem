"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { toaster } from "@/components/ui/toaster";
import { useCarrinho } from "@/hooks/useCarrinho";
import { useComparacao, useProdutosComparados } from "@/hooks/useComparacao";
import { formatarMoeda, formatarNota, plural } from "@/lib/formato";
import type { Disponibilidade, ProdutoDetalhe } from "@/types";

const DISPONIBILIDADES: Record<Disponibilidade, string> = { DISPONIVEL: "Em estoque", RESERVADO: "Reservada", VENDIDO: "Vendida" };

const LINHAS: { rotulo: string; valor: (p: ProdutoDetalhe) => ReactNode }[] = [
  { rotulo: "Dimensões", valor: (p) => p.dimensoes },
  { rotulo: "Material", valor: (p) => p.material },
  { rotulo: "Técnica", valor: (p) => p.tecnica.nome },
  { rotulo: "Região", valor: (p) => p.regiao.nome },
  { rotulo: "Avaliação", valor: (p) => (p.totalAvaliacoes ? `${formatarNota(p.avaliacaoMedia)} ★ (${plural(p.totalAvaliacoes, "avaliação", "avaliações")})` : "Sem avaliações") },
  { rotulo: "Disponibilidade", valor: (p) => DISPONIBILIDADES[p.disponibilidade] },
  { rotulo: "Autenticidade", valor: (p) => (p.seloAtivo ? "Selo verificado" : "Em validação") },
];

function CartaoPeca({ produto, aoRemover }: { produto: ProdutoDetalhe; aoRemover: () => void }) {
  const { adicionar } = useCarrinho();
  const [enviando, setEnviando] = useState(false);
  const disponivel = produto.disponibilidade === "DISPONIVEL";

  async function comprar() {
    setEnviando(true);
    try {
      await adicionar(produto);
      toaster.create({ type: "success", title: "Peça no carrinho", description: produto.nome });
    } catch {
      toaster.create({ type: "error", title: "Não deu para adicionar", description: "Tente de novo em instantes." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-raio border border-borda bg-superficie p-3">
      <div className="relative h-23 w-full overflow-hidden rounded-raio bg-superficie-2">
        <Image src={produto.imagemPrincipal} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
      </div>
      <h2 className="font-titulo text-h3 font-bold text-tinta">
        <Link href={`/produto/${produto.id}`} className="hover:underline">{produto.nome}</Link>
      </h2>
      <p className="text-legenda text-tinta-3">{produto.artesao.nome}</p>
      <p className="text-apoio font-bold tabular-nums text-selo">{formatarMoeda(produto.preco)}</p>
      <div className="flex flex-wrap gap-2">
        <Botao carregando={enviando} disabled={!disponivel} onClick={() => void comprar()} className="h-10">
          {disponivel ? "Adicionar ao carrinho" : DISPONIBILIDADES[produto.disponibilidade]}
        </Botao>
        <Botao variante="contorno" onClick={aoRemover} className="h-10">Remover</Botao>
      </div>
    </article>
  );
}

function Conteudo() {
  const parametros = useSearchParams();
  const lista = useComparacao();
  // ?ids= permite compartilhar o link; sem ele, vale a lista guardada no navegador.
  const daUrl = (parametros.get("ids") ?? "").split(",").filter(Boolean);
  const ids = daUrl.length > 0 ? daUrl : lista.ids;
  const { dados, carregando, erro, recarregar } = useProdutosComparados(ids);

  function remover(id: string) {
    lista.remover(id);
    if (daUrl.length > 0) window.history.replaceState(null, "", `/comparar?ids=${daUrl.filter((i) => i !== id).join(",")}`);
  }

  if (ids.length === 0) {
    return <EstadoVazio titulo="Nenhuma peça para comparar" descricao="Abra uma peça e use o botão Comparar. Dá para colocar até 3 lado a lado." acao={<BotaoLink href="/catalogo">Ir para o catálogo</BotaoLink>} />;
  }
  if (carregando) {
    return <div role="status" aria-label="Carregando comparação" className="grid gap-4 md:grid-cols-3">{ids.map((id) => <Esqueleto key={id} className="h-72" />)}</div>;
  }
  if (erro) return <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />;
  if (!dados || dados.length === 0) {
    return <EstadoVazio titulo="Essas peças não estão mais disponíveis" descricao="Elas podem ter sido vendidas ou retiradas do catálogo." acao={<BotaoLink href="/catalogo">Ir para o catálogo</BotaoLink>} />;
  }

  // No celular as peças empilham; a partir de md ficam lado a lado, uma coluna por peça.
  const colunas = { "--colunas": dados.length } as React.CSSProperties;
  const grade = "grid gap-4 md:grid-cols-[repeat(var(--colunas),minmax(0,1fr))]";
  return (
    <div className="flex flex-col gap-6">
      <div className={grade} style={colunas}>
        {dados.map((p) => <CartaoPeca key={p.id} produto={p} aoRemover={() => remover(p.id)} />)}
      </div>
      <dl className="flex flex-col gap-3">
        {LINHAS.map((linha) => (
          <div key={linha.rotulo} className="flex flex-col gap-2 rounded-raio bg-superficie px-3 py-3">
            <dt className="text-legenda font-bold uppercase tracking-wide text-tinta-3">{linha.rotulo}</dt>
            <div className={grade} style={colunas}>
              {dados.map((p) => (
                <dd key={p.id} className="rounded-raio bg-areia px-3 py-2 text-apoio font-bold text-tinta">
                  <span className="block text-legenda font-normal text-tinta-3 md:hidden">{p.nome}</span>
                  {linha.valor(p)}
                </dd>
              ))}
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Comparacao() {
  const lista = useComparacao();
  return (
    <Container className="flex flex-col gap-6 py-secao">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-titulo text-h1 font-bold text-tinta">Compare histórias, técnicas e detalhes.</h1>
        {lista.ids.length > 0 && (
          <button type="button" onClick={lista.limpar} className="inline-flex h-10 items-center text-apoio text-terracota hover:underline">Limpar comparação</button>
        )}
      </header>
      <Suspense fallback={<Esqueleto className="h-72" />}>
        <Conteudo />
      </Suspense>
    </Container>
  );
}
