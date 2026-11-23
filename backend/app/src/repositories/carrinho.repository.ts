import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { ErroApp } from "../middleware/error";

const inclusaoCarrinho = {
  itens: {
    orderBy: { numeroItem: "asc" as const },
    include: {
      produto: {
        include: { imagens: { take: 1 }, loja: { include: { usuario: { select: { nome: true } } } } },
      },
    },
  },
};

export const carrinhoRepository = {
  buscarPorUsuarioId(usuarioId: Id) {
    return prisma.carrinho.findUnique({
      where: { usuarioId: toId(usuarioId) },
      include: inclusaoCarrinho,
    });
  },

  criar(usuarioId: Id) {
    return prisma.carrinho.create({
      data: { usuarioId: toId(usuarioId), status: "ATIVO", dataCriacao: new Date() },
    });
  },

  buscarItem(carrinhoId: Id, produtoId: Id) {
    return prisma.itemCarrinho.findFirst({
      where: { carrinhoId: toId(carrinhoId), produtoId: toId(produtoId) },
    });
  },

  async criarItem(dados: { carrinhoId: Id; produtoId: Id; quantidade: number; precoUnitario: any }) {
    const carrinhoId = toId(dados.carrinhoId);
    const ultimo = await prisma.itemCarrinho.aggregate({
      where: { carrinhoId },
      _max: { numeroItem: true },
    });
    return prisma.itemCarrinho.create({
      data: {
        carrinhoId,
        produtoId: toId(dados.produtoId),
        quantidade: dados.quantidade,
        precoUnitario: dados.precoUnitario,
        numeroItem: (ultimo._max.numeroItem ?? 0) + 1,
      },
    });
  },

  atualizarItem(carrinhoId: Id, numeroItem: number, quantidade: number) {
    return prisma.itemCarrinho.update({
      where: { carrinhoId_numeroItem: { carrinhoId: toId(carrinhoId), numeroItem } },
      data: { quantidade },
    });
  },

  removerItens(carrinhoId: Id, produtoId: Id) {
    return prisma.itemCarrinho.deleteMany({
      where: { carrinhoId: toId(carrinhoId), produtoId: toId(produtoId) },
    });
  },

  limpar(carrinhoId: Id) {
    return prisma.itemCarrinho.deleteMany({ where: { carrinhoId: toId(carrinhoId) } });
  },

  atualizarStatus(carrinhoId: Id, status: string) {
    return prisma.carrinho.update({
      where: { id: toId(carrinhoId) },
      data: { status },
    });
  },

  async adicionarItemComTrava(usuarioIdNumerico: number, produtoIdNumerico: number, quantidade: number) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE fk_usuario_id_usuario = ${usuarioIdNumerico} FOR UPDATE`;
      const carrinho = await tx.carrinho.findUnique({ where: { usuarioId: usuarioIdNumerico } });
      if (!carrinho) throw new ErroApp(404, "Carrinho nao encontrado.");

      await tx.$queryRaw`SELECT id_estoque FROM estoque WHERE fk_produto_id_produto = ${produtoIdNumerico} FOR UPDATE`;
      const produto = await tx.produto.findFirst({
        where: { id: produtoIdNumerico, excluido: false },
        include: { estoque: true },
      });
      if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
      if (produto.pausado || produto.statusValidacao !== "APROVADA") {
        throw new ErroApp(409, "Produto indisponível.");
      }

      const existente = await tx.itemCarrinho.findFirst({
        where: { carrinhoId: carrinho.id, produtoId: produto.id },
      });
      const total = (existente?.quantidade ?? 0) + quantidade;
      const estoque = produto.estoque?.quantidadeDisponivel;
      if (estoque === undefined || total > estoque || (produto.pecaUnica && total > 1)) {
        throw new ErroApp(409, "Quantidade acima do estoque disponível.");
      }

      if (carrinho.status !== "ATIVO") {
        await tx.carrinho.update({ where: { id: carrinho.id }, data: { status: "ATIVO" } });
      }
      if (existente) {
        await tx.itemCarrinho.update({
          where: { carrinhoId_numeroItem: { carrinhoId: carrinho.id, numeroItem: existente.numeroItem } },
          data: { quantidade: total },
        });
      } else {
        const ultimo = await tx.itemCarrinho.aggregate({
          where: { carrinhoId: carrinho.id },
          _max: { numeroItem: true },
        });
        await tx.itemCarrinho.create({
          data: {
            carrinhoId: carrinho.id,
            numeroItem: (ultimo._max.numeroItem ?? 0) + 1,
            produtoId: produto.id,
            quantidade,
            precoUnitario: produto.preco,
          },
        });
      }
    });
  },

  async removerItemComTrava(carrinhoId: number, usuarioIdNumerico: number, produtoIdNumerico: number) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinhoId} AND fk_usuario_id_usuario = ${usuarioIdNumerico} FOR UPDATE`;
      const cartAtual = await tx.carrinho.findFirst({
        where: { id: carrinhoId, usuarioId: usuarioIdNumerico },
      });
      if (!cartAtual) throw new ErroApp(404, "Carrinho nao encontrado.");
      await tx.itemCarrinho.deleteMany({ where: { carrinhoId: cartAtual.id, produtoId: produtoIdNumerico } });
    });
  },

  async atualizarQuantidadeComTrava(usuarioIdNumerico: number, produtoIdNumerico: number, quantidade: number) {
    return prisma.$transaction(async (tx) => {
      const carrinho = await tx.carrinho.findUnique({
        where: { usuarioId: usuarioIdNumerico },
        select: { id: true },
      });
      if (!carrinho) throw new ErroApp(404, "Carrinho nao encontrado.");

      // Checkout usa o mesmo lock. Assim, alteração da quantidade e compra não
      // podem validar a mesma linha de carrinho em paralelo.
      await tx.$queryRaw`SELECT id_carrinho FROM carrinho WHERE id_carrinho = ${carrinho.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id_estoque FROM estoque WHERE fk_produto_id_produto = ${produtoIdNumerico} FOR UPDATE`;

      const produto = await tx.produto.findFirst({
        where: { id: produtoIdNumerico, excluido: false },
        include: { estoque: true },
      });
      if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
      if (produto.pausado || produto.statusValidacao !== "APROVADA") {
        throw new ErroApp(409, "Produto indisponível.");
      }

      const estoque = produto.estoque?.quantidadeDisponivel;
      if (estoque === undefined || quantidade > estoque || (produto.pecaUnica && quantidade > 1)) {
        throw new ErroApp(409, "Quantidade acima do estoque disponível.");
      }

      const itemExistente = await tx.itemCarrinho.findFirst({
        where: { carrinhoId: carrinho.id, produtoId: produto.id },
      });
      if (!itemExistente) throw new ErroApp(404, "Item nao encontrado no carrinho.");

      await tx.itemCarrinho.update({
        where: { carrinhoId_numeroItem: { carrinhoId: carrinho.id, numeroItem: itemExistente.numeroItem } },
        data: { quantidade },
      });

      const carrinhoAtualizado = await tx.carrinho.findUnique({
        where: { id: carrinho.id },
        include: inclusaoCarrinho,
      });
      return { mensagem: "Quantidade atualizada com sucesso.", carrinho: carrinhoAtualizado };
    });
  },
};
