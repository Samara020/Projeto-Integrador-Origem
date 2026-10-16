// Peças vistas recentemente, no navegador. Alimenta as recomendações personalizadas (HU-17).
// Avaliação 2: o backend registra a visita em GET /produtos/{id} e expõe o histórico do comprador.
import { gravarLocal, lerLocal } from "@/lib/armazenamento";

const CHAVE = "vistos";
const MAXIMO = 8;

export type PecaVista = {
  id: string;
  nome: string;
  artesaoId: string;
  artesaoNome: string;
  regiaoId: string;
  regiaoNome: string;
  tecnicaId: string;
  tecnicaNome: string;
};

export const historicoService = {
  registrar(peca: PecaVista): void {
    const lista = (lerLocal<PecaVista[]>(CHAVE) ?? []).filter((v) => v.id !== peca.id);
    gravarLocal(CHAVE, [peca, ...lista].slice(0, MAXIMO));
  },

  listar(): PecaVista[] {
    return lerLocal<PecaVista[]>(CHAVE) ?? [];
  },
};
