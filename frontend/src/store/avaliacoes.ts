import { criarStore } from "@/store/criar-store";
import type { MinhaAvaliacao } from "@/types";

// null = ainda não lida do navegador.
export const avaliacoesStore = criarStore<MinhaAvaliacao[] | null>(null);
