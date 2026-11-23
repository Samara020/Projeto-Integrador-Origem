// Cliente HTTP do módulo de recomendação (modulo-ia/, BentoML, POST /recommendations).
// A chave de API fica somente no servidor e nunca é exposta ao navegador.
import {
  RECOMENDACAO_API_KEY,
  RECOMENDACAO_API_URL,
  RECOMENDACAO_TIMEOUT_MS,
} from "../config";

export type ItemCatalogoIA = {
  product_id: string;
  name?: string;
  category: string | null;
  technique: string | null;
  region: string | null;
  available: boolean;
};

export type RequisicaoRecomendacaoIA = {
  product_id?: string;
  category?: string;
  technique?: string;
  region?: string;
  limit: number;
  catalog: ItemCatalogoIA[];
};

export type RecomendacaoIA = {
  product_id: string;
  score: number;
  reason: string;
};

function obterUrlBase(): string {
  return (process.env.RECOMENDACAO_API_URL ?? RECOMENDACAO_API_URL).trim();
}

function obterApiKey(): string {
  return process.env.RECOMENDACAO_API_KEY ?? RECOMENDACAO_API_KEY;
}

function obterTimeoutMs(): number {
  const bruto = Number(
    process.env.RECOMENDACAO_TIMEOUT_MS ?? RECOMENDACAO_TIMEOUT_MS
  );
  return Number.isFinite(bruto) && bruto > 0 ? bruto : 2000;
}

export function moduloIaConfigurado(): boolean {
  return obterUrlBase().length > 0;
}

/**
 * Solicita recomendações ao serviço BentoML.
 * Devolve `null` em qualquer falha (não configurado, indisponível, timeout ou HTTP != 200)
 * para que o chamador aplique o baseline local sem interromper a experiência do usuário.
 */
export async function solicitarRecomendacoesIA(
  payload: RequisicaoRecomendacaoIA
): Promise<RecomendacaoIA[] | null> {
  const base = obterUrlBase();
  if (!base) return null;

  const url = `${base.replace(/\/$/, "")}/recommendations`;

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": obterApiKey(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(obterTimeoutMs()),
    });

    if (!resposta.ok) {
      console.warn(
        `[modulo-ia] resposta HTTP ${resposta.status} ao solicitar recomendações`
      );
      return null;
    }

    const corpo = (await resposta.json()) as {
      recommendations?: unknown;
    };

    if (!Array.isArray(corpo?.recommendations)) {
      console.warn("[modulo-ia] formato de resposta inesperado");
      return null;
    }

    return corpo.recommendations.filter(
      (item): item is RecomendacaoIA =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecomendacaoIA).product_id === "string" &&
        typeof (item as RecomendacaoIA).score === "number" &&
        typeof (item as RecomendacaoIA).reason === "string"
    );
  } catch (erro) {
    console.warn(
      "[modulo-ia] indisponível ou tempo esgotado; aplicando baseline local:",
      erro instanceof Error ? erro.message : erro
    );
    return null;
  }
}
