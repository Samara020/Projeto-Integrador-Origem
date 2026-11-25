// Relatório de métricas da TAS: lê os JUnit XML de relatorios/ e gera
//   relatorios/metricas.html  (página para abrir no navegador)
//   relatorios/metricas.json  (os mesmos números, para outra ferramenta ler)
// e imprime o resumo em Markdown (no GitHub Actions, também em $GITHUB_STEP_SUMMARY).
// Uso: rode os níveis antes (npm run test:unit, test:backend, test:api, test:e2e) e depois
//   node scripts/metricas.mjs
// Com GITHUB_TOKEN e GITHUB_REPOSITORY, inclui a taxa de sucesso da esteira nos últimos dias.
// O relatório só informa: quem aprova ou reprova a esteira são os testes e o Quality Gate.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analisar } from "../.github/scripts/verificar-quarentena.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELATORIOS = join(RAIZ, "relatorios");
const PASTAS_DE_TESTE = ["frontend/tests", "backend/app/tests", "e2e/cypress/e2e", "modulo-ia/tests"];

// Ordem em que os níveis aparecem. O prefixo do arquivo XML diz de qual nível ele é.
export const NIVEIS = [
  { chave: "unit", titulo: "Unitário", prefixo: "unit-" },
  { chave: "backend", titulo: "Backend", prefixo: "backend-" },
  { chave: "api", titulo: "API", prefixo: "api-" },
  { chave: "e2e", titulo: "End-to-End", prefixo: "e2e-" },
  { chave: "quarentena", titulo: "Quarentena (@flaky)", prefixo: "quarentena-" },
];

const ROTULO = { verde: "Verde", amarelo: "Amarelo", vermelho: "Vermelho", "sem-dados": "Sem dados" };

function texto(atributo) {
  return (atributo ?? "")
    .replace(/&#10;/g, "\n")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Casos de um JUnit XML (Jest, pytest, Cypress ou node:test): nome, arquivo, segundos e estado. */
export function lerCasos(xml) {
  const casos = [];
  for (const [, atributos, corpo] of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const atributo = (nome) => texto(atributos.match(new RegExp(`\\b${nome}="([^"]*)"`))?.[1]);
    const estado = /<(?:failure|error)\b/.test(corpo ?? "") ? "falhou" : /<skipped\b/.test(corpo ?? "") ? "ignorado" : "passou";
    casos.push({
      nome: atributo("name"),
      arquivo: atributo("file") || atributo("classname"),
      segundos: Number(atributo("time")) || 0,
      estado,
    });
  }
  return casos;
}

/** Soma os casos de um nível. O tempo de relógio, quando existe, vem de relatorios/tempos.json. */
export function resumirNivel(casos, relogio) {
  const conta = (estado) => casos.filter((caso) => caso.estado === estado).length;
  const falhas = conta("falhou");
  const ignorados = conta("ignorado");
  const executados = casos.length - ignorados;
  return {
    casos: casos.length,
    aprovados: conta("passou"),
    falhas,
    ignorados,
    taxaDeAprovacao: executados ? Number(((conta("passou") / executados) * 100).toFixed(1)) : null,
    segundos: Number((relogio ?? casos.reduce((soma, caso) => soma + caso.segundos, 0)).toFixed(1)),
    tempoDeRelogio: relogio !== undefined,
  };
}

/** Cor do nível e o motivo, pela política: falha é vermelho; tempo ou ignorado acima do limite é amarelo. */
export function semaforo(resumo, limiteDeTempo, maximoDeIgnorados) {
  if (!resumo || !resumo.casos) return { cor: "sem-dados", motivos: ["o nível não rodou ou não gerou relatório"] };
  if (resumo.falhas) return { cor: "vermelho", motivos: [`${resumo.falhas} caso(s) falharam`] };
  const motivos = [];
  if (limiteDeTempo !== undefined && resumo.segundos > limiteDeTempo) {
    motivos.push(`levou ${numero(resumo.segundos)} s, acima do limite de ${limiteDeTempo} s`);
  }
  if (resumo.ignorados > maximoDeIgnorados) {
    motivos.push(`${resumo.ignorados} caso(s) ignorados, acima do máximo de ${maximoDeIgnorados}`);
  }
  return { cor: motivos.length ? "amarelo" : "verde", motivos };
}

/** Pior cor entre as informadas. Nível sem dados não melhora nem piora o geral. */
export function piorCor(cores) {
  for (const cor of ["vermelho", "amarelo", "verde"]) if (cores.includes(cor)) return cor;
  return "sem-dados";
}

function numero(valor) {
  return String(valor).replace(".", ",");
}

function arquivosDe(pasta) {
  if (!existsSync(pasta)) return [];
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (nome === "node_modules" || nome === "__pycache__") return [];
    if (statSync(caminho).isDirectory()) return arquivosDe(caminho);
    return /\.(ts|tsx|js|mjs|py)$/.test(nome) ? [caminho] : [];
  });
}

