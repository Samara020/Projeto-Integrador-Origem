# Suíte de testes de API · Origem

Situação: **rascunho para revisão da equipe**, escrito em 25/11/2026 com apoio de IA. O levantamento de cobertura abaixo foi feito por busca nos arquivos de teste, não por leitura caso a caso.

## 1. Sistema testado

O sistema testado é o próprio Origem, não um sistema didático:

- API: `backend/app`, Node.js, Express, Prisma e PostgreSQL 17.
- Módulo de IA de recomendações: `modulo-ia`, Python e BentoML, chamado pela API.
- Versão de referência deste documento: commit `a13f070` da `main`, execução [45611144059](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45611144059).

A suíte tem três partes, todas sem dublê da API:

| Parte | Onde fica | Como testa | Comando |
|---|---|---|---|
| Backend | `backend/app/tests/` | Jest e Supertest contra as rotas reais, com PostgreSQL de banco exclusivo | `npm run test:backend` |
| API vista pelo cliente | `frontend/tests/api/` | Jest fazendo requisições HTTP ao backend real em execução | `npm run test:api` |
| API do módulo de IA | `modulo-ia/tests/test_api.py` | pytest contra o serviço HTTP | `npm run test:api` |

## 2. Endpoints contemplados

O backend declara 75 rotas em `backend/app/src/routes/`. A cobertura por grupo:

| Grupo | Rotas | Situação | Onde |
|---|---:|---|---|
| Autenticação (`/auth/*`) | 5 | Contemplado | `auth.test.ts`, `auth-permissoes.test.ts`, `seguranca-regressao.test.ts`, `api/auth.test.ts` |
| Produtos e validação administrativa | 14 | Contemplado | `produtos.test.ts`, `produtos-posse.test.ts`, `bloqueios-contrato.test.ts`, `api/produtos.test.ts`, `api/contrato.test.ts` |
| Catálogo (`/categorias`, `/tecnicas`, `/regioes`, `/indicadores`) | 4 | Contemplado | `api/catalogo.test.ts` |
| Pedidos | 8 | Contemplado | `pedidos.test.ts`, `api/fluxos-criticos.test.ts` |
| Pagamentos | 1 | Contemplado | `pedidos.test.ts`, `pagamento-auth.unit.test.ts` |
| Painel do artesão e do administrador, envio e recomendações | 9 | Contemplado em parte | `admin-def04.test.ts`, `bloqueios-contrato.test.ts`, `api/admin.test.ts`, `api/recomendacoes*.test.ts` |
| Artesãos e perfil | 8 | Contemplado em parte | `artesaos.test.ts`, `integracao-persistencia.test.ts` |
| Carrinho | 4 | Contemplado em parte | Só dentro dos fluxos: `api/fluxos-criticos.test.ts`, `api/fluxos-integrados.test.ts` |
| Avaliações | 11 | Contemplado em parte | `api/fluxos-integrados.test.ts`, `api/admin.test.ts` |
| Suporte | 5 | Contemplado em parte | `integracao-persistencia.test.ts`, `api/fluxos-integrados.test.ts` |
| Rotas de demonstração (`demo.routes.ts`) | 6 | Fora | Apoio à apresentação, sem história no backlog |

Ficam de fora, com motivo: avaliações, suporte e personalização têm só o caminho principal, porque estão fora das 16 histórias Must Have do Plano de Testes 1.4. Operadora de pagamento e transportadora reais não são chamadas: o ambiente usa simulação.

## 3. Cenários automatizados

Contagem da execução de referência: 200 casos em `backend/app/tests/` e 80 no nível de API, somando `frontend/tests/api/` e o pytest da API de IA. Os 10 testes de contrato de 25/11 se somam a esses.

Cenários por tipo, com exemplos:

