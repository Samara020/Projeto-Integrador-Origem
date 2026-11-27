# Módulo de Recomendação de Produtos — Origem

Mockup executável do módulo de recomendação de produtos do marketplace Origem, desenvolvido para demonstrar uma estratégia de recomendação baseada em conteúdo.

O módulo utiliza atributos dos produtos para calcular uma pontuação de relacionamento, ordenar candidatos e retornar recomendações justificadas. A implementação utiliza um catálogo sintético, permitindo executar e testar a lógica sem depender de banco de dados ou de dados reais.

## Entrega AV2: dados, funções de acesso e log de uso

Esta seção segue a ordem pedida no enunciado. O restante do README (a partir da seção 1) é a documentação detalhada do módulo.

Resumo do caminho: o módulo de IA é o serviço BentoML `RecommendationService`. As rotas `POST /recommendations` e `POST /recommendations/batch` só chegam aos produtos pelas funções de `app/repository.py`. Cada chamada a essas funções grava uma linha em `modulo-ia/logs/uso_dados.jsonl`. O script `resumo_uso_dados.py` lê esse arquivo e mostra o resumo.

### A. Como instalar e rodar

Na raiz do repositório, com Python 3.13:

```powershell
# Windows (PowerShell)
python -m venv modulo-ia\.venv
.\modulo-ia\.venv\Scripts\python.exe -m pip install -r .\modulo-ia\requirements.txt
$env:PYTHONPATH="$PWD\modulo-ia"
.\modulo-ia\.venv\Scripts\bentoml.exe serve app.service:RecommendationService --port 3001
```

```bash
# Linux / macOS
python3 -m venv modulo-ia/.venv
modulo-ia/.venv/bin/python -m pip install -r modulo-ia/requirements.txt
export PYTHONPATH="$PWD/modulo-ia"
modulo-ia/.venv/bin/bentoml serve app.service:RecommendationService --port 3001
```

Deixe esse terminal aberto. Sem `DATABASE_URL` ou `POSTGRES_*` definidos, o módulo lê os dados de `modulo-ia/data/catalogo_origem.json`, que é o caminho desta demonstração.

Alternativa com Docker: `docker compose up --build modulo-ia`. Nesse caso o log fica dentro do contêiner, em `/app/logs/uso_dados.jsonl`, e os comandos dos passos D e E viram `docker compose exec modulo-ia cat logs/uso_dados.jsonl` e `docker compose exec modulo-ia python resumo_uso_dados.py`.

Testes das funções, do log e do resumo (não precisam do servidor):

```bash
cd modulo-ia
python -m pytest tests_dados -q
```

### B. Dicionário de dados

Arquivo versionado: `modulo-ia/data/catalogo_origem.json`, com 15 produtos fictícios inspirados no artesanato de Pernambuco. Não há dados pessoais.

| Campo | Significado no negócio |
|---|---|
| `product_id` | Identificador do produto na vitrine do Origem. É o que a página do produto envia ao módulo para pedir "produtos parecidos". |
| `name` | Nome do produto como aparece para o comprador. O módulo não usa o nome para pontuar; ele serve só para conferência humana. |
| `category` | Seção comercial da loja (Artesanato, Arte e Decoração, Literatura...). É o critério mais forte da recomendação (peso 0,5) e é obrigatório para um produto entrar na lista de parecidos. |
| `technique` | Técnica artesanal usada pelo artesão (Cerâmica, Bordado, Cordel...). Segundo critério de semelhança (peso 0,3). |
| `region` | Região de Pernambuco onde a peça foi feita. Terceiro critério de semelhança (peso 0,2), que valoriza peças do mesmo território. |
| `available` | `true` se a peça pode ser comprada agora (aprovada, não pausada e com estoque). Produto com `false` nunca é recomendado. |

Casos difíceis incluídos de propósito:

- `prd_215` (Rabeca de Cabaça): única peça da categoria "Instrumentos Musicais". Não tem nenhum semelhante, então a recomendação volta vazia.
- `prd_206` e `prd_208`: produtos indisponíveis. Existem no catálogo, mas nunca aparecem como recomendação.
- `prd_999`: identificador que não existe no arquivo. Ele é usado na terceira chamada da demonstração.

Com o PostgreSQL configurado, os mesmos campos vêm da view `public.vw_catalogo_recomendacao_ia` (veja `database/sql/10_estrutura_modulo_ia.sql`).

