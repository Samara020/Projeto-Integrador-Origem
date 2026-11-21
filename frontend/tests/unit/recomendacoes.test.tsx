import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Recomendados } from "@/components/produto/Recomendados";
import { Recomendacoes } from "@/components/recomendacoes/Recomendacoes";
import { useHistorico } from "@/hooks/useHistorico";
import {
  useDestaques,
  useProdutos,
  useRecomendados,
} from "@/hooks/useProdutos";
import { useSessao } from "@/hooks/useSessao";
import { http } from "@/lib/http";
import { produtosService } from "@/services/produtos";
import type { ProdutoSugerido } from "@/types";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    delete rest.priority;
    return React.createElement("img", rest);
  },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => React.createElement("a", { href, ...rest }, children),
}));

jest.mock("@/components/produto/BotaoCarrinho", () => ({
  BotaoCarrinho: () => React.createElement("button", { type: "button" }, "Adicionar"),
}));

jest.mock("@/components/produto/BotaoCompararCard", () => ({
  BotaoCompararCard: () => null,
}));

jest.mock("@/lib/http", () => ({
  http: jest.fn(),
}));

jest.mock("@/hooks/useProdutos", () => ({
  useRecomendados: jest.fn(),
  useDestaques: jest.fn(),
  useProdutos: jest.fn(),
}));

jest.mock("@/hooks/useHistorico", () => ({
  useHistorico: jest.fn(),
}));

jest.mock("@/hooks/useSessao", () => ({
  useSessao: jest.fn(),
}));

const PRODUTO_SUGERIDO: ProdutoSugerido = {
  id: "2013",
  nome: "Santo Antônio de Barro",
  preco: 260,
  imagemPrincipal: "/produtos/vaso-ceramica.jpg",
  artesao: { id: "1006", nome: "Ateliê Mãos da Mata" },
  seloAtivo: true,
  regiao: { id: "Zona da Mata - PE", nome: "Zona da Mata - PE" },
  modalidadeProducao: "PECA_UNICA",
  disponibilidade: "DISPONIVEL",
  avaliacaoMedia: 4.9,
  motivo:
    "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
  score: 1,
};

describe("produtosService.recomendados", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("envia produtoId e filtros para /produtos/recomendacoes e filtra apenas peças válidas disponíveis", async () => {
    (http as jest.Mock).mockResolvedValue({
      recomendados: [
        {
          id: "2013",
          nome: "Santo Antônio de Barro",
          preco: 260,
          imagemPrincipal: "/produtos/vaso-ceramica.jpg",
          artesao: { id: "1006", nome: "Ateliê Mãos da Mata" },
          seloAtivo: true,
          regiao: { id: "Zona da Mata - PE", nome: "Zona da Mata - PE" },
          modalidadeProducao: "PECA_UNICA",
          disponibilidade: "DISPONIVEL",
          motivo:
            "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
          score: 1,
        },
        {
          id: "2008",
          nome: "Peça Vendida",
          preco: 520,
          disponibilidade: "VENDIDO",
        },
        {
          id: "",
          nome: "Sem ID",
          preco: 10,
          disponibilidade: "DISPONIVEL",
        },
      ],
    });

    const resposta = await produtosService.recomendados({
      produtoId: "2001",
      categoria: "Arte e Decoração",
      tecnica: "Cerâmica",
      regiao: "Zona da Mata - PE",
      limite: 4,
    });

    expect(http).toHaveBeenCalledWith("/produtos/recomendacoes", {
      parametros: {
        produtoId: "2001",
        categoria: "Arte e Decoração",
        tecnica: "Cerâmica",
        regiao: "Zona da Mata - PE",
        limite: 4,
      },
      sinal: undefined,
    });

    expect(resposta.recomendados).toHaveLength(1);
    expect(resposta.recomendados[0]).toMatchObject({
      id: "2013",
      nome: "Santo Antônio de Barro",
      disponibilidade: "DISPONIVEL",
      motivo:
        "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
      score: 1,
    });
  });
});

