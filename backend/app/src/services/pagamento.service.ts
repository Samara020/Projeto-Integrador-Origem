import { ErroApp } from "../middleware/error";
import { pedidoRepository } from "../repositories/pedido.repository";
import { pagamentoRepository } from "../repositories/pagamento.repository";

export const pagamentoService = {
  async processar(
    usuarioId: string,
    dados: {
      pedidoId: string;
      metodoPagamento: string;
      tokenCartao: string | null;
    }
  ) {
    const pedido = await pedidoRepository.buscarPorId(dados.pedidoId);
    if (!pedido) throw new ErroApp(404, "Pedido nao encontrado.");

    if (String(pedido.usuarioId) !== String(usuarioId)) {
      throw new ErroApp(403, "Pedido nao pertence ao usuario autenticado.");
    }

    if (pedido.status !== "AGUARDANDO_PAGAMENTO") {
      throw new ErroApp(400, "Pedido ja se encontra pago ou finalizado.");
    }

    const valorTotal = pedido.itens.reduce(
      (s: number, i: any) => s + Number(i.subtotal),
      0
    );

    const pagamento = await pagamentoRepository.registrarPagamento({
      pedidoId: dados.pedidoId,
      valor: valorTotal,
      formaPagamento: dados.metodoPagamento,
      status: "APROVADO",
      novoStatusPedido: "PAGO",
    });

    return {
      transacaoId: pagamento.id,
      status: pagamento.status,
      dataPagamento: pagamento.data,
    };
  },
};
