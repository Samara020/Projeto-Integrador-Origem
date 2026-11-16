import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const pagamentoRepository = {
  registrarPagamento(dados: {
    pedidoId: Id;
    valor: any;
    formaPagamento: string;
    status?: string;
    novoStatusPedido?: string;
  }) {
    const pedidoId = toId(dados.pedidoId);
    const novoStatus = dados.novoStatusPedido ?? "PAGO";
    return prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.create({
        data: {
          pedidoId,
          valor: dados.valor,
          formaPagamento: dados.formaPagamento,
          status: dados.status ?? "APROVADO",
          data: new Date(),
        },
      });

      await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: novoStatus },
      });

      const pedidoAtual = await tx.pedido.findUnique({
        where: { id: pedidoId },
        select: { usuarioId: true },
      });
      if (pedidoAtual) {
        await tx.carrinho.updateMany({
          where: { usuarioId: pedidoAtual.usuarioId },
          data: { status: novoStatus },
        });
      }

      await tx.historicoPedido.create({
        data: {
          pedidoId,
          status: novoStatus,
          observacao: `Pagamento via ${dados.formaPagamento}`,
          data: new Date(),
        },
      });

      return pagamento;
    });
  },

  criar(dados: {
    pedidoId: Id;
    valor: any;
    formaPagamento: string;
    status?: string;
  }) {
    return prisma.pagamento.create({
      data: {
        pedidoId: toId(dados.pedidoId),
        valor: dados.valor,
        formaPagamento: dados.formaPagamento,
        status: dados.status ?? "APROVADO",
        data: new Date(),
      },
    });
  },

  atualizarPedido(id: Id, status: string) {
    return prisma.$transaction([
      prisma.pedido.update({ where: { id: toId(id) }, data: { status } }),
      prisma.historicoPedido.create({
        data: { pedidoId: toId(id), status, observacao: null, data: new Date() },
      }),
    ]);
  },
};
