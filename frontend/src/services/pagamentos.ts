import { http } from "@/lib/http";
import type { DadosPagamento, PagamentoProcessado } from "@/types";

export const pagamentosService = {
  processar(dados: DadosPagamento) {
    return http<PagamentoProcessado>("/pagamentos", { metodo: "POST", corpo: dados });
  },
};
