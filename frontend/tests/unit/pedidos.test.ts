// TC06, TC07 e TC10: checkout cria o pedido e o pagamento é processado pela API
// (services/pedidos.ts e services/pagamentos.ts).
// A camada @/lib/http é mockada: nenhum teste aqui chama o backend real.
import { ApiError, http } from "@/lib/http";
import { carrinhoService } from "@/services/carrinho";
import { pagamentosService } from "@/services/pagamentos";
import { pedidosService } from "@/services/pedidos";
import type { Carrinho, DadosPagamento, EnderecoEntrega, PedidoCriado, RespostaPedidos } from "@/types";

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
jest.mock("@/services/carrinho", () => ({
  carrinhoService: { obter: jest.fn(), esvaziar: jest.fn() },
}));

const mockedHttp = http as jest.Mock;
const mockedObter = carrinhoService.obter as jest.Mock;
const mockedEsvaziar = carrinhoService.esvaziar as jest.Mock;

const ENDERECO: EnderecoEntrega = { cep: "50030-230", rua: "Rua da Aurora", numero: "100" };

const CARRINHO: Carrinho = {
  itens: [
    { produtoId: "prd_202", quantidade: 2, precoUnitario: 120, nome: "Luminária de Barro", imagemPrincipal: "/a.jpg" },
    { produtoId: "prd_203", quantidade: 1, precoUnitario: 70, nome: "Pássaro de Madeira", imagemPrincipal: "/b.jpg" },
  ],
  valorTotal: 310,
};

const PEDIDO_CRIADO: PedidoCriado = {
  pedidoId: "ped_000001",
  status: "AGUARDANDO_PAGAMENTO",
  valorTotal: 328,
};

beforeEach(() => {
  mockedHttp.mockReset();
  mockedObter.mockReset();
  mockedEsvaziar.mockReset();
  mockedObter.mockResolvedValue(CARRINHO);
});

