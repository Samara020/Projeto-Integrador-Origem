import { simular } from "@/lib/fake-api";
import { avaliacoesSinalizadas, metricasAdmin, pecasPendentes } from "@/mocks/admin";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  return Response.json({
    ...metricasAdmin,
    validacoesPendentes: pecasPendentes.filter((p) => p.statusValidacao === "PENDENTE").length,
    denunciasPendentes: avaliacoesSinalizadas.filter((a) => a.status === "EM_MODERACAO").length,
  });
}