describe("Recomendados (seção na página de detalhe do produto)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("exibe skeleton enquanto carrega", () => {
    (useRecomendados as jest.Mock).mockReturnValue({
      dados: null,
      carregando: true,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<Recomendados produtoId="2001" />);

    expect(html).toContain("Você também pode gostar");
    expect(html).toContain("Carregando peças");
  });

  test("exibe cartões com justificativa da IA e link para detalhes do produto", () => {
    (useRecomendados as jest.Mock).mockReturnValue({
      dados: { recomendados: [PRODUTO_SUGERIDO] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<Recomendados produtoId="2001" />);

    expect(html).toContain("Santo Antônio de Barro");
    expect(html).toContain(
      "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
    );
    expect(html).toContain('href="/produto/2013"');
  });

  test("oculta a seção quando não há recomendações elegíveis (RF-11)", () => {
    (useRecomendados as jest.Mock).mockReturnValue({
      dados: { recomendados: [] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<Recomendados produtoId="2009" />);

    expect(html).toBe("");
  });

  test("exibe estado de erro com ação de tentar novamente em caso de falha", () => {
    (useRecomendados as jest.Mock).mockReturnValue({
      dados: null,
      carregando: false,
      erro: new Error("Serviço temporariamente indisponível."),
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<Recomendados produtoId="2001" />);

    expect(html).toContain("Não conseguimos carregar");
    expect(html).toContain("Serviço temporariamente indisponível.");
    expect(html).toContain("Tentar de novo");
  });
});

describe("Recomendacoes (página /recomendacoes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSessao as jest.Mock).mockReturnValue({ usuario: { nome: "Joana Silva" } });
    (useDestaques as jest.Mock).mockReturnValue({
      dados: { itens: [] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });
    (useProdutos as jest.Mock).mockReturnValue({
      dados: { itens: [] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });
  });

  test("exibe estado vazio com saída para o catálogo quando histórico não gera recomendações", () => {
    (useHistorico as jest.Mock).mockReturnValue({
      vistos: [
        {
          id: "2009",
          nome: "Folheto O Vaqueiro e a Lua",
          artesaoId: "1007",
          artesaoNome: "Zefa do Pajeú",
          regiaoId: "Sertão do Pajeú - PE",
          regiaoNome: "Sertão do Pajeú - PE",
          tecnicaId: "Cordel",
          tecnicaNome: "Cordel",
        },
      ],
    });
    (useRecomendados as jest.Mock).mockReturnValue({
      dados: { recomendados: [] },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
    });

    const html = renderToStaticMarkup(<Recomendacoes />);

    expect(html).toContain("Nenhuma recomendação encontrada para o seu histórico");
    expect(html).toContain('href="/catalogo"');
  });

  test("exibe recomendações personalizadas com motivo da IA e link para a peça", () => {
    (useHistorico as jest.Mock).mockReturnValue({
      vistos: [
        {
          id: "2001",
          nome: "Vaso Cerâmica Raízes",
          artesaoId: "1006",
          artesaoNome: "Ateliê Mãos da Mata",
          regiaoId: "Zona da Mata - PE",
          regiaoNome: "Zona da Mata - PE",
          tecnicaId: "Cerâmica",
          tecnicaNome: "Cerâmica",
        },
      ],
    });
    (useRecomendados as jest.Mock)
      .mockReturnValueOnce({
        dados: { recomendados: [PRODUTO_SUGERIDO] },
        carregando: false,
        erro: null,
        recarregar: jest.fn(),
      })
      .mockReturnValueOnce({
        dados: { recomendados: [] },
        carregando: false,
        erro: null,
        recarregar: jest.fn(),
      });

    const html = renderToStaticMarkup(<Recomendacoes />);

    expect(html).toContain("Baseado no seu histórico");
    expect(html).toContain("Santo Antônio de Barro");
    expect(html).toContain(
      "Recomendado por mesma categoria, mesma técnica artesanal, mesma região.",
    );
    expect(html).toContain('href="/produto/2013"');
  });
});
