import { simular } from "@/lib/fake-api";
import { listarProdutos, recomendarPara } from "@/mocks";

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const produtoId = new URL(request.url).searchParams.get("produtoId");

  if (!produtoId) {
    return Response.json({ recomendados: recomendarPara(null) });
  }

  const apiKey = process.env.IA_API_KEY;

  if (!apiKey) {
    return Response.json({ recomendados: recomendarPara(produtoId) });
  }

  try {
    const resposta = await fetch("http://127.0.0.1:3001/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        product_id: produtoId,
        limit: 4,
      }),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });

    if (!resposta.ok) {
      return Response.json({ recomendados: recomendarPara(produtoId) });
    }

    const dados = await resposta.json();
    const produtos = listarProdutos({ limite: 48, pagina: 1 }).itens;
    const recomendados = (dados.recommendations ?? [])
      .map((item: { product_id: string }) =>
        produtos.find((produto) => produto.id === item.product_id),
      )
      .filter((produto: (typeof produtos)[number] | undefined) => produto !== undefined)
      .filter((produto: (typeof produtos)[number]) => produto.id !== produtoId)
      .filter((produto: (typeof produtos)[number]) => produto.disponibilidade === "DISPONIVEL");

    return Response.json({
      recomendados: recomendados.length > 0 ? recomendados : recomendarPara(produtoId),
    });
  } catch {
    return Response.json({ recomendados: recomendarPara(produtoId) });
  }
}