| Tipo | Exemplos | Onde |
|---|---|---|
| Caminho feliz | Cadastro e login com JWT real (TC01); checkout cria pedido, itens, histórico e baixa estoque (TC10) | `api/auth.test.ts`, `pedidos.test.ts` |
| Sem autenticação, 401 | Checkout sem token; token expirado (TC15) | `pedidos.test.ts`, `auth-permissoes.test.ts` |
| Perfil errado, 403 | Comprador não cria peça; artesã de outra loja não altera peça alheia | `produtos.test.ts`, `produtos-posse.test.ts` |
| Recurso inexistente, 404 | Pedido de outro usuário responde 404 (TC22); rota inexistente | `pedidos.test.ts` |
| Entrada inválida, 400 | Campos obrigatórios e CEP inválido no checkout; envio sem código de rastreio (TC07) | `pedidos.test.ts` |
| Conflito de estado, 409 | Estoque insuficiente não cria pedido nem altera estoque; pedido de duas lojas não muda de status por um artesão só | `pedidos.test.ts`, `seguranca-regressao.test.ts` |
| Limite de tentativas, 429 | 5 logins inválidos bloqueiam, com `Retry-After` (TC11) | `auth.test.ts`, `api/fluxos-criticos.test.ts` |
| Concorrência | Duas confirmações simultâneas geram um pedido; pagamento repetido com a mesma chave não duplica (TC21) | `integracao-persistencia.test.ts`, `pedidos.test.ts` |
| Valor-limite | Senha com 7 caracteres recusa e com 8 aceita; `limite=51` vira 50 | `api/auth.test.ts`, `api/contrato.test.ts` |
| Contrato | Modelo de produto, lista paginada e formato de erro | `api/contrato.test.ts` |
| Desempenho | 10 medições por operação, média de até 2 s e máximo de 4 s (TC09) | `api/catalogo.test.ts` |

A ligação de cada arquivo com as histórias está em [`.github/rastreabilidade-testes.json`](../../.github/rastreabilidade-testes.json).

### Cobertura mínima por recurso

Marcado "sim" quando a busca encontrou pelo menos uma verificação do código nos arquivos de teste próprios do recurso. Verificação feita dentro de um teste de fluxo de outro recurso não foi contada.

| Recurso | Caminho feliz | 401 | 403 | 404 | 400 | 409 | Nada gravado na recusa | Cabeçalhos |
|---|---|---|---|---|---|---|---|---|
| Autenticação | sim | sim | sim | não se aplica | sim | não | não conferido | sim (`Retry-After`) |
| Produtos | sim | sim | sim | sim | sim | não | sim | sim |
| Pedidos e pagamentos | sim | sim | sim | sim | sim | sim | sim | não |
| Painel administrativo | sim | sim | sim | não | não | não | não se aplica | não |
| Artesãos e perfil | sim | não | não | não | não | não | não | não |
| Carrinho | sim | não | não | não | não | sim | não | não |
| Envio e cotação de frete | sim | não | não | não | não | não | não | não |
| Recomendações | sim | não se aplica | não se aplica | não | não | não se aplica | não se aplica | sim (CORS) |

O backend não tem cache, então "cache invalidado depois da escrita" não se aplica. A senha é verificada como gravada com hash em `auth.test.ts`.

### Lacunas, para o backlog

São itens técnicos, sem caso no Plano de Testes. Não entram na cobertura de riscos dos 24 casos.

| Lacuna | Nível | Situação |
|---|---|---|
| Carrinho: 401 sem token, 404 de item inexistente e 400 de quantidade inválida, em teste próprio | Integração | Pendente |
| Envio e cotação de frete: CEP inválido e rota sem autenticação | Integração | Pendente |
| Artesãos e perfil: 401 sem token, 403 ao editar o perfil de outro artesão, 404 de artesão inexistente e 400 de campo inválido | Integração | Pendente |
| Painel administrativo: 404 e 400 nas rotas de validação | Integração | Pendente |
| Produtos: 409 ao validar uma peça já validada, se a regra existir | Integração | Pendente, depende de conferir a regra |
| Parâmetros de paginação inválidos (`pagina=0`, `pagina=abc`, `limite=0`) | Contrato | Pendente, depende da decisão do item 6 |

## 4. Configuração e execução

Pré-requisitos: Node.js 24, Python 3.13 com `modulo-ia/requirements.txt` e PostgreSQL 17.

```bash
# 1. Dependências
npm ci --prefix frontend && npm ci --prefix backend/app

# 2. Suíte do backend: banco exclusivo, porque os testes apagam as tabelas
#    Criar o banco com database/sql/01_create_tables.sql, 02_integrity_rules.sql e 04_create_indexes.sql
export DATABASE_URL_TEST="postgresql://<usuario>:<senha>@localhost:5432/origem_backend_ci?schema=public"
npm run test:backend

# 3. API vista pelo cliente: precisa do backend e do módulo de IA em execução
#    Backend em :4000 (ou API_BASE_URL apontando para ele) e módulo de IA em :3001
npm run test:api
```