/** Testes pulados ou em quarentena no código, com as issues citadas. */
function marcadosNoCodigo() {
  return PASTAS_DE_TESTE.flatMap((pasta) =>
    arquivosDe(join(RAIZ, pasta)).flatMap(
      (caminho) => analisar(readFileSync(caminho, "utf8"), relative(RAIZ, caminho)).marcados,
    ),
  );
}

/** Execuções concluídas dos workflows de teste na janela, por workflow. Null sem acesso à API. */
async function esteira(dias) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!process.env.GITHUB_TOKEN || !repo) return null;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const execucoes = [];
  // 100 por página; 5 páginas cobrem 500 execuções na janela, bem acima do uso do projeto.
  for (let pagina = 1; pagina <= 5; pagina += 1) {
    const retorno = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?created=%3E%3D${desde}&status=completed&per_page=100&page=${pagina}`,
      {
        headers: {
          authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      },
    );
    if (!retorno.ok) throw new Error(`GET /actions/runs: HTTP ${retorno.status}`);
    const { workflow_runs: lote = [] } = await retorno.json();
    execucoes.push(...lote);
    if (lote.length < 100) break;
  }
  return resumirEsteira(execucoes);
}

/** Agrupa as execuções por workflow de teste. Cancelada não conta como sucesso nem como falha. */
export function resumirEsteira(execucoes) {
  const porWorkflow = new Map();
  for (const execucao of execucoes) {
    if (!/^Testes/.test(execucao.name) || execucao.conclusion === "cancelled" || execucao.conclusion === "skipped") continue;
    const dado = porWorkflow.get(execucao.name) ?? { workflow: execucao.name, execucoes: 0, sucessos: 0, segundos: 0 };
    dado.execucoes += 1;
    if (execucao.conclusion === "success") dado.sucessos += 1;
    dado.segundos += (new Date(execucao.updated_at) - new Date(execucao.run_started_at)) / 1000;
    porWorkflow.set(execucao.name, dado);
  }
  const linhas = [...porWorkflow.values()].map((dado) => ({
    workflow: dado.workflow,
    execucoes: dado.execucoes,
    sucessos: dado.sucessos,
    taxaDeSucesso: Number(((dado.sucessos / dado.execucoes) * 100).toFixed(1)),
    minutosEmMedia: Number((dado.segundos / dado.execucoes / 60).toFixed(1)),
  }));
  const total = linhas.reduce((soma, linha) => soma + linha.execucoes, 0);
  const sucessos = linhas.reduce((soma, linha) => soma + linha.sucessos, 0);
  return { linhas, execucoes: total, taxaDeSucesso: total ? Number(((sucessos / total) * 100).toFixed(1)) : null };
}

function html(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function pagina(dados) {
  // O JUnit do Cypress repete o título do caso no lugar do arquivo: aí o arquivo não é mostrado.
  const origem = (caso) => (caso.arquivo && !caso.nome.includes(caso.arquivo) ? caso.arquivo : "");
  const selo = (cor) => `<span class="selo selo-${cor}">${ROTULO[cor]}</span>`;
  const linhasDosNiveis = dados.niveis
    .map(({ titulo, resumo, sinal, limite }) =>
      resumo
        ? `<tr><th scope="row">${html(titulo)}</th><td>${selo(sinal.cor)}</td><td class="n">${resumo.casos}</td><td class="n">${resumo.aprovados}</td><td class="n">${resumo.falhas}</td><td class="n">${resumo.ignorados}</td><td class="n">${resumo.taxaDeAprovacao === null ? "" : `${numero(resumo.taxaDeAprovacao)}%`}</td><td class="n">${numero(resumo.segundos)} s</td><td class="n">${limite === undefined ? "" : `${limite} s`}</td><td>${html(sinal.motivos.join("; "))}</td></tr>`
        : `<tr><th scope="row">${html(titulo)}</th><td>${selo(sinal.cor)}</td><td colspan="7"></td><td>${html(sinal.motivos.join("; "))}</td></tr>`,
    )
    .join("\n");
  const lista = (itens, vazio) => (itens.length ? `<ul>${itens.map((item) => `<li>${item}</li>`).join("")}</ul>` : `<p class="vazio">${vazio}</p>`);
  const esteiraHtml = dados.esteira
    ? `<p>${dados.esteira.execucoes} execuções concluídas em ${dados.politica.diasDaJanelaDaEsteira} dias. Taxa de sucesso: <strong>${dados.esteira.taxaDeSucesso === null ? "sem execuções" : `${numero(dados.esteira.taxaDeSucesso)}%`}</strong> (mínimo da política: ${dados.politica.taxaMinimaDeSucessoDaEsteira}%).</p>
<div class="rolagem">
<table>
<thead><tr><th scope="col">Workflow</th><th scope="col" class="n">Execuções</th><th scope="col" class="n">Sucessos</th><th scope="col" class="n">Taxa de sucesso</th><th scope="col" class="n">Duração média</th></tr></thead>
<tbody>
${dados.esteira.linhas.map((l) => `<tr><th scope="row">${html(l.workflow)}</th><td class="n">${l.execucoes}</td><td class="n">${l.sucessos}</td><td class="n">${numero(l.taxaDeSucesso)}%</td><td class="n">${numero(l.minutosEmMedia)} min</td></tr>`).join("\n")}
</tbody>
</table>
</div>`
    : `<p class="vazio">Sem acesso à API do GitHub nesta execução. No GitHub Actions este bloco mostra a taxa de sucesso da esteira.</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Métricas dos testes do Origem · ${html(dados.geradoEm)}</title>
<meta name="description" content="Resultado, tempo e estabilidade dos testes automatizados do Origem por nível.">
<style>
:root { --fundo: #f7f5f1; --papel: #ffffff; --texto: #1f1d1a; --apagado: #625c53; --linha: #ddd7cd; --verde: #1e6b3c; --amarelo: #8a5a00; --vermelho: #a3261d; --cinza: #5b5b5b; }
@media (prefers-color-scheme: dark) { :root { --fundo: #171613; --papel: #201e1b; --texto: #efebe4; --apagado: #a8a195; --linha: #38342e; --verde: #6fcf97; --amarelo: #e6b655; --vermelho: #f08a80; --cinza: #a8a195; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--fundo); color: var(--texto); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 68rem; margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 1rem 3rem; }
h1 { font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.2; margin: 0 0 .5rem; }
h2 { font-size: 1.25rem; margin: 2.5rem 0 .75rem; }
p { margin: 0 0 1rem; }
.apagado, .vazio { color: var(--apagado); }
.geral { background: var(--papel); border: 1px solid var(--linha); border-radius: 8px; padding: 1rem 1.25rem; margin-top: 1.5rem; }
.geral p { margin: 0; }
.rolagem { overflow-x: auto; background: var(--papel); border: 1px solid var(--linha); border-radius: 8px; }
table { border-collapse: collapse; width: 100%; font-size: .9375rem; }
th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid var(--linha); vertical-align: top; }
tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
thead th { font-weight: 600; white-space: nowrap; }
tbody th { font-weight: 600; }
.junto { white-space: nowrap; }
.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.selo { display: inline-block; padding: 0 .5rem; border: 1px solid currentColor; border-radius: 8px; font-weight: 600; font-size: .875rem; white-space: nowrap; }
.selo-verde { color: var(--verde); } .selo-amarelo { color: var(--amarelo); } .selo-vermelho { color: var(--vermelho); } .selo-sem-dados { color: var(--cinza); }
ul { margin: 0 0 1rem; padding-left: 1.25rem; }
li { margin-bottom: .25rem; }
code { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; font-size: .875em; }
</style>
</head>
<body>
<main>
<h1>Métricas dos testes do Origem</h1>
<p class="apagado">Gerado em ${html(dados.geradoEm)}${dados.commit ? ` · commit <code>${html(dados.commit.slice(0, 7))}</code>` : ""}${dados.execucaoUrl ? ` · <a href="${html(dados.execucaoUrl)}">execução no GitHub Actions</a>` : ""}</p>

<div class="geral">
<p>Situação geral: ${selo(dados.geral)} ${html(dados.fraseGeral)}</p>
</div>

<h2>Resultado por nível</h2>
<div class="rolagem">
<table>
<thead><tr><th scope="col">Nível</th><th scope="col">Situação</th><th scope="col" class="n">Casos</th><th scope="col" class="n">Aprovados</th><th scope="col" class="n">Falhas</th><th scope="col" class="n">Ignorados</th><th scope="col" class="n">Aprovação</th><th scope="col" class="n">Tempo</th><th scope="col" class="n">Limite</th><th scope="col">Motivo</th></tr></thead>
<tbody>
${linhasDosNiveis}
</tbody>
</table>
</div>
<p class="apagado">Verde: sem falha e dentro dos limites. Amarelo: sem falha, mas com tempo ou casos ignorados acima do limite de <code>.github/politica-testes.json</code>. Vermelho: há caso reprovado. A quarentena não entra na situação geral.</p>

<h2>Casos reprovados</h2>
${lista(dados.falhas.map((f) => `<strong>${html(f.nivel)}</strong> · ${html(f.nome)}${origem(f) ? ` <span class="apagado">(${html(origem(f))})</span>` : ""}`), "Nenhum caso reprovado.")}

<h2>Testes pulados ou em quarentena no código</h2>
${lista(dados.marcados.map((m) => `<code>${html(m.onde)}</code>: ${html(m.tipo)}, ${m.issues.map((n) => `#${n}`).join(", ")}`), "Nenhum teste pulado nem em quarentena.")}

<h2>Os 10 casos mais lentos</h2>
<div class="rolagem">
<table>
<thead><tr><th scope="col">Caso</th><th scope="col">Nível</th><th scope="col" class="n">Tempo</th></tr></thead>
<tbody>
${dados.lentos.map((c) => `<tr><td>${html(c.nome)}${origem(c) ? `<br><span class="apagado">${html(origem(c))}</span>` : ""}</td><td class="junto">${html(c.nivel)}</td><td class="n">${numero(c.segundos.toFixed(2))} s</td></tr>`).join("\n")}
</tbody>
</table>
</div>

<h2>Esteira nos últimos ${dados.politica.diasDaJanelaDaEsteira} dias</h2>
${esteiraHtml}
</main>
</body>
</html>
`;
}

function markdown(dados) {
  return [
    `### Métricas dos testes: ${ROTULO[dados.geral]}`,
    "",
    dados.fraseGeral,
    "",
    "| Nível | Situação | Casos | Aprovados | Falhas | Ignorados | Aprovação | Tempo | Limite |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...dados.niveis.map(({ titulo, resumo, sinal, limite }) =>
      resumo
        ? `| ${titulo} | ${ROTULO[sinal.cor]} | ${resumo.casos} | ${resumo.aprovados} | ${resumo.falhas} | ${resumo.ignorados} | ${resumo.taxaDeAprovacao === null ? "" : `${numero(resumo.taxaDeAprovacao)}%`} | ${numero(resumo.segundos)} s | ${limite === undefined ? "" : `${limite} s`} |`
        : `| ${titulo} | ${ROTULO[sinal.cor]} | | | | | | | |`,
    ),
    "",
    dados.esteira
      ? `Esteira nos últimos ${dados.politica.diasDaJanelaDaEsteira} dias: ${dados.esteira.execucoes} execuções, ${dados.esteira.taxaDeSucesso === null ? "sem taxa" : `${numero(dados.esteira.taxaDeSucesso)}% de sucesso`} (mínimo ${dados.politica.taxaMinimaDeSucessoDaEsteira}%).`
      : "Esteira: sem acesso à API do GitHub nesta execução.",
    `Testes pulados ou em quarentena no código: ${dados.marcados.length}.`,
    "Página completa: `relatorios/metricas.html` (no GitHub Actions, dentro do artefato `relatorios-testes`).",
    "",
  ].join("\n");
}

async function main() {
  const politica = JSON.parse(readFileSync(join(RAIZ, ".github", "politica-testes.json"), "utf8"));
  const arquivosXml = existsSync(RELATORIOS) ? readdirSync(RELATORIOS).filter((nome) => nome.endsWith(".xml")) : [];
  const tempos = existsSync(join(RELATORIOS, "tempos.json")) ? JSON.parse(readFileSync(join(RELATORIOS, "tempos.json"), "utf8")) : {};

  const todos = [];
  const niveis = NIVEIS.map(({ chave, titulo, prefixo }) => {
    const casos = arquivosXml
      .filter((nome) => nome.startsWith(prefixo))
      .flatMap((nome) => lerCasos(readFileSync(join(RELATORIOS, nome), "utf8")));
    todos.push(...casos.map((caso) => ({ ...caso, nivel: titulo })));
    const resumo = casos.length ? resumirNivel(casos, tempos[chave]?.segundos) : null;
    const limite = politica.limiteDeTempoSegundos[chave];
    // Na quarentena a falha é esperada: o nível só informa, sem cor de alerta.
    const sinal = chave === "quarentena" && resumo ? { cor: "sem-dados", motivos: ["não entra na situação geral"] } : semaforo(resumo, limite, politica.maximoDeIgnorados);
    return { chave, titulo, resumo, sinal, limite };
  });

  let dadosDaEsteira = null;
  try {
    dadosDaEsteira = await esteira(politica.diasDaJanelaDaEsteira);
  } catch (erro) {
    console.error(`Não foi possível ler as execuções da esteira: ${erro.message}`);
  }

  const cores = niveis.filter((nivel) => nivel.chave !== "quarentena").map((nivel) => nivel.sinal.cor);
  const esteiraAbaixo = dadosDaEsteira?.taxaDeSucesso !== null && dadosDaEsteira?.taxaDeSucesso !== undefined && dadosDaEsteira.taxaDeSucesso < politica.taxaMinimaDeSucessoDaEsteira;
  if (esteiraAbaixo) cores.push("amarelo");
  const geral = piorCor(cores);
  const semDados = niveis.filter((nivel) => nivel.chave !== "quarentena" && nivel.sinal.cor === "sem-dados").map((nivel) => nivel.titulo);
  const fraseGeral = [
    geral === "vermelho" && "Há caso reprovado.",
    geral === "amarelo" && "Nenhum caso reprovado, mas há item acima do limite da política.",
    geral === "verde" && "Nenhum caso reprovado e tudo dentro dos limites da política.",
    geral === "sem-dados" && "Nenhum relatório de teste foi encontrado em relatorios/.",
    semDados.length && geral !== "sem-dados" && `Sem dados de: ${semDados.join(", ")}.`,
    esteiraAbaixo && `A taxa de sucesso da esteira (${numero(dadosDaEsteira.taxaDeSucesso)}%) está abaixo do mínimo de ${politica.taxaMinimaDeSucessoDaEsteira}%.`,
  ]
    .filter(Boolean)
    .join(" ");

  const dados = {
    geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Recife", dateStyle: "short", timeStyle: "short" }),
    commit: process.env.GITHUB_SHA ?? null,
    execucaoUrl: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    politica,
    geral,
    fraseGeral,
    niveis,
    falhas: todos.filter((caso) => caso.estado === "falhou" && caso.nivel !== "Quarentena (@flaky)"),
    lentos: [...todos].sort((a, b) => b.segundos - a.segundos).slice(0, 10),
    marcados: marcadosNoCodigo(),
    esteira: dadosDaEsteira,
  };

  mkdirSync(RELATORIOS, { recursive: true });
  writeFileSync(join(RELATORIOS, "metricas.html"), pagina(dados));
  writeFileSync(join(RELATORIOS, "metricas.json"), `${JSON.stringify(dados, null, 2)}\n`);
  const resumo = markdown(dados);
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${resumo}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((erro) => {
    console.error(erro.message);
    process.exit(1);
  });
}
