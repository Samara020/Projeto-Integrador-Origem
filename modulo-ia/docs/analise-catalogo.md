# Análise do catálogo de produtos — Módulo de IA

**Projeto:** Origem — Marketplace de Artesanato Pernambucano  
**Versão:** 1.0  
**Data:** 27/11/2026  
**Branch:** `feat/modulo-ia-dados`

## 1. Objetivo

Documentar a análise, a estruturação e a validação da base de dados mockada utilizada pelo módulo de inteligência artificial do marketplace Origem, garantindo a disponibilidade de informações completas e consistentes para a geração de recomendações de produtos artesanais.

## 2. Fontes de dados

| Arquivo | Finalidade |
|---|---|
| `modulo-ia/data/catalogo_origem.json` | Catálogo mockado baseado nos produtos do Origem. |
| `modulo-ia/data/catalogo.json` | Catálogo sintético utilizado nos testes de recomendação. |
| `database/sql/05_seed_dados_reais.sql` | Script de inserção dos dados iniciais do PostgreSQL. |
| `database/sql/10_estrutura_modulo_ia.sql` | Estrutura SQL destinada ao módulo de IA. |
| `modulo-ia/app/catalog.py` | Carregamento e consulta do catálogo. |
| `modulo-ia/app/repository.py` | Acesso às fontes de dados do módulo de IA. |

## 3. Estrutura dos dados

Foram definidos seis atributos necessários à identificação, classificação e recomendação dos produtos.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `product_id` | String | Sim | Identificador único do produto. |
| `name` | String | Sim | Nome do produto artesanal. |
| `category` | String | Sim | Categoria comercial do produto. |
| `technique` | String | Sim | Técnica artesanal empregada na produção. |
| `region` | String | Sim | Região de origem do produto. |
| `available` | Boolean | Sim | Indicação de disponibilidade do produto. |

## 4. Correspondência com o catálogo do Origem

Foi realizada a comparação nominal entre os produtos presentes no arquivo `catalogo_origem.json` e os registros do script `05_seed_dados_reais.sql`.

| Produto | ID mockado | ID PostgreSQL (seed) |
|---|---|---|
| Vaso Cerâmica Raízes | prd_201 | 2001 |
| Luminária de Barro | prd_202 | 2002 |
| Pássaro de Madeira | prd_203 | 2003 |
| Toalha Bordada Ponto Cheio | prd_204 | 2004 |
| Galo do Alto do Moura | prd_205 | 2005 |
| Carranca Guardiã | prd_206 | 2006 |
| Xilogravura A Chegada da Chuva | prd_207 | 2007 |
| Matriz Entalhada Pavão | prd_208 | 2008 |
| Folheto O Vaqueiro e a Lua | prd_209 | 2009 |
| Coleção Pajeú em Versos | prd_210 | 2010 |
| Caminho de Mesa Richelieu | prd_211 | 2011 |
| Moringa com Caneca | prd_212 | 2012 |
| Santo Antônio de Barro | prd_213 | 2013 |
| Trio de Aves do Sertão | prd_214 | 2014 |

A análise identificou correspondência nominal de 14 dos 14 produtos, representando 100% de correspondência entre os registros comparados.

### 4.1. Diferenças identificadas

- O catálogo mockado utiliza identificadores textuais com o prefixo `prd_`, enquanto o script SQL utiliza identificadores numéricos.
- As regiões cadastradas no script SQL apresentam o sufixo `- PE`, ausente no catálogo mockado.
- A técnica Entalhe em madeira apresenta diferença de capitalização entre as fontes.

Os identificadores originais foram preservados, evitando alterações não planejadas nos contratos existentes. A tabela de correspondência permite identificar os produtos equivalentes entre as fontes.

## 5. Diversidade do catálogo

O catálogo mockado do Origem contempla três categorias, cinco técnicas artesanais e quatro regiões de Pernambuco.

### 5.1. Categorias

- Arte e Decoração.
- Artesanato.
- Literatura.

### 5.2. Técnicas artesanais

- Cerâmica.
- Entalhe em madeira.
- Bordado.
- Xilogravura.
- Cordel.

### 5.3. Regiões

- Zona da Mata.
- Agreste.
- Sertão do São Francisco.
- Sertão do Pajeú.

Essa diversidade permite explorar diferentes características dos produtos durante a geração de recomendações.

## 6. Validação da integridade dos dados

Foram implementados testes automatizados no arquivo `modulo-ia/tests_dados/test_catalogo.py`, contemplando os dois catálogos JSON.

| Critério de validação | Executados | Aprovados |
|---|---:|---:|
| Catálogos não vazios | 2 | 2 |
| Identificadores únicos | 2 | 2 |
| Presença dos campos obrigatórios | 2 | 2 |
| Validade dos campos textuais | 2 | 2 |
| Disponibilidade booleana | 2 | 2 |
| Diversidade de categorias | 2 | 2 |
| Diversidade de técnicas | 2 | 2 |
| Diversidade de regiões | 2 | 2 |
| **Total** | **16** | **16** |

## 7. Evidências da execução

**Data da execução:** 27/11/2026

| Indicador | Resultado |
|---|---|
| Sistema operacional | Windows |
| Versão do Python | 3.13.14 |
| Versão do pytest | 9.2.0 |
| Testes executados | 16 |
| Testes aprovados | 16 |
| Testes reprovados | 0 |
| Taxa de aprovação | 100% |
| Tempo de execução | 0,06 segundos |

Resultado registrado:

`16 passed in 0.06s`

A evidência completa da execução está localizada em:

`modulo-ia/docs/evidencias/testes-integridade-catalogo.txt`

## 8. Reprodução dos testes

A partir do diretório `modulo-ia`, executar:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install pytest==9.2.0
.\.venv\Scripts\python.exe -m pytest tests_dados -v
```

Os testes de integridade dos arquivos JSON não dependem da inicialização do PostgreSQL ou do servidor BentoML.

## 9. Escopo e limitações da validação

A comparação com o catálogo do Origem foi realizada utilizando o script SQL de inserção dos dados iniciais.

Os testes automatizados validam a estrutura, a unicidade dos identificadores, o preenchimento dos atributos, os tipos de dados e a diversidade dos catálogos mockados.

Esta validação não contempla a execução de consultas em uma instância ativa do PostgreSQL, a equivalência dinâmica da disponibilidade dos produtos entre as fontes ou os testes de integração do serviço de recomendação.

## 10. Conclusão

A base de dados mockada do módulo de inteligência artificial foi estruturada e validada conforme os requisitos estabelecidos para o cartão de desenvolvimento.

Os produtos analisados apresentam correspondência nominal com os registros do script de dados iniciais do Origem, atributos necessários à recomendação, identificadores únicos dentro de cada catálogo e diversidade de categorias, técnicas artesanais e regiões.

A aprovação dos 16 testes automatizados comprova o atendimento aos critérios de integridade avaliados, disponibilizando uma base de dados adequada para os testes e o desenvolvimento do módulo de recomendação.