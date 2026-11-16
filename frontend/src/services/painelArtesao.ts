import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import type {
  ConfiguracoesEnvio, CotacaoFrete, DadosFrete, MetricasArtesao, NovoProduto,
  PaginacaoPecas, PedidoRecebido, PerfilArtesaoAtualizado,
  PerfilArtesaoEdicao, ProdutoCriado, RespostaPedidosRecebidos, SituacaoPeca, StatusProducao,
} from "@/types";

const CHAVE_RASCUNHO = "painel-artesao:rascunho";

export const painelArtesaoService = {
  metricas: (sinal?: AbortSignal) => http<MetricasArtesao>("/artesao/painel/metricas", { sinal }),
  pecas: (situacao?: SituacaoPeca, sinal?: AbortSignal) =>
    http<PaginacaoPecas>("/artesao/pecas", { parametros: { situacao }, sinal }),
  async alterarEstoque(
    id: string,
    estoque: number,
    pausar?: boolean,
  ): Promise<{ id: string; estoque: number; situacao: SituacaoPeca }> {
    if (!Number.isInteger(estoque) || estoque < 0) {
      throw new ApiError(400, "A quantidade em estoque não pode ser negativa.");
    }
    return http<{ id: string; estoque: number; situacao: SituacaoPeca }>(
      `/artesao/pecas/${encodeURIComponent(id)}/estoque`,
      {
        metodo: "PUT",
        corpo: {
          estoque,
          pausada: pausar,
          situacao: pausar === true ? "INATIVO" : undefined,
        },
      },
    );
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
  pedidos: (sinal?: AbortSignal) => http<RespostaPedidosRecebidos>("/artesao/pedidos", { sinal }),
  async atualizarPedido(id: string, statusProducao: StatusProducao, codigoRastreio?: string): Promise<PedidoRecebido> {
    if (statusProducao === "ENVIADO" && !codigoRastreio) throw new ApiError(400, "Informe o código de rastreio para marcar como enviado.");
    await http(`/artesao/pedidos/${encodeURIComponent(id)}/status`, { metodo: "PUT", corpo: { statusProducao, codigoRastreioCorreios: codigoRastreio } });
    const lista = await this.pedidos();
    const pedido = lista.pedidosRecebidos.find((item) => item.id === id);
    if (!pedido) throw new ApiError(404, "Não encontramos esse pedido.");
    return pedido;
  },
  perfil: (sinal?: AbortSignal) => http<PerfilArtesaoEdicao>("/artesao/perfil", { sinal }),
  salvarPerfil: (corpo: PerfilArtesaoEdicao) => http<PerfilArtesaoAtualizado>("/artesao/perfil", { metodo: "PUT", corpo }),
  configuracoesEnvio: (sinal?: AbortSignal) => http<ConfiguracoesEnvio>("/artesao/envio/configuracoes", { sinal }),
  async alternarOpcaoEnvio(opcaoId: string) {
    const { opcoes } = await this.configuracoesEnvio();
    const opcao = opcoes.find((item) => item.id === opcaoId);
    if (!opcao) throw new ApiError(404, "Não encontramos essa opção de envio.");
    await http("/artesao/envio/configuracoes", { metodo: "PUT", corpo: { opcaoId, ativa: !opcao.ativa } });
    return { ...opcao, ativa: !opcao.ativa };
  },
  cotarFrete: (corpo: DadosFrete) => http<CotacaoFrete>("/envios/cotacao", { metodo: "POST", corpo }),
};
