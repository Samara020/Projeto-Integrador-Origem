// Cypress dos Testes End-to-End (E2E). Roda contra o frontend de pé em produção
// (cd frontend && npm run build && npm start). Outra URL: CYPRESS_baseUrl=http://...
const { appendFileSync, mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const AVISOS = join(__dirname, "..", "relatorios", "e2e-avisos.txt");
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  reporter: "junit",
  reporterOptions: {
    mochaFile: "../relatorios/e2e-[hash].xml",
    testsuitesTitle: "Testes End-to-End (E2E)",
    // Caso com .skip entra no relatório como <skipped/>, para o resumo contar os ignorados.
    includePending: true,
  },
  video: true,
  retries: 0,
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 8000,
    // O cabeçalho é sticky: rolar o alvo para o centro evita "coberto pelo <header>".
    scrollBehavior: "center",
    setupNodeEvents(on) {
      on("before:run", () => rmSync(AVISOS, { force: true }));
      // Erro de hidratação do React que o support/e2e.js deixou passar: fica registrado.
      on("task", {
        registrarAviso({ teste, erros }) {
          mkdirSync(join(AVISOS, ".."), { recursive: true });
          for (const erro of erros) appendFileSync(AVISOS, `${teste}: ${erro}\n`);
          console.log(`  Aviso (hidratação do React, defeito do app): ${teste}`);
          return null;
        },
      });
      // Guarda o vídeo só do spec que falhou; os que passaram não ocupam o artefato.
      on("after:spec", (_spec, resultados) => {
        const falhou = resultados?.tests?.some((teste) => teste.attempts.some((t) => t.state === "failed"));
        if (resultados?.video && !falhou) rmSync(resultados.video, { force: true });
      });
    },
  },
});
