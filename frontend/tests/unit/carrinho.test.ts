// TC04 e F05: inclusão, alteração atômica e remoção de itens no carrinho (services/carrinho.ts).
import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import type { ItemCarrinho, ProdutoResumo } from "@/types";
import { concluir, gravar, lerGravado } from "./apoio";

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

describe("TC04 · carrinhoService", () => {
  test("carrinho novo começa vazio, com total zero", async () => {
    await expect(carrinhoService.obter()).resolves.toEqual({ itens: [], valorTotal: 0 });
  });

  test("adicionar inclui o item com nome, imagem e preço da peça", async () => {
    const carrinho = await concluir(carrinhoService.adicionar(vaso, 1));

    expect(carrinho.itens).toEqual([
      {
        produtoId: vaso.id,
        quantidade: 1,
        precoUnitario: vaso.preco,
        nome: vaso.nome,
        imagemPrincipal: vaso.imagemPrincipal,
      },
    ]);
    expect(carrinho.valorTotal).toBe(vaso.preco);
  });

  test("adicionar a mesma peça de novo soma a quantidade, sem duplicar a linha", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    const carrinho = await concluir(carrinhoService.adicionar(vaso, 2));

    expect(carrinho.itens).toHaveLength(1);
    expect(carrinho.itens[0].quantidade).toBe(3);
    expect(carrinho.valorTotal).toBe(vaso.preco * 3);
  });

  test("valorTotal soma preço vezes quantidade de cada item", async () => {
    await concluir(carrinhoService.adicionar(vaso, 2));
    const carrinho = await concluir(carrinhoService.adicionar(luminaria, 1));

    expect(carrinho.valorTotal).toBe(vaso.preco * 2 + luminaria.preco);
  });

  test("o carrinho fica gravado no localStorage e sobrevive a um novo obter()", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));

    expect(lerGravado<ItemCarrinho[]>("carrinho")).toHaveLength(1);
    expect((await carrinhoService.obter()).itens[0].produtoId).toBe(vaso.id);
  });

  test("alterarQuantidade troca só a quantidade do item pedido", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await concluir(carrinhoService.adicionar(luminaria, 2));
    const carrinho = await concluir(carrinhoService.alterarQuantidade(vaso.id, 4));

    expect(carrinho.itens.map((item) => [item.produtoId, item.quantidade])).toEqual([
      [vaso.id, 4],
      [luminaria.id, 2],
    ]);
    expect(carrinho.valorTotal).toBe(vaso.preco * 4 + luminaria.preco * 2);
  });

  test("alterarQuantidade para zero tira só o item pedido", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await concluir(carrinhoService.adicionar(luminaria, 2));
    const carrinho = await concluir(carrinhoService.alterarQuantidade(vaso.id, 0));

    expect(carrinho.itens.map((item) => [item.produtoId, item.quantidade])).toEqual([[luminaria.id, 2]]);
    expect(carrinho.valorTotal).toBe(luminaria.preco * 2);
  });

  test("remover tira só o item pedido", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await concluir(carrinhoService.adicionar(luminaria, 1));
    const carrinho = await concluir(carrinhoService.remover(vaso.id));

    expect(carrinho.itens.map((item) => item.produtoId)).toEqual([luminaria.id]);
    expect(carrinho.valorTotal).toBe(luminaria.preco);
  });

  test("esvaziar zera o carrinho gravado", async () => {
    await concluir(carrinhoService.adicionar(vaso, 1));
    await carrinhoService.esvaziar();

    expect(lerGravado<ItemCarrinho[]>("carrinho")).toEqual([]);
    expect((await carrinhoService.obter()).valorTotal).toBe(0);
  });
});

describe("F05 · carrinho autenticado atualiza quantidade atomicamente via PUT", () => {
  const sessaoComprador = () =>
    gravar("sessao", {
      token: TOKEN_COMPRADOR,
      tipo: "Bearer",
      usuario: { id: "1001", nome: "Comprador", papel: "COMPRADOR" },
    });

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
