import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useCheckout } from "@/hooks/useCheckout";
import { pedidosService } from "@/services/pedidos";
import type { PedidoCriado } from "@/types";

jest.mock("@/hooks/useCarrinho", () => ({ useCarrinho: () => ({ esvaziar: jest.fn() }) }));
jest.mock("@/services/pedidos", () => ({ pedidosService: { checkout: jest.fn(), opcaoEnvioPadrao: jest.fn() } }));
jest.mock("@/services/pagamentos", () => ({ pagamentosService: { processar: jest.fn() } }));

const endereco = { cep: "50030-230", rua: "Rua da Aurora", numero: "100" };
const pedido: PedidoCriado = { pedidoId: "ped_123456", status: "AGUARDANDO_PAGAMENTO", valorTotal: 88 };
let checkout: ReturnType<typeof useCheckout>;
let root: Root;
let elemento: HTMLDivElement;
function Consumidor() {
  const valor = useCheckout();
  useEffect(() => { checkout = valor; });
  return null;
}

beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  jest.clearAllMocks();
  elemento = document.createElement("div");
  document.body.append(elemento);
  root = createRoot(elemento);
  await act(async () => root.render(createElement(Consumidor)));
});
afterEach(async () => { await act(async () => root.unmount()); elemento.remove(); });

test("dois envios antes da resposta e um envio posterior reutilizam o mesmo pedido", async () => {
  let concluir!: (valor: PedidoCriado) => void;
  jest.mocked(pedidosService.checkout).mockReturnValue(new Promise((resolve) => { concluir = resolve; }));
  await act(async () => {
    const primeiro = checkout.criarPedido(endereco);
    const segundo = checkout.criarPedido(endereco);
    expect(pedidosService.checkout).toHaveBeenCalledTimes(1);
    concluir(pedido);
    expect(await Promise.all([primeiro, segundo])).toEqual([pedido, pedido]);
  });
  await act(async () => { expect(await checkout.criarPedido(endereco)).toEqual(pedido); });
  expect(pedidosService.checkout).toHaveBeenCalledTimes(1);
  expect(checkout.pedido).toEqual(pedido);
});

test("falha libera a trava para o comprador tentar novamente", async () => {
  jest.mocked(pedidosService.checkout).mockRejectedValueOnce(new Error("Sem conexão"))
    .mockResolvedValueOnce(pedido);
  await act(async () => { await expect(checkout.criarPedido(endereco)).rejects.toThrow("Sem conexão"); });
  await act(async () => { await expect(checkout.criarPedido(endereco)).resolves.toEqual(pedido); });
  expect(pedidosService.checkout).toHaveBeenCalledTimes(2);
});
