# DOCUMENTAÇÃO DA INTEGRAÇÃO DO ACESSO AOS DADOS AO RECOMENDADOR DE IA

## Projeto Origem — Marketplace de Artesanato Pernambucano

**Versão:** 1.0
**Data:** 27/11/2026
**Branch:** feat/modulo-ia-dados
**Status:** Implementado e validado por testes automatizados e testes de integração em ambiente local.

## 1. Objetivo

Este documento apresenta a integração das funções de acesso aos dados com o fluxo de recomendação do módulo de inteligência artificial do marketplace Origem.

A integração permite utilizar os critérios informados pelo usuário para consultar, selecionar, classificar e disponibilizar produtos artesanais compatíveis com o contexto da recomendação.

A implementação mantém separadas as responsabilidades de acesso aos dados, seleção de candidatos, cálculo de pontuação e disponibilização dos resultados para a aplicação.

## 2. Arquitetura da integração

A integração utiliza os seguintes componentes:

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | Next.js e TypeScript | Receber os critérios do usuário e disponibilizar as recomendações na interface. |
| Backend | Express, TypeScript e Prisma | Consultar os produtos, preparar o catálogo e intermediar a comunicação com o módulo de IA. |
| Banco de dados | PostgreSQL 17 | Armazenar os dados dos produtos, categorias, lojas e estoques. |
| Módulo de IA | Python e BentoML | Selecionar, pontuar e classificar os produtos recomendados. |
| Infraestrutura | Docker Compose | Disponibilizar os serviços em ambiente integrado. |

### 2.1. Fluxo principal de integração

1. O usuário acessa a página de um produto ou a área de recomendações do marketplace.
2. O frontend encaminha os critérios de recomendação ao backend.
3. O backend consulta os produtos armazenados no PostgreSQL.
4. O backend prepara o catálogo no formato utilizado pelo módulo de IA.
5. O backend encaminha uma requisição HTTP ao serviço de recomendação.
6. O módulo de IA valida e disponibiliza o catálogo recebido.
7. O recomendador seleciona os produtos compatíveis com o contexto informado.
8. Os produtos selecionados recebem pontuações e justificativas.
9. O módulo de IA retorna os resultados ao backend.
10. O backend verifica os produtos retornados e complementa os dados necessários à aplicação.
11. O frontend recebe os resultados para apresentação ao usuário.

### 2.2. Comunicação entre os componentes

| Origem | Destino | Operação |
|---|---|---|
| Frontend | Backend | Requisição HTTP de recomendações. |
| Backend | PostgreSQL | Consulta ao catálogo de produtos. |
| Backend | Módulo de IA | Requisição HTTP contendo catálogo e critérios. |
| Módulo de IA | Backend | Retorno dos identificadores, pontuações e justificativas. |
| Backend | Frontend | Retorno dos produtos recomendados com os dados necessários à interface. |

O módulo de IA também possui suporte à consulta direta ao PostgreSQL e à utilização de catálogos JSON.

A consulta direta ao PostgreSQL foi validada separadamente, mediante configuração temporária das variáveis de conexão.

No fluxo integrado principal, o catálogo é consultado pelo backend e encaminhado ao módulo de IA no corpo da requisição.

## 3. Componentes de software envolvidos

| Arquivo | Responsabilidade |
|---|---|
| `modulo-ia/app/catalog.py` | Validação, normalização, comparação e consulta dos dados. |
| `modulo-ia/app/repository.py` | Seleção das fontes de dados e consulta ao PostgreSQL. |
| `modulo-ia/app/service.py` | Recebimento das requisições e preparação do catálogo. |
| `modulo-ia/app/fallback.py` | Seleção dos candidatos à recomendação. |
| `modulo-ia/app/recommendation.py` | Cálculo de pontuação, classificação e processamento em lote. |
| `frontend/src/services/produtos.ts` | Comunicação do frontend com o endpoint de recomendações do backend. |
| `frontend/src/components/produto/Recomendados.tsx` | Componente de apresentação de produtos recomendados. |
| `frontend/src/components/recomendacoes/Recomendacoes.tsx` | Componente da área de recomendações. |
| `frontend/src/app/recomendacoes/page.tsx` | Página de recomendações do marketplace. |

