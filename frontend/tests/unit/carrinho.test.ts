// TC04 e F05: inclusão, alteração atômica e remoção de itens no carrinho (services/carrinho.ts).
import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import type { ProdutoResumo } from "@/types";
import { gravar } from "./apoio";

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
const TOKEN_COMPRADOR = "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEwMDEiLCJwYXBlbCI6IkNPTVBSQURPUiJ9.sig";

const vaso: ProdutoResumo = {
  id: "1001",
  nome: "Vaso Cerâmica Raízes",
  preco: 160,
  imagemPrincipal: "/produtos/vaso-ceramica.jpg",
  artesao: { id: "1000", nome: "Ana Pereira" },
  seloAtivo: true,
  regiao: { id: "zona-da-mata", nome: "Zona da Mata" },
  modalidadeProducao: "PRONTA_ENTREGA",
  disponibilidade: "DISPONIVEL",
  avaliacaoMedia: 4.8,
};

const luminaria: ProdutoResumo = {
  id: "1002",
  nome: "Luminária Mandacaru",
  preco: 120,
  imagemPrincipal: "/produtos/luminaria-mandacaru.jpg",
  artesao: { id: "1000", nome: "Ana Pereira" },
  seloAtivo: true,
  regiao: { id: "agreste", nome: "Agreste" },
  modalidadeProducao: "PRONTA_ENTREGA",
  disponibilidade: "DISPONIVEL",
  avaliacaoMedia: 4.9,
};

