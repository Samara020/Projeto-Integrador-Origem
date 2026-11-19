import { http } from "@/lib/http";
import type { ArtesaoPerfil } from "@/types";

type ProdutoPerfilApi = {
  id: string | number;
  nome: string;
  preco: number | string;
  imagemPrincipal?: string;
  imagens?: { url: string }[];
  seloAtivo?: boolean;
  modalidadeProducao?: "PECA_UNICA" | "PRONTA_ENTREGA" | "SOB_ENCOMENDA";
  disponibilidade?: "DISPONIVEL" | "RESERVADO" | "VENDIDO";
  estoque?: number;
  avaliacaoMedia?: number;
};

type ArtesaoPerfilApi = {
  id: string | number;
  nome: string;
  nomeLoja?: string;
  biografia?: string;
  regiao?: string;
  produtos?: ProdutoPerfilApi[];
  foto?: string | null;
  tecnica?: string;
  especialidade?: string;
  verificado?: boolean;
  historia?: string[];
  citacao?: string;
  imagens?: string[];
  avaliacaoMedia?: number;
  totalAvaliacoes?: number;
  pecasVendidas?: number;
};

export const artesaosService = {
  async perfil(id: string, sinal?: AbortSignal): Promise<ArtesaoPerfil> {
    const p = await http<ArtesaoPerfilApi>(
      `/artesaos/${encodeURIComponent(id)}/perfil`,
      { sinal },
    );
    const regiao = p.regiao ?? "";
    return {
      id: String(p.id),
      nome: p.nome,
      nomeLoja: p.nomeLoja ?? p.nome,
      biografia: p.biografia ?? "",
      regiao,
      produtos: (p.produtos ?? []).map((prod) => ({
        id: String(prod.id),
        nome: prod.nome,
        preco: Number(prod.preco),
        imagemPrincipal: prod.imagemPrincipal ?? prod.imagens?.[0]?.url ?? "",
        artesao: { id: String(p.id), nome: p.nome },
        seloAtivo: Boolean(prod.seloAtivo),
        regiao: { id: regiao, nome: regiao },
        modalidadeProducao: prod.modalidadeProducao ?? "PRONTA_ENTREGA",
        disponibilidade:
          prod.disponibilidade ??
          (typeof prod.estoque === "number"
            ? prod.estoque > 0
              ? "DISPONIVEL"
              : "VENDIDO"
            : "VENDIDO"),
        avaliacaoMedia: typeof prod.avaliacaoMedia === "number" ? prod.avaliacaoMedia : 0,
      })),
      foto: p.foto ?? null,
      tecnica: p.tecnica ?? "",
      especialidade: p.especialidade ?? "",
      verificado: Boolean(p.verificado),
      historia:
        Array.isArray(p.historia) && p.historia.length > 0
          ? p.historia
          : p.biografia
            ? [p.biografia]
            : [],
      citacao: p.citacao ?? "",
      imagens: Array.isArray(p.imagens) ? p.imagens : [],
      avaliacaoMedia: typeof p.avaliacaoMedia === "number" ? p.avaliacaoMedia : 0,
      totalAvaliacoes: typeof p.totalAvaliacoes === "number" ? p.totalAvaliacoes : 0,
      pecasVendidas: typeof p.pecasVendidas === "number" ? p.pecasVendidas : 0,
    };
  },
};
