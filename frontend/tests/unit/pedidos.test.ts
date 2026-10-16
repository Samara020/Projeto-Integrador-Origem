// TC06, TC07 e TC10: checkout cria o pedido com os dados do carrinho e o pagamento
// atualiza o status (services/pedidos.ts e services/pagamentos.ts).
import { ApiError } from "@/lib/http";
import { pagamentosService } from "@/services/pagamentos";
import { pedidosService } from "@/services/pedidos";
import type { EnderecoEntrega, ItemCarrinho, PedidoResumo } from "@/types";
import { concluir, gravar, lerGravado } from "./apoio";

const ENDERECO: EnderecoEntrega = { cep: "50030-230", rua: "Rua da Aurora", numero: "100" };

const ITENS: ItemCarrinho[] = [
  { produtoId: "prd_201", quantidade: 2, precoUnitario: 160, nome: "Vaso Cerâmica Raízes", imagemPrincipal: "/a.jpg" },
  { produtoId: "prd_203", quantidade: 1, precoUnitario: 70, nome: "Pássaro de Madeira", imagemPrincipal: "/b.jpg" },
];

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
    expect(criado.valorTotal).toBe(160 * 2 + 70 + frete);
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

  test("listar sem pedidos devolve lista vazia", async () => {
    await expect(pedidosService.listar()).resolves.toEqual({ pedidos: [] });
  });
});

describe("TC07 · pagamentosService.processar atualiza o status do pedido", () => {
  const PEDIDO: PedidoResumo = {
    id: "ped_123456",
    status: "AGUARDANDO_PAGAMENTO",
    valorTotal: 408,
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
