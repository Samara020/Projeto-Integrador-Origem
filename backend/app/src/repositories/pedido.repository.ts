import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";
import { Prisma } from "@prisma/client";

const PREFIXO_RASTREIO = "Rastreio: ";

export const pedidoRepository = {
  criarCheckout(dados: {
    usuarioId: Id;
    carrinhoId: Id;
    endereco: { logradouro: string; bairro: string; cidade: string; cpf: string };
    itens: { produtoId: Id; quantidade: number; precoUnitario: any; subtotal: any }[];
    valorFrete: number;
  }) {
    const carrinhoId = toId(dados.carrinhoId);
    const usuarioId = toId(dados.usuarioId);

    return prisma.$transaction(async (tx: any) => {
      // Trava a linha do carrinho para serializar checkouts simultâneos e
      // garantir leitura consistente após alterações concorrentes de quantidade/preço.
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinhoId} FOR UPDATE`;

      const itensCarrinho = await tx.itemCarrinho.findMany({
        where: { carrinhoId },
        include: { produto: true },
        orderBy: { numeroItem: "asc" },
      });

      if (itensCarrinho.length === 0) {
        throw new ErroApp(400, "Carrinho vazio.");
      }

      // A peça pode ter entrado no carrinho antes de a loja ser suspensa (HU-16). A leitura
      // trava a linha do dono da loja (FOR SHARE): se uma suspensão estiver em andamento, o
      // checkout espera ela terminar e lê a situação já gravada; se o checkout chegar antes,
      // a suspensão espera e encontra este pedido para cancelar. Não sobra pedido novo de
      // loja suspensa.
      const lojaIds = [...new Set<number>(itensCarrinho.map((item: any) => item.produto.lojaId))];
      const donos: { id_loja: number; situacao: string }[] = await tx.$queryRaw`
        SELECT l.id_loja, u.situacao
        FROM loja l
        JOIN usuario u ON u.id_usuario = l.fk_usuario_id_usuario
        WHERE l.id_loja IN (${Prisma.join(lojaIds)})
        FOR SHARE OF u`;
      const lojasSuspensas = new Set(donos.filter((dono) => dono.situacao !== "ATIVO").map((dono) => dono.id_loja));
      const deLojaSuspensa = itensCarrinho.find((item: any) => lojasSuspensas.has(item.produto.lojaId));
      if (deLojaSuspensa) {
        throw new ErroApp(409, `A peça "${deLojaSuspensa.produto.nome}" não está mais disponível. Retire-a do carrinho para continuar.`);
      }

      const itensAtualizados = itensCarrinho.map((item: any) => {
        const precoAtual = item.produto?.preco ?? item.precoUnitario;
        return {
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: precoAtual,
          subtotal: Number(precoAtual) * item.quantidade,
        };
      });

      for (const item of itensAtualizados) {
        const baixa = await tx.estoque.updateMany({
          where: {
            produtoId: toId(item.produtoId),
            quantidadeDisponivel: { gte: item.quantidade },
          },
          data: { quantidadeDisponivel: { decrement: item.quantidade } },
        });
        if (baixa.count === 0) {
          throw new ErroApp(409, "Estoque insuficiente para um dos itens do carrinho.");
        }
      }

      const endereco = await tx.enderecoEntrega.create({ data: dados.endereco });

      const pedido = await tx.pedido.create({
        data: {
          usuarioId,
          enderecoEntregaId: endereco.id,
          status: "AGUARDANDO_PAGAMENTO",
          data: new Date(),
          valorFrete: dados.valorFrete,
          itens: {
            create: itensAtualizados.map((i: any, indice: number) => ({
              numeroItem: indice + 1,
              produtoId: toId(i.produtoId),
              quantidade: i.quantidade,
              precoUnitario: i.precoUnitario,
              subtotal: i.subtotal,
            })),
          },
          historico: {
            create: { status: "AGUARDANDO_PAGAMENTO", observacao: null, data: new Date() },
          },
        },
        include: {
          itens: { include: { produto: { select: { nome: true, imagens: { take: 1 } } } } },
        },
      });

      await tx.itemCarrinho.deleteMany({ where: { carrinhoId } });
      return pedido;
    });
  },

  buscarDetalhePorUsuario(id: Id, usuarioId: Id) {
    return prisma.pedido.findFirst({
      where: { id: toId(id), usuarioId: toId(usuarioId) },
      include: {
        itens: {
          orderBy: { numeroItem: "asc" },
          include: { produto: { select: { nome: true, imagens: { take: 1 } } } },
        },
        historico: { orderBy: { id: "asc" } },
        enderecoEntrega: true,
      },
    });
  },

  buscarDaLoja(id: Id, lojaId: Id) {
    return prisma.pedido.findFirst({
      where: { id: toId(id), itens: { some: { produto: { lojaId: toId(lojaId) } } } },
      include: {
        itens: {
          include: { produto: { select: { lojaId: true } } },
        },
      },
    });
  },

  buscarPorId(id: Id) {
    return prisma.pedido.findUnique({
      where: { id: toId(id) },
      include: { itens: true },
    });
  },

  listarPorUsuario(usuarioId: Id) {
    return prisma.pedido.findMany({
      where: { usuarioId: toId(usuarioId) },
      orderBy: [{ data: "desc" }, { id: "desc" }],
      include: {
        itens: {
          orderBy: { numeroItem: "asc" },
          include: {
            produto: { select: { nome: true, imagens: { take: 1 } } },
          },
        },
      },
    });
  },

  contarAtePedidoPorUsuario(usuarioId: Id, pedido: { data: Date; id: Id }) {
    return prisma.pedido.count({
      where: {
        usuarioId: toId(usuarioId),
        OR: [
          { data: { lt: pedido.data } },
          { data: pedido.data, id: { lte: toId(pedido.id) } },
        ],
      },
    });
  },

  listarRecebidosPorLoja(lojaId: Id) {
    return prisma.pedido.findMany({
      where: { itens: { some: { produto: { lojaId: toId(lojaId) } } } },
      orderBy: { data: "desc" },
      include: {
        itens: { include: { produto: true } },
        usuario: { select: { nome: true } },
        historico: { orderBy: { id: "desc" } },
        enderecoEntrega: true,
      },
    });
  },

  async atualizarStatus(id: Id, dados: { status: string; codigoRastreio?: string | null; lojaId?: Id }) {
    const pedidoId = toId(id);
    return prisma.$transaction(async (tx: any) => {
      await tx.$queryRaw`SELECT id_pedidos FROM pedido WHERE id_pedidos = ${pedidoId} FOR UPDATE`;
      const pedidoAnterior = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { itens: true },
      });
      if (!pedidoAnterior) {
        throw new ErroApp(404, "Pedido nao encontrado.");
      }
      if (pedidoAnterior.status === "ENTREGUE" || pedidoAnterior.status === "CANCELADO") {
        throw new ErroApp(409, `Pedido ja esta ${pedidoAnterior.status} e nao pode mais ser alterado.`);
      }

      const pedido = await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: dados.status },
      });

      const prefixoLoja = dados.lojaId !== undefined ? `[Loja ${dados.lojaId}] ` : "";
      await tx.historicoPedido.create({
        data: {
          pedidoId,
          status: dados.status,
          observacao: dados.codigoRastreio ? `${prefixoLoja}${PREFIXO_RASTREIO}${dados.codigoRastreio}` : null,
          data: new Date(),
        },
      });

      if (dados.status === "CANCELADO" && pedidoAnterior.status !== "CANCELADO") {
        for (const item of pedidoAnterior.itens) {
          await tx.estoque.updateMany({
            where: { produtoId: item.produtoId },
            data: { quantidadeDisponivel: { increment: item.quantidade } },
          });
        }
      }

      return {
        id: pedido.id,
        statusProducao: pedido.status,
        codigoRastreio: dados.codigoRastreio ?? null,
      };
    });
  },

  extrairRastreio(historico: { observacao: string | null }[], lojaId?: Id): string | null {
    if (lojaId !== undefined) {
      const tagLoja = `[Loja ${lojaId}] ${PREFIXO_RASTREIO}`;
      const hLoja = historico.find((x) => x.observacao?.startsWith(tagLoja));
      if (hLoja) return hLoja.observacao!.slice(tagLoja.length);
    }
    const h = historico.find((x) => x.observacao?.includes(PREFIXO_RASTREIO));
    if (!h?.observacao) return null;
    const idx = h.observacao.indexOf(PREFIXO_RASTREIO);
    return h.observacao.slice(idx + PREFIXO_RASTREIO.length);
  },
};