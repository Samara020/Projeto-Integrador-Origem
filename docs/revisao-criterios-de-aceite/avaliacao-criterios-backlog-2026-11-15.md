# Avaliação dos critérios de aceite — Sistema Origem

**Data:** 15/11/2026  
**Base de requisitos:** Backlog Priorizado 1.1, especialmente os critérios das HU-01 a HU-25 e a matriz das páginas 41–43.  
**Versão observada:** checkout local do repositório Origem, com frontend Next.js, Fake API, testes automatizados e módulo de IA. Esta avaliação não presume que as telas com dados locais já representem o backend real da Avaliação 2.

## Escopo selecionado

As 25 histórias do backlog têm alguma representação no código atual (rota, página, serviço, componente ou endpoint), então foram mantidas na rastreabilidade. Isso **não** significa que todas estejam prontas. Para execução, também considerei a delimitação declarada no próprio backlog: HU-17 e HU-19–HU-23 estão fora do Plano de Testes 1.3; HU-18, HU-24 e HU-25 aguardam decisão formal de escopo. Elas aparecem abaixo como implementações em estágio observado, sem serem tratadas como aprovação de aceite.

**Legenda:** **Atendido** = cenário correspondente executou com resultado satisfatório; **Parcial** = parte da regra está implementada/testada, ou cenário mais amplo não foi integralmente provado; **Não atendido** = há evidência de lacuna funcional; **Pendente de validação** = não há execução/evidência suficiente para afirmar atendimento ou ausência da funcionalidade.

## Resultado da execução

| Execução | Resultado | Evidência |
|---|---|---|
| Unitários frontend (Jest) | **Passou — 9 suítes, 150/150** | `relatorios/unit-jest.xml`; inclui TC01/08/11/14, TC02/12, TC03/05, TC04, TC06/07/10 e lógica administrativa. |
| Unitários módulo IA (pytest) | **Passou — 18/18** | Reexecução fora do sandbox: `relatorios/unit-pytest.xml`; os testes de recomendação, serviço e desempenho concluíram. |
| API Fake do frontend (Jest) | **Passou — 6 suítes, 67/67** | `relatorios/api-jest.xml`; cobriu autenticação/cadastro, produtos/busca, listas do catálogo, recomendações e consultas administrativas. |
| API do módulo IA (pytest HTTP) | **Passou — 7/7** | `relatorios/api-pytest.xml`. |
| Cypress E2E | **Executado com Fake API — 23 aprovados, 8 falharam, 1 pendente (32 casos)** | Rodada completa com `NEXT_PUBLIC_API_URL=/api` e frontend dev: `relatorios/e2e-*.xml`, capturas em `e2e/cypress/screenshots/` e vídeos em `e2e/cypress/videos/`. As falhas estão detalhadas abaixo e não são mais atribuídas à ausência do backend. |
| Build Next.js | **Passou uma vez**; tentativa posterior com `/api` não concluiu | A primeira execução compilou e gerou as páginas. A reconstrução para o modo `/api` foi bloqueada pela indisponibilidade de `fonts.googleapis.com`; não se considera esse bloqueio um defeito funcional. |
| ESLint | **Passou** | `frontend`: `npm run lint`, código de saída 0. |

Na primeira tentativa, o Cypress usou o backend real em `localhost:4000`, que não tinha as contas de demonstração nem todas as rotas esperadas. A reexecução final foi feita com Fake API (`NEXT_PUBLIC_API_URL=/api`), que é o alvo configurado pelos cenários E2E. Os resultados desta segunda rodada são considerados evidência funcional.

### Falhas E2E desta rodada

- **TC01 — login do comprador:** login aceito pela Fake API, mas a interface não navegou da tela `/entrar` para a vitrine.
- **TC02 — publicação de peça:** `POST /api/produtos` retornou `405`; o cenário de cadastro com campos vazios e o limite de descrição passaram.
- **TC04 — carrinho:** a ação de adicionar não levou à rota `/carrinho`; também foi observada chamada `GET /api/carrinho` com 404.
- **TC06/TC10 — checkout/snapshot, TC07 — pedido, TC13 — evitar pedido duplicado:** os casos não alcançaram o estado/ação esperados; `GET /api/comprador/pedidos` também retornou 404.
- **TC03 — busca no cabeçalho e filtro por produto vendido:** a busca não navegou para `/catalogo`; o caso do produto vendido recebeu HTTP 400.

