// Integração frontend e módulo de IA: GET /api/produtos/recomendacoes.
// Com RECOMENDACAO_API_URL no servidor, a fonte é o BentoML ("ia"); sem ela, o baseline local.
// Defina a mesma variável ao rodar o teste para ele saber qual fonte esperar.
import { get } from "./cliente";

type Sugestao = { id: string; disponibilidade: string; motivo?: string };

const FONTE_ESPERADA = process.env.RECOMENDACAO_API_URL ? "ia" : "baseline";

describe(`recomendações (fonte esperada: ${FONTE_ESPERADA})`, () => {
  test("produto de referência: 200, sem o próprio produto e só peças disponíveis", async () => {
    const { status, corpo, cabecalhos } = await get<{ recomendados: Sugestao[] }>(
      "/api/produtos/recomendacoes?produtoId=prd_201",
    );

    expect(status).toBe(200);
    expect(cabecalhos.get("x-recomendacao-fonte")).toBe(FONTE_ESPERADA);
    expect(corpo.recomendados.length).toBeGreaterThan(0);
    expect(corpo.recomendados.length).toBeLessThanOrEqual(4);
    expect(corpo.recomendados.map((p) => p.id)).not.toContain("prd_201");
    expect(corpo.recomendados.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
  });

  test("sem produto de referência: 200 com até 4 destaques do baseline", async () => {
    const { status, corpo, cabecalhos } = await get<{ recomendados: Sugestao[] }>("/api/produtos/recomendacoes");

    expect(status).toBe(200);
    expect(cabecalhos.get("x-recomendacao-fonte")).toBe("baseline");
    expect(corpo.recomendados.length).toBeGreaterThan(0);
    expect(corpo.recomendados.length).toBeLessThanOrEqual(4);
  });
});
