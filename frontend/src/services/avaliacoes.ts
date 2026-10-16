// Fake API: a avaliação nova fica no navegador. Quem lê a peça continua vendo as da API.
// Avaliação 2: criar() vira http("/avaliacoes", { metodo: "POST", corpo: dados }) e minhas() vira GET.
import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError } from "@/lib/http";
import type { AvaliacaoCriada, MinhaAvaliacao, NovaAvaliacao } from "@/types";

const CHAVE = "avaliacoes-minhas";
const ATRASO_MS = 500;
const SUSPEITO = /https?:\/\/|whatsapp|zap|\bpix\b|telefone/i;

function esperar(): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ATRASO_MS));
}

function ler(): MinhaAvaliacao[] {
  return lerLocal<MinhaAvaliacao[]>(CHAVE) ?? [];
}

export const avaliacoesService = {
  // POST /avaliacoes
  async criar(
    dados: NovaAvaliacao,
    peca: { nome: string; imagemPrincipal: string },
  ): Promise<AvaliacaoCriada> {
    await esperar();
    if (dados.nota < 1 || dados.nota > 5) throw new ApiError(400, "Escolha de 1 a 5 estrelas.");
    if (dados.comentario.trim().length < 10) {
      throw new ApiError(400, "Conte um pouco mais: pelo menos 10 caracteres.");
    }
    if (ler().some((a) => a.produtoId === dados.produtoId && a.pedidoId === dados.pedidoId)) {
      throw new ApiError(400, "Você já avaliou esta peça neste pedido.");
    }
    // Link ou contato no texto vai para moderação (HU-21). O resto publica na hora.
    const criada: AvaliacaoCriada = {
      id: `avl_${Date.now().toString().slice(-6)}`,
      status: SUSPEITO.test(dados.comentario) ? "EM_MODERACAO" : "PUBLICADO",
    };
    gravarLocal(CHAVE, [{ ...dados, ...criada, criadoEm: new Date().toISOString(), nomeProduto: peca.nome, imagemPrincipal: peca.imagemPrincipal }, ...ler()]);
    return criada;
  },

  // GET /comprador/avaliacoes (lacuna)
  async minhas(): Promise<MinhaAvaliacao[]> {
    return ler();
  },
};
