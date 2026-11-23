import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DashboardAdmin from "@/components/admin/DashboardAdmin";
import { useMetricasAdmin } from "@/hooks/useAdmin";
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

const METRICAS: MetricasAdmin = {
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
  usuariosRecentes: [{ nome: "Bia Artesã", papel: "ARTESAO" }],
  atividadesRecentes: [],
  usuariosCadastrados: [
    { id: "1", nome: "Ana Compradora", papel: "COMPRADOR" },
    { id: "2", nome: "Bia Artesã", papel: "ARTESAO" },
    { id: "3", nome: "Caio Admin", papel: "ADMINISTRADOR" },
  ],
  artesaosCadastrados: [{ id: "2", nome: "Bia Artesã", papel: "ARTESAO" }],
};

const renderizar = (dados: MetricasAdmin) => {
  mockedUseMetricasAdmin.mockReturnValue({
    dados,
    carregando: false,
    erro: null,
    recarregar: jest.fn(),
  });
  return renderToStaticMarkup(<DashboardAdmin />);
};

beforeEach(() => {
  mockedUseMetricasAdmin.mockReset();
});

describe("DEF04 · DashboardAdmin com listagens completas", () => {
  test("renderiza duas tabelas acessíveis com nome e papel de todos os cadastros", () => {
    const html = renderizar(METRICAS);
    const texto = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    expect(texto).toContain("Usuários cadastrados (3)");
    expect(texto).toContain("Artesãos cadastrados (1)");
    expect(texto).toContain("Ana Compradora");
    expect(texto).toContain("Bia Artesã");
    expect(texto).toContain("Caio Admin");

    expect(html.match(/<table/g)).toHaveLength(2);
    expect(html.match(/scope="col"/g)).toHaveLength(4);
    expect(texto).toContain("Nome Papel");
  });

  test("mostra estados vazios das duas listas sem esconder o restante do painel", () => {
    const html = renderizar({
      ...METRICAS,
      usuariosCadastrados: [],
      artesaosCadastrados: [],
    });
    const texto = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    expect(texto).toContain("Usuários cadastrados (0)");
    expect(texto).toContain("Artesãos cadastrados (0)");
    expect(texto).toContain("Nenhum usuário cadastrado.");
    expect(texto).toContain("Nenhum artesão cadastrado.");
    expect(texto).toContain("Volume de vendas");
  });
});
