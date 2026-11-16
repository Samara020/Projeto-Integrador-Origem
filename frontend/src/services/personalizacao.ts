import { ApiError, http } from "@/lib/http";
import type { NovaPersonalizacao, Personalizacao, ProdutoDetalhe } from "@/types";


// Regras da estimativa. O artesão confirma prazo e valor antes de começar.
export const PRAZO_TAMANHO_DIAS = 5;
export const PRAZO_INSCRICAO_DIAS = 3;
export const ACRESCIMO_TAMANHO = 0.15;
export const ACRESCIMO_INSCRICAO = 20;
export const ACRESCIMO_DETALHES = 0.1;

export function estimar(produto: ProdutoDetalhe, dados: Omit<NovaPersonalizacao, "produtoId">) {
  const temTamanho = dados.tamanho.trim().length > 0;
  const temInscricao = dados.inscricao.trim().length > 0;
  const temDetalhes = dados.detalhes.trim().length > 0;
  const prazoAdicionalDias = (temTamanho ? PRAZO_TAMANHO_DIAS : 0) + (temInscricao ? PRAZO_INSCRICAO_DIAS : 0);
  const precoAdicional =
    Math.round(
      (produto.preco * ((temTamanho ? ACRESCIMO_TAMANHO : 0) + (temDetalhes ? ACRESCIMO_DETALHES : 0)) +
        (temInscricao ? ACRESCIMO_INSCRICAO : 0)) * 100,
    ) / 100;
  return { prazoAdicionalDias, precoAdicional };
}

export const personalizacaoService = {
  async enviar(produto: ProdutoDetalhe, dados: Omit<NovaPersonalizacao, "produtoId">): Promise<Personalizacao> {
    const mudouAlgo = [dados.cor, dados.tamanho, dados.inscricao, dados.detalhes].some((v) => v.trim());
    if (!mudouAlgo && dados.mensagem.trim().length < 10) {
      throw new ApiError(400, "Preencha ao menos uma opção ou escreva sua ideia para o artesão.");
    }
    return http<Personalizacao>(`/produtos/${encodeURIComponent(produto.id)}/personalizacoes`, { metodo: "POST", corpo: dados });
  },
  minhas: () => http<Personalizacao[]>("/comprador/personalizacoes"),
};
