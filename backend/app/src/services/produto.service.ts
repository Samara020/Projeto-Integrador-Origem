import { ErroApp } from "../middleware/error";
import { toId } from "../lib/ids";
import {
  seloAtivoDe,
  statusValidacaoDe,
  validacoes,
} from "../lib/memoria";
import {
  type ItemCatalogoIA,
  moduloIaConfigurado,
  solicitarRecomendacoesIA,
} from "../lib/modulo-ia";
import {
  categoriaRepository,
  produtoRepository,
  lojaRepository,
} from "../repositories";

export type FiltrosRecomendacao = {
  produtoId?: string;
  categoria?: string;
  tecnica?: string;
  regiao?: string;
  limite?: number | string;
};

export type FonteRecomendacao = "ia" | "baseline";

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
  quantidadeDe(produto) > 0 ? "DISPONIVEL" : "VENDIDO";

const situacaoDe = (quantidade: number, pausado = false) =>
  pausado
    ? "INATIVO"
    : quantidade === 0
      ? "ESGOTADO"
      : quantidade < 5
        ? "ESTOQUE_BAIXO"
        : "ATIVO";

const LIMITE_RECOMENDACAO_PADRAO = 4;
const LIMITE_RECOMENDACAO_MAXIMO = 20;

const PESOS_RECOMENDACAO = {
  category: 0.5,
  technique: 0.3,
  region: 0.2,
} as const;

type AtributoRecomendacao = keyof typeof PESOS_RECOMENDACAO;

type ContextoRecomendacao = Partial<Record<AtributoRecomendacao, string>>;

const normalizarTexto = (valor?: unknown): string | undefined => {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : undefined;
};

const normalizarLimiteRecomendacao = (valor?: number | string): number => {
  if (valor === undefined || valor === "") return LIMITE_RECOMENDACAO_PADRAO;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return LIMITE_RECOMENDACAO_PADRAO;
  return Math.min(
    Math.max(Math.trunc(numero), 1),
    LIMITE_RECOMENDACAO_MAXIMO
  );
};

const atributosIguais = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  return a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
};

const paraItemCatalogoIA = (produto: any): ItemCatalogoIA => ({
  product_id: String(produto.id),
  name: produto.nome,
  category: produto.categoria?.nome ?? null,
  technique: produto.tecnica ?? null,
  region: produto.origem ?? null,
  available: quantidadeDe(produto) > 0 && !produto.pausado && !produto.excluido,
});

const paraProdutoRecomendado = (
  produto: any,
  extras?: { motivo?: string; score?: number }
) => ({
  id: String(produto.id),
  nome: produto.nome,
  preco: Number(produto.preco),
  imagemPrincipal: produto.imagens?.[0]?.url ?? PLACEHOLDER,
  tecnica: produto.tecnica,
  artesao: {
    id: String(produto.loja?.usuario?.id ?? "1000"),
    nome: produto.loja?.usuario?.nome ?? "Artesão",
  },
  seloAtivo: produto.seloAtivo ?? seloAtivoDe(produto.id),
  regiao: {
    id: produto.origem ?? "PE",
    nome: produto.origem ?? "Pernambuco",
  },
  modalidadeProducao: produto.modalidadeProducao ?? "PRONTA_ENTREGA",
  disponibilidade: disponibilidadeDe(produto),
  ...(extras?.motivo ? { motivo: extras.motivo } : {}),
  ...(extras?.score !== undefined ? { score: extras.score } : {}),
});

const atributoDoProduto = (
  produto: any,
  atributo: AtributoRecomendacao
): string | null => {
  if (atributo === "category") return produto.categoria?.nome ?? null;
  if (atributo === "technique") return produto.tecnica ?? null;
  return produto.origem ?? null;
};

const calcularScoreBaseline = (
  contexto: ContextoRecomendacao,
  candidato: any
): number => {
  let score = 0;
  let pesoTotal = 0;

  for (const [atributo, peso] of Object.entries(PESOS_RECOMENDACAO) as [
    AtributoRecomendacao,
    number,
  ][]) {
    const valorContexto = contexto[atributo];
    if (!valorContexto) continue;
    pesoTotal += peso;
    if (atributosIguais(valorContexto, atributoDoProduto(candidato, atributo))) {
      score += peso;
    }
  }

  return pesoTotal === 0 ? 0 : Number((score / pesoTotal).toFixed(4));
};

