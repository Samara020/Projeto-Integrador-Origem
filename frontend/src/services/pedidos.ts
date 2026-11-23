import { numeroSequencialValido } from "@/lib/formato";
import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import type {
  CotacaoFrete,
  DadosFrete,
  EnderecoEntrega,
  PedidoCriado,
  RespostaPedidos,
  StatusPedido,
} from "@/types";

export const pedidosService = {
  async cotarFrete(dados: DadosFrete): Promise<CotacaoFrete> {
    try {
      return await http<CotacaoFrete>("/envios/cotacao", {
        metodo: "POST",
        corpo: dados,
      });
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 404) {
        return await http<CotacaoFrete>("/painel/envios/cotacao", {
          metodo: "POST",
          corpo: dados,
        });
      }
      throw e;
    }
  },
  async checkout(
    endereco: EnderecoEntrega,
    opcaoEnvioId?: string,
  ): Promise<PedidoCriado> {
    const carrinho = await carrinhoService.obter();
    if (!carrinho.itens.length) throw new ApiError(400, "Seu carrinho está vazio.");
    if (!endereco.cep || !endereco.rua || !endereco.numero) {
      throw new ApiError(400, "Preencha o endereço de entrega.");
    }
    const resposta = await http<
      PedidoCriado & {
        valor_frete?: number | string;
        valor_total?: number | string;
        valorFrete?: number | string;
        valorTotal?: number | string;
      }
    >("/pedidos/checkout", {
      metodo: "POST",
      corpo: {
        enderecoEntrega: endereco,
        ...(opcaoEnvioId ? { opcaoEnvioId } : {}),
      },
    });

    const valorFrete =
      resposta.valorFrete !== undefined && resposta.valorFrete !== null
        ? Number(resposta.valorFrete)
        : resposta.valor_frete !== undefined && resposta.valor_frete !== null
          ? Number(resposta.valor_frete)
          : undefined;

    const valorTotal =
      resposta.valorTotal !== undefined && resposta.valorTotal !== null
        ? Number(resposta.valorTotal)
        : resposta.valor_total !== undefined && resposta.valor_total !== null
          ? Number(resposta.valor_total)
          : 0;

    return {
      pedidoId: resposta.pedidoId,
      status: resposta.status,
      valorFrete,
      valorTotal,
    };
  },
  async listar(): Promise<RespostaPedidos> {
    const res = await http<
      | { pedidos?: Array<Record<string, unknown>> }
      | Array<Record<string, unknown>>
    >("/comprador/pedidos");

    const lista = Array.isArray(res) ? res : (res?.pedidos ?? []);
    return {
      pedidos: lista.map((p) => {
        const frete = p.valorFrete ?? p.valor_frete;
        const total = p.valorTotal ?? p.valor_total;
        const numeroBruto = p.numeroSequencial ?? p.numero_sequencial;
        const numeroSequencial = numeroSequencialValido(
          typeof numeroBruto === "number" ? numeroBruto : Number(numeroBruto),
        );
        return {
          id: String(p.id ?? p.pedidoId ?? ""),
          ...(numeroSequencial !== undefined ? { numeroSequencial } : {}),
          status: p.status as StatusPedido,
          valorFrete:
            frete !== undefined && frete !== null ? Number(frete) : undefined,
          valorTotal:
            total !== undefined && total !== null ? Number(total) : 0,
          criadoEm: String(p.criadoEm ?? p.criado_em ?? ""),
          itens: (Array.isArray(p.itens) ? p.itens : []) as RespostaPedidos["pedidos"][number]["itens"],
        };
      }),
    };
  },
};
