# TAS do Origem · automação de testes e política de manutenção

Atualização: 24/11/2026. Este documento distingue a automação publicada do que ainda é proposta para a equipe confirmar. TAS é a solução de automação de testes; SUT é o sistema sob teste: frontend, backend e módulo de IA do Origem.

## 1. Automação publicada

### Níveis e comandos

Os comandos abaixo são executados na raiz, com dependências e ambiente de cada nível preparados. Quem organiza as suítes é [`scripts/testes.mjs`](../scripts/testes.mjs).

| Nível | Ferramenta e escopo do comando central | Local | Comando |
|---|---|---|---|
| Unitário | Jest do frontend, pytest da IA (sem o arquivo HTTP) e `node:test` da guarda de rede do E2E | `frontend/tests/unit/`, `modulo-ia/tests/`, `e2e/cypress/support/redeSegura.test.js` | `npm run test:unit` |
| Backend | Jest/Supertest da API contra PostgreSQL de banco exclusivo | `backend/app/tests/` | `npm run test:backend` |
| API | Jest contra backend real/PostgreSQL e pytest HTTP da IA | `frontend/tests/api/`, `modulo-ia/tests/test_api.py` | `npm run test:api` |
| E2E | Cypress contra frontend e backend reais, com banco descartável | `e2e/cypress/e2e/` | `npm run test:e2e` |

Os testes HTTP não são Fake API. Na regressão, o backend fica em `:4000`, o frontend em `:3000` e o serviço de IA em `:3001`. O workflow prepara os serviços e o PostgreSQL antes dos níveis que dependem deles.

Para os E2E, a esteira prepara outro runtime: frontend `:3200`, API `:4200` e banco `origem_e2e_ci`. Ela recompila o frontend com a URL dessa API. As allowlists, o preflight `GET /__test/identity` e o guard de rede rejeitam alvos diferentes do ambiente descartável esperado. Consulte [`e2e/cypress.config.js`](../e2e/cypress.config.js) e [`e2e/cypress/support/e2e.js`](../e2e/cypress/support/e2e.js).

O comando central retorna erro se uma suíte chamada falhar. Os relatórios JUnit ficam em `relatorios/`; o resumo informa casos, falhas e ignorados. O formato JUnit reúne resultados das diferentes ferramentas, sem implicar uso de Java.

### Suíte do backend

A suíte própria do backend está em `backend/app/tests/`. Ela usa Jest/Supertest e inclui permissões, persistência, regras, concorrência e estruturas de dados. Desde 24/11 ela é um nível do comando central (`npm run test:backend`) e uma etapa obrigatória da regressão, com relatório em `relatorios/backend-jest.xml`.

A suíte exige `DATABASE_URL_TEST` apontando para um banco exclusivo, criado com `database/sql/01`, `02` e `04`: os testes apagam as tabelas. A esteira cria o banco `origem_backend_ci` só para ela. Para rodar apenas os testes puros, sem PostgreSQL: `npm --prefix backend/app run test:unit`. Confira `backend/app/tests/env.ts`, `jest.config.ts` e `jest.unit.config.ts`.

Testar os endpoints por `frontend/tests/api/` não substitui essa suíte: são casos diferentes.

A suíte isolada da guarda de rede (`e2e/cypress/support/redeSegura.test.js`) roda no nível unitário. Os testes C++ de `aed/tests/` continuam fora do fluxo obrigatório.

### Tags, smoke e quarentena

As tags ficam no título do teste E2E e são lidas por `e2e/cypress/support/e2e.js`. Teste filtrado aparece como ignorado no relatório.

| Tag | Significado | Comando |
|---|---|---|
| `@smoke` | Caminho crítico: login, vitrine, carrinho, compra com Pix e cadastro de peça. Sete casos. | `npm run test:e2e:smoke` |
| `@flaky` | Teste instável em quarentena. O título cita a issue: `@flaky #123`. | `npm run test:quarentena` |

- `npm run test:e2e` roda tudo, menos os `@flaky`.
- `npm run test:e2e:smoke` abre só os specs que têm `@smoke` e roda só os casos marcados.
- `npm run test:quarentena` roda só os `@flaky`, com 2 novas tentativas e relatório próprio (`relatorios/quarentena-*.xml`). Na esteira essa etapa não reprova a regressão. Sem nenhum teste marcado, o comando termina sem abrir o navegador.
- A regressão continua com `retries: 0`: nova tentativa só existe dentro da quarentena.

