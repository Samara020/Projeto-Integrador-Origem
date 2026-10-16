"use client";

import { useCallback, useState } from "react";
import { useConsulta } from "@/hooks/useConsulta";
import { ApiError } from "@/lib/http";
import { painelArtesaoService } from "@/services/painelArtesao";
import type {
  DadosFrete,
  NovoProduto,
  PedidoRecebido,
  PerfilArtesaoEdicao,
  SituacaoPeca,
  StatusProducao,
} from "@/types";

export function useMetricasArtesao() {
  return useConsulta("artesao:metricas", (sinal) => painelArtesaoService.metricas(sinal));
}

export function usePecasArtesao(situacao?: SituacaoPeca) {
  return useConsulta(`artesao:pecas:${situacao ?? "todas"}`, (sinal) =>
    painelArtesaoService.pecas(situacao, sinal),
  );
}

export function usePedidosArtesao(status?: StatusProducao) {
  return useConsulta(`artesao:pedidos:${status ?? "todos"}`, (sinal) =>
    painelArtesaoService.pedidos(sinal),
  );
}

export function usePerfilArtesao() {
  return useConsulta("artesao:perfil", (sinal) => painelArtesaoService.perfil(sinal));
}

export function useConfiguracoesEnvio() {
  return useConsulta("artesao:envio", (sinal) => painelArtesaoService.configuracoesEnvio(sinal));
}

// Rascunho fica no localStorage, mas entra pela mesma base de consulta do resto
// das telas: componente usa hook, hook usa service.
export function useRascunhoPeca() {
  return useConsulta("artesao:rascunho", async () => painelArtesaoService.rascunho());
}

// Escrita: o botão entra em carregando, o service grava no localStorage e a
// consulta é recarregada para a lista voltar com o dado novo.
export function useAcoesArtesao() {
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

    async salvarRascunho(peca: NovoProduto, depois: () => void) {
      await executar("rascunho", () => painelArtesaoService.salvarRascunho(peca));
      depois();
    },

    async criarPeca(peca: NovoProduto, depois: () => void) {
      await executar("criar-peca", () => painelArtesaoService.criarPeca(peca));
      depois();
    },

    async alterarEstoque(
      id: string,
      estoque: number,
      pausar: boolean | undefined,
      depois: () => void,
    ) {
      await executar(`estoque:${id}`, () =>
        painelArtesaoService.alterarEstoque(id, estoque, pausar),
      );
      depois();
    },

    async atualizarPedido(
      id: string,
      statusProducao: StatusProducao,
      codigoRastreio: string | undefined,
      depois: () => void,
    ): Promise<PedidoRecebido> {
      const atualizado = await executar(`pedido:${id}`, () =>
        painelArtesaoService.atualizarPedido(id, statusProducao, codigoRastreio),
      );
      depois();
      return atualizado;
    },

    async removerPeca(id: string, depois: () => void) {
      await executar(`remover:${id}`, () => painelArtesaoService.removerPeca(id));
      depois();
    },

    async salvarPerfil(perfil: PerfilArtesaoEdicao, depois: () => void) {
      await executar("perfil", () => painelArtesaoService.salvarPerfil(perfil));
      depois();
    },

    async alternarOpcaoEnvio(opcaoId: string, depois: () => void) {
      await executar(`envio:${opcaoId}`, () => painelArtesaoService.alternarOpcaoEnvio(opcaoId));
      depois();
    },
  };
}

export function useCotacaoFrete() {
  const [cotacao, setCotacao] = useState<{
    servico: string;
    prazo: string;
    valor: number;
  } | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<ApiError | null>(null);

  async function calcular(dados: DadosFrete) {
    setCalculando(true);
    setErro(null);
    try {
      const resposta = await painelArtesaoService.cotarFrete(dados);
      setCotacao({
        servico: resposta.servico.nome,
        prazo: resposta.servico.prazo,
        valor: resposta.valor,
      });
    } catch (causa) {
      setCotacao(null);
      setErro(
        causa instanceof ApiError ? causa : new ApiError(0, "Não foi possível calcular o frete."),
      );
    } finally {
      setCalculando(false);
    }
  }

  return {
    cotacao,
    calculando,
    erro,
    calcular,
    limpar: () => setCotacao(null),
  };
}
