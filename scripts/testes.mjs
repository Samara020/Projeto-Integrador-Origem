// Roda as suítes de um nível da TAS: node scripts/testes.mjs unit|backend|api|e2e|quarentena
// No E2E, as tags do título filtram os casos (docs/tas.md): --tag @smoke roda só os
// marcados e --sem-tag @flaky pula os marcados. O nível quarentena roda só os @flaky,
// com novas tentativas e relatório próprio.
// As suítes do nível rodam em sequência e uma falha não impede a próxima. O comando
// sai com erro se qualquer suíte falhar. Os relatórios JUnit ficam em relatorios/;
// no GitHub Actions, o resumo do nível também vai para $GITHUB_STEP_SUMMARY.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELATORIOS = join(RAIZ, "relatorios");
const WINDOWS = process.platform === "win32";

// Python do módulo de IA: $PYTHON, senão a venv do README do módulo, senão o do sistema.
function python() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const venv = WINDOWS
    ? join(RAIZ, "modulo-ia", ".venv", "Scripts", "python.exe")
    : join(RAIZ, "modulo-ia", ".venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return WINDOWS ? "python" : "python3";
}

function npm(pasta, script) {
  return { comando: "npm", args: ["--prefix", pasta, "run", script] };
}

function pytest(alvos, relatorio) {
  return {
    comando: python(),
    args: ["-m", "pytest", ...alvos, "-p", "no:cacheprovider", `--junitxml=${join(RELATORIOS, relatorio)}`],
    env: { PYTHONPATH: [join(RAIZ, "modulo-ia"), process.env.PYTHONPATH].filter(Boolean).join(delimiter) },
    relatorio,
  };
}

function opcao(nome) {
  const indice = process.argv.indexOf(nome);
  return indice > 0 ? process.argv[indice + 1] : undefined;
}

const PASTA_E2E = join(RAIZ, "e2e", "cypress", "e2e");

// Specs do Cypress que citam a tag, no formato que o --spec espera (relativo a e2e/).
function specsComTag(tag) {
  return readdirSync(PASTA_E2E)
    .filter((arquivo) => arquivo.endsWith(".cy.js") && readFileSync(join(PASTA_E2E, arquivo), "utf8").includes(tag))
    .map((arquivo) => `cypress/e2e/${arquivo}`);
}

// Chrome por padrão, o mesmo do GitHub Actions. Outro: E2E_BROWSER=firefox ou o caminho do binário.
// Com tag, só abre os specs que a citam; o filtro por caso fica em e2e/cypress/support/e2e.js.
function cypress({ tag = opcao("--tag"), semTag = opcao("--sem-tag"), relatorio, tentativas = 0 } = {}) {
  const expostos = [tag && `TAG=${tag}`, semTag && `SEM_TAG=${semTag}`].filter(Boolean).join(",");
  const specs = tag ? specsComTag(tag) : [];
  return {
    comando: "npm",
    args: [
      "--prefix", "e2e", "run", "test", "--",
      "--browser", process.env.E2E_BROWSER || "chrome",
      ...(expostos ? ["--expose", expostos] : []),
      ...(specs.length ? ["--spec", specs.join(",")] : []),
      ...(tentativas ? ["--config", `retries=${tentativas}`] : []),
      ...(relatorio ? ["--reporter-options", `mochaFile=../relatorios/${relatorio},includePending=true`] : []),
    ],
    semCasos: Boolean(tag) && !specs.length,
  };
}

