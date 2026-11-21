// Fake API: GET /produtos/recomendacoes (ContratoDeAPI.md, 2.10)
// Com RECOMENDACAO_API_URL definida, as sugestões vêm do módulo de IA (modulo-ia/).
// Sem a variável, ou se o módulo falhar, vale o baseline local (recomendarPara).
import { simular } from "@/lib/fake-api";
import { moduloIaConfigurado, recomendarComIA } from "@/lib/modulo-ia";
import { recomendarPara, resumosPorIds } from "@/mocks";
import type { ProdutoSugerido } from "@/types";

const LIMITE_PADRAO = 4;
const LIMITE_MAXIMO = 20;

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const params = new URL(request.url).searchParams;
  const produtoId = params.get("produtoId")?.trim() || undefined;
  const categoria = params.get("categoria")?.trim() || undefined;
  const tecnica = params.get("tecnica")?.trim() || undefined;
  const regiao = params.get("regiao")?.trim() || undefined;
  const limiteBruto = Number(params.get("limite") ?? LIMITE_PADRAO);
  const limite = Number.isFinite(limiteBruto)
    ? Math.min(Math.max(Math.trunc(limiteBruto), 1), LIMITE_MAXIMO)
    : LIMITE_PADRAO;

  const temCriterio = Boolean(produtoId || categoria || tecnica || regiao);

  if (temCriterio && moduloIaConfigurado()) {
    const sugestoes = await recomendarComIA(
      {
        product_id: produtoId,
        category: categoria,
        technique: tecnica,
        region: regiao,
        limit: limite,
      },
      limite,
    );

    if (sugestoes) {
      const motivos = new Map(sugestoes.map((s) => [s.product_id, s.reason]));
      const scores = new Map(sugestoes.map((s) => [s.product_id, s.score]));
      const recomendados: ProdutoSugerido[] = resumosPorIds(
        sugestoes.map((s) => s.product_id),
      ).map((p) => ({
        ...p,
        motivo: motivos.get(p.id),
        score: scores.get(p.id),
      }));

      // Lista vazia é resposta válida: a seção "Você também pode gostar" some (RF-11).
      return Response.json(
        { recomendados },
        { headers: { "X-Recomendacao-Fonte": "ia" } },
      );
    }
  }

  return Response.json(
    { recomendados: recomendarPara(produtoId ?? null).slice(0, limite) },
    { headers: { "X-Recomendacao-Fonte": "baseline" } },
  );
}
