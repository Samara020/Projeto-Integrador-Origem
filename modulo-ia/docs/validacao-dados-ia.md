# Validação dos dados utilizados pela IA

**Projeto:** Origem — Marketplace de Artesanato Pernambucano

**Versão:** 1.0

**Data:** 27/11/2026

**Branch:** `feat/modulo-ia-dados`

## 1. Objetivo

Validar a qualidade, a completude e a consistência dos dados mockados utilizados pelo módulo de inteligência artificial do marketplace Origem, verificando se os catálogos contemplam os diferentes cenários necessários à recomendação de produtos artesanais.

## 2. Escopo da validação

A validação contempla os seguintes arquivos:

| Arquivo | Finalidade |
|---|---|
| `data/catalogo.json` | Catálogo sintético utilizado nos testes. |
| `data/catalogo_origem.json` | Catálogo mockado baseado nos produtos do Origem. |
| `tests_dados/test_catalogo.py` | Testes automatizados de integridade dos dados. |
| `tests_dados/test_validacao_recomendacao.py` | Testes dos cenários de recomendação. |
| `app/fallback.py` | Seleção dos candidatos à recomendação. |

## 3. Critérios de validação

### 3.1. Presença dos campos obrigatórios

Todos os registros devem apresentar os seguintes atributos:

- `product_id`;
- `name`;
- `category`;
- `technique`;
- `region`;
- `available`.

### 3.2. Identificação de duplicidades e inconsistências

Foram estabelecidos os seguintes critérios:

- Identificadores únicos dentro de cada catálogo.
- Ausência de registros integralmente duplicados.
- Ausência de duplicidades descritivas nos catálogos mockados.
- Unicidade dos identificadores após normalização.
- Ausência de espaços excedentes nos campos textuais.
- Conformidade dos atributos com os tipos de dados definidos.

A duplicidade descritiva constitui um critério de qualidade da base mockada, não uma restrição universal aplicável ao marketplace.

### 3.3. Verificação de valores ausentes

Os atributos textuais devem apresentar valores válidos, não nulos e não vazios.

Os campos utilizados pelos filtros de recomendação são:

- Categoria (`category`);
- Técnica artesanal (`technique`);
- Região (`region`).

O atributo `available` deve apresentar valor booleano.

### 3.4. Diversidade dos dados

Os catálogos devem contemplar diferentes categorias, técnicas artesanais e regiões, além de produtos disponíveis e indisponíveis.

Essa diversidade permite avaliar o comportamento do recomendador em diferentes condições de utilização.

## 4. Cenários de teste

| Cenário | Execuções | Resultado |
|---|---:|---|
| Recomendação por categoria | 2 | Aprovado |
| Recomendação por técnica artesanal | 3 | Aprovado |
| Recomendação por região | 2 | Aprovado |
| Combinação de categoria, técnica e região | 1 | Aprovado |
| Categoria inexistente | 2 | Aprovado |
| Técnica inexistente | 2 | Aprovado |
| Região inexistente | 2 | Aprovado |
| Todos os filtros incompatíveis | 2 | Aprovado |
| Ausência de filtros | 2 | Aprovado |
| Catálogo vazio | 1 | Aprovado |
| Todos os produtos indisponíveis | 1 | Aprovado |
| **Total** | **20** | **Aprovado** |

## 5. Comportamento na ausência de produtos compatíveis

Foram avaliados cenários nos quais não existem produtos compatíveis com os critérios informados.

Nos cenários testados, a função `select_candidates()` retornou uma lista vazia, conforme o comportamento esperado.

Também foram validados os cenários de catálogo vazio, ausência de filtros e indisponibilidade de todos os produtos.

## 6. Resultados dos testes automatizados

### 6.1. Testes de integridade

| Critério | Executados | Aprovados |
|---|---:|---:|
| Catálogos não vazios | 2 | 2 |
| Identificadores únicos | 2 | 2 |
| Campos obrigatórios | 2 | 2 |
| Validade dos campos textuais | 2 | 2 |
| Disponibilidade booleana | 2 | 2 |
| Diversidade de categorias | 2 | 2 |
| Diversidade de técnicas | 2 | 2 |
| Diversidade de regiões | 2 | 2 |
| Ausência de registros duplicados | 2 | 2 |
| Ausência de duplicidades descritivas | 2 | 2 |
| Identificadores normalizados únicos | 2 | 2 |
| Ausência de espaços excedentes | 2 | 2 |
| Existência de produtos disponíveis | 2 | 2 |
| Existência de produtos indisponíveis | 2 | 2 |
| **Total** | **28** | **28** |

### 6.2. Resultado consolidado

| Indicador | Resultado |
|---|---|
| Data da execução | 27/11/2026 |
| Sistema operacional | Windows |
| Python | 3.13.14 |
| pytest | 9.2.0 |
| Testes de integridade | 28 |
| Testes de recomendação | 20 |
| Total de testes executados | 48 |
| Testes aprovados | 48 |
| Testes reprovados | 0 |
| Taxa de aprovação | 100% |
| Tempo da execução consolidada inicial | 0,19 segundos |

Resultado da execução consolidada inicial:

`48 passed in 0.19s`

## 7. Rastreabilidade dos critérios de aceite

| Requisito do cartão | Evidência | Situação |
|---|---|---|
| Verificar a presença dos campos obrigatórios | `test_campos_obrigatorios` | Atendido |
| Identificar registros duplicados ou inconsistentes | Testes de unicidade, duplicidade e consistência | Atendido |
| Verificar valores ausentes nos campos utilizados pelos filtros | `test_campos_textuais_validos` | Atendido |
| Criar casos de teste com diferentes categorias, técnicas e regiões | `test_recomendacao_por_atributos` | Atendido |
| Validar o comportamento quando não houver produtos compatíveis | `test_sem_produtos_compativeis`, `test_catalogo_vazio` e `test_catalogo_com_todos_produtos_indisponiveis` | Atendido |
| Registrar os critérios de validação | Presente documento | Atendido |

## 8. Evidências

O registro da execução dos testes está disponível em:

`docs/evidencias/testes-validacao-dados-ia.txt`

A documentação da etapa anterior permanece disponível em:

`docs/analise-catalogo.md`

## 9. Reprodução dos testes

A partir do diretório `modulo-ia`, executar:

```powershell
.\.venv\Scripts\python.exe -m pytest tests_dados -v
```

Os testes utilizam os catálogos JSON e as funções Python de seleção de candidatos.

## 10. Limitações

A validação está restrita aos catálogos mockados e aos cenários de recomendação executados diretamente nas funções Python.

Não contempla testes de integração HTTP, consultas a uma instância ativa do PostgreSQL ou monitoramento do desempenho em ambiente de produção.

## 11. Conclusão

Os dados mockados utilizados pelo módulo de inteligência artificial foram submetidos a testes automatizados de integridade e de seleção de candidatos à recomendação.

A aprovação dos 48 testes demonstra o atendimento aos critérios de validação estabelecidos para esta atividade, incluindo a completude dos atributos, a consistência dos registros, a diversidade dos dados e o comportamento na ausência de produtos compatíveis.

Os resultados fornecem evidências para a continuidade das atividades de acesso aos dados, integração e monitoramento do módulo de inteligência artificial.