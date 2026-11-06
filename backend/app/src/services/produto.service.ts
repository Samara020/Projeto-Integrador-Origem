import { ErroApp } from "../middleware/error";
import prisma from "../lib/prisma";
import {
  categoriaRepository,
  produtoRepository,
  lojaRepository,
} from "../repositories";

type NovoProduto = {
  nome: string;
  descricao?: string;
  categoria: string;
  tecnica: string;
  origem: string;
  preco: number;
  modalidadeProducao: string;
  estoque: number;
  sku?: string | null;
  material?: string | null;
  dimensoes?: string | null;
  peso?: number | null;
  informacoesOrigem?: string | null;
  certificado?: string | null;
  imagens: string[];
  prazoProducaoDias?: number | null;
  capacidadeProducao?: number | null;
};

export const produtoService = {
  async listar(filtros: any) {
    const [total, itens] = await produtoRepository.listar({
      termo: filtros.termo,
      categoria: filtros.categoria,
      tecnica: filtros.tecnica,
      regiao: filtros.regiao,
      pagina: Number(filtros.pagina) || 1,
      limite: Number(filtros.limite) || 10,
    });

    return {
      total,
      pagina: Math.max(Number(filtros.pagina) || 1, 1),
      limite: Math.min(Math.max(Number(filtros.limite) || 10, 1), 50),
      itens: itens.map((produto: any) => ({
        id: produto.id,
        nome: produto.nome,
        preco: Number(produto.preco),
        imagemPrincipal:
          produto.imagens[0]?.url ?? "https://storage.sistemaorigem.com/placeholder.jpg",
        artesao: {
          id: produto.loja.usuario.id,
          nome: produto.loja.usuario.nome,
        },
        seloAtivo: produto.seloAtivo,
        regiao: { id: produto.origem, nome: produto.origem },
        modalidadeProducao: produto.modalidadeProducao,
        disponibilidade:
          (produto.estoqueRegistro?.quantidade ?? produto.estoque) > 0
            ? "DISPONIVEL"
            : "VENDIDO",
      })),
    };
  },

  async buscarPorId(id: string) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    return {
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      modalidadeProducao: produto.modalidadeProducao,
      seloAtivo: produto.seloAtivo,
      descricao: produto.descricao ?? "",
      imagens: produto.imagens.map((i: any) => i.url),
      categoria: { id: produto.categoria.id, nome: produto.categoria.nome },
      tecnica: produto.tecnica,
      estoque: produto.estoqueRegistro?.quantidade ?? produto.estoque,
      totalAvaliacoes: 0,
      dimensoes: produto.dimensoes ?? "",
      material: produto.material ?? "",
      regiao: { id: produto.origem, nome: produto.origem },
      artesao: {
        id: produto.loja.usuario.id,
        nome: produto.loja.usuario.nome,
        loja: produto.loja.nome,
      },
    };
  },

  async comparar(idsParam: string) {
    const ids = idsParam.split(",").filter(Boolean);
    const produtos = await produtoRepository.comparar(ids);
    return {
      produtosComparados: produtos.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        tecnica: p.tecnica,
      })),
    };
  },

  async recomendados(produtoId: string) {
    const produto = await produtoRepository.buscarPorId(produtoId);
    if (!produto) return { produtosRecomendados: [] };

    const produtos = await produtoRepository.listar({
      termo: undefined,
      categoria: produto.categoriaId,
      tecnica: undefined,
      regiao: undefined,
      pagina: 1,
      limite: 4,
    });

    const [total, itens] = produtos;
    return {
      produtosRecomendados: itens
        .filter((p: any) => p.id !== produtoId)
        .slice(0, 4)
        .map((p: any) => ({
          id: p.id,
          nome: p.nome,
          preco: Number(p.preco),
          imagemPrincipal: p.imagens[0]?.url ?? "",
          tecnica: p.tecnica,
        })),
    };
  },

  async criar(dados: NovoProduto, usuarioId: string) {
    let loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      loja = await lojaRepository.criar({
        nome: `Loja de ${usuarioId}`,
        usuarioId,
      });
    }

    const categoria = await categoriaRepository.buscarOuCriar(dados.categoria);

    const produto = await produtoRepository.criar({
      nome: dados.nome,
      descricao: dados.descricao,
      categoriaId: categoria.id,
      tecnica: dados.tecnica,
      preco: dados.preco,
      origem: dados.origem,
      modalidadeProducao: dados.modalidadeProducao,
      estoque: dados.estoque,
      sku: dados.sku,
      material: dados.material,
      dimensoes: dados.dimensoes,
      peso: dados.peso,
      informacoesOrigem: dados.informacoesOrigem,
      certificado: dados.certificado,
      lojaId: loja.id,
      imagens: dados.imagens.length
        ? { create: dados.imagens.map((url: string) => ({ url })) }
        : undefined,
      estoqueRegistro: dados.estoque > 0
        ? { create: { quantidade: dados.estoque, pontoReposicao: 0 } }
        : undefined,
    });

    return {
      id: produto.id,
      sku: produto.sku,
      statusValidacao: produto.statusValidacao,
      criadoEm: produto.criadoEm,
    };
  },

  async atualizar(id: string, dados: any, usuarioId: string) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja || produto.lojaId !== loja.id) {
      throw new ErroApp(403, "Voce so pode atualizar suas proprias pecas.");
    }

    const atualizado = await produtoRepository.atualizar(id, dados);

    return {
      id: atualizado.id,
      preco: Number(atualizado.preco),
      atualizadoEm: atualizado.atualizadoEm,
    };
  },

  async inativar(id: string, usuarioId: string) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja || produto.lojaId !== loja.id) {
      throw new ErroApp(403, "Voce so pode inativar suas proprias pecas.");
    }

    await produtoRepository.inativar(id);

    return { mensagem: "Produto inativado com sucesso." };
  },

  async listarPeloArtesao(usuarioId: string, filtros: { situacao?: string }) {
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      return { total: 0, pagina: 1, limite: 20, contagem: {}, itens: [] };
    }

    const produtos = await produtoRepository.listarPorLoja(loja.id, filtros);

    const contagem = {
      ATIVO: produtos.filter((p: any) => p.estoque > 0).length,
      INATIVO: produtos.filter((p: any) => p.estoque === 0).length,
      ESGOTADO: produtos.filter((p: any) => p.estoque === 0).length,
      ESTOQUE_BAIXO: produtos.filter(
        (p: any) => p.estoque > 0 && p.estoque < 5
      ).length,
    };

    const itens = produtos.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      sku: p.sku ?? "ORG-" + p.id.slice(0, 6).toUpperCase(),
      imagemPrincipal: p.imagens[0]?.url ?? "",
      estoque: p.estoque,
      situacao:
        p.estoque === 0 ? "ESGOTADO" : p.estoque < 5 ? "ESTOQUE_BAIXO" : "ATIVO",
    }));

    return { total: itens.length, pagina: 1, limite: 20, contagem, itens };
  },

  async atualizarEstoque(id: string, dados: { estoque: number; situacao: string }, usuarioId: string) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja || produto.lojaId !== loja.id) {
      throw new ErroApp(403, "Acesso negado.");
    }

    await produtoRepository.atualizarEstoque(id, dados.estoque);
    if (dados.estoque === 0) {
      await prisma.estoque.upsert({
        where: { produtoId: id },
        update: { quantidade: 0 },
        create: { produtoId: id, quantidade: 0, pontoReposicao: 0 },
      });
    }

    return { id, estoque: dados.estoque, situacao: dados.situacao };
  },

  async listarPendentes(filtros: { status?: string }) {
    const produtos = await produtoRepository.listarPendentes(filtros);
    return {
      total: produtos.length,
      itens: produtos.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        imagemPrincipal: p.imagens[0]?.url ?? "",
        artesao: { id: p.loja.usuario.id, nome: p.loja.usuario.nome },
        tecnica: p.tecnica,
        regiao: p.origem,
        enviadoEm: p.criadoEm,
        informacoesOrigem: p.informacoesOrigem ?? "",
        certificado: p.certificado ?? null,
        statusValidacao: p.statusValidacao,
        justificativa: null,
        decididoEm: null,
      })),
    };
  },

  async validar(id: string, dados: { status: "APROVADA" | "REPROVADA"; justificativa: string }) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const atualizado = await produtoRepository.validar(id, {
      statusValidacao: dados.status,
      seloAtivo: dados.status === "APROVADA",
    });

    return {
      id: atualizado.id,
      statusValidacao: atualizado.statusValidacao,
      seloAtivo: atualizado.seloAtivo,
    };
  },
};