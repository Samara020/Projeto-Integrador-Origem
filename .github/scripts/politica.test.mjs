// Testes da automação da política de manutenção (docs/tas.md): conferência de testes
// pulados e em quarentena, rotulagem do formulário e números do relatório de métricas.
// Uso: node --test .github/scripts/politica.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { analisar } from "./verificar-quarentena.mjs";
import { planejar, resposta } from "./rotular-manutencao.mjs";
import {
  ESCOPOS,
  caminhoCritico,
  lerBacklog,
  lerCasos,
  piorCor,
  recomendacao,
  resumirCobertura,
  resumirDefeitos,
  resumirEsteira,
  resumirNivel,
  resumirRiscos,
  semaforo,
  situacaoGeral,
} from "../../scripts/metricas.mjs";
import { avisoDeNavegador, ehChrome, navegadorDoE2E } from "../../scripts/navegador-e2e.mjs";
import { classificar, resumo as resumoDaInstabilidade } from "../../scripts/instabilidade.mjs";
import { duplicacoes, verificarBacklog, verificarCriticos, verificarRastreabilidade } from "./gestao-testes.mjs";

test("E2E usa o Chrome da esteira quando E2E_BROWSER não é informado", () => {
  assert.equal(navegadorDoE2E({}), "chrome");
  assert.equal(navegadorDoE2E({ E2E_BROWSER: "electron" }), "electron");
});

