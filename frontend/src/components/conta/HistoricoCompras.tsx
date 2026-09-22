"use client";

import { Download, PackageCheck, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Container } from "@/components/layout/Container";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { usePedidos } from "@/hooks/usePedidos";
import { formatarData, formatarMoeda, plural } from "@/lib/formato";
import type { PedidoResumo, StatusPedido } from "@/types";

const ROTULOS_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  ENVIADO: "Em entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

function CartaoCarregando() {
  return (
    <div className="flex flex-col gap-4 rounded-painel border border-borda bg-superficie p-4 shadow-card">
      <Esqueleto className="h-7 w-48" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex gap-3 rounded-raio border border-borda p-4">
          <Esqueleto className="size-14 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Esqueleto className="h-4 w-2/3" />
            <Esqueleto className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: PedidoResumo }) {
  const primeiroItem = pedido.itens[0];
  const quantidade = pedido.itens.reduce((total, item) => total + item.quantidade, 0);

  return (
    <article className="flex flex-col gap-3 rounded-raio border border-borda bg-superficie p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="break-all text-legenda font-bold text-terracota">PEDIDO #{pedido.id}</p>
          <p className="text-apoio text-tinta-3">{formatarData(pedido.criadoEm)}</p>
        </div>
        <span className="rounded-full bg-superficie-2 px-3 py-1 text-legenda font-bold text-tinta-2">
          {ROTULOS_STATUS[pedido.status]}
        </span>
      </div>

      {primeiroItem ? (
        <div className="flex items-center gap-3">
          <Image
            src={primeiroItem.imagemPrincipal}
            alt={primeiroItem.nome}
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-raio object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-apoio font-bold text-tinta">{primeiroItem.nome}</p>
            <p className="text-apoio text-tinta-3">
              {plural(quantidade, "item", "itens")} · {formatarMoeda(pedido.valorTotal)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-apoio text-tinta-3">Itens do pedido indisponíveis.</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-apoio">
        <p className="text-tinta-2">Total: {formatarMoeda(pedido.valorTotal)}</p>
        <Link href={`/conta/pedidos/${pedido.id}`} className="font-bold text-terracota hover:underline">
          Acompanhar pedido
        </Link>
      </div>
    </article>
  );
}

export function HistoricoCompras() {
  const pedidos = usePedidos();
  const historico = useRef<HTMLElement>(null);

  function baixarHistorico() {
    if (!pedidos.dados) return;
    const conteudo = pedidos.dados.pedidos
      .map((pedido) => `${pedido.id};${formatarData(pedido.criadoEm)};${ROTULOS_STATUS[pedido.status]};${formatarMoeda(pedido.valorTotal)}`)
      .join("\n");
    const url = URL.createObjectURL(new Blob([`Pedido;Data;Status;Total\n${conteudo}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "historico-de-compras-origem.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const total = pedidos.dados?.pedidos.length ?? 0;

  return (
    <Container className="grid flex-1 gap-10 py-secao lg:grid-cols-[minmax(0,560px)_minmax(0,626px)] lg:justify-center">
      <section className="flex flex-col items-start gap-5">
        <div className="inline-flex size-16 items-center justify-center rounded-full bg-terracota text-white">
          <ShoppingBag className="size-7" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-apoio font-bold text-terracota">SEU HISTÓRICO</p>
          <h1 className="font-titulo text-h1 font-bold text-tinta">Compras realizadas</h1>
          <p className="text-apoio text-tinta-3">Acompanhe pedidos, status de entrega e detalhes de cada compra feita na Origem.</p>
        </div>
        <div className="w-full rounded-raio border border-borda bg-superficie p-5 shadow-card">
          <p className="text-apoio font-bold text-tinta">{plural(total, "pedido concluído", "pedidos concluídos")}</p>
          <p className="mt-3 text-apoio text-tinta-3">Acompanhe o status de entrega e revise os itens comprados com clareza.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Botao onClick={() => historico.current?.scrollIntoView({ behavior: "smooth" })}>Ver todos os pedidos</Botao>
          <Botao variante="secundario" onClick={baixarHistorico} disabled={!pedidos.dados || total === 0}>
            <Download className="size-4" aria-hidden="true" /> Baixar histórico
          </Botao>
        </div>
        <a href="mailto:suporte@origem.com.br" className="text-apoio text-terracota hover:underline">Precisa de ajuda com um pedido? Fale com o suporte Origem.</a>
      </section>

      <section ref={historico} aria-labelledby="pedidos-recentes" className="flex min-h-96 flex-col overflow-hidden rounded-painel border border-borda bg-superficie shadow-card">
        <header className="border-b border-borda p-6">
          <h2 id="pedidos-recentes" className="font-titulo text-h2 font-bold text-tinta">Pedidos recentes</h2>
          <p className="mt-1 text-apoio text-tinta-3">Últimos pedidos realizados na loja</p>
        </header>
        <div className="flex flex-col gap-3 p-4">
          {pedidos.carregando && <CartaoCarregando />}
          {pedidos.erro && <EstadoErro mensagem={pedidos.erro.message} aoTentarDeNovo={pedidos.recarregar} />}
          {pedidos.dados && pedidos.dados.pedidos.length === 0 && (
            <EstadoVazio titulo="Você ainda não realizou compras" descricao="Quando encontrar uma peça especial, seus pedidos aparecerão aqui." acao={<BotaoLink href="/catalogo"><PackageCheck className="size-4" aria-hidden="true" /> Explorar catálogo</BotaoLink>} />
          )}
          {pedidos.dados?.pedidos.map((pedido) => <PedidoCard key={pedido.id} pedido={pedido} />)}
        </div>
      </section>
    </Container>
  );
}
