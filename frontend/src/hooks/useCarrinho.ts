"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { authService } from "@/services/auth";
import { carrinhoService } from "@/services/carrinho";
import { CARRINHO_VAZIO, carrinhoStore } from "@/store/carrinho";
import type { ProdutoResumo } from "@/types";

let tokenCarregado: string | null | undefined = undefined;
let carregamento: Promise<void> | null = null;

function sincronizarCarrinho(forcar = false): Promise<void> {
  const tokenAtual = authService.sessaoAtual()?.token ?? null;

  if (!forcar && tokenCarregado === tokenAtual) return Promise.resolve();
  if (carregamento) return carregamento;

  carregamento = carrinhoService
    .obter()
    .then((carrinho) => {
      tokenCarregado = tokenAtual;
      carrinhoStore.definir(carrinho);
    })
    .finally(() => {
      carregamento = null;
    });

  return carregamento;
}

export function useCarrinho() {
  const carrinho = useSyncExternalStore(
    carrinhoStore.assinar,
    carrinhoStore.obter,
    () => CARRINHO_VAZIO,
  );

  const [erro, setErro] = useState<Error | null>(null);
  const [carregando, setCarregando] = useState(
    tokenCarregado !== (authService.sessaoAtual()?.token ?? null),
  );

  const carregar = useCallback(async (forcar: boolean) => {
    setCarregando(true);
    setErro(null);
    try {
      await sincronizarCarrinho(forcar);
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa
          : new Error("Não foi possível carregar o carrinho."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  const recarregar = useCallback(() => carregar(true), [carregar]);

  useEffect(() => {
    let ativo = true;
    void sincronizarCarrinho(false)
      .then(() => {
        if (!ativo) return;
        setErro(null);
        setCarregando(false);
      })
      .catch((causa: unknown) => {
        if (!ativo) return;
        setErro(
          causa instanceof Error
            ? causa
            : new Error("Não foi possível carregar o carrinho."),
        );
        setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  async function atualizarComTratamento(acao: () => Promise<unknown>) {
    setErro(null);
    try {
      await acao();
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa
          : new Error("Não foi possível atualizar o carrinho."),
      );
      throw causa;
    }
  }

  return {
    carrinho,
    carregando,
    erro,
    recarregar,
    totalItens: carrinho.itens.reduce((n, item) => n + item.quantidade, 0),

    async adicionar(produto: ProdutoResumo, quantidade = 1) {
      await atualizarComTratamento(async () => {
        const sessao = authService.sessaoAtual();
        const adicionar =
          sessao?.token && sessao.usuario.papel === "COMPRADOR"
            ? carrinhoService.adicionar(produto, quantidade)
            : carrinhoService.adicionarVisitante(produto, quantidade);
        carrinhoStore.definir(
          await adicionar,
        );
      });
    },

    async alterarQuantidade(produtoId: string, quantidade: number) {
      await atualizarComTratamento(async () => {
        carrinhoStore.definir(
          await carrinhoService.alterarQuantidade(produtoId, quantidade),
        );
      });
    },

    async remover(produtoId: string) {
      await atualizarComTratamento(async () => {
        carrinhoStore.definir(await carrinhoService.remover(produtoId));
      });
    },

    async esvaziar() {
      await atualizarComTratamento(async () => {
        carrinhoStore.definir(await carrinhoService.esvaziar());
      });
    },
  };
}