### C. Funções de acesso aos dados

Todas ficam em `app/repository.py`. As rotas não abrem o arquivo JSON nem o banco diretamente.

| Função | O que entrega | Quando não encontra nada |
|---|---|---|
| `get_catalog_items(catalog=None)` | O catálogo inteiro. A origem é, nesta ordem: lista enviada na requisição, PostgreSQL ou JSON. | Lista vazia. Arquivo ausente ou inválido gera erro claro (`FileNotFoundError` / `ValueError`). |
| `get_repository_product(product_id)` | Um produto pelo identificador. A rota usa para achar o produto de referência. | Devolve `None`, o log registra `status: "erro"` com o id, e a rota responde `404 PRODUCT_NOT_FOUND`. |
| `get_repository_products_by_ids(product_ids)` | Vários produtos pelos identificadores (usada pela rota em lote). | Ignora os ids que não existem e registra quais faltaram. Se nenhum existir, devolve lista vazia. |
| `get_repository_available_products(reference_product_id=None)` | Produtos que podem ser recomendados (disponíveis, sem o de referência). | Lista vazia. |
| `get_repository_filtered_products(category, technique, region)` | Produtos disponíveis que batem com os filtros. | Lista vazia. |

**Experiência: alterar um dado muda a resposta.** Com o servidor rodando, faça a chamada 1 do passo D (`prd_201`). A resposta traz `prd_213`, `prd_202` e `prd_207`. Abra `data/catalogo_origem.json`, troque `"available": true` por `"available": false` no `prd_213` e salve. Repita a chamada 1, sem reiniciar o servidor: o `prd_213` some e ficam só `prd_202` e `prd_207`. Volte o valor para `true` no final. As duas respostas estão em `docs/evidencias/respostas_chamadas_exemplo.txt`.

### D. Como gerar o log com três chamadas

Em outro terminal, com o servidor do passo A rodando:

```bash
# Linux / macOS / Git Bash
curl -s -X POST http://localhost:3001/recommendations -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" -d '{"product_id": "prd_201", "limit": 5}'
curl -s -X POST http://localhost:3001/recommendations -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" -d '{"product_id": "prd_215", "limit": 5}'
curl -s -X POST http://localhost:3001/recommendations -H "Content-Type: application/json" -H "X-API-Key: origem-mockup-key" -d '{"product_id": "prd_999", "limit": 5}'
```

