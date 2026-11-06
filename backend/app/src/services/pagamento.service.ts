import { ErroApp } from "../middleware/error";
import { pedidoRepository } from "../repositories/pedido.repository";
import { pagamentoRepository } from "../repositories/pagamento.repository";

export const pagamentoService = {
  async processar(dados: {
    pedidoId: string;
    metodoPagamento: string;
    tokenCartao: string | null;
  }) {
    const pedido = await pedidoRepository.buscarPorId(dados.pedidoId);
    if (!pedido) throw new ErroApp(404, "Pedido nao encontrado.");

    const valorTotal = pedido.itens.reduce(
      (s: number, i: any) => s + Number(i.subtotal),
      0
    );

    const pagamento = await pagamentoRepository.criar({
      pedidoId: dados.pedidoId,
      valor: valorTotal,
      formaPagamento: dados.metodoPagamento,
    });

    await pagamentoRepository.atualizarPedido(dados.pedidoId, "PAGO");

    return {
      transacaoId: pagamento.id,
      status: pagamento.status,
      dataPagamento: pagamento.data,
    };
  },
};
