// Cliente do módulo de IA (modulo-ia/, HU-17). Roda só no servidor:
// a chave fica em variável sem NEXT_PUBLIC_ e nunca chega ao navegador.

export type RecomendacaoIA = {
  product_id: string;
  score: number;
  reason: string;
};

// RNF-01: o módulo tem 2 s para responder. Passou disso, o site usa o baseline.
const TEMPO_LIMITE_MS = 2000;

export function moduloIaConfigurado(): boolean {
  return !!process.env.RECOMENDACAO_API_URL;
}

// Devolve null em qualquer falha (fora do ar, 4xx, 5xx, tempo esgotado),
// para quem chama decidir o fallback.
export async function recomendarComIA(
  produtoId: string,
  limite = 4,
): Promise<RecomendacaoIA[] | null> {
  const base = process.env.RECOMENDACAO_API_URL;
  if (!base) return null;

  try {
    const resposta = await fetch(`${base.replace(/\/$/, "")}/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.RECOMENDACAO_API_KEY ?? "",
      },
      body: JSON.stringify({ product_id: produtoId, limit: limite }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      cache: "no-store",
    });

    if (!resposta.ok) {
      console.warn(`[modulo-ia] status ${resposta.status} para ${produtoId}`);
      return null;
    }

    const corpo = (await resposta.json()) as {
      recommendations?: RecomendacaoIA[];
    };
    return corpo.recommendations ?? [];
  } catch (erro) {
    console.warn("[modulo-ia] indisponível, usando baseline:", erro);
    return null;
  }
}
