// TC06, TC07 e TC10: checkout cria o pedido com os dados do carrinho e o pagamento
// atualiza o status (services/pedidos.ts e services/pagamentos.ts).
// TC06 ramo autenticado: checkout NÃO esvazia o carrinho antes do pagamento aprovado,
// e falha de pagamento preserva os itens.
import { ApiError, http } from "@/lib/http";
import { authService } from "@/services/auth";
import { carrinhoService } from "@/services/carrinho";
import { pagamentosService } from "@/services/pagamentos";
import { pedidosService } from "@/services/pedidos";
import type { EnderecoEntrega, ItemCarrinho, PedidoResumo } from "@/types";
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
jest.mock("@/services/auth", () => ({
  authService: { sessaoAtual: jest.fn() },
}));

const mockedHttp = http as jest.Mock;
const mockedSessao = authService.sessaoAtual as jest.Mock;

const PEDIDO_CRIADO = { pedidoId: "ped_000001", status: "AGUARDANDO_PAGAMENTO", valorTotal: 318 };

function autenticarComoComprador() {
  process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
  mockedSessao.mockReturnValue({
    token: "tok",
    tipo: "Bearer",
    usuario: { id: "usr_1", nome: "Comprador", papel: "COMPRADOR" },
  });
}

function desautenticar() {
  delete process.env.NEXT_PUBLIC_API_URL;
  mockedSessao.mockReturnValue(null);
}

beforeEach(() => {
  mockedHttp.mockReset();
  mockedSessao.mockReset();
  desautenticar();
  window.localStorage.clear();
});

const ENDERECO: EnderecoEntrega = { cep: "50030-230", rua: "Rua da Aurora", numero: "100" };

// Carrinho comum, sem a peça de demonstração (prd_201): comprá-la passa pela API de
// concorrência (services/pedidos.ts), que não existe no ambiente dos testes unitários.
const ITENS: ItemCarrinho[] = [
  { produtoId: "prd_202", quantidade: 2, precoUnitario: 120, nome: "Luminária de Barro", imagemPrincipal: "/a.jpg" },
  { produtoId: "prd_203", quantidade: 1, precoUnitario: 70, nome: "Pássaro de Madeira", imagemPrincipal: "/b.jpg" },
];

// Peça de demonstração: checkout só conclui com a API de concorrência configurada.
const VASO_DEMO: ItemCarrinho = {
  produtoId: "prd_201",
  quantidade: 2,
  precoUnitario: 160,
  nome: "Vaso Cerâmica Raízes",
  imagemPrincipal: "/a.jpg",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("TC06 · pedidosService.checkout", () => {
  test("carrinho vazio é recusado com 400", async () => {
    const tentativa = pedidosService.checkout(ENDERECO);

    await expect(tentativa).rejects.toBeInstanceOf(ApiError);
    await expect(tentativa).rejects.toMatchObject({ status: 400, message: "Seu carrinho está vazio." });
  });

  test.each([
    ["cep", { ...ENDERECO, cep: "" }],
    ["rua", { ...ENDERECO, rua: "" }],
    ["número", { ...ENDERECO, numero: "" }],
  ])("endereço sem %s é recusado com 400", async (_campo, endereco) => {
    gravar("carrinho", ITENS);

    await expect(pedidosService.checkout(endereco)).rejects.toMatchObject({
      status: 400,
      message: "Preencha o endereço de entrega.",
    });
    expect(lerGravado("pedidos")).toBeNull();
  });

  test("cria o pedido aguardando pagamento, com carrinho mais frete", async () => {
    gravar("carrinho", ITENS);
    const frete = pedidosService.opcaoEnvioPadrao().valor;

    const criado = await pedidosService.checkout(ENDERECO);

    expect(criado.status).toBe("AGUARDANDO_PAGAMENTO");
    expect(criado.pedidoId).toMatch(/^ped_\d{6}$/);
    expect(criado.valorTotal).toBe(120 * 2 + 70 + frete);
  });

  test("TC10 · o pedido gravado guarda os mesmos itens e o mesmo total do carrinho", async () => {
    gravar("carrinho", ITENS);

    const criado = await pedidosService.checkout(ENDERECO);
    const { pedidos } = await pedidosService.listar();

    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].id).toBe(criado.pedidoId);
    expect(pedidos[0].itens).toEqual(ITENS);
    expect(pedidos[0].valorTotal).toBe(criado.valorTotal);
  });

  test("listar devolve o pedido mais novo primeiro", async () => {
    gravar("pedidos", [{ id: "ped_000001", status: "PAGO", valorTotal: 10, criadoEm: "2026-10-01T10:00:00.000Z", itens: [] }]);
    gravar("carrinho", ITENS);

    const criado = await pedidosService.checkout(ENDERECO);
    const { pedidos } = await pedidosService.listar();

    expect(pedidos.map((pedido) => pedido.id)).toEqual([criado.pedidoId, "ped_000001"]);
  });

  test("peça de demonstração sem a API de concorrência é recusada com 503", async () => {
    gravar("carrinho", [VASO_DEMO]);
    const anterior = process.env.NEXT_PUBLIC_CONCORRENCIA_API_URL;
    delete process.env.NEXT_PUBLIC_CONCORRENCIA_API_URL;
    try {
      // O service lê a variável ao carregar: importa uma cópia isolada, sem ela.
      let isolado!: typeof import("@/services/pedidos");
      await jest.isolateModulesAsync(async () => {
        isolado = await import("@/services/pedidos");
      });

      await expect(isolado.pedidosService.checkout(ENDERECO)).rejects.toMatchObject({
        status: 503,
        message: "Configure a API de concorrência para comprar esta peça.",
      });
    } finally {
      if (anterior !== undefined) process.env.NEXT_PUBLIC_CONCORRENCIA_API_URL = anterior;
    }
  });

  test("listar sem pedidos devolve lista vazia", async () => {
    await expect(pedidosService.listar()).resolves.toEqual({ pedidos: [] });
  });
});

