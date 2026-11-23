"use client";

import { LogIn, ShoppingBag } from "lucide-react";
import { ItemCarrinho } from "@/components/carrinho/ItemCarrinho";
import { ResumoPedido } from "@/components/carrinho/ResumoPedido";
import { Container } from "@/components/layout/Container";
import { Recomendados } from "@/components/produto/Recomendados";
import { BotaoLink } from "@/components/ui/Botao";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoErro } from "@/components/ui/EstadoErro";
import { EstadoVazio } from "@/components/ui/EstadoVazio";
import { useCarrinho } from "@/hooks/useCarrinho";
import { useSessao } from "@/hooks/useSessao";
import { plural } from "@/lib/formato";

function CarrinhoCarregando() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]"
      role="status"
      aria-label="Carregando carrinho"
    >
      <div className="flex flex-col gap-4">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="grid gap-4 rounded-raio border border-borda bg-superficie p-5 sm:grid-cols-[7rem_1fr]"
          >
            <Esqueleto className="aspect-4/3 w-full sm:h-23 sm:w-28" />
            <div className="flex flex-col gap-3">
              <Esqueleto className="h-5 w-48" />
              <Esqueleto className="h-11 w-36" />
            </div>
          </div>
        ))}
      </div>
      <Esqueleto className="h-64 w-full" />
    </div>
  );
}

export function Carrinho() {
  const { usuario, pronta } = useSessao();
  const {
    carrinho,
    carregando,
    erro,
    recarregar,
    alterarQuantidade,
    remover,
  } = useCarrinho();
  const totalItens = carrinho.itens.reduce(
    (total, item) => total + item.quantidade,
    0,
  );
  const ehVisitante = pronta && (!usuario || usuario.papel !== "COMPRADOR");

  return (
    <Container className="flex flex-col gap-8 py-secao">
      <header className="flex flex-col gap-1">
        <h1 className="font-titulo text-h1 font-bold text-tinta">Carrinho</h1>
        <p className="text-apoio text-tinta-3">
          {carregando
            ? "Carregando suas escolhas"
            : plural(totalItens, "peça escolhida", "peças escolhidas")}
        </p>
      </header>

      {ehVisitante && (
        <div className="flex flex-col items-start justify-between gap-4 rounded-raio border border-borda bg-superficie p-4 text-corpo text-tinta-2 shadow-sm sm:flex-row sm:items-center">
          <p>
            Você está navegando como visitante. Para salvar suas peças e finalizar pedidos, entre com sua conta de comprador.
          </p>
          <BotaoLink href="/entrar" variante="contorno" className="shrink-0">
            <LogIn className="size-4" aria-hidden="true" />
            Entrar como comprador
          </BotaoLink>
        </div>
      )}

      {carregando && <CarrinhoCarregando />}

      {!carregando && erro && (
        <EstadoErro mensagem={erro.message} aoTentarDeNovo={recarregar} />
      )}

      {!carregando && !erro && carrinho.itens.length === 0 && (
        <EstadoVazio
          titulo="Seu carrinho está vazio"
          descricao={
            ehVisitante
              ? "Entre com sua conta de comprador para ver itens salvos ou explore o catálogo para escolher uma peça feita à mão."
              : "Encontre uma peça feita à mão e volte quando quiser."
          }
          acao={
            ehVisitante ? (
              <div className="flex flex-wrap gap-3">
                <BotaoLink href="/entrar">
                  <LogIn className="size-4" aria-hidden="true" />
                  Entrar na conta
                </BotaoLink>
                <BotaoLink href="/catalogo" variante="contorno">
                  <ShoppingBag className="size-4" aria-hidden="true" />
                  Explorar o catálogo
                </BotaoLink>
              </div>
            ) : (
              <BotaoLink href="/catalogo">
                <ShoppingBag className="size-4" aria-hidden="true" />
                Explorar o catálogo
              </BotaoLink>
            )
          }
        />
      )}

      {!carregando && !erro && carrinho.itens.length > 0 && (
        <>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex flex-col gap-4">
              {carrinho.itens.map((item) => (
                <ItemCarrinho
                  key={item.produtoId}
                  item={item}
                  aoAlterarQuantidade={(quantidade) =>
                    alterarQuantidade(item.produtoId, quantidade)
                  }
                  aoRemover={() => remover(item.produtoId)}
                />
              ))}
            </div>

            <ResumoPedido
              subtotal={carrinho.valorTotal}
              frete={null}
              total={null}
              acao={
                <BotaoLink href="/checkout" larguraTotal>
                  Finalizar compra
                </BotaoLink>
              }
            />
          </div>

          <Recomendados produtoId={carrinho.itens[0].produtoId} />
        </>
      )}
    </Container>
  );
}
