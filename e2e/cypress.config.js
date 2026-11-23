// Cypress dos Testes End-to-End (E2E). Roda contra o frontend de pé em produção
// (cd frontend && npm run build && npm start). Outra URL: CYPRESS_baseUrl=http://...
const { appendFileSync, mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const AVISOS = join(__dirname, "..", "relatorios", "e2e-avisos.txt");
const { defineConfig } = require("cypress");

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

function validarOrigensAutorizadas(baseUrl, apiUrl) {
  const baseOrigin = normalizarOrigin(baseUrl);
  const apiOrigin = normalizarOrigin(apiUrl);

  // Bloqueio explícito do runtime principal (:3000 / :4000)
  if (baseOrigin.includes(":3000") || apiOrigin.includes(":4000")) {
    throw new Error(
      "[E2E Proteção] Execução bloqueada incondicionalmente: nenhum teste E2E pode rodar contra o runtime principal (:3000 / :4000). " +
      "Defina CYPRESS_BASE_URL e CYPRESS_API_URL apontando para o ambiente descartável isolado (padrão: CYPRESS_BASE_URL=http://localhost:3200 CYPRESS_API_URL=http://localhost:4200).",
    );
  }

  // Validação estrita por allowlist de origins autorizadas
  if (!ALLOWED_BASE_ORIGINS.has(baseOrigin)) {
    throw new Error(
      `[E2E Proteção] Execução bloqueada: baseUrl (${baseUrl}) com origin ${baseOrigin} não consta na allowlist de origens autorizadas (${Array.from(ALLOWED_BASE_ORIGINS).join(", ")}).`,
    );
  }

  if (!ALLOWED_API_ORIGINS.has(apiOrigin)) {
    throw new Error(
      `[E2E Proteção] Execução bloqueada: API_URL (${apiUrl}) com origin ${apiOrigin} não consta na allowlist de origens autorizadas (${Array.from(ALLOWED_API_ORIGINS).join(", ")}).`,
    );
  }
}

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
    baseUrl:
      process.env.CYPRESS_BASE_URL ||
      process.env.CYPRESS_baseUrl ||
      "http://localhost:3200",
    expose: {
      API_URL:
        process.env.CYPRESS_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:4200",
      TEST_DATABASE_NAME: process.env.TEST_DATABASE_NAME || "",
      ADMIN_INVITE_CODE: process.env.ADMIN_INVITE_CODE || "origem-admin-2026",
    },
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 8000,
    // O cabeçalho é sticky: rolar o alvo para o centro evita "coberto pelo <header>".
    scrollBehavior: "center",
    setupNodeEvents(on, config) {
      // Validação pura em memória: nenhuma escrita ou remoção de arquivo ocorre antes do preflight
      on("before:run", () => {
        const alvoBase = config?.baseUrl || "";
        const alvoApi = config?.env?.API_URL || "";
        validarOrigensAutorizadas(alvoBase, alvoApi);
      });
      // Erro de hidratação do React que o support/e2e.js deixou passar: fica registrado.
      on("task", {
        limparAvisos() {
          rmSync(AVISOS, { force: true });
          return null;
        },
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