describe("TC07 · pagamentosService.processar atualiza o status do pedido", () => {
  const PEDIDO: PedidoResumo = {
    id: "ped_123456",
    status: "AGUARDANDO_PAGAMENTO",
    valorTotal: 328,
    criadoEm: "2026-10-14T12:00:00.000Z",
    itens: ITENS,
  };

  // Outro pedido do mesmo navegador: pagar PEDIDO não pode mexer nele.
  const OUTRO: PedidoResumo = { ...PEDIDO, id: "ped_654321", valorTotal: 30, itens: [] };

  beforeEach(() => {
    jest.useFakeTimers();
    gravar("pedidos", [PEDIDO, OUTRO]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("PIX aprovado muda o pedido de AGUARDANDO_PAGAMENTO para PAGO", async () => {
    const pagamento = await concluir(
      pagamentosService.processar({ pedidoId: PEDIDO.id, metodoPagamento: "PIX", tokenCartao: null }),
    );

    expect(pagamento.status).toBe("APROVADO");
    expect(pagamento.transacaoId).toMatch(/^trx_\d{9}$/);
    expect(lerGravado<PedidoResumo[]>("pedidos")).toEqual([{ ...PEDIDO, status: "PAGO" }, OUTRO]);
  });

  test("cartão com token aprovado também marca PAGO e não mexe em outros campos", async () => {
    await concluir(
      pagamentosService.processar({ pedidoId: PEDIDO.id, metodoPagamento: "CARTAO_CREDITO", tokenCartao: "tok_teste" }),
    );

    expect(lerGravado<PedidoResumo[]>("pedidos")).toEqual([{ ...PEDIDO, status: "PAGO" }, OUTRO]);
  });

  test("cartão sem token é recusado com 400 e o status não muda", async () => {
    await expect(
      concluir(pagamentosService.processar({ pedidoId: PEDIDO.id, metodoPagamento: "CARTAO_CREDITO", tokenCartao: null })),
    ).rejects.toMatchObject({ status: 400, message: "Confira os dados do cartão." });
    expect(lerGravado<PedidoResumo[]>("pedidos")).toEqual([PEDIDO, OUTRO]);
  });

  test("pedido inexistente é recusado com 404", async () => {
    await expect(
      concluir(pagamentosService.processar({ pedidoId: "ped_999999", metodoPagamento: "PIX", tokenCartao: null })),
    ).rejects.toMatchObject({ status: 404, message: "Pedido não encontrado." });
    expect(lerGravado<PedidoResumo[]>("pedidos")).toEqual([PEDIDO, OUTRO]);
  });
});

describe("TC06 · checkout autenticado (ramo backend real)", () => {
  let obterSpy: ReturnType<typeof jest.spyOn>;
  let esvaziarSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    autenticarComoComprador();
    obterSpy = jest.spyOn(carrinhoService, "obter").mockResolvedValue({
      itens: ITENS,
      valorTotal: 318,
    });
    esvaziarSpy = jest.spyOn(carrinhoService, "esvaziar");
  });

  afterEach(() => {
    obterSpy.mockRestore();
    esvaziarSpy.mockRestore();
    desautenticar();
  });

  test("checkout cria o pedido via backend e NÃO esvazia o carrinho antes do pagamento", async () => {
    mockedHttp.mockResolvedValue(PEDIDO_CRIADO);

    const criado = await pedidosService.checkout(ENDERECO);

    expect(mockedHttp).toHaveBeenCalledTimes(1);
    expect(mockedHttp.mock.calls[0][0]).toBe("/pedidos/checkout");
    expect(mockedHttp.mock.calls[0][1].metodo).toBe("POST");
    expect(criado).toEqual(PEDIDO_CRIADO);
    expect(esvaziarSpy).not.toHaveBeenCalled();
  });

  test("checkout com carrinho vazio é recusado sem chamar o backend", async () => {
    obterSpy.mockResolvedValue({ itens: [], valorTotal: 0 });

    await expect(pedidosService.checkout(ENDERECO)).rejects.toMatchObject({
      status: 400,
      message: "Seu carrinho está vazio.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
    expect(esvaziarSpy).not.toHaveBeenCalled();
  });

  test("checkout com endereço incompleto é recusado sem chamar o backend", async () => {
    await expect(pedidosService.checkout({ ...ENDERECO, cep: "" })).rejects.toMatchObject({
      status: 400,
      message: "Preencha o endereço de entrega.",
    });
    expect(mockedHttp).not.toHaveBeenCalled();
    expect(esvaziarSpy).not.toHaveBeenCalled();
  });
});
