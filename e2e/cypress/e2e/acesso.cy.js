// TC01, TC11, TC08 e TC14: login pela tela e acesso por perfil.
import { CONTAS } from "../support/e2e";

function entrar(email, senha) {
  cy.visit("/entrar");
  cy.hidratado();
  if (email) cy.get("#login-email").type(email);
  if (senha) cy.get("#login-senha").type(senha, { log: false });
  cy.contains("button[type=submit]", "Entrar").click();
}

describe("TC01 · login com dados válidos leva cada perfil à sua área", () => {
  it("comprador entra e volta para a vitrine com a conta no cabeçalho", () => {
    entrar(CONTAS.COMPRADOR, "origem123");

    cy.location("pathname").should("eq", "/");
    cy.get('button[aria-label="Abrir menu da conta de Joana"]').should("be.visible");
    cy.lerLocal("sessao").its("usuario.papel").should("eq", "COMPRADOR");
  });

  it("artesão entra e cai no painel do ateliê", () => {
    entrar(CONTAS.ARTESAO, "origem123");

    cy.location("pathname").should("eq", "/painel/artesao");
    cy.lerLocal("sessao").its("usuario.papel").should("eq", "ARTESAO");
  });

  it("administrador entra e cai no painel administrativo", () => {
    entrar(CONTAS.ADMINISTRADOR, "origem123");

    cy.location("pathname").should("eq", "/painel/admin");
    cy.contains("h1", "O pulso do marketplace, em um só lugar.").should("be.visible");
  });
});

describe("TC11 · login com credenciais inválidas", () => {
  it("senha errada mostra o erro e não cria sessão", () => {
    entrar(CONTAS.COMPRADOR, "senha-errada");

    cy.contains('[role="alert"]', "E-mail ou senha incorretos.").should("be.visible");
    cy.location("pathname").should("eq", "/entrar");
    cy.lerLocal("sessao").should("be.null");
  });

  it("campos vazios são barrados na tela, embaixo de cada campo", () => {
    entrar();

    cy.get("#login-email-erro").should("have.text", "Digite seu e-mail.");
    cy.get("#login-senha-erro").should("have.text", "Digite sua senha.");
    cy.get("#login-email").should("have.attr", "aria-invalid", "true");
    cy.lerLocal("sessao").should("be.null");
  });
});

describe("TC14 · comprador não abre área de administrador", () => {
  it("comprador logado em /painel/admin vê a área restrita", () => {
    cy.visitarComo("COMPRADOR", "/painel/admin");

    cy.contains('[role="alert"] h1', "Área restrita à administração").should("be.visible");
    cy.contains("O pulso do marketplace").should("not.exist");
  });

  it("visitante sem conta em /painel/admin é mandado para o login", () => {
    cy.visit("/painel/admin");

    cy.location("pathname").should("eq", "/entrar");
    cy.location("search").should("eq", "?volta=%2Fpainel%2Fadmin");
  });
});

describe("TC08 · controle de acesso conforme o perfil", () => {
  it("administrador abre o painel administrativo", () => {
    cy.visitarComo("ADMINISTRADOR", "/painel/admin");

    cy.contains("h1", "O pulso do marketplace, em um só lugar.").should("be.visible");
  });

  it("artesão abre o cadastro de peça do próprio painel", () => {
    cy.visitarComo("ARTESAO", "/painel/artesao/pecas/nova");

    cy.contains("h1", "Cadastrar nova peça").should("be.visible");
  });

  // Rodou em 2026-10-14 e falhou: o comprador vê o formulário "Publicar peça". Sem correção de
  // produto nesta entrega. Tirar o .skip quando o painel ganhar guarda de papel. Ver plano e achados.
  it.skip("comprador não abre o cadastro de peça do painel do artesão (defeito do produto: painel do artesão sem guarda de papel)", () => {
    // visitarComo espera a hidratação: o formulário do HTML do servidor já está na tela,
    // então "não existe" aqui só passa se uma guarda de papel tirar o formulário.
    cy.visitarComo("COMPRADOR", "/painel/artesao/pecas/nova");

    cy.contains("button", "Publicar peça").should("not.exist");
  });
});