O Cypress aprovou **10/11** casos do spec de acesso, **2/3** de cadastro de peça, **5/10** de compra (1 pendente) e **6/8** de vitrine. Os 8 cenários que falharam são TC01, TC02, TC03 (2 casos), TC04, TC06/TC10, TC07 e TC13.

## Rastreabilidade por história e critério

### HU-01 — Autenticação e perfis de acesso (Must Have)

- **01.1 Login válido e destino por perfil** — TC01 (Jest unitário/API e Cypress): **Parcial**. A API aceita credenciais, mas o E2E do comprador não confirmou o redirecionamento à vitrine; os demais casos de acesso do spec passaram.
- **01.2 Credenciais inválidas, mensagem e tentativa registrada** — TC11 (Jest unitário/API; Cypress inconclusivo): **Parcial**. Erro sem token está coberto; registro de tentativa/política não foi demonstrado.
- **01.3 Bloqueio de operações por papel** — TC08/TC14 (Jest unitário): **Parcial**. A guarda de tela é testada; o critério também pede resposta de não autorizado na operação/API.
- **01.4 Expiração da sessão** — nenhum TC identificado/executado: **Pendente de validação**.
- **01.5 Limite e bloqueio temporário após tentativas** — nenhum TC/política configurada identificados: **Não atendido**.
- **01.6 Recuperação segura sem revelar existência da conta** — formulário existe, mas fluxo/API correspondente não foi exercitado: **Pendente de validação**.
- **01.7 Acesso direto a rota/requisição restrita** — TC08/TC14 cobre bloqueio de tela, não uma chamada direta à API: **Parcial**.

### HU-02 — Cadastro de peças (Must Have)

- **02.1 Cadastro completo associado ao artesão** — TC02 (Jest unitário e Cypress): **Parcial**. Serviço cria peça/estoque, mas a publicação E2E falha porque `POST /api/produtos` responde 405.
- **02.2 Campos obrigatórios ausentes** — TC12 (Jest unitário e Cypress): **Atendido** nos dois cenários de validação executados (formulário vazio e descrição abaixo do limite).
- **02.3 Produção sob demanda não contabilizada como estoque** — nenhum teste correspondente identificado: **Pendente de validação**.

### HU-03 — Validação de origem e autenticidade (Must Have)

- **03.1 Solicitação pendente com data/versão de evidências** — TC03 (fila de pendências): **Parcial**; fila existe, mas submissão/versionamento não foi provado.
- **03.2 Aprovação, responsável/data/justificativa e selo** — TC03 (unitário/API): **Parcial**. Aprovação e ativação de selo são testadas; trilha completa de auditoria não.
- **03.3 Pendência/reprovação, motivo, notificação e ausência de selo** — TC03: **Parcial**. Reprovação sem justificativa é recusada; notificação ao artesão não foi validada.
- **03.4 Exibição pública sem selo para estados não aprovados** — TC03/TC05: **Pendente de validação**.
- **03.5 Aprovação auditável com responsável e data** — TC03: **Não atendido** como critério integral; não foi encontrada evidência de trilha persistida com esses campos.
- **03.6 Reprovação com decisão/justificativa** — TC03 (unitário): **Parcial**; justificativa é exigida em um cenário, mas histórico de decisão não é provado.
- **03.7 Solicitação ainda pendente não exibe selo** — TC03: **Pendente de validação**.

### HU-04 — Vitrine (Must Have)

- **04.1 Peças ativas/disponíveis com imagem, nome, preço e artesão** — TC03 (Jest unitário/API): **Parcial**. Disponibilidade/dados de catálogo passam; E2E de tela não foi conclusivo.
- **04.2 Reservada, sem estoque ou inativa não apresentada como comprável** — TC03/TC05 (unitário/API): **Parcial**. Reservada/vendida são cobertas; estado inativo e compra pela tela não foram comprovados.
- **04.3 Paginação, abertura de produto e desktop/mobile** — TC03: **Parcial**. Paginação e rota de detalhe têm cobertura de API; E2E de busca no cabeçalho falha e responsividade em larguras distintas segue sem execução.

### HU-05 — Detalhes da peça e do artesão (Must Have)

- **05.1 Descrição, imagens, técnica, categoria, origem, preço, disponibilidade, produção e artesão** — TC03 (API do detalhe): **Parcial**. Campos do detalhe são verificados; navegação e todos os campos na interface não.
- **05.2 Selo apenas após aprovação e consulta sem documento privado** — TC03: **Pendente de validação**.
- **05.3 Campo opcional ausente sem quebrar a página** — sem cenário específico: **Pendente de validação**.