const recomendarBaseline = (
  catalogoDisponivel: any[],
  contexto: ContextoRecomendacao,
  referenciaId: string | undefined,
  limite: number
) => {
  const candidatos = catalogoDisponivel.filter(
    (p) => String(p.id) !== referenciaId
  );

  const estagios: AtributoRecomendacao[][] = contexto.category
    ? [
        ["category", "technique", "region"],
        ["category", "technique"],
        ["category", "region"],
        ["category"],
      ]
    : [["technique", "region"], ["technique"], ["region"]];

  const selecionados: any[] = [];
  const idsSelecionados = new Set<string>();

  for (const estagio of estagios) {
    const compativeis = candidatos
      .filter((candidato) => {
        const idTexto = String(candidato.id);
        if (idsSelecionados.has(idTexto)) return false;
        return estagio.every((atributo) =>
          atributosIguais(
            contexto[atributo],
            atributoDoProduto(candidato, atributo)
          )
        );
      })
      .map((candidato) => ({
        candidato,
        score: calcularScoreBaseline(contexto, candidato),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.candidato.id).localeCompare(String(b.candidato.id));
      });

    for (const { candidato } of compativeis) {
      const idTexto = String(candidato.id);
      if (idsSelecionados.has(idTexto)) continue;
      idsSelecionados.add(idTexto);
      selecionados.push(paraProdutoRecomendado(candidato));
      if (selecionados.length >= limite) return selecionados;
    }
  }

  return selecionados;
};

const dadosDoArtesao = (loja: any) => ({
  id: loja.usuario.id,
  nome: loja.usuario.nome,
});

const pesoDe = (peso: any) => (peso === null || peso === undefined ? null : Number(peso));

