# DOCUMENTAÇÃO DAS FUNÇÕES DE ACESSO AOS DADOS DO MÓDULO DE IA

## Projeto Origem — Marketplace de Artesanato Pernambucano

**Versão:** 1.0  
**Data:** 27/11/2026  
**Branch:** feat/modulo-ia-dados  
**Status:** Implementado e validado por testes automatizados locais

## 1. Objetivo

Este documento apresenta as funções responsáveis pela leitura, validação, consulta, normalização e filtragem dos dados utilizados pelo módulo de inteligência artificial do marketplace Origem.

A implementação tem como objetivo disponibilizar os dados necessários à geração de recomendações, mantendo separadas as responsabilidades de acesso aos dados e de processamento da lógica de recomendação.

## 2. Arquitetura de acesso aos dados

O acesso aos dados está organizado nos seguintes arquivos:

| Arquivo | Responsabilidade |
|---|---|
| `app/catalog.py` | Leitura, validação, normalização e filtragem dos dados do catálogo. |
| `app/repository.py` | Seleção das fontes de dados e consulta ao PostgreSQL ou aos arquivos JSON. |
| `app/service.py` | Recebimento e preparação dos dados utilizados pelas operações do serviço de IA. |
| `app/fallback.py` | Seleção dos candidatos à recomendação. |
| `app/recommendation.py` | Cálculo de pontuação, ordenação e processamento das recomendações. |

Essa organização permite que as operações de acesso aos dados sejam reutilizadas sem a necessidade de duplicar as regras de leitura, validação e comparação de atributos.

## 3. Fontes de dados

O módulo de IA permite utilizar três fontes de dados:

| Fonte | Descrição |
|---|---|
| Catálogo fornecido explicitamente | Dados recebidos como parâmetro pela função ou encaminhados ao serviço de IA. |
| PostgreSQL | Dados consultados por meio da visão `public.vw_catalogo_recomendacao_ia`. |
| Arquivo JSON | Catálogo local utilizado como alternativa quando não existe catálogo explícito e a consulta ao banco não está disponível ou está desabilitada. |

### 3.1. Ordem de prioridade

A função `get_catalog_items()` estabelece a seguinte ordem de acesso:

1. Catálogo fornecido explicitamente.
2. PostgreSQL, quando habilitado e disponível.
3. Arquivo JSON.

Um catálogo vazio fornecido explicitamente é considerado válido e não provoca a consulta às demais fontes.

Da mesma forma, uma consulta ao PostgreSQL que retorna uma lista vazia é considerada válida e não provoca o carregamento do arquivo JSON.

### 3.2. Catálogos JSON

| Arquivo | Finalidade | Registros |
|---|---|---:|
| `data/catalogo_origem.json` | Catálogo mockado padrão do marketplace Origem. | 14 |
| `data/catalogo.json` | Catálogo sintético utilizado nos testes da lógica de recomendação. | 8 |

A variável de ambiente `CATALOGO_IA` permite selecionar outro arquivo de catálogo.

### 3.3. Estrutura dos registros

| Atributo | Tipo esperado | Descrição |
|---|---|---|
| `product_id` | String | Identificador do produto. |
| `name` | String | Nome do produto artesanal. |
| `category` | String | Categoria comercial do produto. |
| `technique` | String | Técnica artesanal utilizada. |
| `region` | String | Região de origem do produto. |
| `available` | Boolean | Indicação de disponibilidade do produto. |

A estrutura esperada dos registros é verificada pelos testes de integridade dos catálogos.

A função `validate_catalog()` realiza uma validação estrutural básica, verificando o formato da coleção, o formato dos registros e a existência de identificadores válidos.

Essa função não substitui os testes completos de integridade dos dados.

## 4. Funções do catálogo

As funções desta seção estão implementadas em `app/catalog.py`.

### 4.1. validate_catalog

**Assinatura:**

`validate_catalog(catalog)`

**Finalidade:** validar a estrutura básica do catálogo.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `catalog` | List | Sim | Lista de produtos representados por dicionários. |

**Retorno:** catálogo recebido, quando sua estrutura é válida.

**Validações realizadas:**

