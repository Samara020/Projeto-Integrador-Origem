import { http } from "@/lib/http";
import type { Categoria, IndicadoresVitrine, Regiao, Tecnica } from "@/types";

const TECNICAS_PADRAO: Tecnica[] = [
  { id: "ceramica", nome: "Cerâmica" },
  { id: "entalhe-em-madeira", nome: "Entalhe em madeira" },
  { id: "xilogravura", nome: "Xilogravura" },
  { id: "bordado", nome: "Bordado" },
  { id: "renda-renascenca", nome: "Renda renascença" },
  { id: "cordel", nome: "Cordel" },
];

const REGIOES_PADRAO: Regiao[] = [
  { id: "metropolitana", nome: "Região Metropolitana" },
  { id: "zona-da-mata", nome: "Zona da Mata" },
  { id: "agreste", nome: "Agreste" },
  { id: "sertao-do-pajeu", nome: "Sertão do Pajeú" },
  { id: "sertao-do-sao-francisco", nome: "Sertão do São Francisco" },
];

const INDICADORES_PADRAO: IndicadoresVitrine = {
  totalArtesaos: 6,
  totalProdutos: 14,
  avaliacaoMedia: 4.9,
  totalAvaliacoes: 42,
};

export const catalogoService = {
  categorias(sinal?: AbortSignal) {
    return http<Categoria[]>("/categorias", { sinal });
  },

  tecnicas(sinal?: AbortSignal) {
    return http<Tecnica[]>("/tecnicas", { sinal }).catch(() => TECNICAS_PADRAO);
  },

  regioes(sinal?: AbortSignal) {
    return http<Regiao[]>("/regioes", { sinal }).catch(() => REGIOES_PADRAO);
  },

  indicadores(sinal?: AbortSignal) {
    return http<IndicadoresVitrine>("/indicadores", { sinal }).catch(() => INDICADORES_PADRAO);
  },
};
