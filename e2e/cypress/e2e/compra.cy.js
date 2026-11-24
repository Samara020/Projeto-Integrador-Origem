// TC05, TC06, TC10, TC13, TC19, TC20 e Card 18 Itens 8, 9: carrinho, checkout, frete, pedidos e persistência no backend real + Postgres.

const ALLOWED_API_ORIGINS = new Set([
  "http://localhost:4200",
  "http://127.0.0.1:4200",
]);

function getApiUrl() {
  const url = (
    Cypress.expose("API_URL") ||
    "http://localhost:4200"
  ).replace(/\/$/, "");

  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    origin = url;
  }

  if (url.includes(":4000") || url.includes(":3000")) {
    throw new Error(
      "[E2E Proteção] Execução bloqueada: proibido apontar para as portas do runtime principal (:3000 / :4000). Use o ambiente descartável (:4200).",
    );
  }

  if (!ALLOWED_API_ORIGINS.has(origin)) {
    throw new Error(
      `[E2E Proteção] Execução bloqueada: a API aponta para ${url} (origin ${origin}), fora da allowlist autorizada (${Array.from(ALLOWED_API_ORIGINS).join(", ")}).`,
    );
  }

  return url;
}

function adicionarPelaTela(produto) {
  cy.visit(`/produto/${produto.id}`);
  cy.hidratado();
  cy.contains("h1", produto.nome).should("be.visible");
  cy.contains("button", "Adicionar ao carrinho").click();
  cy.contains('[role="status"]', "Peça no carrinho").should("be.visible");
}

function adicionarComoComprador() {
  const apiUrl = getApiUrl();
  cy.intercept("POST", `${apiUrl}/carrinho/itens`).as("adicionarItemCarrinho");
  cy.contains("button", "Adicionar ao carrinho").click();
  cy.wait("@adicionarItemCarrinho").then(({ response }) => {
    expect(response?.statusCode).to.be.oneOf([200, 201]);
  });
  cy.get('a[aria-label="Carrinho com 1 item"]').should("be.visible");
}

function preencherEntrega() {
  cy.get("#checkout-cep").type("50030230");
  cy.get("#checkout-numero").type("100");
  cy.get("#checkout-rua").type("Rua da Aurora");
  // Garante que a cotação de frete da API real apareceu antes de seguir.
  cy.contains("Origem Econômico").should("be.visible");
}

