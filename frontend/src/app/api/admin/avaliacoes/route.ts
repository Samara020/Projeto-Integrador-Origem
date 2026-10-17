// Fake API: GET /admin/avaliacoes (ContratoDeAPI.md, 2.8, lacuna)
import { simular } from "@/lib/fake-api";
import { avaliacoesSinalizadas } from "@/mocks/admin";
import type { StatusAvaliacao } from "@/types";

const STATUS: StatusAvaliacao[] = ["PUBLICADO", "EM_MODERACAO", "REMOVIDO"];

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const status = new URL(request.url).searchParams.get("status") as StatusAvaliacao | null;
  const itens = avaliacoesSinalizadas
    .filter((a) => !status || !STATUS.includes(status) || a.status === status)
    .sort((a, b) => b.sinalizadaEm.localeCompare(a.sinalizadaEm));

  return Response.json({ total: itens.length, itens });
}
