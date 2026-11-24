import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DetalhePedido } from "@/components/conta/DetalhePedido";
import { HistoricoCompras, historicoParaCsv } from "@/components/conta/HistoricoCompras";
import { usePedidos } from "@/hooks/usePedidos";
import type { PedidoResumo } from "@/types";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: unknown }) =>
    jest.requireActual("react").createElement("a", { href }, children),
}));

jest.mock("@/components/ui/Foto", () => ({
  Foto: ({ alt }: { alt: string }) =>
    jest.requireActual("react").createElement("img", { alt }),
}));

jest.mock("@/hooks/usePedidos", () => ({
  usePedidos: jest.fn(),
}));

const PEDIDOS: PedidoResumo[] = [
  {
    id: "15",
    numeroSequencial: 3,
    status: "ENTREGUE",
    valorTotal: 150,
    criadoEm: "2026-11-20T10:00:00.000Z",
    itens: [
      { produtoId: "prd_1", quantidade: 1, precoUnitario: 150, nome: "Peça um", imagemPrincipal: "/a.jpg" },
    ],
  },
  {
    id: "14",
    numeroSequencial: 2,
    status: "CANCELADO",
    valorTotal: 90,
    criadoEm: "2026-10-05T10:00:00.000Z",
    itens: [
      { produtoId: "prd_2", quantidade: 1, precoUnitario: 90, nome: "Peça dois", imagemPrincipal: "/b.jpg" },
    ],
  },
];

describe("TC22 - rótulo de pedido do comprador", () => {
  beforeEach(() => {
    (usePedidos as jest.Mock).mockReturnValue({
      dados: { pedidos: PEDIDOS },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });
  });

  test("global 15 com ordinal 3 exibe somente SEU PEDIDO #3 e mantém o link no id 15", () => {
    const html = renderToStaticMarkup(<HistoricoCompras />);

    expect(html).toContain("SEU PEDIDO #3");
    expect(html).toContain("SEU PEDIDO #2");
    expect(html).not.toContain("SEU PEDIDO #15");
    expect(html).not.toContain("SEU PEDIDO #14");
    expect(html).not.toContain("#15");
    expect(html).toContain('href="/conta/pedidos/15"');
    expect(html).toContain('href="/conta/pedidos/14"');
  });

  test("o detalhe do comprador usa o mesmo rótulo e continua buscando pelo id global", () => {
    const html = renderToStaticMarkup(<DetalhePedido id="15" />);

    expect(html).toContain("SEU PEDIDO #3");
    expect(html).not.toContain("SEU PEDIDO #15");
    expect(html).not.toContain("#15");
  });

  test("sem sequencial, o histórico oculta o número e não mostra zero ou id global", () => {
    (usePedidos as jest.Mock).mockReturnValue({
      dados: { pedidos: [{ ...PEDIDOS[0], numeroSequencial: undefined }] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<HistoricoCompras />);

    expect(html).toContain("SEU PEDIDO");
    expect(html).not.toContain("SEU PEDIDO #");
    expect(html).not.toContain("SEU PEDIDO #0");
    expect(html).not.toContain("#15");
    expect(html).toContain('href="/conta/pedidos/15"');
  });

  test("sem sequencial, o detalhe oculta o número e não mostra zero ou id global", () => {
    (usePedidos as jest.Mock).mockReturnValue({
      dados: { pedidos: [{ ...PEDIDOS[0], numeroSequencial: undefined }] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<DetalhePedido id="15" />);

    expect(html).toContain("SEU PEDIDO");
    expect(html).not.toContain("SEU PEDIDO #");
    expect(html).not.toContain("SEU PEDIDO #0");
    expect(html).not.toContain("#15");
  });

  test("o CSV usa o mesmo rótulo do comprador e nunca escreve o id global", () => {
    const csv = historicoParaCsv([
      { ...PEDIDOS[0], numeroSequencial: undefined },
      PEDIDOS[0],
    ]);
    const linhas = csv.split("\n");

    expect(linhas[0]).toBe("Seu pedido;Data;Status;Total");
    expect(linhas[1].split(";")[0]).toBe("SEU PEDIDO");
    expect(linhas[2].split(";")[0]).toBe("SEU PEDIDO #3");
    expect(csv).not.toContain("#15");
    expect(csv).not.toContain("#0");
  });
});
