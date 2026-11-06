import prisma from "../lib/prisma";
import { Id, toId } from "../lib/ids";
import { validacoes } from "../lib/memoria";

type FiltrosProduto = {
  termo?: string;
  categoria?: string;
  categoriaId?: Id;
  tecnica?: string;
  regiao?: string;
  pagina: number;
  limite: number;
};

const inclusaoPadrao = {
  categoria: true,
  loja: { include: { usuario: { select: { id: true, nome: true } } } },
  estoque: true,
};

export const produtoRepository = {
  listar(filtros: FiltrosProduto) {
    // O SQL nao guarda a validacao: so ficam fora do catalogo os produtos
    // marcados em memoria como PENDENTE ou REPROVADA.
    const naoAprovados = Array.from(validacoes.entries())
      .filter(([, v]) => v.status !== "APROVADA")
      .map(([id]) => id);

    const onde: Record<string, unknown> = { id: { notIn: naoAprovados } };

    if (filtros.termo) {
      onde.nome = { contains: filtros.termo, mode: "insensitive" };
    }
    if (filtros.categoria) {
      onde.categoria = { nome: filtros.categoria };
    }
    if (filtros.categoriaId !== undefined) {
      onde.categoriaId = toId(filtros.categoriaId);
    }
    if (filtros.tecnica) {
      onde.tecnica = filtros.tecnica;
    }
    if (filtros.regiao) {
      onde.origem = filtros.regiao;
    }

    const p = Math.max(filtros.pagina, 1);
    const l = Math.min(Math.max(filtros.limite, 1), 50);

    return prisma.$transaction([
      prisma.produto.count({ where: onde }),
      prisma.produto.findMany({
        where: onde,
        skip: (p - 1) * l,
        take: l,
        orderBy: { id: "desc" },
        include: { ...inclusaoPadrao, imagens: { take: 1 } },
      }),
    ]);
  },

  buscarPorId(id: Id) {
    return prisma.produto.findUnique({
      where: { id: toId(id) },
      include: { ...inclusaoPadrao, imagens: true },
    });
  },

  criar(dados: {
    nome: string;
    descricao?: string | null;
    tecnica: string;
    preco: number;
    origem: string;
    modalidadeProducao: string;
    pecaUnica: boolean;
    lojaId: Id;
    categoriaId: Id;
    imagens: string[];
    estoque: number;
    pontoReposicao?: number;
  }) {
    return prisma.produto.create({
      data: {
        nome: dados.nome,
        descricao: dados.descricao ?? null,
        tecnica: dados.tecnica,
        preco: dados.preco,
        origem: dados.origem,
        modalidadeProducao: dados.modalidadeProducao,
        pecaUnica: dados.pecaUnica,
        lojaId: toId(dados.lojaId),
        categoriaId: toId(dados.categoriaId),
        imagens: dados.imagens.length
          ? { create: dados.imagens.map((url) => ({ url })) }
          : undefined,
        estoque: {
          create: {
            quantidadeDisponivel: dados.estoque,
            pontoReposicao: dados.pontoReposicao ?? 0,
          },
        },
      },
      include: { imagens: true },
    });
  },

  atualizar(
    id: Id,
    dados: {
      nome?: string;
      descricao?: string | null;
      tecnica?: string;
      preco?: number;
      origem?: string;
      modalidadeProducao?: string;
      pecaUnica?: boolean;
    }
  ) {
    return prisma.produto.update({ where: { id: toId(id) }, data: dados });
  },

  /** Inativar = zerar o estoque (o SQL nao tem coluna de situacao). */
  inativar(id: Id) {
    return this.atualizarEstoque(id, 0);
  },

  listarPorLoja(lojaId: Id, filtros: { situacao?: string }) {
    const onde: Record<string, unknown> = { lojaId: toId(lojaId) };
    if (filtros.situacao === "ESTOQUE_BAIXO") {
      onde.estoque = { is: { quantidadeDisponivel: { lt: 5 } } };
    }
    return prisma.produto.findMany({
      where: onde,
      orderBy: { id: "asc" },
      include: { imagens: { take: 1 }, estoque: true },
    });
  },

  atualizarEstoque(id: Id, quantidade: number) {
    const produtoId = toId(id);
    return prisma.estoque.upsert({
      where: { produtoId },
      update: { quantidadeDisponivel: quantidade },
      create: { produtoId, quantidadeDisponivel: quantidade, pontoReposicao: 0 },
    });
  },

  listarTodos() {
    return prisma.produto.findMany({
      orderBy: { id: "desc" },
      include: {
        loja: { include: { usuario: { select: { id: true, nome: true } } } },
        imagens: { take: 1 },
      },
    });
  },

  comparar(ids: Id[]) {
    return prisma.produto.findMany({
      where: { id: { in: ids.map(toId) } },
      select: { id: true, nome: true, preco: true, tecnica: true },
    });
  },
};
