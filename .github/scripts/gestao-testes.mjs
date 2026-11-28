// Gestão dos testes da TAS (docs/tas.md). Confere duas regras que a política exige:
//   1. Testes críticos (.github/politica-testes.json, testesCriticos): o arquivo existe, o
//      identificador aparece no título de um teste e o arquivo não tem teste pulado nem em
//      quarentena. Teste @smoke também não pode ser @flaky.
//   2. Rastreabilidade (.github/rastreabilidade-testes.json): todo arquivo de teste está
//      mapeado para histórias e casos, ou marcado como detalhe técnico, e o mapa não aponta
//      para arquivo ou caso que não existe.
//   3. Backlog do plano de testes: caso marcado como "Automatizado (arquivos: TCnn)" tem o
//      identificador no título de um teste de cada arquivo citado.
// Uso: node .github/scripts/gestao-testes.mjs   (sai com 1 se houver violação)
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lerBacklog } from "../../scripts/metricas.mjs";
import { analisar } from "./verificar-quarentena.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PASTAS = ["frontend/tests", "backend/app/tests", "e2e/cypress", "modulo-ia/tests", "modulo-ia/tests_dados"];
const ARQUIVO_DE_TESTE = /(\.test\.(ts|tsx|js|mjs)|\.cy\.js|(^|\/)test_[^/]+\.py)$/;
const TITULO = /\b(?:describe|it|test)(?:\.each\([^)]*\))?\(/;

function arquivosDe(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (nome === "node_modules" || nome === "__pycache__") return [];
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho);
    return ARQUIVO_DE_TESTE.test(caminho) ? [caminho] : [];
  });
}

/** Linhas que abrem um describe, it ou test. */
function titulos(conteudo) {
  return conteudo.split("\n").filter((linha) => TITULO.test(linha));
}

function temIdNoTitulo(conteudo, id) {
  const padrao = new RegExp(`\\b${id}\\b`);
  return titulos(conteudo).some((linha) => padrao.test(linha));
}

/**
 * Violações da lista de testes críticos. `arquivos` é um mapa caminho -> conteúdo;
 * caminho ausente do mapa é arquivo que não existe.
 */
export function verificarCriticos(criticos, arquivos) {
  const violacoes = [];
  for (const { id, arquivo } of criticos) {
    const conteudo = arquivos[arquivo];
    if (conteudo === undefined) {
      violacoes.push(`${id}: o arquivo crítico ${arquivo} não existe. Remover teste crítico exige o checklist de remoção.`);
      continue;
    }
    if (!temIdNoTitulo(conteudo, id)) {
      violacoes.push(`${id}: nenhum teste de ${arquivo} tem o identificador no título.`);
    }
  }
  for (const arquivo of new Set(criticos.map((critico) => critico.arquivo))) {
    const conteudo = arquivos[arquivo];
    if (conteudo === undefined) continue;
    const { violacoes: semIssue, marcados } = analisar(conteudo, arquivo);
    for (const onde of [...marcados.map((marcado) => `${marcado.onde} (${marcado.tipo})`), ...semIssue.filter((v) => /pulado|instável/.test(v)).map((v) => v.split(": ")[0])]) {
      violacoes.push(`${onde}: arquivo com teste crítico não pode ter teste pulado nem em quarentena.`);
    }
  }
  for (const [arquivo, conteudo] of Object.entries(arquivos)) {
    conteudo.split("\n").forEach((linha, indice) => {
      if (linha.includes("@smoke") && linha.includes("@flaky")) {
        violacoes.push(`${arquivo}:${indice + 1}: teste @smoke não entra em quarentena (@flaky).`);
      }
    });
  }
  return violacoes;
}

/** Violações do mapa de rastreabilidade contra os arquivos de teste que existem. */
export function verificarRastreabilidade(mapa, arquivos) {
  const violacoes = [];
  for (const arquivo of Object.keys(arquivos)) {
    if (!mapa[arquivo]) violacoes.push(`${arquivo}: arquivo de teste fora da rastreabilidade. Inclua a entrada no mesmo PR.`);
  }
  for (const [arquivo, entrada] of Object.entries(mapa)) {
    const conteudo = arquivos[arquivo];
    if (conteudo === undefined) {
      violacoes.push(`${arquivo}: está na rastreabilidade, mas o arquivo não existe.`);
      continue;
    }
    if (entrada.tipo === "detalhe técnico") {
      if (!entrada.motivo?.trim()) violacoes.push(`${arquivo}: detalhe técnico sem motivo.`);
      continue;
    }
    if (entrada.tipo !== "requisito") {
      violacoes.push(`${arquivo}: tipo "${entrada.tipo}" desconhecido. Use "requisito" ou "detalhe técnico".`);
      continue;
    }
    const casos = entrada.casos ?? [];
    const historias = entrada.hu ?? [];
    if (!casos.length && !historias.length) violacoes.push(`${arquivo}: requisito sem história (HU) nem caso (TC).`);
    for (const historia of historias) {
      if (!/^HU-\d{2}$/.test(historia)) violacoes.push(`${arquivo}: história "${historia}" fora do formato HU-00.`);
    }
    for (const caso of casos) {
      if (!temIdNoTitulo(conteudo, caso)) violacoes.push(`${arquivo}: o caso ${caso} não aparece no título de nenhum teste do arquivo.`);
    }
  }
  return violacoes;
}

