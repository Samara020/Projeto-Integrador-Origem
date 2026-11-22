# Handoff — Card #18 após correções reportadas

**Atualizado:** 21/11/2026, 14:08 (America/Recife)
**Card:** [#18 — Integrar frontend com backend e substituir a Fake API](https://trello.com/c/8FeVZfC4/18-integrar-frontend-com-backend-e-substituir-a-fake-api)

## Estado para retomada

As equipes de backend e frontend entregaram relatórios de correção. O gerente de testes tentou iniciar o reteste, mas encontrou os processos descartáveis encerrados. A UI e a API precisam ser recompiladas e disponibilizadas a partir do checkout atual antes de qualquer aceite integrado.

Não considerar o Card #18 aprovado 15/15. No último estado consultado pelo gerente, o Trello estava em **Refatoração, 0/15**. O checklist não foi alterado.

## Correções relatadas pelos desenvolvedores

### Backend

- Checkout resolve a opção de envio no servidor, grava `valorFrete` na transação do pedido e propaga `valorFrete` e `valorTotal` para resposta, pagamento e histórico/listagem.
- Detalhe público usa consulta que exige produto aprovado, ativo e não excluído; os demais devem responder 404. A consulta irrestrita fica para fluxos internos/privados.
- A fila administrativa inclui `decididoPorId`; `peso` é convertido para número nas saídas.
- Tokens legados sem `sv` são rejeitados no segundo de corte quando a versão persistida de sessão já avançou; tokens versionados mantêm comparação estrita.
- Contrato da API e documentação de autenticação foram atualizados.
- O backend relata `tsc --noEmit` aprovado; testes unitários seguros 18/19, com uma falha atribuída ao mock antigo de `atualizarComEstoque`. Probes temporários: R3 8/8, frete 4/4, detalhe/peso/auditoria 3/3. Nenhum teste, migration ou runtime foi alterado nessa entrega.
- Foi relatada a decisão de derivar `valorTotal` dos itens mais `valorFrete`, sem coluna física `valor_total`.

### Frontend

- Services e telas consomem os valores de frete e total enviados pelo backend no checkout e no histórico.
- Detalhe trata 404 e status não aprovado como indisponíveis; peso e metadados de produto são normalizados/exibidos.
- Visitantes recebem caminho claro para login no carrinho; a exigência de comprador autenticado foi preservada.
- O frontend relata lint, typecheck e testes unitários aprovados: 14 suítes, 203/203 testes. A limitação de build com `next/font/google` sem rede continua documentada.
- O relatório do frontend afirma não ter alterado testes, configuração, Trello, commits ou serviços principais.

Esses resultados são **relatos dos desenvolvedores**, ainda não uma homologação do novo runtime integrado.

## Última auditoria integrada anterior às correções

O gerente auditou um snapshot anterior usando o portal Origem e um runtime descartável identificado. Resultados que motivaram as correções:

- Cypress: 38/42 aprovados. Falhas funcionais: checkout omitia R$ 18 de frete nos totais de R$ 88 e R$ 158; detalhe público mostrava produto reprovado como disponível. TC19 tentava adicionar ao carrinho como visitante, embora a regra exija comprador autenticado.
- DTO da fila administrativa omitia `decididoPorId`; `peso` saía como string.
- R1 (curadoria persistida), R2 (rollback transacional) e R3 para tokens versionados passaram naquela rodada. O token legado no mesmo segundo do corte ainda era aceito pela política então observada.
- Frontend: 203/203; backend build/typecheck aprovados, testes unitários seguros 18/19 por mock obsoleto.

Esses resultados pertencem ao snapshot anterior e não devem ser atribuídos ao código corrigido sem novo reteste.

## Gate atual de reteste

Na verificação read-only do gerente após receber os relatórios:

- UI PID `134013` não estava ativa; não havia Build ID atual.
- API PID `133834` não estava ativa; não havia processo `dist` carregado identificável.
- O checkout tem alterações novas em relação ao snapshot que havia sido comparado com os 70 arquivos da API. A antiga UI Build ID `rP_yvtJNFotKllrFA_SUp` também é pré-correções.
- Portanto, não se deve executar nem contar Cypress contra esse runtime anterior.

### Retomada às 16:13

O gerente confirmou a UI pelo portal Origem em `http://localhost:3200/` (página carregada). O processo UI PID `134013` usa Next 16.4.6 e ainda mostra a Build ID pré-correções `rP_yvtJNFotKllrFA_SUp` (SHA-256 do arquivo: `b2dbde2aaa29659114e495868eb4ea29d3ec028447c50a1518c145eb9d1baf9e`).

A API PID `133834` está ativa em `127.0.0.1:4200`, mas `/__test/identity` e `/health` retornam 503. O processo aponta para `127.0.0.1:55432/origem_card18_test`, porém a identidade do banco, usuário e owner não foi confirmada. O container descartável `origem-card18-audit` está parado (`Exited 0`). A árvore fonte continua dirty e não foi associada aos bundles/dist carregados.

**Gate permanece fechado:** não executar login, escrita, Cypress ou testes integrados. O responsável deve restaurar somente o banco descartável, obter `/__test/identity=200` com `database=origem_card18_test` e registrar manifesto compatível com o dirty checkout atual; depois comparar os bundles da UI e o dist da API com as fontes antes das escritas.

### Atualização após o usuário restaurar o banco e compilar (16:28)

O usuário iniciou o container descartável e compilou Prisma Client, backend e frontend. O preflight voltou a responder 200 para `environment=test`, `database=origem_card18_test`; `/health` também respondeu 200. Porém os processos ainda servem builds antigos: API PID `133834` não foi reiniciada após o build; UI PID `134013` aponta para o standalone antigo cujo diretório foi removido. O standalone novo tem Build ID `ALRzOyb0i_sUbAC7OdkYP`; não foi demonstrado que ele esteja servindo em `:3200`.

**Gate ainda fechado:** reiniciar somente os processos descartáveis `:4200` e `:3200`, usando o banco já iniciado e sem migrations/setup/reset; então conferir PID, build ID, bundles e hashes da API contra o dirty checkout. Só depois o gerente retoma os testes pelo portal Origem. A lista principal do Compose não deve ser iniciada.

Para retomar, o coordenador deve disponibilizar UI e API descartáveis compiladas do checkout atual e fornecer manifesto com branch/HEAD e hash do dirty snapshot, PIDs/comandos, hash/build ID da UI, hash do código carregado pela API, URL efetiva UI→API e identidade read-only do banco `origem_card18_test` em `127.0.0.1:55432`. O gerente deve confirmar a identidade pelo portal Origem antes das escritas de teste.

Após o gate, retestar os 15 critérios, priorizando frete no checkout/pagamento/histórico, detalhe de produto não aprovado, ator da curadoria, serialização numérica do peso, tokens legados e versionados, além dos cenários já aprovados. Reexecutar os specs existentes sem modificá-los; reportar TC19 separadamente se continuar testando visitante. Não alterar o checklist Trello como parte do reteste.

## Estado local registrado nesta retomada

- Branch `corrige-integracao-card-18`, HEAD `f053a8a73d91121b1b4f62f7b24ac4a4f4b4db9a`, `ahead 2` de `origin/corrige-integracao-card-18`.
- Checkout compartilhado sujo com alterações de backend, frontend e documentação; há também `database/sql/09_versao_sessao_usuario.sql` e `diagnostico_compacto_TC17.txt` não rastreados. Não limpar nem reverter essas alterações sem instrução.
- `backend/app/tests/produto-service.unit.test.ts` aparece modificado no checkout; o relatório do desenvolvedor backend diz que não o editou nesta rodada e que a falha restante vem do mock antigo. Verificar a proveniência antes de qualquer alteração.
- Nenhum commit, push, alteração no Trello ou reinício de serviço foi feito nesta retomada.

## Referências

- Auditoria integrada anterior e logs: `/tmp/origem-card18-poscorrecoes-20261121-khey1i1h/`.
- Evidência do gate que encontrou os processos encerrados: resposta read-only do gerente em 21/11, aproximadamente 14:05, recebida nesta conversa.
- Relatórios de desenvolvimento backend e frontend: mensagens desta conversa, ainda sem associação a um novo build/runtime integrado.

## Retomada e reteste final (21/11/2026, após 17:11)

Esta seção substitui os gates fechados descritos acima. O coordenador recompilou e reiniciou o runtime descartável; os testes foram executados contra a UI/API identificadas, sem usar os serviços principais.

### Alterações de código feitas nesta retomada

- `backend/app/src/services/produto.service.ts`: o DTO público agora inclui `statusValidacao`, necessário para distinguir peça aprovada e indisponível no detalhe.
- `frontend/src/services/carrinho.ts` e `frontend/src/hooks/useCarrinho.ts`: visitantes podem manter carrinho local para o fluxo de vitrine; compradores autenticados continuam usando a API, e outros perfis continuam sem permissão. Isso corrige a precondição do TC19 sem remover a autenticação do carrinho persistente.
- `backend/app/src/repositories/produto.repository.ts` e `produto.service.ts`: a atualização opcional de estoque foi incorporada à transação de atualização do produto. O método legado `atualizarComEstoque` delega para o mesmo caminho transacional, preservando compatibilidade sem alterar testes.
- `docs/ContratoDeAPI.md`: documenta `statusValidacao` na resposta pública de produto.

Nenhum teste foi editado nesta retomada. `backend/app/tests/produto-service.unit.test.ts` já estava modificado no checkout antes destas mudanças.

### Runtime e E2E

- UI: `http://localhost:3200`, PID `434535`, Next `16.4.6`, Build ID `Tl_LsRbiw___MvTbcfVPc`; compilada com `NEXT_PUBLIC_API_URL=http://localhost:4200`.
- API: `http://127.0.0.1:4200`, PID final `462334`, `node dist/index.js`; `/__test/identity` respondeu 200 com `environment=test` e `database=origem_card18_test`.
- Banco: exclusivamente PostgreSQL descartável `127.0.0.1:55432/origem_card18_test`.
- O agente de testes usou o portal Origem e executou os cinco specs Cypress: acesso 15/15, cadastro-peca 3/3, compra 10/10, desempenho 3/3 e vitrine 11/11; total **42/42**, exit 0. TC17 e TC19 passaram. TC09 passou com dez amostras por operação e os limites definidos.
- Os JUnit e evidências E2E estão em `/tmp/origem-card18-final-20261121/e2e/logs/`. O primeiro lançamento temporário falhou sem output (exit 133); a execução subsequente dos mesmos specs concluiu 42/42. Não contar o primeiro lançamento como falha funcional.
- Na checagem read-only posterior à execução, os processos `:3200` e `:4200` já não estavam escutando. Os resultados 42/42 pertencem ao runtime identificado durante a rodada; não alegar que os serviços continuam ativos nem executar uma nova rodada sem reabrir o gate de identidade/build.

### Verificações finais deste checkout

- Frontend: `npm run test:unit -- --runInBand` — 14 suítes, 203/203; `npm run lint` — exit 0; `tsc --noEmit --incremental false` — exit 0.
- Backend: Jest seguro, sem setup global de banco, em `produto-service.unit.test.ts` e `recomendacoes.unit.test.ts` — 2 suítes, 19/19. Build TypeScript exit 0 após as mudanças de produção.
- R2: probe do repository real tentou alterar preço e estoque numa única transação. A falha simulada pelo limite INT4 ocorreu após o update do preço; leitura anterior/posterior do produto 432 confirmou preço 180 e estoque 2 inalterados. A transação fez rollback. O teste usou somente `origem_card18_test`.
- `git diff --check` — sem erros de whitespace antes desta atualização documental.
- O OpenCode não forneceu diagnóstico adicional legível; a reprodução/correção de TC17/TC19 veio do reteste Cypress e das mudanças descritas acima.

### Estado e limites de aceite

- HEAD permanece `f053a8a73d91121b1b4f62f7b24ac4a4f4b4db9a`, branch `corrige-integracao-card-18`, `ahead 2`, com a árvore dirty compartilhada. Não fiz commit, push, pull ou alteração no Trello.
- A última leitura do Trello relatada antes desta retomada era Refatoração, 0/15; não foi reconsultado nem alterado nesta retomada.
- Os cinco specs E2E estão aprovados no snapshot servido. Isso não significa automaticamente 15/15 do checklist do card: checklist/estado do Trello não foi alterado. Os resultados R1, R3, F1, frete, acesso de produto reprovado e rollback foram coletados em evidências das rodadas integradas descritas nesta conversa; limites de cobertura (por exemplo, gateway externo real, SMTP e concorrência extensa) não foram convertidos em aprovação irrestrita.
- Dados sintéticos de teste permaneceram no banco descartável. Não houve cleanup, reset, migration ou setup nesta retomada.

### Próximo passo

Revisar a árvore dirty compartilhada e o relatório da rodada antes de decidir o aceite do card. Manter o checklist Trello intacto até essa decisão explícita; não substituir as evidências 42/42 dos specs por uma alegação de que todos os quinze critérios foram integralmente homologados.

## Auditoria posterior do agente de testes — gate bloqueado

Em 21/11/2026, após o reteste anterior, o agente de testes fez uma nova leitura somente investigativa. O checkout permanecia no branch `corrige-integracao-card-18`, HEAD `f053a8a73d91121b1b4f62f7b24ac4a4f4b4db9a`, com 25 arquivos modificados e 4 untracked. O diff reportado foi 924 inserções e 131 remoções.

O preflight retornou identity/health 200 para `origem_card18_test`; o portal Origem carregou e observou requests para `localhost:4200`. Contudo, o agente não conseguiu provar a associação do processo/socket API ao `dist` atual: `ps` não identificou os PIDs reportados e não havia manifesto/build ID da API que confirmasse o código carregado. O hash atual do `dist` difere do manifesto do reteste anterior.

Por esse motivo, nenhum Cypress, probe de negócio ou escrita foi executado nesta auditoria. O resultado **42/42** continua sendo evidência da execução anterior e não foi reaproveitado como resultado do snapshot/runtime atual. A nova execução requer manifesto que associe processo, cwd/comando, hash do `dist` e banco `origem_card18_test`, ou confirmação equivalente de versão no runtime.

O portal Trello foi consultado em leitura: Card #18 em **Refatoração**, checklist **0/15**. Não houve mudança no card. Não acessar portas principais, reiniciar serviços, rodar migrations/setup/reset ou limpar os dados sintéticos.
