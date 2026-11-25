# TAS do Origem · automação de testes e política de manutenção

Atualização: 25/11/2026. Este documento distingue a automação publicada do que ainda é proposta para a equipe confirmar. TAS é a solução de automação de testes; SUT é o sistema sob teste: frontend, backend e módulo de IA do Origem.

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

O E2E só vale como prova no Chrome, o navegador da esteira. `E2E_BROWSER` troca o navegador na máquina, e o comando central avisa quando ele não é o Chrome ([`scripts/navegador-e2e.mjs`](../scripts/navegador-e2e.mjs)). No Electron sem tela, os casos que conferem aviso flutuante reprovam; no Firefox, a guarda de rede bloqueia todos. Reprovação fora do Chrome se confirma na esteira antes de virar demanda.

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
| `npm run test:metricas` | Lê os JUnit de `relatorios/` e o backlog do plano e gera os relatórios técnico e de negócio. |
| `npm run test:automacao` | Testes da própria automação: gate, emissor de issue, conferência da política, rotulagem e métricas. |

A cada execução da regressão, `npm run test:metricas` gera dois relatórios e um arquivo de dados, guardados no artefato `relatorios-testes`:

| Arquivo | Para quem | O que mostra |
|---|---|---|
| `relatorios/metricas.html` | Equipe de desenvolvimento | Resultado por nível, casos reprovados, cobertura de riscos com os casos pendentes, testes pulados, os 10 casos mais lentos, esteira por workflow e defeitos abertos. |
| `relatorios/negocio.html` | Quem decide sem ser técnico | Situação, recomendação de liberação, cinco indicadores em linguagem simples, casos planejados sem verificação automática e defeitos conhecidos. |
| `relatorios/metricas.json` | Outra ferramenta | Os mesmos números. |

Nenhum número nem texto de diagnóstico é fixo no código: tudo sai dos JUnit de `relatorios/`, do backlog de [`docs/testes/plano-de-testes.md`](testes/plano-de-testes.md) e da API do GitHub. Os limites ficam em [`.github/politica-testes.json`](../.github/politica-testes.json). Os relatórios só informam: não aprovam nem reprovam a esteira.

Situação geral dos dois relatórios:

- **Vermelho:** algum nível tem caso reprovado. Recomendação: não liberar.
- **Amarelo:** nada reprovou, mas há tempo ou casos ignorados acima do limite, caso do backlog sem teste automatizado, esteira abaixo de 90% de sucesso em 7 dias ou dado que não pôde ser lido. Recomendação: liberar com ressalvas.
- **Verde:** nada reprovou, 100% dos casos do backlog automatizados, esteira em 90% ou mais e todos os dados presentes. Recomendação: liberar.

Dado ausente aparece como "sem dados" e impede o verde. É o caso da máquina de desenvolvimento, que roda sem acesso à API do GitHub.

#### Métricas selecionadas e descartadas

Critério: a métrica precisa apoiar uma decisão de alguém. Sem decisão associada, foi descartada.

| Métrica | Decisão | Justificativa |
|---|---|---|
| Taxa de aprovação por nível | Selecionada | Diz na hora se a mudança pode ser mesclada e em que nível está o problema. |
| Casos reprovados, com nível e arquivo | Selecionada | É por onde começa a triagem da política de manutenção. |
| Cobertura de riscos do backlog | Selecionada | Liga o resultado ao plano de testes: mostra quais casos planejados ainda dependem de conferência manual. |
| Caminho crítico (`@smoke`) aprovado | Selecionada | Responde à pergunta de negócio "dá para comprar e vender?". |
| Taxa de sucesso da esteira em 7 dias | Selecionada | Separa falha pontual de instabilidade. Abaixo de 90% a equipe investiga antes de confiar no verde. |
| Tempo por nível contra o limite | Selecionada | Protege o objetivo de resposta rápida a cada push. Estouro pede otimização ou divisão da suíte. |
| Testes pulados ou em quarentena | Selecionada | Teste desligado é cobertura que sumiu. A política exige issue aberta para cada um. |
| Os 10 casos mais lentos | Selecionada | Indica onde otimizar quando o tempo do nível se aproxima do limite. |
| Defeitos do sistema em aberto (`falha:sut`), por prioridade | Selecionada | É o risco que o negócio assume ao liberar. |
| Cobertura de código | Adiada | A esteira ainda não gera o relatório. Entra quando a medição existir; os relatórios já dizem "não medida". |
| Densidade de defeitos por mil linhas | Descartada | Projeto pequeno e em mudança rápida: o número oscila sem indicar decisão. |
| Tempo médio de reparo | Descartada | O histórico de demandas tem poucos dias. A média de tão poucos casos não é confiável. |
| Número total de testes | Descartada como indicador | Crescer o número não diz se o risco está coberto. O total aparece só como contexto. |
| Taxa de falha por autor | Descartada | Não apoia decisão técnica e incentiva a esconder falha. |

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

