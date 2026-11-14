import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuardaPapel } from "@/components/seguranca/GuardaPapel";
import { useSessao } from "@/hooks/useSessao";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => "/painel/artesao/pecas/nova",
}));

jest.mock("@/hooks/useSessao", () => ({
  useSessao: jest.fn(),
}));

describe("GuardaPapel (TC08 · controle de acesso no frontend)", () => {
  const segredo = "FORMULARIO_CONFIDENCIAL_DE_PECA";

  test("quando não está pronto ou não autenticado, NÃO renderiza children confidenciais", () => {
    (useSessao as jest.Mock).mockReturnValue({
      usuario: null,
      pronta: false,
      sessao: null,
    });

    const elemento = (
      <GuardaPapel papel="ARTESAO">
        <button>{segredo}</button>
      </GuardaPapel>
    );

    const html = renderToStaticMarkup(elemento);

    expect(html).not.toContain(segredo);
    expect(html).toContain("Verificando permissões de acesso");
  });

  test("quando COMPRADOR tenta acessar rota de ARTESAO, NÃO renderiza children e exibe alerta de área restrita", () => {
    (useSessao as jest.Mock).mockReturnValue({
      usuario: { id: "usr_101", nome: "Joana", papel: "COMPRADOR" },
      pronta: true,
      sessao: { token: "token", tipo: "Bearer", usuario: { id: "usr_101", nome: "Joana", papel: "COMPRADOR" } },
    });

    const elemento = (
      <GuardaPapel papel="ARTESAO">
        <button>{segredo}</button>
      </GuardaPapel>
    );

    const html = renderToStaticMarkup(elemento);

    expect(html).not.toContain(segredo);
    expect(html).toContain("Área restrita");
    expect(html).toContain("Você não tem permissão para acessar esta área com seu perfil atual.");
  });

  test("quando ARTESAO acessa rota de ARTESAO, renderiza os children normalmente", () => {
    (useSessao as jest.Mock).mockReturnValue({
      usuario: { id: "usr_901", nome: "Ana Pereira", papel: "ARTESAO" },
      pronta: true,
      sessao: { token: "token", tipo: "Bearer", usuario: { id: "usr_901", nome: "Ana Pereira", papel: "ARTESAO" } },
    });

    const elemento = (
      <GuardaPapel papel="ARTESAO">
        <button>{segredo}</button>
      </GuardaPapel>
    );

    const html = renderToStaticMarkup(elemento);

    expect(html).toContain(segredo);
    expect(html).not.toContain("Área restrita");
  });
});
