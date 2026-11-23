import type { Request, Response } from "express";
import { ProdutosController } from "../src/controllers/produtos.controller";
import { produtoRepository } from "../src/repositories";
import { produtoService } from "../src/services/produto.service";

jest.mock("../src/repositories", () => ({
  produtoRepository: {
    buscarPorId: jest.fn(),
    catalogoParaRecomendacao: jest.fn(),
  },
  lojaRepository: {},
  categoriaRepository: {},
}));

const CATALOGO_BANCO = [
  {
    id: 2001,
    nome: "Vaso Cerâmica Raízes",
    preco: 160,
    tecnica: "Cerâmica",
    origem: "Zona da Mata - PE",
    modalidadeProducao: "PECA_UNICA",
    pausado: false,
    excluido: false,
    categoria: { id: 1001, nome: "Arte e Decoração" },
    loja: { usuario: { id: 1006, nome: "Ateliê Mãos da Mata" } },
    estoque: { quantidadeDisponivel: 1 },
    imagens: [{ url: "/produtos/vaso-ceramica.jpg" }],
  },
  {
    id: 2013,
    nome: "Santo Antônio de Barro",
    preco: 260,
    tecnica: "Cerâmica",
    origem: "Zona da Mata - PE",
    modalidadeProducao: "PECA_UNICA",
    pausado: false,
    excluido: false,
    categoria: { id: 1001, nome: "Arte e Decoração" },
    loja: { usuario: { id: 1006, nome: "Ateliê Mãos da Mata" } },
    estoque: { quantidadeDisponivel: 1 },
    imagens: [{ url: "/produtos/vaso-ceramica.jpg" }],
  },
  {
    id: 2002,
    nome: "Luminária de Barro",
    preco: 120,
    tecnica: "Cerâmica",
    origem: "Agreste - PE",
    modalidadeProducao: "PRONTA_ENTREGA",
    pausado: false,
    excluido: false,
    categoria: { id: 1001, nome: "Arte e Decoração" },
    loja: { usuario: { id: 1002, nome: "Ana Pereira" } },
    estoque: { quantidadeDisponivel: 6 },
    imagens: [{ url: "/produtos/luminaria-barro.jpg" }],
  },
  {
    id: 2007,
    nome: "Xilogravura A Chegada da Chuva",
    preco: 180,
    tecnica: "Xilogravura",
    origem: "Agreste - PE",
    modalidadeProducao: "PRONTA_ENTREGA",
    pausado: false,
    excluido: false,
    categoria: { id: 1001, nome: "Arte e Decoração" },
    loja: { usuario: { id: 1005, nome: "Severino Gravador" } },
    estoque: { quantidadeDisponivel: 14 },
    imagens: [{ url: "/produtos/luminaria-barro.jpg" }],
  },
  {
    id: 2008,
    nome: "Matriz Entalhada Pavão",
    preco: 520,
    tecnica: "Cerâmica",
    origem: "Zona da Mata - PE",
    modalidadeProducao: "PECA_UNICA",
    pausado: false,
    excluido: false,
    categoria: { id: 1001, nome: "Arte e Decoração" },
    loja: { usuario: { id: 1005, nome: "Severino Gravador" } },
    estoque: { quantidadeDisponivel: 0 }, // esgotada -> nunca deve ser recomendada
    imagens: [{ url: "/produtos/passaro-madeira.jpg" }],
  },
  {
    id: 2009,
    nome: "Folheto O Vaqueiro e a Lua",
    preco: 12,
    tecnica: "Cordel",
    origem: "Sertão do Pajeú - PE",
    modalidadeProducao: "PRONTA_ENTREGA",
    pausado: false,
    excluido: false,
    categoria: { id: 1003, nome: "Literatura" },
    loja: { usuario: { id: 1007, nome: "Zefa do Pajeú" } },
    estoque: { quantidadeDisponivel: 80 },
    imagens: [{ url: "/produtos/vaso-ceramica.jpg" }],
  },
];

