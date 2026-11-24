// Confere se os testes pulados ou em quarentena seguem a política de manutenção (docs/tas.md):
//   1. nenhum .only esquecido (faria o resto da suíte não rodar);
//   2. todo teste pulado (.skip, xit, pytest.mark.skip/xfail) cita a issue que justifica: #123;
//   3. todo teste instável (@flaky no título) cita a issue da quarentena: #123;
//   4. com GITHUB_TOKEN e GITHUB_REPOSITORY, a issue citada precisa estar aberta. Issue fechada
//      com o teste ainda pulado é quarentena esquecida.
// Uso: node .github/scripts/verificar-quarentena.mjs   (sai com 1 se houver violação)
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PASTAS = ["frontend/tests", "backend/app/tests", "e2e/cypress/e2e", "modulo-ia/tests"];
const EXTENSOES = /\.(ts|tsx|js|mjs|py)$/;

const SO_ESTE = /\b(?:it|test|describe)\.only\(/;
const PULADO = /\b(?:it|test|describe)\.skip\(|\bx(?:it|describe)\(|@pytest\.mark\.(?:skip|xfail)\b/;
const INSTAVEL = /@flaky\b/;
const ISSUE = /#(\d+)\b/g;

function arquivosDe(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (nome === "node_modules" || nome === "__pycache__") return [];
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho);
    return EXTENSOES.test(nome) ? [caminho] : [];
  });
}

/** Issues citadas na linha do teste ou nos comentários logo acima dela. */
function issuesPerto(linhas, indice) {
  const trecho = [linhas[indice]];
  for (let i = indice - 1; i >= 0 && /^\s*(\/\/|#|\*)/.test(linhas[i]); i -= 1) trecho.push(linhas[i]);
  return [...new Set([...trecho.join("\n").matchAll(ISSUE)].map((achada) => Number(achada[1])))];
}

/** Analisa o texto de um arquivo de teste: violações e marcações válidas (com as issues). */
export function analisar(conteudo, arquivo) {
  const linhas = conteudo.split("\n");
  const violacoes = [];
  const marcados = [];
  linhas.forEach((linha, indice) => {
    const onde = `${arquivo}:${indice + 1}`;
    if (SO_ESTE.test(linha)) violacoes.push(`${onde}: .only esquecido. Os outros testes do arquivo não rodam.`);

    const tipo = PULADO.test(linha) ? "pulado" : INSTAVEL.test(linha) ? "instável (@flaky)" : null;
    if (!tipo) return;
    const issues = issuesPerto(linhas, indice);
    if (!issues.length) {
      violacoes.push(`${onde}: teste ${tipo} sem issue. Cite a issue de manutenção no título ou no comentário acima (#123).`);
      return;
    }
    marcados.push({ onde, tipo, issues });
  });
  return { violacoes, marcados };
}

async function estadoDaIssue(numero) {
  const retorno = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues/${numero}`, {
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (retorno.status === 404) return "inexistente";
  if (!retorno.ok) throw new Error(`GET /issues/${numero}: HTTP ${retorno.status}`);
  return (await retorno.json()).state;
}

async function main() {
  const violacoes = [];
  const marcados = [];
  for (const pasta of PASTAS) {
    for (const caminho of arquivosDe(join(RAIZ, pasta))) {
      const resultado = analisar(readFileSync(caminho, "utf8"), relative(RAIZ, caminho));
      violacoes.push(...resultado.violacoes);
      marcados.push(...resultado.marcados);
    }
  }

  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    const estados = new Map();
    for (const numero of new Set(marcados.flatMap((marcado) => marcado.issues))) {
      estados.set(numero, await estadoDaIssue(numero));
    }
    for (const { onde, tipo, issues } of marcados) {
      if (issues.some((numero) => estados.get(numero) === "open")) continue;
      const citadas = issues.map((numero) => `#${numero} (${estados.get(numero) === "closed" ? "fechada" : "não existe"})`);
      violacoes.push(`${onde}: teste ${tipo} sem issue aberta: ${citadas.join(", ")}. Reative o teste ou reabra a issue.`);
    }
  } else {
    console.log("Sem GITHUB_TOKEN e GITHUB_REPOSITORY: o estado das issues citadas não foi conferido.");
  }

  const resumo = [
    `Testes pulados ou em quarentena: ${marcados.length}`,
    ...marcados.map(({ onde, tipo, issues }) => `- ${onde}: ${tipo}, ${issues.map((n) => `#${n}`).join(", ")}`),
    `Violações da política: ${violacoes.length}`,
    ...violacoes.map((violacao) => `- ${violacao}`),
  ].join("\n");
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Quarentena e testes pulados\n\n${resumo}\n\n`);
  }
  process.exit(violacoes.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
  });
}
