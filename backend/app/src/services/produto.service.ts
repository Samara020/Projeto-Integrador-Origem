import { ErroApp } from "../middleware/error";
import { toId } from "../lib/ids";
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

const PLACEHOLDER = "https://storage.sistemaorigem.com/placeholder.jpg";

const quantidadeDe = (produto: any): number => produto.estoque?.quantidadeDisponivel ?? 0;

const skuDe = (id: number) => "ORG-" + String(id).padStart(6, "0");

const disponibilidadeDe = (produto: any) =>
  quantidadeDe(produto) > 0 && !produto.pausado ? "DISPONIVEL" : "VENDIDO";

const situacaoDe = (quantidade: number, pausado = false) =>
  pausado
    ? "INATIVO"
    : quantidade === 0
      ? "ESGOTADO"
      : quantidade < 5
        ? "ESTOQUE_BAIXO"
        : "ATIVO";

const dadosDoArtesao = (loja: any) => ({
  id: loja.usuario.id,
  nome: loja.usuario.nome,
});

/** Peca unica nao pode ter mais de uma unidade (regra do banco). */
const validarPecaUnica = (pecaUnica: boolean, estoque: number) => {
  if (pecaUnica && estoque > 1) {
    throw new ErroApp(400, "Peca unica nao pode ter estoque superior a uma unidade.");
  }
};

/**
 * Busca a peca e garante que ela pertence a loja do artesao logado.
 * Centraliza a checagem de posse usada em atualizar, inativar e atualizarEstoque.
 * Lanca 404 se a peca nao existir e 403 (com a mensagem informada) se for de outra loja.
 */
const buscarProdutoDoArtesao = async (
  id: string,
  usuarioId: string,
  mensagemSemPermissao: string
) => {
  const produto = await produtoRepository.buscarPorId(id);
  if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

  const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
  if (!loja || produto.lojaId !== loja.id) {
    throw new ErroApp(403, mensagemSemPermissao);
  }

  return produto;
};

