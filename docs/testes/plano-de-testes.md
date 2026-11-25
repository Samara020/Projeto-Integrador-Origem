# Plano de testes da automação · Origem

Situação: **rascunho para revisão da equipe**, escrito em 24 e 25/11/2026 com apoio de IA sobre a `main` no commit `853a203`. Nenhum integrante revisou este texto ainda. Notas de risco, custo e frequência, responsáveis e tempos manuais são propostas a confirmar.

Este plano complementa o [Plano de Testes 1.4](../Plano%20de%20Testes%201.4.pdf), que continua sendo a fonte dos cenários TS01 a TS20 e dos casos TC01 a TC24. Aqui ficam as decisões da automação: objetivos, níveis, riscos, seleção, backlog e rastreabilidade. Os casos não são copiados; são citados pelo identificador `TCnn`.

Fontes: [Backlog Priorizado 1.1](../Backlog%20Priorizado%201.1%20-%20RPSV.docx.pdf) (HU e critérios de aceite), [Plano de Testes 1.4](../Plano%20de%20Testes%201.4.pdf), [relatório da execução manual de 09/11](../RPSV%20·%20Execução%20de%20Testes%20·%20Embarque%20Digital.pdf), [regras de negócio](../regras-de-negocio.md) e [TAS do Origem](../tas.md).

## 1. Identificação

Projeto Origem, marketplace de artesanato, literatura e arte de Pernambuco. Projeto Integrador, ADS, CESAR School, 2026.2.

Integrantes, conforme o Plano de Testes 1.4: Allana Sílvia Gadêlha de Carvalho Souza, Carlos Henrique Gonçalves da Silva, João Pedro do Monte Souza, Lara Thaylanne Ho da Silva, Leandro Manuel Francisco, Nicolas de Castro Albuquerque Natário, Samara Mendonça Nunes e Sergio Gonçalves da Silva Filho.

**Verificação:** os oito nomes são os da capa e da seção Equipe do Plano de Testes 1.4.

## 2. Objetivos da automação e critérios de investimento

### Objetivos

1. **Impedir que uma regressão no caminho de compra chegue à `main`.** O caminho é login, vitrine, carrinho e checkout com Pix. Na execução manual de 09/11 (commit `bc03f92`), TC01, TC03, TC06 e TC13 reprovaram e a recomendação foi "Não liberar".
2. **Provar a cada mudança as regras de dinheiro e de estoque.** Pedido não duplica, peça única é vendida uma vez e pagamento repetido não gera efeito duplo (RN33 e RN38).
3. **Manter o isolamento entre perfis.** Comprador não abre área de administrador, e artesão não vê nem altera pedido de outra loja.
4. **Dar resposta a cada push em menos de 10 minutos.** A regressão completa levou 5min55s e 6min37s na execução [45456658666](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45456658666).

### Critérios de investimento

Um caso é automatizado quando:

1. roda com frequência alta: a esteira teve 112 execuções em 7 dias, cerca de 480 por mês;
2. protege risco alto: dinheiro, estoque, acesso ou dado de outra pessoa;
3. a funcionalidade está estável: tela ainda em mudança de layout fica manual;
4. o resultado esperado é objetivo: código HTTP, valor, texto ou estado no banco;
5. a conta de retorno da seção 8 dá denominador positivo.

Fica manual o que depende de julgamento: aparência, usabilidade e aceite. Ficar manual não é ficar sem verificação: o caso continua no plano, com resultado esperado, evidência e responsável.

### Casos candidatos

Os primeiros casos escolhidos são os de prioridade mais alta do backlog da seção 9: TC01, TC08 e TC11 (acesso), TC14 (função restrita), TC04 (carrinho) e TC06 (compra). Eles atendem os objetivos 1 e 3 e os critérios 1, 2 e 4.

**Verificação:** são quatro objetivos, cada um ligado a um fato do projeto. Os seis casos candidatos aparecem no topo do backlog e todos já têm teste automatizado.

## 3. Escopo

