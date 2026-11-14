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
    return {
      id: String(p.id),
      nome: p.nome,
      nomeLoja: p.nomeLoja ?? p.nome,
      biografia: p.biografia ?? "",
      regiao: p.regiao ?? "Pernambuco",
      produtos: (p.produtos ?? []).map((prod) => ({
        id: String(prod.id),
        nome: prod.nome,
        preco: Number(prod.preco),
        imagemPrincipal: prod.imagemPrincipal ?? prod.imagens?.[0]?.url ?? "",
        artesao: { id: String(p.id), nome: p.nome },
        seloAtivo: Boolean(prod.seloAtivo),
        regiao: { id: p.regiao ?? "PE", nome: p.regiao ?? "Pernambuco" },
        modalidadeProducao: prod.modalidadeProducao ?? "PRONTA_ENTREGA",
        disponibilidade: prod.disponibilidade ?? "DISPONIVEL",
        avaliacaoMedia: 0,
      })),
      foto: p.foto ?? null,
      tecnica: p.tecnica ?? "Artesanato tradicional",
      especialidade: p.especialidade ?? "Trabalho manual",
      verificado: p.verificado ?? true,
      historia: p.historia ?? (p.biografia ? [p.biografia] : []),
      citacao: p.citacao ?? "",
      imagens: p.imagens ?? [],
      avaliacaoMedia: p.avaliacaoMedia ?? 4.9,
      totalAvaliacoes:
        p.totalAvaliacoes ?? (p.produtos?.length ? p.produtos.length * 3 : 0),
      pecasVendidas: p.pecasVendidas ?? 12,
    };
  },
};
