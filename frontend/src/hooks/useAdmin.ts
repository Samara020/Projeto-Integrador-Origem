"use client";

import { useCallback, useState } from "react";
import { useConsulta } from "@/hooks/useConsulta";
import { ApiError } from "@/lib/http";
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import { sessaoStore } from "@/store/sessao";
import type {
  AcaoModeracao,
  AlteracaoSenha,
  DecisaoValidacao,
  PerfilAdminEdicao,
  StatusAvaliacao,
  StatusValidacao,
} from "@/types";

export function useMetricasAdmin() {
  return useConsulta("admin:metricas", (sinal) => adminService.metricas(sinal));
}

export function usePecasPendentes(status?: StatusValidacao) {
  return useConsulta(`admin:pendentes:${status ?? "todas"}`, (sinal) =>
    adminService.pecasPendentes(status, sinal),
  );
}

export function useAvaliacoesSinalizadas(status?: StatusAvaliacao) {
  return useConsulta(`admin:sinalizadas:${status ?? "todas"}`, (sinal) =>
    adminService.avaliacoesSinalizadas(status, sinal),
  );
}

export function usePerfilAdmin() {
  return useConsulta("admin:perfil", (sinal) => adminService.perfil(sinal));
}

// Escrita: o botão entra em carregando, o service grava e `depois` recarrega a consulta.
export function useAcoesAdmin() {
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<ApiError | null>(null);

  const executar = useCallback(async <T>(chave: string, acao: () => Promise<T>): Promise<T> => {
    setSalvando(chave);
    setErro(null);
    try {
      return await acao();
    } catch (causa) {
      setErro(
        causa instanceof ApiError
          ? causa
          : new ApiError(0, "Não foi possível salvar. Tente de novo."),
      );
      throw causa;
    } finally {
      setSalvando(null);
    }
  }, []);

  return {
    salvando,
    erro,

    async validarPeca(id: string, decisao: DecisaoValidacao, depois: () => void) {
      const resultado = await executar(`validar:${id}`, () => adminService.validarPeca(id, decisao));
      depois();
      return resultado;
    },

    async moderarAvaliacao(id: string, acao: AcaoModeracao, depois: () => void) {
      const resultado = await executar(`moderar:${id}`, () =>
        adminService.moderarAvaliacao(id, acao),
      );
      depois();
      return resultado;
    },

    async salvarPerfil(dados: PerfilAdminEdicao, depois: () => void) {
      const resultado = await executar("perfil", () => adminService.salvarPerfil(dados));
      sessaoStore.definir(authService.sessaoAtual());
      depois();
      return resultado;
    },

    async alterarSenha(dados: AlteracaoSenha, depois: () => void) {
      const resultado = await executar("senha", () => adminService.alterarSenha(dados));
      depois();
      return resultado;
    },
  };
}
