# Módulo de Recomendação de Produtos — Origem

Mockup executável do módulo de recomendação de produtos do marketplace Origem, desenvolvido para demonstrar uma estratégia de recomendação baseada em conteúdo.

O módulo utiliza atributos dos produtos para calcular uma pontuação de relacionamento, ordenar candidatos e retornar recomendações justificadas. A implementação utiliza um catálogo sintético, permitindo executar e testar a lógica sem depender de banco de dados ou de dados reais.

## 1. Tecnologias

- Python 3.13+
- BentoML 1.4.39
- Pydantic
- pytest 9.1.1
- requests 2.34.2

## 2. Estrutura do módulo

```text
modulo-ia/
├── app/
│   ├── config.py
│   ├── catalog.py
│   ├── fallback.py
│   ├── recommendation.py
│   └── service.py
├── data/
│   ├── catalogo.json
│   └── catalogo_origem.json
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   ├── test_performance.py
│   ├── test_recommendation.py
│   └── test_service.py
├── requirements.txt
└── README.md
```

## 3. Instalação

Os comandos abaixo devem ser executados na raiz do repositório Origem.

### Windows — PowerShell

Crie o ambiente virtual, caso ainda não exista:

```powershell
python -m venv modulo-ia\.venv
```

Instale as dependências:

```powershell
.\modulo-ia\.venv\Scripts\python.exe -m pip install -r .\modulo-ia\requirements.txt
```

### Linux

```bash
python3 -m venv modulo-ia/.venv
modulo-ia/.venv/bin/python -m pip install -r modulo-ia/requirements.txt
```

## 4. Configuração

O módulo utiliza a variável `PYTHONPATH` para localizar o pacote `app`.

### Windows — PowerShell

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
```

### Linux

```bash
export PYTHONPATH="$PWD/modulo-ia"
```

A chave utilizada pelo mockup é `origem-mockup-key`. Ela deve ser enviada no cabeçalho `X-API-Key` nas requisições autenticadas.

Essa chave é destinada exclusivamente ao ambiente de demonstração.

## 5. Execução do serviço

Execute os comandos na raiz do repositório.

### Windows — PowerShell

Configure o caminho do pacote:

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
```

Inicie o serviço BentoML na porta 3001:

```powershell
.\modulo-ia\.venv\Scripts\bentoml.exe serve app.service:RecommendationService --port 3001
```

### Linux

```bash
export PYTHONPATH="$PWD/modulo-ia"
modulo-ia/.venv/bin/bentoml serve app.service:RecommendationService --port 3001
```

O serviço ficará disponível em:

`http://localhost:3001`

Mantenha esse terminal aberto enquanto executa os testes HTTP.

## 6. Endpoint de recomendação

**Método:** `POST`

**Caminho:** `/recommendations`

**URL completa:** `http://localhost:3001/recommendations`

### Autenticação

As requisições autenticadas devem incluir o cabeçalho:

```text
X-API-Key: origem-mockup-key
```

### Exemplo de requisição por produto

```json
{
  "product_id": "prd_201",
  "limit": 5
}
```

O produto `prd_201` corresponde ao Vaso Cerâmica Raízes.

### Exemplo de requisição por filtros

```json
{
  "category": "Arte e Decoração",
  "technique": "Cerâmica",
  "region": "Zona da Mata",
  "limit": 5
}
```

Os filtros utilizam os nomes presentes no catálogo escolhido. O campo `product_id` permite informar um produto de referência; os filtros de categoria, técnica e região permitem definir o contexto da recomendação.

Categoria é opcional. No catálogo padrão do site, também é possível enviar somente `{"technique": "Cerâmica"}` ou `{"region": "Agreste"}`.

O campo `limit` tem valor padrão 5 e aceita valores entre 1 e 20.

### Exemplo de resposta

```json
{
  "recommendations": [
    {
      "product_id": "prd_213",
      "score": 1.0,
      "reason": "Recomendado por mesma categoria, mesma técnica artesanal, mesma região."
    },
    {
      "product_id": "prd_202",
      "score": 0.8,
      "reason": "Recomendado por mesma categoria, mesma técnica artesanal."
    }
  ]
}
```

