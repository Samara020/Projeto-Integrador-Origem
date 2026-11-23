// TC09: Medição de desempenho e tempo de resposta/renderização das telas além dos HTTP.
// Critério (Plano de Testes 1.4, Seção TC09): 10 medições independentes por operação
// (catálogo, busca, detalhe), condições semelhantes, média <= 2000ms e nenhuma execução > 4000ms,
// com resultado funcional válido confirmado contra dados da fixture.

describe("TC09 · tempo de resposta e renderização das telas (desempenho)", () => {
  let produto;

  before(() => {
    const tag = `Perf${Date.now()}`;
    cy.criarProdutoAprovado({
      nome: `Peça Desempenho ${tag}`,
      categoria: "Cerâmica",
      preco: 120,
      estoque: 5,
    }).then((p) => {
      produto = p;
    });
  });

  it("catálogo renderiza com sucesso dentro do orçamento de desempenho (10 medições, média <= 2s, max <= 4s)", () => {
    const amostras = [];
    const iteracoes = 10;

    Cypress._.times(iteracoes, (i) => {
      let inicio = 0;
      cy.then(() => {
        inicio = performance.now();
      });
      cy.visit("/catalogo");
      cy.hidratado();
      cy.contains("h1", "Feito à mão, encontrado por você").should("be.visible");
      cy.get(`main a[href="/produto/${produto.id}"]`).should("contain.text", produto.nome);
      cy.then(() => {
        const duracao = Math.round(performance.now() - inicio);
        amostras.push(duracao);
        cy.log(`Amostra catálogo #${i + 1}: ${duracao}ms`);
      });
    });

    cy.then(() => {
      expect(amostras, "Total de 10 amostras coletadas").to.have.length(iteracoes);
      const media = amostras.reduce((s, v) => s + v, 0) / amostras.length;
      const maximo = Math.max(...amostras);
      cy.log(`Catálogo - Amostras brutas (ms): [${amostras.join(", ")}]`);
      cy.log(`Catálogo - Média: ${media.toFixed(1)}ms | Máximo: ${maximo}ms`);
      expect(media, `Tempo médio do catálogo <= 2000ms (obtido: ${media.toFixed(1)}ms)`).to.be.lte(2000);
      expect(maximo, `Tempo máximo do catálogo <= 4000ms (obtido: ${maximo}ms)`).to.be.lte(4000);
    });
  });

  it("busca no catálogo renderiza com sucesso dentro do orçamento de desempenho (10 medições, média <= 2s, max <= 4s)", () => {
    const amostras = [];
    const iteracoes = 10;

    Cypress._.times(iteracoes, (i) => {
      let inicio = 0;
      cy.then(() => {
        inicio = performance.now();
      });
      cy.visit(`/catalogo?termo=${encodeURIComponent(produto.nome)}`);
      cy.hidratado();
      cy.contains('p[aria-live="polite"]', "1 peça encontrada").should("be.visible");
      cy.get(`main a[href="/produto/${produto.id}"]`).should("contain.text", produto.nome);
      cy.then(() => {
        const duracao = Math.round(performance.now() - inicio);
        amostras.push(duracao);
        cy.log(`Amostra busca #${i + 1}: ${duracao}ms`);
      });
    });

    cy.then(() => {
      expect(amostras, "Total de 10 amostras coletadas").to.have.length(iteracoes);
      const media = amostras.reduce((s, v) => s + v, 0) / amostras.length;
      const maximo = Math.max(...amostras);
      cy.log(`Busca - Amostras brutas (ms): [${amostras.join(", ")}]`);
      cy.log(`Busca - Média: ${media.toFixed(1)}ms | Máximo: ${maximo}ms`);
      expect(media, `Tempo médio da busca <= 2000ms (obtido: ${media.toFixed(1)}ms)`).to.be.lte(2000);
      expect(maximo, `Tempo máximo da busca <= 4000ms (obtido: ${maximo}ms)`).to.be.lte(4000);
    });
  });

  it("detalhe do produto renderiza com sucesso dentro do orçamento de desempenho (10 medições, média <= 2s, max <= 4s)", () => {
    const amostras = [];
    const iteracoes = 10;

    Cypress._.times(iteracoes, (i) => {
      let inicio = 0;
      cy.then(() => {
        inicio = performance.now();
      });
      cy.visit(`/produto/${produto.id}`);
      cy.hidratado();
      cy.contains("h1", produto.nome).should("be.visible");
      cy.contains("R$ 120,00").should("be.visible");
      cy.contains("button", "Adicionar ao carrinho").should("be.visible");
      cy.then(() => {
        const duracao = Math.round(performance.now() - inicio);
        amostras.push(duracao);
        cy.log(`Amostra detalhe #${i + 1}: ${duracao}ms`);
      });
    });

    cy.then(() => {
      expect(amostras, "Total de 10 amostras coletadas").to.have.length(iteracoes);
      const media = amostras.reduce((s, v) => s + v, 0) / amostras.length;
      const maximo = Math.max(...amostras);
      cy.log(`Detalhe do produto - Amostras brutas (ms): [${amostras.join(", ")}]`);
      cy.log(`Detalhe do produto - Média: ${media.toFixed(1)}ms | Máximo: ${maximo}ms`);
      expect(media, `Tempo médio do detalhe <= 2000ms (obtido: ${media.toFixed(1)}ms)`).to.be.lte(2000);
      expect(maximo, `Tempo máximo do detalhe <= 4000ms (obtido: ${maximo}ms)`).to.be.lte(4000);
    });
  });
});
