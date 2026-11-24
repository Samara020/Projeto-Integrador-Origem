// TC01, TC08, TC11, TC14, TC17 e Card 18 Itens 7/10/11: login, sessão, RBAC, auditoria de autenticidade e tratamento de expiração.

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

  if (url.includes(":4000") || url.includes(":3000") || !ALLOWED_API_ORIGINS.has(origin)) {
    throw new Error(
      `[E2E Proteção] Execução bloqueada: a API aponta para ${url} (origin ${origin}), fora da allowlist autorizada (${Array.from(ALLOWED_API_ORIGINS).join(", ")}).`,
    );
  }

  return url;
}

function entrar(email, senha) {
  cy.visit("/entrar");
  cy.hidratado();
  if (email) cy.get("#login-email").type(email);
  if (senha) cy.get("#login-senha").type(senha, { log: false });
  cy.contains("button[type=submit]", "Entrar").click();
}

describe("TC01 · login com dados válidos leva cada perfil à sua área", () => {
  it("comprador entra e volta para a vitrine com a conta no cabeçalho @smoke", () => {
    cy.registrarUsuario("COMPRADOR", { nome: "Joana Teste" }).then((conta) => {
      entrar(conta.email, conta.senha);

      cy.location("pathname").should("eq", "/");
      cy.get('button[aria-label="Abrir menu da conta de Joana"]').should("be.visible");
      cy.lerLocal("sessao").its("usuario.papel").should("eq", "COMPRADOR");
    });
  });

  it("artesão entra e cai no painel do ateliê", () => {
    cy.registrarUsuario("ARTESAO").then((conta) => {
      entrar(conta.email, conta.senha);

      cy.location("pathname").should("eq", "/painel/artesao");
      cy.lerLocal("sessao").its("usuario.papel").should("eq", "ARTESAO");
    });
  });

  it("administrador entra e cai no painel administrativo", () => {
    cy.registrarUsuario("ADMINISTRADOR").then((conta) => {
      entrar(conta.email, conta.senha);

      cy.location("pathname").should("eq", "/painel/admin");
      cy.contains("h1", "O pulso do marketplace, em um só lugar.").should("be.visible");
    });
  });

  it("comprador se cadastra e cai na vitrine autenticado", () => {
    const timestamp = Date.now();
    cy.visit("/cadastro");
    cy.hidratado();

    cy.get("#cadastro-nome").type("Novo Comprador E2E");
    cy.get("#cadastro-email").type(`comprador.e2e.${timestamp}@origem-teste.dev`);
    cy.get("#cadastro-senha").type("SenhaE2E123", { log: false });
    cy.get('input[type="checkbox"]').check();
    cy.contains("button[type=submit]", "Criar minha conta").click();

    cy.location("pathname").should("eq", "/");
    cy.lerLocal("sessao").should("not.be.null");
    cy.lerLocal("sessao").its("usuario.papel").should("eq", "COMPRADOR");
    cy.lerLocal("sessao").its("token").should("match", /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/);
  });
});