Os valores apresentados são ilustrativos de uma resposta para o contexto de referência `prd_201`. A quantidade e a ordenação efetivas dependem dos candidatos disponíveis no catálogo.

Cada recomendação contém o identificador do produto, a pontuação calculada e uma justificativa baseada nos atributos correspondentes.

## 7. Estratégia de recomendação

A implementação compara três atributos:

| Atributo | Peso |
|---|---:|
| Categoria | 50% |
| Técnica artesanal | 30% |
| Região | 20% |

A pontuação é calculada sobre os atributos disponíveis no contexto, conforme os pesos definidos na configuração.

Os candidatos são ordenados pela pontuação em ordem decrescente. Em caso de empate, a implementação utiliza o identificador do produto como critério adicional de ordenação.

### Fluxo de processamento

1. Receber o produto de referência ou os filtros.
2. Selecionar candidatos compatíveis com o contexto.
3. Excluir produtos indisponíveis.
4. Excluir o produto de referência, quando informado.
5. Comparar categoria, técnica e região.
6. Calcular a pontuação de relacionamento.
7. Ordenar os candidatos.
8. Gerar justificativas para as recomendações.
9. Retornar a quantidade solicitada, respeitando o limite máximo.

## 8. Fallback

Quando os critérios iniciais não encontram candidatos suficientes, o módulo reduz progressivamente os critérios de seleção:

1. Categoria, técnica e região.
2. Categoria e técnica.
3. Categoria e região.
4. Categoria.
5. Lista vazia, quando não houver candidatos elegíveis.

O produto de referência e os produtos indisponíveis permanecem excluídos em todas as etapas.

Sem categoria, a seleção começa por técnica + região, depois apenas técnica e,
por último, apenas região. Etapas que exigem um filtro ausente são ignoradas.
Assim, uma consulta apenas por técnica ou apenas por região considera as peças
disponíveis com esse atributo. Com os dois filtros, as peças que combinam ambos
vêm primeiro, seguidas pelas da mesma técnica e, por último, pelas da mesma região,
sem repetir peças. Se nenhuma etapa encontrar candidatos, a lista fica vazia;
produtos sem relação com os filtros não são acrescentados. Quando uma categoria
é informada, ela continua obrigatória em todas as etapas da seleção.

## 9. Justificativas

Cada recomendação possui uma justificativa baseada nos atributos efetivamente correspondentes ao contexto.

Exemplos:

- Mesma categoria, mesma técnica artesanal e mesma região.
- Mesma categoria e mesma técnica artesanal.
- Mesma categoria.

O objetivo é permitir que o usuário compreenda os motivos da recomendação, em vez de receber somente uma lista de produtos.

## 10. Códigos HTTP

| Código | Situação |
|---|---|
| 200 | Recomendação processada com sucesso |
| 400 | Requisição ou limite inválido |
| 401 | Autenticação ausente |
| 403 | Credencial inválida ou sem autorização |
| 404 | Produto de referência inexistente |
| 500 | Erro interno |
| 503 | Serviço indisponível |

Os cenários de erro interno e indisponibilidade podem ser simulados por meio das variáveis de ambiente previstas na implementação.

## 11. Testes automatizados

O módulo contém testes para a lógica de recomendação, a camada de serviço, as requisições HTTP e o desempenho.

Os testes de lógica usam o catálogo sintético (`data/catalogo.json`), configurado
automaticamente em `tests/conftest.py`. O `test_api.py` fala com o servidor em
`http://localhost:3001` (mude com a variável `IA_BASE_URL`) e usa os IDs do site.

### Executar todos os testes

Com o serviço BentoML em execução na porta 3001, abra outro terminal na raiz do repositório.

#### Windows — PowerShell

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
.\modulo-ia\.venv\Scripts\python.exe -m pytest .\modulo-ia\tests -v
```

#### Linux

```bash
export PYTHONPATH="$PWD/modulo-ia"
modulo-ia/.venv/bin/python -m pytest modulo-ia/tests -v
```

### Executar somente os testes da API

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
.\modulo-ia\.venv\Scripts\python.exe -m pytest .\modulo-ia\tests\test_api.py -v
```

Os testes HTTP validam:

