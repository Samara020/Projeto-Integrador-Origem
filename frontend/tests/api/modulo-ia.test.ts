// Contrato HTTP do módulo de IA (BentoML, POST /recommendations), visto de fora.
// Complementa modulo-ia/tests/test_api.py, que confere só o status: aqui o corpo de
// sucesso e de cada erro tem de vir completo. Porta: IA_BASE_URL (padrão :3001).
const IA_URL = (process.env.IA_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const CHAVE = "origem-mockup-key";

async function recomendar(corpo: unknown, chave: string | null = CHAVE) {
  const resposta = await fetch(`${IA_URL}/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(chave === null ? {} : { "X-API-Key": chave }) },
    body: JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: await resposta.json() };
}

const erroIA = (code: string, message: string) => ({ error: { code, message } });

describe("módulo de IA · POST /recommendations", () => {
  test("produto de referência: lista ordenada com score e justificativa (caso 1 do README)", async () => {
    const { status, corpo } = await recomendar({ product_id: "prd_201", limit: 5 });

    expect(status).toBe(200);
    expect(corpo).toEqual({
      recommendations: [
        { product_id: "prd_213", score: 1.0, reason: "Recomendado por mesma categoria, mesma técnica artesanal, mesma região." },
        { product_id: "prd_202", score: 0.8, reason: "Recomendado por mesma categoria, mesma técnica artesanal." },
        { product_id: "prd_207", score: 0.5, reason: "Recomendado por mesma categoria." },
      ],
    });
  });

  test.each([
    ["sem X-API-Key", { product_id: "prd_201" }, null, 401, erroIA("AUTHENTICATION_REQUIRED", "Autenticação obrigatória.")],
    ["chave inválida", { product_id: "prd_201" }, "chave-invalida", 403, erroIA("FORBIDDEN", "Credenciais inválidas ou sem autorização.")],
    ["limite 21", { product_id: "prd_201", limit: 21 }, CHAVE, 400, erroIA("INVALID_LIMIT", "O limite deve estar entre 1 e 20.")],
    ["sem produto nem filtro", { limit: 5 }, CHAVE, 400, erroIA("INVALID_REQUEST", "Informe um produto de referência ou pelo menos um filtro.")],
    ["produto inexistente", { product_id: "prd_999" }, CHAVE, 404, erroIA("PRODUCT_NOT_FOUND", "Produto de referência não encontrado.")],
  ])("%s: erro com status, código e mensagem", async (_caso, corpo, chave, statusEsperado, erroEsperado) => {
    const { status, corpo: resposta } = await recomendar(corpo, chave);

    expect(status).toBe(statusEsperado);
    expect(resposta).toEqual(erroEsperado);
  });
});
