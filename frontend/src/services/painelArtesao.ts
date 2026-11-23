import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import type {
  ConfiguracoesEnvio, CotacaoFrete, DadosFrete, MetricasArtesao, NovoProduto,
  PaginacaoPecas, PedidoRecebido, PerfilArtesaoAtualizado,
  PerfilArtesaoEdicao, ProdutoCriado, RespostaPedidosRecebidos, SituacaoPeca, StatusProducao,
} from "@/types";

const CHAVE_RASCUNHO = "painel-artesao:rascunho";

export const painelArtesaoService = {
  async metricas(sinal?: AbortSignal): Promise<MetricasArtesao> {
    try {
      return await http<MetricasArtesao>("/artesao/painel/metricas", { sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<MetricasArtesao>("/painel/artesao/painel/metricas", { sinal });
      }
      throw e;
    }
  },
  async pecas(situacao?: SituacaoPeca, sinal?: AbortSignal): Promise<PaginacaoPecas> {
    try {
      return await http<PaginacaoPecas>("/artesao/pecas", { parametros: { situacao }, sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<PaginacaoPecas>("/produtos/artesao/pecas", { parametros: { situacao }, sinal });
      }
      throw e;
    }
  },
  async alterarEstoque(
    id: string,
    estoque: number,
    pausar?: boolean,
  ): Promise<{ id: string; estoque: number; situacao: SituacaoPeca }> {
    if (!Number.isInteger(estoque) || estoque < 0) {
      throw new ApiError(400, "A quantidade em estoque não pode ser negativa.");
    }
    const corpo = {
      estoque,
      pausada: pausar,
      situacao: pausar === true ? "INATIVO" : undefined,
    };
    try {
      return await http<{ id: string; estoque: number; situacao: SituacaoPeca }>(
        `/artesao/pecas/${encodeURIComponent(id)}/estoque`,
        { metodo: "PUT", corpo },
      );
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<{ id: string; estoque: number; situacao: SituacaoPeca }>(
          `/produtos/artesao/pecas/${encodeURIComponent(id)}/estoque`,
          { metodo: "PUT", corpo },
        );
      }
      throw e;
    }
  },
  // Rascunhos não publicados continuam no navegador.
  rascunho: () => lerLocal<NovoProduto>(CHAVE_RASCUNHO),
  async salvarRascunho(peca: NovoProduto): Promise<void> { gravarLocal(CHAVE_RASCUNHO, peca); },
  async criarPeca(peca: NovoProduto) {
    const criada = await http<ProdutoCriado>("/produtos", { metodo: "POST", corpo: peca });
    apagarLocal(CHAVE_RASCUNHO);
    return criada;
  },
  async removerPeca(id: string): Promise<void> {
    await http(`/produtos/${encodeURIComponent(id)}`, { metodo: "DELETE" });
  },
  async pedidos(sinal?: AbortSignal): Promise<RespostaPedidosRecebidos> {
    try {
      return await http<RespostaPedidosRecebidos>("/artesao/pedidos", { sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<RespostaPedidosRecebidos>("/painel/artesao/pedidos", { sinal });
      }
      throw e;
    }
  },
  async atualizarPedido(id: string, statusProducao: StatusProducao, codigoRastreio?: string): Promise<PedidoRecebido> {
    if (statusProducao === "ENVIADO" && !codigoRastreio) throw new ApiError(400, "Informe o código de rastreio para marcar como enviado.");
    const corpo = { statusProducao, codigoRastreioCorreios: codigoRastreio };
    try {
      await http(`/artesao/pedidos/${encodeURIComponent(id)}/status`, { metodo: "PUT", corpo });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        await http(`/painel/artesao/pedidos/${encodeURIComponent(id)}/status`, { metodo: "PUT", corpo });
      } else {
        throw e;
      }
    }
    const lista = await this.pedidos();
    const pedido = lista.pedidosRecebidos.find((item) => item.id === id);
    if (!pedido) throw new ApiError(404, "Não encontramos esse pedido.");
    return pedido;
  },
  async perfil(sinal?: AbortSignal): Promise<PerfilArtesaoEdicao> {
    try {
      return await http<PerfilArtesaoEdicao>("/artesao/perfil", { sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<PerfilArtesaoEdicao>("/artesaos/artesao/perfil", { sinal });
      }
      throw e;
    }
  },
  async salvarPerfil(corpo: PerfilArtesaoEdicao): Promise<PerfilArtesaoAtualizado> {
    try {
      return await http<PerfilArtesaoAtualizado>("/artesao/perfil", { metodo: "PUT", corpo });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<PerfilArtesaoAtualizado>("/artesaos/artesao/perfil", { metodo: "PUT", corpo });
      }
      throw e;
    }
  },
  async configuracoesEnvio(sinal?: AbortSignal): Promise<ConfiguracoesEnvio> {
    try {
      return await http<ConfiguracoesEnvio>("/artesao/envio/configuracoes", { sinal });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<ConfiguracoesEnvio>("/painel/artesao/envio/configuracoes", { sinal });
      }
      throw e;
    }
  },
  async alternarOpcaoEnvio(opcaoId: string) {
    const { opcoes } = await this.configuracoesEnvio();
    const opcao = opcoes.find((item) => item.id === opcaoId);
    if (!opcao) throw new ApiError(404, "Não encontramos essa opção de envio.");
    let atualizado: { id: string; ativa: boolean };
    try {
      atualizado = await http<{ id: string; ativa: boolean }>(
        "/artesao/envio/configuracoes",
        { metodo: "PUT", corpo: { opcaoId, ativa: !opcao.ativa } },
      );
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        atualizado = await http<{ id: string; ativa: boolean }>(
          "/painel/artesao/envio/configuracoes",
          { metodo: "PUT", corpo: { opcaoId, ativa: !opcao.ativa } },
        );
      } else {
        throw e;
      }
    }
    return { ...opcao, ...atualizado };
  },
  async cotarFrete(corpo: DadosFrete): Promise<CotacaoFrete> {
    try {
      return await http<CotacaoFrete>("/envios/cotacao", { metodo: "POST", corpo });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<CotacaoFrete>("/painel/envios/cotacao", { metodo: "POST", corpo });
      }
      throw e;
    }
  },
};
