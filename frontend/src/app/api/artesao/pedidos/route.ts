// Fake API: GET /artesao/pedidos (ContratoDeAPI.md, 2.7)
import { simular } from "@/lib/fake-api";
import { pedidosRecebidos } from "@/mocks/painelArtesao";
import type { StatusProducao } from "@/types";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const p = new URL(request.url).searchParams;
  const status = p.get("status") as StatusProducao | null;

  const pedidos = status
    ? pedidosRecebidos.filter((pedido) => pedido.statusProducao === status)
    : pedidosRecebidos;

  return Response.json({ pedidosRecebidos: pedidos });
}