/**
 * Violações do backlog: toda afirmação de "Automatizado" precisa apontar arquivo que existe e
 * que tem o identificador do caso no título de um teste.
 */
export function verificarBacklog(itens, arquivos) {
  const violacoes = [];
  for (const { id, automatizado, status } of itens) {
    if (!automatizado) continue;
    const citados = status.match(/\(([^)]*):\s*[^:)]*\)\s*$/)?.[1].split(",").map((arquivo) => arquivo.trim()).filter(Boolean) ?? [];
    if (!citados.length) {
      violacoes.push(`${id}: status "Automatizado" sem arquivo citado. Use "Automatizado (arquivo: ${id})".`);
      continue;
    }
    for (const arquivo of citados) {
      if (arquivos[arquivo] === undefined) violacoes.push(`${id}: o backlog cita ${arquivo}, que não existe.`);
      else if (!temIdNoTitulo(arquivos[arquivo], id)) violacoes.push(`${id}: o backlog diz que ${arquivo} automatiza o caso, mas nenhum título do arquivo tem ${id}.`);
    }
  }
  return violacoes;
}

/**
 * Duplicação candidata entre arquivos de teste: trechos de pelo menos `minimo` linhas iguais,
 * ignorando linha vazia, linha só de pontuação e import. Devolve um achado por par de
 * arquivos, com a primeira ocorrência e quantas janelas coincidem. É candidata: quem
 * decide se vira comando de apoio é a revisão.
 */
export function duplicacoes(arquivos, minimo) {
  const janelas = new Map();
  for (const [arquivo, conteudo] of Object.entries(arquivos)) {
    const uteis = conteudo
      .split("\n")
      .map((texto, indice) => ({ texto: texto.trim(), linha: indice + 1 }))
      .filter(({ texto }) => texto && !/^[\s{}()[\];,]*$/.test(texto) && !/^(import|from|const .* = require\()/.test(texto));
    for (let i = 0; i + minimo <= uteis.length; i += 1) {
      const chave = uteis.slice(i, i + minimo).map(({ texto }) => texto).join("\n");
      const lista = janelas.get(chave) ?? [];
      lista.push({ arquivo, linha: uteis[i].linha });
      janelas.set(chave, lista);
    }
  }
  const pares = new Map();
  for (const ocorrencias of janelas.values()) {
    const [primeira, ...resto] = ocorrencias;
    const outra = resto.find((o) => o.arquivo !== primeira.arquivo);
    if (!outra) continue;
    const chave = [primeira.arquivo, outra.arquivo].sort().join(" | ");
    const achado = pares.get(chave) ?? { a: primeira.arquivo, linhaA: primeira.linha, b: outra.arquivo, linhaB: outra.linha, janelas: 0 };
    achado.janelas += 1;
    pares.set(chave, achado);
  }
  return [...pares.values()].sort((x, y) => y.janelas - x.janelas);
}

/** Arquivos de teste do repositório, caminho -> conteúdo. */
export function arquivosDeTeste() {
  return Object.fromEntries(
    PASTAS.flatMap((pasta) => arquivosDe(join(RAIZ, pasta))).map((caminho) => [relative(RAIZ, caminho).replaceAll("\\", "/"), readFileSync(caminho, "utf8")]),
  );
}

function main() {
  const politica = JSON.parse(readFileSync(join(RAIZ, ".github", "politica-testes.json"), "utf8"));
  const arquivos = arquivosDeTeste();
  const caminhoDoMapa = join(RAIZ, politica.rastreabilidade);
  const mapa = existsSync(caminhoDoMapa) ? JSON.parse(readFileSync(caminhoDoMapa, "utf8")).arquivos : null;

  const criticos = verificarCriticos(politica.testesCriticos ?? [], arquivos);
  const rastreabilidade = mapa ? verificarRastreabilidade(mapa, arquivos) : [`${politica.rastreabilidade}: arquivo de rastreabilidade não encontrado.`];
  const caminhoDoPlano = join(RAIZ, politica.planoDeTestes);
  const backlog = existsSync(caminhoDoPlano) ? lerBacklog(readFileSync(caminhoDoPlano, "utf8")) : [];
  const plano = backlog.length ? verificarBacklog(backlog, arquivos) : [`${politica.planoDeTestes}: backlog de automação não encontrado.`];
  const violacoes = [...criticos, ...rastreabilidade, ...plano];

  const resumo = [
    `Testes críticos conferidos: ${(politica.testesCriticos ?? []).length}`,
    `Arquivos de teste na rastreabilidade: ${mapa ? Object.keys(mapa).length : 0} de ${Object.keys(arquivos).length}`,
    `Casos do backlog marcados como automatizados: ${backlog.filter((item) => item.automatizado).length} de ${backlog.length}`,
    `Violações da gestão dos testes: ${violacoes.length}`,
    ...violacoes.map((violacao) => `- ${violacao}`),
  ].join("\n");
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Testes críticos e rastreabilidade\n\n${resumo}\n\n`);
  process.exit(violacoes.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
