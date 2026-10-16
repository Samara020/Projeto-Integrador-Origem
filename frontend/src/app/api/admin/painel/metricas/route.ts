import { simular } from "@/lib/fake-api";
import { metricasAdmin } from "@/mocks/admin";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  return Response.json(metricasAdmin);
}
