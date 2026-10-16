// TC02 e TC12: cadastro de peça pelo artesão, com e sem os campos obrigatórios.

const NOME = "Bordado de Teste E2E";

function abrirCadastro() {
  cy.visitarComo("ARTESAO", "/painel/artesao/pecas/nova");
  cy.contains("h1", "Cadastrar nova peça").should("be.visible");
  // As opções de categoria e técnica chegam da Fake API depois de ~400 ms.
  cy.get("#categoria option").should("have.length.greaterThan", 1);
  cy.get("#tecnica option").should("have.length.greaterThan", 1);
}

describe("TC12 · cadastro de produto sem campos obrigatórios", () => {
  it("publicar vazio mostra o erro de cada campo obrigatório e não grava nada", () => {
    abrirCadastro();

    cy.contains("button", "Publicar peça").click();

    cy.contains('[role="status"]', "Faltam campos para publicar").should("be.visible");
    for (const mensagem of [
      "Dê um nome à peça.",
      "Escolha a categoria.",
      "Conte a história da peça em pelo menos 20 caracteres.",
      "Escolha a técnica.",
      "Informe o material.",
      "Informe as dimensões.",
      "Informe o peso em kg.",
      "Informe o preço.",
      "Conte de onde vem a peça.",
      "Adicione ao menos uma foto.",
    ]) {
      cy.contains(mensagem).should("be.visible");
    }
    cy.location("pathname").should("eq", "/painel/artesao/pecas/nova");
    cy.lerLocal("painel-artesao:pecas:novas").should("be.null");
  });

  it("descrição com 19 caracteres é recusada (valor-limite de 20)", () => {
    abrirCadastro();

    cy.get("#descricao").type("1234567890123456789");
    cy.contains("button", "Publicar peça").click();

    cy.contains("Conte a história da peça em pelo menos 20 caracteres.").should("be.visible");
  });
});

describe("TC02 · cadastro de produto com dados obrigatórios", () => {
  it("artesão publica a peça e ela aparece no topo do estoque", () => {
    abrirCadastro();

    cy.get("#nome").type(NOME);
    cy.get("#categoria").select("Arte e Decoração");
    cy.get("#descricao").type("Pano bordado à mão para o teste automatizado do Origem.");
    cy.get("#tecnica").select("Bordado");
    cy.get("#material").type("Linho e linha de algodão");
    cy.get("#dimensoes").type("40 x 40 cm");
    cy.get("#peso").type("1");
    cy.get("#preco").type("90");
    cy.get("#estoque").clear().type("5");
    cy.get("#informacoes-origem").type("Bordado em Passira, Agreste de Pernambuco.");
    cy.get("#fotos-peca").selectFile("cypress/fixtures/peca.png", { force: true });
    cy.get('img[alt="Foto 1 da peça"]').should("be.visible");

    cy.contains("button", "Publicar peça").click();

    cy.contains('[role="status"]', "Peça enviada para validação").should("be.visible");
    cy.location("pathname").should("eq", "/painel/artesao/estoque");
    cy.contains("h1", "Gestão de estoque").should("be.visible");
    cy.get("tbody tr")
      .first()
      .within(() => {
        // Colunas: Produto (th), SKU, Estoque, Status, Ações.
        cy.get('th[scope="row"]').should("contain.text", NOME);
        cy.get("td").eq(0).invoke("text").should("match", /^\s*ORG-NOV-400\s*$/);
        cy.get("td").eq(1).invoke("text").should("match", /^\s*5\s*$/);
        cy.get("td").eq(2).should("contain.text", "Ativo");
      });
    cy.lerLocal("painel-artesao:pecas:novas").then((pecas) => {
      expect(pecas[0]).to.include({ nome: NOME, sku: "ORG-NOV-400", estoque: 5, situacao: "ATIVO" });
    });
  });
});
