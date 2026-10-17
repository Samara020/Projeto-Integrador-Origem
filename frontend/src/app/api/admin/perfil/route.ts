// Fake API: GET /admin/perfil (ContratoDeAPI.md, 2.11, lacuna)
import { simular } from "@/lib/fake-api";
import { perfilAdmin } from "@/mocks/admin";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  return Response.json(perfilAdmin);
}
