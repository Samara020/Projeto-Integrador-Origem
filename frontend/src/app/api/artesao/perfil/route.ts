// Fake API: GET /artesao/perfil (ContratoDeAPI.md, 2.5)
import { simular } from "@/lib/fake-api";
import { perfilEdicao } from "@/mocks/painelArtesao";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  return Response.json(perfilEdicao);
}
