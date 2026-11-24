# TAS do Origem · automação de testes e política de manutenção

Atualização: 23/11/2026. Este documento distingue a automação publicada das propostas de manutenção ainda não integradas. TAS é a solução de automação de testes; SUT é o sistema sob teste: frontend, backend e módulo de IA do Origem.

## 1. Automação publicada

### Níveis e comandos

Os comandos abaixo são executados na raiz, com dependências e ambiente de cada nível preparados. Quem organiza as suítes é [`scripts/testes.mjs`](../scripts/testes.mjs).

| Nível | Ferramenta e escopo do comando central | Local | Comando |
|---|---|---|---|
| Unitário | Jest do frontend e pytest da IA, excluindo o arquivo HTTP | `frontend/tests/unit/`, `modulo-ia/tests/` | `npm run test:unit` |
| API | Jest contra backend real/PostgreSQL e pytest HTTP da IA | `frontend/tests/api/`, `modulo-ia/tests/test_api.py` | `npm run test:api` |
| E2E | Cypress contra frontend e backend reais, com banco descartável | `e2e/cypress/e2e/` | `npm run test:e2e` |

Os testes HTTP não são Fake API. Na regressão, o backend fica em `:4000`, o frontend em `:3000` e o serviço de IA em `:3001`. O workflow prepara os serviços e o PostgreSQL antes dos níveis que dependem deles.

Para os E2E, a esteira prepara outro runtime: frontend `:3200`, API `:4200` e banco `origem_e2e_ci`. Ela recompila o frontend com a URL dessa API. As allowlists, o preflight `GET /__test/identity` e o guard de rede rejeitam alvos diferentes do ambiente descartável esperado. Consulte [`e2e/cypress.config.js`](../e2e/cypress.config.js) e [`e2e/cypress/support/e2e.js`](../e2e/cypress/support/e2e.js).

O comando central retorna erro se uma suíte chamada falhar. Os relatórios JUnit ficam em `relatorios/`; o resumo informa casos, falhas e ignorados. O formato JUnit reúne resultados das diferentes ferramentas, sem implicar uso de Java.

### Suítes adicionais e limites de integração

A suíte própria do backend está em `backend/app/tests/`. Ela usa Jest/Supertest e inclui permissões, persistência, regras, concorrência e estruturas de dados. Seus comandos são:

```bash
npm --prefix backend/app test
npm --prefix backend/app run test:unit
```

A suíte completa exige `DATABASE_URL_TEST` de banco exclusivo: os testes podem limpar dados. A configuração unitária dedicada seleciona os testes puros sem o setup de PostgreSQL. Confira `backend/app/tests/env.ts`, `jest.config.ts` e `jest.unit.config.ts` antes da execução.

**Os comandos centrais e o workflow de regressão ainda não chamam essa suíte própria do backend.** Compilar a API e testar seus endpoints por `frontend/tests/api/` não equivale a executar `backend/app/tests/`.

Também existem os testes isolados do guard (`e2e/cypress/support/redeSegura.test.js`) e os testes C++ de `aed/tests/`, sem chamada no fluxo obrigatório analisado. O guard em si participa do Cypress; sua suíte isolada é outra execução.

### Gatilhos publicados

| Quando | Arquivo em `.github/workflows/` | O que executa |
|---|---|---|
| Push fora da main | `testes-commit.yml` | Regressão reutilizável |
| PR com destino main | `testes-merge.yml` | Regressão, build/smoke Docker e Quality Gate |
| Push na main | `testes-merge.yml` | Os mesmos checks e emissão de aviso em falhas monitoradas |
| Diariamente, previsto para 2h de Brasília | `testes-agendados.yml` | Regressão e emissão de aviso em falha |
| Disparo manual do núcleo | `testes.yml` | Regressão reutilizável |

O cron é `0 5 * * *` (UTC) e pode atrasar no GitHub. Um push em branch com PR aberto pode disparar os workflows de push e de PR; são execuções distintas.

### Quality Gate e proteção da main

O job **Quality Gate**, em `testes-merge.yml`, declara `needs: [regressao, imagens]` e `if: always()`. Ele executa primeiro os testes da automação e depois avalia os resultados dos jobs:

```text
regressao = success E imagens = success
+ passos do próprio gate aprovados
= Quality Gate aprovado
```

Uma dependência com `failure`, `skipped`, `cancelled` ou resultado ausente é reprovada pelo avaliador. JSON inválido também reprova. Um cancelamento da execução inteira pode impedir a conclusão do job, sem gerar uma aprovação válida.

