/**
 * @jest-environment jsdom
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import NovaPecaArtesao from "@/components/painel/NovaPecaArtesao";
import { useCategorias, useTecnicas } from "@/hooks/useCatalogo";
import { useAcoesArtesao, useRascunhoPeca } from "@/hooks/usePainelArtesao";
import { useSessao } from "@/hooks/useSessao";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/components/ui/toaster", () => ({
  toaster: { create: jest.fn() },
}));

jest.mock("@/hooks/useCatalogo", () => ({
  useCategorias: jest.fn(),
  useTecnicas: jest.fn(),
}));

jest.mock("@/hooks/usePainelArtesao", () => ({
  useRascunhoPeca: jest.fn(),
  useAcoesArtesao: jest.fn(),
}));

jest.mock("@/hooks/useSessao", () => ({
  useSessao: jest.fn(),
}));

function alterarInput(elemento: HTMLInputElement | HTMLSelectElement, valor: string) {
  const prototipo =
    elemento instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototipo, "value");
  descriptor?.set?.call(elemento, valor);
  elemento.dispatchEvent(new Event("input", { bubbles: true }));
  elemento.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("NovaPecaArtesao · regressões de categoria e campos numéricos decimais", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();

    (useRascunhoPeca as jest.Mock).mockReturnValue({ dados: null });
    (useCategorias as jest.Mock).mockReturnValue({
      dados: [
        { id: "1001", nome: "Arte e Decoração" },
        { id: "1002", nome: "Artesanato" },
        { id: "1003", nome: "Literatura" },
      ],
    });
    (useTecnicas as jest.Mock).mockReturnValue({
      dados: [
        { id: "Cerâmica", nome: "Cerâmica" },
        { id: "Xilogravura", nome: "Xilogravura" },
      ],
    });
    (useSessao as jest.Mock).mockReturnValue({
      usuario: { id: "1", nome: "Mestre Vitalino", papel: "ARTESAO" },
    });
    (useAcoesArtesao as jest.Mock).mockReturnValue({
      criarPeca: jest.fn(),
      salvarRascunho: jest.fn(),
      salvando: null,
      erro: null,
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test("categoria inicia com placeholder vazio e escolher 'Arte e Decoração' é reconhecido na validação", async () => {
    await act(async () => {
      root.render(React.createElement(NovaPecaArtesao));
    });

    const selectCategoria = container.querySelector<HTMLSelectElement>("#categoria")!;
    const selectTecnica = container.querySelector<HTMLSelectElement>("#tecnica")!;
    expect(selectCategoria.options[0].value).toBe("");
    expect(selectCategoria.options[1].value).toBe("Arte e Decoração");
    expect(selectTecnica.options[0].value).toBe("");
    expect(selectTecnica.options[1].value).toBe("Cerâmica");

    await act(async () => {
      alterarInput(selectCategoria, "Arte e Decoração");
      alterarInput(selectTecnica, "Cerâmica");
    });

    expect(selectCategoria.value).toBe("Arte e Decoração");
    expect(selectTecnica.value).toBe("Cerâmica");

    const form = container.querySelector<HTMLFormElement>("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).not.toContain("Escolha a categoria.");
    expect(container.textContent).not.toContain("Escolha a técnica.");
  });

  test("campos de peso e preço aceitam decimais (0.5, 1.25, 129.90), preservam '0' e expõem step decimal para setas", async () => {
    await act(async () => {
      root.render(React.createElement(NovaPecaArtesao));
    });

    const inputPeso = container.querySelector<HTMLInputElement>("#peso")!;
    const inputPreco = container.querySelector<HTMLInputElement>("#preco")!;
    const inputEstoque = container.querySelector<HTMLInputElement>("#estoque")!;

    expect(inputPeso.getAttribute("step")).toBe("0.01");
    expect(inputPreco.getAttribute("step")).toBe("0.01");
    expect(inputEstoque.getAttribute("step")).toBe("1");

    // Digitar "0" não apaga o campo (permite digitar 0.5 e usar setas)
    await act(async () => {
      alterarInput(inputPeso, "0");
    });
    expect(inputPeso.value).toBe("0");

    await act(async () => {
      alterarInput(inputPeso, "0.5");
      alterarInput(inputPreco, "129.90");
      alterarInput(inputEstoque, "0");
    });
    expect(inputPeso.value).toBe("0.5");
    expect(inputPreco.value).toBe("129.90");
    expect(inputEstoque.value).toBe("0");
    expect(container.textContent).toContain("R$");
    expect(container.textContent).toContain("129,90");

    await act(async () => {
      alterarInput(inputPeso, "1.25");
      alterarInput(inputEstoque, "3");
    });
    expect(inputPeso.value).toBe("1.25");
    expect(inputEstoque.value).toBe("3");

    const form = container.querySelector<HTMLFormElement>("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).not.toContain("Informe o peso em kg.");
    expect(container.textContent).not.toContain("Informe o preço.");
    expect(container.textContent).not.toContain("Tenha pelo menos uma peça pronta.");
  });
});
