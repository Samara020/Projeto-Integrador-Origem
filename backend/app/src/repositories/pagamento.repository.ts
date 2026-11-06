import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

export const pagamentoRepository = {
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
