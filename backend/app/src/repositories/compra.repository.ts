import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { toId } from "../lib/ids";
import { statusValidacaoDe } from "../lib/memoria";
import { ErroApp } from "../middleware/error";

type Endereco = { cep: string; rua: string; numero: string; bairro?: string; cidade?: string; cpf?: string };
const RESERVA = "Estoque reservado no checkout";

async function bloquearPedido(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw`SELECT id_pedidos FROM pedido WHERE id_pedidos = ${id} FOR UPDATE`;
  const pedido = await tx.pedido.findUnique({ where: { id }, include: { itens: true, pagamentos: true, historico: true } });
  if (!pedido) throw new ErroApp(404, "Pedido nao encontrado.");
  return pedido;
}

export const compraRepository = {
  checkout(usuario: string, endereco: Endereco) {
    const usuarioId = toId(usuario);
    return prisma.$transaction(async (tx) => {
      // Serializa finalizações do mesmo carrinho. A segunda requisição lê o carrinho já vazio.
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE fk_usuario_id_usuario = ${usuarioId} FOR UPDATE`;
      const carrinho = await tx.carrinho.findUnique({
        where: { usuarioId },
        include: { itens: { orderBy: { produtoId: "asc" }, include: { produto: true } } },
      });
      if (!carrinho?.itens.length) throw new ErroApp(400, "Carrinho vazio.");

      for (const item of carrinho.itens) {
        if (statusValidacaoDe(item.produtoId) !== "APROVADA") {
          throw new ErroApp(409, "Produto indisponivel para compra.");
        }
        // O UPDATE condicional reavalia o limite depois de obter o bloqueio da linha.
        // A ordem por produto evita bloquear dois carrinhos em ordens opostas.
        const reserva = await tx.estoque.updateMany({
          where: { produtoId: item.produtoId, quantidadeDisponivel: { gte: item.quantidade } },
          data: { quantidadeDisponivel: { decrement: item.quantidade } },
        });
        if (reserva.count !== 1) throw new ErroApp(409, "Estoque insuficiente para concluir a compra.");
      }
      const entrega = await tx.enderecoEntrega.create({ data: {
        logradouro: `${endereco.rua}, ${endereco.numero} - CEP ${endereco.cep}`,
        bairro: endereco.bairro ?? "Nao informado", cidade: endereco.cidade ?? "Nao informada",
        cpf: endereco.cpf ?? "00000000000",
      } });
      const pedido = await tx.pedido.create({ data: {
        usuarioId, enderecoEntregaId: entrega.id, status: "AGUARDANDO_PAGAMENTO", data: new Date(),
        itens: { create: carrinho.itens.map((item, indice) => ({
          numeroItem: indice + 1, produtoId: item.produtoId, quantidade: item.quantidade,
          precoUnitario: item.produto.preco, subtotal: item.produto.preco.mul(item.quantidade),
        })) },
        historico: { create: { status: "AGUARDANDO_PAGAMENTO", observacao: RESERVA, data: new Date() } },
      }, include: { itens: true } });
      await tx.itemCarrinho.deleteMany({ where: { carrinhoId: carrinho.id } });
      return {
        pedidoId: pedido.id, status: pedido.status,
        valorTotal: pedido.itens.reduce((soma, item) => soma.add(item.subtotal), new Prisma.Decimal(0)).toNumber(),
      };
    });
  },

  pagar(usuario: string, dados: { pedidoId: string; metodoPagamento: string; tokenCartao: string | null }) {
    const id = toId(dados.pedidoId);
    return prisma.$transaction(async (tx) => {
      const pedido = await bloquearPedido(tx, id);
      if (pedido.usuarioId !== toId(usuario)) throw new ErroApp(403, "Voce so pode pagar seus proprios pedidos.");
      const aprovado = pedido.pagamentos.find((p) => p.status === "APROVADO");
      if (aprovado) {
        if (aprovado.formaPagamento !== dados.metodoPagamento) {
          throw new ErroApp(409, "Pedido ja pago com outro metodo.");
        }
        return aprovado;
      }
      if (pedido.status !== "AGUARDANDO_PAGAMENTO") throw new ErroApp(409, "Pedido nao aguarda pagamento.");
      if (!pedido.historico.some((h) => h.observacao === RESERVA)) {
        throw new ErroApp(409, "Pedido anterior ao controle de reservas. Refaca o checkout.");
      }
      if (dados.metodoPagamento === "CARTAO_CREDITO" && !dados.tokenCartao?.trim()) {
        throw new ErroApp(400, "Confira os dados do cartao.");
      }
      const pagamento = await tx.pagamento.create({ data: {
        pedidoId: id, formaPagamento: dados.metodoPagamento, status: "APROVADO", data: new Date(),
        valor: pedido.itens.reduce((soma, item) => soma.add(item.subtotal), new Prisma.Decimal(0)),
      } });
      await tx.pedido.update({ where: { id }, data: { status: "PAGO" } });
      await tx.historicoPedido.create({ data: { pedidoId: id, status: "PAGO", data: new Date() } });
      return pagamento;
    });
  },

  cancelar(usuario: string, pedidoId: string) {
    const id = toId(pedidoId);
    return prisma.$transaction(async (tx) => {
      const pedido = await bloquearPedido(tx, id);
      if (pedido.usuarioId !== toId(usuario)) throw new ErroApp(403, "Voce so pode cancelar seus proprios pedidos.");
      if (pedido.status === "CANCELADO") return { id, status: pedido.status };
      if (pedido.status !== "AGUARDANDO_PAGAMENTO" || pedido.pagamentos.some((p) => p.status === "APROVADO")) {
        throw new ErroApp(409, "Somente pedidos aguardando pagamento podem liberar a reserva.");
      }
      const reservados = pedido.historico.some((h) => h.observacao === RESERVA) ? pedido.itens : [];
      for (const item of [...reservados].sort((a, b) => a.produtoId - b.produtoId)) {
        await tx.estoque.update({ where: { produtoId: item.produtoId },
          data: { quantidadeDisponivel: { increment: item.quantidade } } });
      }
      await tx.pedido.update({ where: { id }, data: { status: "CANCELADO" } });
      await tx.historicoPedido.create({ data: { pedidoId: id, status: "CANCELADO", data: new Date() } });
      return { id, status: "CANCELADO" };
    });
  },
};
