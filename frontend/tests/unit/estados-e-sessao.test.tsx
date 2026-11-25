import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Carrinho } from "@/components/carrinho/Carrinho";
import { ItemCarrinho } from "@/components/carrinho/ItemCarrinho";
import { FluxoCheckout } from "@/components/checkout/FluxoCheckout";
import { FormularioLogin } from "@/components/conta/FormularioLogin";
import { toaster } from "@/components/ui/toaster";
import { useCarrinho } from "@/hooks/useCarrinho";
import { useCheckout } from "@/hooks/useCheckout";
import { useSessao } from "@/hooks/useSessao";
import { ApiError, cliente, http, navegacaoHttp, urlLoginSessaoExpirada } from "@/lib/http";
import { sessaoStore } from "@/store/sessao";
import type { AxiosAdapter } from "axios";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
}));

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

jest.mock("@/hooks/useSessao", () => ({
  useSessao: jest.fn(),
}));

jest.mock("@/hooks/useCarrinho", () => ({
  useCarrinho: jest.fn(),
}));

jest.mock("@/hooks/useCheckout", () => ({
  useCheckout: jest.fn(),
}));

const mockedUseSessao = useSessao as jest.Mock;
const mockedUseCarrinho = useCarrinho as jest.Mock;
const mockedUseCheckout = useCheckout as jest.Mock;

describe("TC15 / Critério 11 · sessão expirada, erro HTTP e falha de rede em http.ts", () => {
  const adaptadorOriginal = cliente.defaults.adapter;

  beforeEach(() => {
    window.localStorage.clear();
    sessaoStore.definir(null);
    pushMock.mockReset();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    cliente.defaults.adapter = adaptadorOriginal;
  });

  test("401 em rota protegida limpa sessão, zera sessaoStore e redireciona para /entrar com motivo=sessao-expirada", async () => {
    const spyNavegacao = jest.spyOn(navegacaoHttp, "irPara").mockImplementation(() => {});
    window.history.pushState({}, "", "/conta?aba=pedidos");
    const sessao = {
      token: "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEwMDEifQ.assinatura",
      tipo: "Bearer" as const,
      usuario: { id: "1001", nome: "Comprador", papel: "COMPRADOR" as const },
    };
    window.localStorage.setItem("origem:sessao", JSON.stringify(sessao));
    sessaoStore.definir(sessao);

    const erroAxios = Object.assign(new Error("Token expirado"), {
      isAxiosError: true,
      config: { url: "http://localhost:4000/comprador/pedidos" },
      response: { status: 401, data: { mensagem: "Sessão expirada." } },
    });
    cliente.defaults.adapter = (async () => {
      throw erroAxios;
    }) as AxiosAdapter;

    await expect(http("/comprador/pedidos")).rejects.toMatchObject({
      status: 401,
      message: "Sessão expirada.",
    });

    expect(window.localStorage.getItem("origem:sessao")).toBeNull();
    expect(sessaoStore.obter()).toBeNull();
    expect(spyNavegacao).toHaveBeenCalledWith(
      "/entrar?motivo=sessao-expirada&volta=%2Fconta%3Faba%3Dpedidos",
    );
  });

  test.each(["/entrar", "/cadastro"])(
    "401 em requisição privada enquanto está em %s limpa sessão mas suprime redirecionamento para evitar loop",
    async (pagina) => {
      const spyNavegacao = jest.spyOn(navegacaoHttp, "irPara").mockImplementation(() => {});
      window.history.pushState({}, "", pagina);

      const sessao = {
        token: "jwt-invalido-ou-expirado",
        tipo: "Bearer" as const,
        usuario: { id: "1001", nome: "Comprador", papel: "COMPRADOR" as const },
      };
      window.localStorage.setItem("origem:sessao", JSON.stringify(sessao));
      sessaoStore.definir(sessao);

      const erroAxios = Object.assign(new Error("Token inválido"), {
        isAxiosError: true,
        config: { url: "http://localhost:4000/comprador/pedidos" },
        response: { status: 401, data: { mensagem: "Sessão inválida." } },
      });
      cliente.defaults.adapter = (async () => {
        throw erroAxios;
      }) as AxiosAdapter;

      await expect(http("/comprador/pedidos")).rejects.toMatchObject({
        status: 401,
        message: "Sessão inválida.",
      });

      expect(window.localStorage.getItem("origem:sessao")).toBeNull();
      expect(sessaoStore.obter()).toBeNull();
      expect(spyNavegacao).not.toHaveBeenCalled();
    },
  );

  test.each([
    "/auth/login",
    "/auth/register",
    "/auth/recuperar-senha",
    "/auth/redefinir-senha",
  ])("401 em %s não dispara redirecionamento de sessão expirada", async (rota) => {
    const spyNavegacao = jest.spyOn(navegacaoHttp, "irPara").mockImplementation(() => {});
    window.history.pushState({}, "", "/conta");

    const erroAxios = Object.assign(new Error("Não autorizado"), {
      isAxiosError: true,
      config: { url: `http://localhost:4000${rota}` },
      response: { status: 401, data: { mensagem: "Credenciais inválidas." } },
    });
    cliente.defaults.adapter = (async () => {
      throw erroAxios;
    }) as AxiosAdapter;

    await expect(http(rota, { metodo: "POST", corpo: {} })).rejects.toMatchObject({
      status: 401,
      message: "Credenciais inválidas.",
    });
    expect(spyNavegacao).not.toHaveBeenCalled();
  });

  test("falha de rede sem response produz ApiError com status 0 e orientação clara", async () => {
    const erroRede = Object.assign(new Error("Network Error"), {
      isAxiosError: true,
      config: { url: "http://localhost:4000/produtos" },
    });
    cliente.defaults.adapter = (async () => {
      throw erroRede;
    }) as AxiosAdapter;

    await expect(http("/produtos")).rejects.toMatchObject({
      status: 0,
      message: "Sem conexao com o backend. Confira se o backend está rodando na porta 4000 e tente de novo.",
    });
  });

  test("urlLoginSessaoExpirada ignora volta inválida ou recursiva e preserva motivo=sessao-expirada", () => {
    expect(urlLoginSessaoExpirada("/entrar?volta=%2Fconta")).toBe(
      "/entrar?motivo=sessao-expirada&volta=%2Fconta",
    );
    expect(urlLoginSessaoExpirada("//externo.com")).toBe("/entrar?motivo=sessao-expirada");
  });
});