- O catálogo deve ser uma lista.
- Cada produto deve ser um dicionário.
- Cada produto deve possuir um identificador textual não vazio.
- Uma lista vazia é considerada válida.

**Exceções:**

- `TypeError`: catálogo ou registro com tipo inválido.
- `ValueError`: identificador inexistente, vazio ou inválido.

### 4.2. normalize_filter

**Assinatura:**

`normalize_filter(value)`

**Finalidade:** normalizar parâmetros textuais utilizados nas consultas.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `value` | String ou None | Sim | Valor que será normalizado. |

**Retorno:** texto sem espaços excedentes nas extremidades ou `None`.

Valores vazios ou compostos exclusivamente por espaços são convertidos em `None`.

**Exceção:** `TypeError`, quando o valor informado não é textual nem `None`.

### 4.3. attributes_match

**Assinatura:**

`attributes_match(context_value, candidate_value)`

**Finalidade:** comparar atributos utilizados na seleção e na classificação dos produtos.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `context_value` | Variável | Sim | Valor utilizado como referência na comparação. |
| `candidate_value` | Variável | Sim | Valor do atributo do produto candidato. |

**Retorno:** valor booleano indicando se os atributos correspondem.

A comparação textual utiliza `strip()` e `casefold()`, desconsiderando espaços nas extremidades e diferenças entre letras maiúsculas e minúsculas.

Quando algum dos valores é `None`, a função retorna `False`.

Para valores não textuais, utiliza a comparação de igualdade do Python.

A função não realiza remoção de acentos ou equivalência semântica entre palavras diferentes.

### 4.4. load_catalog

**Assinatura:**

`load_catalog(path=None)`

**Finalidade:** carregar e validar um catálogo armazenado em arquivo JSON.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `path` | String, Path ou None | Não | None | Caminho do arquivo JSON. |

Quando nenhum caminho é informado, utiliza o catálogo configurado em `CATALOG_PATH`.

**Retorno:** lista de produtos validada.

**Exceções:**

- `FileNotFoundError`: arquivo inexistente.
- `ValueError`: conteúdo JSON inválido ou identificador de produto inválido.
- `TypeError`: estrutura incompatível com o formato esperado.

### 4.5. resolve_catalog

**Assinatura:**

`resolve_catalog(catalog=None)`

**Finalidade:** determinar o catálogo utilizado pelas funções locais de consulta.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `catalog` | List ou None | Não | None | Catálogo fornecido explicitamente. |

**Retorno:** catálogo fornecido e validado ou catálogo JSON carregado.

Uma lista vazia é preservada como catálogo válido.

Essa função não realiza consultas diretas ao PostgreSQL.

### 4.6. find_product

**Assinatura:**

`find_product(product_id, catalog=None)`

**Finalidade:** localizar um produto pelo seu identificador.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `product_id` | String ou None | Sim | — | Identificador pesquisado. |
| `catalog` | List ou None | Não | None | Catálogo utilizado na pesquisa. |

**Retorno:** dicionário correspondente ao produto encontrado ou `None`.

A pesquisa remove espaços excedentes do identificador informado e utiliza comparação exata com os identificadores armazenados.

A função não restringe a pesquisa aos produtos disponíveis.

### 4.7. is_product_available

**Assinatura:**

`is_product_available(product, default=False)`

**Finalidade:** verificar a disponibilidade de um produto.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `product` | Dict | Sim | — | Registro do produto. |
| `default` | Boolean | Não | False | Disponibilidade considerada quando o atributo está ausente. |

**Retorno:** valor booleano.

Um produto é considerado disponível quando o atributo `available`, ou o valor padrão utilizado em sua ausência, corresponde ao valor booleano `True`.

Valores como `1`, `"true"` e `"True"` não são considerados equivalentes ao booleano `True` por essa função.

### 4.8. available_products

**Assinatura:**

`available_products(reference_product_id=None, catalog=None)`

**Finalidade:** selecionar os produtos disponíveis para consulta ou recomendação.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `reference_product_id` | String ou None | Não | None | Identificador do produto que deverá ser excluído. |
| `catalog` | List ou None | Não | None | Catálogo utilizado na seleção. |

