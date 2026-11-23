import { pedidoService } from "../src/services/pedido.service";
import { carrinhoRepository, pedidoRepository } from "../src/repositories";

jest.mock("../src/repositories", () => ({
  carrinhoRepository: {
    buscarPorUsuarioId: jest.fn(),
  },
  pedidoRepository: {
    listarPorUsuario: jest.fn(),
    contarAtePedidoPorUsuario: jest.fn(),
    buscarDetalhePorUsuario: jest.fn(),
    extrairRastreio: jest.fn().mockReturnValue(null),
  },
}));

function pedido(id: number, data: string, status = "PAGO") {
  return {
    id,
    data: new Date(data),
    status,
    valorFrete: 10,
    itens: [
      {
        produtoId: 201,
        quantidade: 1,
        subtotal: 90,
        precoUnitario: 90,
        produto: { nome: "Peça de teste", imagens: [] },
      },
    ],
    historico: [],
    enderecoEntrega: null,
  };
}

describe("pedidoService (testes unitários puros sem banco de dados)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("listarPorUsuario numera pedidos de qualquer página contando o histórico completo do comprador", async () => {
    const maisRecente = pedido(14, "2026-11-20T10:00:00.000Z", "ENTREGUE");
    const cancelado = pedido(9, "2026-10-05T10:00:00.000Z", "CANCELADO");
    const maisAntigo = pedido(3, "2026-09-01T10:00:00.000Z", "ENTREGUE");
    (pedidoRepository.listarPorUsuario as jest.Mock).mockResolvedValue([
      maisRecente,
      cancelado,
      maisAntigo,
    ]);
    (pedidoRepository.contarAtePedidoPorUsuario as jest.Mock)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);

    const resultado = await pedidoService.listarPorUsuario("usr_1");

    expect(pedidoRepository.listarPorUsuario).toHaveBeenCalledWith("usr_1");
    expect(pedidoRepository.contarAtePedidoPorUsuario).toHaveBeenNthCalledWith(1, "usr_1", maisRecente);
    expect(pedidoRepository.contarAtePedidoPorUsuario).toHaveBeenNthCalledWith(2, "usr_1", cancelado);
    expect(pedidoRepository.contarAtePedidoPorUsuario).toHaveBeenNthCalledWith(3, "usr_1", maisAntigo);
    expect(resultado.pedidos.map(({ id, numeroSequencial }) => ({ id, numeroSequencial }))).toEqual([
      { id: 14, numeroSequencial: 6 },
      { id: 9, numeroSequencial: 5 },
      { id: 3, numeroSequencial: 4 },
    ]);
  });

  test("listarPorUsuario delega data e id ao repositório para manter a contagem determinística", async () => {
    const maiorId = pedido(20, "2026-11-20T10:00:00.000Z");
    const menorId = pedido(3, "2026-11-20T10:00:00.000Z");
    (pedidoRepository.listarPorUsuario as jest.Mock).mockResolvedValue([maiorId, menorId]);
    (pedidoRepository.contarAtePedidoPorUsuario as jest.Mock)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const resultado = await pedidoService.listarPorUsuario("usr_1");

    expect(pedidoRepository.contarAtePedidoPorUsuario).toHaveBeenNthCalledWith(1, "usr_1", maiorId);
    expect(pedidoRepository.contarAtePedidoPorUsuario).toHaveBeenNthCalledWith(2, "usr_1", menorId);
    expect(resultado.pedidos.map(({ id, numeroSequencial }) => ({ id, numeroSequencial }))).toEqual([
      { id: 20, numeroSequencial: 2 },
      { id: 3, numeroSequencial: 1 },
    ]);
  });

  test("buscarDoComprador continua consultando pelo id global e pelo usuarioId", async () => {
    (pedidoRepository.buscarDetalhePorUsuario as jest.Mock).mockResolvedValue(
      pedido(14, "2026-11-20T10:00:00.000Z", "ENTREGUE"),
    );

    const resultado = await pedidoService.buscarDoComprador("usr_1", "14");

    expect(pedidoRepository.buscarDetalhePorUsuario).toHaveBeenCalledWith("14", "usr_1");
    expect(resultado.id).toBe(14);
  });
});
