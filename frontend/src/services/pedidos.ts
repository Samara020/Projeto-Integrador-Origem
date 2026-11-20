import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import type {
  CotacaoFrete,
  DadosFrete,
  EnderecoEntrega,
  PedidoCriado,
  RespostaPedidos,
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
    return http<PedidoCriado>("/pedidos/checkout", {
      metodo: "POST",
      corpo: {
        enderecoEntrega: endereco,
        ...(opcaoEnvioId ? { opcaoEnvioId } : {}),
      },
    });
  },
  listar: () => http<RespostaPedidos>("/comprador/pedidos"),
};
