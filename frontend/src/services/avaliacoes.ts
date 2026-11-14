import { gravarLocal, lerLocal } from "@/lib/armazenamento";
import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
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
    const sessao = authService.sessaoAtual();
    if (sessao?.token && process.env.NEXT_PUBLIC_API_URL) {
      try {
        const criada = await http<AvaliacaoCriada>("/avaliacoes", {
          metodo: "POST",
          corpo: {
            pedidoId: dados.pedidoId,
            produtoId: dados.produtoId,
            nota: dados.nota,
            comentario: dados.comentario,
          },
        });
        gravarLocal(CHAVE, [
          {
            ...dados,
            ...criada,
            criadoEm: new Date().toISOString(),
            nomeProduto: peca.nome,
            imagemPrincipal: peca.imagemPrincipal,
          },
          ...ler(),
        ]);
        return criada;
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

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
    const sessao = authService.sessaoAtual();
    if (sessao?.token && process.env.NEXT_PUBLIC_API_URL) {
      try {
        return await http<MinhaAvaliacao[]>("/avaliacoes/comprador/avaliacoes");
      } catch {}
    }
    return ler();
  },
};