**Retorno:** lista de produtos disponíveis.

A função exclui os produtos indisponíveis e, quando informado, o produto de referência.

Produtos sem o atributo `available` são considerados indisponíveis nessa operação.

### 4.9. filter_products

**Assinatura:**

`filter_products(category=None, technique=None, region=None, reference_product_id=None, catalog=None)`

**Finalidade:** selecionar produtos disponíveis que atendam aos filtros informados.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `category` | String ou None | Não | None | Categoria comercial. |
| `technique` | String ou None | Não | None | Técnica artesanal. |
| `region` | String ou None | Não | None | Região de origem. |
| `reference_product_id` | String ou None | Não | None | Produto que deverá ser excluído. |
| `catalog` | List ou None | Não | None | Catálogo utilizado na consulta. |

**Retorno:** lista de produtos disponíveis que atendem simultaneamente aos filtros ativos.

**Regras aplicadas:**

- Normalização dos parâmetros textuais.
- Comparação sem distinção entre maiúsculas e minúsculas.
- Exclusão dos produtos indisponíveis.
- Exclusão do produto de referência, quando informado.
- Combinação dos filtros por meio de condição lógica AND.
- Retorno de lista vazia quando não existem produtos compatíveis.
- Retorno dos produtos disponíveis quando nenhum filtro é informado.

A função reutiliza `normalize_filter()`, `available_products()` e `attributes_match()`.

## 5. Funções do repositório

As funções desta seção estão implementadas em `app/repository.py`.

O repositório centraliza a seleção das fontes de dados e reutiliza as funções existentes em `app/catalog.py`.

### 5.1. _build_db_dsn

**Assinatura:**

`_build_db_dsn()`

**Finalidade:** construir a configuração de conexão com o PostgreSQL.

**Parâmetros:** não possui parâmetros explícitos.

A função utiliza as seguintes variáveis de ambiente:

| Variável principal | Alternativa | Finalidade |
|---|---|---|
| `DATABASE_URL` | — | Endereço completo de conexão. |
| `POSTGRES_HOST` | `DB_HOST` | Endereço do servidor. |
| `POSTGRES_DB` | `DB_NAME` | Nome do banco de dados. |
| `POSTGRES_USER` | `DB_USER` | Usuário do banco de dados. |
| `POSTGRES_PASSWORD` | `DB_PASSWORD` | Senha do banco de dados. |
| `POSTGRES_PORT` | `DB_PORT` | Porta de conexão. |

A variável `DATABASE_URL` possui prioridade sobre as demais configurações.

Na ausência dessa variável, são utilizados os parâmetros individuais de conexão.

A porta padrão é `5432`.

O usuário, a senha e o nome do banco são codificados por meio da função `quote()` para compor o endereço de conexão.

**Retorno:** endereço de conexão com o PostgreSQL ou `None`, quando não existem informações suficientes para construí-lo.

As credenciais devem permanecer nas configurações do ambiente, sem exposição na documentação ou no repositório.

### 5.2. _normalize_row

**Assinatura:**

`_normalize_row(row)`

**Finalidade:** converter um registro retornado pelo PostgreSQL para o formato utilizado pelo módulo de IA.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `row` | Dict | Sim | Registro retornado pela consulta ao banco de dados. |

**Retorno:** dicionário contendo os atributos `product_id`, `name`, `category`, `technique`, `region` e `available`.

**Transformações realizadas:**

- Conversão do identificador para texto.
- Remoção de espaços nas extremidades do identificador.
- Remoção de espaços nas extremidades dos atributos textuais de categoria, técnica e região.
- Preservação do nome do produto.
- Conversão da disponibilidade em booleano mediante comparação com `True`.

Um identificador ausente é convertido em texto vazio e posteriormente rejeitado pela validação estrutural do catálogo.

### 5.3. fetch_catalog_from_db

**Assinatura:**

`fetch_catalog_from_db(dsn=None)`

**Finalidade:** consultar o catálogo de produtos no PostgreSQL.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `dsn` | String ou None | Não | None | Endereço de conexão com o banco de dados. |

Quando nenhum endereço válido é fornecido, utiliza a configuração construída por `_build_db_dsn()`.