### Conferência da política e relatório de métricas

| Comando | O que faz |
|---|---|
| `npm run test:politica` | Reprova se houver `.only` esquecido, ou teste pulado ou `@flaky` sem citar uma issue. Com `GITHUB_TOKEN` e `GITHUB_REPOSITORY`, a issue citada precisa estar aberta. |
| `npm run test:metricas` | Lê os JUnit de `relatorios/` e gera `relatorios/metricas.html` e `relatorios/metricas.json`. |
| `npm run test:automacao` | Testes da própria automação: gate, emissor de issue, conferência da política, rotulagem e métricas. |

O relatório de métricas mostra, por nível: casos, aprovados, falhas, ignorados, taxa de aprovação e tempo, com um semáforo. Verde: sem falha e dentro dos limites. Amarelo: tempo ou ignorados acima do limite. Vermelho: caso reprovado. Também lista os casos reprovados, os testes pulados ou em quarentena, os 10 casos mais lentos e, no GitHub Actions, a taxa de sucesso da esteira nos últimos 7 dias. Os limites ficam em [`.github/politica-testes.json`](../.github/politica-testes.json). O relatório só informa: não aprova nem reprova a esteira.

### Gatilhos publicados

| Quando | Arquivo em `.github/workflows/` | O que executa |
|---|---|---|
| Push fora da main | `testes-commit.yml` | Regressão reutilizável |
| PR com destino main | `testes-merge.yml` | Regressão, build/smoke Docker e Quality Gate |
| Push na main | `testes-merge.yml` | Os mesmos checks e emissão de aviso em falhas monitoradas |
| Diariamente, previsto para 2h de Brasília | `testes-agendados.yml` | Regressão e emissão de aviso em falha |
| Disparo manual do núcleo | `testes.yml` | Regressão reutilizável |
| Disparo manual | `testes-smoke.yml` | Só os E2E `@smoke`, no runtime descartável |
| Segunda, previsto para 8h de Brasília | `politica-manutencao.yml` | Conferência de testes pulados e em quarentena |
| Dias 1 e 15, previsto para 9h de Brasília | `revisao-periodica.yml` | Abre a issue de revisão com os números da suíte |
| Issue aberta ou editada | `rotular-manutencao.yml` | Aplica as labels a partir do formulário de manutenção |

O cron é `0 5 * * *` (UTC) e pode atrasar no GitHub. Um push em branch com PR aberto pode disparar os workflows de push e de PR; são execuções distintas.

### Quality Gate e proteção da main

O job **Quality Gate**, em `testes-merge.yml`, declara `needs: [regressao, imagens]` e `if: always()`. Ele executa primeiro os testes da automação, depois a conferência da política (testes pulados e em quarentena) e por fim avalia os resultados dos jobs:

```text
regressao = success E imagens = success
+ passos do próprio gate aprovados
= Quality Gate aprovado
```

Uma dependência com `failure`, `skipped`, `cancelled` ou resultado ausente é reprovada pelo avaliador. JSON inválido também reprova. Um cancelamento da execução inteira pode impedir a conclusão do job, sem gerar uma aprovação válida.

