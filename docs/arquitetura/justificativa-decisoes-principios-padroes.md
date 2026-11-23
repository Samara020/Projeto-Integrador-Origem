# Justificativa das Decisões Arquiteturais com Princípios e Padrões — Sistema Origem

- **Data:** 2026-11-23
- **Base analisada:** `Projeto-Integrador-Origem (9).zip` / branch `banco-de-dados` (commit `8795309`)
- **Objetivo:** Justificar tecnicamente as decisões arquiteturais do Projeto Origem à luz das responsabilidades por camada/módulo, princípios SOLID, responsabilidades GRASP e padrões GoF, explicitando limitações reais sem declarar padrões sem evidência no código.

## 1. Responsabilidades de cada camada e módulo

### 1.1 Backend (`backend/app/src/` — 62 arquivos)
- **`routes/`** (`auth.routes.ts`, `produtos.routes.ts`, `pedidos.routes.ts`): define rotas HTTP e encaminha requisições.
- **`controllers/`** (`auth.controller.ts`, `produtos.controller.ts`, `pedidos.controller.ts`): recebe parâmetros/corpo HTTP, invoca os serviços e formata respostas.
- **`services/`** (`auth.service.ts`, `produto.service.ts`, `pedido.service.ts`): concentra regras de negócio, validações e orquestração de operações.
- **`repositories/`** (`usuario.repository.ts`, `produto.repository.ts`, `pedido.repository.ts`): encapsula consultas e transações de persistência com Prisma/SQL.
- **`middleware/`** (`auth.ts`, `error.ts`, `validacao.ts`): centraliza autenticação/autorização, validação e tratamento padronizado de erros.
- **`lib/`** (`prisma.ts`, `jwt.ts`, `revogacao-token.ts`, `memoria.ts`): provê infraestrutura compartilhada, cliente Prisma, gestão de tokens e estruturas auxiliares em memória.
- **`aed/`** (estruturas de dados, algoritmos e `GerenciadorEstoque.ts`): implementa estruturas e operações algorítmicas específicas.

### 1.2 Frontend (`frontend/src/`)
- **`app/`**: páginas, layouts e endpoints da aplicação Next.js.
- **`components/`**: componentes visuais organizados por domínio.
- **`hooks/`**: integração de estado e efeitos com React (ex.: `hooks/useCarrinho.ts` via `useSyncExternalStore`).
- **`services/`**: operações de domínio e comunicação HTTP no cliente (ex.: `services/carrinho.ts`, alternando entre backend para usuários autenticados e armazenamento local para não autenticados).
- **`store/`**: estado compartilhado e fábrica de store (ex.: `store/carrinho.ts` e `store/criar-store.ts`).
- **`lib/`**: utilitários, armazenamento e cliente HTTP (`lib/http.ts`).
- **`types/`**: tipos compartilhados da aplicação.

### 1.3 Módulo de IA (`modulo-ia/`)
- **`app/service.py`**: expõe endpoints, valida requisições e coordena o fluxo do serviço (BentoML / Pydantic).
- **`app/recommendation.py`**: calcula pontuação e justificativa das recomendações.
- **`app/fallback.py`**: seleciona candidatos em etapas quando necessário.
- **`app/catalog.py`**: carrega e consulta o catálogo a partir de arquivos JSON (sem persistência compartilhada com o PostgreSQL nos arquivos inspecionados).
- **`app/config.py`**: centraliza pesos, limites e parâmetros de configuração.
- **`tests/`**: suítes de testes do serviço, API, recomendação e desempenho.

## 2. Princípios SOLID e responsabilidades GRASP

| Princípio / Padrão | Evidência no código | Avaliação |
| :--- | :--- | :--- |
| **SOLID — SRP** | Separação entre `routes`, `controllers`, `services`, `repositories` e `middleware` (ex.: fluxo de autenticação). | Observado |
| **SOLID — OCP** | Não há evidência consolidada de extensão via abstrações fechadas para modificação sem alterar código existente. | A investigar / oportunidade |
| **SOLID — LSP** | Não foram identificadas hierarquias relevantes de subtipagem/substituição no código inspecionado. | Sem evidência |
| **SOLID — ISP** | Não foram identificadas interfaces segregadas representativas nas camadas analisadas. | Sem evidência |
| **SOLID — DIP** | `auth.service.ts` e demais serviços importam repositórios concretos diretamente, sem inversão por abstração de interface. | Parcial / oportunidade |
| **GRASP — Controller** | `controllers` recebem chamadas HTTP e delegam a execução aos `services`. | Observado |
| **GRASP — Information Expert** | `repositories` concentram consultas e persistência sobre as entidades/tabelas. | Observado |
| **GRASP — High Cohesion** | Organização por domínio e camada, com ressalvas onde `produto.service.ts` acessa `lib/memoria.ts` ou há duplicação de validações entre rota e serviço. | Observado com ressalvas |
| **GRASP — Low Coupling** | Separação entre camadas reduz acoplamento direto da HTTP/UI ao banco, mas dependências concretas entre `services` e `repositories` mantêm acoplamento parcial. | Parcial |

## 3. Padrões GoF e pipelines (rigor de evidência)

- **Observer (`frontend/src/store/criar-store.ts`):** há implementação concreta de inscrição/notificação de ouvintes quando o estado muda.
- **Singleton / instância compartilhada (`backend/app/src/lib/prisma.ts`):** reutilização da instância do Prisma via `globalThis.prismaGlobal` observada, com ressalva quanto à forma específica de reutilização em ambiente de execução/desenvolvimento.
- **Encadeamento de middlewares Express (`backend/app/src/middleware/`):** forma um pipeline sequencial de processamento, com **similaridade estrutural** ao *Chain of Responsibility*, mas não deve ser afirmado formalmente como implementação estrita do padrão GoF.
- **Padrões sem evidência suficiente para declarar como implementados:** *Strategy* (sem troca formal de estratégias intercambiáveis comprovada), *Factory Method* (`criarApp()` é função de inicialização/composição da aplicação, não comprovando por si só o padrão GoF) e *Adapter* (sem camada explícita de adaptação de interfaces comprovada).

## 4. Motivação, benefícios e limitações

1. **Arquitetura em camadas no backend:** separa transporte HTTP, coordenação, regras de negócio e persistência, facilitando manutenção, testes isolados e localização de falhas.
2. **Separação por módulos de domínio:** agrupa autenticação, produtos, pedidos, carrinho, pagamentos e avaliações, reduzindo conflitos de contexto.
3. **Repositórios encapsulando persistência:** centraliza consultas Prisma e evita vazamento de detalhes de banco para `controllers`.
4. **Middlewares compartilhados:** unificam autenticação, autorização e tratamento de erros.
5. **Frontend organizado por funcionalidade e estado reativo:** facilita evolução de telas e reuso de hooks/serviços, com comportamento adaptado ao estado de autenticação no carrinho.
6. **Serviço de IA desacoplado (`modulo-ia/`):** isola cálculo de recomendação e runtime Python do backend principal.
7. **Limitações e melhorias futuras (sem refatoração neste escopo):** introduzir interfaces/abstrações onde o DIP é parcial, reduzir duplicação de validações e estado em memória (`lib/memoria.ts`) e alinhar a fonte de dados do `catalog.py` caso seja exigida sincronização direta com o PostgreSQL.