- Requisição de recomendação válida.
- Exclusão do produto de referência.
- Exclusão de peças reservadas e vendidas.
- Filtros apenas por técnica ou apenas por região, com a justificativa correspondente.
- Ordenação das recomendações.
- Ausência de autenticação.
- Chave de autenticação inválida.
- Limite de recomendações inválido.
- Produto de referência inexistente.

Os testes unitários também verificam o cálculo de pontuação, a ordenação, a disponibilidade dos produtos, o fallback, combinações de filtros sem categoria e a ausência de candidatos.

Os testes de serviço e desempenho verificam os cenários implementados nos respectivos arquivos de teste.

### Resultados dos testes

Na validação das correções dos filtros e da disponibilidade, a suíte completa apresentou os seguintes resultados:

- 33 testes aprovados;
- 0 testes com falha.

A execução incluiu testes HTTP, desempenho, lógica de recomendação e configuração do serviço.

Foram registrados 27 avisos de descontinuação em dependências, sem impedir a aprovação dos testes.

## 12. Teste de desempenho

### Resultado do teste de desempenho

Teste executado em 12/10/2026.

| Indicador | Resultado |
|---|---:|
| Catálogo avaliado | 10.000 produtos |
| Execuções | 20 |
| P95 medido | 0,0315 s |
| Limite de referência do RNF-09 | 2 s |
| Resultado | PASS |

O teste validou o desempenho da lógica de recomendação com um catálogo de 10.000 produtos. O P95 medido foi de 0,0315 segundo, abaixo do limite de referência de 2 segundos.

Esse resultado corresponde ao processamento avaliado pelo teste e não representa necessariamente o tempo total de uma requisição HTTP.

## 13. Relação com os requisitos do AV1

| Requisito | Implementação |
|---|---|
| RF-01 | `RecommendationRequest` recebe produto ou filtros |
| RF-02 | `select_candidates()` seleciona candidatos |
| RF-03 | `available_products()` mantém somente produtos disponíveis |
| RF-04 | Exclui o produto de referência |
| RF-05 | Compara categoria, técnica e região |
| RF-06 | `calculate_score()` calcula o relacionamento |
| RF-07 | `rank_candidates()` ordena os resultados |
| RF-08 | Limite padrão 5 e máximo 20 |
| RF-09 | `build_reason()` gera justificativas |
| RF-10 | `FALLBACK_STAGES` define as etapas de fallback |
| RF-11 | Retorna lista vazia quando não há candidatos elegíveis |
| RF-12 | Endpoint HTTP `/recommendations` |
| RNF-01 | Serviço configurado com timeout de 2 segundos |
| RNF-02 | Validação por Pydantic e regras do serviço |
| RNF-03 | Autenticação e autorização por `X-API-Key` |
| RNF-04 | Catálogo utiliza somente os atributos necessários |
| RNF-05 | Registro de métricas sem dados pessoais |
| RNF-06 | Justificativa baseada nos atributos correspondentes |
| RNF-07 | Cenário de indisponibilidade simulado com resposta 503 |
| RNF-08 | Implementação baseada em Python e BentoML |
| RNF-09 | Teste de desempenho com 10.000 produtos e verificação do P95 |

## 14. Integração com a aplicação Origem

No fluxo integrado (AV2), o **frontend** consulta o **backend principal**, que orquestra a chamada ao módulo de IA utilizando os dados reais e atualizados do catálogo no PostgreSQL:

```text
Frontend (:3000) ─► GET /produtos/recomendacoes ─► Backend Node (:4000) ─► POST /recommendations ─► Módulo de IA (:3001)
```

### Variáveis de ambiente (Backend)

Configure `backend/app/.env` (ou use `docker compose up --build`, que já configura os serviços integrados):

```dotenv
RECOMENDACAO_API_URL=http://localhost:3001
RECOMENDACAO_API_KEY=origem-mockup-key
RECOMENDACAO_TIMEOUT_MS=2000
```

### Fluxo ponta a ponta

