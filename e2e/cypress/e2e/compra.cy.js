// TC04, TC06, TC07, TC10 e TC13: carrinho, checkout, frete e pedidos no backend real + Postgres.

function adicionarPelaTela(produto) {
  cy.visit(`/produto/${produto.id}`);
  cy.hidratado();
  cy.contains("h1", produto.nome).should("be.visible");
  cy.contains("button", "Adicionar ao carrinho").click();
  cy.contains('[role="status"]', "Peça no carrinho").should("be.visible");
}

function preencherEntrega() {
  cy.get("#checkout-cep").type("50030230");
  cy.get("#checkout-numero").type("100");
  cy.get("#checkout-rua").type("Rua da Aurora");
  // Garante que a cotação de frete da API real apareceu antes de seguir.
  cy.contains("Origem Econômico").should("be.visible");
}

describe("TC04 · adição e remoção de produto no carrinho", () => {
  let produto;

  before(() => {
    cy.criarProdutoAprovado({ nome: `Peça Carrinho ${Date.now()}`, preco: 70, estoque: 5 }).then(
      (p) => {
        produto = p;
      },
    );
  });

  it("adiciona pela página da peça e remove na tela do carrinho", () => {
    adicionarPelaTela(produto);

    cy.get('a[aria-label="Carrinho com 1 item"]').click();
    cy.location("pathname").should("eq", "/carrinho");
    cy.contains("1 peça escolhida").should("be.visible");
    cy.contains("article", produto.nome).should("be.visible");
    cy.contains("aside", "Subtotal").contains("R$ 70,00").should("be.visible");

    cy.contains("article", produto.nome).contains("button", "Remover").click();

    cy.contains("Seu carrinho está vazio").should("be.visible");
    cy.get('a[aria-label="Carrinho vazio"]').should("exist");
    cy.lerLocal("carrinho").should("deep.equal", []);
  });
});

describe("TC06, TC07, TC10 e TC13 · finalização da compra e persistência no banco", () => {
  let produto;

  before(() => {
    cy.criarProdutoAprovado({ nome: `Peça Compra ${Date.now()}`, preco: 70, estoque: 10 }).then(
      (p) => {
        produto = p;
      },
    );
  });

  it("comprador logado cota frete, compra com Pix e acompanha o pedido pago no histórico", () => {
    const apiUrl = (Cypress.env("API_URL") || "http://localhost:4000").replace(/\/$/, "");
    cy.intercept("POST", `${apiUrl}/painel/envios/cotacao`).as("cotacao");
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`);
    cy.contains("button", "Adicionar ao carrinho").click();
    cy.contains('[role="status"]', "Peça no carrinho").should("be.visible");

    cy.visit("/carrinho");
    cy.hidratado();
    cy.contains("a", "Finalizar compra").click();
    cy.location("pathname").should("eq", "/checkout");
    cy.contains("h1", "Entrega").should("be.visible");

    preencherEntrega();
    cy.wait("@cotacao").then(({ response }) => {
      const frete = Number(response.body.valor);
      const totalEsperado = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(produto.preco + frete);

      cy.contains("button", "Ir para pagamento").click();
      cy.contains("h1", "Pagamento").should("be.visible");
      cy.contains(totalEsperado).should("be.visible");

      cy.contains('[role="group"][aria-label="Método de pagamento"] button', "Pix").click();
      cy.contains("button", "Pagar agora").click();

      cy.contains("h1", "Pagamento confirmado").should("be.visible");
      cy.contains("Total pago").parent().contains(totalEsperado).should("be.visible");
    });

    cy.get("dd")
      .first()
      .invoke("text")
      .then((pedidoId) => {
        const idLimpo = pedidoId.trim();
        expect(idLimpo).to.match(/^\d+$/);

        cy.visit("/conta");
        cy.hidratado();
        cy.contains("h1", "Compras realizadas").should("be.visible");
        cy.contains(`PEDIDO #${idLimpo}`).should("be.visible");

        cy.visit(`/conta/pedidos/${idLimpo}`);
        cy.hidratado();
        cy.contains("h1", "Detalhes da compra").should("be.visible");
        cy.contains("span", /^Pago$/).should("be.visible");
        cy.contains(produto.nome).should("be.visible");
      });
  });

  it("cartão de crédito válido paga o pedido e dados inválidos são barrados", () => {
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`);
    cy.contains("button", "Adicionar ao carrinho").click();
    cy.contains('[role="status"]', "Peça no carrinho").should("be.visible");

    cy.visit("/checkout");
    cy.hidratado();
    preencherEntrega();
    cy.contains("button", "Ir para pagamento").click();
    cy.contains("h1", "Pagamento").should("be.visible");

    cy.get("#pagamento-numero").type("4111");
    cy.contains("button", "Pagar agora").click();
    cy.get("#pagamento-numero-erro").should("have.text", "Digite os 16 números do cartão.");
    cy.get("#pagamento-cvv-erro").should("have.text", "Digite o código de segurança.");
    cy.contains("h1", "Pagamento confirmado").should("not.exist");

    cy.get("#pagamento-numero").clear().type("4111111111111111");
    cy.get("#pagamento-nome").type("Joana Compradora");
    cy.get("#pagamento-validade").type("1230");
    cy.get("#pagamento-cvv").type("123");
    cy.contains("button", "Pagar agora").click();

    cy.contains("h1", "Pagamento confirmado").should("be.visible");
  });

  it("endereço incompleto não cria pedido", () => {
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`);
    cy.contains("button", "Adicionar ao carrinho").click();
    cy.contains('[role="status"]', "Peça no carrinho").should("be.visible");

    cy.visit("/checkout");
    cy.hidratado();
    cy.get("#checkout-cep").type("5003");
    cy.contains("button", "Ir para pagamento").click();

    cy.get("#checkout-cep-erro").should("have.text", "Digite um CEP válido.");
    cy.get("#checkout-numero-erro").should("have.text", "Digite o número.");
    cy.get("#checkout-rua-erro").should("have.text", "Digite o nome da rua.");
    cy.location("pathname").should("eq", "/checkout");
    cy.contains("h1", "Entrega").should("be.visible");
  });

  it("duplo clique em 'Ir para pagamento' e 'Pagar agora' gera apenas um pedido", () => {
    const apiUrl = (Cypress.env("API_URL") || "http://localhost:4000").replace(/\/$/, "");
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`).then((sessao) => {
      cy.contains("button", "Adicionar ao carrinho").click();
      cy.contains('[role="status"]', "Peça no carrinho").should("be.visible");

      cy.visit("/checkout");
      cy.hidratado();
      preencherEntrega();

      cy.contains("button", "Ir para pagamento").dblclick();
      cy.contains("h1", "Pagamento").should("be.visible");
      cy.contains('[role="group"][aria-label="Método de pagamento"] button', "Pix").click();
      cy.contains("button", "Pagar agora").dblclick();
      cy.contains("h1", "Pagamento confirmado").should("be.visible");

      cy.request({
        method: "GET",
        url: `${apiUrl}/comprador/pedidos`,
        headers: { Authorization: `Bearer ${sessao.token}` },
      }).then(({ body }) => {
        expect(body.pedidos).to.have.length(1);
        expect(body.pedidos[0].status).to.equal("PAGO");
      });
    });
  });
});
