import { http } from "@/lib/http";
import type { AvaliacaoCriada, MinhaAvaliacao, NovaAvaliacao } from "@/types";

export const avaliacoesService = {
  // POST /avaliacoes
  criar(dados: NovaAvaliacao): Promise<AvaliacaoCriada> {
    return http<AvaliacaoCriada>("/avaliacoes", {
      metodo: "POST",
      corpo: {
        pedidoId: dados.pedidoId,
        produtoId: dados.produtoId,
        nota: dados.nota,
        comentario: dados.comentario,
      },
    });
  },

  // GET /comprador/avaliacoes (http.ts normaliza para /avaliacoes/comprador/avaliacoes no backend)
  minhas(sinal?: AbortSignal): Promise<MinhaAvaliacao[]> {
    return http<MinhaAvaliacao[]>("/comprador/avaliacoes", { sinal });
  },
};
