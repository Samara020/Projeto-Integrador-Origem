"use client";

import { ArrowLeft, PackageCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { usePedidos } from "@/hooks/usePedidos";
import { formatarData, formatarMoeda } from "@/lib/formato";
import type { StatusPedido } from "@/types";

const ROTULOS_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  ENVIADO: "Em entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

export function DetalhePedido({ id }: { id: string }) {
  const pedidos = usePedidos();
  const pedido = pedidos.dados?.pedidos.find((item) => item.id === id);

  return (
    <Container className="flex flex-1 flex-col gap-6 py-secao">
      <Link href="/conta" className="inline-flex min-h-10 items-center gap-2 self-start text-apoio font-bold text-terracota hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Voltar para compras
      </Link>

      {pedidos.carregando && (
        <div className="flex flex-col gap-4 rounded-painel border border-borda bg-superficie p-6 shadow-card">
          <Esqueleto className="h-7 w-56" />
          <Esqueleto className="h-5 w-36" />
          <Esqueleto className="h-36 w-full" />
        </div>
      )}
      {pedidos.erro && <EstadoErro mensagem={pedidos.erro.message} aoTentarDeNovo={pedidos.recarregar} />}
      {pedidos.dados && !pedido && (
        <EstadoVazio titulo="Pedido não encontrado" descricao="Esse pedido não está disponível no seu histórico." acao={<BotaoLink href="/conta">Ver compras</BotaoLink>} />
      )}
      {pedido && (
        <section className="flex max-w-3xl flex-col gap-6 rounded-painel border border-borda bg-superficie p-6 shadow-card">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-borda pb-5">
            <div>
              <p className="break-all text-apoio font-bold text-terracota">PEDIDO #{pedido.id}</p>
              <h1 className="mt-1 font-titulo text-h1 font-bold text-tinta">Detalhes da compra</h1>
              <p className="mt-1 text-apoio text-tinta-3">Realizado em {formatarData(pedido.criadoEm)}</p>
            </div>
            <span className="rounded-full bg-superficie-2 px-3 py-1 text-apoio font-bold text-tinta-2">{ROTULOS_STATUS[pedido.status]}</span>
          </header>
          <div className="flex flex-col gap-4">
            <h2 className="font-titulo text-h2 font-bold text-tinta">Itens comprados</h2>
            {pedido.itens.map((item) => (
              <div key={item.produtoId} className="flex items-center gap-4 rounded-raio border border-borda p-4">
                <Image src={item.imagemPrincipal} alt={item.nome} width={80} height={80} className="size-20 shrink-0 rounded-raio object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-apoio font-bold text-tinta">{item.nome}</p>
                  <p className="text-apoio text-tinta-3">Quantidade: {item.quantidade}</p>
                </div>
                <p className="text-apoio font-bold tabular-nums text-tinta">{formatarMoeda(item.precoUnitario * item.quantidade)}</p>
              </div>
            ))}
            {pedido.itens.length === 0 && <p className="text-apoio text-tinta-3">Os itens deste pedido não estão disponíveis.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-borda pt-5 text-corpo font-bold text-tinta">
            <span>Total pago</span>
            <span className="tabular-nums">{formatarMoeda(pedido.valorTotal)}</span>
          </div>
          <p className="flex items-center gap-2 text-apoio text-selo"><PackageCheck className="size-5" aria-hidden="true" /> Sua compra é acompanhada pela Origem.</p>
        </section>
      )}
    </Container>
  );
}
