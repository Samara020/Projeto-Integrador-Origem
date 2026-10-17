import { get } from "./cliente";

type Pendente = { id: string; nome: string; artesao: { id: string; nome: string }; statusValidacao: string };
type Sinalizada = { id: string; status: string; motivo: string; produto: { id: string } };

describe("GET /api/admin/produtos/pendentes (contrato 2.3)", () => {
  test("200 no envelope { total, itens } com os campos do contrato", async () => {
    const { status, corpo } = await get<{ total: number; itens: Pendente[] }>("/api/admin/produtos/pendentes");
    expect(status).toBe(200);
    expect(corpo.total).toBe(corpo.itens.length);
    expect(corpo.itens.length).toBe(5);
    expect(Object.keys(corpo.itens[0])).toEqual(expect.arrayContaining(["id", "nome", "artesao", "statusValidacao", "enviadoEm"]));
    expect(Object.keys(corpo.itens[0].artesao)).toEqual(["id", "nome"]);
  });
  test("?status=PENDENTE devolve só as pendentes", async () => {
    const { corpo } = await get<{ itens: Pendente[] }>("/api/admin/produtos/pendentes?status=PENDENTE");
    expect(corpo.itens.length).toBe(3);
    expect(corpo.itens.every((p) => p.statusValidacao === "PENDENTE")).toBe(true);
  });
  test("?status=invalido devolve todas", async () => {
    const { corpo } = await get<{ total: number }>("/api/admin/produtos/pendentes?status=xyz");
    expect(corpo.total).toBe(5);
  });
  test("?_erro=500 devolve 500 com { mensagem }", async () => {
    const { status, corpo } = await get<{ mensagem: string }>("/api/admin/produtos/pendentes?_erro=500");
    expect(status).toBe(500);
    expect(typeof corpo.mensagem).toBe("string");
  });
});

describe("GET /api/admin/avaliacoes (lacuna, HU-21)", () => {
  test("?status=EM_MODERACAO devolve as 3 sinalizadas abertas, com motivo e peça", async () => {
    const { status, corpo } = await get<{ total: number; itens: Sinalizada[] }>("/api/admin/avaliacoes?status=EM_MODERACAO");
    expect(status).toBe(200);
    expect(corpo.total).toBe(3);
    expect(corpo.itens.every((a) => a.status === "EM_MODERACAO" && a.motivo && a.produto.id)).toBe(true);
  });
});

describe("GET /api/admin/perfil (lacuna)", () => {
  test("devolve a conta da equipe", async () => {
    const { status, corpo } = await get<{ nome: string; email: string }>("/api/admin/perfil");
    expect(status).toBe(200);
    expect(corpo).toMatchObject({ nome: "Equipe Origem", email: "admin@origem.dev" });
  });
});

describe("GET /api/admin/painel/metricas bate com as listas", () => {
  test("validacoesPendentes e denunciasPendentes contam os itens abertos", async () => {
    const { corpo } = await get<{ validacoesPendentes: number; denunciasPendentes: number }>("/api/admin/painel/metricas");
    expect(corpo).toMatchObject({ validacoesPendentes: 3, denunciasPendentes: 3 });
  });
});
