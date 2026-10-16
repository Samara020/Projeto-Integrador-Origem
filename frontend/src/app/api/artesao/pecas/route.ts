// Fake API: GET /artesao/pecas (ContratoDeAPI.md, 2.2)
import { simular } from "@/lib/fake-api";
import { pecasEstoque } from "@/mocks/painelArtesao";
import type { SituacaoPeca } from "@/types";

const LIMITE_MAXIMO = 48;
const SITUACOES: SituacaoPeca[] = ["ATIVO", "INATIVO", "ESGOTADO", "ESTOQUE_BAIXO"];

export async function GET(request: Request) {
  const falha = await simular(request);
  if (falha) return falha;

  const p = new URL(request.url).searchParams;
  const situacao = p.get("situacao") as SituacaoPeca | null;
  const termo = (p.get("termo") ?? "").trim().toLowerCase();

  const contagem = Object.fromEntries(SITUACOES.map((valor) => [valor, 0])) as Record<
    SituacaoPeca,
    number
  >;
  for (const peca of pecasEstoque) contagem[peca.situacao] += 1;

  const filtradas = pecasEstoque.filter((peca) => {
    if (situacao && peca.situacao !== situacao) return false;
    if (termo && !peca.nome.toLowerCase().includes(termo)) return false;
    return true;
  });

  const limite = Math.min(Math.max(Number(p.get("limite")) || 20, 1), LIMITE_MAXIMO);
  const pagina = Math.max(Number(p.get("pagina")) || 1, 1);
  const inicio = (pagina - 1) * limite;

  return Response.json({
    total: filtradas.length,
    pagina,
    limite,
    contagem,
    itens: filtradas.slice(inicio, inicio + limite),
  });
}
