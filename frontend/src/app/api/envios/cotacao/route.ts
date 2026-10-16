// Fake API: POST /envios/cotacao (ContratoDeAPI.md, 2.10)
import { erroJson, simular } from "@/lib/fake-api";
import { cotarFrete } from "@/mocks/painelArtesao";
import type { DadosFrete } from "@/types";

export async function POST(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const dados = (await request.json().catch(() => null)) as DadosFrete | null;
  if (!dados || !dados.cep || !dados.pesoKg) {
    return erroJson(400, "Informe o CEP de destino e o peso do pacote.");
  }

  const { altura, largura, profundidade } = dados.dimensoes;
  const volume = altura * largura * profundidade;

  return Response.json(cotarFrete(dados.pesoKg, volume));
}
