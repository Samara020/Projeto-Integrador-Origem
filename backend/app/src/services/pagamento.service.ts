import { compraRepository } from "../repositories/compra.repository";

export const pagamentoService = {
  async processar(usuarioId: string, dados: {
    pedidoId: string;
    metodoPagamento: string;
    tokenCartao: string | null;
  }) {
    const pagamento = await compraRepository.pagar(usuarioId, dados);

    return {
      transacaoId: pagamento.id,
      status: pagamento.status,
      dataPagamento: pagamento.data,
    };
  },
};
