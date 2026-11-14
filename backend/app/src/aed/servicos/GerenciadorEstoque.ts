import { ListaEncadeada } from "../estruturas/ListaEncadeada";
import { Fila } from "../estruturas/Fila";
import { Pilha } from "../estruturas/Pilha";

export interface ItemEstoque {
  id: number | string;
  produtoId: number | string;
  nome: string;
  quantidade: number;
  /** Menor valor = maior prioridade de saida (vence/escoa primeiro). */
  prioridadeSaida: number;
  validade?: Date | string | null;
}

export interface PedidoRequisicao {
  id: number | string;
  produtoId: number | string;
  quantidade: number;
  solicitadoEm: Date;
}

export type TipoOperacao = "BAIXA" | "REPOSICAO";

export interface OperacaoHistorico {
  id: number | string;
  tipo: TipoOperacao;
  produtoId: number | string;
  quantidade: number;
  anterior: number;
  atual: number;
  realizadoEm: Date;
}

/**
 * Gerenciador de estoque comercial integrando ListaEncadeada (estoque),
 * Fila (pedidos pendentes) e Pilha (historico com desfazer/undo).
 */
export class GerenciadorEstoque {
  private estoque = new ListaEncadeada<ItemEstoque>();
  private pedidos = new Fila<PedidoRequisicao>();
  private historico = new Pilha<OperacaoHistorico>();
  private proximoIdHistorico = 1;

  private comparadorPadrao = (a: ItemEstoque, b: ItemEstoque): number => {
    if (a.prioridadeSaida !== b.prioridadeSaida) {
      return a.prioridadeSaida - b.prioridadeSaida;
    }
    const va = a.validade ? new Date(a.validade).getTime() : Infinity;
    const vb = b.validade ? new Date(b.validade).getTime() : Infinity;
    return va - vb;
  };

  private buscarItem(produtoId: number | string): ItemEstoque | undefined {
    const itens = this.estoque.paraArray();
    return itens.find((item) => String(item.produtoId) === String(produtoId));
  }

  private registrarOperacao(
    tipo: TipoOperacao,
    produtoId: number | string,
    quantidade: number,
    anterior: number,
    atual: number
  ): void {
    this.historico.empilhar({
      id: this.proximoIdHistorico++,
      tipo,
      produtoId,
      quantidade,
      anterior,
      atual,
      realizadoEm: new Date(),
    });
  }

  /**
   * Cadastra um produto no estoque, ordenado por prioridade de saida e validade.
   */
  cadastrarProduto(item: ItemEstoque): void {
    const existente = this.buscarItem(item.produtoId);
    if (existente) {
      existente.quantidade = item.quantidade;
      existente.nome = item.nome;
      existente.prioridadeSaida = item.prioridadeSaida;
      existente.validade = item.validade;
      return;
    }
    this.estoque.inserirOrdenado(item, this.comparadorPadrao);
  }

  /**
   * Registra uma requisicao de pedido pendente na fila de faturamento/saida.
   */
  solicitarPedido(pedido: PedidoRequisicao): void {
    this.pedidos.enfileirar(pedido);
  }

  /**
   * Processa o proximo pedido da fila (FIFO), dando baixa no estoque.
   * Retorna o pedido processado ou null se a fila estiver vazia.
   */
  processarProximoPedido(): PedidoRequisicao | null {
    const pedido = this.pedidos.desenfileirar();
    if (!pedido) return null;
    this.darBaixaEstoque(pedido.produtoId, pedido.quantidade);
    return pedido;
  }

  /**
   * Dada baixa de quantidade no estoque do produto. Retorna false se nao houver
   * estoque suficiente ou o produto nao existir.
   */
  darBaixaEstoque(produtoId: number | string, quantidade: number): boolean {
    if (quantidade <= 0) return false;
    const item = this.buscarItem(produtoId);
    if (!item) return false;
    if (item.quantidade < quantidade) return false;
    const anterior = item.quantidade;
    item.quantidade = anterior - quantidade;
    this.registrarOperacao("BAIXA", produtoId, quantidade, anterior, item.quantidade);
    return true;
  }

  /**
   * Repoe quantidade no estoque do produto. Retorna false se o produto nao existir.
   */
  reporEstoque(produtoId: number | string, quantidade: number): boolean {
    if (quantidade <= 0) return false;
    const item = this.buscarItem(produtoId);
    if (!item) return false;
    const anterior = item.quantidade;
    item.quantidade = anterior + quantidade;
    this.registrarOperacao("REPOSICAO", produtoId, quantidade, anterior, item.quantidade);
    return true;
  }

  /**
   * Desfaz a ultima operacao de baixa ou reposicao (LIFO).
   * Retorna false se nao houver operacao no historico.
   */
  desfazerUltimaOperacao(): boolean {
    const operacao = this.historico.desempilhar();
    if (!operacao) return false;

    const item = this.buscarItem(operacao.produtoId);
    if (!item) return false;

    if (operacao.tipo === "BAIXA") {
      item.quantidade = operacao.anterior;
    } else {
      item.quantidade = operacao.anterior;
    }
    return true;
  }

  listarEstoque(): ItemEstoque[] {
    return this.estoque.paraArray();
  }

  listarFilaPedidos(): PedidoRequisicao[] {
    return this.pedidos.paraArray();
  }

  totalOperacoesHistorico(): number {
    return this.historico.tamanho();
  }
}
