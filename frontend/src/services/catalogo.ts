import { http } from "@/lib/http";
import type { Categoria, IndicadoresVitrine, Regiao, Tecnica } from "@/types";

export const catalogoService = {
  categorias: (sinal?: AbortSignal) => http<Categoria[]>("/categorias", { sinal }),
  tecnicas: (sinal?: AbortSignal) => http<Tecnica[]>("/tecnicas", { sinal }),
  regioes: (sinal?: AbortSignal) => http<Regiao[]>("/regioes", { sinal }),
  indicadores: (sinal?: AbortSignal) => http<IndicadoresVitrine>("/indicadores", { sinal }),
};