const paraProdutoPublico = (produto: any) => ({
  id: produto.id,
  nome: produto.nome,
  preco: Number(produto.preco),
  sku: produto.sku,
  statusValidacao: produto.statusValidacao,
  modalidadeProducao: produto.modalidadeProducao,
  seloAtivo: produto.seloAtivo ?? seloAtivoDe(produto.id),
  disponibilidade: disponibilidadeDe(produto),
  descricao: produto.descricao ?? "",
  imagens: produto.imagens.map((i: any) => i.url),
  categoria: { id: produto.categoria.id, nome: produto.categoria.nome },
  tecnica: produto.tecnica,
  estoque: quantidadeDe(produto),
  totalAvaliacoes: 0,
  material: produto.material,
  dimensoes: produto.dimensoes,
  peso: pesoDe(produto.peso),
  certificado: produto.certificado,
  informacoesOrigem: produto.informacoesOrigem,
  prazoProducaoDias: produto.prazoProducaoDias,
  capacidadeProducao: produto.capacidadeProducao,
  regiao: { id: produto.origem, nome: produto.origem },
  artesao: {
    ...dadosDoArtesao(produto.loja),
    loja: produto.loja.nome,
  },
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
      tecnica: filtros.tecnica,
      regiao: filtros.regiao,
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
        sku: produto.sku,
        imagemPrincipal: produto.imagens[0]?.url ?? PLACEHOLDER,
        artesao: dadosDoArtesao(produto.loja),
        seloAtivo: produto.seloAtivo ?? seloAtivoDe(produto.id),
        regiao: { id: produto.origem, nome: produto.origem },
        modalidadeProducao: produto.modalidadeProducao,
        disponibilidade: disponibilidadeDe(produto),
        material: produto.material,
        dimensoes: produto.dimensoes,
        peso: pesoDe(produto.peso),
        certificado: produto.certificado,
        informacoesOrigem: produto.informacoesOrigem,
        prazoProducaoDias: produto.prazoProducaoDias,
        capacidadeProducao: produto.capacidadeProducao,
      })),
    };
  },

  async buscarPorId(id: string) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
    return paraProdutoPublico(produto);
  },

  async buscarPublico(id: string) {
    const produto = await produtoRepository.buscarPublicoPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");
    return paraProdutoPublico(produto);
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

  async recomendados(entrada: string | FiltrosRecomendacao = {}) {
    const filtros: FiltrosRecomendacao =
      typeof entrada === "string" ? { produtoId: entrada } : entrada;

    const produtoId = normalizarTexto(filtros.produtoId);
    const categoria = normalizarTexto(filtros.categoria);
    const tecnica = normalizarTexto(filtros.tecnica);
    const regiao = normalizarTexto(filtros.regiao);
    const limite = normalizarLimiteRecomendacao(filtros.limite);

    const catalogoBruto = await produtoRepository.catalogoParaRecomendacao();
    const catalogoAprovado = catalogoBruto.filter(
      (p: any) => (p.statusValidacao ?? statusValidacaoDe(p.id)) === "APROVADA"
    );
    const porId = new Map<string, any>(
      catalogoAprovado.map((p: any) => [String(p.id), p])
    );
    const catalogoDisponivel = catalogoAprovado.filter(
      (p: any) => quantidadeDe(p) > 0
    );

    let produtoReferencia: any = null;
    if (produtoId) {
      produtoReferencia = porId.get(produtoId) ?? null;
      if (!produtoReferencia) {
        try {
          produtoReferencia = await produtoRepository.buscarPorId(produtoId);
        } catch {
          // ID inválido: sem produto de referência, retorna lista vazia sem quebrar.
        }
      }
      if (!produtoReferencia) {
        return {
          recomendados: [],
          produtosRecomendados: [],
          fonte: "baseline" as FonteRecomendacao,
        };
      }
    }

    // Sem produto de referência e sem filtros: retorna peças disponíveis em destaque do catálogo.
    if (!produtoId && !categoria && !tecnica && !regiao) {
      const destaques = catalogoDisponivel
        .slice(0, limite)
        .map((p: any) => paraProdutoRecomendado(p));
      return {
        recomendados: destaques,
        produtosRecomendados: destaques,
        fonte: "baseline" as FonteRecomendacao,
      };
    }

    const contexto: ContextoRecomendacao = {
      category: categoria ?? produtoReferencia?.categoria?.nome ?? undefined,
      technique: tecnica ?? produtoReferencia?.tecnica ?? undefined,
      region: regiao ?? produtoReferencia?.origem ?? undefined,
    };

    if (moduloIaConfigurado()) {
      const itensCatalogoIA: ItemCatalogoIA[] = catalogoAprovado.map(
        paraItemCatalogoIA
      );
      if (produtoReferencia && !porId.has(String(produtoReferencia.id))) {
        itensCatalogoIA.push({
          ...paraItemCatalogoIA(produtoReferencia),
          available: false,
        });
      }

      const sugestoesIA = await solicitarRecomendacoesIA({
        ...(produtoReferencia ? { product_id: String(produtoReferencia.id) } : {}),
        ...(categoria ? { category: categoria } : {}),
        ...(tecnica ? { technique: tecnica } : {}),
        ...(regiao ? { region: regiao } : {}),
        limit: limite,
        catalog: itensCatalogoIA,
      });

      if (sugestoesIA !== null) {
        const vistos = new Set<string>();
        const recomendados = sugestoesIA
          .map((item) => {
            if (vistos.has(item.product_id)) return null;
            if (produtoReferencia && item.product_id === String(produtoReferencia.id)) {
              return null;
            }
            const produto = porId.get(item.product_id);
            if (!produto || quantidadeDe(produto) <= 0) return null;
            vistos.add(item.product_id);
            return paraProdutoRecomendado(produto, {
              motivo: item.reason,
              score: item.score,
            });
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .slice(0, limite);

        return {
          recomendados,
          produtosRecomendados: recomendados,
          fonte: "ia" as FonteRecomendacao,
        };
      }
    }

    const recomendados = recomendarBaseline(
      catalogoDisponivel,
      contexto,
      produtoReferencia ? String(produtoReferencia.id) : undefined,
      limite
    );

    return {
      recomendados,
      produtosRecomendados: recomendados,
      fonte: "baseline" as FonteRecomendacao,
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
      sku: dados.sku?.trim() || null,
      material: dados.material ?? null,
      dimensoes: dados.dimensoes ?? null,
      peso: dados.peso ?? null,
      certificado: dados.certificado ?? null,
      informacoesOrigem: dados.informacoesOrigem ?? null,
      prazoProducaoDias: dados.prazoProducaoDias ?? null,
      capacidadeProducao: dados.capacidadeProducao ?? null,
    });

    // Novo produto aguarda curadoria (statusValidacao persistido no banco e espelhado em memoria).
    validacoes.set(produto.id, {
      status: "PENDENTE",
      seloAtivo: false,
      justificativa: null,
      decididoEm: null,
    });

    return {
      id: produto.id,
      sku: produto.sku,
      statusValidacao: produto.statusValidacao ?? statusValidacaoDe(produto.id),
      criadoEm: new Date().toISOString(),
    };
  },

  async atualizar(id: string, dados: any, usuarioId: string) {
    const produto = await buscarProdutoDoArtesao(
      id,
      usuarioId,
      "Voce so pode atualizar suas proprias pecas."
    );

    // Campos persistidos em create/update (Contrato de API: sku, material,
    // dimensoes, peso, certificado, informacoesOrigem, prazoProducaoDias,
    // capacidadeProducao).
    const permitido: Record<string, unknown> = {};
    for (const campo of [
      "nome",
      "descricao",
      "tecnica",
      "preco",
      "origem",
      "modalidadeProducao",
      "sku",
      "material",
      "dimensoes",
      "peso",
      "certificado",
      "informacoesOrigem",
      "prazoProducaoDias",
      "capacidadeProducao",
    ]) {
      if (dados?.[campo] !== undefined) permitido[campo] = dados[campo];
    }
    if (permitido.modalidadeProducao !== undefined) {
      permitido.pecaUnica = permitido.modalidadeProducao === "PECA_UNICA";
    }

    const pecaUnica = (permitido.pecaUnica as boolean | undefined) ?? produto.pecaUnica;
    validarPecaUnica(pecaUnica, dados?.estoque ?? quantidadeDe(produto));

    const estoqueParaAtualizar =
      dados?.estoque !== undefined ? Number(dados.estoque) : undefined;
    const atualizado = await produtoRepository.atualizar(
      id,
      permitido,
      estoqueParaAtualizar
    );

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
      sku: p.sku,
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
      (p: any) => !filtros.status || (p.statusValidacao ?? statusValidacaoDe(p.id)) === filtros.status
    );

    return {
      total: produtos.length,
      itens: produtos.map((p: any) => {
        const decisao = validacoes.get(p.id);
        return {
          id: p.id,
          nome: p.nome,
          sku: p.sku,
          imagemPrincipal: p.imagens[0]?.url ?? PLACEHOLDER,
          artesao: dadosDoArtesao(p.loja),
          tecnica: p.tecnica,
          regiao: p.origem,
          enviadoEm: p.enviadoEm ?? null,
          informacoesOrigem: p.informacoesOrigem,
          certificado: p.certificado,
          material: p.material,
          dimensoes: p.dimensoes,
          peso: pesoDe(p.peso),
          prazoProducaoDias: p.prazoProducaoDias,
          capacidadeProducao: p.capacidadeProducao,
          statusValidacao: p.statusValidacao ?? statusValidacaoDe(p.id),
          justificativa: p.justificativaValidacao ?? decisao?.justificativa ?? null,
          decididoPorId: p.decididoPorId ?? null,
          decididoEm: p.decididoEm ?? decisao?.decididoEm ?? null,
        };
      }),
    };
  },

  async validar(
    id: string,
    dados: { status: "APROVADA" | "REPROVADA"; justificativa: string },
    usuarioId?: string
  ) {
    const produto = await produtoRepository.buscarPorId(id);
    if (!produto) throw new ErroApp(404, "Produto nao encontrado.");

    const decisao = {
      status: dados.status,
      seloAtivo: dados.status === "APROVADA",
      justificativa: dados.justificativa ?? null,
      decididoEm: new Date(),
    };

    await produtoRepository.atualizarValidacao(toId(id), {
      statusValidacao: dados.status,
      seloAtivo: dados.status === "APROVADA",
      justificativa: dados.justificativa ?? null,
      decididoEm: decisao.decididoEm,
      decididoPorId: usuarioId ? toId(usuarioId) : undefined,
    });
    validacoes.set(toId(id), decisao);

    return {
      id: produto.id,
      statusValidacao: decisao.status,
      seloAtivo: decisao.seloAtivo,
    };
  },
};