describe("Integração de recomendações (Backend <-> Módulo de IA)", () => {
  const fetchOriginal = global.fetch;
  const envUrlOriginal = process.env.RECOMENDACAO_API_URL;
  const envKeyOriginal = process.env.RECOMENDACAO_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    (produtoRepository.catalogoParaRecomendacao as jest.Mock).mockResolvedValue(
      CATALOGO_BANCO
    );
    (produtoRepository.buscarPorId as jest.Mock).mockResolvedValue(null);
    delete process.env.RECOMENDACAO_API_URL;
    process.env.RECOMENDACAO_API_KEY = "origem-mockup-key";
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    if (envUrlOriginal === undefined) delete process.env.RECOMENDACAO_API_URL;
    else process.env.RECOMENDACAO_API_URL = envUrlOriginal;
    if (envKeyOriginal === undefined) delete process.env.RECOMENDACAO_API_KEY;
    else process.env.RECOMENDACAO_API_KEY = envKeyOriginal;
  });

  test("solicita recomendações à IA com catálogo real, X-API-Key e hidrata motivos válidos", async () => {
    process.env.RECOMENDACAO_API_URL = "http://modulo-ia:3001";
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        recommendations: [
          {
            product_id: "2013",
            score: 1.0,
            reason:
              "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
          },
          {
            product_id: "2002",
            score: 0.8,
            reason: "Recomendado por mesma categoria, mesma técnica artesanal.",
          },
          // Itens que devem ser descartados defensivamente:
          { product_id: "2001", score: 1.0, reason: "Próprio produto" },
          { product_id: "2008", score: 1.0, reason: "Produto esgotado" },
          { product_id: "9999", score: 0.9, reason: "ID inexistente" },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    const resultado = await produtoService.recomendados({
      produtoId: "2001",
      limite: 4,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [urlChamada, opcoes] = mockFetch.mock.calls[0];
    expect(urlChamada).toBe("http://modulo-ia:3001/recommendations");
    expect(opcoes.method).toBe("POST");
    expect(opcoes.headers["X-API-Key"]).toBe("origem-mockup-key");

    const corpoEnviado = JSON.parse(opcoes.body);
    expect(corpoEnviado.product_id).toBe("2001");
    expect(corpoEnviado.limit).toBe(4);
    expect(corpoEnviado.catalog).toHaveLength(CATALOGO_BANCO.length);
    expect(
      corpoEnviado.catalog.find((c: { product_id: string }) => c.product_id === "2008")
        .available
    ).toBe(false);

    expect(resultado.fonte).toBe("ia");
    expect(resultado.recomendados.map((p) => p.id)).toEqual(["2013", "2002"]);
    expect(resultado.recomendados[0].motivo).toBe(
      "Recomendado por mesma categoria, mesma técnica artesanal, mesma região."
    );
    expect(resultado.recomendados[0].score).toBe(1.0);
    expect(resultado.recomendados.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(
      true
    );
  });

  test("respeita lista vazia retornada pela IA sem inventar itens sem relação (RF-11)", async () => {
    process.env.RECOMENDACAO_API_URL = "http://modulo-ia:3001";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ recommendations: [] }),
    }) as unknown as typeof fetch;

    const resultado = await produtoService.recomendados({ produtoId: "2009" });

    expect(resultado.fonte).toBe("ia");
    expect(resultado.recomendados).toEqual([]);
  });

  test("aplica baseline local coerente com pesos e disponibilidade quando IA retorna 503", async () => {
    process.env.RECOMENDACAO_API_URL = "http://modulo-ia:3001";
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: { code: "SERVICE_UNAVAILABLE", message: "Indisponível" },
      }),
    }) as unknown as typeof fetch;

    const resultado = await produtoService.recomendados({ produtoId: "2001" });
    warnSpy.mockRestore();

    expect(resultado.fonte).toBe("baseline");
    // Ordem esperada pelos pesos (cat 50%, tec 30%, reg 20%): 2013 (1.0), 2002 (0.8), 2007 (0.5).
    // 2008 (esgotada), 2001 (referência) e 2009 (outra categoria) ficam de fora.
    expect(resultado.recomendados.map((p) => p.id)).toEqual([
      "2013",
      "2002",
      "2007",
    ]);
    expect(resultado.recomendados.every((p) => p.motivo === undefined)).toBe(true);
    expect(resultado.recomendados.every((p) => p.disponibilidade === "DISPONIVEL")).toBe(
      true
    );
  });

  test("aplica baseline local quando há erro de rede/timeout ao chamar IA", async () => {
    process.env.RECOMENDACAO_API_URL = "http://modulo-ia:3001";
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("connect ECONNREFUSED")) as unknown as typeof fetch;

    const resultado = await produtoService.recomendados({
      regiao: "Agreste - PE",
      limite: 4,
    });
    warnSpy.mockRestore();

    expect(resultado.fonte).toBe("baseline");
    expect(resultado.recomendados.map((p) => p.id)).toEqual(["2002", "2007"]);
  });

  test("retorna lista vazia para produto de referência inexistente", async () => {
    const resultado = await produtoService.recomendados({
      produtoId: "999999",
    });

    expect(resultado.recomendados).toEqual([]);
    expect(resultado.produtosRecomendados).toEqual([]);
  });

  test("controller GET /produtos/recomendacoes expõe X-Recomendacao-Fonte e contrato JSON", async () => {
    process.env.RECOMENDACAO_API_URL = "http://modulo-ia:3001";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        recommendations: [
          {
            product_id: "2013",
            score: 1.0,
            reason:
              "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const controller = new ProdutosController();
    const headers: Record<string, string> = {};
    let corpoJson: any = null;
    const req = {
      query: { produtoId: "2001", limite: "4" },
    } as unknown as Request;
    const res = {
      setHeader: jest.fn((chave: string, valor: string) => {
        headers[chave.toLowerCase()] = valor;
      }),
      json: jest.fn((payload: unknown) => {
        corpoJson = payload;
        return res;
      }),
    } as unknown as Response;

    await controller.recomendados(req, res);

    expect(headers["x-recomendacao-fonte"]).toBe("ia");
    expect(corpoJson.recomendados).toHaveLength(1);
    expect(corpoJson.recomendados[0]).toMatchObject({
      id: "2013",
      nome: "Santo Antônio de Barro",
      disponibilidade: "DISPONIVEL",
      motivo:
        "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
    });
    expect(corpoJson.produtosRecomendados).toHaveLength(1);
  });
});
