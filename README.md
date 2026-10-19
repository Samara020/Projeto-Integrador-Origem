# Origem

### Marketplace da Economia Criativa e do Artesanato de Pernambuco

**Projeto Integrador, ADS**
**CESAR School, 4º Semestre, 2026.2**

> **Avaliação de IA (AV2):** instruções de instalação, tabela de requisitos e casos de teste estão na seção [Módulo de IA](#módulo-de-ia-recomendação-de-produtos-av2).

## Sobre o projeto

O Origem é uma aplicação web full stack que conecta artesãos e empreendedores criativos de Pernambuco a compradores de todo o país.

A plataforma oferece uma vitrine e um canal de venda para quem produz, valorizando a técnica, a origem e a história de cada peça.

## Problema

Artesãos e produtores criativos enfrentam dificuldades relacionadas à:

* Baixa visibilidade digital;
* Dependência de intermediários;
* Gestão de catálogo;
* Gestão de pedidos;
* Controle de estoque.

O Origem busca criar um canal que conecte essa produção aos compradores, destacando a origem, a técnica e o impacto de comprar diretamente de quem produz.

## Solução

A plataforma reúne uma vitrine para compradores, ferramentas de gerenciamento para artesãos e um painel administrativo, integrando recursos de busca, compra, gestão e recomendação de produtos.

## Features

### Comprador

* Vitrine de produtos;
* Busca por produtos;
* Filtros por técnica e região;
* Visualização dos detalhes do produto;
* Perfil do artesão;
* Carrinho;
* Pedidos;
* Avaliações;
* Recomendação de produtos.

### Artesão

* Gerenciamento de catálogo;
* Controle de estoque;
* Gerenciamento de pedidos.

### Administrador

* Painel administrativo;
* Gestão da plataforma;
* Indicadores de venda.

### Inteligência Artificial

O projeto contempla um módulo de Inteligência Artificial voltado para:

* Recomendação de produtos;
* Classificação automática de produtos;
* Análise de sentimento das avaliações;
* Previsão de demanda, de forma opcional.

A recomendação parte de um baseline simples, considerando características como técnica, região e popularidade, antes de abordagens mais sofisticadas.

## Stack

* **Node.js e TypeScript:** frontend Next.js.
* **C# e .NET 10:** API da demonstração de concorrência e fila em memória.
* **PostgreSQL:** previsto na arquitetura, ainda não utilizado por esta demonstração.

## Arquitetura

O Origem prevê a integração dos seguintes componentes:

* Frontend responsivo;
* Backend e APIs;
* Banco de dados;
* Módulo de Inteligência Artificial;
* Processamento assíncrono;
* Autenticação;
* Cache.

A arquitetura planejada conecta os requisitos do sistema, o banco de dados, a aplicação web, a Inteligência Artificial e os mecanismos de concorrência e processamento assíncrono.

O estado atual desta branch implementa o frontend com dados simulados no navegador e uma API C# para a compra concorrente do produto `prd_201`. O roteiro e os limites dessa demonstração estão em [`backend/README.md`](backend/README.md).

## Fluxo principal

```text
Buscar produto
      ↓
Aplicar filtros
      ↓
Visualizar produto
      ↓
Acessar perfil do artesão
      ↓
Adicionar ao carrinho
      ↓
Confirmar pedido
```

## Fluxos implementados

### Acesso e usuários
- Login
- Cadastro
- Recuperação de senha
- Perfil do comprador
- Perfil do artesão e edição
- Perfil do administrador

### Catálogo e produtos
- Home e vitrine
- Catálogo e busca
- Detalhes do produto
- Loja do artesão
- Cadastro de peça
- Personalização de peça
- Comparação de peças
- Recomendações personalizadas

### Compra
- Carrinho
- Checkout
- Pagamento
- Confirmação de pagamento
- Pagamento recusado
- Visualização de compras
- Acompanhamento do pedido

### Gestão do artesão
- Dashboard do artesão
- Gestão de estoque
- Gestão de pedidos
- Transporte e embalagem
- Avaliações
- Controle de peças únicas: disponível, reservada e vendida

### Administração
- Dashboard do administrador
- Validação de origem: pendente, aprovada e rejeitada
- Moderação de conteúdo

### Suporte e IA
- Central de suporte
- Chat com IA para triagem
- Escalonamento para atendimento humano

### Estados e exceções
- Estado vazio
- Erro 500
- Confirmação
- Indisponibilidade
- Alerta de estoque baixo
- Estado de carregamento

## Futura integração com o backend

A Fake API será utilizada inicialmente para permitir o desenvolvimento e validação do frontend. Na etapa de integração, os endpoints simulados serão substituídos pelos endpoints do backend real, mantendo os mesmos contratos de requisição e resposta sempre que possível.

A integração seguirá o fluxo:

**Frontend → API real → Backend → Banco de dados PostgreSQL**

As chamadas atualmente direcionadas à Fake API serão ajustadas para a URL da API real, mantendo as telas e fluxos já desenvolvidos. A autenticação, persistência dos dados, estoque, pedidos e demais regras de negócio passarão a ser processados pelo backend.

## Integração entre disciplinas

O projeto integra as contribuições das disciplinas do 4º semestre:

* **Desenvolvimento Web:** construção da aplicação web full stack, frontend, backend e APIs;
* **Modelagem e Projeto de Banco de Dados:** modelagem e estruturação dos dados;
* **Requisitos, Projeto de Software e Validação:** análise de domínio, requisitos, arquitetura e testes;
* **Fundamentos de Computação Concorrente, Paralela e Distribuída:** concorrência, processamento assíncrono, distribuição e desempenho;
* **Engenharia de Software e IA:** recomendação, classificação automática e análise de sentimento.

## Escopo e limitações

O projeto possui escopo controlado para o período letivo, considerando:

* Poucas categorias de produtos;
* Dados representativos e sintéticos;
* Recomendação e classificação em nível didático;
* Pagamento simulado, sem gateways reais;
* Distribuição limitada.

Também são considerados o respeito à origem cultural e a autoria das peças.

## Objetivo

Desenvolver uma aplicação web full stack que conecte artesãos e empreendedores criativos de Pernambuco a compradores de todo o país, valorizando a origem, a técnica e a história dos produtos.

O projeto busca integrar, em um único produto, as contribuições das diferentes disciplinas do Projeto Integrador, incluindo desenvolvimento web, banco de dados, requisitos, concorrência e Inteligência Artificial.

## Execução

**Requisitos:** Git, Node.js 20+ e npm. Compatível com Windows, macOS e Linux.

```bash
git clone https://github.com/Samara020/Projeto-Integrador-Origem.git
cd Projeto-Integrador-Origem/frontend
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Para validar a compilação:

```bash
npm run build
```

## Módulo de IA: recomendação de produtos (AV2)

Mockup executável do módulo especificado na AV1 (HU-17, documento [`docs/Baseline de IA.pdf`](docs/Baseline%20de%20IA.pdf)). Trilha A: recomendação/ranqueamento com **BentoML**.

O serviço recebe um produto de referência ou filtros (categoria, técnica, região), compara os atributos dos produtos, calcula um score de relação, ordena os candidatos e devolve as recomendações com uma justificativa. Os dados são sintéticos e ficam em `modulo-ia/data/catalogo_origem.json` (14 produtos). O código fica em [`modulo-ia/`](modulo-ia/).

### Requisitos

- Git
- Python 3.13 ou superior

### Instalação

Na raiz do repositório clonado.

**Linux / macOS:**

```bash
python3 -m venv .venv-ia
source .venv-ia/bin/activate
pip install -r modulo-ia/requirements.txt
```

**Windows (PowerShell):**

```powershell
python -m venv .venv-ia
.\.venv-ia\Scripts\Activate.ps1
pip install -r modulo-ia\requirements.txt
```

> Se o PowerShell bloquear o `Activate.ps1`, rode antes `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Como subir

Com o ambiente ativado:

```bash
cd modulo-ia
bentoml serve app.service:RecommendationService --port 3001
```

O serviço está pronto quando aparecer `Service RecommendationService initialized`. Ele responde em `http://localhost:3001`. Deixe esse terminal aberto e rode os testes em outro.

### Endpoint

`POST /recommendations`

| Item | Valor |
|---|---|
| Cabeçalho obrigatório | `X-API-Key: origem-mockup-key` |
| Entrada | `product_id` (produto de referência) **ou** pelo menos um filtro: `category`, `technique`, `region`. Opcional: `limit` (padrão 5, de 1 a 20) |
| Saída (200) | `{"recommendations": [{"product_id", "score", "reason"}]}`, ordenada pelo score |
| Erros | `400` entrada ou limite inválido · `401` sem chave · `403` chave inválida · `404` produto inexistente |

### Requisitos da AV1 → endpoint

| Requisito da AV1 | Como aparece no endpoint `POST /recommendations` |
|---|---|
| RF-01 Receber produto de referência ou filtros | Corpo aceita `product_id` ou `category`, `technique`, `region` |
| RF-02 Selecionar candidatos elegíveis | Lista `recommendations` só traz produtos elegíveis do catálogo |
| RF-03 Considerar só produtos disponíveis | Produtos com `available: false` nunca aparecem na resposta |
| RF-04 Excluir o produto de referência | O `product_id` enviado nunca volta na lista |
| RF-05 Comparar categoria, técnica e região | Atributos comparados entre o contexto e cada candidato |
| RF-06 Calcular score de relação | Campo `score` (categoria 50%, técnica 30%, região 20%) |
| RF-07 Ordenar candidatos | Lista ordenada do maior para o menor `score` |
| RF-08 Quantidade padrão 5, máximo 20 | Campo `limit`; acima de 20 retorna `400` |
| RF-09 Informar justificativa | Campo `reason` de cada item |
| RF-10 Aplicar fallback | Critérios relaxados em etapas (categoria+técnica+região → … → só categoria) |
| RF-11 Retornar lista vazia | `{"recommendations": []}` quando não há candidatos |
| RF-12 Responder pela integração com o Origem | O endpoint é chamado pela rota `GET /api/produtos/recomendacoes` do frontend |
| RNF-02 Validar entradas | Respostas `400` e `404` |
| RNF-03 Autenticação e autorização | Cabeçalho `X-API-Key`; respostas `401` e `403` |
| RNF-07 Indisponibilidade | Se o serviço cair, o frontend usa as sugestões locais e a página continua funcionando |

### Casos de teste

Com o serviço rodando (passo "Como subir"), abra **outro terminal** e rode os comandos abaixo.

#### Caso 1: recomendação a partir de um produto

Pede recomendações para o produto `prd_201` (Vaso Cerâmica Raízes: Arte e Decoração, Cerâmica, Zona da Mata).

**Linux / macOS:**

```bash
curl -s -X POST http://localhost:3001/recommendations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: origem-mockup-key" \
  -d '{"product_id": "prd_201", "limit": 5}'
```

**Windows (PowerShell):**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/recommendations -Headers @{"X-API-Key"="origem-mockup-key"} -ContentType "application/json" -Body '{"product_id": "prd_201", "limit": 5}' | ConvertTo-Json -Depth 5
```

**Resultado esperado (HTTP 200):**

```json
{
  "recommendations": [
    { "product_id": "prd_213", "score": 1.0, "reason": "Recomendado por mesma categoria, mesma técnica artesanal, mesma região." },
    { "product_id": "prd_202", "score": 0.8, "reason": "Recomendado por mesma categoria, mesma técnica artesanal." },
    { "product_id": "prd_207", "score": 0.5, "reason": "Recomendado por mesma categoria." }
  ]
}
```

O que conferir: `prd_201` não aparece (RF-04); a lista está em ordem de score (RF-07); cada item tem justificativa (RF-09). Vêm só 3 itens, mesmo com `limit` 5, porque os outros produtos de Arte e Decoração estão reservados ou vendidos (RF-03).

#### Caso 2: recomendação só por filtro, sem produto de referência

Pede recomendações para a categoria `Literatura`.

**Linux / macOS:**

```bash
curl -s -X POST http://localhost:3001/recommendations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: origem-mockup-key" \
  -d '{"category": "Literatura", "limit": 5}'
```

**Windows (PowerShell):**

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3001/recommendations -Headers @{"X-API-Key"="origem-mockup-key"} -ContentType "application/json" -Body '{"category": "Literatura", "limit": 5}' | ConvertTo-Json -Depth 5
```

**Resultado esperado (HTTP 200):**

```json
{
  "recommendations": [
    { "product_id": "prd_209", "score": 1.0, "reason": "Recomendado por mesma categoria." },
    { "product_id": "prd_210", "score": 1.0, "reason": "Recomendado por mesma categoria." }
  ]
}
```

O que conferir: o módulo aceita só filtros (RF-01). O score é calculado apenas com o atributo informado, e a justificativa cita só esse atributo (RNF-06).

#### Caso 3: produto de referência inexistente

Pede recomendações para um produto que não existe no catálogo.

**Linux / macOS:**

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3001/recommendations \
  -H "Content-Type: application/json" \
  -H "X-API-Key: origem-mockup-key" \
  -d '{"product_id": "prd_999", "limit": 5}'
```

**Windows (PowerShell):**

```powershell
try { Invoke-RestMethod -Method Post -Uri http://localhost:3001/recommendations -Headers @{"X-API-Key"="origem-mockup-key"} -ContentType "application/json" -Body '{"product_id": "prd_999", "limit": 5}' } catch { "HTTP " + $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }
```

**Resultado esperado (HTTP 404):**

```json
{"error": {"code": "PRODUCT_NOT_FOUND", "message": "Produto de referência não encontrado."}}
HTTP 404
```

O que conferir: a entrada é validada antes do processamento (RNF-02) e o erro vem com código e mensagem.

> Os resultados esperados estão formatados para leitura; o terminal pode mostrar o JSON numa linha só. Os acentos podem aparecer como código (`técnica`) ou trocados no Windows PowerShell 5.1 (`tÃ©cnica`). O que importa são os ids, a ordem, os scores e o código HTTP.

Mais detalhes do módulo (estratégia, fallback, testes automatizados com `pytest`) estão em [`modulo-ia/README.md`](modulo-ia/README.md).

## Figma

https://www.figma.com/design/NffaSqV403jDgTUersPLO6/Origem?node-id=0-1&p=f&t=TA3HZzhVrlpQHL3w-0

## Desenvolvimento

Antes de codar, dê `git pull` e leia, nesta ordem:

1. [`AGENTS.md`](AGENTS.md): mapa do repositório, branches e padrão de commit.
2. [`frontend/AGENTS.md`](frontend/AGENTS.md): arquitetura do frontend, Fake API, rotas e estados de tela.
3. [`frontend/DESIGN.md`](frontend/DESIGN.md): tokens, componentes e lista do que nunca usar.

Branch principal: `main`.

## Trello
https://trello.com/b/zDvSILPw/projeto-integrador-20262

## Documentos relacionados ao projeto

https://github.com/Samara020/Projeto-Integrador-Origem/tree/main/docs

## Concorrência 

https://github.com/Samara020/Projeto-Integrador-Origem/tree/backend

## Deploy

https://projeto-integrador-origem.vercel.app/

## Screencast 

https://youtu.be/3yaYGo2tlas

## Equipe

- Allana
- Carlos
- João Pedro
- Lara
- Leandro
- Nicolas
- Samara
- Sérgio