O que a esteira impõe está na seção 1: quarentena separada, conferência de testes pulados e formulário com rotulagem. Prazos, responsáveis e limites abaixo são **propostas para adoção pela equipe**: a automação não cobra prazo nem escolhe responsável.

### Escopo

A política cobre as suítes do comando central (`npm run test:unit`, `test:backend`, `test:api`, `test:e2e`), os scripts da automação em `.github/scripts/` e `scripts/`, e os workflows de `.github/workflows/`. Os testes C++ de `aed/tests/` ficam fora.

### Entrada de uma demanda

- **Automática:** falha no push da `main` ou na regressão agendada abre ou comenta uma issue `falha-pipeline`.
- **Manual:** formulário **Manutenção da automação de testes** ([`.github/ISSUE_TEMPLATE/manutencao.yml`](../.github/ISSUE_TEMPLATE/manutencao.yml)). Ele pede tipo de falha, prioridade, se o teste é instável, nível, teste afetado, investigação, responsável, prazo e encaminhamento. O workflow `rotular-manutencao.yml` lê as respostas e aplica as labels `falha:*`, `prioridade:*` e `flaky`. Se a resposta for editada, a label antiga sai.

Falha em PR causada pela própria mudança não é demanda de manutenção: corrige-se antes do merge.

### Triagem, nesta ordem

1. **Ler a evidência:** execução, etapa, caso, mensagem de erro, commit e o artefato `relatorios-testes`.
2. **Rodar de novo uma única vez**, sem mudar nada. Se passar, a falha não está resolvida: vira suspeita de instabilidade e é registrada assim.
3. **Reproduzir na máquina** com o mesmo comando do workflow. No E2E, só o Chrome reproduz a esteira.
4. **Comparar com a última execução verde:** o que mudou no sistema, no teste e no ambiente.
5. **Classificar e registrar** no formulário, com evidência, responsável e prazo.

Rodar várias vezes até passar é proibido. Também não se aumenta timeout, remove asserção ou pula caso só para obter verde.

### Classificação

| Label | O que é | O que se corrige |
|---|---|---|
| `falha:sut` | Defeito no sistema. | O sistema. O teste não muda. |
| `falha:tas` | Defeito no teste: seletor, dado, asserção ou dublê. | O teste. |
| `falha:ambiente` | Runner, serviços, rede, banco ou dependência. | O workflow, o script ou o ambiente. |
| `falha:esperada` | O requisito mudou de propósito. | O teste, no mesmo PR da mudança, citando a decisão. |

Na dúvida entre defeito do sistema e defeito do teste, vale `falha:sut` até provar o contrário. A label vem da resposta de quem preencheu o formulário: a automação não investiga a causa.

### Prioridades e prazos

O prazo conta a partir da classificação.

| Label | Prazo | Quando se aplica |
|---|---|---|
| `prioridade:alta` | 1 dia útil | Check obrigatório vermelho na `main` ou defeito em caso `@smoke`. |
| `prioridade:media` | 3 dias úteis | Falha só na regressão agendada, fora do caminho crítico. |
| `prioridade:baixa` | Até a próxima revisão periódica | Lentidão, aviso, duplicação, rastreabilidade, ambiente local. |

Prazo estourado: a demanda sobe um nível de prioridade e entra na pauta do próximo encontro da equipe.

### Responsáveis

- **Triagem:** o autor do push ou do PR que disparou a execução. Na execução agendada, o triador da semana, em rodízio entre os integrantes. A escala do rodízio ainda não foi definida pela equipe.
- **Correção:** conforme o tipo. `falha:sut`, quem mantém o código afetado. `falha:tas`, quem mantém o teste. `falha:ambiente`, quem responde pela esteira. `falha:esperada`, o autor da mudança.
- **Fechamento:** quem corrigiu, com o link do PR, e só depois de uma execução verde.

### Fluxo resumido

1. A falha aparece: issue automática da esteira ou relato de alguém.
2. O responsável pela triagem segue os cinco passos acima.
3. A demanda é registrada pelo formulário e recebe as labels sozinha.
4. O responsável corrige por PR, dentro do prazo da prioridade.
5. O Quality Gate do PR passa e o PR é mesclado.
6. Quem corrigiu fecha a issue com o link do PR e da execução verde.

### Por que essas decisões

