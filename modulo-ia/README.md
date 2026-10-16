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

- 25 testes aprovados;
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

## 14. Integração com o frontend Origem

O frontend utiliza a rota `GET /produtos/recomendacoes`
(`frontend/src/app/api/produtos/recomendacoes/route.ts`) para solicitar recomendações
ao serviço de IA. Configure `frontend/.env.local` a partir de `frontend/.env.example`:

```dotenv
RECOMENDACAO_API_URL=http://localhost:3001
RECOMENDACAO_API_KEY=origem-mockup-key
```

O fluxo de demonstração é:

1. A página do produto pede `/api/produtos/recomendacoes?produtoId=prd_201`.
2. Com `RECOMENDACAO_API_URL` definida, a rota envia `POST /recommendations` com `product_id` e `limit: 4`.
3. O serviço retorna os identificadores dos produtos recomendados e suas justificativas.
4. Os IDs devolvidos viram cartões, e o `reason` vira o campo `motivo`, mostrado no cartão.
5. A interface apresenta os produtos disponíveis. Se a IA retornar uma lista vazia, a seção de sugestões fica oculta.
6. Sem configuração, ou se o serviço falhar ou passar de 2 segundos, o frontend utiliza as recomendações locais.

O cabeçalho `X-Recomendacao-Fonte` da resposta diz de onde veio a lista (`ia` ou `baseline`).

O site também exclui peças reservadas e vendidas ao montar os cartões devolvidos
pela IA, as sugestões locais e os destaques usados quando não há histórico.

Portas utilizadas na demonstração local:

| Componente | Porta |
|---|---:|
| Frontend Next.js | 3000 |
| Serviço BentoML | 3001 |

A integração depende de os dois serviços estarem executando e de a configuração local da chave de API estar correta.

## 15. Catálogo

O módulo trabalha com dois catálogos em `data/`:

| Arquivo | Uso |
|---|---|
| `catalogo_origem.json` | Padrão. Espelha as peças da Fake API do frontend (`frontend/src/mocks`), com os mesmos IDs `prd_` |
| `catalogo.json` | Catálogo sintético dos testes de lógica (`prod_001`...) |

Para escolher outro arquivo, defina `CATALOGO_IA` com o caminho dele.

Em `catalogo_origem.json`, categoria, técnica e região são os nomes exibidos no site,
e `available` é `true` só para peças com disponibilidade `DISPONIVEL`
(reservadas e vendidas não são recomendadas). Se as peças da Fake API mudarem,
atualize este arquivo também.

O catálogo contém os atributos necessários para a recomendação, incluindo:

- Identificador do produto.
- Nome.
- Categoria.
- Técnica artesanal.
- Região.
- Disponibilidade.

Os identificadores do catálogo do site seguem o padrão `prd_201` a `prd_214`.

O catálogo permite validar a lógica de recomendação sem dependência de banco de dados.

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
