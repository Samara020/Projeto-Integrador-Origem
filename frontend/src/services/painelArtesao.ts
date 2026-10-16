// Painel do artesão (ContratoDeAPI.md, 2.2, 2.5, 2.7 e 2.10).
// Leitura vai para a Fake API. Escrita fica no localStorage, como o carrinho e
// os pedidos do comprador: Route Handler em deploy serverless não guarda estado.
import { apagarLocal, gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import type {
  ConfiguracoesEnvio,
  CotacaoFrete,
  DadosFrete,
  MetricasArtesao,
  NovoProduto,
  PaginacaoPecas,
  PecaEstoque,
  PedidoRecebido,
  PerfilArtesaoAtualizado,
  PerfilArtesaoEdicao,
  ProdutoCriado,
  ProximaAcaoPedido,
  RespostaPedidosRecebidos,
  SituacaoPeca,
  StatusProducao,
} from "@/types";

const CHAVE_PECAS = "painel-artesao:pecas";
const CHAVE_PECAS_REMOVIDAS = "painel-artesao:pecas-removidas";
const CHAVE_PEDIDOS = "painel-artesao:pedidos";
const CHAVE_PERFIL = "painel-artesao:perfil";
const CHAVE_ENVIO = "painel-artesao:envio";
const CHAVE_RASCUNHO = "painel-artesao:rascunho";

// Situação derivada do estoque: a lista nunca guarda o que dá para deduzir.
function situacaoDe(estoque: number, pausada: boolean): SituacaoPeca {
  if (pausada) return "INATIVO";
  if (estoque === 0) return "ESGOTADO";
  if (estoque <= 2) return "ESTOQUE_BAIXO";
  return "ATIVO";
}

// A ação seguinte do pedido é sempre a mesma para o mesmo status.
const ACAO_POR_STATUS: Record<StatusProducao, ProximaAcaoPedido> = {
  NOVO: "ACEITAR",
  EM_PRODUCAO: "MARCAR_PRONTO",
  PRONTO: "INFORMAR_RASTREIO",
  ENVIADO: "VER_RASTREIO",
  ENTREGUE: "NENHUMA",
  CANCELADO: "NENHUMA",
};

function alteracoesDePecas(): Record<string, { estoque: number; pausada: boolean }> {
  return lerLocal(CHAVE_PECAS) ?? {};
}

function pecasCriadas(): PecaEstoque[] {
  return lerLocal<PecaEstoque[]>(`${CHAVE_PECAS}:novas`) ?? [];
}

function pecasRemovidas(): string[] {
  return lerLocal<string[]>(CHAVE_PECAS_REMOVIDAS) ?? [];
}

function aplicarAlteracoes(itens: PecaEstoque[]): PecaEstoque[] {
  const alteracoes = alteracoesDePecas();
  const removidas = pecasRemovidas();
  const ajustadas = itens
    .filter((peca) => !removidas.includes(peca.id))
    .map((peca) => {
      const alteracao = alteracoes[peca.id];
      if (!alteracao) return peca;
      return {
        ...peca,
        ...alteracao,
        situacao: situacaoDe(alteracao.estoque, alteracao.pausada),
      };
    });
  const criadas = pecasCriadas()
    .filter((peca) => !removidas.includes(peca.id))
    .map((peca) => ({
      ...peca,
      situacao: situacaoDe(peca.estoque, peca.situacao === "INATIVO"),
    }));
  return [...criadas, ...ajustadas];
}

function contar(itens: PecaEstoque[]): Record<SituacaoPeca, number> {
  const contagem: Record<SituacaoPeca, number> = {
    ATIVO: 0,
    INATIVO: 0,
    ESGOTADO: 0,
    ESTOQUE_BAIXO: 0,
  };
  for (const peca of itens) contagem[peca.situacao] += 1;
  return contagem;
}

type AlteracaoPedido = {
  statusProducao: StatusProducao;
  codigoRastreio: string | null;
};

function alteracoesDePedidos(): Record<string, AlteracaoPedido> {
  return lerLocal(CHAVE_PEDIDOS) ?? {};
}

function pedidoAjustado(pedido: PedidoRecebido): PedidoRecebido {
  return {
    ...pedido,
    proximaAcao:
      pedido.statusProducao === "ENVIADO" && pedido.codigoRastreio
        ? "VER_RASTREIO"
        : (ACAO_POR_STATUS[pedido.statusProducao] ?? "NENHUMA"),
  };
}

export const painelArtesaoService = {
  // GET /artesao/painel/metricas
  metricas(sinal?: AbortSignal) {
    return http<MetricasArtesao>("/artesao/painel/metricas", { sinal });
  },

  // GET /artesao/pecas
  async pecas(situacao?: SituacaoPeca, sinal?: AbortSignal): Promise<PaginacaoPecas> {
    const remota = await http<PaginacaoPecas>("/artesao/pecas", {
      parametros: { situacao },
      sinal,
    });
    // A contagem e o filtro saem da lista inteira, senão a aba "Esgotados" zeraria
    // as outras.
    const todas = aplicarAlteracoes(remota.itens);
    const itens = situacao ? todas.filter((peca) => peca.situacao === situacao) : todas;
    return { ...remota, total: itens.length, itens, contagem: contar(todas) };
  },

  // PUT /artesao/pecas/{id}/estoque
  async alterarEstoque(id: string, estoque: number, pausar?: boolean): Promise<PecaEstoque> {
    if (!Number.isInteger(estoque) || estoque < 0) {
      throw new ApiError(400, "A quantidade em estoque não pode ser negativa.");
    }

    const atual = alteracoesDePecas();
    const anterior = atual[id];
    const pausada = pausar ?? anterior?.pausada ?? false;
    atual[id] = { estoque, pausada };
    gravarLocal(CHAVE_PECAS, atual);

    const base = (await painelArtesaoService.pecas()).itens.find((peca) => peca.id === id);
    if (!base) throw new ApiError(404, "Não encontramos essa peça.");
    return { ...base, estoque, situacao: situacaoDe(estoque, pausada) };
  },

  // Rascunho da peça: só na Avaliação 1, enquanto não existe endpoint de
  // rascunho no contrato. some assim que a peça é publicada.
  rascunho(): NovoProduto | null {
    return lerLocal<NovoProduto>(CHAVE_RASCUNHO);
  },

  async salvarRascunho(peca: NovoProduto): Promise<void> {
    gravarLocal(CHAVE_RASCUNHO, peca);
  },

  // POST /produtos
  async criarPeca(peca: NovoProduto): Promise<ProdutoCriado> {
    if (!peca.nome.trim()) throw new ApiError(400, "Dê um nome à peça.");
    if (peca.preco <= 0) throw new ApiError(400, "Informe o preço da peça.");
    if (peca.imagens.length === 0) throw new ApiError(400, "Adicione ao menos uma foto.");

    const criadas = pecasCriadas();
    const numero = 400 + criadas.length;
    const criada: PecaEstoque = {
      id: `prd_${numero}`,
      nome: peca.nome.trim(),
      sku: `ORG-NOV-${String(numero).padStart(3, "0")}`,
      imagemPrincipal: peca.imagens[0],
      estoque: peca.estoque,
      situacao: situacaoDe(peca.estoque, false),
    };
    gravarLocal(`${CHAVE_PECAS}:novas`, [criada, ...criadas]);
    apagarLocal(CHAVE_RASCUNHO);

    return {
      id: criada.id,
      sku: criada.sku,
      statusValidacao: "PENDENTE",
      criadoEm: new Date().toISOString(),
    };
  },

  // DELETE /produtos/{id}
  async removerPeca(id: string): Promise<void> {
    const jaRemovida = pecasRemovidas();
    if (!jaRemovida.includes(id)) gravarLocal(CHAVE_PECAS_REMOVIDAS, [...jaRemovida, id]);
  },

  // GET /artesao/pedidos
  async pedidos(sinal?: AbortSignal): Promise<RespostaPedidosRecebidos> {
    const remota = await http<RespostaPedidosRecebidos>("/artesao/pedidos", {
      sinal,
    });
    const alteracoes = alteracoesDePedidos();
    return {
      pedidosRecebidos: remota.pedidosRecebidos.map((pedido) =>
        pedidoAjustado(alteracoes[pedido.id] ? { ...pedido, ...alteracoes[pedido.id] } : pedido),
      ),
    };
  },

  // PUT /artesao/pedidos/{id}/status
  async atualizarPedido(
    id: string,
    statusProducao: StatusProducao,
    codigoRastreio?: string,
  ): Promise<PedidoRecebido> {
    if (statusProducao === "ENVIADO" && !codigoRastreio) {
      throw new ApiError(400, "Informe o código de rastreio para marcar como enviado.");
    }

    const atual = alteracoesDePedidos();
    atual[id] = { statusProducao, codigoRastreio: codigoRastreio ?? null };
    gravarLocal(CHAVE_PEDIDOS, atual);

    const base = (await painelArtesaoService.pedidos()).pedidosRecebidos.find(
      (pedido) => pedido.id === id,
    );
    if (!base) throw new ApiError(404, "Não encontramos esse pedido.");
    return base;
  },

  // GET /artesao/perfil
  async perfil(sinal?: AbortSignal): Promise<PerfilArtesaoEdicao> {
    const remota = await http<PerfilArtesaoEdicao>("/artesao/perfil", {
      sinal,
    });
    return lerLocal<PerfilArtesaoEdicao>(CHAVE_PERFIL) ?? remota;
  },

  // PUT /artesao/perfil
  async salvarPerfil(perfil: PerfilArtesaoEdicao): Promise<PerfilArtesaoAtualizado> {
    if (!perfil.nomeArtistico.trim()) throw new ApiError(400, "Informe seu nome artístico.");
    if (!perfil.regiao.trim()) throw new ApiError(400, "Informe a região onde você produz.");
    if (!perfil.biografia.trim()) throw new ApiError(400, "Conte um pouco da sua história.");

    gravarLocal(CHAVE_PERFIL, perfil);
    return {
      nomeArtistico: perfil.nomeArtistico.trim(),
      atualizadoEm: new Date().toISOString(),
    };
  },

  // GET /artesao/envio/configuracoes
  async configuracoesEnvio(sinal?: AbortSignal): Promise<ConfiguracoesEnvio> {
    const remota = await http<ConfiguracoesEnvio>("/artesao/envio/configuracoes", { sinal });
    const alteracoes = lerLocal<Record<string, boolean>>(CHAVE_ENVIO);
    if (!alteracoes) return remota;
    return {
      ...remota,
      opcoes: remota.opcoes.map((opcao) => ({
        ...opcao,
        ativa: alteracoes[opcao.id] ?? opcao.ativa,
      })),
    };
  },

  // PUT /artesao/envio/configuracoes
  async alternarOpcaoEnvio(opcaoId: string): Promise<ConfiguracoesEnvio["opcoes"][number]> {
    const atual = (await painelArtesaoService.configuracoesEnvio()).opcoes;
    const opcao = atual.find((item) => item.id === opcaoId);
    if (!opcao) throw new ApiError(404, "Não encontramos essa opção de envio.");

    const restantes = atual.filter((item) => item.id !== opcaoId);
    if (!opcao.ativa && restantes.every((item) => !item.ativa)) {
      throw new ApiError(400, "Mantenha pelo menos uma opção de envio ativa.");
    }

    const alteracoes = lerLocal<Record<string, boolean>>(CHAVE_ENVIO) ?? {};
    alteracoes[opcaoId] = !opcao.ativa;
    gravarLocal(CHAVE_ENVIO, alteracoes);

    return { ...opcao, ativa: !opcao.ativa };
  },

  // POST /envios/cotacao
  cotarFrete(dados: DadosFrete) {
    return http<CotacaoFrete>("/envios/cotacao", {
      metodo: "POST",
      corpo: dados,
    });
  },

  // Devolve o painel ao estado da Fake API. Só existe na Avaliação 1.
  restaurarExemplo() {
    apagarLocal(CHAVE_PECAS);
    apagarLocal(`${CHAVE_PECAS}:novas`);
    apagarLocal(CHAVE_PECAS_REMOVIDAS);
    apagarLocal(CHAVE_PEDIDOS);
    apagarLocal(CHAVE_PERFIL);
    apagarLocal(CHAVE_ENVIO);
    apagarLocal(CHAVE_RASCUNHO);
  },
};
