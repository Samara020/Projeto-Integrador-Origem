// Abre a issue da revisão periódica da TAS (docs/tas.md) com os números atuais:
// execuções dos últimos 15 dias, demandas de manutenção abertas e testes pulados ou em quarentena.
// Uso no GitHub Actions: node .github/scripts/revisao-periodica.mjs
// Para só ver o texto, sem abrir issue: node .github/scripts/revisao-periodica.mjs --rascunho
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { analisar } from "./verificar-quarentena.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO = process.env.GITHUB_REPOSITORY;
const POLITICA = JSON.parse(readFileSync(join(RAIZ, ".github", "politica-testes.json"), "utf8"));
const LABEL = "revisao-tas";
const DIAS = 15;
const NIVEIS = {
  "Unitário · frontend (Jest)": "frontend/tests/unit",
  "API · frontend (Jest)": "frontend/tests/api",
  "Backend (Jest)": "backend/app/tests",
  "Módulo de IA (pytest)": "modulo-ia/tests",
  "End-to-End (Cypress)": "e2e/cypress/e2e",
};
const CASO = /^\s*(?:it|test)(?:\.each\([\s\S]*?\))?\(|^\s*(?:it|test)\.each\(|^\s*def test_/gm;

function arquivosDe(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (nome === "node_modules" || nome === "__pycache__") return [];
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho);
    return /\.(test|cy)\.(ts|tsx|js)$|^test_.*\.py$/.test(nome) ? [caminho] : [];
  });
}

async function api(metodo, caminho, corpo) {
  const retorno = await fetch(`https://api.github.com/repos/${REPO}${caminho}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!retorno.ok && retorno.status !== 422) throw new Error(`${metodo} ${caminho}: HTTP ${retorno.status}`);
  return retorno.json();
}

/** Tamanho da suíte e marcações, lidos dos arquivos de teste. */
function suiteLocal() {
  const linhas = [];
  const marcados = [];
  for (const [nivel, pasta] of Object.entries(NIVEIS)) {
    const arquivos = arquivosDe(join(RAIZ, pasta));
    let casos = 0;
    for (const caminho of arquivos) {
      const conteudo = readFileSync(caminho, "utf8");
      casos += (conteudo.match(CASO) ?? []).length;
      marcados.push(...analisar(conteudo, relative(RAIZ, caminho)).marcados);
    }
    linhas.push(`| ${nivel} | ${arquivos.length} | ${casos} |`);
  }
  return { linhas, marcados };
}

/** Execuções da regressão nos últimos DIAS dias: total, falhas e duração média. */
async function execucoes() {
  const desde = new Date(Date.now() - DIAS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { workflow_runs: runs = [] } = await api("GET", `/actions/runs?created=>=${desde}&status=completed&per_page=100`);
  const porWorkflow = new Map();
  for (const run of runs) {
    if (!/^Testes/.test(run.name)) continue;
    const dado = porWorkflow.get(run.name) ?? { total: 0, falhas: 0, segundos: 0 };
    dado.total += 1;
    if (run.conclusion !== "success") dado.falhas += 1;
    dado.segundos += (new Date(run.updated_at) - new Date(run.run_started_at)) / 1000;
    porWorkflow.set(run.name, dado);
  }
  return [...porWorkflow].map(
    ([nome, { total, falhas, segundos }]) =>
      `| ${nome} | ${total} | ${falhas} | ${Math.round((falhas / total) * 100)}% | ${(segundos / total / 60).toFixed(1).replace(".", ",")} min |`,
  );
}

/** Issues de manutenção abertas, contadas por label. */
async function demandas() {
  const labels = ["falha-pipeline", "falha:sut", "falha:tas", "falha:ambiente", "falha:esperada", "flaky", "prioridade:alta", "prioridade:media", "prioridade:baixa"];
  const linhas = [];
  for (const label of labels) {
    const abertas = await api("GET", `/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100`);
    linhas.push(`| \`${label}\` | ${abertas.length} | ${abertas.slice(0, 5).map((issue) => `#${issue.number}`).join(", ") || "nenhuma"} |`);
  }
  return linhas;
}

async function main() {
  const rascunho = process.argv.includes("--rascunho") || !process.env.GITHUB_TOKEN || !REPO;
  const { linhas: tamanho, marcados } = suiteLocal();
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Recife" });
  const semDados = "| sem acesso à API do GitHub nesta execução | | | | |";

  const corpo = [
    `Revisão periódica da automação de testes, conforme \`docs/tas.md\`. Números de ${hoje}.`,
    "",
    "### Tamanho da suíte",
    "",
    "| Nível | Arquivos | Casos declarados |",
    "| --- | ---: | ---: |",
    ...tamanho,
    "",
    "Casos declarados: chamadas `it`, `test` e `def test_` no código. Um `it.each` conta 1, então a execução real tem mais casos.",
    "",
    `### Execuções dos últimos ${DIAS} dias`,
    "",
    "| Workflow | Execuções | Falhas | Taxa de falha | Duração média |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...(rascunho ? [semDados] : await execucoes()),
    "",
    "### Demandas de manutenção abertas",
    "",
    "| Label | Abertas | Issues |",
    "| --- | ---: | --- |",
    ...(rascunho ? ["| sem acesso à API do GitHub nesta execução | | |"] : await demandas()),
    "",
    `### Testes pulados ou em quarentena (${marcados.length})`,
    "",
    ...(marcados.length
      ? marcados.map(({ onde, tipo, issues }) => `- \`${onde}\`: ${tipo}, ${issues.map((n) => `#${n}`).join(", ")}`)
      : ["Nenhum."]),
    "",
    "### Roteiro da revisão",
    "",
    "- [ ] **Instabilidade:** algum teste falhou e passou sem mudança de código? Abrir issue e pôr em quarentena (`@flaky`).",
    `- [ ] **Quarentena:** cada teste acima ainda precisa estar pulado? Há mais de ${POLITICA.diasMaximosEmQuarentena} dias, corrigir ou propor remoção.`,
    "- [ ] **Tempo de execução:** algum nível passou do limite de `.github/politica-testes.json`? Ver o relatório de métricas da última regressão (`relatorios/metricas.html` no artefato `relatorios-testes`).",
    "- [ ] **Duplicação:** há passos repetidos nos testes que deveriam virar comando de apoio (`e2e/cypress/support`, `frontend/tests/unit/apoio.ts`)?",
    "- [ ] **Rastreabilidade:** todo teste novo cita o caso do plano de testes (`TCxx`) no nome?",
    "- [ ] **Demandas vencidas:** alguma issue de manutenção passou do prazo? Repriorizar ou trocar o responsável.",
    "- [ ] **Remoção:** algum teste cobre regra que não existe mais? Abrir issue de remoção com justificativa e risco.",
    "",
    "Feche esta issue com um comentário dizendo o que foi decidido em cada item.",
  ].join("\n");

  if (rascunho) return console.log(corpo);

  await api("POST", "/labels", { name: LABEL, color: "0E8A16", description: "Revisão periódica da automação de testes" });
  const abertas = await api("GET", `/issues?state=open&labels=${LABEL}&per_page=10`);
  if (abertas.length) {
    await api("POST", `/issues/${abertas[0].number}/comments`, { body: `A revisão anterior ainda está aberta. Números atualizados:\n\n${corpo}` });
    return console.log(`Revisão anterior ainda aberta: comentário na issue #${abertas[0].number}.`);
  }
  const criada = await api("POST", "/issues", { title: `Revisão periódica da TAS: ${hoje}`, body: corpo, labels: [LABEL] });
  console.log(`Issue de revisão aberta: #${criada.number}`);
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
