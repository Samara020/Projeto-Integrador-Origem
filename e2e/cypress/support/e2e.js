// Comandos comuns dos testes E2E do Origem.

const SENHA_DEMO = "origem123";
export const CONTAS = {
  COMPRADOR: "comprador@origem.dev",
  ARTESAO: "artesao@origem.dev",
  ADMINISTRADOR: "admin@origem.dev",
};

// React #418, #423 e #425: o HTML do servidor não bateu com o do cliente na hidratação.
// O React refaz a tela no navegador e o usuário não vê erro. É defeito do app, intermitente
// e registrado no plano de testes: o caso segue, mas cada ocorrência vai para
// relatorios/e2e-avisos.txt e para o resumo do nível. Qualquer outro erro do app reprova o caso.
// A mensagem original tem de COMEÇAR com o texto do React (produção ou dev). Erro que só
// cita o código no meio, como "Falha de negócio ... Minified React error #418", reprova.
const HIDRATACAO = [
  /^Minified React error #(418|423|425); visit https:\/\/react\.dev\/errors\/\1\b/,
  /^Hydration failed because the server rendered (HTML|text) didn't match the client\b/,
  /^There was an error while hydrating\b/,
];
let avisos = [];

// O Cypress embrulha o erro do app; a mensagem original é a primeira linha que começa com ">".
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

// Espera o React hidratar a página. Antes disso, digitar ou clicar pode ser perdido,
// porque o HTML do servidor já está na tela mas os eventos ainda não estão ligados.
Cypress.Commands.add("hidratado", () => {
  cy.get("body").should(($body) => {
    const hidratado = Object.keys($body[0]).some((chave) => chave.startsWith("__reactFiber$"));
    expect(hidratado, "React hidratou a página").to.equal(true);
  });
});

// Abre a página já com sessão: faz o login de verdade na Fake API e grava a sessão
// devolvida no localStorage antes do carregamento (os stores leem o storage uma vez).
Cypress.Commands.add("visitarComo", (papel, url, gravarAntes = {}) => {
  cy.request("POST", "/api/auth/login", { email: CONTAS[papel], senha: SENHA_DEMO }).then(({ body }) => {
    cy.visit(url, {
      onBeforeLoad(win) {
        win.localStorage.setItem("origem:sessao", JSON.stringify(body));
        for (const [chave, valor] of Object.entries(gravarAntes)) {
          win.localStorage.setItem(`origem:${chave}`, JSON.stringify(valor));
        }
      },
    });
  });
  cy.hidratado();
});

// Lê uma chave do localStorage do app (prefixo origem:).
Cypress.Commands.add("lerLocal", (chave) =>
  cy.window().then((win) => JSON.parse(win.localStorage.getItem(`origem:${chave}`) ?? "null")),
);
