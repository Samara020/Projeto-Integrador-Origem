import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { DE_LOJA_ATIVA } from "../lib/loja-ativa";

const incluir = {
  produto: {
    include: {
      imagens: { take: 1 },
      loja: { include: { usuario: { select: { nome: true } } } },
    },
  },
};

export const personalizacaoRepository = {
  buscarProdutoAprovado(produtoId: Id) {
    return prisma.produto.findFirst({
      where: {
        id: toId(produtoId),
        excluido: false,
        pausado: false,
        statusValidacao: "APROVADA",
        ...DE_LOJA_ATIVA,
      },
    });
  },

  criar(dados: {
    usuarioId: Id;
    produtoId: Id;
    cor?: string;
    tamanho?: string;
    inscricao?: string;
    detalhes?: string;
    mensagem: string;
  }) {
    return prisma.personalizacao.create({
      data: {
        cor: dados.cor,
        tamanho: dados.tamanho,
        inscricao: dados.inscricao,
        detalhes: dados.detalhes,
        mensagem: dados.mensagem,
        usuarioId: toId(dados.usuarioId),
        produtoId: toId(dados.produtoId),
      },
      include: incluir,
    });
  },

  listarPorUsuario(usuarioId: Id) {
    return prisma.personalizacao.findMany({
      where: { usuarioId: toId(usuarioId) },
      orderBy: { id: "desc" },
      include: incluir,
    });
  },
};