describe("TC06 · pedidosService.checkout", () => {
  test("carrinho vazio é recusado com 400 sem chamar a API", async () => {
    mockedObter.mockResolvedValue({ itens: [], valorTotal: 0 });

    await expect(pedidosService.checkout(ENDERECO)).rejects.toMatchObject({
      status: 400,
      message: "Seu carrinho está vazio.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
    expect(mockedEsvaziar).not.toHaveBeenCalled();
  });

  test.each([
    ["cep", { ...ENDERECO, cep: "" }],
    ["rua", { ...ENDERECO, rua: "" }],
    ["número", { ...ENDERECO, numero: "" }],
  ])("endereço sem %s é recusado com 400 sem chamar a API", async (_campo, endereco) => {
    const tentativa = pedidosService.checkout(endereco);

    await expect(tentativa).rejects.toBeInstanceOf(ApiError);
    await expect(tentativa).rejects.toMatchObject({
      status: 400,
      message: "Preencha o endereço de entrega.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
    expect(mockedEsvaziar).not.toHaveBeenCalled();
  });

  test("envia POST /pedidos/checkout com o endereço de entrega do contrato", async () => {
    mockedHttp.mockResolvedValue(PEDIDO_CRIADO);

    const criado = await pedidosService.checkout(ENDERECO);

    expect(mockedHttp).toHaveBeenCalledTimes(1);
    expect(mockedHttp).toHaveBeenCalledWith("/pedidos/checkout", {
      metodo: "POST",
      corpo: { enderecoEntrega: ENDERECO },
    });
    expect(criado).toEqual(PEDIDO_CRIADO);
  });

  test("não esvazia o carrinho: isso só acontece depois do pagamento aprovado", async () => {
    mockedHttp.mockResolvedValue(PEDIDO_CRIADO);

    await pedidosService.checkout(ENDERECO);

    expect(mockedEsvaziar).not.toHaveBeenCalled();
  });

  test("erro da API é propagado sem esvaziar o carrinho", async () => {
    const erro = new ApiError(422, "Estoque insuficiente para a peça.");
    mockedHttp.mockRejectedValue(erro);

    await expect(pedidosService.checkout(ENDERECO)).rejects.toBe(erro);
    expect(mockedEsvaziar).not.toHaveBeenCalled();
  });
});

describe("TC10 · pedidosService.listar", () => {
  test("busca o histórico em GET /comprador/pedidos e devolve o envelope do contrato", async () => {
    const resposta: RespostaPedidos = {
      pedidos: [
        {
          id: PEDIDO_CRIADO.pedidoId,
          status: "PAGO",
          valorTotal: PEDIDO_CRIADO.valorTotal,
          criadoEm: "2026-10-14T12:00:00.000Z",
          itens: CARRINHO.itens,
        },
      ],
    };
    mockedHttp.mockResolvedValue(resposta);

    await expect(pedidosService.listar()).resolves.toEqual(resposta);
    expect(mockedHttp).toHaveBeenCalledWith("/comprador/pedidos");
  });

  test("erro da API ao listar é propagado", async () => {
    const erro = new ApiError(401, "Sessão expirada.");
    mockedHttp.mockRejectedValue(erro);

    await expect(pedidosService.listar()).rejects.toBe(erro);
  });
});

describe("TC07 · pagamentosService.processar", () => {
  test("envia POST /pagamentos com os dados do PIX e devolve o resultado", async () => {
    const dados: DadosPagamento = {
      pedidoId: "ped_123456",
      metodoPagamento: "PIX",
      tokenCartao: null,
    };
    const processado = {
      transacaoId: "trx_999",
      status: "APROVADO" as const,
      dataPagamento: "2026-10-14T12:05:00.000Z",
    };
    mockedHttp.mockResolvedValue(processado);

    await expect(pagamentosService.processar(dados)).resolves.toEqual(processado);
    expect(mockedHttp).toHaveBeenCalledTimes(1);
    expect(mockedHttp).toHaveBeenCalledWith("/pagamentos", { metodo: "POST", corpo: dados });
  });

  test("cartão de crédito envia o token junto do pedido e do método", async () => {
    const dados: DadosPagamento = {
      pedidoId: "ped_123456",
      metodoPagamento: "CARTAO_CREDITO",
      tokenCartao: "tok_teste",
    };
    mockedHttp.mockResolvedValue({ transacaoId: "trx_1", status: "APROVADO", dataPagamento: "2026-10-14T12:05:00.000Z" });

    await pagamentosService.processar(dados);

    expect(mockedHttp).toHaveBeenCalledWith("/pagamentos", { metodo: "POST", corpo: dados });
  });

  test("recusa da API (cartão sem token) é propagada", async () => {
    const erro = new ApiError(400, "Confira os dados do cartão.");
    mockedHttp.mockRejectedValue(erro);

    await expect(
      pagamentosService.processar({ pedidoId: "ped_123456", metodoPagamento: "CARTAO_CREDITO", tokenCartao: null }),
    ).rejects.toBe(erro);
  });

  test("pedido inexistente: erro 404 da API é propagado", async () => {
    const erro = new ApiError(404, "Pedido não encontrado.");
    mockedHttp.mockRejectedValue(erro);

    await expect(
      pagamentosService.processar({ pedidoId: "ped_999999", metodoPagamento: "PIX", tokenCartao: null }),
    ).rejects.toMatchObject({ status: 404, message: "Pedido não encontrado." });
  });
});

describe("pedidosService.cotarFrete e checkout com opção de envio", () => {
  test("cotarFrete envia POST /envios/cotacao e devolve a cotação do backend", async () => {
    const cotacao = {
      servico: { id: "economico", nome: "Origem Econômico", prazo: "6 a 8 dias úteis" },
      valor: 24.8,
    };
    const dadosFrete = {
      cep: "50030-230",
      pesoKg: 1.6,
      dimensoes: { altura: 20, largura: 20, profundidade: 20 },
    };
    mockedHttp.mockResolvedValue(cotacao);

    await expect(pedidosService.cotarFrete(dadosFrete)).resolves.toEqual(cotacao);
    expect(mockedHttp).toHaveBeenCalledWith("/envios/cotacao", {
      metodo: "POST",
      corpo: dadosFrete,
    });
  });

  test("checkout envia opcaoEnvioId quando informada e devolve valorFrete e valorTotal do backend", async () => {
    const pedidoComFrete: PedidoCriado = {
      pedidoId: "ped_000002",
      status: "AGUARDANDO_PAGAMENTO",
      valorFrete: 24.8,
      valorTotal: 334.8,
    };
    mockedHttp.mockResolvedValue(pedidoComFrete);

    await expect(pedidosService.checkout(ENDERECO, "economico")).resolves.toEqual(pedidoComFrete);
    expect(mockedHttp).toHaveBeenCalledWith("/pedidos/checkout", {
      metodo: "POST",
      corpo: { enderecoEntrega: ENDERECO, opcaoEnvioId: "economico" },
    });
  });
});
