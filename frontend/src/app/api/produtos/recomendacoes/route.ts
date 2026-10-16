// Fake API: GET /produtos/recomendacoes (ContratoDeAPI.md, 2.10)
// Com RECOMENDACAO_API_URL definida, as sugestões vêm do módulo de IA (modulo-ia/).
// Sem a variável, ou se o módulo falhar, vale o baseline local (recomendarPara).
import { simular } from "@/lib/fake-api";
import { moduloIaConfigurado, recomendarComIA } from "@/lib/modulo-ia";
import { recomendarPara, resumosPorIds } from "@/mocks";
import type { ProdutoSugerido } from "@/types";

const LIMITE = 4;

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const produtoId = new URL(request.url).searchParams.get("produtoId");

  if (produtoId && moduloIaConfigurado()) {
    const sugestoes = await recomendarComIA(produtoId, LIMITE);

    if (sugestoes) {
      const motivos = new Map(sugestoes.map((s) => [s.product_id, s.reason]));
      const recomendados: ProdutoSugerido[] = resumosPorIds(
        sugestoes.map((s) => s.product_id),
      ).map((p) => ({ ...p, motivo: motivos.get(p.id) }));

      // Lista vazia é resposta válida: a seção "Você também pode gostar" some (RF-11).
      return Response.json(
        { recomendados },
        { headers: { "X-Recomendacao-Fonte": "ia" } },
      );
    }
  }

  return Response.json(
    { recomendados: recomendarPara(produtoId) },
    { headers: { "X-Recomendacao-Fonte": "baseline" } },
  );
}