### HU-06 — Busca e filtros (Must Have)

- **06.1 Texto combinado com categoria/técnica/região retorna interseção disponível** — TC03 (unitário/API): **Parcial**. Termo e filtros individuais passam; combinação cruzada completa não foi demonstrada.
- **06.2 Busca vazia informa ausência e permite limpar/alterar filtros** — TC03: **Parcial**. Envelope sem resultados passa; saída pela interface não foi concluída.
- **06.3 Remover um filtro preserva os demais** — nenhum cenário E2E concluído: **Pendente de validação**.

### HU-07 — Perfil do artesão e da loja (Must Have)

- **07.1 Perfil ativo com história/técnicas/região e produtos** — rota/página existem; teste de perfil ativo não identificado: **Pendente de validação**.
- **07.2 Navegação do produto ao perfil** — sem caso executado: **Pendente de validação**.
- **07.3 Perfil inativo não mostrado como ativo nem com itens indisponíveis** — API verifica ID inexistente 404, mas não loja inativa: **Parcial**.

### HU-08 — Carrinho (Must Have)

- **08.1 Adicionar item com quantidade/preço/subtotal** — TC04 (Jest unitário e Cypress): **Parcial**. A lógica local passa, mas a ação na tela não conclui a navegação ao carrinho; `GET /api/carrinho` retorna 404.
- **08.2 Alterar/remover item atualizando totais e preservando os demais** — TC04 (Jest unitário e Cypress): **Parcial**. A lógica local passa; o fluxo de remoção pela tela não completou por falha na entrada ao carrinho.
- **08.3 Revalidar mudança de preço/disponibilidade no carrinho/checkout** — TC04: **Pendente de validação**.
- **08.4 Peça única limitada a uma unidade sem caracterizar venda** — TC05/TC06 não provaram o limite do carrinho: **Pendente de validação**.

### HU-09 — Criação do pedido e checkout (Must Have)

- **09.1 Pedido com ID, itens, valores, endereço, status e data** — TC06 (Jest unitário): **Parcial**. Criação e status foram exercitados; fluxo E2E não.
- **09.2 Endereço incompleto/indisponibilidade impede pedido e explica correção** — TC06 (Jest unitário): **Parcial**. Endereço incompleto é recusado; indisponibilidade e mensagem visual não estão integralmente cobertas.
- **09.3 Pedido preserva snapshot de dados comerciais** — TC10 (Jest unitário): **Atendido** para os campos de itens/total verificados.

### HU-10 — Pagamento (Must Have)

- **10.1 Aprovação associa pagamento e atualiza pedido/disponibilidade** — TC06/TC07 (Jest unitário): **Parcial**; status local é atualizado, sem confirmação de integração com provedor.
- **10.2 Recusa mantém não pago e informa comprador** — TC06/TC07: **Parcial**; recusa inválida é testada, aviso na interface não.
- **10.3 Falha/cancelamento registra motivo e libera reserva** — sem cenário completo: **Pendente de validação**.
- **10.4 Evento repetido processa uma vez (idempotência)** — TC06: **Pendente de validação**.

### HU-11 — Peças únicas (Must Have)

- **11.1 Marcação restringe disponibilidade a uma unidade** — TC05: **Parcial**; estado de peça única existe, regra não foi integralmente exercitada.
- **11.2 Compra concorrente permite apenas uma reserva** — TC06: **Pendente de validação**; não foi executado teste paralelo/concor­rente.
- **11.3 Pagamento confirmado bloqueia nova compra e mantém histórico** — TC05/TC06: **Parcial**.
- **11.4 Falha/cancelamento/expiração libera a peça ativa** — TC05/TC06: **Pendente de validação**.
- **11.5 No máximo uma venda confirmada sob tentativas simultâneas** — sem teste de concorrência conclusivo: **Pendente de validação**.
- **11.6 Liberação após falha sem venda confirmada** — sem cenário conclusivo: **Pendente de validação**.

### HU-12 — Estoque (Must Have)

- **12.1 Mostrar disponível/reservado/vendido** — TC05/TC06: **Parcial**; estados aparecem nos dados do produto, consulta consolidada por artesão não foi provada.
- **12.2 Baixa após pagamento uma única vez e bloqueio de saldo negativo** — TC06/TC10: **Pendente de validação**.
- **12.3 Sob demanda usa capacidade/prazo, não estoque físico** — sem caso identificado: **Pendente de validação**.
- **12.4 Alerta no limite configurado pelo artesão** — sem caso identificado: **Pendente de validação**.
- **12.5 Quantidade insuficiente bloqueia adicionar/confirmar** — TC04/TC06: **Parcial**; alteração de quantidade é coberta, limite de disponibilidade não.
- **12.6 Consistência do saldo após venda, sem negativo** — TC06/TC10: **Pendente de validação**.
- **12.7 Disponibilidade sob demanda** — sem caso identificado: **Pendente de validação**.