A consulta implementada é:

```sql
SELECT
    product_id,
    name,
    category,
    technique,
    region,
    available
FROM public.vw_catalogo_recomendacao_ia
ORDER BY id_produto ASC
```

A conexão utiliza a biblioteca Psycopg, com `connect_timeout` configurado em dois segundos.

Os registros retornados são normalizados e submetidos à validação estrutural.

**Retornos possíveis:**

- Lista de produtos: consulta realizada com registros.
- Lista vazia: consulta realizada sem registros.
- `None`: ausência de configuração, indisponibilidade da biblioteca Psycopg ou ocorrência de erro tratado do PostgreSQL.

Erros de validação estrutural dos registros retornados não são convertidos automaticamente em `None`.

### 5.4. get_catalog_items

**Assinatura:**

`get_catalog_items(catalog=None, use_db=True)`

**Finalidade:** disponibilizar o catálogo conforme a prioridade das fontes de dados.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `catalog` | List ou None | Não | None | Catálogo fornecido explicitamente. |
| `use_db` | Boolean | Não | True | Indica se a consulta ao PostgreSQL está habilitada. |

**Retorno:** lista de produtos validada.

**Ordem de execução:**

1. Validar o parâmetro `use_db`.
2. Utilizar o catálogo explícito, quando informado.
3. Consultar o PostgreSQL, quando habilitado.
4. Utilizar o resultado do PostgreSQL quando diferente de `None`.
5. Carregar o catálogo JSON quando necessário.

**Exceção:** `TypeError`, quando `use_db` não possui tipo booleano.

Erros de validação do catálogo e de leitura do arquivo JSON também podem ser propagados.

### 5.5. get_repository_product

**Assinatura:**

`get_repository_product(product_id, catalog=None, use_db=True)`

**Finalidade:** localizar um produto utilizando o catálogo disponibilizado pelo repositório.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `product_id` | String ou None | Sim | — | Identificador pesquisado. |
| `catalog` | List ou None | Não | None | Catálogo fornecido explicitamente. |
| `use_db` | Boolean | Não | True | Habilita a consulta ao PostgreSQL. |

**Retorno:** produto encontrado ou `None`.

A função reutiliza `get_catalog_items()` e `find_product()`.

### 5.6. get_repository_available_products

**Assinatura:**

`get_repository_available_products(reference_product_id=None, catalog=None, use_db=True)`

**Finalidade:** disponibilizar os produtos disponíveis a partir das fontes de dados do repositório.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `reference_product_id` | String ou None | Não | None | Produto que deverá ser excluído. |
| `catalog` | List ou None | Não | None | Catálogo fornecido explicitamente. |
| `use_db` | Boolean | Não | True | Habilita a consulta ao PostgreSQL. |

**Retorno:** lista de produtos disponíveis.

A função reutiliza `get_catalog_items()` e `available_products()`.

### 5.7. get_repository_filtered_products

**Assinatura:**

`get_repository_filtered_products(category=None, technique=None, region=None, reference_product_id=None, catalog=None, use_db=True)`

**Finalidade:** disponibilizar produtos que atendam aos filtros informados, independentemente da fonte utilizada.

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|---|---|---|---|---|
| `category` | String ou None | Não | None | Categoria comercial. |
| `technique` | String ou None | Não | None | Técnica artesanal. |
| `region` | String ou None | Não | None | Região de origem. |
| `reference_product_id` | String ou None | Não | None | Produto que deverá ser excluído. |
| `catalog` | List ou None | Não | None | Catálogo fornecido explicitamente. |
| `use_db` | Boolean | Não | True | Habilita a consulta ao PostgreSQL. |

**Retorno:** lista de produtos disponíveis que atendem aos filtros.

A função reutiliza `get_catalog_items()` e `filter_products()`.

Os filtros são aplicados em memória após a obtenção do catálogo. A implementação atual não realiza filtragem individual dos atributos diretamente na consulta SQL.

## 6. Funções compartilhadas pelo serviço de IA

As funções desta seção estão implementadas em `app/service.py`.

### 6.1. resolver_catalogo_requisicao

**Assinatura:**

`resolver_catalogo_requisicao(catalog)`

