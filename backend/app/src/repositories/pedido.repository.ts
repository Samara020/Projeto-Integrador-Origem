import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";
import { opcaoPorId } from "../lib/frete";

const PREFIXO_RASTREIO = "Rastreio: ";

export const pedidoRepository = {
  /**
   * Checkout atomico: valida e baixa o estoque, grava endereco, pedido, itens e
   * historico e esvazia o carrinho. Qualquer falha desfaz tudo (rollback).
   */
  criarCheckout(dados: {
    usuarioId: Id;
    carrinhoId: Id;
    opcaoEnvioId?: string;
    endereco: { logradouro: string; bairro: string; cidade: string; cpf: string };
  }) {
    return prisma.$transaction(async (tx) => {
      const carrinhoId = toId(dados.carrinhoId);
      const usuarioId = toId(dados.usuarioId);
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinhoId} AND fk_usuario_id_usuario = ${usuarioId} FOR UPDATE`;

      // A leitura ocorre depois do lock: PUT de quantidade e checkout nunca
      // podem confirmar versões diferentes da mesma linha do carrinho.
      const carrinho = await tx.carrinho.findFirst({
        where: { id: carrinhoId, usuarioId },
        include: {
          itens: {
            orderBy: { numeroItem: "asc" },
            include: {
              produto: {
                include: {
                  estoque: true,
                  loja: { select: { configuracaoEnvio: true } },
                },
              },
            },
          },
        },
      });
      if (!carrinho || carrinho.itens.length === 0) {
        throw new ErroApp(400, "Carrinho vazio.");
      }
      if (carrinho.status !== "ATIVO") {
        throw new ErroApp(409, "Carrinho indisponível para checkout.");
      }

      const opcao = opcaoPorId(dados.opcaoEnvioId);
      for (const item of carrinho.itens) {
        const produto = item.produto;
        if (produto.excluido || produto.pausado || produto.statusValidacao !== "APROVADA") {
          throw new ErroApp(409, "Um dos produtos do carrinho está indisponível.");
        }
        const configuracao = produto.loja.configuracaoEnvio as { opcoes?: { id: string; ativa: boolean }[] } | null;
        if (configuracao?.opcoes?.some((o) => o.id === opcao.id && !o.ativa)) {
          throw new ErroApp(409, "Opção de envio indisponível para uma das lojas.");
        }
      }

      const itens = carrinho.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.produto.preco,
        subtotal: Number(item.produto.preco) * item.quantidade,
      }));
      const valorSubtotal = itens.reduce((soma, item) => soma + item.subtotal, 0);

      // Ordem estável reduz risco de deadlock entre checkouts com vários itens.
      for (const item of [...itens].sort((a, b) => Number(a.produtoId) - Number(b.produtoId))) {
        const baixa = await tx.estoque.updateMany({
          where: {
            produtoId: toId(item.produtoId),
            produto: { excluido: false, pausado: false, statusValidacao: "APROVADA" },
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
          usuarioId: toId(dados.usuarioId),
          enderecoEntregaId: endereco.id,
          valorFrete: opcao.valor,
          status: "AGUARDANDO_PAGAMENTO",
          data: new Date(),
          itens: {
            create: itens.map((i, indice) => ({
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
      return {
        pedido,
        valorFrete: opcao.valor,
        valorTotal: valorSubtotal + opcao.valor,
      };
    });
  },

  /** Pedido do comprador com itens, produto, historico e endereco de entrega. */
  buscarDetalhePorUsuario(id: Id, usuarioId: Id) {
    return prisma.pedido.findFirst({
      where: { id: toId(id), usuarioId: toId(usuarioId) },
      include: {
        itens: {
          orderBy: { numeroItem: "asc" },
          include: { produto: { select: { nome: true, lojaId: true, imagens: { take: 1 } } } },
        },
        historico: { orderBy: { id: "asc" } },
        enderecoEntrega: true,
      },
    });
  },

  /** Pedido que contem ao menos um item da loja informada. */
  buscarDaLoja(id: Id, lojaId: Id) {
    return prisma.pedido.findFirst({
      where: { id: toId(id), itens: { some: { produto: { lojaId: toId(lojaId) } } } },
      include: { itens: { include: { produto: true } } },
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
        itens: { include: { produto: true } },
        usuario: { select: { nome: true } },
        historico: { orderBy: { id: "desc" } },
        enderecoEntrega: true,
      },
    });
  },

  /** O SQL nao tem coluna de rastreio: o codigo fica no historico do pedido. */
  async atualizarStatus(id: Id, dados: { status: string; codigoRastreio?: string | null }) {
    const pedidoId = toId(id);
    return prisma.$transaction(async (tx) => {
      // Serializa as transições do mesmo pedido antes de ler o status e decidir
      // se o estoque precisa ser reposto. A leitura após o lock vê a transição
      // confirmada pela transação anterior.
      const pedidoBloqueado = await tx.$queryRaw<{ id_pedidos: number }[]>`
        SELECT "id_pedidos"
        FROM "pedido"
        WHERE "id_pedidos" = ${pedidoId}
        FOR UPDATE
      `;
      if (pedidoBloqueado.length === 0) {
        throw new ErroApp(404, "Pedido nao encontrado.");
      }

      const pedidoAnterior = await tx.pedido.findUnique({
        where: { id: pedidoId },
        include: { itens: true },
      });
      if (!pedidoAnterior) {
        throw new ErroApp(404, "Pedido nao encontrado.");
      }

      // A validação do service pode ter lido um status antigo antes de esta
      // transação obter o lock. Revalidar aqui impede que uma segunda
      // requisição reabra um pedido terminal depois de o estoque ser reposto.
      if (["ENTREGUE", "CANCELADO"].includes(pedidoAnterior.status)) {
        throw new ErroApp(409, `Pedido ja esta ${pedidoAnterior.status} e nao pode mais ser alterado.`);
      }

      const pedido = await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: dados.status },
      });

      await tx.historicoPedido.create({
        data: {
          pedidoId,
          status: dados.status,
          observacao: dados.codigoRastreio ? PREFIXO_RASTREIO + dados.codigoRastreio : null,
          data: new Date(),
        },
      });

      // O lock do pedido garante que somente a primeira transição para
      // CANCELADO restaure as quantidades no estoque.
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

  extrairRastreio(historico: { observacao: string | null }[]): string | null {
    const h = historico.find((x) => x.observacao?.startsWith(PREFIXO_RASTREIO));
    return h ? h.observacao!.slice(PREFIXO_RASTREIO.length) : null;
  },
};