As funções de acesso aos dados e seus parâmetros estão detalhados no documento `acesso-dados-ia.md`.

## 4. Fontes de dados utilizadas

### 4.1. Prioridade das fontes

O módulo de IA utiliza a função `get_catalog_items()` para disponibilizar o catálogo conforme a seguinte ordem:

1. Catálogo fornecido explicitamente na requisição ou como parâmetro.
2. PostgreSQL, quando configurado, habilitado e disponível.
3. Catálogo JSON local.

Uma lista vazia fornecida explicitamente é considerada válida e não provoca a consulta às fontes alternativas.

### 4.2. Catálogos utilizados na validação

| Fonte | Total de produtos | Disponíveis | Indisponíveis |
|---|---:|---:|---:|
| `data/catalogo.json` | 8 | 7 | 1 |
| `data/catalogo_origem.json` | 14 | 12 | 2 |
| PostgreSQL | 15 | 13 | 2 |

Os quantitativos do PostgreSQL correspondem ao estado do banco de dados observado durante a validação realizada em 27/11/2026.

Os catálogos JSON são utilizados em cenários controlados de testes e não representam necessariamente o estado atualizado do banco de dados.

### 4.3. Consulta direta ao PostgreSQL

A consulta direta utiliza a visão:

`public.vw_catalogo_recomendacao_ia`

A visão disponibiliza os atributos necessários ao recomendador:

| Atributo | Finalidade |
|---|---|
| `product_id` | Identificação do produto. |
| `name` | Nome do produto. |
| `category` | Categoria comercial. |
| `technique` | Técnica artesanal. |
| `region` | Região de origem. |
| `available` | Disponibilidade para recomendação. |

Na visão consultada, a disponibilidade considera a situação de exclusão lógica, pausa, aprovação e quantidade disponível em estoque.

A validação confirmou a existência da visão, sua estrutura e a recuperação de 15 registros pelo repositório do módulo de IA.

## 5. Critérios de recomendação

### 5.1. Parâmetros utilizados

| Parâmetro do frontend/backend | Parâmetro do módulo de IA | Finalidade |
|---|---|---|
| `produtoId` | `product_id` | Identificar o produto de referência. |
| `categoria` | `category` | Selecionar produtos por categoria. |
| `tecnica` | `technique` | Selecionar produtos por técnica artesanal. |
| `regiao` | `region` | Selecionar produtos por região. |
| `limite` | `limit` | Limitar a quantidade de recomendações. |

Os critérios podem ser obtidos a partir dos atributos do produto de referência ou informados explicitamente pelo usuário.

### 5.2. Normalização dos critérios

A normalização utiliza as funções compartilhadas `normalize_filter()` e `attributes_match()`.

A comparação textual desconsidera espaços excedentes nas extremidades e diferenças entre letras maiúsculas e minúsculas.

A implementação não realiza remoção de acentos, interpretação semântica ou identificação automática de sinônimos.

### 5.3. Elegibilidade dos produtos

A seleção considera os seguintes critérios:

- Pertencimento ao catálogo utilizado.
- Disponibilidade do produto.
- Exclusão do próprio produto de referência.
- Compatibilidade com os atributos do contexto.
- Ausência de identificadores repetidos nos resultados dos cenários validados.
- Respeito ao limite solicitado.
- Pontuação superior a zero nos resultados de recomendação avaliados.

## 6. Estratégia de seleção dos candidatos

### 6.1. Recomendação individual

A recomendação individual utiliza a função `select_candidates()`.

Quando a categoria está presente no contexto, a seleção utiliza estratégias progressivas de flexibilização:

| Prioridade | Critérios |
|---:|---|
| 1 | Categoria, técnica e região. |
| 2 | Categoria e técnica. |
| 3 | Categoria e região. |
| 4 | Categoria. |

