// Testes unitários dos serviços de avaliações, artesãos, envio e limites de imagem.
import { ApiError, http } from "@/lib/http";
import {
  bytesDeDataUrl,
  bytesTotaisImagens,
  LIMITE_BYTES_IMAGEM,
  LIMITE_BYTES_TOTAL_IMAGENS,
} from "@/lib/imagem";
import { artesaosService } from "@/services/artesaos";
import { avaliacoesService } from "@/services/avaliacoes";
import { painelArtesaoService } from "@/services/painelArtesao";

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

describe("imagem · cálculo de bytes e limites compatíveis com o backend", () => {
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
