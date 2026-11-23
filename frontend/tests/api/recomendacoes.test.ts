// Recomendações no backend real: somente peças disponíveis e nunca a peça de referência.
import { criarProdutoAprovado, get, registrarELogar } from "./cliente";

type Sugestao = { id: string; disponibilidade: string; motivo?: string };

describe("recomendações reais (GET /produtos/recomendacoes)", () => {
  let prodRefId: string;
  let prodVendidoId: string;

  beforeAll(async () => {
    const artesao = await registrarELogar("ARTESAO");
    const admin = await registrarELogar("ADMINISTRADOR");
    const cat = `CatRec${Date.now()}`;

    const ref = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: "Referência Rec",
      categoria: cat,
      estoque: 3,
    });
    await criarProdutoAprovado(artesao.token, admin.token, {
      nome: "Candidata Disponível Rec",
      categoria: cat,
      estoque: 2,
    });
    const vendida = await criarProdutoAprovado(artesao.token, admin.token, {
      nome: "Candidata Vendida Rec",
      categoria: cat,
      estoque: 0,
    });

    prodRefId = ref.id;
    prodVendidoId = vendida.id;
  });

  test("produto de referência: 200, sem o próprio produto e sem peças vendidas", async () => {
    const { status, corpo } = await get<{ recomendados: Sugestao[] }>(
      `/produtos/recomendacoes?produtoId=${encodeURIComponent(prodRefId)}`,
    );

    expect(status).toBe(200);
    expect(Array.isArray(corpo.recomendados)).toBe(true);
    expect(corpo.recomendados.length).toBeLessThanOrEqual(4);
    expect(corpo.recomendados.map((p) => String(p.id))).not.toContain(prodRefId);
    expect(corpo.recomendados.map((p) => String(p.id))).not.toContain(prodVendidoId);
    expect(corpo.recomendados.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
  });

  test("sem produto de referência: 200 com array válido", async () => {
    const { status, corpo } = await get<{ recomendados: Sugestao[] }>("/produtos/recomendacoes");

    expect(status).toBe(200);
    expect(Array.isArray(corpo.recomendados)).toBe(true);
  });
});
