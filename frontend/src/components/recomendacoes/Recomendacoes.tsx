"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { ProdutoRecomendado } from "@/components/recomendacoes/ProdutoRecomendado";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { useHistorico } from "@/hooks/useHistorico";
import { useDestaques, useProdutos, useRecomendados } from "@/hooks/useProdutos";
import { useSessao } from "@/hooks/useSessao";
import { plural } from "@/lib/formato";
import type { PecaVista } from "@/services/historico";
import type { ProdutoSugerido } from "@/types";

function maisFrequente<T extends string>(valores: T[]): T | undefined {
  const contagem = new Map<T, number>();
  for (const v of valores) contagem.set(v, (contagem.get(v) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function Secao({ titulo, carregando, erro, recarregar, itens, motivoDe, tomDe }: {
  titulo: string; carregando: boolean; erro: { message: string } | null; recarregar: () => void;
  itens: ProdutoSugerido[]; motivoDe: (p: ProdutoSugerido) => string; tomDe?: (p: ProdutoSugerido) => "terracota" | "selo";
}) {
  if (!carregando && !erro && itens.length === 0) return null;
  return (
    <section aria-label={titulo} className="relative flex flex-col gap-3">
      <h2 className="font-titulo text-h3 font-bold text-tinta">{titulo}</h2>
      {carregando && <div role="status" aria-label="Carregando sugestões" className="flex flex-col gap-3"><Esqueleto className="h-48" /><Esqueleto className="h-48" /></div>}
      {erro && <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />}
      <div className="flex flex-col gap-3">
        {itens.slice(0, 2).map((p) => (
          <div key={p.id} className="relative">
            <ProdutoRecomendado produto={p} motivo={motivoDe(p)} tom={tomDe?.(p)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function PeloHistorico({ vista, r }: { vista: PecaVista; r: ReturnType<typeof useRecomendados> }) {
  return (
    <Secao
      titulo="Baseado no seu histórico"
      carregando={r.carregando} erro={r.erro} recarregar={r.recarregar}
      itens={r.dados?.recomendados ?? []}
      motivoDe={(p) => (p.motivo ?? (p.artesao.id === vista.artesaoId ? `Do mesmo ateliê de ${vista.nome}` : `Porque você viu ${vista.tecnicaNome.toLowerCase()}`))}
      tomDe={(p) => (p.artesao.id === vista.artesaoId ? "selo" : "terracota")}
    />
  );
}

function PelaRegiao({ regiaoId, regiaoNome, excluir }: { regiaoId: string; regiaoNome: string; excluir: string[] }) {
  const r = useProdutos({ regiao: regiaoId, disponivel: true, limite: 12 });
  const itens = (r.dados?.itens ?? []).filter((p) => !excluir.includes(p.id));
  return (
    <Secao titulo="Peças da sua região favorita" carregando={r.carregando} erro={r.erro} recarregar={r.recarregar} itens={itens} motivoDe={() => `Feito na sua região favorita, ${regiaoNome}`} />
  );
}

function Destaques() {
  const r = useDestaques();
  return (
    <Secao titulo="Destaques para começar" carregando={r.carregando} erro={r.erro} recarregar={r.recarregar} itens={r.dados?.itens ?? []} motivoDe={() => "Escolha da equipe"} />
  );
}

function Descobertas({ vistos }: { vistos: PecaVista[] }) {
  const tecnica = maisFrequente(vistos.map((v) => v.tecnicaId));
  const todas = useProdutos({ limite: 48 });
  const vistosArtesaos = new Set(vistos.map((v) => v.artesaoId));
  const itens = todas.dados?.itens ?? [];
  // Primeiro quem trabalha a técnica mais vista; se todos já foram vistos, os outros artesãos.
  const naoVistos = itens.filter((p) => !vistosArtesaos.has(p.artesao.id));
  const preferidos = tecnica ? naoVistos.filter((p) => vistos.some((v) => v.tecnicaId === tecnica) && p.regiao.id === vistos[0]?.regiaoId) : [];
  const artesaos = [...new Map((preferidos.length ? preferidos : naoVistos).map((p) => [p.artesao.id, p.artesao])).values()].slice(0, 4);
  const ultimo = vistos[0];
  const pecasDoArtesao = itens.filter((p) => ultimo && p.artesao.id === ultimo.artesaoId);

  return (
    <div className="flex flex-col gap-3">
      <section aria-labelledby="artesaos-titulo" className="flex flex-col gap-2 rounded-raio border border-borda bg-superficie p-4">
        <h2 id="artesaos-titulo" className="font-titulo text-h3 font-bold text-tinta">Artesãos que você pode gostar</h2>
        {artesaos.length === 0 ? (
          <p className="text-apoio text-tinta-2">Abra mais peças e as sugestões de artesãos aparecem aqui.</p>
        ) : (
          <p className="text-apoio text-tinta-2">
            {artesaos.map((a, i) => (
              <span key={a.id}>
                {i > 0 && <span aria-hidden="true"> · </span>}
                <Link href={`/artesao/${a.id}`} className="text-terracota hover:underline">{a.nome}</Link>
              </span>
            ))}
          </p>
        )}
      </section>
      {ultimo && pecasDoArtesao.length > 0 && (
        <section aria-labelledby="novidades-titulo" className="flex flex-col gap-2 rounded-raio border border-borda bg-superficie p-4">
          <h2 id="novidades-titulo" className="font-titulo text-h3 font-bold text-tinta">Novidades de quem você viu</h2>
          <p className="text-apoio text-tinta-2">
            {plural(pecasDoArtesao.length, "peça", "peças")} de{" "}
            <Link href={`/artesao/${ultimo.artesaoId}`} className="text-terracota hover:underline">{ultimo.artesaoNome}</Link> no catálogo.
          </p>
        </section>
      )}
    </div>
  );
}

export function Recomendacoes() {
  const { usuario } = useSessao();
  const { vistos } = useHistorico();
  const ultima = vistos[0];
  const pelaUltima = useRecomendados(ultima?.id ?? "");
  // A seção da região não repete o que já apareceu na do histórico.
  const jaMostradas = (pelaUltima.dados?.recomendados ?? []).slice(0, 2).map((p) => p.id);
  const regiaoId = maisFrequente(vistos.map((v) => v.regiaoId));
  const regiaoNome = vistos.find((v) => v.regiaoId === regiaoId)?.regiaoNome ?? "";
  const primeiroNome = usuario?.nome.split(" ")[0];

  return (
    <Container className="flex flex-col gap-6 py-secao">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-titulo text-h1 font-bold text-tinta">
            {primeiroNome ? `Feito para o seu olhar, ${primeiroNome}.` : "Feito para o seu olhar."}
          </h1>
          <p className="max-w-2xl text-corpo text-tinta-2">Curadoria baseada nas histórias, regiões e técnicas que você aprecia.</p>
        </div>
        <BotaoLink href="/catalogo" variante="contorno">Ver o catálogo</BotaoLink>
      </header>

      {ultima ? <PeloHistorico vista={ultima} r={pelaUltima} /> : <Destaques />}
      {regiaoId && <PelaRegiao regiaoId={regiaoId} regiaoNome={regiaoNome} excluir={[...vistos.map((v) => v.id), ...jaMostradas]} />}
      <Descobertas vistos={vistos} />
    </Container>
  );
}