1. O frontend chama `produtosService.recomendados()` (`GET /produtos/recomendacoes`), enviando `produtoId` (na página `/produto/[id]` e no histórico de `/recomendacoes`) ou filtros (`categoria`, `tecnica`, `regiao`, `limite`).
2. O backend (`backend/app/src/services/produto.service.ts`) busca o catálogo ativo no PostgreSQL (`produtoRepository.catalogoParaRecomendacao()`), monta a lista enxuta `catalog` (`product_id`, `name`, `category`, `technique`, `region`, `available`) e envia `POST /recommendations` ao `modulo-ia` com `X-API-Key` e timeout de `2 s`.
3. O módulo de IA calcula o score (categoria 50%, técnica 30%, região 20%), aplica o fallback progressivo, exclui indisponíveis e o item de referência, e retorna `{ recommendations: [{ product_id, score, reason }] }`.
4. O backend valida que cada ID retornado pertence ao catálogo real e está disponível (`estoque > 0`), hidrata os objetos `ProdutoResumo` anexando `motivo` (`reason`) e `score`, e devolve o cabeçalho `X-Recomendacao-Fonte: ia`.
5. Se o módulo de IA não estiver configurado, ficar indisponível, responder erro ou exceder `2 s`, o backend executa o baseline local com as mesmas regras e retorna `200 OK` com `X-Recomendacao-Fonte: baseline` (itens sem `motivo`).
6. Na interface:
   - `/produto/[id]` (`Recomendados.tsx`): exibe skeleton no carregamento, cards com `motivo` e link para `/produto/[id]`, oculta a seção se a lista vier vazia (RF-11) e exibe botão *"Tentar de novo"* se o backend falhar.
   - `/recomendacoes` (`Recomendacoes.tsx`): recomenda a partir da última peça vista e da região/técnica favorita, exibindo estado vazio com link para o `/catalogo` quando não houver itens elegíveis.

> **Compatibilidade com Fake API (AV1):** quando o frontend roda sem `NEXT_PUBLIC_API_URL` (usando `/api`), a rota `frontend/src/app/api/produtos/recomendacoes/route.ts` continua funcional falando diretamente com `modulo-ia` sobre `catalogo_origem.json`.

### Contrato opcional `catalog` em `POST /recommendations`

Além de `product_id`, `category`, `technique`, `region` e `limit`, o endpoint aceita o campo opcional `catalog`:

```json
{
  "product_id": "2001",
  "limit": 4,
  "catalog": [
    {
      "product_id": "2001",
      "name": "Vaso Cerâmica Raízes",
      "category": "Arte e Decoração",
      "technique": "Cerâmica",
      "region": "Zona da Mata - PE",
      "available": true
    }
  ]
}
```

Quando `catalog` é omitido, o módulo utiliza o arquivo padrão definido por `CATALOGO_IA` (`data/catalogo_origem.json`).

Portas utilizadas na execução integrada:

| Componente | Porta |
|---|---:|
| Frontend Next.js | 3000 |
| Serviço BentoML (`modulo-ia`) | 3001 |
| Backend Node/Express | 4000 |
| PostgreSQL | 5433 |

### Teste automatizado de integração ponta a ponta

Com os containers no ar (`docker compose up --build`), execute na raiz do repositório:

```powershell
$env:BACKEND_URL="http://localhost:4000"
$env:RECOMENDACAO_API_URL="http://localhost:3001"
$env:IA_BASE_URL="http://localhost:3001"
npm --prefix frontend run test:api -- tests/api/recomendacoes-integracao.test.ts tests/api/modulo-ia.test.ts tests/api/recomendacoes.test.ts
```

## 15. Catálogo

O módulo de inteligência artificial utiliza uma estrutura unificada de acesso aos dados dos produtos do marketplace Origem, permitindo a consulta ao PostgreSQL e a utilização de catálogos mockados.

### 15.1. Fontes de dados

| Fonte | Finalidade |
|---|---|
| `public.vw_catalogo_recomendacao_ia` | View do PostgreSQL utilizada para consultar os produtos cadastrados no banco de dados. |
| `data/catalogo_origem.json` | Catálogo mockado padrão, baseado nos produtos do Origem, contendo 14 registros. |
| `data/catalogo.json` | Catálogo sintético utilizado nos testes de lógica de recomendação, contendo 8 registros. |

### 15.2. Ordem de acesso aos dados

