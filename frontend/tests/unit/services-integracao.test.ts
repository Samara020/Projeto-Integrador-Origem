// Testes unitários dos serviços de avaliações, artesãos, envio, produtos e aliases do backend.
import { ApiError, http } from "@/lib/http";
import {
  bytesDeDataUrl,
  bytesTotaisImagens,
  LIMITE_BYTES_IMAGEM,
  LIMITE_BYTES_TOTAL_IMAGENS,
} from "@/lib/imagem";
import { adminService } from "@/services/admin";
import { artesaosService } from "@/services/artesaos";
import { avaliacoesService } from "@/services/avaliacoes";
import { painelArtesaoService } from "@/services/painelArtesao";
import { pedidosService } from "@/services/pedidos";
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
  window.localStorage.clear();
});

describe("avaliacoesService · HTTP real sem simulação nem silêncio de erros", () => {
  test("criar sempre chama POST /avaliacoes e retorna resposta da API", async () => {
    mockedHttp.mockResolvedValueOnce({ id: "901", status: "PUBLICADO" });

    const criada = await avaliacoesService.criar({
      pedidoId: "501",
      produtoId: "2001",
      nota: 5,
      comentario: "Peça linda e bem embalada.",
    });

    expect(mockedHttp).toHaveBeenCalledWith("/avaliacoes", {
      metodo: "POST",
      corpo: {
        pedidoId: "501",
        produtoId: "2001",
        nota: 5,
        comentario: "Peça linda e bem embalada.",
      },
    });
    expect(criada).toEqual({ id: "901", status: "PUBLICADO" });
  });

  test("minhas sempre chama GET /comprador/avaliacoes e propaga erros HTTP", async () => {
    const controlador = new AbortController();
    mockedHttp.mockRejectedValueOnce(new ApiError(500, "Erro interno"));

    await expect(avaliacoesService.minhas(controlador.signal)).rejects.toMatchObject({
      status: 500,
      message: "Erro interno",
    });
    expect(mockedHttp).toHaveBeenCalledWith("/comprador/avaliacoes", {
      sinal: controlador.signal,
    });
  });
});

describe("artesaosService · perfil público sem métricas inventadas", () => {
  test("não inventa selo, notas, vendas nem disponibilidade quando ausentes da API", async () => {
    mockedHttp.mockResolvedValueOnce({
      id: "1004",
      nome: "Maria Silva",
      nomeLoja: "Ateliê Raízes",
      biografia: "Cerâmica do Agreste.",
      regiao: "Caruaru, PE",
      historia: [],
      produtos: [
        {
          id: "2001",
          nome: "Vaso",
          preco: 150,
        },
      ],
    });

    const perfil = await artesaosService.perfil("1004");

    expect(perfil.verificado).toBe(false);
    expect(perfil.avaliacaoMedia).toBe(0);
    expect(perfil.totalAvaliacoes).toBe(0);
    expect(perfil.pecasVendidas).toBe(0);
    expect(perfil.historia).toEqual(["Cerâmica do Agreste."]);
    expect(perfil.produtos[0]).toMatchObject({
      id: "2001",
      seloAtivo: false,
      disponibilidade: "VENDIDO",
      avaliacaoMedia: 0,
    });
  });
});

describe("painelArtesaoService · envio", () => {
  test("alternarOpcaoEnvio usa o valor devolvido pelo PUT /artesao/envio/configuracoes", async () => {
    mockedHttp
      .mockResolvedValueOnce({
        opcoes: [{ id: "economico", nome: "Origem Econômico", prazo: "6 a 8 dias", ativa: true }],
        tiposEmbalagem: [],
        prazosPorRegiao: [],
      })
      .mockResolvedValueOnce({ id: "economico", ativa: false });

    const resultado = await painelArtesaoService.alternarOpcaoEnvio("economico");

    expect(resultado).toEqual({
      id: "economico",
      nome: "Origem Econômico",
      prazo: "6 a 8 dias",
      ativa: false,
    });
  });
});

describe("TC16 · imagem · cálculo de bytes e limites compatíveis com o backend", () => {
  test("limite individual cabe no limite de 1,5 MB e string base64 <= 2M do perfil", () => {
    expect(LIMITE_BYTES_IMAGEM).toBeLessThanOrEqual(1_500_000);
    expect(Math.ceil((LIMITE_BYTES_IMAGEM * 4) / 3) + 30).toBeLessThanOrEqual(2_000_000);
    expect(LIMITE_BYTES_TOTAL_IMAGENS).toBe(4 * 1024 * 1024);
  });

  test("bytesDeDataUrl e bytesTotaisImagens calculam tamanho decodificado corretamente", () => {
    const dataUrl = `data:image/jpeg;base64,${"AAAA".repeat(100)}`;
    expect(bytesDeDataUrl(dataUrl)).toBe(300);
    expect(bytesTotaisImagens([dataUrl, dataUrl])).toBe(600);
    expect(bytesTotaisImagens(["/produtos/vaso.jpg"])).toBe(0);
  });
});