### HU-13 — Acompanhamento de pedidos pelo comprador (Must Have)

- **13.1 Lista apenas pedidos do comprador com data/valor/status** — TC07 (serviço unitário e Cypress): **Parcial**; listagem local passa, mas o E2E não encontrou o status esperado e `/api/comprador/pedidos` responde 404.
- **13.2 Detalhe com itens, artesão, endereço, pagamento, personalização, transporte e histórico** — TC07: **Pendente de validação**.
- **13.3 Negar pedido de outro comprador** — TC07: **Pendente de validação**; não há cenário de autorização concluído.

### HU-14 — Gestão de pedidos pelo artesão (Must Have)

- **14.1 Fila só com pedidos do artesão e prazos/status** — TC07 (API/serviço de pedidos): **Pendente de validação**.
- **14.2 Transição válida registra data/responsável e atualiza comprador** — TC07: **Pendente de validação**.
- **14.3 Bloquear transição inválida e preservar histórico** — TC07: **Pendente de validação**.

### HU-15 — Painel de gestão do artesão (Must Have)

- **15.1 Indicadores de produtos ativos, estoque baixo, pedidos/status e avaliações recentes** — nenhum teste específico: **Pendente de validação**.
- **15.2 Atalhos abrem listas filtradas** — sem teste específico: **Pendente de validação**.
- **15.3 Painel limitado à própria loja** — sem teste de isolamento por artesão: **Pendente de validação**.

### HU-16 — Painel administrativo (Must Have)

- **16.1 Visão de filas/usuários/artesãos/produtos/ocorrências** — TC08 e consultas API administrativas: **Parcial**; filas/indicadores passam, visão completa não foi testada.
- **16.2 Ações com justificativa, responsável, data e resultado** — TC03/moderação administrativa (Jest): **Parcial**; decisão local é testada, trilha de auditoria completa não.
- **16.3 Negar acesso sem papel ADMINISTRADOR sem expor dados** — TC08/TC14 (Jest unitário): **Parcial**; guarda visual passa, autorização de todos os endpoints não foi testada.

### HU-17 — Recomendação de produtos (Should Have; fora do escopo do Plano 1.3)

- **17.1 Recomendações disponíveis relacionadas, sem repetir referência** — API de recomendações (Jest) e API IA (pytest): **Atendido** nos casos executados.
- **17.2 Fallback documentado ou ocultação quando há poucos itens** — API de recomendações tem fallback básico: **Parcial**; teste de lógica Python ficou bloqueado no setup.
- **17.3 Motivo simples da recomendação** — resposta IA contém score/justificativa em teste HTTP; exibição do motivo na interface não foi E2E: **Parcial**.

### HU-18 — Transporte e embalagem (Should Have; escopo pendente no Plano 1.3)

- **18.1 Validar e salvar peso/dimensões/fragilidade** — sem cenário específico: **Pendente de validação**.
- **18.2 Orientar embalagem e registrar solução** — sem cenário específico: **Pendente de validação**.
- **18.3 Mostrar cuidados ao comprador** — sem cenário específico: **Pendente de validação**.
- **18.4 Snapshot logístico no pedido** — sem cenário específico: **Pendente de validação**.

### HU-19 — Avaliação após a compra (Should Have; fora do escopo do Plano 1.3)

- **19.1 Avaliação de pedido concluído associada a pedido/produto/artesão** — sem teste de submissão: **Pendente de validação**.
- **19.2 Impedir avaliação sem compra concluída** — sem teste: **Pendente de validação**.
- **19.3 Evitar duplicidade e permitir edição conforme política** — serviço contém verificação local, sem execução automatizada correspondente: **Parcial**.

### HU-20 — Consulta de avaliações pelo artesão (Should Have; fora do escopo do Plano 1.3)

- **20.1 Listar nota/comentário/produto/data/média** — painel mostra métricas resumidas, não foi encontrada tela de listagem de avaliações: **Parcial**.
- **20.2 Exibir apenas avaliações da própria loja** — sem tela/caso de isolamento identificado: **Não atendido**.
- **20.3 Avaliação moderada não compõe média pública e sinaliza estado ao artesão** — sem teste/integração comprovados: **Pendente de validação**.

