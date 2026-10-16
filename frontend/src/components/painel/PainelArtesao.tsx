"use client";

import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Package,
  Plus,
  TriangleAlert,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { Cartao, TituloSecao } from "@/components/painel/CartaoPainel";
import { BotaoLink } from "@/components/ui/Botao";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { useMetricasArtesao } from "@/hooks/usePainelArtesao";
import { useSessao } from "@/hooks/useSessao";
import { formatarData, formatarInteiro, formatarMoeda, formatarNota, plural } from "@/lib/formato";
import type { MetricasArtesao, StatusProducao } from "@/types";

const ROTULO_STATUS: Record<StatusProducao, string> = {
  NOVO: "Novo",
  EM_PRODUCAO: "Em produção",
  PRONTO: "Pronto",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const ICONE_ALERTA: Record<string, typeof TriangleAlert> = {
  "estoque-baixo": TriangleAlert,
  "validacao-pendente": CircleCheck,
};

function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-label="Carregando painel" aria-busy="true">
      <Esqueleto className="h-8 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Esqueleto key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12">
        <Esqueleto className="h-64 xl:col-span-5" />
        <Esqueleto className="h-96 xl:col-span-7" />
      </div>
    </div>
  );
}

function CartaoIndicador({
  titulo,
  valor,
  detalhe,
  positivo,
}: {
  titulo: string;
  valor: string;
  detalhe: string;
  positivo?: boolean;
}) {
  return (
    <article className="flex min-h-32 flex-col gap-2 rounded-raio border border-borda bg-superficie p-4 shadow-card">
      <h2 className="text-legenda font-semibold text-tinta-3">{titulo}</h2>
      <p className="font-titulo text-h2 font-bold tabular-nums text-tinta">{valor}</p>
      <p className={`text-apoio ${positivo ? "text-selo" : "text-tinta-3"}`}>{detalhe}</p>
    </article>
  );
}

function GraficoVendas({ pontos }: { pontos: MetricasArtesao["vendasPorDia"] }) {
  const maior = Math.max(...pontos.map((ponto) => ponto.valor), 1);
  const resumo = pontos
    .map((ponto) => `${formatarData(ponto.dia)}: ${formatarMoeda(ponto.valor)}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Vendas por dia: ${resumo}`}
        className="flex h-40 items-end gap-1 border-b border-borda sm:gap-2"
      >
        {pontos.map((ponto, indice) => (
          <div
            key={ponto.dia}
            className={`w-full rounded-t-raio ${indice >= pontos.length - 3 ? "bg-terracota" : "bg-aviso"}`}
            style={{ height: `${Math.max((ponto.valor / maior) * 100, 6)}%` }}
          />
        ))}
      </div>
      <p className="text-legenda text-tinta-3">
        Primeiro e último dia: {formatarData(pontos[0].dia)} a{" "}
        {formatarData(pontos[pontos.length - 1].dia)}
      </p>
    </div>
  );
}

