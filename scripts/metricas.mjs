// Relatórios de qualidade da TAS: lê os JUnit XML de relatorios/, o backlog do plano de
// testes e, com acesso à API do GitHub, as execuções da esteira e os defeitos abertos. Gera
//   relatorios/metricas.html  (relatório técnico, para a equipe de desenvolvimento)
//   relatorios/negocio.html   (relatório de negócio, para quem decide sem ser técnico)
//   relatorios/metricas.json  (os mesmos números, para outra ferramenta ler)
// e imprime o resumo em Markdown (no GitHub Actions, também em $GITHUB_STEP_SUMMARY).
// Uso: rode os níveis antes (npm run test:unit, test:backend, test:api, test:e2e) e depois
//   node scripts/metricas.mjs
// Nenhum número nem texto de diagnóstico é fixo: tudo sai dos dados lidos. Dado que não pôde
// ser lido aparece como "sem dados" e impede o verde.
// Os relatórios só informam: quem aprova ou reprova a esteira são os testes e o Quality Gate.
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

/** Casos de um JUnit XML (Jest, pytest, Cypress ou node:test): nome, arquivo, segundos, estado e, na falha, a primeira linha do erro. */
export function lerCasos(xml) {
  const casos = [];
  for (const [, atributos, corpo] of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const atributo = (nome) => texto(atributos.match(new RegExp(`\\b${nome}="([^"]*)"`))?.[1]);
    const estado = /<(?:failure|error)\b/.test(corpo ?? "") ? "falhou" : /<skipped\b/.test(corpo ?? "") ? "ignorado" : "passou";
    const falha = (corpo ?? "").match(/<(?:failure|error)\b([^>]*)>([\s\S]*?)(?:<\/(?:failure|error)>|$)/);
    const mensagem = falha ? texto(falha[1].match(/\bmessage="([^"]*)"/)?.[1]) || texto(falha[2].replace(/<!\[CDATA\[|\]\]>/g, "")) : "";
    casos.push({
      nome: atributo("name"),
      arquivo: atributo("file") || atributo("classname"),
      segundos: Number(atributo("time")) || 0,
      estado,
      ...(estado === "falhou" ? { erro: mensagem.trim().split("\n")[0] } : {}),
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

function temApi() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY);
}

async function api(caminho) {
  const retorno = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}${caminho}`, {
    headers: {
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!retorno.ok) throw new Error(`GET ${caminho.split("?")[0]}: HTTP ${retorno.status}`);
  return retorno.json();
}

/** Execuções concluídas dos workflows de teste na janela, por workflow. Null sem acesso à API. */
async function esteira(dias) {
  if (!temApi()) return null;
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const execucoes = [];
  // 100 por página; 5 páginas cobrem 500 execuções na janela, bem acima do uso do projeto.
  for (let pagina = 1; pagina <= 5; pagina += 1) {
    const { workflow_runs: lote = [] } = await api(`/actions/runs?created=%3E%3D${desde}&status=completed&per_page=100&page=${pagina}`);
    execucoes.push(...lote);
    if (lote.length < 100) break;
  }
  return resumirEsteira(execucoes);
}

/** Issues abertas com a label de defeito do sistema. Null sem acesso à API. */
async function defeitosAbertos() {
  if (!temApi()) return null;
  return resumirDefeitos(await api("/issues?state=open&labels=falha%3Asut&per_page=100"));
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

/** Defeitos do sistema em aberto, com a prioridade lida das labels. A API de issues também devolve PRs. */
export function resumirDefeitos(issues) {
  const itens = issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => {
      const prioridade = issue.labels.map((label) => label.name ?? label).find((nome) => nome.startsWith("prioridade:"));
      return { numero: issue.number, titulo: issue.title, url: issue.html_url, prioridade: prioridade?.slice("prioridade:".length) ?? null };
    });
  return { itens, total: itens.length, altas: itens.filter((item) => item.prioridade === "alta").length };
}

/**
 * Linhas do backlog de automação do plano de testes. A tabela é reconhecida pelo cabeçalho
 * "ID do caso ... Status"; o Status começa com "Automatizado" ou "Pendente".
 */
export function lerBacklog(markdownDoPlano) {
  const itens = [];
  let colunas = null;
  for (const linha of markdownDoPlano.split("\n")) {
    if (!linha.trim().startsWith("|")) {
      colunas = null;
      continue;
    }
    const celulas = linha.trim().replace(/^\||\|$/g, "").split("|").map((celula) => celula.trim());
    if (celulas.includes("ID do caso") && celulas.includes("Status")) {
      colunas = celulas;
      continue;
    }
    if (!colunas || celulas.every((celula) => /^:?-+:?$/.test(celula))) continue;
    const campo = (nome) => celulas[colunas.indexOf(nome)] ?? "";
    const status = campo("Status");
    itens.push({
      id: campo("ID do caso"),
      hu: campo("HU"),
      nivel: campo("Nível"),
      risco: Number(campo("Risco")) || null,
      automatizado: /^Automatizado\b/i.test(status),
      status,
    });
  }
  return itens;
}

/** Cobertura de riscos: casos do backlog com status Automatizado sobre o total. */
export function resumirRiscos(itens) {
  if (!itens.length) return null;
  const automatizados = itens.filter((item) => item.automatizado).length;
  return {
    total: itens.length,
    automatizados,
    cobertura: Number(((automatizados / itens.length) * 100).toFixed(1)),
    pendentes: itens.filter((item) => !item.automatizado),
  };
}

/** Cobertura de código de um pacote, do coverage-summary.json do Jest, contra o mínimo da política. */
export function resumirCobertura(sumario, minimo = {}) {
  const linhas = sumario.total.lines.pct;
  const ramos = sumario.total.branches.pct;
  return {
    linhas,
    ramos,
    minimoDeLinhas: minimo.lines ?? null,
    minimoDeRamos: minimo.branches ?? null,
    abaixoDoMinimo: (minimo.lines !== undefined && linhas < minimo.lines) || (minimo.branches !== undefined && ramos < minimo.branches),
  };
}

/** O que cada escopo de E2E significa para a leitura do relatório. */
export const ESCOPOS = {
  completo: "Execução completa: todos os níveis, com todos os casos End-to-End.",
  smoke: "Execução de PR: Unitário, backend e API inteiros, e só os casos End-to-End do caminho crítico (@smoke). Os demais casos End-to-End rodam no push da main e na regressão diária.",
  nenhum: "Execução de push: Unitário, backend e API inteiros, sem End-to-End. O End-to-End roda no PR (@smoke), no push da main e na regressão diária.",
};

/** Casos do caminho crítico (@smoke no título) no resultado do E2E. Null se nenhum rodou. */
export function caminhoCritico(casosDoE2E) {
  const casos = casosDoE2E.filter((caso) => caso.nome.includes("@smoke"));
  if (!casos.length) return null;
  return {
    total: casos.length,
    aprovados: casos.filter((caso) => caso.estado === "passou").length,
    reprovados: casos.filter((caso) => caso.estado === "falhou").map((caso) => caso.nome.replace(/\s*@smoke\b/g, "")),
    ignorados: casos.filter((caso) => caso.estado === "ignorado").length,
  };
}

/**
 * Situação geral, pela regra do relatório: vermelho com caso reprovado; amarelo sem falha mas
 * com pendência (limite da política, risco do backlog sem teste, esteira abaixo do mínimo ou
 * dado que não pôde ser lido); verde só com tudo em dia e todos os dados presentes.
 */
export function situacaoGeral({ niveis, riscos, esteira, politica }) {
  const avaliados = niveis.filter((nivel) => nivel.chave !== "quarentena" && !nivel.foraDoEscopo);
  if (avaliados.every((nivel) => nivel.sinal.cor === "sem-dados")) {
    return {
      cor: "sem-dados",
      motivos: ["Nenhum relatório de teste foi encontrado em relatorios/."],
      simples: ["As verificações automáticas não rodaram."],
    };
  }
  const comFalha = avaliados.filter((nivel) => nivel.sinal.cor === "vermelho");
  if (comFalha.length) {
    return {
      cor: "vermelho",
      motivos: comFalha.map((nivel) => `${nivel.titulo}: ${nivel.sinal.motivos.join("; ")}.`),
      simples: comFalha.map((nivel) => `Há verificação reprovada no nível ${nivel.titulo}.`),
    };
  }
  // Cada pendência tem a versão técnica e a versão em linguagem simples, para o relatório de negócio.
  const motivos = [];
  const simples = [];
  const pendencia = (tecnico, simplificado) => {
    motivos.push(tecnico);
    simples.push(simplificado);
  };
  for (const nivel of avaliados) {
    if (nivel.sinal.cor === "amarelo") {
      pendencia(`${nivel.titulo}: ${nivel.sinal.motivos.join("; ")}.`, `As verificações do nível ${nivel.titulo} passaram, mas demoraram além do previsto ou tiveram casos pulados.`);
    }
    if (nivel.sinal.cor === "sem-dados") {
      pendencia(`${nivel.titulo}: sem dados, o nível não rodou ou não gerou relatório.`, `As verificações do nível ${nivel.titulo} não rodaram.`);
    }
  }
  if (!riscos) {
    pendencia(
      "Cobertura de riscos: sem dados, o backlog do plano de testes não foi encontrado.",
      "O plano de testes não foi encontrado, então não dá para dizer quantos casos planejados têm verificação automática.",
    );
  } else if (riscos.cobertura < politica.coberturaMinimaDeRiscos) {
    pendencia(
      `Cobertura de riscos em ${numero(riscos.cobertura)}%, abaixo de ${politica.coberturaMinimaDeRiscos}%: ${riscos.pendentes.length} caso(s) do backlog sem teste automatizado (${riscos.pendentes.map((item) => item.id).join(", ")}).`,
      `${riscos.pendentes.length} dos ${riscos.total} casos planejados ainda não têm verificação automática.`,
    );
  }
  if (!esteira || esteira.taxaDeSucesso === null) {
    pendencia("Estabilidade da esteira: sem dados nesta execução.", "Não há dados do histórico de execuções das verificações.");
  } else if (esteira.taxaDeSucesso < politica.taxaMinimaDeSucessoDaEsteira) {
    pendencia(
      `Taxa de sucesso da esteira em ${numero(esteira.taxaDeSucesso)}% nos últimos ${politica.diasDaJanelaDaEsteira} dias, abaixo do mínimo de ${politica.taxaMinimaDeSucessoDaEsteira}%.`,
      `Nos últimos ${politica.diasDaJanelaDaEsteira} dias, ${numero(esteira.taxaDeSucesso)}% das execuções das verificações terminaram sem falha. O esperado é pelo menos ${politica.taxaMinimaDeSucessoDaEsteira}%.`,
    );
  }
  if (motivos.length) return { cor: "amarelo", motivos, simples };
  return {
    cor: "verde",
    motivos: ["Nenhum caso reprovado, riscos do backlog cobertos e esteira estável."],
    simples: ["Nenhuma verificação reprovou, todos os casos planejados têm verificação automática e as execuções estão estáveis."],
  };
}

/** Recomendação de liberação, em linguagem de negócio, a partir da cor. */
export function recomendacao(cor) {
  return {
    verde: "Liberar.",
    amarelo: "Liberar com ressalvas: nenhuma verificação reprovou, mas há pendência a acompanhar.",
    vermelho: "Não liberar: há verificação reprovada.",
    "sem-dados": "Sem dados para recomendar: as verificações não rodaram.",
  }[cor];
}

function html(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const ESTILO = `:root { --fundo: #f7f5f1; --papel: #ffffff; --texto: #1f1d1a; --apagado: #625c53; --linha: #ddd7cd; --verde: #1e6b3c; --amarelo: #8a5a00; --vermelho: #a3261d; --cinza: #5b5b5b; }
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
.motivos { margin: .75rem 0 0; }
.indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; margin: 0; }
.indicador { background: var(--papel); border: 1px solid var(--linha); border-radius: 8px; padding: 1rem 1.25rem; }
.indicador dt { color: var(--apagado); font-size: .9375rem; }
.indicador dd { margin: .25rem 0 0; font-size: 1.5rem; font-weight: 600; line-height: 1.25; font-variant-numeric: tabular-nums; }
.indicador small { display: block; margin-top: .25rem; font-size: .9375rem; font-weight: 400; color: var(--apagado); }
a { color: inherit; }
`;

function lista(itens, vazio) {
  return itens.length ? `<ul>${itens.map((item) => `<li>${item}</li>`).join("")}</ul>` : `<p class="vazio">${vazio}</p>`;
}

function selo(cor) {
  return `<span class="selo selo-${cor}">${ROTULO[cor]}</span>`;
}

function pagina(dados) {
  // O JUnit do Cypress repete o título do caso no lugar do arquivo: aí o arquivo não é mostrado.
  const origem = (caso) => (caso.arquivo && !caso.nome.includes(caso.arquivo) ? caso.arquivo : "");
  const linhasDosNiveis = dados.niveis
    .map(({ titulo, resumo, sinal, limite }) =>
      resumo
        ? `<tr><th scope="row">${html(titulo)}</th><td>${selo(sinal.cor)}</td><td class="n">${resumo.casos}</td><td class="n">${resumo.aprovados}</td><td class="n">${resumo.falhas}</td><td class="n">${resumo.ignorados}</td><td class="n">${resumo.taxaDeAprovacao === null ? "" : `${numero(resumo.taxaDeAprovacao)}%`}</td><td class="n">${numero(resumo.segundos)} s</td><td class="n">${limite === undefined ? "" : `${limite} s`}</td><td>${html(sinal.motivos.join("; "))}</td></tr>`
        : `<tr><th scope="row">${html(titulo)}</th><td>${selo(sinal.cor)}</td><td colspan="7"></td><td>${html(sinal.motivos.join("; "))}</td></tr>`,
    )
    .join("\n");
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

  const riscosHtml = dados.riscos
    ? `<p><strong>${dados.riscos.automatizados} de ${dados.riscos.total}</strong> casos do backlog têm teste automatizado: ${numero(dados.riscos.cobertura)}% (mínimo da política: ${dados.politica.coberturaMinimaDeRiscos}%). Fonte: <code>${html(dados.politica.planoDeTestes)}</code>.</p>
${dados.riscos.pendentes.length ? `<div class="rolagem">
<table>
<thead><tr><th scope="col">Caso</th><th scope="col">História</th><th scope="col" class="n">Risco</th><th scope="col">Situação no backlog</th></tr></thead>
<tbody>
${dados.riscos.pendentes.map((item) => `<tr><th scope="row" class="junto">${html(item.id)}</th><td class="junto">${html(item.hu)}</td><td class="n">${item.risco ?? ""}</td><td>${html(item.status)}</td></tr>`).join("\n")}
</tbody>
</table>
</div>` : `<p class="vazio">Nenhum caso pendente no backlog.</p>`}`
    : `<p class="vazio">Sem dados: o backlog não foi encontrado em <code>${html(dados.politica.planoDeTestes)}</code>. Sem ele a situação geral não fica verde.</p>`;
  const coberturaHtml = dados.cobertura.length
    ? `<div class="rolagem">
<table>
<thead><tr><th scope="col">Pacote</th><th scope="col" class="n">Linhas</th><th scope="col" class="n">Mínimo</th><th scope="col" class="n">Ramos</th><th scope="col" class="n">Mínimo</th></tr></thead>
<tbody>
${dados.cobertura.map((c) => `<tr><th scope="row">${html(c.pacote)}</th><td class="n">${numero(c.linhas)}%</td><td class="n">${c.minimoDeLinhas === null ? "" : `${c.minimoDeLinhas}%`}</td><td class="n">${numero(c.ramos)}%</td><td class="n">${c.minimoDeRamos === null ? "" : `${c.minimoDeRamos}%`}</td></tr>`).join("\n")}
</tbody>
</table>
</div>
<p class="apagado">Quanto do código os testes de cada pacote executam. É diferente da cobertura de riscos, que mede quantos casos planejados têm teste. Abaixo do mínimo o próprio Jest reprova o nível. Detalhe por arquivo em <code>relatorios/cobertura/</code>, no artefato.</p>`
    : `<p class="vazio">Sem dados: nenhum <code>coverage-summary.json</code> em <code>relatorios/cobertura/</code>. A cobertura é medida pelos comandos <code>npm run test:unit</code> e <code>npm run test:backend</code>.</p>`;
  const defeitosHtml = dados.defeitos
    ? lista(dados.defeitos.itens.map((d) => `<a href="${html(d.url)}">#${d.numero}</a> ${html(d.titulo)}${d.prioridade ? ` <span class="apagado">(prioridade ${html(d.prioridade)})</span>` : ""}`), "Nenhuma issue aberta com a label falha:sut.")
    : `<p class="vazio">Sem acesso à API do GitHub nesta execução. No GitHub Actions este bloco lista as issues abertas com a label <code>falha:sut</code>.</p>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Métricas dos testes do Origem · ${html(dados.geradoEm)}</title>
<meta name="description" content="Resultado, tempo e estabilidade dos testes automatizados do Origem por nível.">
<style>
${ESTILO}</style>
</head>
<body>
<main>
<h1>Métricas dos testes do Origem</h1>
<p class="apagado">Gerado em ${html(dados.geradoEm)}${dados.commit ? ` · commit <code>${html(dados.commit.slice(0, 7))}</code>` : ""}${dados.execucaoUrl ? ` · <a href="${html(dados.execucaoUrl)}">execução no GitHub Actions</a>` : ""}</p>

<div class="geral">
<p>Situação geral: ${selo(dados.geral)}</p>
<ul class="motivos">${dados.motivos.map((motivo) => `<li>${html(motivo)}</li>`).join("")}</ul>
</div>
<p class="apagado">${html(ESCOPOS[dados.escopo])}</p>
<p class="apagado">Relatório técnico, para a equipe de desenvolvimento. A visão para quem decide está em <a href="negocio.html">negocio.html</a>.</p>

<h2>Resultado por nível</h2>
<div class="rolagem">
<table>
<thead><tr><th scope="col">Nível</th><th scope="col">Situação</th><th scope="col" class="n">Casos</th><th scope="col" class="n">Aprovados</th><th scope="col" class="n">Falhas</th><th scope="col" class="n">Ignorados</th><th scope="col" class="n">Aprovação</th><th scope="col" class="n">Tempo</th><th scope="col" class="n">Limite</th><th scope="col">Motivo</th></tr></thead>
<tbody>
${linhasDosNiveis}
</tbody>
</table>
</div>
<p class="apagado">Por nível. Verde: sem falha e dentro dos limites. Amarelo: sem falha, mas com tempo ou casos ignorados acima do limite de <code>.github/politica-testes.json</code>. Vermelho: há caso reprovado. A quarentena não entra na situação geral.</p>
<p class="apagado">Situação geral. Vermelho: algum nível reprovou. Amarelo: nada reprovou, mas há limite estourado, risco do backlog sem teste, esteira abaixo do mínimo ou dado que não pôde ser lido. Verde: tudo em dia e todos os dados presentes.</p>

<h2>Cobertura de riscos do backlog</h2>
${riscosHtml}

<h2>Cobertura de código</h2>
${coberturaHtml}

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

<h2>Defeitos do sistema em aberto</h2>
${defeitosHtml}
</main>
</body>
</html>
`;
}

function porcento(parte, total) {
  return total ? `${numero(Number(((parte / total) * 100).toFixed(1)))}%` : "";
}

/** Relatório de negócio: poucos indicadores em linguagem simples, riscos e recomendação. */
function paginaDeNegocio(dados) {
  const avaliados = dados.niveis.filter((nivel) => nivel.chave !== "quarentena" && nivel.resumo);
  const executadas = avaliados.reduce((soma, nivel) => soma + nivel.resumo.casos - nivel.resumo.ignorados, 0);
  const aprovadas = avaliados.reduce((soma, nivel) => soma + nivel.resumo.aprovados, 0);
  const semDados = `<small>Sem dados nesta execução.</small>`;
  const indicador = (titulo, valor, detalhe) => `<div class="indicador"><dt>${titulo}</dt><dd>${valor}${detalhe ? `<small>${detalhe}</small>` : ""}</dd></div>`;
  const indicadores = [
    indicador("Verificações automáticas aprovadas", executadas ? `${aprovadas} de ${executadas}` : "Sem dados", executadas ? `${porcento(aprovadas, executadas)} das verificações que rodaram.` : ""),
    indicador(
      "Caminho de compra funcionando",
      dados.critico ? `${dados.critico.aprovados} de ${dados.critico.total}` : "Sem dados",
      dados.critico ? html(dados.politica.descricaoDoCaminhoCritico) : dados.escopo === "nenhum" ? "Não fazem parte desta execução: rodam no PR e no merge." : "As verificações do caminho de compra não rodaram nesta execução.",
    ),
    indicador(
      "Casos do plano de testes com verificação automática",
      dados.riscos ? `${dados.riscos.automatizados} de ${dados.riscos.total}` : "Sem dados",
      dados.riscos ? `${numero(dados.riscos.cobertura)}% dos casos planejados.` : "O plano de testes não foi encontrado.",
    ),
    indicador(
      `Execuções sem falha nos últimos ${dados.politica.diasDaJanelaDaEsteira} dias`,
      dados.esteira && dados.esteira.taxaDeSucesso !== null ? `${numero(dados.esteira.taxaDeSucesso)}%` : "Sem dados",
      dados.esteira && dados.esteira.taxaDeSucesso !== null ? `${dados.esteira.execucoes} execuções. O esperado é pelo menos ${dados.politica.taxaMinimaDeSucessoDaEsteira}%.` : "",
    ),
    indicador(
      "Defeitos conhecidos em aberto",
      dados.defeitos ? String(dados.defeitos.total) : "Sem dados",
      dados.defeitos ? (dados.defeitos.total ? `${dados.defeitos.altas} de prioridade alta.` : "Nenhum defeito registrado.") : "",
    ),
  ].join("\n");

  const pendentes = dados.riscos
    ? lista(dados.riscos.pendentes.map((item) => `<strong>${html(item.id)}</strong> <span class="apagado">(${html(item.hu)})</span>`), "Todos os casos planejados têm verificação automática.")
    : `<p class="vazio">Sem dados: o plano de testes não foi encontrado.</p>`;
  const defeitos = dados.defeitos
    ? lista(dados.defeitos.itens.map((d) => `<a href="${html(d.url)}">#${d.numero}</a> ${html(d.titulo)}${d.prioridade ? ` <span class="apagado">(prioridade ${html(d.prioridade)})</span>` : ""}`), "Nenhum defeito conhecido em aberto.")
    : `<p class="vazio">Sem dados nesta execução.</p>`;
  const reprovadas = dados.falhas.length
    ? `<h2>O que reprovou</h2>\n${lista(dados.falhas.map((f) => html(f.nome.replace(/\s*@smoke\b/g, ""))), "")}`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Qualidade do Origem · ${html(dados.geradoEm)}</title>
<meta name="description" content="Situação da qualidade do Origem para decisão de liberação: indicadores, riscos e recomendação.">
<style>
${ESTILO}</style>
</head>
<body>
<main>
<h1>Qualidade do Origem</h1>
<p class="apagado">Gerado em ${html(dados.geradoEm)}${dados.commit ? ` · versão <code>${html(dados.commit.slice(0, 7))}</code>` : ""}</p>

<div class="geral">
<p>Situação: ${selo(dados.geral)} <strong>${html(dados.recomendacao)}</strong></p>
<ul class="motivos">${dados.motivosSimples.map((motivo) => `<li>${html(motivo)}</li>`).join("")}</ul>
</div>

<p class="apagado">${html(ESCOPOS[dados.escopo])}</p>

<h2>Indicadores</h2>
<dl class="indicadores">
${indicadores}
</dl>
${reprovadas}

<h2>Casos planejados ainda sem verificação automática</h2>
<p class="apagado">Enquanto não há verificação automática, a conferência destes casos depende de alguém fazer à mão.</p>
${pendentes}

<h2>Defeitos conhecidos em aberto</h2>
${defeitos}

<h2>Como ler</h2>
<ul>
<li><strong>Verde:</strong> nenhuma verificação reprovou, todos os casos planejados têm verificação automática e a esteira está estável.</li>
<li><strong>Amarelo:</strong> nenhuma verificação reprovou, mas há pendência ou falta algum dado.</li>
<li><strong>Vermelho:</strong> alguma verificação reprovou.</li>
</ul>
<p class="apagado">Os números saem da última execução dos testes, do plano de testes e do histórico da esteira. Detalhe técnico em <a href="metricas.html">metricas.html</a>.</p>
</main>
</body>
</html>
`;
}

function markdown(dados) {
  return [
    `### Métricas dos testes: ${ROTULO[dados.geral]}`,
    "",
    `Recomendação: ${dados.recomendacao}`,
    "",
    ESCOPOS[dados.escopo],
    "",
    ...dados.motivos.map((motivo) => `- ${motivo}`),
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
    dados.riscos
      ? `Cobertura de riscos: ${dados.riscos.automatizados} de ${dados.riscos.total} casos do backlog automatizados (${numero(dados.riscos.cobertura)}%).`
      : "Cobertura de riscos: sem dados, backlog não encontrado.",
    dados.cobertura.length
      ? `Cobertura de código: ${dados.cobertura.map((c) => `${c.pacote} ${numero(c.linhas)}% das linhas e ${numero(c.ramos)}% dos ramos`).join("; ")}.`
      : "Cobertura de código: sem dados.",
    dados.defeitos ? `Defeitos do sistema em aberto: ${dados.defeitos.total} (${dados.defeitos.altas} de prioridade alta).` : "Defeitos do sistema em aberto: sem acesso à API do GitHub nesta execução.",
    `Testes pulados ou em quarentena no código: ${dados.marcados.length}.`,
    "Páginas completas: `relatorios/metricas.html` (técnico) e `relatorios/negocio.html` (negócio). No GitHub Actions, dentro do artefato `relatorios-testes`.",
    "",
  ].join("\n");
}

