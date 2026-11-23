// TC03 e TC05: catálogo, busca, detalhe, disponibilidade e recomendações (services/produtos.ts).
import { ApiError, http } from "@/lib/http";
import { produtosService } from "@/services/produtos";

jest.mock("@/lib/http", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, mensagem: string) {
      super(mensagem);
      this.name = "ApiError";
      this.status = status;
    }
  },
  http: jest.fn(),
}));

const mockedHttp = http as jest.Mock;

beforeEach(() => {
  mockedHttp.mockReset();
});

describe("produtosService · listagem e filtros", () => {
  test("listar envia os filtros na chamada GET /produtos com AbortSignal", async () => {
    const controlador = new AbortController();
    const resposta = { total: 1, pagina: 1, limite: 8, itens: [] };
    mockedHttp.mockResolvedValueOnce(resposta);

    const resultado = await produtosService.listar(
      {
        termo: "ceramica",
        categoria: "1002",
        tecnica: "Cerâmica manual",
        regiao: "Agreste",
        precoMax: 200,
        avaliacaoMin: 4,
        disponivel: true,
        pecaUnica: true,
        ordenar: "melhor-avaliacao",
        pagina: 2,
        limite: 8,
      },
      controlador.signal,
    );

    expect(resultado).toEqual(resposta);
    expect(mockedHttp).toHaveBeenCalledWith("/produtos", {
      parametros: {
        termo: "ceramica",
        categoria: "1002",
        tecnica: "Cerâmica manual",
        regiao: "Agreste",
        precoMax: 200,
        avaliacaoMin: 4,
        disponivel: true,
        pecaUnica: true,
        ordenar: "melhor-avaliacao",
        pagina: 2,
        limite: 8,
      },
      sinal: controlador.signal,
    });
  });

  test("listarDestaques consulta GET /produtos com destaque=true", async () => {
    mockedHttp.mockResolvedValueOnce({ total: 0, pagina: 1, limite: 10, itens: [] });

    await produtosService.listarDestaques();

    expect(mockedHttp).toHaveBeenCalledWith("/produtos", {
      parametros: { destaque: true },
      sinal: undefined,
    });
  });
});

describe("produtosService · detalhe e disponibilidade", () => {
  test("buscar normaliza técnica, região, disponibilidade pelo estoque e imagemPrincipal", async () => {
    mockedHttp.mockResolvedValueOnce({
      id: "2009",
      nome: "Vaso do Sertão",
      preco: 190,
      descricao: "Modelado à mão.",
      imagens: ["/produtos/vaso.jpg"],
      categoria: { id: "1002", nome: "Cerâmica" },
      tecnica: "Cerâmica manual",
      estoque: 3,
      origem: "Caruaru, PE",
      modalidadeProducao: "PRONTA_ENTREGA",
      seloAtivo: true,
      avaliacaoMedia: 4.8,
      totalAvaliacoes: 5,
      dimensoes: "",
      material: "",
      artesao: { id: "1004", nome: "Maria Silva", loja: "Ateliê Raízes" },
    });

    const detalhe = await produtosService.buscar("2009");

    expect(mockedHttp).toHaveBeenCalledWith("/produtos/2009", { sinal: undefined });
    expect(detalhe).toMatchObject({
      id: "2009",
      imagemPrincipal: "/produtos/vaso.jpg",
      tecnica: { id: "Cerâmica manual", nome: "Cerâmica manual" },
      regiao: { id: "Caruaru, PE", nome: "Caruaru, PE" },
      disponibilidade: "DISPONIVEL",
      artesao: { id: "1004", nome: "Maria Silva", loja: "Ateliê Raízes" },
    });
  });

  test("buscar marca como VENDIDO quando estoque é 0 e disponibilidade não veio", async () => {
    mockedHttp.mockResolvedValueOnce({
      id: "2008",
      nome: "Matriz Pavão",
      preco: 250,
      imagens: [],
      categoria: { id: "1003", nome: "Arte" },
      tecnica: { id: "Xilogravura", nome: "Xilogravura" },
      estoque: 0,
      regiao: { id: "Olinda, PE", nome: "Olinda, PE" },
      modalidadeProducao: "PECA_UNICA",
      seloAtivo: false,
      avaliacaoMedia: 0,
      totalAvaliacoes: 0,
      dimensoes: "",
      material: "",
      artesao: { id: "1004", nome: "Maria Silva", loja: "Ateliê Raízes", cidade: "Olinda, PE" },
    });

    const detalhe = await produtosService.buscar("2008");

    expect(detalhe.disponibilidade).toBe("VENDIDO");
  });

  test("buscar propaga 404 da API", async () => {
    mockedHttp.mockRejectedValueOnce(new ApiError(404, "Produto nao encontrado."));

    await expect(produtosService.buscar("999999")).rejects.toMatchObject({
      status: 404,
      message: "Produto nao encontrado.",
    });
  });
});

describe("produtosService · recomendações e avaliações", () => {
  test("recomendados filtra peças reservadas/vendidas e mantém somente DISPONIVEL", async () => {
    mockedHttp.mockResolvedValueOnce({
      recomendados: [
        {
          id: "2002",
          nome: "Luminária",
          preco: 120,
          imagemPrincipal: "/a.jpg",
          artesao: { id: "1004", nome: "Ana" },
          seloAtivo: true,
          regiao: "Agreste",
          disponibilidade: "DISPONIVEL",
          modalidadeProducao: "PRONTA_ENTREGA",
          motivo: "Mesma técnica",
        },
        {
          id: "2008",
          nome: "Matriz Vendida",
          preco: 300,
          imagemPrincipal: "/b.jpg",
          artesao: { id: "1004", nome: "Ana" },
          seloAtivo: false,
          regiao: "Olinda",
          disponibilidade: "VENDIDO",
          modalidadeProducao: "PECA_UNICA",
        },
        {
          id: "2006",
          nome: "Carranca Reservada",
          preco: 210,
          imagemPrincipal: "/c.jpg",
          artesao: { id: "1004", nome: "Ana" },
          seloAtivo: false,
          regiao: "Sertão",
          disponibilidade: "RESERVADO",
          modalidadeProducao: "PECA_UNICA",
        },
      ],
    });

    const resposta = await produtosService.recomendados("2001");

    expect(mockedHttp).toHaveBeenCalledWith("/produtos/recomendacoes", {
      parametros: { produtoId: "2001" },
      sinal: undefined,
    });
    expect(resposta.recomendados).toHaveLength(1);
    expect(resposta.recomendados[0]).toMatchObject({
      id: "2002",
      disponibilidade: "DISPONIVEL",
      motivo: "Mesma técnica",
    });
  });

  test("avaliacoes consulta GET /produtos/{id}/avaliacoes", async () => {
    const payload = { media: 4.5, total: 2, itens: [] };
    mockedHttp.mockResolvedValueOnce(payload);

    await expect(produtosService.avaliacoes("2001")).resolves.toEqual(payload);
    expect(mockedHttp).toHaveBeenCalledWith("/produtos/2001/avaliacoes", { sinal: undefined });
  });
});