Quando a categoria não está presente, são utilizadas as combinações de técnica e região aplicáveis ao contexto.

A flexibilização permite ampliar a quantidade de candidatos sem abandonar integralmente os critérios de compatibilidade.

Quando não existem candidatos compatíveis, o recomendador retorna uma lista vazia.

### 6.2. Recomendação em lote

A recomendação em lote utiliza a função `select_candidates_batch()` e as funções de processamento existentes em `app/recommendation.py`.

Cada produto de referência é processado considerando seus atributos e os candidatos disponíveis no catálogo.

Os candidatos recebem pontuações, são classificados e submetidos ao limite solicitado.

A implementação possui suporte ao processamento sequencial e paralelo, utilizando threads ou processos conforme a configuração aplicável.

### 6.3. Diferença entre as estratégias

A recomendação individual utiliza etapas progressivas de seleção, preservando a categoria quando esse atributo está presente no contexto.

A recomendação em lote utiliza a classificação por pontuação dos candidatos disponíveis, podendo selecionar produtos de categorias diferentes quando existe correspondência com outros atributos.

Portanto, a exclusão de produtos sem compatibilidade não implica equivalência integral entre os resultados individuais e em lote.

A equivalência foi confirmada para cenários específicos registrados nos testes automatizados.

## 7. Cálculo da pontuação

### 7.1. Pesos dos atributos

| Atributo | Peso | Participação |
|---|---:|---:|
| Categoria | 0,50 | 50% |
| Técnica | 0,30 | 30% |
| Região | 0,20 | 20% |
| **Total** | **1,00** | **100%** |

A função `calculate_score()` calcula a pontuação considerando os atributos presentes no contexto.

A pontuação corresponde à soma dos pesos dos atributos compatíveis dividida pela soma dos pesos dos atributos considerados no contexto.

### 7.2. Exemplos de pontuação

Considerando um contexto que contém categoria, técnica e região:

| Correspondência | Pontuação |
|---|---:|
| Categoria, técnica e região | 1,00 |
| Categoria e técnica | 0,80 |
| Categoria e região | 0,70 |
| Categoria | 0,50 |
| Técnica | 0,30 |
| Região | 0,20 |
| Nenhum atributo | 0,00 |

Quando apenas um atributo está presente no contexto, a correspondência integral desse atributo pode resultar em pontuação igual a 1,00.

### 7.3. Ordenação

A função `rank_candidates()` realiza a classificação dos candidatos considerando a pontuação calculada e o identificador do produto como critério de desempate.

Na recomendação individual, a seleção também considera as etapas de flexibilização dos critérios.

Nos testes de recomendação em lote, foi verificada a ordenação decrescente das pontuações.

## 8. Correção implementada na recomendação em lote

### 8.1. Problema identificado

Durante a validação da integração, foi identificado que a recomendação em lote poderia retornar produtos com pontuação igual a zero.

Esse comportamento ocorria quando a quantidade de candidatos compatíveis era inferior ao limite solicitado.

Consequentemente, produtos sem correspondência com os atributos do contexto poderiam integrar a lista de recomendações.

### 8.2. Correção realizada

A função `_rank_single_reference()`, implementada em `app/recommendation.py`, foi ajustada para excluir candidatos com pontuação igual a zero antes da aplicação do limite.

O trecho responsável pela correção é:

```python
ranked = rank_candidates(context, candidates)

compatible = [
    item for item in ranked
    if item["score"] > 0
]

return ref_id, compatible[:limit]
```

A alteração preserva o cálculo da pontuação, a classificação dos candidatos e o limite solicitado.

### 8.3. Validação da correção

Foi utilizado o produto sintético `prod_001` como referência.

| Produto recomendado | Pontuação |
|---|---:|
| `prod_002` | 1,00 |
| `prod_004` | 0,80 |
| `prod_003` | 0,70 |

Antes da correção, a recomendação em lote também retornava os produtos `prod_005`, `prod_007` e `prod_008`, todos com pontuação igual a zero.

Após a correção, esses produtos deixaram de integrar os resultados desse cenário.

