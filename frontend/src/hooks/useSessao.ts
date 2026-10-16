"use client";

import { useEffect, useSyncExternalStore } from "react";
import { authService } from "@/services/auth";
import { sessaoStore } from "@/store/sessao";
import type { DadosCadastro, DadosLogin } from "@/types";

let carregada = false;

function carregarUmaVez() {
  if (carregada) return;
  carregada = true;
  sessaoStore.definir(authService.sessaoAtual());
}

function lida() {
  return carregada;
}

export function useSessao() {
  const sessao = useSyncExternalStore(
    sessaoStore.assinar,
    sessaoStore.obter,
    () => null,
  );
  // false até ler o localStorage. Sem isso, a tela confunde "carregando" com "sem conta".
  const pronta = useSyncExternalStore(sessaoStore.assinar, lida, () => false);

  useEffect(() => {
    carregarUmaVez();
  }, []);

  return {
    sessao,
    usuario: sessao?.usuario ?? null,
    pronta,

    async entrar(dados: DadosLogin) {
      const nova = await authService.entrar(dados);
      sessaoStore.definir(nova);
      return nova;
    },

    async cadastrar(dados: DadosCadastro) {
      const nova = await authService.cadastrar(dados);
      sessaoStore.definir(nova);
      return nova;
    },

    async sair() {
      await authService.sair();
      sessaoStore.definir(null);
    },
  };
}
