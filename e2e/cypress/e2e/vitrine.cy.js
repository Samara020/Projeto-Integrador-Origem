// TC03 e TC05: vitrine, busca e disponibilidade das peças.

describe("TC03 · exibição e busca de produtos disponíveis", () => {
  it("a vitrine da home mostra peças com link, e nenhuma reservada ou vendida", () => {
    cy.visit("/");
    cy.hidratado();

    cy.contains("h2", "Peças que contam").parents("section").first().as("destaques");
    cy.get("@destaques").find('a[href^="/produto/prd_"]').should("have.length.greaterThan", 0);
    cy.get("@destaques").contains(/reservad|vendid/i).should("not.exist");
  });

  it("busca pelo cabeçalho leva ao catálogo com as peças encontradas", () => {
    cy.visit("/");
    cy.hidratado();

    cy.get("#busca-header").type("cordel{enter}");

    cy.location("pathname").should("eq", "/catalogo");
    cy.location("search").should("eq", "?termo=cordel");
    cy.contains('p[aria-live="polite"]', "2 peças encontradas").should("be.visible");
    cy.get('main a[href="/produto/prd_209"]').should("contain.text", "Folheto O Vaqueiro e a Lua");
    cy.get('main a[href="/produto/prd_210"]').should("contain.text", "Coleção Pajeú em Versos");
  });

  it("busca sem resultado mostra o estado vazio com saída", () => {
    cy.visit("/catalogo?termo=porcelana");
    cy.hidratado();

    cy.contains('p[aria-live="polite"]', "0 peças encontradas").should("be.visible");
    cy.contains("Nenhuma peça com esses filtros").should("be.visible");
    cy.contains("button", "Limpar filtros").should("be.visible");
  });

  it("filtro 'Só peças disponíveis' tira a peça reservada da busca", () => {
    cy.visit("/catalogo?termo=carranca");
    cy.hidratado();
    cy.contains('p[aria-live="polite"]', "1 peça encontrada").should("be.visible");

    cy.contains("label", "Só peças disponíveis").click();

    cy.location("search").should("contain", "disponivel=true");
    cy.contains('p[aria-live="polite"]', "0 peças encontradas").should("be.visible");
  });

  it("detalhe de peça disponível mostra nome, preço e compra liberada", () => {
    cy.visit("/produto/prd_203");
    cy.hidratado();

    cy.contains("h1", "Pássaro de Madeira").should("be.visible");
    cy.contains("R$ 70,00").should("be.visible");
    cy.contains("Disponível").should("be.visible");
    cy.contains("button", "Adicionar ao carrinho").should("be.enabled");
  });
});

describe("TC05 · peça indisponível não entra no carrinho", () => {
  it("no catálogo, o botão de carrinho da peça reservada fica desabilitado", () => {
    cy.visit("/catalogo?termo=carranca");
    cy.hidratado();

    cy.get('button[aria-label="Carranca Guardiã não está disponível"]').should("be.disabled");
    cy.contains("Reservado", { matchCase: false }).should("be.visible");
  });

  it("no detalhe da peça vendida não há botão de compra", () => {
    cy.visit("/produto/prd_208");
    cy.hidratado();

    cy.contains("h1", "Matriz Entalhada Pavão").should("be.visible");
    cy.contains("Vendida").should("be.visible");
    cy.contains("Esta peça não pode ser comprada agora.").should("be.visible");
    cy.contains("button", "Adicionar ao carrinho").should("not.exist");
    cy.contains("button", "Comprar agora").should("not.exist");
  });
});