async function main() {
  const politica = JSON.parse(readFileSync(join(RAIZ, ".github", "politica-testes.json"), "utf8"));
  const arquivosXml = existsSync(RELATORIOS) ? readdirSync(RELATORIOS).filter((nome) => nome.endsWith(".xml")) : [];
  const tempos = existsSync(join(RELATORIOS, "tempos.json")) ? JSON.parse(readFileSync(join(RELATORIOS, "tempos.json"), "utf8")) : {};

  // O workflow informa o que rodou de E2E; fora dele (na máquina) vale a execução completa.
  const escopo = Object.hasOwn(ESCOPOS, process.env.E2E_ESCOPO ?? "") ? process.env.E2E_ESCOPO : "completo";
  const foraDoEscopo = (chave) => (chave === "e2e" && escopo === "nenhum") || (chave === "quarentena" && escopo !== "completo");

  const todos = [];
  const niveis = NIVEIS.map(({ chave, titulo, prefixo }) => {
    const casos = arquivosXml
      .filter((nome) => nome.startsWith(prefixo))
      .flatMap((nome) => lerCasos(readFileSync(join(RELATORIOS, nome), "utf8")));
    todos.push(...casos.map((caso) => ({ ...caso, nivel: titulo })));
    const resumo = casos.length ? resumirNivel(casos, tempos[chave]?.segundos) : null;
    const limite = politica.limiteDeTempoSegundos[chave];
    // Na quarentena a falha é esperada: o nível só informa, sem cor de alerta.
    // No PR o filtro @smoke deixa os outros casos do E2E como ignorados: ali ignorado não é pendência.
    const maximoDeIgnorados = chave === "e2e" && escopo === "smoke" ? Infinity : politica.maximoDeIgnorados;
    const sinal = foraDoEscopo(chave)
      ? { cor: "sem-dados", motivos: ["não faz parte desta execução"] }
      : chave === "quarentena" && resumo
        ? { cor: "sem-dados", motivos: ["não entra na situação geral"] }
        : semaforo(resumo, limite, maximoDeIgnorados);
    return { chave, titulo, resumo, sinal, limite, foraDoEscopo: foraDoEscopo(chave) };
  });

  let dadosDaEsteira = null;
  try {
    dadosDaEsteira = await esteira(politica.diasDaJanelaDaEsteira);
  } catch (erro) {
    console.error(`Não foi possível ler as execuções da esteira: ${erro.message}`);
  }

  let defeitos = null;
  try {
    defeitos = await defeitosAbertos();
  } catch (erro) {
    console.error(`Não foi possível ler os defeitos abertos: ${erro.message}`);
  }

  const cobertura = Object.entries(politica.coberturaMinimaDeCodigo ?? {}).flatMap(([pacote, minimo]) => {
    const sumario = join(RELATORIOS, "cobertura", pacote, "coverage-summary.json");
    return existsSync(sumario) ? [{ pacote, ...resumirCobertura(JSON.parse(readFileSync(sumario, "utf8")), minimo) }] : [];
  });

  const caminhoDoPlano = join(RAIZ, politica.planoDeTestes);
  const riscos = existsSync(caminhoDoPlano) ? resumirRiscos(lerBacklog(readFileSync(caminhoDoPlano, "utf8"))) : null;
  const { cor: geral, motivos, simples } = situacaoGeral({ niveis, riscos, esteira: dadosDaEsteira, politica });

  const dados = {
    geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Recife", dateStyle: "short", timeStyle: "short" }),
    commit: process.env.GITHUB_SHA ?? null,
    execucaoUrl: process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
    politica,
    escopo,
    geral,
    motivos,
    motivosSimples: simples,
    recomendacao: recomendacao(geral),
    niveis,
    riscos,
    cobertura,
    critico: caminhoCritico(todos.filter((caso) => caso.nivel === "End-to-End")),
    defeitos,
    falhas: todos.filter((caso) => caso.estado === "falhou" && caso.nivel !== "Quarentena (@flaky)"),
    lentos: [...todos].sort((a, b) => b.segundos - a.segundos).slice(0, 10),
    marcados: marcadosNoCodigo(),
    esteira: dadosDaEsteira,
  };

  mkdirSync(RELATORIOS, { recursive: true });
  writeFileSync(join(RELATORIOS, "metricas.html"), pagina(dados));
  writeFileSync(join(RELATORIOS, "negocio.html"), paginaDeNegocio(dados));
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
