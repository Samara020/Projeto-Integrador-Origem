import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import type {
  DadosPagamento,
  PagamentoProcessado,
  PedidoResumo,
} from "@/types";

const CHAVE_PEDIDOS = "pedidos";

// POST /pagamentos (comprador autenticado usa o backend real; visitante fica no fluxo local).
export const pagamentosService = {
  async processar(dados: DadosPagamento): Promise<PagamentoProcessado> {
    const sessao = authService.sessaoAtual();
    if (sessao?.token && process.env.NEXT_PUBLIC_API_URL) {
      return http<PagamentoProcessado>("/pagamentos", {
        metodo: "POST",
        corpo: dados,
      });
    }

    const pedidos = lerLocal<PedidoResumo[]>(CHAVE_PEDIDOS) ?? [];
    const pedido = pedidos.find((item) => item.id === dados.pedidoId);
    if (!pedido) throw new ApiError(404, "Pedido não encontrado.");
    if (
      dados.metodoPagamento === "CARTAO_CREDITO" &&
      !dados.tokenCartao
    ) {
      throw new ApiError(400, "Confira os dados do cartão.");
    }

    gravarLocal(
      CHAVE_PEDIDOS,
      pedidos.map((item) =>
        item.id === dados.pedidoId ? { ...item, status: "PAGO" } : item,
      ),
    );

    return {
      transacaoId: `trx_${Date.now().toString().slice(-9)}`,
      status: "APROVADO",
      dataPagamento: new Date().toISOString(),
    };
  },
};