beforeEach(() => {
  jest.useFakeTimers();
  window.localStorage.clear();
  mockedHttp.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

function sessaoComprador() {
  gravar("sessao", {
    token: TOKEN_COMPRADOR,
    tipo: "Bearer",
    usuario: { id: "1001", nome: "Comprador", papel: "COMPRADOR" },
  });
}

describe("TC04 · carrinhoService", () => {
  test("visitante sem sessão recebe carrinho vazio sem chamar o backend", async () => {
    await expect(carrinhoService.obter()).resolves.toEqual({ itens: [], valorTotal: 0 });
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test("visitante sem sessão precisa entrar antes de adicionar uma peça", async () => {
    await expect(carrinhoService.adicionar(vaso, 1)).rejects.toThrow(
      "AUTENTICACAO_NECESSARIA",
    );
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test("adicionar envia POST com produto e quantidade e depois consulta o carrinho", async () => {
    sessaoComprador();
    const resposta = { itens: [], valorTotal: 0 };
    mockedHttp.mockResolvedValueOnce({ mensagem: "Item adicionado." });
    mockedHttp.mockResolvedValueOnce(resposta);

    await expect(carrinhoService.adicionar(vaso, 2)).resolves.toEqual(resposta);
    expect(mockedHttp).toHaveBeenNthCalledWith(1, "/carrinho/itens", {
      metodo: "POST",
      corpo: { produtoId: vaso.id, quantidade: 2 },
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/carrinho");
  });

  test("o total exibido vem da resposta do backend", async () => {
    sessaoComprador();
    const resposta = { itens: [], valorTotal: 440 };
    mockedHttp.mockResolvedValueOnce(resposta);

    await expect(carrinhoService.obter()).resolves.toEqual(resposta);
    expect(mockedHttp).toHaveBeenCalledWith("/carrinho");
  });

  test("remover envia DELETE para o item e consulta o estado persistido", async () => {
    sessaoComprador();
    const resposta = { itens: [], valorTotal: 0 };
    mockedHttp.mockResolvedValueOnce({ mensagem: "Item removido." });
    mockedHttp.mockResolvedValueOnce(resposta);

    await expect(carrinhoService.remover(vaso.id)).resolves.toEqual(resposta);
    expect(mockedHttp).toHaveBeenNthCalledWith(1, `/carrinho/itens/${vaso.id}`, {
      metodo: "DELETE",
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/carrinho");
  });

  test("esvaziar remove cada item e consulta o carrinho ao final", async () => {
    sessaoComprador();
    mockedHttp.mockResolvedValueOnce({ itens: [
      { produtoId: vaso.id, quantidade: 1 },
      { produtoId: luminaria.id, quantidade: 2 },
    ], valorTotal: 400 });
    mockedHttp.mockResolvedValueOnce({ mensagem: "Item removido." });
    mockedHttp.mockResolvedValueOnce({ mensagem: "Item removido." });
    mockedHttp.mockResolvedValueOnce({ itens: [], valorTotal: 0 });

    await expect(carrinhoService.esvaziar()).resolves.toEqual({ itens: [], valorTotal: 0 });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, `/carrinho/itens/${vaso.id}`, {
      metodo: "DELETE",
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(3, `/carrinho/itens/${luminaria.id}`, {
      metodo: "DELETE",
    });
  });
});

describe("F05 · carrinho autenticado atualiza quantidade atomicamente via PUT", () => {
  test("alterarQuantidade (>= 1) envia apenas PUT /carrinho/itens/:produtoId e GET /carrinho, sem DELETE+POST", async () => {
    sessaoComprador();
    const atualizado = {
      itens: [
        {
          produtoId: vaso.id,
          quantidade: 1,
          precoUnitario: vaso.preco,
          nome: vaso.nome,
          imagemPrincipal: vaso.imagemPrincipal,
        },
      ],
      valorTotal: vaso.preco,
    };
    mockedHttp.mockResolvedValueOnce({ mensagem: "Quantidade atualizada com sucesso." });
    mockedHttp.mockResolvedValueOnce(atualizado);

    const resultado = await carrinhoService.alterarQuantidade(vaso.id, 1);

    expect(resultado).toEqual(atualizado);
    expect(mockedHttp).toHaveBeenCalledTimes(2);
    expect(mockedHttp).toHaveBeenNthCalledWith(1, `/carrinho/itens/${vaso.id}`, {
      metodo: "PUT",
      corpo: { quantidade: 1 },
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/carrinho");
  });

  test("falha no PUT (503 ou 409) propaga ApiError, nunca chama DELETE e preserva estado anterior", async () => {
    sessaoComprador();
    const anterior = {
      itens: [
        {
          produtoId: vaso.id,
          quantidade: 2,
          precoUnitario: vaso.preco,
          nome: vaso.nome,
          imagemPrincipal: vaso.imagemPrincipal,
        },
      ],
      valorTotal: vaso.preco * 2,
    };

    mockedHttp.mockRejectedValueOnce(new ApiError(503, "Serviço temporariamente indisponível."));

    await expect(carrinhoService.alterarQuantidade(vaso.id, 1)).rejects.toMatchObject({
      status: 503,
      message: "Serviço temporariamente indisponível.",
    });
    expect(mockedHttp).toHaveBeenCalledTimes(1);
    expect(mockedHttp).not.toHaveBeenCalledWith(`/carrinho/itens/${vaso.id}`, { metodo: "DELETE" });

    mockedHttp.mockResolvedValueOnce(anterior);
    await expect(carrinhoService.obter()).resolves.toEqual(anterior);
  });

  test("alterarQuantidade com 0 utiliza DELETE /carrinho/itens/:produtoId separadamente para remoção", async () => {
    sessaoComprador();
    mockedHttp.mockResolvedValueOnce({ mensagem: "Item removido do carrinho." });
    mockedHttp.mockResolvedValueOnce({ itens: [], valorTotal: 0 });

    await expect(carrinhoService.alterarQuantidade(vaso.id, 0)).resolves.toEqual({
      itens: [],
      valorTotal: 0,
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(1, `/carrinho/itens/${vaso.id}`, {
      metodo: "DELETE",
    });
    expect(mockedHttp).toHaveBeenNthCalledWith(2, "/carrinho");
  });
});
