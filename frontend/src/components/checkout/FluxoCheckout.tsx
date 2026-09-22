"use client";

import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { EtapasCompra } from "@/components/checkout/EtapasCompra";
import { FormularioEntrega } from "@/components/checkout/FormularioEntrega";
import { FormularioPagamento } from "@/components/checkout/FormularioPagamento";
import { Container } from "@/components/layout/Container";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { useCheckout } from "@/hooks/useCheckout";
import { formatarMoeda } from "@/lib/formato";
import type { EnderecoEntrega, MetodoPagamento } from "@/types";

function CheckoutCarregando() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" role="status">
      <Esqueleto className="h-120 w-full" />
      <Esqueleto className="h-64 w-full" />
      <span className="sr-only">Carregando checkout</span>
    </div>
  );
}

export function FluxoCheckout() {
  const checkout = useCheckout();
  const [etapa, setEtapa] = useState<2 | 3>(2);

  async function continuar(endereco: EnderecoEntrega) {
    await checkout.criarPedido(endereco);
    setEtapa(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pagar(
    metodoPagamento: MetodoPagamento,
    tokenCartao: string | null,
  ) {
    await checkout.pagar({ metodoPagamento, tokenCartao });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (checkout.pagamento?.status === "APROVADO" && checkout.pedido) {
    return (
      <Container className="flex flex-1 items-center justify-center py-secao">
        <section className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-painel border border-borda bg-superficie p-8 text-center shadow-card sm:p-12">
          <CheckCircle2 className="size-12 text-selo" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h1 className="font-titulo text-h1 font-bold text-tinta">
              Pagamento confirmado
            </h1>
            <p className="text-corpo text-tinta-2">
              Seu pedido foi recebido e quem fez as peças já pode começar a
              preparar o envio.
            </p>
          </div>
          <dl className="grid w-full gap-3 rounded-raio bg-fundo p-4 text-apoio sm:grid-cols-2">
            <div>
              <dt className="text-tinta-3">Pedido</dt>
              <dd className="break-all font-bold tabular-nums text-tinta">
                {checkout.pedido.pedidoId}
              </dd>
            </div>
            <div>
              <dt className="text-tinta-3">Total pago</dt>
              <dd className="font-bold tabular-nums text-tinta">
                {formatarMoeda(checkout.pedido.valorTotal)}
              </dd>
            </div>
          </dl>
          <BotaoLink href="/catalogo">Continuar explorando</BotaoLink>
        </section>
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-8 py-secao">
      <header className="flex flex-col gap-1">
        <h1 className="font-titulo text-h1 font-bold text-tinta">
          {etapa === 2 ? "Entrega" : "Pagamento"}
        </h1>
        <p className="text-apoio text-tinta-3">
          {etapa === 2
            ? "Confirme onde sua compra será entregue."
            : "Escolha a forma de pagamento para concluir."}
        </p>
      </header>

      <EtapasCompra atual={etapa} />

      {checkout.carregando && <CheckoutCarregando />}

      {!checkout.carregando && checkout.carrinho.itens.length === 0 && (
        <EstadoVazio
          titulo="Não há peças para finalizar"
          descricao="Adicione uma peça ao carrinho antes de seguir para o checkout."
          acao={
            <BotaoLink href="/catalogo">
              <ShoppingBag className="size-4" aria-hidden="true" />
              Explorar o catálogo
            </BotaoLink>
          }
        />
      )}

      {!checkout.carregando && checkout.carrinho.itens.length > 0 && etapa === 2 && (
        <FormularioEntrega
          subtotal={checkout.carrinho.valorTotal}
          opcaoEnvio={checkout.opcaoEnvio}
          aoContinuar={continuar}
        />
      )}

      {!checkout.carregando &&
        checkout.carrinho.itens.length > 0 &&
        etapa === 3 &&
        checkout.pedido && (
          <FormularioPagamento
            subtotal={checkout.carrinho.valorTotal}
            frete={checkout.opcaoEnvio.valor}
            total={checkout.pedido.valorTotal}
            aoPagar={pagar}
          />
        )}
    </Container>
  );
}
