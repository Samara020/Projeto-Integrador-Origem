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
    return {
      ...p,
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

    const res = await http<
      | RespostaRecomendacoes
      | { produtosRecomendados?: unknown[] }
      | unknown[]
    >("/produtos/recomendacoes", {
      parametros: {
        produtoId: filtros.produtoId,
        categoria: filtros.categoria,
        tecnica: filtros.tecnica,
        regiao: filtros.regiao,
        limite: filtros.limite,
      },
      sinal,
    });

    const listaBruta: unknown[] = Array.isArray(res)
      ? res
      : res && typeof res === "object"
        ? "recomendados" in res && Array.isArray((res as RespostaRecomendacoes).recomendados)
          ? (res as RespostaRecomendacoes).recomendados
          : "produtosRecomendados" in res &&
              Array.isArray((res as { produtosRecomendados?: unknown[] }).produtosRecomendados)
            ? ((res as { produtosRecomendados?: unknown[] }).produtosRecomendados ?? [])
            : []
        : [];

    const recomendados = listaBruta
      .map((item): ProdutoSugerido | null => {
        if (!item || typeof item !== "object") return null;
        const p = item as Record<string, unknown>;
        const id = String(p.id ?? "").trim();
        const nome = String(p.nome ?? "").trim();
        if (!id || !nome) return null;

        const disponibilidade =
          ((p.disponibilidade as string) ?? "DISPONIVEL") as
            | "DISPONIVEL"
            | "RESERVADO"
            | "VENDIDO";
        if (disponibilidade !== "DISPONIVEL") return null;

        return {
          id,
          nome,
          preco: Number(p.preco ?? 0),
          imagemPrincipal: String(
            p.imagemPrincipal ??
              (Array.isArray(p.imagens) && p.imagens.length > 0
                ? String((p.imagens[0] as { url?: string })?.url ?? "")
                : undefined) ??
              "/produtos/vaso-ceramica.jpg",
          ),
          artesao:
            p.artesao && typeof p.artesao === "object"
              ? {
                  id: String((p.artesao as { id?: string | number }).id ?? "1000"),
                  nome: String((p.artesao as { nome?: string }).nome ?? "Artesão"),
                }
              : { id: "1000", nome: "Artesão" },
          seloAtivo: Boolean(p.seloAtivo),
          regiao:
            typeof p.regiao === "string"
              ? { id: p.regiao, nome: p.regiao }
              : (p.regiao as { id: string; nome: string } | undefined) ?? {
                  id: "PE",
                  nome: "Pernambuco",
                },
          disponibilidade,
          modalidadeProducao:
            (p.modalidadeProducao as
              | "PRONTA_ENTREGA"
              | "SOB_ENCOMENDA"
              | "PECA_UNICA") ?? "PRONTA_ENTREGA",
          motivo: typeof p.motivo === "string" && p.motivo.trim() ? p.motivo : undefined,
          score: typeof p.score === "number" ? p.score : undefined,
          avaliacaoMedia: Number(p.avaliacaoMedia ?? 0),
        };
      })
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
