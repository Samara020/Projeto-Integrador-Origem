import { ErroApp } from "../middleware/error";
import { pedidoRepository } from "../repositories/pedido.repository";
import { pagamentoRepository } from "../repositories/pagamento.repository";

export type ResultadoPagamentoSolicitado = "APROVADO" | "RECUSADO" | "EXPIRADO";

function resolverResultadoPagamento(dados: {
  tokenCartao: string | null;
  simularFalha?: boolean;
  resultado?: ResultadoPagamentoSolicitado;
  motivoFalha?: string | null;
}): {
  status: ResultadoPagamentoSolicitado;
  novoStatusPedido: "PAGO" | "CANCELADO";
  motivo: string | null;
  liberarReserva: boolean;
} {
  const token = (dados.tokenCartao ?? "").trim().toLowerCase();

  if (dados.resultado === "EXPIRADO" || token.startsWith("tok_expirado")) {
    return {
      status: "EXPIRADO",
      novoStatusPedido: "CANCELADO",
      motivo: dados.motivoFalha?.trim() || "Prazo de pagamento expirado.",
      liberarReserva: true,
    };
  }

  if (
    dados.resultado === "RECUSADO" ||
    dados.simularFalha === true ||
    token.startsWith("tok_recusado") ||
    token.startsWith("tok_falha")
  ) {
    return {
      status: "RECUSADO",
      novoStatusPedido: "CANCELADO",
      motivo: dados.motivoFalha?.trim() || "Pagamento recusado pela operadora.",
      liberarReserva: true,
    };
  }

  return {
    status: "APROVADO",
    novoStatusPedido: "PAGO",
    motivo: null,
    liberarReserva: false,
  };
}

export const pagamentoService = {
  async processar(
    usuarioId: string,
    dados: {
      pedidoId: string;
      metodoPagamento: string;
      tokenCartao: string | null;
      idempotencyKey?: string | null;
      simularFalha?: boolean;
      resultado?: ResultadoPagamentoSolicitado;
      motivoFalha?: string | null;
    }
  ) {
    const pedido = await pedidoRepository.buscarPorId(dados.pedidoId);
    if (!pedido) throw new ErroApp(404, "Pedido nao encontrado.");

    if (String(pedido.usuarioId) !== String(usuarioId)) {
      throw new ErroApp(403, "Pedido nao pertence ao usuario autenticado.");
    }

    const chaveIdempotencia = dados.idempotencyKey?.trim() || null;

    if (!chaveIdempotencia && pedido.status !== "AGUARDANDO_PAGAMENTO") {
      throw new ErroApp(400, "Pedido ja se encontra pago ou finalizado.");
    }

    const valorTotal =
      Number(pedido.valorFrete) +
      pedido.itens.reduce((s: number, i: any) => s + Number(i.subtotal), 0);

    const decisao = resolverResultadoPagamento(dados);

    const registro = await pagamentoRepository.registrarPagamento({
      pedidoId: dados.pedidoId,
      valor: valorTotal,
      formaPagamento: dados.metodoPagamento,
      status: decisao.status,
      novoStatusPedido: decisao.novoStatusPedido,
      chaveIdempotencia,
      motivo: decisao.motivo,
      liberarReserva: decisao.liberarReserva,
    });

    const aprovado = registro.pagamento.status === "APROVADO";
    const motivoFinal = registro.pagamento.motivo ?? decisao.motivo;

    return {
      httpStatus: aprovado ? 200 : 402,
      corpo: {
        transacaoId: registro.pagamento.id,
        status: registro.pagamento.status,
        statusPedido: registro.statusPedido,
        dataPagamento: registro.pagamento.data,
        valorFrete: Number(pedido.valorFrete ?? 0),
        valorTotal: Number(registro.pagamento.valor),
        ...(chaveIdempotencia ? { idempotencyKey: chaveIdempotencia, idempotente: registro.idempotente } : {}),
        ...(!aprovado
          ? {
              reservaLiberada: registro.reservaLiberada,
              motivo: motivoFinal,
              mensagem: motivoFinal ?? "Pagamento recusado.",
            }
          : {}),
      },
    };
  },
};