test("Chrome pelo nome ou pelo caminho do binário não gera aviso", () => {
  for (const navegador of ["chrome", "/usr/bin/google-chrome-stable", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"]) {
    assert.equal(ehChrome(navegador), true, navegador);
    assert.equal(avisoDeNavegador(navegador), null, navegador);
  }
});

test("navegador diferente do Chrome avisa que a reprovação não é prova de defeito", () => {
  for (const navegador of ["electron", "firefox", "/usr/bin/brave-browser", "chromium"]) {
    assert.equal(ehChrome(navegador), false, navegador);
    assert.match(avisoDeNavegador(navegador), /esteira usa o Chrome/);
    assert.match(avisoDeNavegador(navegador), /não é prova de defeito/);
    assert.ok(avisoDeNavegador(navegador).includes(`"${navegador}"`));
  }
});

test("teste pulado sem issue viola a política", () => {
  const { violacoes, marcados } = analisar('it.skip("não cita nada", () => {});', "a.test.ts");
  assert.equal(violacoes.length, 1);
  assert.match(violacoes[0], /a\.test\.ts:1: teste pulado sem issue/);
  assert.equal(marcados.length, 0);
});

test("teste pulado com issue no título ou no comentário acima é aceito", () => {
  const noTitulo = analisar('it.skip("aguarda correção #12", () => {});', "a.test.ts");
  assert.deepEqual(noTitulo.violacoes, []);
  assert.deepEqual(noTitulo.marcados[0].issues, [12]);

  const noComentario = analisar('// Pulado até a issue #34 fechar.\nxit("caso", () => {});', "b.cy.js");
  assert.deepEqual(noComentario.violacoes, []);
  assert.deepEqual(noComentario.marcados[0], { onde: "b.cy.js:2", tipo: "pulado", issues: [34] });
});

test("@flaky exige a issue da quarentena", () => {
  assert.equal(analisar('it("oscila @flaky", () => {});', "c.cy.js").violacoes.length, 1);
  const comIssue = analisar('it("oscila @flaky #56", () => {});', "c.cy.js");
  assert.deepEqual(comIssue.violacoes, []);
  assert.equal(comIssue.marcados[0].tipo, "instável (@flaky)");
});

test("pytest pulado ou com xfail segue a mesma regra", () => {
  assert.equal(analisar("@pytest.mark.skip(reason='sem issue')\ndef test_a(): pass", "test_a.py").violacoes.length, 1);
  assert.deepEqual(analisar("# aguarda #78\n@pytest.mark.xfail\ndef test_a(): pass", "test_a.py").violacoes, []);
});

test(".only esquecido viola a política mesmo com issue", () => {
  const { violacoes } = analisar('describe.only("só este #9", () => {});', "d.test.ts");
  assert.equal(violacoes.length, 1);
  assert.match(violacoes[0], /\.only esquecido/);
});

test("arquivo sem marcação não gera violação nem registro", () => {
  assert.deepEqual(analisar('it("passa", () => { expect(1).toBe(1); });', "e.test.ts"), { violacoes: [], marcados: [] });
});

const FORMULARIO = [
  "### Tipo de falha",
  "",
  "TAS: problema no próprio teste, como seletor, dado, mock ou assert (falha:tas)",
  "",
  "### Prioridade",
  "",
  "Alta: deixa a main vermelha ou atinge teste @smoke, corrigir em até 1 dia útil (prioridade:alta)",
  "",
  "### O teste é instável?",
  "",
  "Sim",
].join("\n");

test("formulário de manutenção vira as labels de tipo, prioridade e flaky", () => {
  assert.equal(resposta(FORMULARIO, "O teste é instável?"), "Sim");
  assert.deepEqual(planejar(FORMULARIO, []), { adicionar: ["falha:tas", "prioridade:alta", "flaky"], remover: [] });
});

test("editar a resposta troca a label antiga e preserva as que não são gerenciadas", () => {
  const editado = FORMULARIO.replace("(falha:tas)", "(falha:sut)").replace("\nSim", "\nNão");
  assert.deepEqual(planejar(editado, ["falha:tas", "prioridade:alta", "flaky", "falha-pipeline"]), {
    adicionar: ["falha:sut"],
    remover: ["falha:tas", "flaky"],
  });
});

test("tipo ainda em investigação não aplica label de falha", () => {
  const emInvestigacao = FORMULARIO.replace(/TAS: .*\(falha:tas\)/, "Ainda em investigação");
  assert.deepEqual(planejar(emInvestigacao, []).adicionar, ["prioridade:alta", "flaky"]);
});

test("issue fora do formulário não tem as labels alteradas", () => {
  assert.equal(planejar("Texto livre de uma issue comum.", ["prioridade:alta"]), null);
  assert.equal(planejar("### Prioridade\n\nurgente", ["prioridade:alta"]), null);
});

const JUNIT = `<testsuites>
<testsuite name="a" tests="4">
<testcase name="passa" classname="a.test.ts" time="0.5"/>
<testcase name="pula" classname="a.test.ts" time="0"><skipped/></testcase>
<testcase name="falha &amp; avisa" file="b.cy.js" time="2.25"><failure message="esperava 200"/></testcase>
<testcase name="erro" classname="a.test.ts" time="1"><error>banco fora</error></testcase>
</testsuite>
</testsuites>`;

test("métricas leem estado, tempo e arquivo de cada caso do JUnit", () => {
  const casos = lerCasos(JUNIT);
  assert.deepEqual(casos.map((caso) => caso.estado), ["passou", "ignorado", "falhou", "falhou"]);
  assert.deepEqual(casos[2], { nome: "falha & avisa", arquivo: "b.cy.js", segundos: 2.25, estado: "falhou", erro: "esperava 200" });
  assert.equal(casos[3].erro, "banco fora");
  assert.equal("erro" in casos[0], false);
});

test("métricas leem o JUnit do node:test, que não tem testsuite", () => {
  const casos = lerCasos('<testsuites>\n\t<testcase name="solto" time="0.001" classname="test" file="/x/y.test.js"/>\n</testsuites>');
  assert.equal(casos.length, 1);
  assert.equal(casos[0].estado, "passou");
});

test("taxa de aprovação desconta os ignorados e usa o tempo de relógio quando existe", () => {
  const semRelogio = resumirNivel(lerCasos(JUNIT));
  assert.deepEqual(semRelogio, { casos: 4, aprovados: 1, falhas: 2, ignorados: 1, taxaDeAprovacao: 33.3, segundos: 3.8, tempoDeRelogio: false });
  assert.equal(resumirNivel(lerCasos(JUNIT), 12.34).segundos, 12.3);
});

test("semáforo: falha é vermelho, limite estourado é amarelo, o resto é verde", () => {
  const limpo = { casos: 10, aprovados: 10, falhas: 0, ignorados: 0, segundos: 30 };
  assert.equal(semaforo(limpo, 60, 0).cor, "verde");
  assert.equal(semaforo({ ...limpo, segundos: 61 }, 60, 0).cor, "amarelo");
  assert.equal(semaforo({ ...limpo, ignorados: 1 }, 60, 0).cor, "amarelo");
  assert.equal(semaforo({ ...limpo, falhas: 1, segundos: 61 }, 60, 0).cor, "vermelho");
  assert.equal(semaforo(null, 60, 0).cor, "sem-dados");
  assert.equal(semaforo({ ...limpo, casos: 0 }, 60, 0).cor, "sem-dados");
});

test("situação geral é a pior cor e ignora nível sem dados", () => {
  assert.equal(piorCor(["verde", "amarelo", "sem-dados"]), "amarelo");
  assert.equal(piorCor(["verde", "vermelho", "amarelo"]), "vermelho");
  assert.equal(piorCor(["verde", "sem-dados"]), "verde");
  assert.equal(piorCor(["sem-dados"]), "sem-dados");
});

test("taxa de sucesso da esteira conta só workflows de teste concluídos", () => {
  const execucao = (name, conclusion, minutos) => ({
    name,
    conclusion,
    run_started_at: "2026-11-24T10:00:00Z",
    updated_at: new Date(Date.parse("2026-11-24T10:00:00Z") + minutos * 60000).toISOString(),
  });
  const resumo = resumirEsteira([
    execucao("Testes no merge na main", "success", 6),
    execucao("Testes no merge na main", "failure", 4),
    execucao("Testes a cada commit", "success", 5),
    execucao("Testes a cada commit", "cancelled", 1),
    execucao("Rotular manutenção", "failure", 1),
  ]);
  assert.equal(resumo.execucoes, 3);
  assert.equal(resumo.taxaDeSucesso, 66.7);
  assert.deepEqual(resumo.linhas[0], { workflow: "Testes no merge na main", execucoes: 2, sucessos: 1, taxaDeSucesso: 50, minutosEmMedia: 5 });
  assert.equal(resumirEsteira([]).taxaDeSucesso, null);
});

const PLANO = [
  "## 9. Backlog de automação priorizado",
  "",
  "| Ordem | ID do caso | HU | Nível | Risco | Custo | Frequência | Prioridade | Responsável | Status |",
  "|---:|---|---|---|---:|---:|---:|---:|---|---|",
  "| 1 | TC01 | HU-01 | Sistema | 3 | 1 | 3 | 9,0 | a definir | Automatizado (e2e/cypress/e2e/acesso.cy.js: TC01) |",
  "| 2 | TC07 | HU-13 e HU-14 | Integração | 2 | 1 | 2 | 4,0 | a definir | Pendente (sem TC07 em título) |",
  "| 3 | TC06 | HU-09 | Sistema | 3 | 2 | 3 | 4,5 | a definir | Automatizado (e2e/cypress/e2e/compra.cy.js: TC06) |",
  "",
  "| Item | O que o Plano diz | Decisão |",
  "|---|---|---|",
  "| TC07 | Atualização do status | Corrigir |",
].join("\n");

test("backlog do plano: lê só a tabela com ID do caso e Status", () => {
  const itens = lerBacklog(PLANO);
  assert.deepEqual(itens.map((item) => [item.id, item.automatizado]), [["TC01", true], ["TC07", false], ["TC06", true]]);
  assert.deepEqual(itens[1], { id: "TC07", hu: "HU-13 e HU-14", nivel: "Integração", risco: 2, automatizado: false, status: "Pendente (sem TC07 em título)" });
  assert.deepEqual(lerBacklog("# Plano sem tabela de backlog"), []);
});

test("cobertura de riscos é automatizados sobre o total e lista os pendentes", () => {
  const riscos = resumirRiscos(lerBacklog(PLANO));
  assert.equal(riscos.total, 3);
  assert.equal(riscos.automatizados, 2);
  assert.equal(riscos.cobertura, 66.7);
  assert.deepEqual(riscos.pendentes.map((item) => item.id), ["TC07"]);
  assert.equal(resumirRiscos([]), null);
});

test("caminho crítico conta só os casos @smoke do E2E", () => {
  const casos = [
    { nome: "TC06 compra com Pix @smoke", estado: "passou" },
    { nome: "TC19 carrinho @smoke", estado: "falhou" },
    { nome: "TC13 duplo clique", estado: "falhou" },
  ];
  assert.deepEqual(caminhoCritico(casos), { total: 2, aprovados: 1, reprovados: ["TC19 carrinho"], ignorados: 0 });
  assert.equal(caminhoCritico([{ nome: "sem tag", estado: "passou" }]), null);
});

const POLITICA = { coberturaMinimaDeRiscos: 100, taxaMinimaDeSucessoDaEsteira: 90, diasDaJanelaDaEsteira: 7 };
const nivelCom = (cor, motivos = []) => ({ chave: "unit", titulo: "Unitário", sinal: { cor, motivos } });
const RISCOS_EM_DIA = { total: 2, automatizados: 2, cobertura: 100, pendentes: [] };
const ESTEIRA_ESTAVEL = { execucoes: 10, taxaDeSucesso: 95 };

test("situação geral: verde só com tudo em dia e todos os dados presentes", () => {
  const verde = situacaoGeral({ niveis: [nivelCom("verde")], riscos: RISCOS_EM_DIA, esteira: ESTEIRA_ESTAVEL, politica: POLITICA });
  assert.equal(verde.cor, "verde");
  assert.equal(verde.motivos.length, 1);
  assert.equal(verde.simples.length, 1);
});

test("situação geral: caso reprovado é vermelho mesmo com outras pendências", () => {
  const situacao = situacaoGeral({ niveis: [nivelCom("vermelho", ["2 caso(s) falharam"])], riscos: null, esteira: null, politica: POLITICA });
  assert.equal(situacao.cor, "vermelho");
  assert.deepEqual(situacao.motivos, ["Unitário: 2 caso(s) falharam."]);
});

test("situação geral: risco sem teste e esteira instável deixam amarelo, com o texto saindo dos dados", () => {
  const riscos = resumirRiscos(lerBacklog(PLANO));
  const situacao = situacaoGeral({ niveis: [nivelCom("verde")], riscos, esteira: { execucoes: 143, taxaDeSucesso: 62.2 }, politica: POLITICA });
  assert.equal(situacao.cor, "amarelo");
  assert.match(situacao.motivos[0], /66,7%.*1 caso\(s\).*TC07/);
  assert.match(situacao.motivos[1], /62,2%.*mínimo de 90%/);
  assert.match(situacao.simples[0], /^1 dos 3 casos planejados/);
  assert.equal(situacao.motivos.length, situacao.simples.length);
});

test("situação geral: dado que não pôde ser lido aparece como sem dados e impede o verde", () => {
  const situacao = situacaoGeral({ niveis: [nivelCom("verde")], riscos: null, esteira: null, politica: POLITICA });
  assert.equal(situacao.cor, "amarelo");
  assert.match(situacao.motivos[0], /Cobertura de riscos: sem dados/);
  assert.match(situacao.motivos[1], /esteira: sem dados/);
  assert.equal(situacaoGeral({ niveis: [nivelCom("sem-dados")], riscos: null, esteira: null, politica: POLITICA }).cor, "sem-dados");
});

test("recomendação de liberação acompanha a cor", () => {
  assert.match(recomendacao("verde"), /^Liberar\.$/);
  assert.match(recomendacao("amarelo"), /^Liberar com ressalvas/);
  assert.match(recomendacao("vermelho"), /^Não liberar/);
  assert.match(recomendacao("sem-dados"), /^Sem dados/);
});

test("defeitos abertos: ignora PRs e lê a prioridade da label", () => {
  const resumo = resumirDefeitos([
    { number: 12, title: "Frete some do total", html_url: "u12", labels: [{ name: "falha:sut" }, { name: "prioridade:alta" }] },
    { number: 9, title: "Sem prioridade", html_url: "u9", labels: [{ name: "falha:sut" }] },
    { number: 40, title: "PR", html_url: "u40", labels: [{ name: "falha:sut" }], pull_request: {} },
  ]);
  assert.equal(resumo.total, 2);
  assert.equal(resumo.altas, 1);
  assert.deepEqual(resumo.itens[0], { numero: 12, titulo: "Frete some do total", url: "u12", prioridade: "alta" });
  assert.equal(resumo.itens[1].prioridade, null);
});

test("cobertura de código: lê linhas e ramos e compara com o mínimo da política", () => {
  const sumario = { total: { lines: { pct: 25.99 }, branches: { pct: 30.56 } } };
  assert.deepEqual(resumirCobertura(sumario, { lines: 20, branches: 25 }), { linhas: 25.99, ramos: 30.56, minimoDeLinhas: 20, minimoDeRamos: 25, abaixoDoMinimo: false });
  assert.equal(resumirCobertura(sumario, { lines: 30, branches: 25 }).abaixoDoMinimo, true);
  assert.equal(resumirCobertura(sumario).abaixoDoMinimo, false);
});

test("nível fora do escopo da execução não vira pendência nem impede o verde", () => {
  const e2eFora = { chave: "e2e", titulo: "End-to-End", sinal: { cor: "sem-dados", motivos: ["não faz parte desta execução"] }, foraDoEscopo: true };
  const situacao = situacaoGeral({ niveis: [nivelCom("verde"), e2eFora], riscos: RISCOS_EM_DIA, esteira: ESTEIRA_ESTAVEL, politica: POLITICA });
  assert.equal(situacao.cor, "verde");
  const semEscopo = situacaoGeral({ niveis: [nivelCom("verde"), { ...e2eFora, foraDoEscopo: false }], riscos: RISCOS_EM_DIA, esteira: ESTEIRA_ESTAVEL, politica: POLITICA });
  assert.equal(semEscopo.cor, "amarelo");
  assert.deepEqual(Object.keys(ESCOPOS), ["completo", "smoke", "nenhum"]);
});

const CRITICO = 'describe("TC06 · compra", () => {\n  it("paga com Pix @smoke", () => {});\n});';

test("teste crítico: precisa existir, ter o identificador no título e não estar pulado", () => {
  const criticos = [{ id: "TC06", arquivo: "compra.cy.js" }];
  assert.deepEqual(verificarCriticos(criticos, { "compra.cy.js": CRITICO }), []);
  assert.match(verificarCriticos(criticos, {})[0], /TC06: o arquivo crítico compra\.cy\.js não existe/);
  assert.match(verificarCriticos(criticos, { "compra.cy.js": "// TC06 só em comentário\nit('outro', () => {});" })[0], /nenhum teste de compra\.cy\.js tem o identificador/);
  const pulado = CRITICO.replace('it("paga', '// aguarda #12\n  it.skip("paga');
  assert.match(verificarCriticos(criticos, { "compra.cy.js": pulado })[0], /compra\.cy\.js:3 \(pulado\): arquivo com teste crítico/);
});

test("teste @smoke não pode ir para a quarentena", () => {
  const violacoes = verificarCriticos([], { "a.cy.js": 'it("login @smoke @flaky #9", () => {});' });
  assert.deepEqual(violacoes, ["a.cy.js:1: teste @smoke não entra em quarentena (@flaky)."]);
});

test("rastreabilidade: todo arquivo de teste mapeado, e o mapa não aponta para o que não existe", () => {
  const arquivos = { "a.test.ts": 'describe("TC01 · login", () => {});', "b.test.ts": 'it("soma", () => {});' };
  const mapa = {
    "a.test.ts": { tipo: "requisito", casos: ["TC01"], hu: ["HU-01"], origem: "título" },
    "b.test.ts": { tipo: "detalhe técnico", motivo: "Função de apoio." },
  };
  assert.deepEqual(verificarRastreabilidade(mapa, arquivos), []);
  assert.match(verificarRastreabilidade({ "a.test.ts": mapa["a.test.ts"] }, arquivos)[0], /b\.test\.ts: arquivo de teste fora da rastreabilidade/);
  assert.match(verificarRastreabilidade({ ...mapa, "c.test.ts": mapa["b.test.ts"] }, arquivos)[0], /c\.test\.ts: está na rastreabilidade, mas o arquivo não existe/);
  const erros = verificarRastreabilidade(
    { "a.test.ts": { tipo: "requisito", casos: ["TC09"], hu: ["HU-1"] }, "b.test.ts": { tipo: "requisito", casos: [], hu: [] } },
    arquivos,
  );
  assert.equal(erros.length, 3);
  assert.match(erros.join("\n"), /história "HU-1" fora do formato/);
  assert.match(erros.join("\n"), /o caso TC09 não aparece no título/);
  assert.match(erros.join("\n"), /requisito sem história \(HU\) nem caso \(TC\)/);
});

test("duplicação candidata: acha trecho igual entre arquivos e ignora import e pontuação", () => {
  const bloco = ["cy.visit('/entrar');", "cy.get('#email').type(email);", "cy.get('#senha').type(senha);", "cy.contains('Entrar').click();"].join("\n");
  const arquivos = {
    "a.cy.js": `import x from "y";\n${bloco}\n});`,
    "b.cy.js": `import z from "w";\n\n${bloco}\n}`,
    "c.cy.js": "cy.visit('/outra');",
  };
  assert.deepEqual(duplicacoes(arquivos, 4), [{ a: "a.cy.js", linhaA: 2, b: "b.cy.js", linhaB: 3, janelas: 1 }]);
  assert.deepEqual(duplicacoes(arquivos, 5), []);
});

test("instabilidade: separa estável, intermitente e falha constante, sem esconder a falha", () => {
  const caso = (nome, estado, erro) => ({ nome, arquivo: "a.cy.js", segundos: 1, estado, ...(erro ? { erro } : {}) });
  const testes = classificar([
    [caso("firme", "passou"), caso("oscila", "falhou", "timeout"), caso("quebrado", "falhou", "esperava 200"), caso("pulado", "ignorado")],
    [caso("firme", "passou"), caso("oscila", "passou"), caso("quebrado", "falhou", "esperava 200")],
    [caso("firme", "passou"), caso("oscila", "passou"), caso("quebrado", "falhou", "esperava 200")],
  ]);
  const porNome = Object.fromEntries(testes.map((teste) => [teste.nome, teste]));
  assert.equal(porNome.firme.classe, "estável");
  assert.equal(porNome.quebrado.classe, "falha constante");
  assert.deepEqual([porNome.oscila.classe, porNome.oscila.tentativas, porNome.oscila.falhas, porNome.oscila.rodadasComFalha], ["intermitente", 3, 1, [1]]);
  assert.deepEqual(porNome.oscila.erros, ["timeout"]);
  assert.equal(porNome.pulado, undefined);
  assert.match(resumoDaInstabilidade(testes, 3), /Estáveis: 1\. Intermitentes: 1\. Falha constante: 1\./);
  assert.match(resumoDaInstabilidade(testes, 2), /menos de 3 rodadas/);
});

test("backlog: caso automatizado precisa ter o identificador no título de cada arquivo citado", () => {
  const arquivos = { "a.cy.js": 'describe("TC01 · login", () => {});', "b.test.ts": "// TC01 só em comentário" };
  const item = (status) => ({ id: "TC01", automatizado: /^Automatizado/.test(status), status });
  assert.deepEqual(verificarBacklog([item("Automatizado (a.cy.js: TC01)")], arquivos), []);
  assert.deepEqual(verificarBacklog([item("Pendente (sem teste)")], arquivos), []);
  assert.match(verificarBacklog([item("Automatizado (a.cy.js, b.test.ts: TC01)")], arquivos)[0], /b\.test\.ts automatiza o caso, mas nenhum título do arquivo tem TC01/);
  assert.match(verificarBacklog([item("Automatizado (c.cy.js: TC01)")], arquivos)[0], /cita c\.cy\.js, que não existe/);
  assert.match(verificarBacklog([item("Automatizado")], arquivos)[0], /sem arquivo citado/);
});