Variáveis usadas, sem segredo: `DATABASE_URL_TEST`, `DATABASE_URL`, `API_BASE_URL`, `ADMIN_INVITE_CODE`, `JWT_SECRET`, `RECOMENDACAO_API_URL`. Os valores da esteira estão em [`.github/workflows/testes.yml`](../../.github/workflows/testes.yml): são de teste e descartáveis.

Rodar só os testes de contrato, com o backend no ar: `npx jest --config jest.api.config.mjs tests/api/contrato.test.ts`, dentro de `frontend/`.

## 5. Evidências da execução

- Execução [45611144059](https://github.com/Samara020/Projeto-Integrador-Origem/actions/runs/45611144059) da `main`: etapas "Testes do backend (banco exclusivo)" e "Testes de API (backend real + Postgres)" aprovadas.
- Os JUnit `backend-jest.xml`, `api-jest.xml` e `api-pytest.xml` ficam no artefato `relatorios-testes`, com os logs do backend e do módulo de IA, por 14 dias.
- Cobertura de código do backend nessa suíte: 79,64% das linhas e 66,74% dos ramos, medida na execução 45610161971.
- Testes de contrato em 25/11, contra o backend local na versão da `main`: 10 de 10 aprovados.

## 6. Análise dos resultados

Sem falha na execução de referência. O que a API fez de diferente do esperado, visto ao escrever os testes de contrato:

1. **Parâmetro de paginação inválido não dá erro.** `pagina=0`, `pagina=abc` e `limite=0` respondem 200 com os valores padrão (`pagina` 1, `limite` 10). O contrato não diz o que fazer. Decisão para a equipe: manter o padrão silencioso ou responder 400.
2. **O contrato não descreve o corpo do erro.** A API usa sempre `{ "mensagem": "..." }`, e o frontend depende disso. Os testes de contrato passaram a fixar esse formato; falta escrevê-lo em `docs/ContratoDeAPI.md`.
3. **E-mail duplicado no cadastro responde 400**, não 409. O contrato reserva 409 para "conflito de estado ou estoque insuficiente". Não é defeito comprovado: é ponto para a equipe confirmar.
4. **Mensagens de erro sem acento em parte das rotas**: "Produto nao encontrado." e "Rota nao encontrada.", enquanto outras vêm acentuadas ("Token de autenticação não informado."). Aparece na tela do usuário.
5. **O painel administrativo não suspende nem reativa cadastro**, que a HU-16 pede. Está na [issue #39](https://github.com/Samara020/Projeto-Integrador-Origem/issues/39).

Limitações da suíte: as lacunas da seção 3, e o fato de pagamento e transporte serem simulados.

## 7. Integrantes e contribuições

Integrantes: Allana Sílvia Gadêlha de Carvalho Souza, Carlos Henrique Gonçalves da Silva, João Pedro do Monte Souza, Lara Thaylanne Ho da Silva, Leandro Manuel Francisco, Nicolas de Castro Albuquerque Natário, Samara Mendonça Nunes e Sergio Gonçalves da Silva Filho.

Dado do histórico do git em 25/11, commits que tocaram `backend/app/tests/`, `frontend/tests/api/` e `modulo-ia/tests/test_api.py`: Nicolasnat 13, Carlos-HenriqueDev 7, Samara 5, devkappiushon 4, larathaylanne 2, MonteSz 1. O número de commits não mede o tamanho da contribuição.

A descrição da contribuição de cada pessoa é da equipe e ainda não foi escrita.

## 8. Uso de IA

O que se sabe com certeza, deste documento e do que entrou em 25/11:

- Os 10 testes de contrato de `frontend/tests/api/contrato.test.ts` foram escritos com apoio de IA, depois de sondar as respostas reais da API, e rodaram contra o backend local.
- Este documento e o levantamento de cobertura foram escritos com apoio de IA.
- Os identificadores `TCnn` acrescentados aos títulos de testes existentes foram propostos com apoio de IA; o conteúdo desses testes não mudou.

Como a equipe usou IA no restante da suíte e como revisou o que foi gerado: a escrever pela equipe. Nenhum integrante revisou ainda o que está descrito acima.
