// Comandos comuns dos testes E2E do Origem contra frontend + backend real + Postgres.

const ALLOWED_BASE_ORIGINS = new Set([
  "http://localhost:3200",
  "http://127.0.0.1:3200",
]);

const ALLOWED_API_ORIGINS = new Set([
  "http://localhost:4200",
  "http://127.0.0.1:4200",
]);

function normalizarOrigin(urlStr) {
  try {
    return new URL(urlStr).origin;
  } catch {
    return String(urlStr || "").replace(/\/$/, "");
  }
}

function getApiUrl() {
  const url = (
    Cypress.expose("API_URL") ||
    "http://localhost:4200"
  ).replace(/\/$/, "");

  const origin = normalizarOrigin(url);

  if (url.includes(":4000") || url.includes(":3000")) {
    throw new Error(
      "[E2E Proteção] Execução bloqueada incondicionalmente: a API aponta para a porta do runtime principal (:3000 / :4000). " +
      "Defina CYPRESS_API_URL apontando para o backend descartável (ex: CYPRESS_API_URL=http://localhost:4200).",
    );
  }

  if (!ALLOWED_API_ORIGINS.has(origin)) {
    throw new Error(
      `[E2E Proteção] Execução bloqueada: API_URL (${url}) com origin ${origin} não consta na allowlist de origens autorizadas (${Array.from(ALLOWED_API_ORIGINS).join(", ")}).`,
    );
  }

  return url;
}

before(() => {
  const apiUrl = getApiUrl();
  const expectedDb =
    Cypress.expose("TEST_DATABASE_NAME");

  if (!expectedDb) {
    throw new Error(
      "[E2E Execution Guard] Execução bloqueada incondicionalmente: a variável TEST_DATABASE_NAME não está configurada. " +
      "Para proteger o banco principal contra qualquer escrita indevida, a suíte E2E exige a definição explícita do nome do banco de testes descartável esperado (ex: TEST_DATABASE_NAME=origem_test_...).",
    );
  }

  // Trava de execução fechada: exige confirmação de preflight em /__test/identity com environment=test e banco descartável idêntico
  cy.request({
    method: "GET",
    url: `${apiUrl}/__test/identity`,
    failOnStatusCode: false,
  }).then((res) => {
    const db = String(res.body?.database || "");
    const ehBancoValido =
      db === expectedDb &&
      !db.toLowerCase().includes("prod") &&
      !db.toLowerCase().includes("dev") &&
      db !== "origem";

    if (res.status !== 200 || res.body?.environment !== "test" || !ehBancoValido) {
      throw new Error(
        `[E2E Execution Guard] Execução bloqueada incondicionalmente: o backend em ${apiUrl} não confirmou conexão com o banco descartável esperado (status=${res.status}, environment=${res.body?.environment}, database=${db}, esperado=${expectedDb}). ` +
        `A suíte exige que /__test/identity retorne status 200, environment="test" e o database exatamente igual a TEST_DATABASE_NAME (obtido via SELECT current_database()) antes de autorizar qualquer teste.`,
      );
    }
    cy.log(`[E2E Preflight OK] Backend e banco de testes confirmados: env=${res.body.environment}, database=${db}`);
    // Limpeza de avisos somente após o preflight ser aprovado com sucesso
    cy.task("limparAvisos");
  });
});

beforeEach(() => {
  const baseUrl = Cypress.config("baseUrl") || "";
  const baseOrigin = normalizarOrigin(baseUrl);

  if (baseUrl.includes(":3000")) {
    throw new Error(
      "[E2E Proteção] Execução bloqueada incondicionalmente: baseUrl aponta para o frontend principal (:3000). " +
      "Defina CYPRESS_BASE_URL apontando para o frontend descartável (ex: CYPRESS_BASE_URL=http://localhost:3200).",
    );
  }

  if (!ALLOWED_BASE_ORIGINS.has(baseOrigin)) {
    throw new Error(
      `[E2E Proteção] Execução bloqueada: baseUrl (${baseUrl}) com origin ${baseOrigin} não consta na allowlist de origens autorizadas (${Array.from(ALLOWED_BASE_ORIGINS).join(", ")}).`,
    );
  }

  const apiUrlPermitida = getApiUrl();
  const apiOriginPermitida = normalizarOrigin(apiUrlPermitida);

  // Segurança de API efetiva no build: compara cada requisição disparada pelo navegador com a origem permitida exata
  cy.intercept("*", (req) => {
    let reqOrigin = "";
    try {
      reqOrigin = new URL(req.url).origin;
    } catch {
      reqOrigin = "";
    }

    if (!reqOrigin || req.url.startsWith("data:") || req.url.startsWith("blob:")) {
      return;
    }

    // Permite chamadas internas da UI (páginas, chunks estáticos, CSS, imagens servidas pelo Next.js)
    if (reqOrigin === baseOrigin) {
      return;
    }

    // Chamadas de backend/API devem bater estritamente com a origem permitida da API descartável
    if (ALLOWED_API_ORIGINS.has(reqOrigin) && reqOrigin === apiOriginPermitida) {
      return;
    }

    // Bloqueia com erro qualquer tentativa de envio para o runtime principal (:3000 / :4000) ou outra origem não autorizada
    throw new Error(
      `[E2E Segurança de API] Violação detectada no build da UI: requisição para ${req.url} (origem ${reqOrigin}) diverge da API descartável permitida (${apiOriginPermitida}). Certifique-se de que o build da UI foi gerado com NEXT_PUBLIC_API_URL=${apiUrlPermitida}.`,
    );
  });
});

