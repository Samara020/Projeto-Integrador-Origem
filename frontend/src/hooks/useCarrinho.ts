"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useSessao } from "@/hooks/useSessao";
import { ApiError } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import { CARRINHO_VAZIO, carrinhoStore } from "@/store/carrinho";
import type { ProdutoResumo } from "@/types";

let chaveCarregada: string | null = null;
let carregamento: Promise<void> | null = null;

function carregarPara(chave: string, forcar = false): Promise<void> {
  if (!forcar && chaveCarregada === chave) return Promise.resolve();
  if (!forcar && carregamento && chaveCarregada === null) return carregamento;

  chaveCarregada = null;
  carregamento = carrinhoService
    .obter()
    .then((carrinho) => {
      chaveCarregada = chave;
      carrinhoStore.definir(carrinho);
    })
    .finally(() => {
      carregamento = null;
    });
  return carregamento;
}

export function useCarrinho() {
  const { usuario, pronta } = useSessao();
  const [tentativa, setTentativa] = useState(0);
  const [estadoCarga, setEstadoCarga] = useState<{
    chave: string;
    erro: ApiError | null;
  } | null>(null);

  const chaveSessao = pronta ? `${usuario?.id ?? "visitante"}:${tentativa}` : null;

  const carrinho = useSyncExternalStore(
    carrinhoStore.assinar,
    carrinhoStore.obter,
    () => CARRINHO_VAZIO,
  );

  useEffect(() => {
    if (!chaveSessao) return;
    let ativo = true;
    const forcar = tentativa > 0;
    carregarPara(chaveSessao, forcar)
      .then(() => {
        if (ativo) setEstadoCarga({ chave: chaveSessao, erro: null });
      })
      .catch((causa) => {
        if (!ativo) return;
        setEstadoCarga({
          chave: chaveSessao,
          erro:
            causa instanceof ApiError
              ? causa
              : new ApiError(0, "Não foi possível carregar seu carrinho."),
        });
      });
    return () => {
      ativo = false;
    };
  }, [chaveSessao, tentativa]);

  const recarregar = useCallback(() => {
    setTentativa((n) => n + 1);
  }, []);

  const atual = chaveSessao && estadoCarga?.chave === chaveSessao ? estadoCarga : null;
  const carregando = !pronta || (chaveCarregada !== chaveSessao && !atual);

  return {
    carrinho,
    carregando,
    erro: atual?.erro ?? null,
    recarregar,
    totalItens: carrinho.itens.reduce((n, item) => n + item.quantidade, 0),

    async adicionar(produto: ProdutoResumo, quantidade = 1) {
      carrinhoStore.definir(
        await carrinhoService.adicionar(produto, quantidade),
      );
    },

    async alterarQuantidade(produtoId: string, quantidade: number) {
      carrinhoStore.definir(
        await carrinhoService.alterarQuantidade(produtoId, quantidade),
      );
    },

    async remover(produtoId: string) {
      carrinhoStore.definir(await carrinhoService.remover(produtoId));
    },

    async esvaziar() {
      carrinhoStore.definir(await carrinhoService.esvaziar());
    },
  };
}
