import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EstoqueArtesao from "@/components/painel/EstoqueArtesao";
import { usePecasArtesao, useAcoesArtesao } from "@/hooks/usePainelArtesao";
import { useFiltroUrl } from "@/components/painel/useFiltroUrl";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/painel/artesao/estoque",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/components/painel/useFiltroUrl", () => ({
  useFiltroUrl: jest.fn(),
}));

jest.mock("@/hooks/usePainelArtesao", () => ({
  usePecasArtesao: jest.fn(),
  useAcoesArtesao: jest.fn(),
}));

describe("EstoqueArtesao (Gestão de estoque)", () => {
  const mockDefinir = jest.fn();
  const mockAlterarEstoque = jest.fn();
  const mockRemoverPeca = jest.fn();
  const mockLimparErro = jest.fn();
  const mockRecarregar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useFiltroUrl as jest.Mock).mockReturnValue({
      valor: "",
      definir: mockDefinir,
    });
    (useAcoesArtesao as jest.Mock).mockReturnValue({
      alterarEstoque: mockAlterarEstoque,
      removerPeca: mockRemoverPeca,
      salvando: null,
      erro: null,
      limparErro: mockLimparErro,
    });
    (usePecasArtesao as jest.Mock).mockReturnValue({
      dados: {
        total: 2,
        contagem: { ATIVO: 1, INATIVO: 0, ESGOTADO: 0, ESTOQUE_BAIXO: 1 },
        itens: [
          {
            id: "prd_1",
            nome: "Vaso Barro",
            sku: "ORG-000001",
            imagemPrincipal: "/img1.jpg",
            estoque: 10,
            situacao: "ATIVO",
          },
          {
            id: "prd_2",
            nome: "Mini Luminária",
            sku: "ORG-000002",
            imagemPrincipal: "/img2.jpg",
            estoque: 2,
            situacao: "ESTOQUE_BAIXO",
          },
        ],
      },
      carregando: false,
      erro: null,
      recarregar: mockRecarregar,
    });
  });

  test("renderiza todos os filtros incluindo 'Estoque baixo' e respeita área mínima de toque de 40px", () => {
    const html = renderToStaticMarkup(<EstoqueArtesao />);

    expect(html).toContain("Estoque baixo");
    expect(html).toContain("Todos 2");
    expect(html).toContain("Ativos 1");
    expect(html).toContain("min-h-[40px]");
    expect(html).toContain("h-10");
  });

  test("quando URL contém filtro inválido, seleciona botão 'Todos' e não quebra a contagem", () => {
    (useFiltroUrl as jest.Mock).mockReturnValue({
      valor: "VALOR_INEXISTENTE_OU_DESCONHECIDO",
      definir: mockDefinir,
    });

    const html = renderToStaticMarkup(<EstoqueArtesao />);

    expect(html).not.toContain("NaN");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Todos 2</button>");
  });

  test("quando contagem vier vazia ou indefinida, nunca exibe NaN", () => {
    (usePecasArtesao as jest.Mock).mockReturnValue({
      dados: {
        total: 0,
        contagem: undefined,
        itens: [],
      },
      carregando: false,
      erro: null,
      recarregar: mockRecarregar,
    });

    const html = renderToStaticMarkup(<EstoqueArtesao />);

    expect(html).not.toContain("NaN");
    expect(html).toContain("Todos 0");
    expect(html).toContain("Ativos 0");
    expect(html).toContain("Inativos 0");
    expect(html).toContain("Esgotados 0");
    expect(html).toContain("Estoque baixo 0");
  });

  test("exibe mensagens de erro com role alert quando disponíveis", () => {
    (useAcoesArtesao as jest.Mock).mockReturnValue({
      alterarEstoque: mockAlterarEstoque,
      removerPeca: mockRemoverPeca,
      salvando: null,
      erro: new Error("Falha ao salvar alteração"),
      limparErro: mockLimparErro,
    });

    const html = renderToStaticMarkup(<EstoqueArtesao />);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Falha ao salvar alteração");
  });
});