Os resultados individuais e em lote passaram a ser equivalentes para o cenário avaliado.

## 9. Integração com os endpoints

### 9.1. Endpoint do backend

`GET /produtos/recomendacoes`

Exemplo de consulta por produto de referência:

`GET /produtos/recomendacoes?produtoId=2001&limite=4`

O endpoint recebe os critérios de recomendação, consulta os produtos e encaminha os dados necessários ao módulo de IA.

### 9.2. Endpoint individual do módulo de IA

`POST /recommendations`

O endpoint recebe o produto de referência ou os filtros informados, o limite e, opcionalmente, o catálogo de produtos.

### 9.3. Endpoint de recomendação em lote

`POST /recommendations/batch`

O endpoint permite processar recomendações para múltiplos produtos de referência.

### 9.4. Identificação da origem das recomendações

O backend utiliza o cabeçalho HTTP `X-Recomendacao-Fonte` para identificar a origem das recomendações.

Nos testes de integração real, foi confirmada a origem `ia` para os cenários de recomendação avaliados.

Os registros de execução do módulo de IA também confirmaram o recebimento de catálogos por meio do corpo das requisições, identificado pelo valor `payload` no atributo `origem_catalogo`.

### 9.5. Tratamento da indisponibilidade do módulo de IA

O backend possui uma estratégia local de recomendação alternativa para situações de indisponibilidade ou falha na comunicação com o módulo de IA.

Os testes unitários confirmaram o comportamento alternativo nos seguintes cenários:

- Resposta HTTP 503 do módulo de IA.
- Erro de comunicação pela rede.
- Falha associada ao tempo limite da comunicação.

Uma resposta válida contendo lista vazia não deve provocar a geração artificial de recomendações incompatíveis.

## 10. Integração com o frontend

A integração utiliza a função `produtosService.recomendados()`, implementada em `frontend/src/services/produtos.ts`.

A função encaminha ao backend os seguintes parâmetros:

- Identificador do produto.
- Categoria.
- Técnica.
- Região.
- Limite de recomendações.

Após o recebimento da resposta, os produtos são normalizados para o formato utilizado pela aplicação.

A normalização contempla os identificadores, nomes, preços, imagens, disponibilidade, dados do artesão, região, motivos e pontuações.

Foram identificados os seguintes pontos de apresentação:

| Página | Finalidade |
|---|---|
| `/produto/2001` | Página de detalhes de um produto utilizado na validação. |
| `/recomendacoes` | Área de recomendações do marketplace. |

Os testes de integração confirmaram a disponibilidade das páginas e o funcionamento do endpoint de recomendações.

Também foram registrados acessos ao serviço de IA durante a validação do ambiente integrado.

Os testes HTTP não substituem testes automatizados de renderização, interação e apresentação visual no navegador.

## 11. Validação com o PostgreSQL

### 11.1. Ambiente utilizado

| Serviço | Porta no ambiente local |
|---|---:|
| PostgreSQL | 5433 |
| Módulo de IA | 3001 |
| Backend | 4000 |
| Frontend | 3000 |

Os quatro serviços foram inicializados utilizando Docker Compose e apresentaram estado `healthy` durante a validação.

O volume existente do PostgreSQL foi preservado.

A inicialização automática do banco pelo backend foi temporariamente desabilitada por meio de um arquivo de configuração complementar localizado fora do repositório, evitando alterações desnecessárias nos dados existentes.

### 11.2. Consulta ao catálogo

A consulta direta realizada pelo repositório confirmou:

| Indicador | Resultado |
|---|---:|
| Tabelas existentes no banco | 21 |
| Produtos consultados | 15 |
| Produtos disponíveis | 13 |
| Produtos indisponíveis | 2 |
| Visão de recomendação | Disponível |

### 11.3. Recomendação por produto de referência

Foi utilizado o produto `2001`, denominado Vaso Cerâmica Raízes.

| Atributo | Valor |
|---|---|
| Categoria | Arte e Decoração |
| Técnica | Cerâmica |
| Região | Zona da Mata - PE |
| Disponibilidade | Disponível |