export default function PainelArtesao() {
  const consulta = useMetricasArtesao();
  const { usuario } = useSessao();
  const dados = consulta.dados;
  const primeiroNome = usuario?.nome.split(" ")[0] ?? "artesã";

  if (consulta.carregando) return <Carregando />;
  if (consulta.erro) {
    return <EstadoErro mensagem={consulta.erro.message} aoTentarDeNovo={consulta.recarregar} />;
  }
  if (!dados) return null;

  return (
    <div className="flex flex-col gap-6">
      <TituloSecao
        sobretitulo={`Ateliê de ${usuario?.nome ?? "artesão"}`}
        titulo={`Bom dia, ${primeiroNome}! Seu trabalho está viajando longe.`}
      />

      <section aria-label="Indicadores do mês" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoIndicador
          titulo="Vendas do mês"
          valor={formatarMoeda(dados.vendasMes)}
          detalhe={`+${formatarInteiro(dados.variacaoVendas)}% no mês passado`}
          positivo
        />
        <CartaoIndicador
          titulo="Pedidos pendentes"
          valor={formatarInteiro(dados.pedidosPendentes)}
          detalhe={`${plural(dados.pedidosNovos, "pedido novo", "pedidos novos")}`}
        />
        <CartaoIndicador
          titulo="Avaliação média"
          valor={formatarNota(dados.avaliacaoMedia)}
          detalhe={`${plural(dados.totalAvaliacoes, "avaliação", "avaliações")} · ${formatarInteiro(dados.produtosAtivos)} peças ativas`}
        />
        <CartaoIndicador
          titulo="Visualizações"
          valor={formatarInteiro(dados.visualizacoes)}
          detalhe={`+${formatarInteiro(dados.variacaoVisualizacoes)}% no mês passado`}
          positivo
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <Cartao
          titulo="Vendas nos últimos 30 dias"
          className="xl:col-span-5"
          acoes={
            <span className="inline-flex items-center gap-1 rounded-full bg-selo/10 px-3 py-1 text-legenda font-semibold text-selo">
              <CalendarDays className="size-3" aria-hidden="true" />
              Setembro
            </span>
          }
        >
          {dados.vendasPorDia.length === 0 ? (
            <EstadoVazio
              titulo="Sem vendas neste período"
              descricao="Os valores aparecem aqui assim que a primeira peça do mês for vendida."
            />
          ) : (
            <GraficoVendas pontos={dados.vendasPorDia} />
          )}
        </Cartao>

        <Cartao titulo="Precisa da sua atenção" className="xl:col-span-7">
          {dados.alertas.length === 0 ? (
            <EstadoVazio
              titulo="Nada pendente por aqui"
              descricao="Sem estoque baixo nem validação aguardando, o ateliê está em dia."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {dados.alertas.map((alerta) => {
                const Icone = ICONE_ALERTA[alerta.id] ?? TriangleAlert;
                return (
                  <li
                    key={alerta.id}
                    className="flex flex-col gap-2 rounded-raio bg-areia p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="flex items-center gap-2 text-apoio text-tinta">
                      <Icone className="size-4 shrink-0 text-aviso" aria-hidden="true" />
                      {alerta.mensagem}
                    </p>
                    <Link
                      href={alerta.destino}
                      className="inline-flex min-h-10 w-fit items-center gap-1 rounded-raio border border-terracota bg-superficie px-4 text-apoio font-bold text-terracota hover:bg-superficie-2"
                    >
                      {alerta.acao}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="font-titulo text-h3 font-bold text-tinta">Atalhos rápidos</h3>
            <div className="flex flex-wrap gap-2">
              <BotaoLink href="/painel/artesao/pecas/nova">
                <Plus className="size-4" aria-hidden="true" />
                Nova peça
              </BotaoLink>
              <BotaoLink href="/painel/artesao/pedidos" variante="secundario">
                <Package className="size-4" aria-hidden="true" />
                Pedidos
              </BotaoLink>
              <BotaoLink href="/painel/artesao/envio" variante="secundario">
                <Truck className="size-4" aria-hidden="true" />
                Frete
              </BotaoLink>
            </div>
          </div>
        </Cartao>
      </div>

      <Cartao
        titulo="Pedidos recentes"
        acoes={
          <Link
            href="/painel/artesao/pedidos"
            className="inline-flex min-h-10 items-center gap-1 text-apoio font-bold text-terracota hover:underline"
          >
            Ver todos
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        }
      >
        {dados.pedidosRecentes.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum pedido ainda"
            descricao="Quando alguém comprar uma peça sua, o pedido aparece aqui."
            acao={<BotaoLink href="/catalogo">Ver o catálogo</BotaoLink>}
          />
        ) : (
          <ul className="flex flex-col divide-y divide-borda">
            {dados.pedidosRecentes.map((pedido) => (
              <li
                key={pedido.id}
                className="flex flex-col gap-1 py-3 text-apoio text-tinta-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="tabular-nums">
                  {pedido.id.replace("ped_", "#")} · {pedido.comprador} · {pedido.itens}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold tabular-nums text-tinta">
                    {formatarMoeda(pedido.valorTotal)}
                  </span>
                  <span className="rounded-full bg-superficie-2 px-3 py-1 text-legenda font-semibold text-tinta-2">
                    {ROTULO_STATUS[pedido.statusProducao]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