**Finalidade:** preparar o catálogo recebido pelas operações do serviço de IA.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `catalog` | List de modelos Pydantic ou None | Sim | Catálogo recebido na requisição. |

Quando um catálogo é informado, seus registros são convertidos em dicionários por meio de `model_dump()`.

O catálogo convertido é encaminhado à função `get_catalog_items()`.

Quando o parâmetro é `None`, o repositório determina a fonte de dados conforme a ordem de prioridade estabelecida.

Uma lista vazia fornecida explicitamente é preservada.

**Retorno:** lista de produtos disponibilizada pelo repositório.

### 6.2. normalizar_texto

**Assinatura:**

`normalizar_texto(valor)`

**Finalidade:** normalizar os parâmetros textuais recebidos pelo serviço de IA.

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `valor` | String ou None | Sim | Valor textual recebido. |

**Retorno:** texto normalizado ou `None`.

A função delega a normalização para `normalize_filter()`, evitando a duplicação da lógica.

## 7. Tratamento de parâmetros inválidos

| Situação | Comportamento |
|---|---|
| Catálogo não representado por lista | TypeError. |
| Produto não representado por dicionário | TypeError. |
| Identificador ausente ou inválido no catálogo | ValueError. |
| Filtro textual com tipo incompatível | TypeError. |
| Parâmetro `use_db` não booleano | TypeError. |
| Arquivo JSON inexistente | FileNotFoundError. |
| Arquivo JSON com conteúdo inválido | ValueError. |
| Filtro textual vazio | Conversão para None. |
| Filtro composto apenas por espaços | Conversão para None. |
| Identificador pesquisado vazio | Retorno de None na pesquisa individual. |
| Disponibilidade com valor diferente de True | Produto não considerado disponível pela função de verificação. |
| Ausência de configuração do PostgreSQL | Retorno de None pela função de consulta ao banco. |
| Erro tratado do PostgreSQL | Retorno de None e possibilidade de utilização do JSON pelo repositório. |

O tratamento de parâmetros inválidos descrito nesta seção corresponde ao comportamento das funções Python.

A validação das respostas HTTP associadas a esses erros deverá ser realizada nos testes de integração do serviço.

## 8. Tratamento de catálogo vazio e ausência de resultados

| Cenário | Resultado esperado |
|---|---|
| Catálogo explícito vazio | Lista vazia preservada. |
| PostgreSQL sem registros | Lista vazia preservada. |
| Arquivo JSON contendo lista vazia | Lista vazia validada. |
| Produto inexistente | None. |
| Nenhum produto disponível | Lista vazia. |
| Nenhum produto compatível com os filtros | Lista vazia. |
| Consulta ao PostgreSQL indisponível | Carregamento do catálogo JSON pelo repositório. |
| Consulta local sem filtros | Produtos disponíveis. |
| Recomendação individual sem contexto compatível | Lista vazia nos cenários testados. |

A distinção entre `None` e uma lista vazia evita que a ausência legítima de registros seja interpretada como indisponibilidade da fonte de dados.

## 9. Separação de responsabilidades

A implementação estabelece a seguinte divisão de responsabilidades:

| Componente | Responsabilidade principal |
|---|---|
| Catálogo | Leitura, validação, normalização, comparação e filtragem. |
| Repositório | Seleção e consulta das fontes de dados. |
| Serviço de IA | Recebimento e preparação dos dados das requisições. |
| Seleção de candidatos | Aplicação das estratégias de seleção para recomendação. |
| Recomendador | Cálculo de pontuação, classificação e processamento das recomendações. |

O repositório não é responsável pelo cálculo da pontuação dos produtos.

As funções de filtragem do catálogo não implementam as estratégias de classificação ou flexibilização dos critérios de recomendação.

A separação permite realizar testes específicos de acesso aos dados sem iniciar o servidor HTTP ou uma instância real do PostgreSQL.

## 10. Reutilização das funções

Foram centralizadas as seguintes operações:

