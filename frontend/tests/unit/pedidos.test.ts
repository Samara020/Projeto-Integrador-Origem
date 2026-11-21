// TC06, TC07 e TC10: checkout cria o pedido com os dados do carrinho e o pagamento
// atualiza o status (services/pedidos.ts e services/pagamentos.ts).
// TC06 ramo autenticado: checkout NÃO esvazia o carrinho antes do pagamento aprovado,
// e falha de pagamento preserva os itens.
/// <reference types="jest" />
import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import { pagamentosService } from "@/services/pagamentos";
import { pedidosService } from "@/services/pedidos";
import type { EnderecoEntrega, ItemCarrinho } from "@/types";

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

const ENDERECO: EnderecoEntrega = { cep: "50030-230", rua: "Rua da Aurora", numero: "100" };

const ITENS: ItemCarrinho[] = [
  { produtoId: "prd_201", quantidade: 2, precoUnitario: 160, nome: "Vaso Cerâmica Raízes", imagemPrincipal: "/a.jpg" },
  { produtoId: "prd_203", quantidade: 1, precoUnitario: 70, nome: "Pássaro de Madeira", imagemPrincipal: "/b.jpg" },
];

const PEDIDO_CRIADO = { pedidoId: "ped_000001", status: "AGUARDANDO_PAGAMENTO", valorTotal: 408 };

describe("TC06 - pedidosService", () => {
  let obterSpy: ReturnType<typeof jest.spyOn>;
  let esvaziarSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockedHttp.mockReset();
    obterSpy = jest.spyOn(carrinhoService, "obter").mockResolvedValue({
      itens: ITENS,
      valorTotal: 390,
    });
    esvaziarSpy = jest.spyOn(carrinhoService, "esvaziar");
  });

  afterEach(() => {
    obterSpy.mockRestore();
    esvaziarSpy.mockRestore();
  });

  test("checkout envia POST /pedidos/checkout com enderecoEntrega e preserva o carrinho antes do pagamento", async () => {
    mockedHttp.mockResolvedValue(PEDIDO_CRIADO);

    const criado = await pedidosService.checkout(ENDERECO);

    expect(mockedHttp).toHaveBeenCalledTimes(1);
    expect(mockedHttp).toHaveBeenCalledWith("/pedidos/checkout", {
      metodo: "POST",
      corpo: { enderecoEntrega: ENDERECO },
    });
    expect(criado).toEqual(PEDIDO_CRIADO);
    expect(esvaziarSpy).not.toHaveBeenCalled();
  });

  test("checkout com carrinho vazio retorna 400 sem chamar o backend", async () => {
    obterSpy.mockResolvedValue({ itens: [], valorTotal: 0 });

    await expect(pedidosService.checkout(ENDERECO)).rejects.toBeInstanceOf(ApiError);
    await expect(pedidosService.checkout(ENDERECO)).rejects.toMatchObject({
      status: 400,
      message: "Seu carrinho está vazio.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test.each([
    ["cep", { ...ENDERECO, cep: "" }],
    ["rua", { ...ENDERECO, rua: "" }],
    ["número", { ...ENDERECO, numero: "" }],
  ])("checkout sem %s retorna 400 sem chamar o backend", async (_campo, endereco) => {
    await expect(pedidosService.checkout(endereco)).rejects.toMatchObject({
      status: 400,
      message: "Preencha o endereço de entrega.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
  });

  test("checkout propaga erro 409 de estoque insuficiente retornado pelo PostgreSQL", async () => {
    mockedHttp.mockRejectedValue(new ApiError(409, "Estoque insuficiente para o produto solicitado."));

    await expect(pedidosService.checkout(ENDERECO)).rejects.toMatchObject({
      status: 409,
      message: "Estoque insuficiente para o produto solicitado.",
    });
  });

  test("listar consulta GET /comprador/pedidos", async () => {
    const resposta = { pedidos: [{ id: "ped_000001", status: "AGUARDANDO_PAGAMENTO", valorTotal: 408, criadoEm: "2026-11-20T10:00:00.000Z", itens: ITENS }] };
    mockedHttp.mockResolvedValue(resposta);

    await expect(pedidosService.listar()).resolves.toEqual(resposta);
    expect(mockedHttp).toHaveBeenCalledWith("/comprador/pedidos");
  });
});

describe("TC07 - pagamentosService", () => {
  beforeEach(() => {
    mockedHttp.mockReset();
  });

  test("processar envia POST /pagamentos para o backend", async () => {
    const resposta = { status: "APROVADO", transacaoId: "trx_123456789" };
    mockedHttp.mockResolvedValue(resposta);

    const resultado = await pagamentosService.processar({
      pedidoId: "ped_000001",
      metodoPagamento: "PIX",
      tokenCartao: null,
    });

    expect(mockedHttp).toHaveBeenCalledWith("/pagamentos", {
      metodo: "POST",
      corpo: { pedidoId: "ped_000001", metodoPagamento: "PIX", tokenCartao: null },
    });
    expect(resultado).toEqual(resposta);
  });
});