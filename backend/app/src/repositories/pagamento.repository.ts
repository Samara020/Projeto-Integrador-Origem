import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";

export type ResultadoRegistroPagamento = {
  pagamento: {
    id: number;
    data: Date;
    valor: unknown;
    status: string;
    formaPagamento: string;
    chaveIdempotencia: string | null;
    motivo: string | null;
    pedidoId: number;
  };
  idempotente: boolean;
  statusPedido: string;
  reservaLiberada: boolean;
};

export const pagamentoRepository = {
  buscarPorChaveIdempotencia(chaveIdempotencia: string) {
    return prisma.pagamento.findUnique({
      where: { chaveIdempotencia },
    });
  },

  registrarPagamento(dados: {
    pedidoId: Id;
    valor: any;
    formaPagamento: string;
    status?: "APROVADO" | "RECUSADO" | "EXPIRADO" | string;
    novoStatusPedido?: "PAGO" | "CANCELADO" | string;
    chaveIdempotencia?: string | null;
    motivo?: string | null;
    liberarReserva?: boolean;
  }): Promise<ResultadoRegistroPagamento> {
    const pedidoId = toId(dados.pedidoId);
    const statusPagamento = dados.status ?? "APROVADO";
    const novoStatus = dados.novoStatusPedido ?? (statusPagamento === "APROVADO" ? "PAGO" : "CANCELADO");
    const chaveIdempotencia = dados.chaveIdempotencia?.trim() || null;
    const liberarReserva = Boolean(dados.liberarReserva ?? statusPagamento !== "APROVADO");

    return prisma.$transaction(async (tx) => {
      // Serializa eventos concorrentes sobre o mesmo pedido.
      await tx.$queryRaw`SELECT id_pedidos FROM pedido WHERE id_pedidos = ${pedidoId} FOR UPDATE`;

      if (chaveIdempotencia) {
        const existente = await tx.pagamento.findUnique({
          where: { chaveIdempotencia },
        });
        if (existente) {
          if (existente.pedidoId !== pedidoId) {
            throw new ErroApp(409, "Chave de idempotencia ja utilizada em outro pedido.");
          }
          const pedidoExistente = await tx.pedido.findUnique({
            where: { id: pedidoId },
            select: { status: true },
          });
          return {
            pagamento: existente,
            idempotente: true,
            statusPedido:
              pedidoExistente?.status ?? (existente.status === "APROVADO" ? "PAGO" : "CANCELADO"),
            reservaLiberada: existente.status !== "APROVADO",
          };
        }
      }

      const pedidoAtual = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { itens: true },
      });
      if (!pedidoAtual) {
        throw new ErroApp(404, "Pedido nao encontrado.");
      }
      if (pedidoAtual.status !== "AGUARDANDO_PAGAMENTO") {
        throw new ErroApp(400, "Pedido ja se encontra pago ou finalizado.");
      }

      await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: novoStatus },
      });

      let pagamento;
      try {
        pagamento = await tx.pagamento.create({
          data: {
            pedidoId,
            valor: dados.valor,
            formaPagamento: dados.formaPagamento,
            status: statusPagamento,
            chaveIdempotencia,
            motivo: dados.motivo ?? null,
            data: new Date(),
          },
        });
      } catch (erro) {
        if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
          throw new ErroApp(409, "Chave de idempotencia ja utilizada em outro pedido.");
        }
        throw erro;
      }

      if (liberarReserva) {
        for (const item of pedidoAtual.itens) {
          await tx.estoque.updateMany({
            where: { produtoId: item.produtoId },
            data: { quantidadeDisponivel: { increment: item.quantidade } },
          });
        }
      }

      await tx.carrinho.updateMany({
        where: { usuarioId: pedidoAtual.usuarioId },
        data: { status: liberarReserva ? "ATIVO" : novoStatus },
      });

      const observacao = liberarReserva
        ? `Pagamento ${statusPagamento.toLowerCase()} via ${dados.formaPagamento}${
            dados.motivo ? `: ${dados.motivo}` : ""
          }. Reserva liberada.`
        : `Pagamento via ${dados.formaPagamento}`;

      await tx.historicoPedido.create({
        data: {
          pedidoId,
          status: novoStatus,
          observacao,
          data: new Date(),
        },
      });

      return {
        pagamento,
        idempotente: false,
        statusPedido: novoStatus,
        reservaLiberada: liberarReserva,
      };
    });
  },

  criar(dados: {
    pedidoId: Id;
    valor: any;
    formaPagamento: string;
    status?: string;
    chaveIdempotencia?: string | null;
    motivo?: string | null;
  }) {
    return prisma.pagamento.create({
      data: {
        pedidoId: toId(dados.pedidoId),
        valor: dados.valor,
        formaPagamento: dados.formaPagamento,
        status: dados.status ?? "APROVADO",
        chaveIdempotencia: dados.chaveIdempotencia ?? null,
        motivo: dados.motivo ?? null,
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