A execução individual direta do recomendador apresentou:

| Identificador recomendado | Pontuação |
|---|---:|
| 2013 | 1,00 |
| 2002 | 0,80 |
| 2006 | 0,50 |
| 2007 | 0,50 |

Os produtos retornados pertenciam ao catálogo consultado e estavam disponíveis.

O produto de referência não foi incluído nos resultados.

### 11.4. Validação por filtros

| Critério | Valor | Produtos retornados |
|---|---|---:|
| Categoria | Literatura | 2 |
| Técnica | Cerâmica | 5 |
| Região | Agreste - PE | 5 |
| Categoria inexistente | Critério sem correspondência | 0 |

Os resultados foram verificados quanto à compatibilidade com os critérios utilizados.

### 11.5. Validação das referências disponíveis

Foram avaliados os 13 produtos disponíveis no catálogo do PostgreSQL como referências para recomendação em lote.

A validação produziu 57 recomendações, considerando o limite de cinco resultados por referência.

Foram verificados:

- Pertencimento dos produtos recomendados ao catálogo.
- Disponibilidade.
- Exclusão do produto de referência.
- Ausência de duplicidades nos resultados.
- Pontuações superiores a zero e inferiores ou iguais a um.
- Ordenação decrescente das pontuações.
- Respeito ao limite solicitado.

As 57 recomendações correspondem a registros avaliados em uma validação complementar e não são contabilizadas como 57 testes automatizados independentes.

## 12. Testes automatizados implementados

### 12.1. Novo arquivo de testes

Foi criado o arquivo:

`modulo-ia/tests_dados/test_integracao_recomendador.py`

O arquivo contém testes específicos para a integração das funções de acesso aos dados com o fluxo de recomendação.

### 12.2. Cenários avaliados

| Cenário | Quantidade de testes |
|---|---:|
| Recomendação individual com os dois catálogos e limites 1, 5 e 20 | 6 |
| Recomendação em lote com os dois catálogos e limites 1, 5 e 20 | 6 |
| Exclusão de candidatos com pontuação zero | 1 |
| Equivalência individual e em lote em cenário controlado | 1 |
| Ausência de produtos compatíveis | 1 |
| Catálogo vazio | 1 |
| Ausência de produtos de referência | 1 |
| **Total** | **17** |

### 12.3. Critérios verificados

Os testes verificam:

- Utilização do catálogo disponibilizado pelo repositório.
- Compatibilidade dos produtos recomendados.
- Pertencimento ao catálogo.
- Disponibilidade dos produtos.
- Exclusão do produto de referência.
- Ausência de duplicidades.
- Respeito aos limites solicitados.
- Pontuações válidas.
- Correspondência entre a pontuação retornada e a função de cálculo.
- Ordenação decrescente na recomendação em lote.
- Tratamento de catálogos vazios.
- Tratamento da ausência de candidatos compatíveis.

## 13. Testes de integração com o backend e o frontend

### 13.1. Testes unitários do backend

Arquivo:

`backend/app/tests/recomendacoes.unit.test.ts`

| Cenário | Resultado |
|---|---|
| Envio do catálogo e autenticação ao módulo de IA | Aprovado |
| Preservação de resposta vazia | Aprovado |
| Recomendação alternativa após resposta HTTP 503 | Aprovado |
| Recomendação alternativa após erro de comunicação | Aprovado |
| Produto de referência inexistente | Aprovado |
| Contrato JSON e cabeçalho de origem | Aprovado |

**Total:** 6 testes aprovados.

Esses testes utilizam simulações controladas das dependências do backend.

### 13.2. Testes de integração real

Arquivo:

`frontend/tests/api/recomendacoes-integracao.test.ts`

| Cenário | Resultado |
|---|---|
| Disponibilidade dos serviços e páginas | Aprovado |
| Recomendação por produto com catálogo real | Aprovado |
| Recomendação por técnica artesanal | Aprovado |
| Recomendação por região | Aprovado |
| Ausência de candidatos elegíveis | Aprovado |
| Produto de referência inexistente | Aprovado |