| Operação | Função compartilhada |
|---|---|
| Validação estrutural do catálogo | `validate_catalog()` |
| Normalização de parâmetros | `normalize_filter()` |
| Comparação de atributos | `attributes_match()` |
| Verificação de disponibilidade | `is_product_available()` |
| Pesquisa por identificador | `find_product()` |
| Seleção de produtos disponíveis | `available_products()` |
| Filtragem de produtos | `filter_products()` |
| Seleção da fonte de dados | `get_catalog_items()` |
| Preparação do catálogo da requisição | `resolver_catalogo_requisicao()` |

A comparação de atributos foi centralizada em `app/catalog.py` e reutilizada pela lógica de recomendação.

A verificação de disponibilidade foi centralizada e reutilizada pelas operações do catálogo, do recomendador e do serviço.

A normalização textual do serviço passou a delegar sua execução para `normalize_filter()`.

A preparação do catálogo recebido pelas operações do serviço passou a utilizar `resolver_catalogo_requisicao()`.

As funções do repositório reutilizam as operações de consulta e filtragem do catálogo, evitando implementações duplicadas.

## 11. Dependências

| Dependência | Versão | Finalidade |
|---|---|---|
| Python | 3.13.14 | Ambiente utilizado na execução dos testes. |
| BentoML | 1.4.39 | Estrutura de disponibilização do serviço de IA. |
| Pytest | 9.1.1 | Execução dos testes automatizados. |
| Requests | 2.34.2 | Comunicação HTTP utilizada nos testes e integrações. |
| Psycopg Binary | 3.3.9 | Conexão com o PostgreSQL. |

As dependências externas estão registradas no arquivo `requirements.txt`.

A verificação realizada com `pip check` não identificou conflitos entre as dependências instaladas.

## 12. Testes automatizados

### 12.1. Arquivos de testes

| Arquivo | Finalidade | Testes aprovados |
|---|---|---:|
| `tests_dados/test_catalogo.py` | Integridade dos catálogos. | 28 |
| `tests_dados/test_validacao_recomendacao.py` | Validação dos cenários de recomendação. | 20 |
| `tests_dados/test_acesso_dados.py` | Leitura, validação, pesquisa e filtragem dos dados. | 60 |
| `tests_dados/test_repository.py` | Seleção das fontes de dados e comportamento do repositório. | 40 |
| `tests_dados/test_funcoes_compartilhadas.py` | Reutilização das funções e testes de regressão. | 29 |
| `tests/test_parallel_equivalence.py` | Equivalência do processamento sequencial e paralelo. | 4 |
| **Total** | | **181** |

### 12.2. Resultados das execuções

Em 27/11/2026, foram realizadas duas execuções de testes automatizados.

| Execução | Aprovados | Falhas | Avisos | Tempo |
|---|---:|---:|---:|---:|
| Testes de dados | 177 | 0 | 29 | 1,92 s |
| Testes de equivalência paralela | 4 | 0 | 0 | 0,39 s |
| **Total** | **181** | **0** | **29** | — |

Resultados registrados no terminal:

`177 passed, 29 warnings in 1.92s`

`4 passed in 0.39s`

Os 181 testes correspondem à soma de duas execuções independentes.

### 12.3. Critérios avaliados

- Validação da estrutura dos catálogos.
- Tratamento de identificadores inválidos.
- Leitura de arquivos JSON.
- Tratamento de arquivos inexistentes.
- Tratamento de arquivos JSON inválidos.
- Normalização dos parâmetros textuais.
- Comparação de atributos.
- Pesquisa de produtos por identificador.
- Verificação de disponibilidade.
- Filtragem por categoria, técnica e região.
- Combinação de filtros.
- Exclusão do produto de referência.
- Tratamento de catálogos vazios.
- Tratamento da ausência de resultados.
- Construção da configuração de conexão.
- Prioridade das fontes de dados.
- Consulta simulada ao PostgreSQL.
- Tratamento de indisponibilidade do banco de dados.
- Reutilização das funções compartilhadas.
- Equivalência entre processamento sequencial, threads e processos.
- Preservação dos resultados das recomendações individuais e em lote nos cenários testados.

### 12.4. Reprodução dos testes