```powershell
# Windows (PowerShell)
$h = @{ "X-API-Key" = "origem-mockup-key" }
foreach ($id in "prd_201", "prd_215", "prd_999") {
  try {
    Invoke-RestMethod -Method Post -Uri http://localhost:3001/recommendations -Headers $h `
      -ContentType "application/json" -Body (@{ product_id = $id; limit = 5 } | ConvertTo-Json) | ConvertTo-Json -Depth 5
  } catch { "$id -> $($_.Exception.Message)" }
}
```

O que cada chamada mostra:

1. `prd_201`: caso normal. Devolve 3 recomendações.
2. `prd_215`: produto sem semelhante. Devolve `{"recommendations": []}`.
3. `prd_999`: identificador inexistente. Devolve `404 PRODUCT_NOT_FOUND`.

Abra o log:

```bash
cat modulo-ia/logs/uso_dados.jsonl             # Linux / macOS
Get-Content modulo-ia\logs\uso_dados.jsonl     # Windows
```

Cada chamada gera duas linhas: `get_catalog_items`, que carrega o catálogo, e `get_repository_product`, que busca o produto de referência. As três linhas de `get_repository_product` mostram o uso dos dados, uma por chamada:

```json
{"data_hora": "2026-11-27T18:57:06-03:00", "funcao": "get_repository_product", "chamador": "POST /recommendations", "parametros": {"product_id": "prd_201"}, "registros": 1, "status": "sucesso", "ids": ["prd_201"], "fonte": "lista_recebida"}
{"data_hora": "2026-11-27T18:57:06-03:00", "funcao": "get_repository_product", "chamador": "POST /recommendations", "parametros": {"product_id": "prd_215"}, "registros": 1, "status": "sucesso", "ids": ["prd_215"], "fonte": "lista_recebida"}
{"data_hora": "2026-11-27T18:57:06-03:00", "funcao": "get_repository_product", "chamador": "POST /recommendations", "parametros": {"product_id": "prd_999"}, "registros": 0, "status": "erro", "fonte": "lista_recebida", "erro": "produto nao encontrado: prd_999"}
```

Campos de cada linha:

| Campo | Conteúdo |
|---|---|
| `data_hora` | Data e hora da chamada, com fuso. |
| `funcao` | Função de acesso chamada. |
| `chamador` | Quem chamou: a rota (`POST /recommendations`, `POST /recommendations/batch`) ou `direto` (testes e scripts). |
| `parametros` | Resumo dos parâmetros. Só identificadores e filtros, nunca dados pessoais. |
| `registros` | Quantos registros a função devolveu. |
| `status` | `sucesso`, `vazio` (funcionou, mas não achou nada) ou `erro`. |
| `ids` | Identificadores dos produtos devolvidos, nas funções que consultam produtos específicos. |
| `fonte` | De onde vieram os dados: `json`, `postgres`, `payload` (lista enviada pelo backend) ou `lista_recebida` (catálogo já carregado na mesma requisição). |
| `erro` | Motivo do erro ou ids não encontrados. |

O arquivo só recebe linhas novas e nunca é apagado pelo módulo. Para começar do zero, apague o arquivo à mão. O caminho pode ser trocado com a variável `LOG_USO_DADOS`. Os testes gravam em um arquivo temporário e não sujam este log.

O log de execução das rotas, já existente (evento `modulo_ia_execucao`, na saída do terminal), continua igual e separado deste.

### E. Como ver o resumo

```bash
python modulo-ia/resumo_uso_dados.py
```

O script mostra quantas vezes cada função foi chamada (com sucesso, vazio e erro), quem chamou, os erros com o motivo, os produtos mais consultados, os produtos do catálogo nunca consultados e os ids pedidos que não existem. Opções: `--log <arquivo>` e `--catalogo <arquivo>`.

Exemplo gerado em 27/11/2026, com as três chamadas, o experimento da seção C e uma chamada em lote (`prd_209` e `prd_999`): `docs/evidencias/uso_dados_exemplo.jsonl` (log) e `docs/evidencias/resumo_uso_dados_exemplo.txt` (resumo).

### F. Respostas

Com base no resumo de exemplo:

**(a) Qual dado o módulo mais usa?** O catálogo inteiro: `get_catalog_items` aparece em 5 das 10 linhas, porque toda recomendação compara a categoria, a técnica e a região do produto de referência com as de todos os outros. Entre os produtos, o mais consultado foi o `prd_201`, pedido duas vezes (chamada normal e experimento).

**(b) Algum dado nunca foi usado? O que isso sugere?** Sim: 12 dos 15 produtos nunca foram consultados como referência. Entre eles estão `prd_206` e `prd_208`, que estão indisponíveis e por isso também nunca são recomendados. Com uso real, isso apontaria produtos que ninguém visita e itens parados no catálogo, bons candidatos a revisão de cadastro ou destaque na vitrine. Já o `prd_215` foi consultado, mas nunca gera recomendação, o que mostra que o catálogo precisa de mais peças nessa categoria ou de uma regra alternativa (por exemplo, mais vendidos da mesma região). Limitação: o resumo conta os produtos pedidos como referência; os produtos que aparecem dentro das respostas não entram nessa contagem.

**(c) Houve erro? Por quê?** Sim, um: `get_repository_product` com `prd_999`, um identificador que não existe no catálogo e foi usado de propósito. A função devolve `None`, o log registra o motivo e a rota responde `404 PRODUCT_NOT_FOUND`, sem derrubar o serviço. O mesmo id também aparece na chamada em lote: ali ele é ignorado, e a resposta segue com os produtos que existem.

### G. Declaração de uso de IA generativa

- **Ferramenta:** Claude (Anthropic), modelo Claude Opus 5.5, em 27/11/2026, usado por Lara Thaylanne.
- **Para quê:** ler o que já existia na branch `feat/modulo-ia-dados` e implementar a parte que faltava: o log em arquivo (`app/data_log.py` e o registro dentro de `app/repository.py`), a função `get_repository_products_by_ids`, a passagem da rota em lote pelas funções de acesso, o produto `prd_215`, o script `resumo_uso_dados.py`, os testes `tests_dados/test_log_uso_dados.py` e esta seção do README.
- **Validação:** os testes de `tests_dados` foram executados (204 aprovados). As três chamadas e o experimento foram reproduzidos, e o log e o resumo de exemplo foram gerados a partir deles. A squad revisa a branch antes do merge.
- As declarações de uso de IA das etapas anteriores estão em `uso-ia-concorrencia.md`, na raiz.

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
| `data/catalogo_origem.json` | Catálogo mockado padrão, baseado nos produtos do Origem, contendo 15 registros (14 equivalentes ao seed do PostgreSQL e o caso difícil `prd_215`). |
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

O catálogo mockado do Origem utiliza identificadores no intervalo de `prd_201` a `prd_215`. O `prd_215` existe só no JSON: é o caso sem semelhante usado na demonstração do log.

Os produtos correspondentes no script de dados iniciais do PostgreSQL utilizam identificadores numéricos de `2001` a `2014`, convertidos em texto pelo módulo de IA durante a consulta.

A correspondência nominal entre os 14 produtos foi documentada no arquivo `docs/analise-catalogo.md`.

Os identificadores originais foram preservados, sendo únicos dentro de cada catálogo. A equivalência entre as fontes deverá ser considerada nas integrações.

### 15.5. Diversidade do catálogo

O catálogo mockado do Origem contempla:

- 15 produtos artesanais.
- 4 categorias comerciais.
- 6 técnicas artesanais.
- 5 regiões de Pernambuco.

### 15.6. Validação da integridade e dos cenários de recomendação

Os testes automatizados de validação dos dados estão localizados nos seguintes arquivos:

| Arquivo | Finalidade | Testes aprovados |
|---|---|---:|
| `tests_dados/test_catalogo.py` | Validação da integridade e da consistência dos catálogos. | 28 |
| `tests_dados/test_validacao_recomendacao.py` | Validação dos cenários de recomendação. | 20 |
| **Total** | | **48** |

Os critérios avaliados incluem:

- Existência de registros nos catálogos.
- Unicidade dos identificadores.
- Presença dos campos obrigatórios.
- Validade dos campos textuais.
- Disponibilidade representada por valor booleano.
- Diversidade de categorias, técnicas e regiões.
- Ausência de registros integralmente duplicados.
- Ausência de duplicidades descritivas nos catálogos mockados.
- Unicidade dos identificadores após normalização.
- Ausência de espaços excedentes.
- Existência de produtos disponíveis e indisponíveis.
- Recomendações por categoria, técnica e região.
- Recomendações com combinação de atributos.
- Comportamento na ausência de produtos compatíveis.
- Comportamento com catálogo vazio.
- Comportamento na ausência de filtros.
- Comportamento quando todos os produtos estão indisponíveis.

Em 27/11/2026, foram executados 48 testes automatizados, com 100% de aprovação e nenhuma falha.

A execução registrada no arquivo de evidências apresentou o seguinte resultado:

`48 passed in 0.17s`

Para reproduzir os testes no Windows, a partir do diretório `modulo-ia`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest tests_dados/test_catalogo.py tests_dados/test_validacao_recomendacao.py -v
```