| Decisão | Justificativa no contexto do Origem |
|---|---|
| Rodar de novo uma única vez | Em 24/11 a taxa de sucesso da esteira em 7 dias era de 49,1% (112 execuções). Repetir até passar esconderia tanto instabilidade quanto defeito real. |
| Na dúvida, `falha:sut` | Na execução manual de 09/11, 9 dos 24 casos reprovaram e 6 ficaram bloqueados. Em 24/11 havia 5 issues `falha:sut` abertas (#8 a #12). Defeito real é o caso comum aqui. |
| Alta em 1 dia útil | A `main` exige o check `Quality Gate` em modo strict. Com uma regressão na `main`, todo PR atualizado herda a falha e fica bloqueado para os 8 integrantes. |
| Média em 3 dias úteis | A regressão agendada roda uma vez por dia. Três dias dão três execuções para separar falha constante de falha intermitente. |
| Baixa até a próxima revisão | A revisão acontece nos dias 1 e 15. Nenhuma demanda baixa fica mais de 15 dias sem ser olhada. |
| Quarentena de no máximo 15 dias | É o mesmo ciclo da revisão: todo teste em quarentena passa por pelo menos uma revisão antes de vencer. |
| `@smoke` não entra em quarentena | Os 7 casos `@smoke` cobrem login, vitrine, carrinho, compra com Pix e cadastro de peça. Em quarentena, deixariam de barrar o merge. |
| Nova tentativa só na quarentena | A regressão usa `retries: 0`. Nova tentativa na regressão faria teste intermitente passar por estável. |
| Issue automática só na `main` e na agendada | Falha em PR é da própria mudança e já bloqueia o merge. Abrir issue para ela geraria ruído. |
| Triagem pelo autor do push | Quem enviou a mudança tem o contexto, e a esteira identifica o commit. |
| Fechar só depois de execução verde | Sem a execução, "corrigido" é suposição. |

### Instabilidade, quarentena e remoção

Para pôr um teste em quarentena:

1. Abrir a issue pelo formulário, com "O teste é instável?" em "Sim".
2. Acrescentar `@flaky #<número da issue>` ao título do teste.
3. O teste sai da regressão e passa a rodar na etapa de quarentena, com novas tentativas.
4. Corrigida a causa, tirar a tag no mesmo PR da correção e fechar a issue.

Issue fechada com o teste ainda marcado reprova a conferência da política. Uma falha isolada não confirma instabilidade: é preciso o mesmo commit passar e falhar. A exclusão de um teste deve explicar a cobertura substituta e passar por outra pessoa na revisão do PR.

### Revisão periódica

O workflow `revisao-periodica.yml` abre, nos dias 1 e 15, uma issue com o tamanho da suíte, as execuções dos últimos 15 dias, as demandas abertas, os testes pulados ou em quarentena e o roteiro: instabilidade, quarentena, tempo de execução, duplicação, rastreabilidade, demandas vencidas e remoção. Os limites de `.github/politica-testes.json` são propostas a confirmar com a equipe.

### Demonstração: a issue #30 do início ao fim

Situação real, de 24 e 25/11/2026.

1. **Falha identificada.** Na máquina de desenvolvimento, sem Chrome, `npm run test:e2e` rodou no Electron e 3 casos reprovaram com `expected '<div.chakra-toast__root>' to be 'visible'`: TC19, TC12 e TC02. Reprovaram nas duas execuções feitas, a do smoke e a completa.
2. **Triagem.** Evidência lida no relatório JUnit. Comparação com a esteira: os mesmos casos passaram no Chrome, 42 de 42 na [execução 45456658666](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45456658666). Reprodução à mão em navegador com tela: o aviso apareceu nos três. Um dos três casos não tem tag, o que descartou o filtro `@smoke`.
3. **Registro.** [Issue #30](https://github.com/Samara020/Projeto-Integrador-Origem/issues/30), com o corpo no formato do formulário de manutenção.
4. **Classificação.** Ambiente, prioridade baixa, não instável. O workflow `rotular-manutencao.yml` aplicou `falha:ambiente` e `prioridade:baixa` sozinho, na [execução 45460806867](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45460806867).
5. **Responsável e prazo.** Atribuída a quem relatou, com prazo em 01/12/2026, a revisão periódica seguinte.
6. **Correção.** O comando central passou a avisar quando o navegador do E2E não é o Chrome ([`scripts/navegador-e2e.mjs`](../scripts/navegador-e2e.mjs)), antes da execução e depois do resumo, e a exigência foi documentada na seção 1. Três testes novos em `.github/scripts/politica.test.mjs` cobrem a regra.
7. **Fechamento.** O PR da correção cita a issue. Ela fecha no merge, que só acontece com o Quality Gate verde. O PR e a execução ficam ligados na página da issue.

O que a demonstração não cobre: a causa dentro do Electron foi deduzida, não medida. O aviso flutuante só fica visível quando o navegador desenha quadros de animação, e isso foi observado em um navegador com tela parado, não no Electron.

**Ainda não existe:** cobertura de código, diagnóstico automático de instabilidade (rodar a suíte várias vezes e classificar cada teste), lista de testes críticos protegidos contra remoção, rastreabilidade teste para história de usuário validada por arquivo e escala do rodízio de triagem.

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