A partir do diretório `modulo-ia`, no Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m pytest tests_dados -v
.\.venv\Scripts\python.exe -m pytest --noconftest tests/test_parallel_equivalence.py -v
```

A opção `--noconftest` permite executar os testes de equivalência sem acionar a configuração automática do servidor HTTP existente na pasta `tests`.

### 12.5. Avisos das dependências

Durante a execução dos testes de dados, foram registrados 29 avisos:

| Origem | Quantidade | Descrição |
|---|---:|---|
| Pathspec | 22 | Descontinuação futura de recursos relacionados ao GitWildMatchPattern. |
| BentoML/Pydantic | 7 | Descontinuação futura de recursos de integração com os modelos Pydantic. |
| **Total** | **29** | |

Os avisos não provocaram falhas nas execuções realizadas.

A atualização das dependências deverá ser avaliada posteriormente, considerando a compatibilidade com os demais componentes do módulo.

## 13. Limitações e pendências

A validação realizada está limitada ao escopo dos testes automatizados locais.

Permanecem pendentes:

- Validação da consulta em uma instância real do PostgreSQL.
- Confirmação da estrutura e do funcionamento da visão `public.vw_catalogo_recomendacao_ia` no ambiente integrado.
- Validação completa das requisições e respostas HTTP do serviço de IA.
- Confirmação da equivalência integral dos dados provenientes dos catálogos JSON e do PostgreSQL.
- Validação da integração completa com o backend do marketplace.
- Avaliação do desempenho com volumes maiores de dados.
- Identificação detalhada da fonte de dados utilizada nos registros de execução.
- Diferenciação dos motivos de indisponibilidade ou falha na consulta ao PostgreSQL.
- Avaliação futura dos avisos de descontinuação das dependências.

A função `is_product_available()` utiliza `False` como valor padrão quando o atributo `available` está ausente.

Determinadas operações de recomendação em lote utilizam explicitamente `default=True`, preservando o comportamento anterior para registros sem esse atributo.

Essa diferença foi mantida por compatibilidade e deverá ser considerada durante a integração e a definição definitiva do contrato de dados.

A validação estrutural realizada por `validate_catalog()` não verifica isoladamente todos os critérios de integridade dos produtos, como unicidade de identificadores e preenchimento de todos os atributos descritivos.

Esses critérios são avaliados pelos testes específicos de integridade dos catálogos.

Os testes de consulta ao PostgreSQL utilizam simulações controladas e não constituem evidência de comunicação com um banco de dados ativo.

## 14. Rastreabilidade dos critérios do cartão

| Critério | Implementação ou evidência | Situação |
|---|---|---|
| Identificar as funções de acesso aos dados já existentes. | Análise de catalog.py, repository.py, service.py, fallback.py e recommendation.py. | Concluído |
| Implementar ou ajustar a leitura dos dados do catálogo. | load_catalog(), resolve_catalog() e get_catalog_items(). | Validado localmente |
| Implementar consultas e filtros necessários às recomendações. | find_product(), available_products(), filter_products() e funções do repositório. | Validado localmente |
| Garantir o tratamento de parâmetros inválidos. | Validação estrutural, normalização e testes de parâmetros inválidos. | Validado localmente |
| Tratar catálogo vazio ou ausência de resultados. | Preservação de listas vazias e testes de ausência de registros. | Validado localmente |
| Evitar duplicação desnecessária de lógica. | Centralização das funções compartilhadas e testes de regressão. | Validado localmente |
| Documentar as funções e seus parâmetros. | Documento acesso-dados-ia.md. | Documentado |

## 15. Conclusão

As funções de acesso aos dados do módulo de IA foram revisadas e organizadas para permitir a leitura, validação, consulta, normalização e filtragem dos produtos utilizados nas recomendações.

A implementação preserva a prioridade das fontes de dados, diferencia catálogos vazios de fontes indisponíveis e reutiliza funções compartilhadas entre os componentes.

As duas execuções de testes automatizados realizadas totalizaram 181 testes aprovados, sem falhas.

Os resultados demonstram o funcionamento das operações avaliadas no escopo local, sem substituir a necessidade de testes de integração HTTP, consultas reais ao PostgreSQL e monitoramento do desempenho.

A documentação estabelece a base técnica necessária para as próximas etapas de integração, testes e monitoramento do módulo de IA.