describe("TC19 / Card 18 Item 8 · adição e remoção de produto no carrinho", () => {
  let produto;

  before(() => {
    cy.criarProdutoAprovado({ nome: `Peça Carrinho ${Date.now()}`, preco: 70, estoque: 5 }).then(
      (p) => {
        produto = p;
      },
    );
  });

  it("adiciona pela página da peça e remove na tela do carrinho @smoke", () => {
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

describe("TC06 / TC13 / Card 18 Item 9 · finalização da compra e persistência no banco", () => {
  let produto;

  before(() => {
    cy.criarProdutoAprovado({ nome: `Peça Compra ${Date.now()}`, preco: 70, estoque: 10 }).then(
      (p) => {
        produto = p;
      },
    );
  });

  it("comprador logado cota frete, compra com Pix e acompanha o pedido pago no histórico @smoke", () => {
    const apiUrl = getApiUrl();
    cy.intercept("POST", `${apiUrl}/envios/cotacao`).as("cotacao");
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`);
    adicionarComoComprador();

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
      }).format(produto.preco + frete).replace(/\u00a0/g, " ");

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
        // O histórico mostra o número do pedido na conta do comprador ("SEU PEDIDO #n"),
        // não o id global. O cartão certo é o que leva ao detalhe deste id.
        cy.get(`a[href="/conta/pedidos/${idLimpo}"]`)
          .first()
          .closest("article")
          .contains(/^SEU PEDIDO #\d+$/)
          .should("be.visible");

        cy.visit(`/conta/pedidos/${idLimpo}`);
        cy.hidratado();
        cy.contains("h1", "Detalhes da compra").should("be.visible");
        cy.contains("span", /^Pago$/).should("be.visible");
        cy.contains(produto.nome).should("be.visible");
      });
  });

  it("cartão de crédito válido paga o pedido e dados inválidos são barrados", () => {
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`);
    adicionarComoComprador();

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
    adicionarComoComprador();

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
    const apiUrl = getApiUrl();
    cy.visitarComo("COMPRADOR", `/produto/${produto.id}`).then((sessao) => {
      adicionarComoComprador();

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

  it("TC06 / Card 18 Itens 7, 8 e 9 · fluxo integrado: cadastro de novo usuário -> adicionar item -> atualizar quantidade atômica -> frete -> checkout -> histórico", () => {
    const apiUrl = getApiUrl();
    const timestamp = Date.now();
    const email = `novo.comprador.${timestamp}@origem-teste.dev`;
    const senha = "SenhaSegura123";

    cy.intercept("PUT", `${apiUrl}/carrinho/itens/*`).as("atualizarQuantidade");
    cy.intercept("POST", `${apiUrl}/envios/cotacao`).as("cotacaoFrete");

    // 1. Cadastro de novo comprador
    cy.visit("/cadastro");
    cy.hidratado();
    cy.get("#cadastro-nome").type("Comprador Fluxo Completo");
    cy.get("#cadastro-email").type(email);
    cy.get("#cadastro-senha").type(senha, { log: false });
    cy.get('input[type="checkbox"]').check();
    cy.contains("button[type=submit]", "Criar minha conta").click();

    cy.location("pathname").should("eq", "/");
    cy.lerLocal("sessao").should("not.be.null");

    // 2. Adiciona peça ao carrinho
    cy.visit(`/produto/${produto.id}`);
    cy.hidratado();
    adicionarComoComprador();

    // 3. Abre carrinho e altera quantidade com chamada atômica PUT
    cy.visit("/carrinho");
    cy.hidratado();
    cy.contains("1 peça escolhida").should("be.visible");
    cy.contains("article", produto.nome).should("be.visible");

    cy.get('button[aria-label="Aumentar quantidade"]').first().click();
    cy.wait("@atualizarQuantidade").then((interception) => {
      expect(interception.request.body).to.deep.equal({ quantidade: 2 });
    });
    cy.contains("2 peças escolhidas").should("be.visible");
    const subtotalEsperado = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(produto.preco * 2).replace(/\u00a0/g, " ");
    cy.contains("aside", "Subtotal").contains(subtotalEsperado).should("be.visible");

    // 4. Vai para checkout e cota frete
    cy.contains("a", "Finalizar compra").click();
    cy.location("pathname").should("eq", "/checkout");
    preencherEntrega();
    cy.wait("@cotacaoFrete").then(({ response }) => {
      const frete = Number(response.body.valor);
      const totalEsperado = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(produto.preco * 2 + frete).replace(/\u00a0/g, " ");

      cy.contains("button", "Ir para pagamento").click();
      cy.contains("h1", "Pagamento").should("be.visible");
      cy.contains(totalEsperado).should("be.visible");

      cy.contains('[role="group"][aria-label="Método de pagamento"] button', "Pix").click();
      cy.contains("button", "Pagar agora").click();

      // 5. Confirmação do pedido
      cy.contains("h1", "Pagamento confirmado").should("be.visible");
      cy.get("dd")
        .first()
        .invoke("text")
        .then((pedidoTexto) => {
          const idPedido = pedidoTexto.trim();
          expect(idPedido).to.match(/^\d+$/);

          // 6. Histórico de pedidos no perfil
          cy.visit("/conta");
          cy.hidratado();
          // Conta recém-criada: este é o primeiro pedido dela, qualquer que seja o id global.
          cy.get(`a[href="/conta/pedidos/${idPedido}"]`)
            .first()
            .closest("article")
            .contains(/^SEU PEDIDO #1$/)
            .should("be.visible");

          cy.visit(`/conta/pedidos/${idPedido}`);
          cy.hidratado();
          cy.contains("h1", "Detalhes da compra").should("be.visible");
          cy.contains("span", /^Pago$/).should("be.visible");
          cy.contains(produto.nome).should("be.visible");
        });
    });
  });
});

describe("TC05 / TC19 / TC20 · persistência do carrinho e consistência de estoque no checkout", () => {
  let produtoDisponivel;
  let produtoEsgotado;

  before(() => {
    const tag = Date.now();
    cy.criarProdutoAprovado({ nome: `Peça Persistência ${tag}`, preco: 60, estoque: 8 }).then((p) => {
      produtoDisponivel = p;
    });
    cy.criarProdutoAprovado({ nome: `Peça Esgotada ${tag}`, preco: 95, estoque: 0 }).then((p) => {
      produtoEsgotado = p;
    });
  });

  it("itens e quantidades do carrinho persistem no navegador após reload da página", () => {
    cy.visitarComo("COMPRADOR", `/produto/${produtoDisponivel.id}`);
    adicionarComoComprador();

    cy.visit("/carrinho");
    cy.hidratado();
    cy.contains("1 peça escolhida").should("be.visible");
    cy.contains("article", produtoDisponivel.nome).should("be.visible");

    // Recarrega a página
    cy.reload();
    cy.hidratado();

    // Carrinho deve permanecer intacto
    cy.contains("1 peça escolhida").should("be.visible");
    cy.contains("article", produtoDisponivel.nome).should("be.visible");
    cy.contains("aside", "Subtotal").contains("R$ 60,00").should("be.visible");
  });

  it("sessão autenticada e perfil persistem após reload da página", () => {
    cy.visitarComo("COMPRADOR", "/conta");
    cy.contains("h1", "Compras realizadas").should("be.visible");

    cy.reload();
    cy.hidratado();

    cy.contains("h1", "Compras realizadas").should("be.visible");
    cy.lerLocal("sessao").its("usuario.papel").should("eq", "COMPRADOR");
  });

  it("peça com estoque zerado não permite adicionar ao carrinho nem checkout", () => {
    cy.visit(`/produto/${produtoEsgotado.id}`);
    cy.hidratado();

    cy.contains("h1", produtoEsgotado.nome).should("be.visible");
    cy.contains("Vendida").should("be.visible");
    cy.contains("button", "Adicionar ao carrinho").should("not.exist");
    cy.contains("button", "Comprar agora").should("not.exist");
  });

  it("TC05 / TC20 · tentativa de checkout com estoque insuficiente recebe 409 do endpoint real /pedidos/checkout e preserva o carrinho", () => {
    const apiUrl = getApiUrl();
    cy.intercept("POST", `${apiUrl}/pedidos/checkout`).as("requisicaoCheckout");

    cy.visitarComo("COMPRADOR", `/produto/${produtoDisponivel.id}`);
    adicionarComoComprador();

    // Zera o estoque da peça no backend real antes de tentar pagar para provocar 409 real
    cy.request({
      method: "PUT",
      url: `${apiUrl}/produtos/artesao/pecas/${produtoDisponivel.id}/estoque`,
      headers: { Authorization: `Bearer ${produtoDisponivel.artesao.token}` },
      body: { estoque: 0 },
    }).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body.estoque).to.eq(0);
    });

    cy.visit("/checkout");
    cy.hidratado();
    preencherEntrega();
    cy.contains("button", "Ir para pagamento").click();

    cy.wait("@requisicaoCheckout").then(({ response }) => {
      expect(response?.statusCode).to.eq(409);
      expect(response?.body?.mensagem).to.match(/estoque|quantidade/i);
    });
    cy.contains(/estoque|quantidade/i).should("be.visible");
    cy.contains("h1", "Entrega").should("be.visible");
    cy.contains("h1", "Pagamento confirmado").should("not.exist");

    // Volta ao carrinho e verifica que o item não foi perdido
    cy.visit("/carrinho");
    cy.hidratado();
    cy.contains("article", produtoDisponivel.nome).should("be.visible");
  });
});
