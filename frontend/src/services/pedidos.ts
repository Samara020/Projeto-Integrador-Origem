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
  cotarFrete(dados: DadosFrete): Promise<CotacaoFrete> {
    return http<CotacaoFrete>("/envios/cotacao", {
      metodo: "POST",
      corpo: dados,
    });
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
