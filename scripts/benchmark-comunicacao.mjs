// Benchmark reproduzível de comunicação distribuída (Backend :4000 <-> Módulo de IA :3001).
// Uso (com docker compose ativo):
//   node scripts/benchmark-comunicacao.mjs --cenario=ia_direto --cenario=backend_com_ia --saida=docs/benchmark_comunicacao_brutas.csv
//   docker compose stop modulo-ia
//   node scripts/benchmark-comunicacao.mjs --cenario=backend_fallback_baseline --anexar --saida=docs/benchmark_comunicacao_brutas.csv
//   docker compose start modulo-ia

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");
const IA_URL = (process.env.IA_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const IA_API_KEY = process.env.RECOMENDACAO_API_KEY ?? "origem-mockup-key";
const WARMUPS = Number(process.env.BENCH_WARMUPS ?? 5);
const REPEATS = Number(process.env.BENCH_REPEATS ?? 30);

function parseArgs() {
  const cenarios = [];
  let saida = "docs/benchmark_comunicacao_brutas.csv";
  let anexar = false;

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--cenario=")) cenarios.push(arg.slice("--cenario=".length));
    else if (arg.startsWith("--saida=")) saida = arg.slice("--saida=".length);
    else if (arg === "--anexar") anexar = true;
  }

  return {
    cenarios: cenarios.length ? cenarios : ["ia_direto", "backend_com_ia"],
    saida,
    anexar,
  };
}

function gitInfo() {
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const shortSha = sha.slice(0, 7);
    const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    return { sha, shortSha, branch };
  } catch {
    return { sha: "desconhecido", shortSha: "desconhecido", branch: "desconhecido" };
  }
}

function carregarCatalogoPadrao() {
  const caminho = path.resolve("modulo-ia/data/catalogo_origem.json");
  return JSON.parse(readFileSync(caminho, "utf8"));
}

function stats(amostras) {
  const ordenadas = [...amostras].sort((a, b) => a - b);
  const n = ordenadas.length;
  const media = ordenadas.reduce((s, v) => s + v, 0) / n;
  const mediana =
    n % 2 === 1 ? ordenadas[(n - 1) / 2] : (ordenadas[n / 2 - 1] + ordenadas[n / 2]) / 2;
  const variancia =
    n > 1 ? ordenadas.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1) : 0;
  const desvio = Math.sqrt(variancia);
  const idxP95 = Math.min(n - 1, Math.ceil(n * 0.95) - 1);
  const p95 = ordenadas[idxP95];
  const min = ordenadas[0];
  const max = ordenadas[n - 1];
  const throughput = 1000 / mediana;
  return { media, mediana, desvio, p95, min, max, throughput };
}

async function executarCenario(nome, fn) {
  for (let i = 0; i < WARMUPS; i += 1) {
    await fn();
  }

  const amostras = [];
  const detalhes = [];
  for (let i = 1; i <= REPEATS; i += 1) {
    const t0 = performance.now();
    const meta = await fn();
    const elapsedMs = performance.now() - t0;
    amostras.push(elapsedMs);
    detalhes.push({ repeticao: i, elapsedMs, ...meta });
  }

  return { nome, amostras, detalhes, resumo: stats(amostras) };
}

