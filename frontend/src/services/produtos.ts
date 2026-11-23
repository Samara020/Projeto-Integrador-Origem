import { http } from "@/lib/http";
import type {
  Categoria,
  FiltrosProdutos,
  FiltrosRecomendacao,
  Paginado,
  ProdutoDetalhe,
  ProdutoResumo,
  ProdutoSugerido,
  RespostaAvaliacoes,
  RespostaRecomendacoes,
} from "@/types";

type ProdutoApiResposta = Omit<ProdutoDetalhe, "categoria" | "imagens" | "imagemPrincipal"> & {
  categoria?: string | Categoria;
  imagens?: (string | { url?: string })[];
  imagemPrincipal?: string;
  origem?: string;
};

type RespostaBrutaRecomendacoes =
  | RespostaRecomendacoes
  | { produtosRecomendados?: unknown[] }
  | unknown[];

function extrairListaRecomendados(res: RespostaBrutaRecomendacoes): unknown[] {
  if (Array.isArray(res)) return res;
  if (!res || typeof res !== "object") return [];
  if ("recomendados" in res && Array.isArray(res.recomendados)) {
    return res.recomendados;
  }
  if (
    "produtosRecomendados" in res &&
    Array.isArray(res.produtosRecomendados)
  ) {
    return res.produtosRecomendados;
  }
  return [];
}

function normalizarProdutoSugerido(item: unknown): ProdutoSugerido | null {
  if (!item || typeof item !== "object") return null;
  const p = item as Record<string, unknown>;
  const id = String(p.id ?? "").trim();
  const nome = String(p.nome ?? "").trim();
  if (!id || !nome) return null;

  const disponibilidade = ((p.disponibilidade as string) ?? "DISPONIVEL") as
    | "DISPONIVEL"
    | "RESERVADO"
    | "VENDIDO";
  if (disponibilidade !== "DISPONIVEL") return null;

  const primeiraImagem =
    Array.isArray(p.imagens) && p.imagens.length > 0
      ? String((p.imagens[0] as { url?: string })?.url ?? "")
      : undefined;

  const artesaoBruto =
    p.artesao && typeof p.artesao === "object"
      ? (p.artesao as { id?: string | number; nome?: string })
      : null;

  const regiao =
    typeof p.regiao === "string"
      ? { id: p.regiao, nome: p.regiao }
      : ((p.regiao as { id: string; nome: string } | undefined) ?? {
          id: "PE",
          nome: "Pernambuco",
        });

  return {
    id,
    nome,
    preco: Number(p.preco ?? 0),
    imagemPrincipal: String(
      p.imagemPrincipal ?? primeiraImagem ?? "/produtos/vaso-ceramica.jpg",
    ),
    artesao: {
      id: String(artesaoBruto?.id ?? "1000"),
      nome: String(artesaoBruto?.nome ?? "Artesão"),
    },
    seloAtivo: Boolean(p.seloAtivo),
    regiao,
    disponibilidade,
    modalidadeProducao:
      (p.modalidadeProducao as
        | "PRONTA_ENTREGA"
        | "SOB_ENCOMENDA"
        | "PECA_UNICA") ?? "PRONTA_ENTREGA",
    motivo:
      typeof p.motivo === "string" && p.motivo.trim() ? p.motivo : undefined,
    score: typeof p.score === "number" ? p.score : undefined,
    avaliacaoMedia: Number(p.avaliacaoMedia ?? 0),
  };
}

export const produtosService = {
  listar(filtros: FiltrosProdutos, sinal?: AbortSignal) {
    return http<Paginado<ProdutoResumo>>("/produtos", {
      parametros: filtros,
      sinal,
    });
  },

  listarDestaques(sinal?: AbortSignal) {
    return http<Paginado<ProdutoResumo>>("/produtos", {
      parametros: { destaque: true },
      sinal,
    });
  },

  async buscar(id: string, sinal?: AbortSignal): Promise<ProdutoDetalhe> {
    const p = await http<ProdutoApiResposta>(
      `/produtos/${encodeURIComponent(id)}`,
      {
        sinal,
      },
    );
    const imagens = (p.imagens ?? [])
      .map((imagem) =>
        typeof imagem === "string" ? imagem : String(imagem.url ?? ""),
      )
      .filter(Boolean);
    const pesoNormalizado =
      typeof p.peso === "number"
        ? p.peso
        : typeof p.peso === "string"
          ? Number(p.peso.replace(",", ".")) || undefined
          : undefined;

    return {
      ...p,
      peso: pesoNormalizado,
      material: p.material ?? "",
      dimensoes: p.dimensoes ?? "",
      sku: p.sku,
      certificado: p.certificado,
      informacoesOrigem: p.informacoesOrigem,
      statusValidacao: p.statusValidacao,
      imagens,
      imagemPrincipal: p.imagemPrincipal ?? imagens[0] ?? "",
      categoria:
        typeof p.categoria === "string"
          ? { id: p.categoria, nome: p.categoria }
          : (p.categoria ?? { id: "", nome: "" }),
      tecnica:
        typeof p.tecnica === "string"
          ? { id: p.tecnica, nome: p.tecnica }
          : p.tecnica,
      regiao:
        typeof p.regiao === "string"
          ? { id: p.regiao, nome: p.regiao }
          : (p.regiao ?? {
              id: p.origem ?? "PE",
              nome: p.origem ?? "Pernambuco",
            }),
      disponibilidade:
        p.disponibilidade ?? ((p.estoque ?? 0) > 0 ? "DISPONIVEL" : "VENDIDO"),
      artesao: {
        id: p.artesao?.id ?? "1000",
        nome: p.artesao?.nome ?? "Artesão",
        cidade:
          p.artesao?.cidade ??
          (typeof p.regiao === "object" && p.regiao ? p.regiao.nome : "Pernambuco"),
        loja: p.artesao?.loja ?? p.artesao?.nome ?? "Ateliê",
      },
    };
  },

  async recomendados(
    entrada: string | FiltrosRecomendacao,
    sinal?: AbortSignal,
  ): Promise<RespostaRecomendacoes> {
    const filtros: FiltrosRecomendacao =
      typeof entrada === "string" ? { produtoId: entrada } : entrada;

    const res = await http<RespostaBrutaRecomendacoes>(
      "/produtos/recomendacoes",
      {
        parametros: {
          produtoId: filtros.produtoId,
          categoria: filtros.categoria,
          tecnica: filtros.tecnica,
          regiao: filtros.regiao,
          limite: filtros.limite,
        },
        sinal,
      },
    );

    const recomendados = extrairListaRecomendados(res)
      .map(normalizarProdutoSugerido)
      .filter((item): item is ProdutoSugerido => item !== null);

    return { recomendados };
  },

  avaliacoes(id: string, sinal?: AbortSignal) {
    return http<RespostaAvaliacoes>(
      `/produtos/${encodeURIComponent(id)}/avaliacoes`,
      { sinal },
    );
  },
};