| Item | Dentro do escopo? | Motivo |
|---|---|---|
| Autenticação, sessão e controle de acesso por perfil (HU-01) | Sim | Habilita todas as funções protegidas. |
| Cadastro e validação de peças (HU-02 e HU-03) | Sim | Fluxo principal do artesão e do administrador. |
| Vitrine, detalhes, busca, filtros e perfil do artesão (HU-04 a HU-07) | Sim | Entrada do comprador. |
| Carrinho, checkout e pagamento (HU-08 a HU-10) | Sim | Caminho de compra, objetivo 1. |
| Peça única e estoque (HU-11 e HU-12) | Sim | Regras de estoque, objetivo 2. |
| Pedidos do comprador e do artesão (HU-13 e HU-14) | Sim | Isolamento entre contas, objetivo 3. |
| Painel do artesão e painel administrativo (HU-15 e HU-16) | Sim | Histórias Must Have. |
| Tempo de resposta das consultas | Sim | Requisito de desempenho do Plano 1.4 (TC09). |
| Módulo de IA de recomendações (HU-17) | Sim, só a automação | O Plano 1.4 deixa fora, mas o repositório tem testes em `modulo-ia/tests/` e `frontend/tests/api/recomendacoes*.test.ts`. Ver divergências, seção 10. |
| Operadora de pagamento real | Não | Terceiro. O ambiente usa pagamento simulado. |
| Transportadora real | Não | Terceiro. Só a cotação pela API do próprio Origem é exercitada. |
| Fronteira com terceiros | Sim | O que o Origem faz quando o terceiro falha: pagamento recusado (RN33) e módulo de IA fora do ar. |
| Avaliações, suporte, personalização e comparação (HU-19 a HU-25) | Não | Fora das 16 histórias Must Have do Plano 1.4. |
| Aplicativo mobile | Não | Não existe no projeto. |
| Testes C++ de `aed/tests/` | Não | Fora do fluxo obrigatório, conforme `docs/tas.md`. |

**Verificação:** as 16 histórias Must Have aparecem como "Sim". Toda linha "Não" tem motivo. A fronteira com terceiros está dentro, embora o comportamento do terceiro esteja fora.

## 4. Níveis de teste

| Nível | O que responde | Dentro do plano? | Justificativa |
|---|---|---|---|
| Componente | A unidade isolada faz o que promete? | Sim | Validações, serviços e regras. Jest em `frontend/tests/unit/`, arquivos `*.unit.test.ts` do backend e pytest do módulo de IA. É o nível mais barato e roda em todo push. |
| Integração de componentes | As partes conversam corretamente? | Sim | Rotas reais do backend com PostgreSQL de banco exclusivo (`backend/app/tests/`, Jest e Supertest) e chamadas HTTP do frontend ao backend real (`frontend/tests/api/`). Aqui se prova o código HTTP e o que foi gravado. |
| Sistema | O sistema inteiro entrega o comportamento? | Sim | Jornadas no navegador com frontend, backend e banco reais (`e2e/cypress/e2e/`, Cypress). Poucos casos, os de maior valor. |
| Integração de sistemas | O produto conversa com outros sistemas? | Em parte | Entra a conversa do backend com o módulo de IA, que é outro serviço do projeto. Pagamento e transporte reais ficam fora: o ambiente só tem simulação, e testar o terceiro não é responsabilidade do Origem. |
| Aceite | O usuário real aceita a entrega? | Não na automação | Depende de julgamento de pessoas. Continua manual, pela execução registrada no relatório de execução da equipe. |

**Verificação:** os cinco níveis aparecem. Os dois que não entram por inteiro têm a razão escrita.

