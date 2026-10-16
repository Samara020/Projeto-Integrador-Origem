// Solicitação de personalização (HU-24), guardada no navegador. O artesão responde depois.
// Avaliação 2: enviar() vira POST /produtos/{id}/personalizacoes.
import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError } from "@/lib/http";
import type { NovaPersonalizacao, Personalizacao, ProdutoDetalhe } from "@/types";

const CHAVE = "personalizacoes";
const ATRASO_MS = 600;

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

function esperar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ATRASO_MS));
}

export const personalizacaoService = {
  async enviar(produto: ProdutoDetalhe, dados: Omit<NovaPersonalizacao, "produtoId">): Promise<Personalizacao> {
    await esperar();
    const mudouAlgo = [dados.cor, dados.tamanho, dados.inscricao, dados.detalhes].some((v) => v.trim());
    if (!mudouAlgo && dados.mensagem.trim().length < 10) {
      throw new ApiError(400, "Preencha ao menos uma opção ou escreva sua ideia para o artesão.");
    }
    const solicitacao: Personalizacao = {
      ...dados,
      produtoId: produto.id,
      id: `per_${Date.now().toString().slice(-6)}`,
      status: "ENVIADA",
      criadoEm: new Date().toISOString(),
      nomeProduto: produto.nome,
      imagemPrincipal: produto.imagemPrincipal,
      artesaoNome: produto.artesao.nome,
      ...estimar(produto, dados),
    };
    gravarLocal(CHAVE, [solicitacao, ...(lerLocal<Personalizacao[]>(CHAVE) ?? [])]);
    return solicitacao;
  },

  async minhas(): Promise<Personalizacao[]> {
    return lerLocal<Personalizacao[]>(CHAVE) ?? [];
  },
};
