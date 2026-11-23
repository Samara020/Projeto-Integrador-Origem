import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardAdmin from "@/components/admin/DashboardAdmin";
import { useMetricasAdmin } from "@/hooks/useAdmin";
import { ApiError } from "@/lib/http";
import type { MetricasAdmin } from "@/types";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [chave: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

jest.mock("@/hooks/useAdmin", () => ({
  useMetricasAdmin: jest.fn(),
}));

const mockedUseMetricasAdmin = useMetricasAdmin as jest.Mock;

const METRICAS_BASE: MetricasAdmin = {
  totalUsuarios: 12,
  totalArtesaos: 4,
  totalArtesaosAtivos: 4,
  novosArtesaosNoMes: 1,
  totalProdutos: 18,
  novosProdutos: 3,
  totalVendas: 2,
  volumeTransacionadoGlobal: 1234.5,
  variacaoVendas: 0,
  ticketsSuporte: 1,
  ticketsUrgentes: 0,
  validacoesPendentes: 2,
  denunciasPendentes: 0,
  vendasPorRegiao: [],
  categoriasMaisVendidas: [],
  usuariosRecentes: [],
  atividadesRecentes: [],
};

const normalizarTexto = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

beforeEach(() => {
  mockedUseMetricasAdmin.mockReset();
});

describe("DashboardAdmin · F02 e estados de tela (Critério 11)", () => {
  test("F02: exibe volumeTransacionadoGlobal em reais e totalVendas como inteiro separado, sem misturar R$ 2,00", () => {
    mockedUseMetricasAdmin.mockReturnValue({
      dados: METRICAS_BASE,
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const texto = normalizarTexto(renderToStaticMarkup(<DashboardAdmin />));

    expect(texto).toContain("Volume de vendas");
    expect(texto).toContain("R$ 1.234,50");
    expect(texto).toContain("2 vendas realizadas");
    expect(texto).not.toContain("R$ 2,00");
  });

  test("renderiza variação no período quando variacaoVendas for diferente de zero", () => {
    mockedUseMetricasAdmin.mockReturnValue({
      dados: { ...METRICAS_BASE, totalVendas: 1, volumeTransacionadoGlobal: 250, variacaoVendas: 15 },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const texto = normalizarTexto(renderToStaticMarkup(<DashboardAdmin />));

    expect(texto).toContain("R$ 250,00");
    expect(texto).toContain("1 venda realizada (+15%)");
    expect(texto).not.toContain("R$ 1,00");
  });

  test("Critério 11: estado de carregamento renderiza skeleton com aria-busy", () => {
    mockedUseMetricasAdmin.mockReturnValue({
      dados: null,
      carregando: true,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<DashboardAdmin />);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Carregando painel administrativo");
  });

  test("Critério 11: estado de erro exibe mensagem e botão Tentar de novo", () => {
    mockedUseMetricasAdmin.mockReturnValue({
      dados: null,
      carregando: false,
      erro: new ApiError(500, "Falha ao consultar métricas."),
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<DashboardAdmin />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Falha ao consultar métricas.");
    expect(html).toContain("Tentar de novo");
  });

  test("Critério 11: resposta vazia exibe EstadoVazio quando todas as métricas e listas estão zeradas", () => {
    mockedUseMetricasAdmin.mockReturnValue({
      dados: {
        ...METRICAS_BASE,
        totalUsuarios: 0,
        totalArtesaos: 0,
        totalArtesaosAtivos: 0,
        novosArtesaosNoMes: 0,
        totalProdutos: 0,
        novosProdutos: 0,
        totalVendas: 0,
        volumeTransacionadoGlobal: 0,
        ticketsSuporte: 0,
        validacoesPendentes: 0,
      },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const texto = normalizarTexto(renderToStaticMarkup(<DashboardAdmin />));

    expect(texto).toContain("Ainda não há dados para exibir");
  });
});
