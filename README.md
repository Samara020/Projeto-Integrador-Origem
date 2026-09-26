# Origem

### Marketplace da Economia Criativa e do Artesanato de Pernambuco

**Projeto Integrador — ADS**
**CESAR School — 4º Semestre — 2026.2**

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

* **Node.js**
* **TypeScript**
* **PostgreSQL**

## Arquitetura

O Origem integra diferentes componentes em uma aplicação web full stack:

* Frontend responsivo;
* Backend e APIs;
* Banco de dados;
* Módulo de Inteligência Artificial;
* Processamento assíncrono;
* Autenticação;
* Cache.

A solução contempla a integração entre as diferentes áreas do Projeto Integrador, conectando os requisitos do sistema, o banco de dados, a aplicação web, a Inteligência Artificial e os mecanismos de concorrência e processamento assíncrono.

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

## Figma

https://www.figma.com/design/NffaSqV403jDgTUersPLO6/Origem?node-id=0-1&p=f&t=TA3HZzhVrlpQHL3w-0

## Desenvolvimento

Antes de codar, dê `git pull` e leia, nesta ordem:

1. [`AGENTS.md`](AGENTS.md): mapa do repositório, branches e padrão de commit.
2. [`frontend/AGENTS.md`](frontend/AGENTS.md): arquitetura do frontend, Fake API, rotas e estados de tela.
3. [`frontend/DESIGN.md`](frontend/DESIGN.md): tokens, componentes e lista do que nunca usar.

Branch principal: `main`.

## Documentos relacionados ao projeto

https://github.com/Samara020/Projeto-Integrador-Origem/tree/main/docs

## Concorrência 

https://github.com/Samara020/Projeto-Integrador-Origem/tree/backend

## screencast 

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