async function main() {
  const { cenarios, saida, anexar } = parseArgs();
  const git = gitInfo();
  const timestamp = new Date().toISOString();
  const envInfo = `${os.type()} ${os.release()} | ${os.cpus()[0]?.model ?? "CPU"} (${os.cpus().length} CPUs) | Node ${process.version}`;
  const catalogo = carregarCatalogoPadrao();

  const definicoes = {
    ia_direto: async () => {
      const res = await fetch(`${IA_URL}/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": IA_API_KEY,
        },
        body: JSON.stringify({ product_id: "prd_201", limit: 4, catalog: catalogo }),
      });
      const corpo = await res.json();
      if (res.status !== 200 || !Array.isArray(corpo.recommendations)) {
        throw new Error(`ia_direto falhou: HTTP ${res.status}`);
      }
      return {
        httpStatus: res.status,
        fonteHeader: "ia_direto",
        resultados: corpo.recommendations.length,
      };
    },
    backend_com_ia: async () => {
      const res = await fetch(`${BACKEND_URL}/produtos/recomendacoes?produtoId=2001&limite=4`, {
        headers: { Accept: "application/json" },
      });
      const fonte = res.headers.get("x-recomendacao-fonte") ?? "";
      const corpo = await res.json();
      if (res.status !== 200 || fonte !== "ia") {
        throw new Error(`backend_com_ia falhou: HTTP ${res.status}, fonte=${fonte}`);
      }
      const lista = corpo.recomendados ?? corpo.produtosRecomendados ?? [];
      return {
        httpStatus: res.status,
        fonteHeader: fonte,
        resultados: lista.length,
      };
    },
    backend_fallback_baseline: async () => {
      const res = await fetch(`${BACKEND_URL}/produtos/recomendacoes?produtoId=2001&limite=4`, {
        headers: { Accept: "application/json" },
      });
      const fonte = res.headers.get("x-recomendacao-fonte") ?? "";
      const corpo = await res.json();
      if (res.status !== 200 || fonte !== "baseline") {
        throw new Error(`backend_fallback_baseline falhou: HTTP ${res.status}, fonte=${fonte}`);
      }
      const lista = corpo.recomendados ?? corpo.produtosRecomendados ?? [];
      return {
        httpStatus: res.status,
        fonteHeader: fonte,
        resultados: lista.length,
      };
    },
  };

  console.log(`Ambiente: ${envInfo}`);
  console.log(`Git: branch=${git.branch} | sha=${git.sha}`);
  console.log(`Protocolo: warmups=${WARMUPS} | repeats=${REPEATS}`);

  const cabecalho =
    "timestamp_utc,git_sha,branch,environment,scenario,repetition,http_status,fonte_header,results_count,elapsed_ms,median_ms,mean_ms,stdev_ms,p95_ms";
  const linhas = [];

  for (const nome of cenarios) {
    const fn = definicoes[nome];
    if (!fn) throw new Error(`Cenário desconhecido: ${nome}`);
    const r = await executarCenario(nome, fn);
    console.log(
      `[${nome}] mediana=${r.resumo.mediana.toFixed(3)} ms | media=${r.resumo.media.toFixed(3)} +/- ${r.resumo.desvio.toFixed(3)} ms | P95=${r.resumo.p95.toFixed(3)} ms | min=${r.resumo.min.toFixed(3)} ms | max=${r.resumo.max.toFixed(3)} ms | throughput=${r.resumo.throughput.toFixed(1)} req/s`,
    );

    for (const d of r.detalhes) {
      linhas.push(
        [
          timestamp,
          git.sha,
          git.branch,
          `"${envInfo.replace(/"/g, '""')}"`,
          nome,
          d.repeticao,
          d.httpStatus,
          d.fonteHeader,
          d.resultados,
          d.elapsedMs.toFixed(6),
          r.resumo.mediana.toFixed(6),
          r.resumo.media.toFixed(6),
          r.resumo.desvio.toFixed(6),
          r.resumo.p95.toFixed(6),
        ].join(","),
      );
    }
  }

  const caminhoSaida = path.resolve(saida);
  mkdirSync(path.dirname(caminhoSaida), { recursive: true });
  if (anexar && existsSync(caminhoSaida)) {
    const existente = readFileSync(caminhoSaida, "utf8").trimEnd();
    writeFileSync(caminhoSaida, `${existente}\n${linhas.join("\n")}\n`, "utf8");
  } else {
    writeFileSync(caminhoSaida, `${cabecalho}\n${linhas.join("\n")}\n`, "utf8");
  }
  console.log(`CSV salvo em: ${caminhoSaida} (+${linhas.length} linhas)`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