Esses testes não dependem da inicialização do PostgreSQL ou do servidor BentoML.

### 15.7. Documentação e evidências

- [Análise do catálogo de produtos](docs/analise-catalogo.md).
- [Validação dos dados utilizados pela IA](docs/validacao-dados-ia.md).
- [Evidências dos testes iniciais de integridade](docs/evidencias/testes-integridade-catalogo.txt).
- [Evidências dos testes de validação dos dados](docs/evidencias/testes-validacao-dados-ia.txt).
- [Código dos testes de integridade](tests_dados/test_catalogo.py).
- [Código dos testes de validação da recomendação](tests_dados/test_validacao_recomendacao.py).

A validação contempla os catálogos JSON, a comparação nominal com o script de dados iniciais do PostgreSQL e os cenários de seleção de candidatos à recomendação.

Os testes de integração HTTP, as consultas a uma instância ativa do PostgreSQL e o monitoramento do desempenho não fazem parte desta etapa.


### 15.8. Implementação das funções de acesso aos dados

As funções de acesso aos dados foram revisadas e organizadas para separar as responsabilidades de leitura, validação, consulta, normalização e filtragem das responsabilidades de geração de recomendações.

| Arquivo | Responsabilidade |
|---|---|
| `app/catalog.py` | Leitura, validação, normalização e filtragem dos catálogos. |
| `app/repository.py` | Seleção das fontes de dados e consulta ao PostgreSQL. |
| `app/service.py` | Preparação dos dados recebidos pelas operações do serviço de IA. |
| `app/fallback.py` | Seleção dos candidatos à recomendação. |
| `app/recommendation.py` | Pontuação, classificação e processamento das recomendações. |

