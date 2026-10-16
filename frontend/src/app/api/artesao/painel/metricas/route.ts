// Fake API: GET /artesao/painel/metricas (ContratoDeAPI.md, 2.10)
import { simular } from "@/lib/fake-api";
import { metricasArtesao } from "@/mocks/painelArtesao";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  return Response.json(metricasArtesao);
}
