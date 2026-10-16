// TC03 e TC05: regras da vitrine e da busca na Fake API (listarProdutos dos mocks,
// usado por GET /api/produtos). Só a regra; a rota HTTP é testada no nível de API.
import { buscarProduto, listarDestaques, listarProdutos } from "@/mocks";

const todos = () => listarProdutos({ limite: 48 });

describe("TC03 · vitrine mostra só peças disponíveis", () => {
  test("disponivel=true deixa de fora as peças reservadas e vendidas", () => {
    const { itens, total } = listarProdutos({ disponivel: true, limite: 48 });

    expect(itens.length).toBeGreaterThan(0);
    expect(itens.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
    expect(itens.map((p) => p.id)).not.toContain("prd_206"); // RESERVADO
    expect(itens.map((p) => p.id)).not.toContain("prd_208"); // VENDIDO
    expect(total).toBe(todos().itens.filter((p) => p.disponibilidade === "DISPONIVEL").length);
  });

  test("os destaques da home também só trazem peças disponíveis", () => {
    const destaques = listarDestaques();

    expect(destaques.length).toBeGreaterThan(0);
    expect(destaques.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(true);
  });
});

describe("TC03 · busca por termo e filtros", () => {
  test("busca ignora acento e maiúscula: 'ceramica' acha 'Vaso Cerâmica Raízes'", () => {
    const { itens } = listarProdutos({ termo: "CERAMICA", limite: 48 });

    expect(itens.map((p) => p.id)).toContain("prd_201");
  });

  test("termo sem correspondência devolve envelope vazio", () => {
    expect(listarProdutos({ termo: "termo-que-nao-existe-xyz" })).toEqual({
      total: 0,
      pagina: 1,
      limite: 8,
      itens: [],
    });
  });

  test("filtro de categoria devolve só a categoria pedida", () => {
    const { itens } = listarProdutos({ categoria: "literatura", limite: 48 });

    expect(itens.map((p) => p.id).sort()).toEqual(["prd_209", "prd_210"]);
  });

  test("filtro de técnica devolve só a técnica pedida", () => {
    expect(listarProdutos({ tecnica: "bordado", limite: 48 }).itens.map((p) => p.id).sort()).toEqual(["prd_204", "prd_211"]);
  });

  test("filtro de região devolve só peças de artesãos da região", () => {
    const { itens } = listarProdutos({ regiao: "zona-da-mata", limite: 48 });

    expect(itens.map((p) => p.id).sort()).toEqual(["prd_201", "prd_212", "prd_213"]);
    expect(itens.every((p) => p.regiao.id === "zona-da-mata")).toBe(true);
  });

  test.each(["tecnica", "regiao"] as const)("%s inexistente devolve lista vazia", (filtro) => {
    expect(listarProdutos({ [filtro]: "valor-que-nao-existe" })).toMatchObject({ total: 0, itens: [] });
  });

  test("precoMax corta as peças mais caras (valor-limite inclusivo)", () => {
    const { itens } = listarProdutos({ precoMax: 70, limite: 48 });

    expect(itens.length).toBeGreaterThan(0);
    expect(itens.every((p) => p.preco <= 70)).toBe(true);
    expect(itens.map((p) => p.id)).toContain("prd_203"); // custa exatamente 70
  });

  test("pecaUnica=true devolve só peça única", () => {
    const { itens } = listarProdutos({ pecaUnica: true, limite: 48 });

    expect(itens.length).toBeGreaterThan(0);
    expect(itens.every((p) => p.modalidadeProducao === "PECA_UNICA")).toBe(true);
  });

  test.each([
    ["menor-preco", (a: number, b: number) => a - b],
    ["maior-preco", (a: number, b: number) => b - a],
  ] as const)("ordenar por %s só muda a ordem: mesmas peças, preços em sequência", (ordenar, comparar) => {
    const original = todos().itens;
    const ordenados = listarProdutos({ ordenar, limite: 48 }).itens;
    const precos = ordenados.map((p) => p.preco);

    expect(ordenados.length).toBe(original.length);
    expect(ordenados.map((p) => p.id).sort()).toEqual(original.map((p) => p.id).sort());
    expect(precos).toEqual([...precos].sort(comparar));
  });
});

describe("TC03 · paginação no envelope do contrato", () => {
  test("padrão: página 1 com 8 itens e total de todas as peças", () => {
    const pagina = listarProdutos({});

    expect(pagina).toMatchObject({ pagina: 1, limite: 8, total: todos().total });
    expect(pagina.itens).toHaveLength(Math.min(8, todos().total));
  });

  test("limite fica entre 1 e 48 e página mínima é 1", () => {
    expect(listarProdutos({ limite: 0 }).limite).toBe(1);
    expect(listarProdutos({ limite: 500 }).limite).toBe(48);
    expect(listarProdutos({ pagina: -3 }).pagina).toBe(1);
  });

  test("as páginas de 5, emendadas, reproduzem a lista inteira na mesma ordem", () => {
    const inteira = todos().itens.map((p) => p.id);
    const paginas = Math.ceil(inteira.length / 5);
    const emendadas = Array.from({ length: paginas }, (_, i) =>
      listarProdutos({ limite: 5, pagina: i + 1 }).itens.map((p) => p.id),
    ).flat();

    expect(paginas).toBeGreaterThan(1);
    expect(emendadas).toEqual(inteira);
    expect(listarProdutos({ limite: 5, pagina: paginas + 1 }).itens).toEqual([]);
  });
});

describe("TC05 · disponibilidade no detalhe da peça", () => {
  test.each([
    ["prd_201", "DISPONIVEL"],
    ["prd_206", "RESERVADO"],
    ["prd_208", "VENDIDO"],
  ])("%s está %s", (id, disponibilidade) => {
    expect(buscarProduto(id)?.disponibilidade).toBe(disponibilidade);
  });

  test("peça inexistente devolve null", () => {
    expect(buscarProduto("prd_999")).toBeNull();
  });
});