describe("Critério 11 · mensagem clara de sessão expirada no FormularioLogin", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mockedUseSessao.mockReturnValue({
      usuario: null,
      entrar: jest.fn(),
      sair: jest.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test("exibe aviso claro quando /entrar abre com motivo=sessao-expirada", async () => {
    window.history.pushState({}, "", "/entrar?motivo=sessao-expirada&volta=%2Fcheckout");

    await act(async () => {
      root.render(React.createElement(FormularioLogin));
    });

    const alerta = container.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain("Sua sessão expirou. Entre novamente para continuar.");
  });
});

describe("Critério 11 · estados de loading, vazio e erro no Carrinho e FluxoCheckout", () => {
  beforeEach(() => {
    mockedUseSessao.mockReturnValue({ usuario: null, pronta: true });
  });

  test("Carrinho exibe skeleton carregando, EstadoErro com Tentar de novo e EstadoVazio", () => {
    mockedUseCarrinho.mockReturnValue({
      carrinho: { itens: [], valorTotal: 0 },
      carregando: true,
      erro: null,
      recarregar: jest.fn(),
      alterarQuantidade: jest.fn(),
      remover: jest.fn(),
    });
    expect(renderToStaticMarkup(<Carrinho />)).toContain("Carregando carrinho");

    mockedUseCarrinho.mockReturnValue({
      carrinho: { itens: [], valorTotal: 0 },
      carregando: false,
      erro: new ApiError(503, "Carrinho indisponível no momento."),
      recarregar: jest.fn(),
      alterarQuantidade: jest.fn(),
      remover: jest.fn(),
    });
    const htmlErro = renderToStaticMarkup(<Carrinho />);
    expect(htmlErro).toContain("Carrinho indisponível no momento.");
    expect(htmlErro).toContain("Tentar de novo");

    mockedUseCarrinho.mockReturnValue({
      carrinho: { itens: [], valorTotal: 0 },
      carregando: false,
      erro: null,
      recarregar: jest.fn(),
      alterarQuantidade: jest.fn(),
      remover: jest.fn(),
    });
    expect(renderToStaticMarkup(<Carrinho />)).toContain("Seu carrinho está vazio");
  });

  test("FluxoCheckout exibe skeleton carregando, EstadoErro em falha de carregamento e EstadoVazio quando realmente vazio", () => {
    const baseCheckout = {
      carrinho: { itens: [], valorTotal: 0 },
      carregando: true,
      erro: null,
      recarregar: jest.fn(),
      cotacao: null,
      cotandoFrete: false,
      erroFrete: null,
      cotarFrete: jest.fn(),
      limparFrete: jest.fn(),
      pedido: null,
      pagamento: null,
      criarPedido: jest.fn(),
      pagar: jest.fn(),
    };

    mockedUseCheckout.mockReturnValue(baseCheckout);
    expect(renderToStaticMarkup(<FluxoCheckout />)).toContain("Carregando checkout");

    mockedUseCheckout.mockReturnValue({
      ...baseCheckout,
      carregando: false,
      erro: new ApiError(0, "Sem conexao com o backend."),
    });
    const htmlErro = renderToStaticMarkup(<FluxoCheckout />);
    expect(htmlErro).toContain("Sem conexao com o backend.");
    expect(htmlErro).toContain("Tentar de novo");
    expect(htmlErro).not.toContain("Não há peças para finalizar");

    mockedUseCheckout.mockReturnValue({
      ...baseCheckout,
      carregando: false,
      erro: null,
    });
    expect(renderToStaticMarkup(<FluxoCheckout />)).toContain("Não há peças para finalizar");
  });
});

describe("F05 · UI ItemCarrinho preserva quantidade anterior quando API rejeita", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    jest.restoreAllMocks();
  });

  test("falha ao reduzir quantidade exibe erro da API no toaster e mantém quantidade anterior visível", async () => {
    const spyToast = jest.spyOn(toaster, "create").mockImplementation(() => "toast-id");
    const aoAlterarQuantidade = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(503, "Falha temporária no servidor."));

    await act(async () => {
      root.render(
        React.createElement(ItemCarrinho, {
          item: {
            produtoId: "2001",
            quantidade: 2,
            precoUnitario: 120,
            nome: "Vaso Raízes",
            imagemPrincipal: "/produtos/vaso.jpg",
          },
          aoAlterarQuantidade,
          aoRemover: jest.fn(),
        }),
      );
    });

    const diminuir = container.querySelector('button[aria-label="Diminuir quantidade"]') as HTMLButtonElement;
    await act(async () => {
      diminuir.click();
    });

    expect(aoAlterarQuantidade).toHaveBeenCalledWith(1);
    expect(spyToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        title: "Não foi possível alterar a quantidade",
        description: "Falha temporária no servidor.",
      }),
    );
    expect(container.querySelector("output")?.textContent).toBe("2");
  });
});