### HU-21 — Moderação de avaliações suspeitas (Should Have; fora do escopo do Plano 1.3)

- **21.1 Sinalizar sem ocultar automaticamente** — API lista avaliações sinalizadas; criação/regra de sinalização não foi testada: **Parcial**.
- **21.2 Manter/ocultar/remover com justificativa, responsável e data** — teste unitário cobre manter/remover, não toda a auditoria: **Parcial**.
- **21.3 Recalcular média/listas após decisão** — teste de recalculo público não identificado: **Pendente de validação**.

### HU-22 — Solicitação e acompanhamento de suporte (Should Have; fora do escopo do Plano 1.3)

- **22.1 Abrir chamado com protocolo/status** — tela/serviço existem, sem teste de fluxo: **Pendente de validação**.
- **22.2 Consultar mensagens e histórico cronológico** — sem teste: **Pendente de validação**.
- **22.3 Encerrar/reabrir conforme política** — sem teste: **Pendente de validação**.

### HU-23 — Triagem inteligente e escalonamento do suporte (Should Have; fora do escopo do Plano 1.3)

- **23.1 Sugerir categoria/prioridade/resposta e identificar automação** — há triagem por regras no serviço; sem teste de aceitação: **Parcial**.
- **23.2 Escalonar preservando contexto/histórico** — sem cenário executado: **Pendente de validação**.
- **23.3 Escalonar temas críticos sem executar ação** — sem cenário executado: **Pendente de validação**.

### HU-24 — Personalização (Could Have; escopo pendente no Plano 1.3)

- **24.1 Artesão configura opções/limites/acréscimos** — interface de personalização existe para o comprador; configuração do artesão não foi comprovada: **Pendente de validação**.
- **24.2 Validar escolhas e persistir preço/prazo no carrinho/pedido** — serviço local de solicitação existe, sem teste: **Parcial**.
- **24.3 Produto não personalizável não mostra campos** — sem teste específico: **Pendente de validação**.

### HU-25 — Comparação de peças (Could Have; escopo pendente no Plano 1.3)

- **25.1 Selecionar de 1 a 5 peças e habilitar comparação** — **Não atendido**: implementação limita a seleção a 3 peças (`MAXIMO_COMPARACAO` e texto da página).
- **25.2 Bloquear sexta peça e informar limite** — **Parcial** para limite implementado de 3; diverge do aceite de 5.
- **25.3 Comparar atributos equivalentes e remover/atualizar seleção** — página/serviço existem, sem teste automatizado: **Pendente de validação**.
- **25.4 Indisponível sinalizada e bloqueada para carrinho** — comparação mostra estado, mas bloqueio de adicionar ao carrinho não foi provado: **Parcial**.

## Lacunas prioritárias observadas

1. Corrigir as rotas/integrações Fake API faltantes ou ajustar os services às rotas existentes: publicação `POST /api/produtos`, carrinho `/api/carrinho` e pedidos `/api/comprador/pedidos`; corrigir também os redirecionamentos e a busca do cabeçalho revelados pelos cenários E2E.
2. Completar critérios Must Have sem evidência: expiração/limite de login e RBAC na API (HU-01), produção sob demanda (HU-02/12), trilha de auditoria e selo público (HU-03), combinação/limpeza de filtros (HU-06), revalidação de carrinho/peça única (HU-08/11), pagamento idempotente (HU-10), isolamento e transições de pedido (HU-13/14) e isolamento/auditoria administrativa (HU-16).
3. Decidir formalmente se HU-18, HU-24 e HU-25 entram no escopo de validação desta versão; alinhar HU-25 (limite 3 implementado versus 5 no aceite).
4. Registrar os 18 testes Python de IA como aprovados após execução fora do sandbox; manter os 7 testes HTTP aprovados como evidência separada.

## Evidências técnicas

- [unit-jest.xml](unit-jest.xml), [unit-pytest.xml](unit-pytest.xml), [api-jest.xml](api-jest.xml), [api-pytest.xml](api-pytest.xml) e relatórios `e2e-*.xml` na pasta `relatorios/`.
- Capturas e vídeos Cypress em `e2e/cypress/screenshots/` e `e2e/cypress/videos/`; os artefatos mais recentes registram as falhas funcionais na rodada com Fake API.
- Código de apoio: `frontend/src/services/`, `frontend/src/app/`, `frontend/tests/`, `e2e/cypress/e2e/` e `modulo-ia/tests/`.