function getAdminInviteCode() {
  return (
    Cypress.expose("ADMIN_INVITE_CODE") ||
    "origem-admin-2026"
  );
}

const HIDRATACAO = [
  /^Minified React error #(418|423|425); visit https:\/\/react\.dev\/errors\/\1\b/,
  /^Hydration failed because the server rendered (HTML|text) didn't match the client\b/,
  /^There was an error while hydrating\b/,
];
let avisos = [];

function mensagemOriginal(erro) {
  const linha = erro.message.split("\n").find((l) => l.trim().startsWith(">"));
  return linha ? linha.trim().replace(/^>\s*/, "") : erro.message.trim();
}

Cypress.on("uncaught:exception", (erro) => {
  const original = mensagemOriginal(erro);
  if (!HIDRATACAO.some((padrao) => padrao.test(original))) return undefined;
  avisos.push(original);
  return false;
});

afterEach(function () {
  if (!avisos.length) return;
  const registro = { teste: this.currentTest.fullTitle(), erros: avisos };
  avisos = [];
  cy.task("registrarAviso", registro);
});

Cypress.Commands.add("hidratado", () => {
  cy.get("body").should(($body) => {
    const hidratado = Object.keys($body[0]).some((chave) => chave.startsWith("__reactFiber$"));
    expect(hidratado, "React hidratou a página").to.equal(true);
  });
});

let seq = 0;
Cypress.Commands.add("registrarUsuario", (papel, extra = {}) => {
  seq += 1;
  const email =
    extra.email ||
    `e2e.${papel.toLowerCase()}.${Date.now()}.${seq}.${Math.floor(Math.random() * 10000)}@origem-teste.dev`;
  const senha = extra.senha || "SenhaE2E123";
  const nome = extra.nome || `Teste ${papel} ${seq}`;
  const corpo = { nome, email, senha, papel, ...extra };
  if (papel === "ADMINISTRADOR" && !corpo.codigoConvite) {
    corpo.codigoConvite = getAdminInviteCode();
  }

  const apiUrl = getApiUrl();
  return cy.request("POST", `${apiUrl}/auth/register`, corpo).then(() =>
    cy
      .request("POST", `${apiUrl}/auth/login`, { email, senha })
      .then(({ body }) => ({ ...body, email, senha })),
  );
});

Cypress.Commands.add("visitarComo", (papel, url, gravarAntes = {}) => {
  return cy.registrarUsuario(papel).then((sessao) => {
    cy.visit(url, {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          "origem:sessao",
          JSON.stringify({ token: sessao.token, tipo: sessao.tipo, usuario: sessao.usuario }),
        );
        for (const [chave, valor] of Object.entries(gravarAntes)) {
          win.localStorage.setItem(`origem:${chave}`, JSON.stringify(valor));
        }
      },
    });
    cy.hidratado();
    return cy.wrap(sessao, { log: false });
  });
});

Cypress.Commands.add("criarProdutoAprovado", (overrides = {}) => {
  const marcador = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const apiUrl = getApiUrl();
  return cy.registrarUsuario("ARTESAO").then((artesao) =>
    cy.registrarUsuario("ADMINISTRADOR").then((admin) => {
      const payload = {
        nome: overrides.nome || `Peça E2E ${marcador}`,
        descricao: overrides.descricao || "Peça artesanal criada para teste E2E integrado.",
        categoria: overrides.categoria || "Cerâmica",
        tecnica: overrides.tecnica || "Cerâmica manual",
        origem: overrides.origem || "Caruaru, PE",
        preco: overrides.preco ?? 70,
        modalidadeProducao: overrides.modalidadeProducao || "PRONTA_ENTREGA",
        estoque: overrides.estoque ?? 5,
        imagens: overrides.imagens || ["/produtos/vaso-ceramica.jpg"],
      };
      return cy
        .request({
          method: "POST",
          url: `${apiUrl}/produtos`,
          headers: { Authorization: `Bearer ${artesao.token}` },
          body: payload,
        })
        .then(({ body: criado }) =>
          cy
            .request({
              method: "PUT",
              url: `${apiUrl}/produtos/admin/produtos/${criado.id}/validacao`,
              headers: { Authorization: `Bearer ${admin.token}` },
              body: { status: "APROVADA", justificativa: "Aprovado para teste E2E." },
            })
            .then(() => ({
              id: String(criado.id),
              nome: payload.nome,
              preco: payload.preco,
              categoria: payload.categoria,
              tecnica: payload.tecnica,
              origem: payload.origem,
              estoque: payload.estoque,
              artesao,
              admin,
            })),
        );
    }),
  );
});

Cypress.Commands.add("limparArmazenamento", () => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

Cypress.Commands.add("medirTempo", (rotulo, acaoVisitaOuClique, seletorEsperado) => {
  const inicio = Date.now();
  acaoVisitaOuClique();
  cy.get(seletorEsperado, { timeout: 8000 }).should("be.visible");
  cy.hidratado();
  return cy.then(() => {
    const duracaoMs = Date.now() - inicio;
    cy.log(`⏱️ ${rotulo}: ${duracaoMs}ms`);
    return duracaoMs;
  });
});

Cypress.Commands.add("lerLocal", (chave) =>
  cy.window().then((win) => JSON.parse(win.localStorage.getItem(`origem:${chave}`) ?? "null")),
);