As principais melhorias implementadas incluem:

- Validação estrutural dos catálogos.
- Tratamento de parâmetros inválidos.
- Tratamento de arquivos JSON inexistentes ou inválidos.
- Consulta de produtos por identificador.
- Filtragem por categoria, técnica e região.
- Combinação de filtros.
- Exclusão de produtos indisponíveis.
- Exclusão do produto de referência.
- Preservação de catálogos vazios.
- Diferenciação entre ausência de registros e indisponibilidade da fonte de dados.
- Centralização da comparação de atributos.
- Centralização da normalização textual.
- Centralização da verificação de disponibilidade.
- Reutilização das funções de acesso aos dados.
- Preservação da equivalência entre processamento sequencial e paralelo nos cenários testados.

A consulta ao PostgreSQL utiliza a biblioteca `psycopg[binary]`, na versão `3.3.9`, registrada no arquivo `requirements.txt`.

A documentação completa das funções, seus parâmetros, retornos, exceções e limitações está disponível em [Documentação das funções de acesso aos dados](docs/acesso-dados-ia.md).

### 15.9. Testes automatizados das funções de acesso aos dados

| Arquivo | Finalidade | Testes aprovados |
|---|---|---:|
| `tests_dados/test_catalogo.py` | Integridade dos catálogos. | 28 |
| `tests_dados/test_validacao_recomendacao.py` | Validação dos cenários de recomendação. | 20 |
| `tests_dados/test_acesso_dados.py` | Leitura, validação, pesquisa e filtragem. | 60 |
| `tests_dados/test_repository.py` | Consulta e seleção das fontes de dados. | 40 |
| `tests_dados/test_funcoes_compartilhadas.py` | Reutilização das funções e regressão. | 29 |
| `tests/test_parallel_equivalence.py` | Equivalência do processamento sequencial e paralelo. | 4 |
| **Total** | | **181** |

Em 27/11/2026, foram realizadas duas execuções independentes de testes automatizados para geração das evidências.

| Execução | Aprovados | Falhas | Avisos | Tempo |
|---|---:|---:|---:|---:|
| Testes de dados | 177 | 0 | 29 | 1,92 s |
| Testes de equivalência paralela | 4 | 0 | 0 | 0,39 s |
| **Total** | **181** | **0** | **29** | **2,31 s** |

Os 181 testes incluem os 48 testes de integridade e validação dos dados documentados anteriormente.

Ambas as execuções apresentaram código de saída igual a zero.

Os 29 avisos estão relacionados à descontinuação futura de recursos das bibliotecas Pathspec, BentoML e Pydantic, sem ocorrência de falhas nos testes realizados.

### 15.10. Reprodução dos testes de acesso aos dados

