// Rotas reais de apoio da vitrine, perfil 404 e TC09 (tempo de resposta < 2s).
import { erro, get, registrarELogar, criarProdutoAprovado } from "./cliente";

type Item = { id: string; nome: string };

describe("listas de apoio da vitrine (backend real)", () => {
  let produtoId: string;

  beforeAll(async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const prod = await criarProdutoAprovado(artesao.token, admin.token);
    produtoId = prod.id;
  });

  test.each(["/categorias", "/tecnicas", "/regioes"])(
    "%s: 200 com lista de { id, nome }",
    async (rota) => {
      const { status, corpo } = await get<Item[]>(rota);

      expect(status).toBe(200);
      expect(Array.isArray(corpo)).toBe(true);
      expect(corpo.length).toBeGreaterThan(0);
      for (const item of corpo) {
        expect(typeof item.id).toBe("string");
        expect(typeof item.nome).toBe("string");
      }
    },
  );

  test("/indicadores: 200 com números coerentes", async () => {
    const { status, corpo } = await get<Record<string, number>>("/indicadores");

    expect(status).toBe(200);
    expect(corpo.totalProdutos).toBeGreaterThan(0);
    expect(corpo.totalArtesaos).toBeGreaterThan(0);
    expect(corpo.avaliacaoMedia).toBeGreaterThanOrEqual(0);
    expect(corpo.avaliacaoMedia).toBeLessThanOrEqual(5);
  });

  test("perfil de artesão inexistente: 404", async () => {
    const { status, corpo } = await get("/artesaos/9999999/perfil");

    expect(status).toBe(404);
    expect(corpo).toEqual(erro("Artesao nao encontrado."));
  });

  test("TC09 · 10 medições por operação com média <= 2 s e máximo <= 4 s (Plano 1.4)", async () => {
    const LIMITE_MEDIA_MS = 2000;
    const LIMITE_MAXIMO_MS = 4000;
    const MEDICOES = 10;
    const rotas = [
      "/produtos",
      "/produtos?termo=Pe%C3%A7a&disponivel=true",
      "/produtos?ordenar=menor-preco",
      `/produtos/${encodeURIComponent(produtoId)}`,
    ];

    for (const rota of rotas) {
      const tempos: number[] = [];
      for (let i = 0; i < MEDICOES; i += 1) {
        const { status, ms } = await get(rota);
        expect(status).toBe(200);
        tempos.push(ms);
      }
      const media = tempos.reduce((soma, t) => soma + t, 0) / tempos.length;
      const maximo = Math.max(...tempos);
      expect(media).toBeLessThanOrEqual(LIMITE_MEDIA_MS);
      expect(maximo).toBeLessThanOrEqual(LIMITE_MAXIMO_MS);
    }
  });
});
