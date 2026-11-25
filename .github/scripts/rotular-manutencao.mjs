// Lê o formulário de manutenção (.github/ISSUE_TEMPLATE/manutencao.yml) e sincroniza
// as labels falha:*, prioridade:* e flaky da issue. Política em docs/tas.md.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const GERENCIADAS = /^(falha:|prioridade:)/;

/** Texto da resposta logo abaixo de "### <titulo>" no corpo da issue. */
export function resposta(corpo, titulo) {
  const linhas = (corpo ?? "").replace(/\r\n/g, "\n").split("\n");
  const inicio = linhas.findIndex((linha) => linha.trim() === `### ${titulo}`);
  if (inicio < 0) return null;
  for (const linha of linhas.slice(inicio + 1)) {
    if (linha.startsWith("### ")) return null;
    if (linha.trim()) return linha.trim();
  }
  return null;
}

/** Decide quais labels entram e quais saem, a partir do corpo e das labels atuais. */
export function planejar(corpo, atuais) {
  const tipo = resposta(corpo, "Tipo de falha");
  const prioridade = resposta(corpo, "Prioridade");
  if (tipo === null && prioridade === null) return null; // não é issue do formulário

  const desejadas = new Set();
  for (const valor of [tipo, prioridade]) {
    const achada = valor?.match(/\(((?:falha|prioridade):[a-z]+)\)\s*$/);
    if (achada) desejadas.add(achada[1]);
  }
  // Só confia no corpo se a prioridade for uma opção do formulário: evita apagar labels
  // de uma issue comum que por acaso tenha um título "### Prioridade".
  if (![...desejadas].some((label) => label.startsWith("prioridade:"))) return null;

  const instavel = resposta(corpo, "O teste é instável?");
  const adicionar = [...desejadas].filter((label) => !atuais.includes(label));
  const remover = atuais.filter((label) => GERENCIADAS.test(label) && !desejadas.has(label));
  if (instavel === "Sim" && !atuais.includes("flaky")) adicionar.push("flaky");
  if (instavel !== "Sim" && atuais.includes("flaky")) remover.push("flaky");
  return { adicionar, remover };
}

async function api(metodo, caminho, corpo) {
  const retorno = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${caminho}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  // 404 ao remover: a label já não estava na issue. Não é erro.
  if (!retorno.ok && retorno.status !== 404) throw new Error(`${metodo} ${caminho}: HTTP ${retorno.status}`);
  return retorno.status === 204 ? null : retorno.json();
}

async function main() {
  const evento = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  // Relê a issue na hora: o evento pode estar velho se houve várias edições seguidas.
  const issue = await api("GET", `/issues/${evento.issue.number}`);
  const plano = planejar(issue.body, issue.labels.map((label) => label.name));
  if (!plano) return console.log("Issue fora do formulário de manutenção: nada a fazer.");

  const base = `/issues/${issue.number}/labels`;
  if (plano.adicionar.length) await api("POST", base, { labels: plano.adicionar });
  for (const label of plano.remover) await api("DELETE", `${base}/${encodeURIComponent(label)}`);
  console.log(
    `#${issue.number} adicionadas: ${plano.adicionar.join(", ") || "nenhuma"}; removidas: ${plano.remover.join(", ") || "nenhuma"}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
  });
}