A partir do diretório `modulo-ia`, no Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m pytest tests_dados -v
.\.venv\Scripts\python.exe -m pytest --noconftest tests/test_parallel_equivalence.py -v
```

Ambiente utilizado na geração das evidências:

| Componente | Versão |
|---|---|
| Python | 3.13.14 |
| Pytest | 9.1.1 |
| BentoML | 1.4.39 |
| Requests | 2.34.2 |
| Psycopg Binary | 3.3.9 |

A opção `--noconftest` permite executar os testes de equivalência sem iniciar automaticamente o servidor HTTP.

### 15.11. Documentação e evidências do acesso aos dados

- [Documentação das funções de acesso aos dados](docs/acesso-dados-ia.md).
- [Evidências dos testes de acesso aos dados](docs/evidencias/testes-acesso-dados-ia.txt).
- [Código dos testes de acesso aos dados](tests_dados/test_acesso_dados.py).
- [Código dos testes do repositório](tests_dados/test_repository.py).
- [Código dos testes das funções compartilhadas](tests_dados/test_funcoes_compartilhadas.py).
- [Código dos testes de equivalência paralela](tests/test_parallel_equivalence.py).

A validação realizada contempla as funções Python, os catálogos JSON, as consultas simuladas ao PostgreSQL e a equivalência do processamento sequencial e paralelo.

Na etapa de implementação das funções de acesso aos dados, a integração HTTP completa, a consulta ao PostgreSQL real e a integração com o backend ainda não haviam sido validadas. Essas validações foram realizadas posteriormente na etapa de integração do recomendador, conforme as seções 15.12 a 15.19. O monitoramento sistemático do desempenho permanece como atividade complementar.

### 15.12. Integração do acesso aos dados ao recomendador de IA

O módulo de IA integra as funções de acesso aos dados do catálogo ao fluxo de recomendação do marketplace Origem, permitindo a seleção de produtos compatíveis com os critérios informados pelo usuário.

A integração contempla:

- Consulta aos produtos do catálogo.
- Identificação do produto de referência.
- Aplicação dos critérios de categoria, técnica artesanal e região.
- Verificação da disponibilidade dos produtos.
- Exclusão do produto utilizado como referência.
- Exclusão de recomendações duplicadas.
- Cálculo da pontuação de compatibilidade.
- Ordenação das recomendações por pontuação.
- Limitação da quantidade de resultados.
- Retorno de lista vazia quando não existem produtos compatíveis.

A separação entre acesso aos dados e geração de recomendações foi preservada, permitindo a evolução independente dessas responsabilidades.

### 15.13. Fluxo integrado de recomendação

O fluxo integrado do marketplace utiliza os seguintes componentes:

1. O frontend solicita recomendações ao backend.
2. O backend consulta os produtos disponíveis no PostgreSQL.
3. O backend prepara o catálogo e os critérios de recomendação.
4. O módulo de IA recebe os dados por meio da API de recomendações.
5. O recomendador seleciona e classifica os produtos compatíveis.
6. O módulo de IA retorna os identificadores, as pontuações e os motivos das recomendações.
7. O backend complementa os resultados com os dados dos produtos.
8. O frontend apresenta as recomendações ao usuário.

O ponto de entrada utilizado pelo frontend é:

`GET /produtos/recomendacoes`

O backend utiliza o cabeçalho `X-Recomendacao-Fonte` para identificar a origem das recomendações, permitindo distinguir os resultados produzidos pelo módulo de IA daqueles obtidos pelo mecanismo alternativo de recomendação.

### 15.14. Critérios de compatibilidade e pontuação

A pontuação das recomendações considera os seguintes pesos:

| Critério | Peso |
|---|---:|
| Categoria | 0,50 |
| Técnica artesanal | 0,30 |
| Região | 0,20 |
| Total | 1,00 |

A pontuação é normalizada considerando os atributos presentes no contexto da recomendação.

Os resultados são ordenados por pontuação decrescente, respeitando o limite solicitado.

Durante a validação da integração, foi identificada a possibilidade de o processamento em lote retornar produtos com pontuação igual a zero.

A função `_rank_single_reference`, localizada em `app/recommendation.py`, foi ajustada para excluir essas recomendações antes da aplicação do limite de resultados.

A recomendação individual e a recomendação em lote possuem estratégias de seleção distintas. Portanto, a equivalência integral dos resultados entre essas modalidades não é garantida para todos os contextos.

### 15.15. Validação com o PostgreSQL

A integração foi validada em ambiente local utilizando PostgreSQL 17 e a visão `public.vw_catalogo_recomendacao_ia`.

Durante a validação, foram identificados:

| Indicador | Quantidade |
|---|---:|
| Produtos consultados no catálogo | 15 |
| Produtos disponíveis | 13 |
| Produtos indisponíveis | 2 |
| Produtos disponíveis utilizados como referência | 13 |
| Recomendações validadas no processamento em lote | 57 |

Foram verificadas a disponibilidade, a pertinência ao catálogo, a ausência de duplicidades, a exclusão do produto de referência, a pontuação positiva e a ordenação dos resultados.

A consulta direta ao PostgreSQL pelo módulo de IA foi validada mediante configuração temporária das variáveis de conexão.

No fluxo integrado utilizado pelo frontend, o backend consulta o banco de dados e encaminha o catálogo ao módulo de IA.

Os quantitativos apresentados correspondem ao estado do banco de dados local no momento da validação e podem variar conforme a evolução do catálogo.

### 15.16. Testes automatizados da integração

Foi criado o arquivo:

`tests_dados/test_integracao_recomendador.py`

O arquivo contém 17 novos casos de teste destinados à validação do fluxo de recomendação individual e em lote.

Os testes verificam:

- Integração entre consulta ao catálogo e recomendação.
- Utilização dos catálogos sintético e representativo do Origem.
- Limites de 1, 5 e 20 recomendações.
- Disponibilidade dos produtos recomendados.
- Pertinência dos produtos ao catálogo consultado.
- Ausência de duplicidades.
- Exclusão do produto de referência.
- Validade e ordenação das pontuações.
- Exclusão de recomendações com pontuação igual a zero.
- Equivalência entre modalidades em cenário controlado.
- Ausência de produtos compatíveis.
- Catálogo vazio.
- Ausência de produtos de referência.

### 15.17. Resultados dos testes de regressão e integração

A coleta definitiva das evidências foi realizada em 27/11/2026, na branch `feat/modulo-ia-dados`.

| Grupo de testes | Executados | Aprovados | Falhas |
|---|---:|---:|---:|
| Testes de dados e integração do recomendador | 194 | 194 | 0 |
| Suíte original do módulo de IA | 33 | 33 | 0 |
| Testes unitários do backend | 6 | 6 | 0 |
| Testes de integração real | 6 | 6 | 0 |
| **Total** | **239** | **239** | **0** |

**Taxa de aprovação: 100% das suítes selecionadas.**

Os 17 novos casos de teste estão incluídos nos 194 testes de dados e integração do recomendador, não sendo contabilizados novamente no total consolidado.

Todos os quatro grupos apresentaram código de saída igual a zero.

As advertências de depreciação das dependências Python foram registradas nas evidências e não impediram a aprovação dos testes.

Os resultados apresentados correspondem ao escopo da integração do recomendador, não representando a execução integral de todas as suítes de testes do marketplace Origem.

### 15.18. Validação da integração com o frontend

A integração foi validada em ambiente local com os seguintes serviços:

| Serviço | Endereço local |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |
| Módulo de IA | http://localhost:3001 |
| PostgreSQL | localhost:5433 |

Foram verificadas as páginas:

- `/produto/2001`
- `/recomendacoes`

Os testes de integração real confirmaram a disponibilidade dos serviços, a comunicação entre backend e módulo de IA, a origem das recomendações, a aplicação dos filtros e o tratamento de cenários sem resultados.

A apresentação das recomendações nas páginas do frontend também foi verificada manualmente.

Essa validação não substitui uma suíte completa de testes automatizados de interface ou de navegação ponta a ponta.

### 15.19. Documentação técnica e evidências

Os detalhes da implementação, os critérios de validação, os resultados obtidos e as limitações identificadas estão disponíveis nos seguintes arquivos:

- [Documentação da integração do acesso aos dados ao recomendador de IA](docs/integracao-recomendador-ia.md).
- [Evidências dos testes de integração do recomendador de IA](docs/evidencias/testes-integracao-recomendador-ia.txt).
- [Testes automatizados da integração do recomendador](tests_dados/test_integracao_recomendador.py).
- [Documentação das funções de acesso aos dados](docs/acesso-dados-ia.md).
- [Documentação da validação dos dados utilizados pela IA](docs/validacao-dados-ia.md).

O arquivo de evidências contém os registros das execuções efetivas dos testes, os códigos de saída e a consolidação dos resultados, utilizando codificação UTF-8.

### 15.20. Limitações e continuidade

A integração do acesso aos dados ao recomendador foi implementada e validada em ambiente local.

Permanecem como atividades complementares:

- Evolução dos registros estruturados de execução do módulo de IA.
- Ampliação dos testes das funções e dos serviços integrados.
- Monitoramento do uso dos dados e do desempenho.
- Documentação dos indicadores e das evidências de monitoramento.
- Avaliação de desempenho sob diferentes volumes de dados.
- Acompanhamento das advertências e vulnerabilidades das dependências.
- Revisão da consistência visual das imagens dos produtos recomendados.

Essas atividades deverão ser tratadas nos cartões correspondentes do backlog, conforme seus respectivos critérios de aceitação.

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