const NIVEIS = {
  unit: {
    titulo: "Testes Unitários",
    suites: [
      { nome: "Jest · frontend", ...npm("frontend", "test:unit"), relatorio: "unit-jest.xml" },
      {
        nome: "pytest · módulo de IA (lógica)",
        ...pytest(["modulo-ia/tests", "--ignore=modulo-ia/tests/test_api.py"], "unit-pytest.xml"),
      },
      {
        // Regra que libera imagem pública no bloqueio de rede do E2E (support/redeSegura.js).
        nome: "node:test · guarda de rede do E2E",
        comando: process.execPath,
        args: [
          "--test",
          "--test-reporter=junit",
          `--test-reporter-destination=${join(RELATORIOS, "unit-guarda.xml")}`,
          "--test-reporter=spec",
          "--test-reporter-destination=stdout",
          "e2e/cypress/support/redeSegura.test.js",
        ],
        relatorio: "unit-guarda.xml",
      },
    ],
  },
  // Suíte própria do backend: Jest + Supertest contra Postgres. Os testes apagam as tabelas,
  // então exigem banco exclusivo em DATABASE_URL_TEST (backend/app/tests/env.ts).
  backend: {
    titulo: "Testes do backend",
    suites: [{ nome: "Jest · backend (banco exclusivo)", ...npm("backend/app", "test"), relatorio: "backend-jest.xml" }],
  },
  api: {
    titulo: "Testes de API",
    suites: [
      { nome: "Jest · API real (frontend -> backend/Postgres)", ...npm("frontend", "test:api"), relatorio: "api-jest.xml" },
      { nome: "pytest · módulo de IA (HTTP)", ...pytest(["modulo-ia/tests/test_api.py"], "api-pytest.xml") },
    ],
  },
  e2e: {
    titulo: "Testes End-to-End (E2E)",
    suites: [{ nome: "Cypress", ...cypress(), relatorio: /^e2e-.+\.xml$/, avisos: "e2e-avisos.txt" }],
  },
  // Testes instáveis em quarentena (@flaky): rodam à parte, com 2 novas tentativas e relatório
  // próprio. A esteira não reprova por eles (continue-on-error no workflow).
  quarentena: {
    titulo: "Quarentena (@flaky)",
    suites: [
      {
        nome: "Cypress · @flaky",
        ...cypress({ tag: "@flaky", semTag: undefined, relatorio: "quarentena-[hash].xml", tentativas: 2 }),
        relatorio: /^quarentena-.+\.xml$/,
      },
    ],
  },
};

function relatoriosDe(padrao) {
  if (!existsSync(RELATORIOS)) return [];
  return readdirSync(RELATORIOS)
    .filter((arquivo) => (typeof padrao === "string" ? arquivo === padrao : padrao.test(arquivo)))
    .map((arquivo) => join(RELATORIOS, arquivo));
}

// Soma os <testsuite> dos JUnit de Jest, pytest e Cypress. <testsuites> não entra.
// O JUnit do Cypress não tem o atributo skipped: ali o ignorado é a tag <skipped/> do caso.
// O JUnit do node:test não tem <testsuite> para teste solto: ali contam as tags <testcase>.
function contar(arquivos) {
  const total = { casos: 0, falhas: 0, ignorados: 0 };
  for (const arquivo of arquivos) {
    const xml = readFileSync(arquivo, "utf8");
    const suites = [...xml.matchAll(/<testsuite\b([^>]*)>/g)];
    let ignoradosPorAtributo = 0;
    for (const [, atributos] of suites) {
      const valor = (nome) => Number(atributos.match(new RegExp(`\\b${nome}="(\\d+)"`))?.[1] ?? 0);
      total.casos += valor("tests");
      total.falhas += valor("failures") + valor("errors");
      ignoradosPorAtributo += valor("skipped");
    }
    if (!suites.length) {
      total.casos += (xml.match(/<testcase\b/g) ?? []).length;
      total.falhas += (xml.match(/<(?:failure|error)\b/g) ?? []).length;
    }
    total.ignorados += Math.max(ignoradosPorAtributo, (xml.match(/<skipped\b/g) ?? []).length);
  }
  return total;
}

