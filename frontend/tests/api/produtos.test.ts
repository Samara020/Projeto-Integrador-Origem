// TC03 e TC05 no nível de API: vitrine, busca, filtros e detalhe da peça.
import { erro, get } from "./cliente";

type Resumo = {
  id: string;
  nome: string;
  preco: number;
  disponibilidade: string;
  modalidadeProducao: string;
  regiao: { id: string; nome: string };
};
type Paginado = { total: number; pagina: number; limite: number; itens: Resumo[] };
type Detalhe = Resumo & { descricao: string; estoque: number; imagens: string[]; categoria: { id: string }; tecnica: { id: string } };

const ids = (pagina: Paginado) => pagina.itens.map((p) => p.id);

describe("TC03 · GET /api/produtos", () => {
  test("responde 200 no envelope { total, pagina, limite, itens }", async () => {
    const { status, corpo, cabecalhos } = await get<Paginado>("/api/produtos");

    expect(status).toBe(200);
    expect(cabecalhos.get("content-type")).toContain("application/json");
    expect(corpo).toMatchObject({ pagina: 1, limite: 8 });
    expect(corpo.total).toBeGreaterThanOrEqual(corpo.itens.length);
    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(Object.keys(corpo.itens[0])).toEqual(
      expect.arrayContaining(["id", "nome", "preco", "imagemPrincipal", "artesao", "disponibilidade"]),
    );
  });

  test("disponivel=true traz só peças disponíveis, sem a reservada e a vendida", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?disponivel=true&limite=48");

    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(corpo.itens.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
    expect(ids(corpo)).not.toContain("prd_206");
    expect(ids(corpo)).not.toContain("prd_208");
  });

  test("destaque=true traz só peças disponíveis", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?destaque=true");

    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(corpo.itens.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
  });

  test("busca por termo sem acento acha a peça com acento", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?termo=ceramica&limite=48");

    expect(ids(corpo)).toContain("prd_201");
  });

  test("busca sem resultado devolve envelope vazio", async () => {
    const { status, corpo } = await get<Paginado>("/api/produtos?termo=termo-que-nao-existe-xyz");

    expect(status).toBe(200);
    expect(corpo).toEqual({ total: 0, pagina: 1, limite: 8, itens: [] });
  });

  test("filtro de categoria", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?categoria=literatura&limite=48");

    expect(ids(corpo).sort()).toEqual(["prd_209", "prd_210"]);
  });

  test("filtro de técnica", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?tecnica=bordado&limite=48");

    expect(ids(corpo).sort()).toEqual(["prd_204", "prd_211"]);
  });

  test("filtro de região", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?regiao=zona-da-mata&limite=48");

    expect(ids(corpo).sort()).toEqual(["prd_201", "prd_212", "prd_213"]);
    expect(corpo.itens.every((p) => p.regiao.id === "zona-da-mata")).toBe(true);
  });

  test.each(["tecnica", "regiao"])("%s inexistente devolve envelope vazio", async (filtro) => {
    const { status, corpo } = await get<Paginado>(`/api/produtos?${filtro}=valor-que-nao-existe`);

    expect(status).toBe(200);
    expect(corpo).toMatchObject({ total: 0, itens: [] });
  });

  test("filtro de preço máximo", async () => {
    const { corpo } = await get<Paginado>("/api/produtos?precoMax=70&limite=48");

    expect(corpo.itens.length).toBeGreaterThan(0);
    expect(corpo.itens.every((p) => p.preco <= 70)).toBe(true);
  });

  test("paginação: página 2 não repete a página 1 e o limite passa de 48 não", async () => {
    const um = await get<Paginado>("/api/produtos?limite=5&pagina=1");
    const dois = await get<Paginado>("/api/produtos?limite=5&pagina=2");
    const enorme = await get<Paginado>("/api/produtos?limite=500");

    expect(dois.corpo.pagina).toBe(2);
    expect(ids(dois.corpo).length).toBeGreaterThan(0);
    expect(ids(um.corpo).filter((id) => ids(dois.corpo).includes(id))).toEqual([]);
    expect(enorme.corpo.limite).toBe(48);
  });
});

describe("TC03/TC05 · GET /api/produtos/{id}", () => {
  test("peça existente: 200 com os campos do detalhe", async () => {
    const { status, corpo } = await get<Detalhe>("/api/produtos/prd_201");

    expect(status).toBe(200);
    expect(corpo).toMatchObject({ id: "prd_201", nome: "Vaso Cerâmica Raízes", preco: 160, disponibilidade: "DISPONIVEL" });
    expect(typeof corpo.descricao).toBe("string");
    expect(typeof corpo.estoque).toBe("number");
    expect(corpo.imagens.length).toBeGreaterThan(0);
  });

  test.each([
    ["prd_206", "RESERVADO"],
    ["prd_208", "VENDIDO"],
  ])("TC05 · %s aparece como %s no detalhe", async (id, disponibilidade) => {
    const { corpo } = await get<Detalhe>(`/api/produtos/${id}`);

    expect(corpo.disponibilidade).toBe(disponibilidade);
  });

  test("peça inexistente: 404 no formato de erro", async () => {
    const { status, corpo } = await get("/api/produtos/prd_999");

    expect(status).toBe(404);
    expect(corpo).toEqual(erro("Não encontramos essa peça."));
  });

  test("avaliações da peça: 200 para peça existente e 404 para inexistente", async () => {
    const existente = await get("/api/produtos/prd_201/avaliacoes");
    const inexistente = await get("/api/produtos/prd_999/avaliacoes");

    expect(existente.status).toBe(200);
    expect(inexistente.status).toBe(404);
    expect(inexistente.corpo).toEqual(erro("Não encontramos essa peça."));
  });
});
