"use client";

import Link from "next/link";
import { useState } from "react";
import { SeletorQuantidade } from "@/components/produto/SeletorQuantidade";
import { Botao } from "@/components/ui/Botao";
import { Foto } from "@/components/ui/Foto";
import { toaster } from "@/components/ui/toaster";
import { formatarMoeda } from "@/lib/formato";
import { ApiError } from "@/lib/http";
import type { ItemCarrinho as ItemCarrinhoTipo } from "@/types";

export function ItemCarrinho({
  item,
  aoAlterarQuantidade,
  aoRemover,
}: {
  item: ItemCarrinhoTipo;
  aoAlterarQuantidade: (quantidade: number) => Promise<void>;
  aoRemover: () => Promise<void>;
}) {
  const [acao, setAcao] = useState<"quantidade" | "remover" | null>(null);

  async function alterar(quantidade: number) {
    setAcao("quantidade");
    try {
      await aoAlterarQuantidade(quantidade);
    } catch (causa) {
      toaster.create({
        type: "error",
        title: "Não foi possível alterar a quantidade",
        description:
          causa instanceof ApiError
            ? causa.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setAcao(null);
    }
  }

  async function remover() {
    setAcao("remover");
    try {
      await aoRemover();
    } catch (causa) {
      toaster.create({
        type: "error",
        title: "Não foi possível remover a peça",
        description:
          causa instanceof ApiError
            ? causa.message
            : "Tente novamente em instantes.",
      });
    } finally {
      setAcao(null);
    }
  }

  return (
    <article className="grid gap-4 rounded-raio border border-borda bg-superficie p-4 shadow-card sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <Link
        href={`/produto/${item.produtoId}`}
        className="relative aspect-4/3 w-full overflow-hidden rounded-raio bg-superficie-2 sm:h-23 sm:w-28"
      >
        <Foto
          src={item.imagemPrincipal}
          alt={item.nome}
          fill
          sizes="(min-width: 640px) 112px, 100vw"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-col items-start gap-3">
        <h2 className="font-titulo text-h3 font-bold text-tinta">
          <Link href={`/produto/${item.produtoId}`} className="hover:underline">
            {item.nome}
          </Link>
        </h2>
        <SeletorQuantidade
          valor={item.quantidade}
          maximo={99}
          desabilitado={acao !== null}
          aoMudar={(quantidade) => void alterar(quantidade)}
        />
      </div>

      <div className="flex items-end justify-between gap-4 sm:flex-col sm:justify-center sm:text-right">
        <div className="flex flex-col gap-1 tabular-nums">
          <p className="text-legenda text-tinta-3">
            Unitário {formatarMoeda(item.precoUnitario)}
          </p>
          <p className="text-apoio font-bold text-tinta">
            {formatarMoeda(item.precoUnitario * item.quantidade)}
          </p>
        </div>
        <Botao
          variante="fantasma"
          carregando={acao === "remover"}
          disabled={acao !== null}
          className="h-10"
          onClick={() => void remover()}
        >
          Remover
        </Botao>
      </div>
    </article>
  );
}
