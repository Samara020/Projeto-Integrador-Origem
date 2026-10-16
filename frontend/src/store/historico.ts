import type { PecaVista } from "@/services/historico";
import { criarStore } from "@/store/criar-store";

export const historicoStore = criarStore<PecaVista[]>([]);
