import { seloAtivoDe, statusValidacaoDe } from "../lib/memoria";
import {
  type ItemCatalogoIA,
  moduloIaConfigurado,
  solicitarRecomendacoesIA,
} from "../lib/modulo-ia";
import { produtoRepository } from "../repositories";

export type FiltrosRecomendacao = {
  produtoId?: string;
  categoria?: string;
  tecnica?: string;
  regiao?: string;
  limite?: number | string;
};

export type FonteRecomendacao = "ia" | "baseline";

const PLACEHOLDER = "https://storage.sistemaorigem.com/placeholder.jpg";
const LIMITE_PADRAO = 4;
const LIMITE_MAXIMO = 20;

const PESOS = {
  category: 0.5,
  technique: 0.3,
  region: 0.2,
} as const;

type AtributoRecomendacao = keyof typeof PESOS;
type ContextoRecomendacao = Partial<Record<AtributoRecomendacao, string>>;

const quantidadeDe = (produto: any): number =>
  produto.estoque?.quantidadeDisponivel ?? 0;

const disponibilidadeDe = (produto: any) =>
  quantidadeDe(produto) > 0 ? "DISPONIVEL" : "VENDIDO";

const normalizarTexto = (valor?: unknown): string | undefined => {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim();
  return limpo.length > 0 ? limpo : undefined;
};

const normalizarLimite = (valor?: number | string): number => {
  if (valor === undefined || valor === "") return LIMITE_PADRAO;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return LIMITE_PADRAO;
  return Math.min(Math.max(Math.trunc(numero), 1), LIMITE_MAXIMO);
};

const atributosIguais = (a?: string | null, b?: string | null): boolean => {
  if (!a || !b) return false;
  return (
    a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR")
  );
};

const atributoDoProduto = (
  produto: any,
  atributo: AtributoRecomendacao
): string | null => {
  if (atributo === "category") return produto.categoria?.nome ?? null;
  if (atributo === "technique") return produto.tecnica ?? null;
  return produto.origem ?? null;
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

const calcularScoreBaseline = (
  contexto: ContextoRecomendacao,
  candidato: any
): number => {
  let score = 0;
  let pesoTotal = 0;

  for (const [atributo, peso] of Object.entries(PESOS) as [
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

async function buscarReferencia(
  produtoId: string,
  porId: Map<string, any>
): Promise<any | null> {
  const noCatalogo = porId.get(produtoId);
  if (noCatalogo) return noCatalogo;
  try {
    return await produtoRepository.buscarPorId(produtoId);
  } catch {
    // ID inválido: sem produto de referência, retorna lista vazia sem quebrar.
    return null;
  }
}

export const recomendacaoService = {
  async recomendar(entrada: string | FiltrosRecomendacao = {}) {
    const filtros: FiltrosRecomendacao =
      typeof entrada === "string" ? { produtoId: entrada } : entrada;

    const produtoId = normalizarTexto(filtros.produtoId);
    const categoria = normalizarTexto(filtros.categoria);
    const tecnica = normalizarTexto(filtros.tecnica);
    const regiao = normalizarTexto(filtros.regiao);
    const limite = normalizarLimite(filtros.limite);

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
      produtoReferencia = await buscarReferencia(produtoId, porId);
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
      const itensCatalogoIA: ItemCatalogoIA[] =
        catalogoAprovado.map(paraItemCatalogoIA);
      if (produtoReferencia && !porId.has(String(produtoReferencia.id))) {
        itensCatalogoIA.push({
          ...paraItemCatalogoIA(produtoReferencia),
          available: false,
        });
      }

      const sugestoesIA = await solicitarRecomendacoesIA({
        ...(produtoReferencia
          ? { product_id: String(produtoReferencia.id) }
          : {}),
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
            if (
              produtoReferencia &&
              item.product_id === String(produtoReferencia.id)
            ) {
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
};
