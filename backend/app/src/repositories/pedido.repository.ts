import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";

const PREFIXO_RASTREIO = "Rastreio: ";

export const pedidoRepository = {
  criarCheckout(dados: {
    usuarioId: Id;
    enderecoEntregaId: Id;
    itens: { produtoId: Id; quantidade: number; precoUnitario: any; subtotal: any }[];
  }) {
    return prisma.pedido.create({
      data: {
        usuarioId: toId(dados.usuarioId),
        enderecoEntregaId: toId(dados.enderecoEntregaId),
        status: "AGUARDANDO_PAGAMENTO",
        data: new Date(),
        itens: {
          create: dados.itens.map((i, indice) => ({
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
      orderBy: { data: "desc" },
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

  listarRecebidosPorLoja(lojaId: Id) {
    return prisma.pedido.findMany({
      where: { itens: { some: { produto: { lojaId: toId(lojaId) } } } },
      orderBy: { data: "desc" },
      include: {
        itens: { where: { produto: { lojaId: toId(lojaId) } }, include: { produto: true } },
        usuario: { select: { nome: true } },
        historico: { orderBy: { id: "desc" } },
      },
    });
  },

  /** O SQL nao tem coluna de rastreio: o codigo fica no historico do pedido. */
  async atualizarStatus(id: Id, dados: { status: string; codigoRastreio?: string | null }) {
    const pedidoId = toId(id);
    const [pedido] = await prisma.$transaction([
      prisma.pedido.update({ where: { id: pedidoId }, data: { status: dados.status } }),
      prisma.historicoPedido.create({
        data: {
          pedidoId,
          status: dados.status,
          observacao: dados.codigoRastreio ? PREFIXO_RASTREIO + dados.codigoRastreio : null,
          data: new Date(),
        },
      }),
    ]);
    return { ...pedido, codigoRastreio: dados.codigoRastreio ?? null };
  },

  extrairRastreio(historico: { observacao: string | null }[]): string | null {
    const h = historico.find((x) => x.observacao?.startsWith(PREFIXO_RASTREIO));
    return h ? h.observacao!.slice(PREFIXO_RASTREIO.length) : null;
  },
};
