import { criarStore } from "@/store/criar-store";
import type { Ticket } from "@/types";

// null = ainda não lido do navegador.
export const ticketsStore = criarStore<Ticket[] | null>(null);
