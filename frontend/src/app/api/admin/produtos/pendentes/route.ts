// Fake API: GET /admin/produtos/pendentes (ContratoDeAPI.md, 2.3)
import { simular } from "@/lib/fake-api";
import { pecasPendentes } from "@/mocks/admin";
import type { StatusValidacao } from "@/types";

const STATUS: StatusValidacao[] = ["PENDENTE", "APROVADA", "REPROVADA"];

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const status = new URL(request.url).searchParams.get("status") as StatusValidacao | null;
  const itens = pecasPendentes
    .filter((peca) => !status || !STATUS.includes(status) || peca.statusValidacao === status)
    .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));

  return Response.json({ total: itens.length, itens });
}
