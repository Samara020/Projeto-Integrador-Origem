// Comandos comuns dos testes E2E do Origem contra frontend + backend real + Postgres.

const API_URL = (Cypress.env("API_URL") || "http://localhost:4000").replace(/\/$/, "");
const ADMIN_INVITE_CODE = Cypress.env("ADMIN_INVITE_CODE") || "origem-admin-2026";

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
    corpo.codigoConvite = ADMIN_INVITE_CODE;
  }

  return cy.request("POST", `${API_URL}/auth/register`, corpo).then(() =>
    cy
      .request("POST", `${API_URL}/auth/login`, { email, senha })
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
          url: `${API_URL}/produtos`,
          headers: { Authorization: `Bearer ${artesao.token}` },
          body: payload,
        })
        .then(({ body: criado }) =>
          cy
            .request({
              method: "PUT",
              url: `${API_URL}/produtos/admin/produtos/${criado.id}/validacao`,
              headers: { Authorization: `Bearer ${admin.token}` },
              body: { status: "APROVADA", justificativa: "Aprovado para teste E2E." },
            })
            .then(() => ({
              id: String(criado.id),
              nome: payload.nome,
              preco: payload.preco,
              artesao,
              admin,
            })),
        );
    }),
  );
});

Cypress.Commands.add("lerLocal", (chave) =>
  cy.window().then((win) => JSON.parse(win.localStorage.getItem(`origem:${chave}`) ?? "null")),
);