describe("TC11 · login com credenciais inválidas", () => {
  it("senha errada mostra o erro e não cria sessão", () => {
    cy.registrarUsuario("COMPRADOR").then((conta) => {
      entrar(conta.email, "senha-errada-123");

      cy.contains('[role="alert"]', "E-mail ou senha incorretos.").should("be.visible");
      cy.location("pathname").should("eq", "/entrar");
      cy.lerLocal("sessao").should("be.null");
    });
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

  it("visitante sem conta em /painel/admin é mandado para o login @smoke", () => {
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

  it("comprador não abre o cadastro de peça do painel do artesão", () => {
    cy.visitarComo("COMPRADOR", "/painel/artesao/pecas/nova");

    cy.contains("button", "Publicar peça").should("not.exist");
    cy.contains('[role="alert"] h1', "Área restrita").should("be.visible");
  });
});

describe("Card 18 Itens 7 e 11 · sessão, RBAC e tratamento de sessão expirada", () => {
  it("visitante sem autenticação tentando acessar /conta ou /painel/artesao é redirecionado para /entrar com volta", () => {
    cy.visit("/conta");
    cy.location("pathname").should("eq", "/entrar");
    cy.location("search").should("eq", "?volta=%2Fconta");

    cy.visit("/painel/artesao");
    cy.location("pathname").should("eq", "/entrar");
    cy.location("search").should("eq", "?volta=%2Fpainel%2Fartesao");
  });

  it("sessão expirada exibe alerta claro na tela de login e redireciona de volta após autenticar", () => {
    cy.registrarUsuario("COMPRADOR").then((conta) => {
      // Simula redirecionamento gerado pelo interceptor 401 de http.ts
      cy.visit("/entrar?motivo=sessao-expirada&volta=%2Fconta");
      cy.hidratado();

      cy.contains('[role="alert"]', "Sua sessão expirou. Entre novamente para continuar.").should("be.visible");

      cy.get("#login-email").type(conta.email);
      cy.get("#login-senha").type(conta.senha, { log: false });
      cy.contains("button[type=submit]", "Entrar").click();

      // Redireciona de volta para a rota original
      cy.location("pathname").should("eq", "/conta");
      cy.lerLocal("sessao").should("not.be.null");
      cy.lerLocal("sessao").its("usuario.papel").should("eq", "COMPRADOR");
    });
  });

  it("resposta 401 em rota privada limpa a sessão e redireciona com aviso", () => {
    const apiUrl = getApiUrl();
    cy.intercept("GET", `${apiUrl}/comprador/pedidos`, {
      statusCode: 401,
      body: { mensagem: "Sessão expirada." },
    }).as("sessaoExpirada");

    cy.visitarComo("COMPRADOR", "/conta");
    cy.wait("@sessaoExpirada");
    cy.location("pathname").should("eq", "/entrar");
    cy.location("search").should("include", "motivo=sessao-expirada");
    cy.contains('[role="alert"]', "Sua sessão expirou. Entre novamente para continuar.").should("be.visible");
  });
});

describe("TC17 · aprovação, reprovação e auditoria da autenticidade", () => {
  it("aprovação administrativa ativa o selo de autenticidade no produto e reprovação impede publicação", () => {
    const apiUrl = getApiUrl();
    const tag = Date.now();

    cy.registrarUsuario("ARTESAO").then((artesao) => {
      cy.registrarUsuario("ADMINISTRADOR").then((admin) => {
        // 1. Artesão cadastra peça que nasce pendente
        cy.request({
          method: "POST",
          url: `${apiUrl}/produtos`,
          headers: { Authorization: `Bearer ${artesao.token}` },
          body: {
            nome: `Peça Autenticidade ${tag}`,
            descricao: "Peça artesanal produzida com técnicas tradicionais de Caruaru para validação.",
            preco: 150,
            categoria: "Escultura",
            tecnica: "Barro cru",
            origem: "Caruaru, PE",
            modalidadeProducao: "PRONTA_ENTREGA",
            pecaUnica: false,
            estoque: 3,
          },
        }).then(({ body: pecaCriada }) => {
          const id = pecaCriada.id;

          // 2. Administrador aprova a validação com justificativa de auditoria
          cy.request({
            method: "PUT",
            url: `${apiUrl}/produtos/admin/produtos/${id}/validacao`,
            headers: { Authorization: `Bearer ${admin.token}` },
            body: { status: "APROVADA", justificativa: "Origem territorial e processos manuais comprovados." },
          }).then((resValidacao) => {
            expect(resValidacao.status).to.eq(200);

            // 3. Consulta pública confirma peça aprovada
            cy.request("GET", `${apiUrl}/produtos/${id}`).then((resProduto) => {
              expect(resProduto.body.statusValidacao).to.eq("APROVADA");
              expect(resProduto.body.disponibilidade).to.eq("DISPONIVEL");
            });

            // A decisão precisa persistir data e responsável de auditoria.
            cy.request({
              method: "GET",
              url: `${apiUrl}/produtos/admin/produtos/pendentes?status=APROVADA`,
              headers: { Authorization: `Bearer ${admin.token}` },
            }).then((resFila) => {
              const item = resFila.body.itens.find((produto) => String(produto.id) === String(id));
              expect(item, "produto na fila com decisão persistida").to.exist;
              expect(item.decididoEm).to.be.a("string").and.not.be.empty;
              expect(Number(item.decididoPorId)).to.eq(Number(admin.usuario.id));
            });

            // 4. Cadastra segunda peça e reprova administrativamente
            cy.request({
              method: "POST",
              url: `${apiUrl}/produtos`,
              headers: { Authorization: `Bearer ${artesao.token}` },
              body: {
                nome: `Peça Reprovada ${tag}`,
                descricao: "Peça industrial sem procedência artesanal comprovada para reprovação.",
                preco: 80,
                categoria: "Decoração",
                tecnica: "Industrial",
                origem: "Importado",
                modalidadeProducao: "PRONTA_ENTREGA",
                pecaUnica: false,
                estoque: 2,
              },
            }).then(({ body: pecaReprovada }) => {
              cy.request({
                method: "PUT",
                url: `${apiUrl}/produtos/admin/produtos/${pecaReprovada.id}/validacao`,
                headers: { Authorization: `Bearer ${admin.token}` },
                body: { status: "REPROVADA", justificativa: "Processo industrial em desacordo com critérios de origem." },
              }).then((resReprovado) => {
                expect(resReprovado.status).to.eq(200);

                // 5. Peça reprovada não pode estar com validação APROVADA
                cy.request({
                  method: "GET",
                  url: `${apiUrl}/produtos/${pecaReprovada.id}`,
                  failOnStatusCode: false,
                }).then((resConsultaReprovada) => {
                  expect(resConsultaReprovada.status, "peça reprovada não é pública").to.eq(404);
                });
              });
            });
          });
        });
      });
    });
  });
});
