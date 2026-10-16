"use client";

import { useConsulta } from "@/hooks/useConsulta";
import { artesaosService } from "@/services/artesaos";

export function useArtesao(id: string) {
  return useConsulta(`artesao:${id}`, (sinal) =>
    artesaosService.perfil(id, sinal),
  );
}