- Avaliador: [`.github/scripts/quality-gate.mjs`](../.github/scripts/quality-gate.mjs).
- Testes do gate/emissor: [`.github/scripts/automacao.test.mjs`](../.github/scripts/automacao.test.mjs), com `node --test`.
- Testes da política, da rotulagem e das métricas: [`.github/scripts/politica.test.mjs`](../.github/scripts/politica.test.mjs).
- Conferência da política: [`.github/scripts/verificar-quarentena.mjs`](../.github/scripts/verificar-quarentena.mjs).
- Referência versionada da proteção: [`.github/quality-gate.ruleset.json`](../.github/quality-gate.ruleset.json).
- Regra remota ativa conferida em 23/11: [ruleset 27944584](https://github.com/Samara020/Projeto-Integrador-Origem/rules/27944584), com PR obrigatório e check `Quality Gate` de GitHub Actions, em modo strict.

O ruleset exige zero aprovações humanas mínimas no requisito configurado, bloqueia exclusão/force push e a consulta não permite bypass pela conta utilizada. O JSON sozinho não ativa proteção; a regra foi aplicada no GitHub e verificada.

Qualquer falha efetiva das etapas obrigatórias pode impedir o merge: testes centrais (incluída a suíte do backend), preparação/compilação, build Docker, smoke test dos containers ou passos do gate (incluída a conferência da política). A quarentena e o relatório de métricas não reprovam. A emissão de issue ocorre depois e não é dependência do gate. O gate não reverte commits já integrados.

Não há, neste fluxo, limiar mínimo de cobertura, execução obrigatória de audit/lint, aprovação de deploy ou veto por existência de issue aberta. Casos ignorados são informados; a regra é que todo teste pulado cite uma issue aberta, sem exigir zero skips nem quantidade mínima de casos. Padrões específicos de hidratação React são registrados como avisos, sem reprovação direta por essa exceção; as demais asserções podem reprovar o cenário. O Cypress usa `retries: 0`.

### Issues e evidências

Falhas monitoradas do push na main e da regressão agendada acionam o emissor. PRs executam os checks sem abrir essas issues. Uma issue aberta para o mesmo workflow **e branch** recebe comentário; a primeira falha cria uma issue. Não existe fechamento automático ao voltar ao verde no código publicado.

Arquivos: `.github/actions/abrir-issue-falha/action.yml`, `.github/scripts/abrir-issue-falha.sh` e `.github/scripts/falhas.mjs`. Os testes do emissor usam `gh` simulado, sem criar issues reais.

O artefato `relatorios-testes` guarda relatórios, logs, prints e vídeos disponíveis por 14 dias. Vídeos dos specs aprovados são removidos pelo Cypress. Detalhes: [issues e quality gate](testes/issues-e-quality-gate.md).

## 2. Política de manutenção

O que a esteira impõe está na seção 1: quarentena separada, conferência de testes pulados e formulário com rotulagem. Prazos e responsáveis abaixo são **propostas para adoção pela equipe**, não mecanismos impostos pelo CI.

### Registro de uma demanda de manutenção

Toda falha ou demanda de manutenção entra pelo formulário **Manutenção da automação de testes** ([`.github/ISSUE_TEMPLATE/manutencao.yml`](../.github/ISSUE_TEMPLATE/manutencao.yml)). Ele pede tipo de falha, prioridade, se o teste é instável, nível, teste afetado, investigação, responsável, prazo e encaminhamento. O workflow `rotular-manutencao.yml` lê as respostas e aplica as labels `falha:*`, `prioridade:*` e `flaky`. Se a resposta for editada, a label antiga sai.

### Investigação de uma falha

1. Identificar SHA, execução, etapa e caso; comparar com uma base conhecida.
2. Repetir o mesmo SHA quando houver suspeita de instabilidade. Uma passagem isolada não demonstra correção.
3. Separar falha de ambiente (instalação, rede, build, banco) de falha de produto ou automação.
4. Reproduzir o comportamento e conferir o contrato. Se o produto está errado, corrigir o SUT; se o comportamento mudou de propósito, atualizar os testes junto da mudança.
5. Registrar evidência, responsável, risco e próximo passo. Não aumentar timeout, remover asserção ou pular caso só para obter verde.

Classificações: `falha:sut`, `falha:tas`, `falha:ambiente` e `falha:esperada`. Prazos sugeridos: alta, um dia útil; média, três dias úteis; baixa, próxima revisão. A label vem da resposta de quem preencheu o formulário: a automação não investiga a causa nem cobra o prazo.

### Instabilidade, quarentena e remoção

Para pôr um teste em quarentena:

1. Abrir a issue pelo formulário, com "O teste é instável?" em "Sim".
2. Acrescentar `@flaky #<número da issue>` ao título do teste.
3. O teste sai da regressão e passa a rodar na etapa de quarentena, com novas tentativas.
4. Corrigida a causa, tirar a tag no mesmo PR da correção e fechar a issue.

Issue fechada com o teste ainda marcado reprova a conferência da política. Teste `@smoke` não deve ir para a quarentena: ele cobre o caminho crítico, então a correção tem prioridade alta. A exclusão de um teste deve explicar a cobertura substituta e passar por outra pessoa na revisão do PR.

O workflow `revisao-periodica.yml` abre, nos dias 1 e 15, uma issue com o tamanho da suíte, as execuções dos últimos 15 dias, as demandas abertas, os testes pulados ou em quarentena e o roteiro: instabilidade, quarentena, tempo de execução, duplicação, rastreabilidade, demandas vencidas e remoção. O prazo máximo de quarentena (15 dias) e os demais limites de `.github/politica-testes.json` são propostas a confirmar com a equipe.

**Ainda não existe:** cobertura de código, diagnóstico automático de instabilidade (rodar a suíte várias vezes e classificar cada teste), lista de testes críticos protegidos contra remoção e rastreabilidade teste para história de usuário validada por arquivo.

## 3. Evidências e evolução

Os relatos locais de 17/11 registraram testes desatualizados após a troca da Fake API pela API real e apontaram as issues [#6](https://github.com/Samara020/Projeto-Integrador-Origem/issues/6), [#7](https://github.com/Samara020/Projeto-Integrador-Origem/issues/7) e [#8](https://github.com/Samara020/Projeto-Integrador-Origem/issues/8). São contexto histórico; não comprovam que o pacote local de manutenção foi publicado nem que seus antigos skips continuam necessários. É preciso reconciliá-los com a implementação atual.

Em 23/11:

- [Run 45272586806](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45272586806), commit `40c21b8`: regressão/Docker aprovados, 42 E2E aprovados.
- [Run 45283640409](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45283640409), commit `20e90fd`: dois timeouts E2E; gate reprovado e [issue #15](https://github.com/Samara020/Projeto-Integrador-Origem/issues/15) emitida automaticamente.
- [PR #18](https://github.com/Samara020/Projeto-Integrador-Origem/pull/18): dois interceptadores passaram a observar a rota canônica `/envios/cotacao`, preservando as asserções. [Run 45291018302](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45291018302): 346 casos aprovados, zero falhas e ignorados; Docker/gate aprovados. O PR foi integrado.
- [PR #16](https://github.com/Samara020/Projeto-Integrador-Origem/pull/16): branch atualizada, [run 45291987365](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45291987365) aprovada e imagem documental integrada.

Em 24/11, na máquina de desenvolvimento, antes da primeira execução na esteira:

- `npm run test:backend`: 200 casos aprovados, zero falhas, contra PostgreSQL 17 descartável.
- `npm run test:automacao`: 26 casos aprovados.
- `npm run test:e2e:smoke`: os 7 casos `@smoke` rodaram e os outros 32 dos mesmos specs ficaram ignorados. `npm run test:e2e`: os 42 casos rodaram, nenhum ignorado.
- Nas duas execuções E2E, 3 casos que conferem aviso flutuante (toast) reprovaram no Electron sem tela, que não desenha o aviso; um deles não tem tag. A máquina não tem Chrome, o navegador da esteira.
- Os mesmos 3 casos (TC19, TC12 e TC02) foram refeitos à mão em um navegador com tela, no runtime descartável `:3200`/`:4200`: o aviso apareceu nos três, com opacidade 1 e dentro da área visível, e as demais conferências de cada caso bateram (carrinho esvaziado, 10 mensagens de campo obrigatório, peça gravada no estoque com SKU, 5 unidades e situação Ativo). Conferência manual não substitui a execução no Chrome da esteira.

Contagens pertencem a essas execuções, não são percentuais de cobertura nem garantias sobre SHAs futuros.

## 4. Próximos passos

1. Confirmar com a equipe os critérios de quarentena, revisão, prazos e limites de `.github/politica-testes.json`.
2. Medir cobertura de código e guardar o relatório a cada execução.
3. Criar o diagnóstico de instabilidade e a lista de testes críticos.
4. Avaliar a entrada dos testes C++ de `aed/tests/` no fluxo obrigatório.
5. Manter mudanças de produto e respectivas expectativas dos testes no mesmo PR, sem enfraquecer verificações para mascarar falhas.