**Total:** 6 testes aprovados.

Os testes foram executados com os serviços do frontend, backend, PostgreSQL e módulo de IA disponíveis no ambiente local.

Não houve necessidade de utilizar a recomendação alternativa do backend nos cenários em que a origem `ia` foi exigida.

## 14. Resultado consolidado dos testes de regressão

| Grupo de testes | Aprovados | Falhas |
|---|---:|---:|
| Testes de dados, acesso aos dados e integração do recomendador | 194 | 0 |
| Suíte original do módulo de IA | 33 | 0 |
| Testes unitários de recomendação do backend | 6 | 0 |
| Testes de integração real | 6 | 0 |
| **Total** | **239** | **0** |

**Taxa de aprovação:** 100% dos testes contabilizados.

Os 17 novos testes de integração estão incluídos nos 194 testes do primeiro grupo e não são contabilizados novamente.

Os resultados correspondem às suítes selecionadas para a validação deste cartão, não representando a execução integral de todos os testes existentes no marketplace Origem.

## 15. Reprodução dos testes

### 15.1. Testes de dados e integração do recomendador

A partir do diretório `modulo-ia`, no Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pytest tests_dados -v
```

### 15.2. Testes específicos da integração do recomendador

```powershell
.\.venv\Scripts\python.exe -m pytest tests_dados/test_integracao_recomendador.py -v
```

### 15.3. Suíte original do módulo de IA

A partir da raiz do projeto, com as configurações necessárias do ambiente:

```powershell
docker compose -p origem build --no-cache modulo-ia
```

O estágio de testes do Dockerfile executa a suíte original localizada no diretório `tests`.

Os testes do diretório `tests_dados` são executados separadamente.

### 15.4. Testes unitários do backend

A partir do diretório `backend/app`:

```powershell
npm ci
npx prisma generate
npm run test:unit -- --runInBand --runTestsByPath tests/recomendacoes.unit.test.ts --verbose
```

### 15.5. Testes de integração real

Com os quatro serviços inicializados e disponíveis, a partir do diretório `frontend`:

```powershell
npm ci
$env:BACKEND_URL = "http://localhost:4000"
$env:FRONTEND_BASE_URL = "http://localhost:3000"
$env:IA_BASE_URL = "http://localhost:3001"
$env:RECOMENDACAO_API_URL = "http://localhost:3001"
npm run test:api -- --runTestsByPath tests/api/recomendacoes-integracao.test.ts --verbose
```

Após a execução:

```powershell
Remove-Item Env:BACKEND_URL -ErrorAction SilentlyContinue
Remove-Item Env:FRONTEND_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:IA_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:RECOMENDACAO_API_URL -ErrorAction SilentlyContinue
```

A reprodução dos testes depende da configuração válida do ambiente, da disponibilidade dos serviços e da existência dos produtos utilizados como referência.

As credenciais de acesso devem permanecer nas configurações locais e não devem ser incluídas no repositório.

## 16. Ocorrências identificadas durante a integração

| Ocorrência | Tratamento |
|---|---|
| Recomendações em lote com pontuação zero | Correção implementada e validada. |
| Divergência inicial na configuração do catálogo dos testes | Configuração ajustada e testes executados novamente. |
| Ausência inicial dos containers do projeto | Serviços recriados preservando o volume existente. |
| Divergência nas credenciais de conexão ao PostgreSQL | Configuração local corrigida e conexão validada. |
| Ausência das dependências locais do backend | Instalação realizada com `npm ci`. |
| Ausência das dependências locais do frontend | Instalação realizada com `npm ci`. |
| Avisos de descontinuação das dependências Python | Registrados para avaliação posterior. |
| Vulnerabilidades moderadas nas dependências do backend | 18 ocorrências informadas pelo npm, pendentes de avaliação. |
| Vulnerabilidades moderadas nas dependências do frontend | 24 ocorrências informadas pelo npm, pendentes de avaliação. |

As ocorrências corrigidas não impediram a aprovação das suítes de testes selecionadas.

Os avisos e vulnerabilidades das dependências permanecem registrados como pendências técnicas.

## 17. Limitações e pendências

A integração foi validada em ambiente local, utilizando catálogos controlados e uma instância do PostgreSQL disponibilizada por Docker.

Permanecem como limitações ou pontos de avaliação:

- Diferenças entre os registros dos catálogos JSON e o estado atual do PostgreSQL.
- Diferenças entre as estratégias de recomendação individual e em lote.
- Diferenças no tratamento padrão de registros sem o atributo `available`.
- Ausência de testes automatizados de renderização visual do frontend no escopo desta validação.
- Necessidade de revisão da consistência das imagens associadas aos produtos.
- Avaliação do desempenho com volumes maiores de dados.
- Identificação mais detalhada das fontes de dados nos registros de execução.
- Diferenciação dos motivos de falha nas consultas ao PostgreSQL.
- Avaliação das vulnerabilidades e dos avisos das dependências.
- Inclusão futura dos testes de dados no estágio automatizado de testes do Dockerfile.
- Validação em ambientes de homologação e produção.

O módulo utiliza uma estratégia de recomendação baseada em atributos e pesos predefinidos.

A pontuação representa a compatibilidade calculada entre os atributos e não uma probabilidade estatística de interesse ou compra pelo usuário.

## 18. Rastreabilidade dos critérios do cartão

| Critério | Implementação ou evidência | Situação |
|---|---|---|
| Integrar a consulta ao fluxo de recomendação existente. | Repositório, serviço de IA e fluxo integrado com o backend. | Validado |
| Aplicar os filtros definidos para categoria, técnica e região. | Funções de seleção e testes com JSON e PostgreSQL. | Validado |
| Verificar a compatibilidade dos produtos retornados com o contexto informado. | Testes de compatibilidade e exclusão de pontuação zero. | Validado |
| Validar a ordenação ou pontuação das recomendações, quando aplicável. | Cálculo de pontuação, classificação e testes automatizados. | Validado |
| Garantir que os produtos recomendados pertençam ao catálogo. | Verificação dos identificadores e da disponibilidade nos cenários testados. | Validado |
| Testar o fluxo completo de consulta e recomendação. | Testes automatizados e integração real entre os serviços. | Validado |
| Verificar a integração com o ponto de entrada utilizado pelo frontend, se aplicável. | Serviço de produtos, endpoint do backend e testes HTTP de integração. | Validado no escopo HTTP |

## 19. Documentação e evidências relacionadas

| Arquivo | Finalidade |
|---|---|
| `docs/analise-catalogo.md` | Análise da estrutura e composição dos catálogos. |
| `docs/validacao-dados-ia.md` | Critérios de integridade e validação dos dados. |
| `docs/acesso-dados-ia.md` | Documentação das funções de acesso aos dados. |
| `docs/integracao-recomendador-ia.md` | Documentação da integração com o recomendador. |
| `tests_dados/test_integracao_recomendador.py` | Testes automatizados específicos da integração. |

As evidências consolidadas das execuções deverão ser registradas na etapa de documentação das evidências do cartão.

## 20. Conclusão

As funções de acesso aos dados foram integradas ao fluxo de recomendação do marketplace Origem, permitindo a utilização dos atributos de categoria, técnica e região na seleção de produtos compatíveis.

A validação identificou e corrigiu a inclusão de produtos com pontuação igual a zero na recomendação em lote.

Foram implementados 17 novos testes automatizados específicos da integração, incorporados à suíte de testes de dados.

A validação consolidada totalizou 239 testes aprovados, sem falhas nas suítes selecionadas.

Também foi confirmada a consulta direta ao PostgreSQL e a comunicação entre o backend e o módulo de IA utilizando o catálogo armazenado no banco de dados.

Os resultados demonstram o atendimento aos critérios funcionais do cartão no ambiente local e estabelecem a base técnica para as próximas etapas de implementação de registros de execução, testes complementares, monitoramento e documentação do módulo de IA.
