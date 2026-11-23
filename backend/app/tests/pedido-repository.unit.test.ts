import prisma from "../src/lib/prisma";
import { pedidoRepository } from "../src/repositories/pedido.repository";

jest.mock("../src/lib/prisma", () => ({
  __esModule: true,
  default: { pedido: { count: jest.fn() } },
}));

describe("pedidoRepository.contarAtePedidoPorUsuario (teste unitário puro sem banco)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("conta pedidos anteriores do mesmo comprador sem filtrar status", async () => {
    const data = new Date("2026-11-20T10:00:00.000Z");
    (prisma.pedido.count as jest.Mock).mockResolvedValue(6);

    const total = await pedidoRepository.contarAtePedidoPorUsuario("7", { id: 14, data });

    expect(total).toBe(6);
    expect(prisma.pedido.count).toHaveBeenCalledTimes(1);
    expect(prisma.pedido.count).toHaveBeenCalledWith({
      where: {
        usuarioId: 7,
        OR: [
          { data: { lt: data } },
          { data, id: { lte: 14 } },
        ],
      },
    });
    expect(JSON.stringify((prisma.pedido.count as jest.Mock).mock.calls[0][0])).not.toContain("status");
  });
});
