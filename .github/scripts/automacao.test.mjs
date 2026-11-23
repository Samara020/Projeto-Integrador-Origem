import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { lerJUnit, resumir } from './falhas.mjs';
import { avaliarDependencias } from './quality-gate.mjs';
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resultados = (a, b) => ({ regressao: { result: a }, imagens: { result: b } });

test('gate aprova somente as duas dependências bem sucedidas', () => {
  assert.deepEqual(avaliarDependencias(resultados('success', 'success')), []);
});
for (const estado of ['failure', 'skipped', 'cancelled']) {
  test(`gate reprova ${estado} em qualquer dependência`, () => {
    assert.equal(avaliarDependencias(resultados(estado, 'success')).length, 1);
    assert.equal(avaliarDependencias(resultados('success', estado)).length, 1);
  });
}
test('gate reprova dependência ausente e JSON sem jobs', () => {
  assert.equal(avaliarDependencias({ imagens: { result: 'success' } }).length, 1);
  assert.equal(avaliarDependencias({}).length, 2);
});
test('JUnit separa casos aprovados, ignorados, falhas e erros', () => {
  const lido = lerJUnit('<testsuite><testcase name="ok"/><testcase name="skip"><skipped/></testcase><testcase name="falha &amp; motivo"><failure message="esperado &quot;sim&quot;"/></testcase><testcase name="erro"><error><![CDATA[banco indisponível]]></error></testcase></testsuite>');
  assert.equal(lido.total, 4);
  assert.equal(lido.falhas.length, 2);
  assert.equal(lido.falhas[0].nome, 'falha & motivo');
  assert.equal(lido.falhas[0].mensagem, 'esperado "sim"');
  assert.equal(lido.falhas[1].mensagem, 'banco indisponível');
});
test('sem JUnit explica que a falha antecedeu os testes', () => {
  assert.match(resumir('/caminho-que-nao-existe-origem-ci'), /Nenhum resultado de teste foi gerado/);
});

function executarAviso(issues, comXml = true) {
  const pasta = mkdtempSync(join(tmpdir(), 'origem-aviso-'));
  mkdirSync(join(pasta, 'bin')); mkdirSync(join(pasta, 'relatorios'));
  if (comXml) writeFileSync(join(pasta, 'relatorios', 'api.xml'), '<testsuite><testcase name="aprova peça"><failure message="retornou 500"/></testcase></testsuite>');
  const chamadas = join(pasta, 'chamadas.jsonl');
  const gh = `#!/usr/bin/env node\nconst fs=require('node:fs');const a=process.argv.slice(2);const i=a.indexOf('--body-file');fs.appendFileSync(process.env.GH_TEST_CALLS,JSON.stringify({args:a,body:i>=0?fs.readFileSync(a[i+1],'utf8'):null})+'\\n');if(a[0]==='issue'&&a[1]==='list')console.log(process.env.GH_TEST_ISSUES);`;
  writeFileSync(join(pasta, 'bin', 'gh'), gh, { mode: 0o755 });
  mkdirSync(join(pasta, '.github/scripts'), { recursive: true });
  writeFileSync(join(pasta, '.github/scripts/falhas.mjs'), readFileSync(join(raiz, '.github/scripts/falhas.mjs')));
  const r = spawnSync('bash', [join(raiz, '.github/scripts/abrir-issue-falha.sh')], { cwd: pasta, encoding: 'utf8', env: { ...process.env, PATH: join(pasta, 'bin') + ':' + process.env.PATH, GH_TEST_CALLS: chamadas, GH_TEST_ISSUES: JSON.stringify(issues), RUNNER_TEMP: pasta, WORKFLOW: 'Testes na main', EVENTO: 'push', BRANCH: 'main', COMMIT: 'abc123456789', EXECUCAO_URL: 'https://github.com/org/repo/actions/runs/123', COMMIT_URL: 'https://github.com/org/repo/commit/abc123456789', ARTEFATO_URL: '', GH_REPO: 'org/repo' } });
  const registros = readFileSync(chamadas, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  rmSync(pasta, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stderr);
  return registros;
}
test('primeira falha cria issue com SHA, execução e caso reprovado', () => {
  const a = executarAviso([]); const cr = a.find(c => c.args[0] === 'issue' && c.args[1] === 'create');
  assert.ok(cr); assert.match(cr.body, /abc1234/); assert.match(cr.body, /actions\/runs\/123/); assert.match(cr.body, /aprova peça/); assert.match(cr.body, /retornou 500/);
  assert.equal(a.some(c => c.args[1] === 'comment'), false);
});
test('nova falha comenta na issue exata, sem duplicá-la', () => {
  const a = executarAviso([{ number: 9, title: 'Falha na pipeline: Outro (main)' }, { number: 12, title: 'Falha na pipeline: Testes na main (main)' }]);
  const c = a.find(c => c.args[0] === 'issue' && c.args[1] === 'comment');
  assert.equal(c.args[2], '12'); assert.match(c.body, /falhou de novo/); assert.equal(a.some(c => c.args[1] === 'create' && c.args[0] === 'issue'), false);
});
test('aviso também cria issue quando não há artefatos', () => {
  const a = executarAviso([], false); assert.match(a.find(c => c.args[0] === 'issue' && c.args[1] === 'create').body, /Nenhum resultado de teste foi gerado/);
});