## 5. Riscos da atividade de teste

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Manual: roteiro deixa de ser executado quando o prazo aperta | Alto | Alta | A regressão automatizada roda em todo push e todo PR, sem depender de alguém lembrar. |
| Manual: execução diferente entre pessoas | Médio | Alta | Os 24 casos foram divididos entre 5 pessoas em 09/11. A automação fixa passos, dados e resultado esperado. |
| Manual: resultado sem evidência reconferível | Médio | Média | A esteira guarda XML, logs, prints e vídeos por 14 dias no artefato `relatorios-testes`. |
| Manual: caso aprovado por quem escreveu o código | Médio | Média | O Quality Gate decide o merge pelo resultado da esteira, não pela palavra do autor. |
| Automatizado: teste instável | Alto | Média | Quarentena `@flaky` com issue obrigatória e sem nova tentativa fora dela. A taxa de sucesso da esteira em 7 dias estava em 49,1%: a causa precisa ser separada entre defeito e instabilidade. |
| Automatizado: resultado esperado copiado do próprio sistema | Alto | Média | O esperado vem do critério de aceite, citado literalmente na seção 7. Caso sem critério é marcado como suposição. |
| Automatizado: dublê que não representa o produto implantado | Alto | Alta | Já aconteceu: testes ficaram desatualizados na troca da Fake API pela API real (issues #6, #7 e #8). Mitigação: `frontend/tests/api/` e o E2E usam backend e PostgreSQL reais. Revisão manual confirma o que os dublês dos testes de componente assumem. |
| Automatizado: massa de dados compartilhada entre casos | Médio | Média | O E2E cria usuário e peça próprios a cada caso, em banco descartável (`origem_e2e_ci`). O backend usa banco exclusivo (`origem_backend_ci`). |
| Automatizado: suíte verde que nunca soube ficar vermelha | Alto | Média | Prova do bloqueio com um PR quebrado de propósito (fase 3). A execução [45283640409](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45283640409) já mostrou a esteira reprovando na `main`. |
| Automatizado: ambiente local diferente da esteira | Baixo | Alta | Sem Chrome, 3 casos de aviso flutuante reprovam no Electron (issue #30). A prova válida é a execução da esteira, com Chrome. |

**Verificação:** há riscos dos dois lados. Cada mitigação é um mecanismo que existe no repositório ou uma fase marcada como pendente.

## 6. Casos de teste em rodadas

### Rodada 1 (IA, sem correção)

- Prompt exato: [`ia/prompt-rodada-1.md`](ia/prompt-rodada-1.md). O texto do prompt foi proposto neste rascunho, não escrito pela equipe.
- Saída íntegra: [`ia/saida-rodada-1.md`](ia/saida-rodada-1.md), 80 casos (CT-01 a CT-80) em 9 grupos, sem nenhuma edição.
- Execução: 24/11/2026, por um subagente do Claude Code que não recebeu esta conversa nem leu arquivos do repositório. Junto do prompt ele recebeu só regras de execução: não usar ferramentas e gravar a resposta no arquivo. Não foi possível confirmar se o ambiente lhe passou instruções gerais de estilo.

As três perguntas sobre a saída:

1. **Apontou lacunas ou preencheu com plausibilidade?** As duas coisas, mais a segunda. Abriu com uma seção "Premissas", dizendo que escreveu sem ver o código e listando 5 regras assumidas. Mas não apontou nenhum requisito ambíguo, e preencheu o resto com detalhes que não estavam no pedido: filtro por faixa de preço (CT-29), prazo de validade do Pix (CT-50 e CT-52), assinatura da notificação de pagamento (CT-54), estorno no cancelamento (CT-68) e tela de 360 px (CT-75). O backlog não tem filtro por preço: a HU-06 fala de categoria, técnica e região. Os status assumidos também diferem dos do backlog, que usa "Preparando", "Pronto para envio" e "Enviado" na HU-14.
2. **Distribuiu os casos entre níveis?** Não. Não há coluna de nível. Quase todos são jornadas pela tela; alguns dizem "na tela e na API", sem separar em que nível cada verificação fica.
3. **Indicou técnicas de modelagem?** Não. Nenhuma técnica é nomeada. Há casos que usam valor-limite (CT-29, CT-36) e transição de estados (CT-67) sem dizer.

A saída da rodada 1 é registro bruto. Não é compromisso de execução, e nenhum dos 80 casos entra no backlog por ela.

### Rodada 2 (IA com insumos)

- Prompt exato: [`ia/prompt-rodada-2.md`](ia/prompt-rodada-2.md), com os quatro insumos: critérios de aceite das HU-01 a HU-16 na íntegra, formato exato do caso, escopo e níveis.
- Saída íntegra: [`ia/saida-rodada-2.md`](ia/saida-rodada-2.md), 123 casos (R2-CT-01 a R2-CT-123) e 60 lacunas (L-01 a L-60), sem nenhuma edição.
- Execução: 25/11/2026, por um subagente do Claude Code que leu só o arquivo do prompt. Uma primeira tentativa, em 24/11, foi interrompida sem gravar saída.

O que a saída traz, medido no arquivo:

| Medida | Rodada 1 | Rodada 2 |
|---|---:|---:|
| Casos | 80 | 123 |
| Casos ligados a história e critério de aceite | 0 | 123 |
| Casos com nível | 0 | 123 (94 de integração de componentes, 17 de sistema, 12 de componente) |
| Casos com técnica nomeada | 0 | 123 (46 de tabela de decisão, 45 de partição de equivalência, 19 de transição de estados, 13 de valor-limite) |
| Lacunas apontadas | 0 (5 premissas) | 60 |

**O que mudou entre as rodadas.** Com os critérios de aceite na íntegra e a ordem de não inventar, a IA parou de preencher com detalhes plausíveis: onde o requisito não fixa valor, usou um símbolo e apontou a lacuna. Com o formato e os níveis informados, cada caso passou a citar a história, o critério e o trecho do "Então", e a maioria desceu da tela para a API, que é o nível mais barato capaz de provar a regra. O ganho principal não foi o número de casos: foram as 60 lacunas, que mostram onde o backlog não diz o que o sistema deve fazer.

**O que as lacunas mostram.** Em várias delas o produto já tomou a decisão que o requisito não escreveu. Três exemplos conferidos nos títulos dos testes existentes:

| Lacuna | O que o requisito não diz | O que o produto faz |
|---|---|---|
| L-09 | Valor do limite de tentativas de login e se um login válido zera a contagem | 5 tentativas, resposta 429, e o login bem-sucedido antes do limite zera o contador (`backend/app/tests/auth.test.ts`) |
| L-13 | Regras de validação de cada campo da peça | Descrição com 19 caracteres é recusada: o mínimo é 20 (`e2e/cypress/e2e/cadastro-peca.cy.js`) |
| L-14 | Se a peça cadastrada é publicada na hora | Peça pendente não é pública (`backend/app/tests/produtos.test.ts`) |

Conferir as 60 lacunas contra o produto e levar as que continuam abertas aos donos dos requisitos é tarefa da equipe. Os casos da rodada 2 não entram no backlog automaticamente: a comparação entre eles e os testes existentes é trabalho da fase 2.

### Matriz de alocação

Feita antes de gerar casos: cada condição de teste vai para o nível mais barato que consegue prová-la.

| Condição de teste | Nível responsável | Justificativa |
|---|---|---|
| Formato de e-mail, tamanho de senha, campos obrigatórios | Componente | Função pura de validação, sem rede. |
| Destino depois do login, por perfil | Componente | Decisão isolada em uma função. |
| Código HTTP de cada rota: 400, 401, 403, 404, 409, 429 | Integração de componentes | Precisa da rota real e do banco. |
| Nada gravado quando a operação é recusada | Integração de componentes | Exige consultar o banco depois da recusa. |
| Concorrência: duas compras da mesma peça única, evento de pagamento repetido | Integração de componentes | Exige requisições simultâneas contra o banco real. |
| Bloqueio depois de 5 tentativas inválidas de login | Integração de componentes | Regra do servidor, com contador persistido. |
| Jornada de compra do começo ao fim | Sistema | Só o navegador prova que as telas se ligam. |
| Guarda de rota no navegador por perfil | Sistema | Depende do redirecionamento real. |
| Tempo de resposta das consultas | Integração de componentes e Sistema | Medido na API e na tela, 10 medições por operação. |
| Recomendação quando o módulo de IA responde ou está fora | Integração de sistemas | Envolve dois serviços. |
| Aparência, legibilidade e conforto de uso | Aceite (manual) | Julgamento humano. |

### Tabela de derivação

| Regra de negócio | Técnica | Partições ou valores | Casos |
|---|---|---|---|
| Login aceita credencial válida e nega inválida | Partição de equivalência | válida; e-mail inexistente; senha errada | TC01, TC11 |
| Bloqueio temporário ao atingir o limite de tentativas | Valor-limite | abaixo do limite; no limite (5); depois da expiração | TC11 |
| Senha com tamanho mínimo | Valor-limite | 7 caracteres recusa; 8 aceita | TC01 |
| Cadastro de peça exige campos obrigatórios | Partição de equivalência | todos preenchidos; um ou mais vazios | TC02, TC12 |
| Descrição da peça com tamanho mínimo | Valor-limite | 19 caracteres recusa; 20 aceita | TC12 |
| Compra respeita o estoque | Valor-limite | quantidade dentro do estoque; acima; estoque zero | TC05, TC20 |
| Checkout só cria pedido com dados e disponibilidade válidos | Tabela de decisão | endereço válido ou não; estoque suficiente ou não; pagamento aprovado ou recusado | TC06, TC13, TC21 |
| Pagamento repetido não gera efeito duplo | Tabela de decisão | primeira confirmação; mesma chave repetida; repetição simultânea | TC13, TC21 |
| Status do pedido só avança por transição permitida | Transição de estados | avanço válido; envio sem código de rastreio; pedido cancelado | TC07, TC22 |
| Selo de autenticidade só depois de aprovação | Transição de estados | pendente; aprovada; reprovada | TC03, TC17 |
| Acesso conforme o perfil | Tabela de decisão | visitante, comprador, artesão, administrador contra cada área | TC08, TC14 |
| Tempo de resposta | Valor-limite | média até 2 s; máximo até 4 s | TC09 |

Os valores 5, 7 e 8, 19 e 20 e os limites de 2 s e 4 s foram lidos nos títulos dos testes existentes e no Plano 1.4. A conferência contra o código do sistema fica para a fase 2.

**Verificação:** as quatro técnicas pedidas aparecem. As duas rodadas têm prompt e saída íntegra versionados, e as contagens acima foram medidas nos arquivos de saída.

## 7. Matriz de rastreabilidade

O trecho é o "Então" do critério de aceite, copiado do Backlog Priorizado 1.1. "S" indica suposição: o caso não tem critério de aceite de história por trás.

| ID | HU | Critério | Trecho literal | Suposição |
|---|---|---|---|---|
| TC01 | HU-01 | Login válido | "o sistema deve autenticá-lo, criar uma sessão segura e direcioná-lo à área correspondente ao seu perfil" | N |
| TC02 | HU-02 | Cadastro completo | "o sistema deve validar os dados, associar a peça ao artesão e registrar o produto para publicação no catálogo" | N |
| TC03 | HU-04 | Catálogo disponível | "o sistema deve apresentar as peças com imagem, nome, preço, artesão e indicação de disponibilidade" | N |
| TC04 | HU-08 | Adicionar item | "o sistema deve incluir o item, quantidade permitida, preço vigente e subtotal" | N |
| TC05 | HU-12 | Estoque insuficiente | "o sistema deve impedir a operação que exceda a disponibilidade e informar que a quantidade solicitada não pode ser atendida" | N |
| TC06 | HU-09 | Criar pedido | "o sistema deve criar um pedido com identificador, itens, valores, endereço, status Aguardando pagamento e registro de data" | N |
| TC07 | HU-14 | Atualização válida | "o sistema deve validar a transição, registrar data e responsável e disponibilizar a atualização ao comprador" | N |
| TC08 | HU-01 | Autorização por role | "o sistema deve bloquear a operação e retornar uma resposta de acesso não autorizado" | N |
| TC09 | Plano 1.4 | Requisito de desempenho | "Tempo médio de resposta de até 2 segundos e nenhuma execução acima de 4 segundos" | S |
| TC10 | HU-09 | Imutabilidade do histórico | "o pedido deve preservar um retrato dos dados relevantes no momento da compra" | N |
| TC11 | HU-01 | Credenciais inválidas | "o sistema deve negar o acesso, exibir mensagem sem revelar dados sensíveis e registrar a tentativa conforme a política de segurança" | N |
| TC12 | HU-02 | Dados obrigatórios ausentes | "o sistema deve impedir o cadastro e indicar os campos que precisam ser corrigidos" | N |
| TC13 | HU-10 | Idempotência | "o pagamento e o estoque devem ser atualizados uma única vez" | N |
| TC14 | HU-01 | Acesso direto a recurso restrito | "o sistema deve negar a operação e preservar a integridade dos dados" | N |
| TC15 | HU-01 | Expiração da sessão | "o sistema deve impedir o acesso à funcionalidade protegida e solicitar nova autenticação" | N |
| TC16 | HU-02 | Produção sob demanda | "o sistema deve registrar essas informações sem tratá-las como estoque previamente disponível" | N |
| TC17 | HU-03 | Aprovação | "o sistema deve registrar responsável, data e justificativa, alterar o status para Aprovada e habilitar o selo de origem/autenticidade" | N |
| TC18 | HU-07 | Perfil ativo | "o sistema deve apresentar informações da loja e do artesão, história, técnicas, região e produtos associados" | N |
| TC19 | HU-08 | Alterar carrinho | "o sistema deve atualizar os totais e preservar os demais itens" | N |
| TC20 | HU-11 | Compra concorrente | "somente a primeira reserva válida deve prosseguir e o segundo comprador deve receber aviso de indisponibilidade" | N |
| TC21 | HU-10 | Pagamento recusado | "o pedido deve permanecer não pago, o comprador deve ser informado e nenhuma venda deve ser confirmada" | N |
| TC22 | HU-13 | Lista de pedidos | "o sistema deve listar apenas seus pedidos com número, data, valor e status atual" | N |
| TC23 | HU-15 | Escopo | "o sistema deve incluir somente informações de sua própria loja e produtos" | N |
| TC24 | HU-16 | Ação auditável | "o sistema deve exigir justificativa quando aplicável e registrar responsável, data e resultado" | N |

A matriz mostra o critério principal de cada caso. A lista completa de histórias por caso está na seção 7 do Plano 1.4.

### Vocabulário: backlog e produto

| No backlog | No produto e nos testes |
|---|---|
| "Aguardando pagamento", "Pago" | Estados em maiúsculas no código, como `PAGO`, `ENVIADO` e `CANCELADO` |
| "Produção sob demanda" | `SOB_ENCOMENDA` |
| "role" | papel: `COMPRADOR`, `ARTESAO`, `ADMINISTRADOR` |
| "resposta de acesso não autorizado" | código HTTP 401 sem sessão e 403 com perfil errado |
| "limite máximo de tentativas inválidas" | 5 tentativas, resposta 429 com `Retry-After` |

**Verificação:** os 24 casos têm história, critério e trecho literal. Só TC09 é suposição, porque vem do Plano 1.4 e não de uma história.

## 8. Seleção para automação por retorno do investimento

```text
execuções até o retorno = Ti ÷ (Tm − Ta − Mn/F)
```

`Tm` é o tempo de uma execução manual, `Ti` o investimento para implementar, `Ta` o tempo da execução automatizada, `Mn` a manutenção mensal e `F` a frequência mensal.

Medido: `F` de cerca de 480 execuções por mês (112 em 7 dias) e `Ta` do E2E, 42 casos em 1min04s na execução 45456658666.

**Não medido:** `Tm`, `Ti` e `Mn`. A execução manual de 09/11 não registrou tempo por caso. Os valores abaixo são **estimativas para mostrar a conta**, e precisam ser trocados por tempos cronometrados pela equipe.

| Caso | Tm (min) | Ti (min) | Ta (min) | Mn (min/mês) | F (por mês) | Denominador | Execuções até o retorno | Decisão |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| TC06, compra com Pix | 4 | 120 | 0,2 | 30 | 480 | 3,74 | 33 | Automatizar |
| TC09, tempo de resposta com 10 medições | 20 | 180 | 0,5 | 30 | 480 | 19,44 | 10 | Automatizar |
| Conferência visual da vitrine em telas reais (HU-04, Navegação) | 10 | 240 | 2 | 120 | 2 | −52 | não retorna | Manter manual |

No terceiro caso o denominador é negativo: manter capturas de tela atualizadas custa mais do que a conferência manual economiza em 2 execuções por mês. O caso continua no plano como verificação manual, com print e responsável.

**Verificação:** a conta foi feita com a fórmula do guia. O que é medido e o que é estimado estão separados.

## 9. Backlog de automação priorizado

```text
prioridade = (Risco × Frequência) ÷ Custo     (escalas de 1 a 3)
```

Empate se desfaz pelo risco; persistindo, o caso pendente vem antes. As notas de risco, custo e frequência são proposta deste rascunho. O responsável é da equipe.

"Automatizado" exige o identificador `TCnn` no **título** de um teste que roda na esteira. Citação em comentário não conta.

| Ordem | ID do caso | HU | Nível | Risco | Custo | Frequência | Prioridade | Responsável | Status |
|---:|---|---|---|---:|---:|---:|---:|---|---|
| 1 | TC01 | HU-01 | Sistema, API e Componente | 3 | 1 | 3 | 9,0 | a definir | Automatizado (e2e/cypress/e2e/acesso.cy.js, frontend/tests/api/auth.test.ts, frontend/tests/unit/destino.test.ts: TC01) |
| 2 | TC08 | HU-01, HU-14 e HU-16 | Sistema, API e Componente | 3 | 1 | 3 | 9,0 | a definir | Automatizado (e2e/cypress/e2e/acesso.cy.js, frontend/tests/api/auth.test.ts, frontend/tests/unit/guarda-papel.test.tsx: TC08) |
| 3 | TC11 | HU-01 | Sistema, API e Integração | 3 | 1 | 3 | 9,0 | a definir | Automatizado (e2e/cypress/e2e/acesso.cy.js, frontend/tests/api/auth.test.ts, backend/app/tests/auth.test.ts: TC11) |
| 4 | TC14 | HU-01 e HU-16 | Sistema | 3 | 1 | 2 | 6,0 | a definir | Automatizado (e2e/cypress/e2e/acesso.cy.js: TC14) |
| 5 | TC04 | HU-08 | Componente | 2 | 1 | 3 | 6,0 | a definir | Automatizado (frontend/tests/unit/carrinho.test.ts: TC04) |
| 6 | TC06 | HU-09 a HU-11 | Sistema e Componente | 3 | 2 | 3 | 4,5 | a definir | Automatizado (e2e/cypress/e2e/compra.cy.js, frontend/tests/unit/validacao.test.ts: TC06) |
| 7 | TC07 | HU-13 e HU-14 | Integração | 2 | 1 | 2 | 4,0 | a definir | Pendente (o título com TC07 em frontend/tests/unit/pedidos.test.ts trata de pagamentosService; os testes de status em backend/app/tests/pedidos.test.ts não citam o identificador) |
| 8 | TC12 | HU-02 | Sistema e Componente | 2 | 1 | 2 | 4,0 | a definir | Automatizado (e2e/cypress/e2e/cadastro-peca.cy.js, frontend/tests/unit/painel-artesao.test.ts: TC12) |
| 9 | TC10 | HU-09, HU-12 e HU-13 | Sistema | 3 | 2 | 2 | 3,0 | a definir | Pendente (TC10 só aparece em comentário de e2e/cypress/e2e/compra.cy.js, não em título) |
| 10 | TC15 | HU-01 | Integração e Componente | 3 | 1 | 1 | 3,0 | a definir | Pendente (sem TC15 em título; cobertura encontrada em backend/app/tests/seguranca-regressao.test.ts, backend/app/tests/integracao-persistencia.test.ts e frontend/tests/unit/estados-e-sessao.test.tsx) |
| 11 | TC22 | HU-13 e HU-14 | Integração e Componente | 3 | 2 | 2 | 3,0 | a definir | Pendente (o título com TC22 em frontend/tests/unit/historico-compras.test.tsx cobre só o rótulo do pedido; isolamento por comprador sem identificador) |
| 12 | TC05 | HU-11 e HU-12 | Sistema e API | 3 | 2 | 2 | 3,0 | a definir | Automatizado (e2e/cypress/e2e/vitrine.cy.js, e2e/cypress/e2e/compra.cy.js, frontend/tests/api/produtos.test.ts: TC05) |
| 13 | TC13 | HU-09 | Sistema | 3 | 2 | 2 | 3,0 | a definir | Automatizado (e2e/cypress/e2e/compra.cy.js: TC13) |
| 14 | TC03 | HU-03 a HU-06 | Sistema e API | 2 | 2 | 3 | 3,0 | a definir | Automatizado (e2e/cypress/e2e/vitrine.cy.js, frontend/tests/api/produtos.test.ts: TC03) |
| 15 | TC18 | HU-04 a HU-07 | Sistema | 2 | 2 | 3 | 3,0 | a definir | Automatizado (e2e/cypress/e2e/vitrine.cy.js: TC18) |
| 16 | TC19 | HU-08 | Sistema | 2 | 2 | 3 | 3,0 | a definir | Automatizado (e2e/cypress/e2e/compra.cy.js: TC19) |
| 17 | TC21 | HU-09, HU-10 e HU-12 | Integração | 3 | 3 | 2 | 2,0 | a definir | Pendente (sem TC21 em título; cobertura encontrada em backend/app/tests/pedidos.test.ts e backend/app/tests/pagamento-auth.unit.test.ts, com RN33 e RN38) |
| 18 | TC20 | HU-11 e HU-12 | Sistema | 3 | 3 | 2 | 2,0 | a definir | Automatizado (e2e/cypress/e2e/compra.cy.js: TC20) |
| 19 | TC16 | HU-02 e HU-12 | API e Sistema | 2 | 2 | 2 | 2,0 | a definir | Pendente (sem TC16 em título; cobertura encontrada em frontend/tests/api/fluxos-criticos.test.ts e frontend/tests/unit/services-integracao.test.ts) |
| 20 | TC02 | HU-02 | Sistema e Componente | 2 | 2 | 2 | 2,0 | a definir | Automatizado (e2e/cypress/e2e/cadastro-peca.cy.js, frontend/tests/unit/painel-artesao.test.ts: TC02) |
| 21 | TC24 | HU-16 | Integração e API | 3 | 2 | 1 | 1,5 | a definir | Pendente (sem TC24 em título; cobertura parcial encontrada em backend/app/tests/admin-def04.test.ts e frontend/tests/api/admin.test.ts) |
| 22 | TC17 | HU-03 | Integração e Sistema | 2 | 2 | 1 | 1,0 | a definir | Automatizado (backend/app/tests/bloqueios-contrato.test.ts, e2e/cypress/e2e/acesso.cy.js: TC17) |
| 23 | TC23 | HU-15 | Integração | 2 | 2 | 1 | 1,0 | a definir | Automatizado (backend/app/tests/bloqueios-contrato.test.ts: TC23) |
| 24 | TC09 | Desempenho | Sistema e API | 2 | 3 | 1 | 0,67 | a definir | Automatizado (e2e/cypress/e2e/desempenho.cy.js, frontend/tests/api/catalogo.test.ts: TC09) |

Cobertura de riscos em 24/11: **17 de 24 casos automatizados (70,8%)**. Os 7 pendentes são TC07, TC10, TC15, TC16, TC21, TC22 e TC24. Em 5 deles (TC07, TC10, TC15, TC16 e TC21) a busca encontrou teste do mesmo comportamento sem o identificador no título. Em TC22 e TC24 a cobertura encontrada é parcial.

**Verificação:** o primeiro item (TC01) tem risco alto, custo baixo e frequência alta. Todo caso tem nível, história e status no formato que o relatório de métricas vai ler. Os arquivos citados foram conferidos por busca nos títulos dos testes em 24/11.

## 10. Divergências entre o Plano 1.4 e o repositório

| Item | O que o Plano 1.4 diz | O que existe | Decisão proposta |
|---|---|---|---|
| Ferramentas | Jest, Postman e Playwright | Jest, Jest com Supertest, pytest e Cypress | Atualizar o Plano na próxima versão. |
| Recomendações | Fora do escopo | Testes em `modulo-ia/tests/` e `frontend/tests/api/recomendacoes*.test.ts` | Manter os testes e registrar no escopo da automação. |
| Logística | Integração externa fora do escopo | O E2E de compra exercita a cotação de frete do próprio Origem | Manter. A transportadora real continua fora. |
| TC07 | Atualização do status do pedido | O título com TC07 trata de pagamentosService | Corrigir o identificador na fase 2. |
| TC10, TC15, TC16, TC21, TC24 | Casos do plano | Comportamento coberto sem o identificador no título | Acrescentar o identificador na fase 2. |
| TC22 | Consulta, isolamento e status | Título com TC22 cobre só o rótulo do pedido | Completar na fase 2. |

**Verificação:** cada divergência tem decisão proposta. Nenhuma foi aplicada neste rascunho.

## 11. Limitações conhecidas

1. O prompt da rodada 1 foi proposto neste rascunho, não escrito pela equipe. As 60 lacunas da rodada 2 não foram conferidas uma a uma contra o produto, e os 123 casos não foram comparados com os testes existentes.
2. `Tm`, `Ti` e `Mn` da conta de retorno são estimativas, não medições.
3. Notas de risco, custo e frequência e os responsáveis do backlog não foram confirmados pela equipe.
4. O critério "Automatizado" olha o identificador no título. Ele não mede se o teste cobre todos os passos do caso do Plano 1.4.
5. Aceite, aparência e usabilidade ficam manuais.
6. Pagamento e transporte reais não são testados; só a simulação e a fronteira.
7. Não há medição de cobertura de código (fase 3).
8. Na máquina de desenvolvimento usada neste levantamento não há Chrome nem o ambiente Python do módulo de IA. O E2E e o pytest só são prova quando rodam na esteira.
9. Os testes C++ de `aed/tests/` estão fora do fluxo.

**Verificação:** cada item sem teste ou sem medição tem o motivo ao lado.
