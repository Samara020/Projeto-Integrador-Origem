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

// Escrita: o botão entra em carregando, o service chama o backend e a
// consulta é recarregada para a lista voltar com o dado novo.
export function useAcoesArtesao() {
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<ApiError | null>(null);

  const limparErro = useCallback(() => {
    setErro(null);
  }, []);

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
    limparErro,

    async salvarRascunho(peca: NovoProduto, depois: () => void) {
      await executar("rascunho", () => painelArtesaoService.salvarRascunho(peca));
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
    },

    async criarPeca(peca: NovoProduto, depois: () => void) {
      const criada = await executar("criar-peca", () => painelArtesaoService.criarPeca(peca));
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
      return criada;
    },

    async alterarEstoque(
      id: string,
      estoque: number,
      pausar: boolean | undefined,
      depois: () => void,
    ) {
      const chave = pausar !== undefined ? `pausa:${id}` : `ajuste:${id}`;
      const atualizado = await executar(chave, () =>
        painelArtesaoService.alterarEstoque(id, estoque, pausar),
      );
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
      return atualizado;
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
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
      return atualizado;
    },

    async removerPeca(id: string, depois: () => void) {
      await executar(`remover:${id}`, () => painelArtesaoService.removerPeca(id));
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
    },

    async salvarPerfil(perfil: PerfilArtesaoEdicao, depois: () => void) {
      const atualizado = await executar("perfil", () => painelArtesaoService.salvarPerfil(perfil));
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
      return atualizado;
    },

    async alternarOpcaoEnvio(opcaoId: string, depois: () => void) {
      const atualizado = await executar(`envio:${opcaoId}`, () =>
        painelArtesaoService.alternarOpcaoEnvio(opcaoId),
      );
      try {
        depois();
      } catch (err) {
        console.error("Erro no callback pós-sucesso:", err);
      }
      return atualizado;
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
