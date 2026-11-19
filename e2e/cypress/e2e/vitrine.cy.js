// TC03 e TC05: vitrine, busca e disponibilidade das peças contra backend real + Postgres.

describe("TC03 · exibição e busca de produtos disponíveis", () => {
  let disponivel;
  let vendida;

  before(() => {
    const tag = `VitE2E${Date.now()}`;
    cy.criarProdutoAprovado({
      nome: `Pássaro ${tag}`,
      preco: 70,
      estoque: 4,
    }).then((p) => {
      disponivel = p;
    });
    cy.criarProdutoAprovado({
      nome: `Matriz Vendida ${tag}`,
      preco: 250,
      modalidadeProducao: "PECA_UNICA",
      estoque: 0,
    }).then((p) => {
      vendida = p;
    });
  });

  it("a vitrine da home mostra peças reais com link, sem itens vendidos", () => {
    cy.visit("/");
    cy.hidratado();

    cy.contains("h2", "Peças que contam").parents("section").first().as("destaques");
    cy.get("@destaques").find('a[href^="/produto/"]').should("have.length.greaterThan", 0);
    cy.get("@destaques").contains(/reservad|vendid/i).should("not.exist");
  });

  it("busca pelo cabeçalho leva ao catálogo com a peça encontrada", () => {
    cy.visit("/");
    cy.hidratado();

    cy.get("#busca-header").type(`${disponivel.nome}{enter}`);

    cy.location("pathname").should("eq", "/catalogo");
    cy.contains('p[aria-live="polite"]', "1 peça encontrada").should("be.visible");
    cy.get(`main a[href="/produto/${disponivel.id}"]`).should("contain.text", disponivel.nome);
  });

  it("busca sem resultado mostra o estado vazio com saída", () => {
    cy.visit("/catalogo?termo=porcelana-inexistente-e2e");
    cy.hidratado();

    cy.contains('p[aria-live="polite"]', "0 peças encontradas").should("be.visible");
    cy.contains("Nenhuma peça com esses filtros").should("be.visible");
    cy.contains("button", "Limpar filtros").should("be.visible");
  });

  it("busca por peça vendida não exibe produtos indisponíveis no catálogo", () => {
    cy.visit(`/catalogo?termo=${encodeURIComponent(vendida.nome)}`);
    cy.hidratado();

    cy.contains(vendida.nome).should("not.exist");
    cy.contains('p[aria-live="polite"]', "0 peças encontradas").should("be.visible");
  });

  it("detalhe de peça disponível mostra nome, preço e compra liberada", () => {
    cy.visit(`/produto/${disponivel.id}`);
    cy.hidratado();

    cy.contains("h1", disponivel.nome).should("be.visible");
    cy.contains("R$ 70,00").should("be.visible");
    cy.contains("Disponível").should("be.visible");
    cy.contains("button", "Adicionar ao carrinho").should("be.enabled");
  });

  it("TC18 · abre o perfil público do artesão a partir do detalhe e combina/limpa filtros no catálogo", () => {
    cy.visit(`/produto/${disponivel.id}`);
    cy.hidratado();

    cy.get(`a[href="/artesao/${disponivel.artesao.usuario.id}"]`).click();
    cy.location("pathname").should("eq", `/artesao/${disponivel.artesao.usuario.id}`);
    cy.contains("h1", disponivel.artesao.usuario.nome).should("be.visible");
    cy.contains(disponivel.nome).should("be.visible");

    cy.visit(`/catalogo?termo=${encodeURIComponent(disponivel.nome)}&disponivel=true`);
    cy.hidratado();
    cy.contains('p[aria-live="polite"]', "1 peça encontrada").should("be.visible");

    cy.contains("button", /Limpar \d+ filtros?/).click();
    cy.location("search").should("eq", "");
  });
});

describe("TC05 · peça indisponível não entra no carrinho", () => {
  let vendida;

  before(() => {
    cy.criarProdutoAprovado({
      nome: `Peça Esgotada E2E ${Date.now()}`,
      preco: 210,
      modalidadeProducao: "PECA_UNICA",
      estoque: 0,
    }).then((p) => {
      vendida = p;
    });
  });

  it("no detalhe da peça vendida não há botão de compra", () => {
    cy.visit(`/produto/${vendida.id}`);
    cy.hidratado();

    cy.contains("h1", vendida.nome).should("be.visible");
    cy.contains("Vendida").should("be.visible");
    cy.contains("Esta peça não pode ser comprada agora.").should("be.visible");
    cy.contains("button", "Adicionar ao carrinho").should("not.exist");
    cy.contains("button", "Comprar agora").should("not.exist");
  });
});