- Avaliador: [`.github/scripts/quality-gate.mjs`](../.github/scripts/quality-gate.mjs).
- Testes do gate/emissor: [`.github/scripts/automacao.test.mjs`](../.github/scripts/automacao.test.mjs), com `node --test`.
- Referência versionada da proteção: [`.github/quality-gate.ruleset.json`](../.github/quality-gate.ruleset.json).
- Regra remota ativa conferida em 23/11: [ruleset 27944584](https://github.com/Samara020/Projeto-Integrador-Origem/rules/27944584), com PR obrigatório e check `Quality Gate` de GitHub Actions, em modo strict.

O ruleset exige zero aprovações humanas mínimas no requisito configurado, bloqueia exclusão/force push e a consulta não permite bypass pela conta utilizada. O JSON sozinho não ativa proteção; a regra foi aplicada no GitHub e verificada.

Qualquer falha efetiva das etapas obrigatórias pode impedir o merge: testes centrais, preparação/compilação, build Docker, smoke test dos containers ou passos do gate. A emissão de issue ocorre depois e não é dependência do gate. O gate não reverte commits já integrados.

Não há, neste fluxo, limiar mínimo de cobertura, execução obrigatória de audit/lint, aprovação de deploy ou veto por existência de issue aberta. Casos ignorados são informados, mas não há regra adicional de zero skips ou quantidade mínima de casos. Padrões específicos de hidratação React são registrados como avisos, sem reprovação direta por essa exceção; as demais asserções podem reprovar o cenário. O Cypress usa `retries: 0`.

### Issues e evidências

Falhas monitoradas do push na main e da regressão agendada acionam o emissor. PRs executam os checks sem abrir essas issues. Uma issue aberta para o mesmo workflow **e branch** recebe comentário; a primeira falha cria uma issue. Não existe fechamento automático ao voltar ao verde no código publicado.

Arquivos: `.github/actions/abrir-issue-falha/action.yml`, `.github/scripts/abrir-issue-falha.sh` e `.github/scripts/falhas.mjs`. Os testes do emissor usam `gh` simulado, sem criar issues reais.

O artefato `relatorios-testes` guarda relatórios, logs, prints e vídeos disponíveis por 14 dias. Vídeos dos specs aprovados são removidos pelo Cypress. Detalhes: [issues e quality gate](testes/issues-e-quality-gate.md).

## 2. Política de manutenção proposta

Esta seção preserva a intenção do documento local anterior, sem declarar como implementadas as automações que ainda não foram integradas. Prazos e responsáveis abaixo são **propostas para adoção pela equipe**, não mecanismos já impostos pelo CI.

### Investigação de uma falha

1. Identificar SHA, execução, etapa e caso; comparar com uma base conhecida.
2. Repetir o mesmo SHA quando houver suspeita de instabilidade. Uma passagem isolada não demonstra correção.
3. Separar falha de ambiente (instalação, rede, build, banco) de falha de produto ou automação.
4. Reproduzir o comportamento e conferir o contrato. Se o produto está errado, corrigir o SUT; se o comportamento mudou de propósito, atualizar os testes junto da mudança.
5. Registrar evidência, responsável, risco e próximo passo. Não aumentar timeout, remover asserção ou pular caso só para obter verde.

Classificações sugeridas: `falha:sut`, `falha:tas`, `falha:ambiente` e `falha:esperada`. Prazos sugeridos: alta, um dia útil; média, três dias úteis; baixa, próxima revisão. Labels existentes não comprovam automação de classificação ou cumprimento desses prazos.

### Instabilidade, quarentena e remoção

A proposta anterior prevê registrar instabilidade, associar uma issue, limitar o prazo de quarentena e exigir execuções consistentes antes de reintegrar o teste. A exclusão de um teste deve explicar a cobertura substituta e passar por outra pessoa na revisão do PR.

**Ainda não estão publicados neste fluxo:** comandos `test:e2e:smoke`, `test:quarentena` e `test:politica`; seleção por tags `@smoke`/`@flaky`; verificador de skips/issues; formulário e rotulagem automática de manutenção; revisão periódica automática. Não usar esses comandos como instrução operacional até sua implementação e validação.

A proposta de revisão quinzenal deve examinar instabilidade, testes ignorados, duração, duplicação, rastreabilidade e demandas vencidas. Os parâmetros precisam ser confirmados pela equipe antes de virar política obrigatória.

## 3. Evidências e evolução

Os relatos locais de 17/11 registraram testes desatualizados após a troca da Fake API pela API real e apontaram as issues [#6](https://github.com/Samara020/Projeto-Integrador-Origem/issues/6), [#7](https://github.com/Samara020/Projeto-Integrador-Origem/issues/7) e [#8](https://github.com/Samara020/Projeto-Integrador-Origem/issues/8). São contexto histórico; não comprovam que o pacote local de manutenção foi publicado nem que seus antigos skips continuam necessários. É preciso reconciliá-los com a implementação atual.

Em 23/11:

- [Run 45272586806](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45272586806), commit `40c21b8`: regressão/Docker aprovados, 42 E2E aprovados.
- [Run 45283640409](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45283640409), commit `20e90fd`: dois timeouts E2E; gate reprovado e [issue #15](https://github.com/Samara020/Projeto-Integrador-Origem/issues/15) emitida automaticamente.
- [PR #18](https://github.com/Samara020/Projeto-Integrador-Origem/pull/18): dois interceptadores passaram a observar a rota canônica `/envios/cotacao`, preservando as asserções. [Run 45291018302](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45291018302): 346 casos aprovados, zero falhas e ignorados; Docker/gate aprovados. O PR foi integrado.
- [PR #16](https://github.com/Samara020/Projeto-Integrador-Origem/pull/16): branch atualizada, [run 45291987365](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45291987365) aprovada e imagem documental integrada.

Contagens pertencem a essas execuções, não são percentuais de cobertura nem garantias sobre SHAs futuros. Os resultados locais da suíte própria do backend devem ser apresentados separadamente, pois ela ainda não faz parte do comando central.

## 4. Próximos passos

1. Integrar a suíte própria do backend ao fluxo obrigatório, usando banco exclusivo.
2. Integrar e testar a suíte isolada do guard e avaliar o restante das suítes adicionais.
3. Reconciliar o pacote local de manutenção com a main antes de publicar novos comandos/workflows.
4. Confirmar com a equipe os critérios de quarentena, revisão e prazos propostos.
5. Manter mudanças de produto e respectivas expectativas dos testes no mesmo PR, sem enfraquecer verificações para mascarar falhas.