describe("produtosService · campos ricos e aliases do backend restaurado", () => {
  test("buscar normaliza categoria string, material, dimensoes e array de imagens", async () => {
    mockedHttp.mockResolvedValueOnce({
      id: "prod-101",
      nome: "Vaso Barro Marajoara",
      preco: 180,
      categoria: "Cerâmica",
      tecnica: "Modelagem manual",
      origem: "Alto do Moura",
      material: "Barro cozido",
      dimensoes: "30x20x20cm",
      estoque: 4,
      totalAvaliacoes: 12,
      imagens: [{ url: "/img/vaso-1.jpg" }, { url: "/img/vaso-2.jpg" }],
      artesao: { id: "art-55", nome: "Mestre Vitalino", cidade: "Caruaru" },
    });

    const produto = await produtosService.buscar("prod-101");

    expect(produto.id).toBe("prod-101");
    expect(produto.categoria).toEqual({ id: "Cerâmica", nome: "Cerâmica" });
    expect(produto.tecnica).toEqual({ id: "Modelagem manual", nome: "Modelagem manual" });
    expect(produto.material).toBe("Barro cozido");
    expect(produto.dimensoes).toBe("30x20x20cm");
    expect(produto.imagens).toEqual(["/img/vaso-1.jpg", "/img/vaso-2.jpg"]);
    expect(produto.imagemPrincipal).toBe("/img/vaso-1.jpg");
    expect(produto.disponibilidade).toBe("DISPONIVEL");
  });
});

describe("aliases e fallbacks transparentes do backend restaurado", () => {
  test("adminService.validarPeca recorre a /produtos/admin/produtos/:id/validacao se /admin retornar 404", async () => {
    mockedHttp
      .mockRejectedValueOnce(new ApiError(404, "Rota /admin não encontrada"))
      .mockResolvedValueOnce({ id: "prod-101", statusValidacao: "APROVADA" });

    const resultado = await adminService.validarPeca("prod-101", {
      status: "APROVADA",
      justificativa: "Auditoria territorial aprovada",
    });

    expect(mockedHttp).toHaveBeenNthCalledWith(1, "/admin/produtos/prod-101/validacao", {
      metodo: "PUT",
      corpo: { status: "APROVADA", justificativa: "Auditoria territorial aprovada" },
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/produtos/admin/produtos/prod-101/validacao", {
      metodo: "PUT",
      corpo: { status: "APROVADA", justificativa: "Auditoria territorial aprovada" },
    });
    expect(resultado).toEqual({ id: "prod-101", statusValidacao: "APROVADA" });
  });

  test("pedidosService.cotarFrete recorre a /painel/envios/cotacao se /envios/cotacao retornar 404", async () => {
    mockedHttp
      .mockRejectedValueOnce(new ApiError(404, "Rota /envios/cotacao não encontrada"))
      .mockResolvedValueOnce({
        servico: { id: "eco", nome: "Econômico", prazo: "5 dias" },
        valor: 25.5,
      });

    const dados = {
      cep: "50000-000",
      pesoKg: 1.2,
      dimensoes: { altura: 20, largura: 15, profundidade: 10 },
    };

    const resultado = await pedidosService.cotarFrete(dados);

    expect(mockedHttp).toHaveBeenNthCalledWith(1, "/envios/cotacao", {
      metodo: "POST",
      corpo: dados,
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/painel/envios/cotacao", {
      metodo: "POST",
      corpo: dados,
    });
    expect(resultado).toEqual({
      servico: { id: "eco", nome: "Econômico", prazo: "5 dias" },
      valor: 25.5,
    });
  });

  test("painelArtesaoService.pecas recorre a /produtos/artesao/pecas se /artesao/pecas retornar 404", async () => {
    mockedHttp
      .mockRejectedValueOnce(new ApiError(404, "Rota /artesao/pecas não encontrada"))
      .mockResolvedValueOnce({ pecas: [], total: 0 });

    const resultado = await painelArtesaoService.pecas();

    expect(mockedHttp).toHaveBeenNthCalledWith(1, "/artesao/pecas", {
      parametros: { situacao: undefined },
      sinal: undefined,
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/produtos/artesao/pecas", {
      parametros: { situacao: undefined },
      sinal: undefined,
    });
    expect(resultado).toEqual({ pecas: [], total: 0 });
  });
});