O arquivo `app/repository.py`, por meio da função `get_catalog_items()`, estabelece a seguinte ordem de consulta:

1. Utilização do catálogo fornecido explicitamente à função.
2. Consulta ao PostgreSQL, quando habilitada e disponível.
3. Carregamento do catálogo JSON como alternativa.

A variável de ambiente `CATALOGO_IA` permite selecionar outro arquivo JSON.

### 15.3. Estrutura dos dados

| Atributo | Tipo | Descrição |
|---|---|---|
| `product_id` | String | Identificador único do produto. |
| `name` | String | Nome do produto artesanal. |
| `category` | String | Categoria comercial. |
| `technique` | String | Técnica artesanal. |
| `region` | String | Região de origem. |
| `available` | Boolean | Disponibilidade do produto. |

### 15.4. Identificação dos produtos

O catálogo mockado do Origem utiliza identificadores no intervalo de `prd_201` a `prd_214`.

Os produtos correspondentes no script de dados iniciais do PostgreSQL utilizam identificadores numéricos de `2001` a `2014`, convertidos em texto pelo módulo de IA durante a consulta.

A correspondência nominal entre os 14 produtos foi documentada no arquivo `docs/analise-catalogo.md`.

Os identificadores originais foram preservados, sendo únicos dentro de cada catálogo. A equivalência entre as fontes deverá ser considerada nas integrações.

### 15.5. Diversidade do catálogo

O catálogo mockado do Origem contempla:

- 14 produtos artesanais.
- 3 categorias comerciais.
- 5 técnicas artesanais.
- 4 regiões de Pernambuco.

### 15.6. Validação da integridade

Os testes automatizados de integridade estão localizados em `tests_dados/test_catalogo.py`.

Os critérios avaliados são:

- Existência de registros nos catálogos.
- Unicidade dos identificadores.
- Presença dos campos obrigatórios.
- Validade dos campos textuais.
- Disponibilidade representada por valor booleano.
- Diversidade de categorias.
- Diversidade de técnicas artesanais.
- Diversidade de regiões.

Em 27/11/2026, foram executados 16 testes automatizados, com 100% de aprovação e nenhuma falha.

Para reproduzir os testes no Windows, a partir do diretório `modulo-ia`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install pytest==9.2.0
.\.venv\Scripts\python.exe -m pytest tests_dados -v
```

Esses testes não dependem da inicialização do PostgreSQL ou do servidor BentoML.

### 15.7. Documentação e evidências

- [Análise do catálogo de produtos](docs/analise-catalogo.md).
- [Evidências dos testes de integridade](docs/evidencias/testes-integridade-catalogo.txt).
- [Código dos testes automatizados](tests_dados/test_catalogo.py).

A validação realizada contempla os arquivos JSON e a comparação nominal com o script de dados iniciais do PostgreSQL, não abrangendo testes de integração com uma instância ativa do banco de dados.

## 16. Limitações do mockup

Esta implementação é um protótipo executável destinado à demonstração da lógica de recomendação e da integração com a interface.

Não contempla:

- Banco de dados de produção.
- Autenticação integrada ao sistema Origem.
- Alteração de estoque.
- Processamento de pagamentos.
- Gestão de pedidos.
- Cadastro de produtos.
- Gerenciamento de preços.
- Infraestrutura de produção.
- Modelo de machine learning treinado.

O score e seus pesos são decisões de implementação do mockup e podem ser calibrados em uma versão futura.

## 17. Execução rápida

### Terminal 1 — Serviço de IA

Na raiz do repositório, no Windows:

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
.\modulo-ia\.venv\Scripts\bentoml.exe serve app.service:RecommendationService --port 3001
```

### Terminal 2 — Testes da IA

```powershell
$env:PYTHONPATH="$PWD\modulo-ia"
.\modulo-ia\.venv\Scripts\python.exe -m pytest .\modulo-ia\tests -v
```

### Terminal 3 — Frontend

Configure `frontend/.env.local` conforme a seção de integração antes de iniciar o site.

```powershell
cd frontend
npm run dev
```

A interface ficará disponível em `http://localhost:3000`.

O serviço de IA ficará disponível em `http://localhost:3001`.
