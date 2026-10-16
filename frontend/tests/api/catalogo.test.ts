// Rotas de apoio da vitrine, formato de erro da Fake API e TC09 (tempo de resposta).
import { erro, get } from "./cliente";

type Item = { id: string; nome: string };

describe("listas de apoio da vitrine", () => {
  test.each(["/api/categorias", "/api/tecnicas", "/api/regioes"])("%s: 200 com lista de { id, nome }", async (rota) => {
    const { status, corpo } = await get<Item[]>(rota);

    expect(status).toBe(200);
    expect(Array.isArray(corpo)).toBe(true);
    expect(corpo.length).toBeGreaterThan(0);
    for (const item of corpo) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.nome).toBe("string");
    }
  });

  test("/api/indicadores: 200 com números coerentes", async () => {
    const { status, corpo } = await get<Record<string, number>>("/api/indicadores");

    expect(status).toBe(200);
    expect(corpo.totalProdutos).toBeGreaterThan(0);
    expect(corpo.totalArtesaos).toBeGreaterThan(0);
    expect(corpo.avaliacaoMedia).toBeGreaterThanOrEqual(0);
    expect(corpo.avaliacaoMedia).toBeLessThanOrEqual(5);
  });

  test("perfil de artesão inexistente: 404", async () => {
    const { status, corpo } = await get("/api/artesaos/art_999/perfil");

    expect(status).toBe(404);
    expect(corpo).toEqual(erro("Não encontramos esse artesão."));
  });
});

describe("formato de erro da Fake API (?_erro=)", () => {
  const MENSAGEM = "Não foi possível carregar agora. Tente de novo em instantes.";

  test.each([
    ["500", 500],
    ["503", 503],
    ["abc", 500],
    ["200", 500],
  ])("?_erro=%s responde %i com { mensagem }", async (pedido, esperado) => {
    const { status, corpo } = await get(`/api/produtos?_erro=${pedido}`);

    expect(status).toBe(esperado);
    expect(corpo).toEqual(erro(MENSAGEM));
  });
});

describe("TC09 · tempo de resposta abaixo de 2 s (meta do backlog)", () => {
  const LIMITE_MS = 2000;

  test.each([
    "/api/produtos",
    "/api/produtos?termo=barro&disponivel=true",
    "/api/produtos?categoria=artesanato&ordenar=menor-preco",
    "/api/produtos/prd_201",
  ])("%s", async (rota) => {
    const { status, ms } = await get(rota);

    expect(status).toBe(200);
    expect(ms).toBeLessThan(LIMITE_MS);
  });
});