function texto(atributo) {
  return atributo
    .replace(/&#10;/g, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Casos com <failure> ou <error>, para o fim do log mostrar o que quebrou (o reporter
// junit do Cypress não imprime a mensagem no terminal).
function casosQueFalharam(arquivos) {
  const casos = [];
  for (const arquivo of arquivos) {
    const xml = readFileSync(arquivo, "utf8");
    for (const [, atributos, corpo] of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
      const falha = corpo?.match(/<(?:failure|error)\b([^>]*)>/);
      if (!falha) continue;
      const nome = texto(atributos.match(/\bname="([^"]*)"/)?.[1] ?? "?");
      // Primeira linha, mais a linha "> erro" que o Cypress usa para erro vindo do app.
      const linhas = texto(falha[1].match(/\bmessage="([^"]*)"/)?.[1] ?? "").split("\n");
      const mensagem = [linhas[0], linhas.find((linha) => linha.trim().startsWith(">"))?.trim()]
        .filter(Boolean)
        .join(" ");
      casos.push(`${nome}${mensagem ? `: ${mensagem}` : ""}`);
    }
  }
  return casos;
}

const chaveDoNivel = process.argv[2];
const nivel = NIVEIS[chaveDoNivel];
if (!nivel) {
  console.error(`Uso: node scripts/testes.mjs ${Object.keys(NIVEIS).join("|")}`);
  process.exit(2);
}

mkdirSync(RELATORIOS, { recursive: true });
const resultados = [];

for (const suite of nivel.suites) {
  for (const antigo of relatoriosDe(suite.relatorio)) rmSync(antigo);
  if (suite.avisos) rmSync(join(RELATORIOS, suite.avisos), { force: true });
  console.log(`\n=== ${nivel.titulo} · ${suite.nome} ===\n`);

  // Tag sem nenhum teste marcado (ex.: quarentena vazia): não abre o navegador à toa.
  if (suite.semCasos) {
    console.log("Nenhum teste marcado com a tag. Nada a rodar.");
    resultados.push({ nome: suite.nome, passou: true, segundos: 0, contagem: { casos: 0, falhas: 0, ignorados: 0 }, falhas: [], avisos: 0 });
    continue;
  }

  const inicio = Date.now();
  const execucao = spawnSync(suite.comando, suite.args, {
    cwd: RAIZ,
    stdio: "inherit",
    shell: WINDOWS,
    env: { ...process.env, ...suite.env },
  });
  if (execucao.error) console.error(`Não foi possível rodar ${suite.comando}: ${execucao.error.message}`);

  const arquivos = relatoriosDe(suite.relatorio);
  resultados.push({
    nome: suite.nome,
    passou: execucao.status === 0,
    segundos: (Date.now() - inicio) / 1000,
    contagem: arquivos.length ? contar(arquivos) : null,
    falhas: casosQueFalharam(arquivos),
    avisos: suite.avisos && existsSync(join(RELATORIOS, suite.avisos))
      ? readFileSync(join(RELATORIOS, suite.avisos), "utf8").trim().split("\n").length
      : 0,
    arquivoAvisos: suite.avisos,
  });
}

const falhou = resultados.some((r) => !r.passou);

// Tempo de relógio do nível, para o relatório de métricas (scripts/metricas.mjs) comparar com o limite.
const TEMPOS = join(RELATORIOS, "tempos.json");
const tempos = existsSync(TEMPOS) ? JSON.parse(readFileSync(TEMPOS, "utf8")) : {};
tempos[chaveDoNivel] = {
  segundos: Number(resultados.reduce((soma, r) => soma + r.segundos, 0).toFixed(1)),
  passou: !falhou,
  filtro: [opcao("--tag") && `só ${opcao("--tag")}`, opcao("--sem-tag") && `sem ${opcao("--sem-tag")}`].filter(Boolean).join(", ") || null,
};
writeFileSync(TEMPOS, `${JSON.stringify(tempos, null, 2)}\n`);
const numero = (valor) => (valor === undefined ? "?" : String(valor));
const linhas = resultados.map(({ nome, passou, segundos, contagem }) =>
  [
    nome,
    passou ? "passou" : "falhou",
    numero(contagem?.casos),
    numero(contagem?.falhas),
    numero(contagem?.ignorados),
    `${segundos.toFixed(1).replace(".", ",")} s`,
  ].join(" | "),
);

const titulo = `${nivel.titulo}: ${falhou ? "falhou" : "passou"}`;
console.log(`\n${titulo}\nSuíte | Resultado | Casos | Falhas | Ignorados | Tempo\n${linhas.join("\n")}\n`);
for (const { nome, falhas } of resultados) {
  if (falhas.length) console.log(`Falhas em ${nome}:\n${falhas.map((f) => `  x ${f}`).join("\n")}\n`);
}
const avisos = resultados
  .filter((r) => r.avisos)
  .map((r) => `Avisos em ${r.nome}: ${r.avisos} erro(s) de hidratação do React, defeito do app que não reprova o caso. Detalhe em relatorios/${r.arquivoAvisos}.`);
if (avisos.length) console.log(`${avisos.join("\n")}\n`);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      `### ${titulo}`,
      "",
      "| Suíte | Resultado | Casos | Falhas | Ignorados | Tempo |",
      "| --- | --- | ---: | ---: | ---: | ---: |",
      ...linhas.map((linha) => `| ${linha} |`),
      "",
      ...avisos.map((aviso) => `${aviso}\n`),
      "",
    ].join("\n"),
  );
}

process.exit(falhou ? 1 : 0);
