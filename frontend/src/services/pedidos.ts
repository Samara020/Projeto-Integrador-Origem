import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import type { EnderecoEntrega, OpcaoEnvio, PedidoCriado, RespostaPedidos } from "@/types";

export const pedidosService = {
  opcaoEnvioPadrao(): OpcaoEnvio {
    return { id: "economico", nome: "Econômico", prazo: "7 a 10 dias úteis", valor: 18 };
  },
  async checkout(endereco: EnderecoEntrega): Promise<PedidoCriado> {
    const carrinho = await carrinhoService.obter();
    if (!carrinho.itens.length) throw new ApiError(400, "Seu carrinho está vazio.");
    if (!endereco.cep || !endereco.rua || !endereco.numero) {
      throw new ApiError(400, "Preencha o endereço de entrega.");
    }
    return http<PedidoCriado>("/pedidos/checkout", {
      metodo: "POST", corpo: { enderecoEntrega: endereco },
    });
  },
  listar: () => http<RespostaPedidos>("/comprador/pedidos"),
};