export const produtoService = {
  async listar(filtros: any) {
    const disponivel = filtros.disponivel === "true" || filtros.disponivel === true;
    const destaque = filtros.destaque === "true" || filtros.destaque === true;
    const pecaUnica = filtros.pecaUnica === "true" || filtros.pecaUnica === true;
    const precoMax =
      filtros.precoMax !== undefined && filtros.precoMax !== ""
        ? Number(filtros.precoMax)
        : undefined;

    const [total, itens] = await produtoRepository.listar({
      termo: filtros.termo,
      categoria: filtros.categoria,
      categoriaId: filtros.categoriaId,
      tecnica: filtros.tecnica,
      regiao: filtros.regiao,
      origem: filtros.origem,
      avaliacaoMin:
        filtros.avaliacaoMin !== undefined && filtros.avaliacaoMin !== ""
          ? Number(filtros.avaliacaoMin)
          : undefined,
      disponivel,
      destaque,
      precoMax,
      pecaUnica,
      ordenar: filtros.ordenar,
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
        imagemPrincipal: produto.imagens[0]?.url ?? PLACEHOLDER,
        artesao: dadosDoArtesao(produto.loja),
        seloAtivo: produto.seloAtivo,
        regiao: { id: produto.origem, nome: produto.origem },
        modalidadeProducao: produto.modalidadeProducao,
        disponibilidade: disponibilidadeDe(produto),
        avaliacaoMedia: produto.avaliacaoMedia ?? 0,
      })),
    };
  },

  async buscarPorId(id: string) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const avaliacoes = (produto as any).avaliacoes ?? [];
    const notasValidas = avaliacoes.filter((a: any) => a.status === "PUBLICADO");

    return {
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      modalidadeProducao: produto.modalidadeProducao,
      seloAtivo: produto.seloAtivo,
      disponibilidade: disponibilidadeDe(produto),
      descricao: produto.descricao ?? "",
      imagens: produto.imagens.map((i: any) => i.url),
      categoria: { id: produto.categoria.id, nome: produto.categoria.nome },
      tecnica: produto.tecnica,
      estoque: quantidadeDe(produto),
      avaliacaoMedia: notasValidas.length
        ? Math.round((notasValidas.reduce((s: number, a: any) => s + a.nota, 0) / notasValidas.length) * 10) / 10
        : 0,
      totalAvaliacoes: notasValidas.length,
      dimensoes: "",
      material: "",
      regiao: { id: produto.origem, nome: produto.origem },
      artesao: {
        ...dadosDoArtesao(produto.loja),
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
    if (!/^\d+$/.test(produtoId)) return { recomendados: [], produtosRecomendados: [], fonte: "baseline" };
    const produto = await produtoRepository.buscarPorId(produtoId);
    if (!produto) return { recomendados: [], produtosRecomendados: [], fonte: "baseline" };
    const catalogo = (await produtoRepository.catalogoParaRecomendacao())
      .filter(p => p.id !== produto.id && p.statusValidacao === "APROVADA" && (p.estoque?.quantidadeDisponivel ?? 0) > 0);
    let fonte = "baseline";
    let selecionados = [...catalogo].sort((a, b) =>
      Number(b.categoriaId === produto.categoriaId) - Number(a.categoriaId === produto.categoriaId)
      || Number(b.tecnica === produto.tecnica) - Number(a.tecnica === produto.tecnica) || b.id - a.id).slice(0, 4);
    const base = process.env.RECOMENDACAO_API_URL;
    if (base) {
      try {
        const resposta = await fetch(base.replace(/\/$/, "") + "/recommendations", {
          method: "POST", headers: { "Content-Type": "application/json", "X-API-Key": process.env.RECOMENDACAO_API_KEY ?? "" },
          body: JSON.stringify({ product_id: String(produto.id), category: produto.categoria.nome, technique: produto.tecnica, region: produto.origem, limit: 4 }),
          signal: AbortSignal.timeout(2000),
        });
        if (resposta.ok) {
          const corpo = await resposta.json() as { recommendations?: { product_id: string }[] };
          if (Array.isArray(corpo.recommendations)) {
            const ids = new Set(corpo.recommendations.map(p => String(p.product_id)));
            const validos = catalogo.filter(p => ids.has(String(p.id)));
            if (validos.length || corpo.recommendations.length === 0) { selecionados = validos.slice(0, 4); fonte = "ia"; }
          }
        }
      } catch { /* O catálogo real fornece o baseline se o módulo não estiver disponível. */ }
    }
    const recomendados = selecionados.map(p => ({
      id: String(p.id), nome: p.nome, preco: Number(p.preco), imagemPrincipal: p.imagens[0]?.url ?? "",
      tecnica: p.tecnica, artesao: { id: String(p.loja.usuario.id), nome: p.loja.usuario.nome },
      seloAtivo: p.seloAtivo, regiao: { id: p.origem, nome: p.origem },
      modalidadeProducao: p.modalidadeProducao, disponibilidade: "DISPONIVEL",
    }));
    return { recomendados, produtosRecomendados: recomendados, fonte };
  },
  async criar(dados: NovoProduto, usuarioId: string) {
    let loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      loja = await lojaRepository.criar({
        nome: `Loja de ${usuarioId}`,
        usuarioId,
      });
    }

    const pecaUnica = dados.modalidadeProducao === "PECA_UNICA";
    validarPecaUnica(pecaUnica, dados.estoque);

    const categoria = await categoriaRepository.buscarOuCriar(dados.categoria);

    const produto = await produtoRepository.criar({
      nome: dados.nome,
      descricao: dados.descricao,
      categoriaId: categoria.id,
      tecnica: dados.tecnica,
      preco: dados.preco,
      origem: dados.origem,
      modalidadeProducao: dados.modalidadeProducao,
      pecaUnica,
      lojaId: loja.id,
      imagens: dados.imagens,
      estoque: dados.estoque,
    });

    // Novo produto nasce PENDENTE e só entra no catálogo após aprovação durável.
    return {
      id: produto.id,
      sku: dados.sku ?? skuDe(produto.id),
      statusValidacao: produto.statusValidacao,
      criadoEm: new Date().toISOString(),
    };
  },

  async atualizar(id: string, dados: any, usuarioId: string) {
    const produto = await buscarProdutoDoArtesao(
      id,
      usuarioId,
      "Voce so pode atualizar suas proprias pecas."
    );

    // Somente colunas existentes no SQL; demais campos do corpo sao ignorados.
    const permitido: Record<string, unknown> = {};
    for (const campo of ["nome", "descricao", "tecnica", "preco", "origem", "modalidadeProducao"]) {
      if (dados?.[campo] !== undefined) permitido[campo] = dados[campo];
    }
    if (permitido.modalidadeProducao !== undefined) {
      permitido.pecaUnica = permitido.modalidadeProducao === "PECA_UNICA";
    }

    const pecaUnica = (permitido.pecaUnica as boolean | undefined) ?? produto.pecaUnica;
    validarPecaUnica(pecaUnica, dados?.estoque ?? quantidadeDe(produto));

    const atualizado = await produtoRepository.atualizar(id, permitido);
    if (dados?.estoque !== undefined) {
      await produtoRepository.atualizarEstoque(id, Number(dados.estoque));
    }

    return {
      id: atualizado.id,
      preco: Number(atualizado.preco),
      atualizadoEm: new Date().toISOString(),
    };
  },

  async inativar(id: string, usuarioId: string) {
    await buscarProdutoDoArtesao(id, usuarioId, "Voce so pode inativar suas proprias pecas.");

    const produtoId = toId(id);
    const pedidosVinculados = await produtoRepository.contarItensPedido(produtoId);
    if (pedidosVinculados === 0) {
      await produtoRepository.excluirFisicamente(produtoId);
    } else {
      await produtoRepository.inativarLogicamente(produtoId);
    }

    return { mensagem: "Produto inativado com sucesso." };
  },

  async listarPeloArtesao(usuarioId: string, filtros: { situacao?: string }) {
    const loja = await lojaRepository.buscarPorUsuarioId(usuarioId);
    if (!loja) {
      return {
        total: 0,
        pagina: 1,
        limite: 20,
        contagem: { ATIVO: 0, INATIVO: 0, ESGOTADO: 0, ESTOQUE_BAIXO: 0 },
        itens: [],
      };
    }

    const todosProdutos = await produtoRepository.listarPorLoja(loja.id, {});

    const contagem = {
      ATIVO: todosProdutos.filter(
        (p: any) => situacaoDe(quantidadeDe(p), p.pausado) === "ATIVO"
      ).length,
      INATIVO: todosProdutos.filter(
        (p: any) => situacaoDe(quantidadeDe(p), p.pausado) === "INATIVO"
      ).length,
      ESGOTADO: todosProdutos.filter(
        (p: any) => situacaoDe(quantidadeDe(p), p.pausado) === "ESGOTADO"
      ).length,
      ESTOQUE_BAIXO: todosProdutos.filter(
        (p: any) => situacaoDe(quantidadeDe(p), p.pausado) === "ESTOQUE_BAIXO"
      ).length,
    };

    const produtosFiltrados = filtros.situacao
      ? todosProdutos.filter(
          (p: any) => situacaoDe(quantidadeDe(p), p.pausado) === filtros.situacao
        )
      : todosProdutos;

    const itens = produtosFiltrados.map((p: any) => ({
      id: p.id,
      nome: p.nome,
      sku: skuDe(p.id),
      imagemPrincipal: p.imagens[0]?.url ?? PLACEHOLDER,
      estoque: quantidadeDe(p),
      situacao: situacaoDe(quantidadeDe(p), p.pausado),
    }));

    return { total: itens.length, pagina: 1, limite: 20, contagem, itens };
  },

  async atualizarEstoque(
    id: string,
    dados: { estoque?: number; situacao?: string; pausada?: boolean },
    usuarioId: string
  ) {
    const produto = await buscarProdutoDoArtesao(id, usuarioId, "Acesso negado.");

    const produtoId = toId(id);

    // 1. Validar e resolver pausa (sem persistir ainda)
    let novoPausado: boolean | undefined = undefined;
    if (dados.pausada !== undefined) {
      novoPausado = Boolean(dados.pausada);
    } else if (dados.situacao !== undefined) {
      novoPausado = dados.situacao === "INATIVO";
    }

    // 2. Validar quantidade e regra de peça única ANTES de qualquer escrita
    let novoEstoque: number | undefined = undefined;
    if (dados.estoque !== undefined) {
      const qtd = Number(dados.estoque);
      if (!Number.isInteger(qtd) || qtd < 0) {
        throw new ErroApp(400, "A quantidade em estoque deve ser um número inteiro maior ou igual a zero.");
      }
      validarPecaUnica(produto.pecaUnica, qtd);
      novoEstoque = qtd;
    }

    // 3. Persistência atômica somente se todas as validações passaram
    if (novoPausado !== undefined || novoEstoque !== undefined) {
      await produtoRepository.atualizarEstoqueEPausa(produtoId, {
        pausado: novoPausado,
        estoque: novoEstoque,
      });
    }

    const estoqueFinal = novoEstoque ?? quantidadeDe(produto);
    const pausadoFinal = novoPausado ?? produto.pausado;
    const situacaoCalculada = situacaoDe(estoqueFinal, pausadoFinal);

    return { id: String(produto.id), estoque: estoqueFinal, situacao: situacaoCalculada };
  },

  async listarPendentes(filtros: { status?: string }) {
    const todos = await produtoRepository.listarTodos();
    const produtos = todos.filter(
      (p: any) => !filtros.status || p.statusValidacao === filtros.status
    );

    return {
      total: produtos.length,
      itens: produtos.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        imagemPrincipal: p.imagens[0]?.url ?? PLACEHOLDER,
        artesao: dadosDoArtesao(p.loja),
        tecnica: p.tecnica,
        regiao: p.origem,
        enviadoEm: p.enviadoEm ?? null,
        informacoesOrigem: p.descricao ?? "",
        certificado: null,
        statusValidacao: p.statusValidacao,
        justificativa: p.justificativaValidacao ?? null,
        decididoEm: p.decididoEm ?? null,
        decididoPorId: p.decididoPorId ?? null,
      })),
    };
  },

  async validar(id: string, dados: { status: "APROVADA" | "REPROVADA"; justificativa: string }, usuarioId: string) {
    if (!["APROVADA", "REPROVADA"].includes(dados.status)) throw new ErroApp(400, "Decisão de validação inválida.");
    if (dados.status === "REPROVADA" && (dados.justificativa?.trim().length ?? 0) < 10) throw new ErroApp(400, "Explique o motivo da reprovação em pelo menos 10 caracteres.");
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const decisao = {
      statusValidacao: dados.status,
      seloAtivo: dados.status === "APROVADA",
      justificativa: dados.justificativa ?? null,
      decididoEm: new Date(),
      decididoPorId: toId(usuarioId),
    };
    const atualizada = await produtoRepository.atualizarValidacao(id, decisao);
    if (atualizada.count !== 1) throw new ErroApp(409, "Esta peça já foi avaliada.");

    return {
      id: produto.id,
      statusValidacao: decisao.statusValidacao,
      seloAtivo: decisao.seloAtivo,
    };
  },
};
