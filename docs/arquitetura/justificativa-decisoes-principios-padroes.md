# Justificativa das Decisões Arquiteturais com Princípios e Padrões — Sistema Origem

- **Data:** 2026-11-23
- **Base analisada:** `Projeto-Integrador-Origem (9).zip` / branch `banco-de-dados` (commit `8795309ba92f91e403c250d2869454a4211c4da4`)
- **Escopo inspecionado:** 62 arquivos em `backend/app/src/`, 194 arquivos em `frontend/src/` e arquivos de implementação, configuração e testes em `modulo-ia/` (sem refatoração de código neste escopo).

## 1. Responsabilidades de cada camada e módulo

### 1.1 Backend (`backend/app/src/` — 62 arquivos)
- **`routes/`** (`auth.routes.ts`, `produtos.routes.ts`, `pedidos.routes.ts`): define endpoints, métodos HTTP, autenticação, autorização e validações de entrada.
- **`controllers/`** (`auth.controller.ts`, `produtos.controller.ts`, `pedidos.controller.ts`): recebe requisições, aciona serviços e constrói respostas HTTP.
- **`services/`** (`auth.service.ts`, `produto.service.ts`, `pedido.service.ts`, `painel.service.ts`): executa regras de negócio, validações e coordenação dos casos de uso.
- **`repositories/`** (`usuario.repository.ts`, `produto.repository.ts`, `pedido.repository.ts`, `ticket.repository.ts`): encapsula operações de consulta e persistência, principalmente com Prisma.
- **`middleware/`** (`auth.ts`, `error.ts`, `validacao.ts`): centraliza autenticação, autorização, validação e tratamento de erros.
- **`lib/`** (`prisma.ts`, `jwt.ts`, `revogacao-token.ts`, `memoria.ts`): reúne recursos compartilhados de infraestrutura, como Prisma, JWT, IDs e estado em memória.
- **`aed/`**: contém estruturas de dados, algoritmos e o gerenciador de estoque.

Evidência concreta no fluxo de autenticação: `routes/auth.routes.ts` define as rotas e valida a entrada, `controllers/auth.controller.ts` coordena requisição e resposta HTTP, `services/auth.service.ts` executa cadastro, login e recuperação de senha, `repositories/usuario.repository.ts` executa operações sobre usuários e `lib/prisma.ts` disponibiliza o cliente de acesso ao banco.

### 1.2 Frontend (`frontend/src/` — 194 arquivos)
- **`app/`**: páginas, layouts e rotas de API do Next.js (incluindo rotas marcadas como Fake API e `frontend/src/app/api/produtos/recomendacoes/route.ts`).
- **`components/`**: componentes visuais organizados por domínio e finalidade.
- **`hooks/`**: integração dos componentes com estado e comportamento React (ex.: `hooks/useCarrinho.ts`, `hooks/useProdutos.ts`).
- **`services/`**: operações de domínio e comunicação HTTP (ex.: `services/carrinho.ts`, `services/produtos.ts`).
- **`store/`**: estado compartilhado entre componentes (`store/carrinho.ts`, `store/criar-store.ts`).
- **`lib/`**: recursos auxiliares, como HTTP (`lib/http.ts`), armazenamento local (`lib/armazenamento.ts`), validação e integração com IA (`lib/modulo-ia.ts`).
- **`types/`**: tipos e contratos utilizados pelo frontend.
- **`mocks/`**: dados e funções de demonstração utilizados pelas rotas simuladas.

Evidência concreta no fluxo do carrinho: `hooks/useCarrinho.ts` expõe o carrinho aos componentes React; `services/carrinho.ts` decide como obter e modificar itens (usando o backend para usuários autenticados e armazenamento local para visitantes); `store/carrinho.ts` instancia o estado compartilhado; `store/criar-store.ts` implementa armazenamento e notificação; `lib/http.ts` centraliza requisições HTTP; e `lib/armazenamento.ts` encapsula o acesso ao `localStorage`.

### 1.3 Módulo de IA (`modulo-ia/`)
- **`app/service.py`**: recebe requisições, valida autenticação e parâmetros e coordena a recomendação (BentoML / Pydantic).
- **`app/recommendation.py`**: calcula pontuações, ordena candidatos e gera justificativas.
- **`app/fallback.py`**: seleciona candidatos por etapas de relaxamento dos critérios.
- **`app/catalog.py`**: carrega e consulta o catálogo JSON.
- **`app/config.py`**: define pesos, limites e chave de autenticação.
- **`data/`**: armazena os catálogos utilizados pelo módulo.
- **`tests/`**: testa API, serviço, recomendação e desempenho.

## 2. Princípios SOLID e responsabilidades GRASP

### 2.1 SOLID
- **SRP — Responsabilidade Única (Observado):** controllers delegam operações aos serviços, repositórios concentram consultas e `recommendation.py` concentra cálculo e ordenação das recomendações.
- **OCP — Aberto/Fechado (Sem evidência suficiente):** não há abstrações ou mecanismos consistentes demonstrando extensão de comportamentos sem alteração das implementações existentes.
- **LSP — Substituição de Liskov (Não demonstrado):** não foram identificadas hierarquias de implementação ou contratos polimórficos relevantes que permitam avaliar substituição.
- **ISP — Segregação de Interfaces (Não demonstrado):** não foram encontradas interfaces de repositórios ou serviços separadas por contratos específicos.
- **DIP — Inversão de Dependência (Parcialmente atendido):** serviços como `auth.service.ts` dependem diretamente de objetos concretos (`usuarioRepository`, `produtoRepository`, `pedidoRepository`), sem injeção baseada em abstrações.

### 2.2 GRASP
- **Controller (Observado):** `AuthController`, `ProdutosController` e `PedidosController` recebem operações HTTP e delegam aos serviços.
- **Information Expert (Observado):** repositórios como `usuario.repository.ts` e `pedido.repository.ts` concentram operações sobre seus respectivos dados.
- **High Cohesion (Predominante, com ressalvas):** serviços como `auth.service.ts` e `carrinho.service.ts` são coesos ao domínio, enquanto `painel.service.ts` reúne operações de mais de um contexto (painel de artesão, administração, catálogo e recomendações).
- **Low Coupling (Parcial):** a separação entre camadas reduz acoplamento direto da HTTP/UI ao banco, mas dependências concretas e acesso direto ao Prisma aumentam o acoplamento em pontos específicos.
- **Creator (Não demonstrado de forma relevante):** há criação de entidades em serviços/repositórios, sem evidência suficiente de aplicação específica e relevante desse princípio.

## 3. Padrões GoF, similaridades estruturais e oportunidades

### 3.1 Observados / com ressalva / similaridade estrutural
- **Observer (Implementado em `frontend/src/store/criar-store.ts`):** mantém conjunto de ouvintes (`Set`), inscrição via `assinar()` e notificação quando `definir()` altera o estado.
- **Singleton (Implementação com ressalva em `backend/app/src/lib/prisma.ts`):** reutiliza a instância do Prisma via `globalThis.prismaGlobal` durante o desenvolvimento para evitar múltiplas instâncias em recarga de módulos; não deve ser afirmado como implementação clássica e universal em todos os ambientes.
- **Chain of Responsibility (Similaridade estrutural em `backend/app/src/index.ts` e `backend/app/src/middleware/{auth,validacao,error}.ts`):** encadeamento de middlewares Express com `next()`; descrito como pipeline de middlewares com similaridade ao padrão, sem afirmar equivalência GoF formal estrita.

### 3.2 Não declarados como implementados por ausência de evidência
- **Strategy:** não há família de algoritmos encapsulados em contratos intercambiáveis (a alternância IA/baseline aparece por condições no fluxo da rota).
- **Factory Method:** `criarApp()` em `backend/app/src/index.ts` cria e configura a aplicação Express, o que isoladamente não comprova o padrão GoF Factory Method.
- **Adapter:** não foi identificada implementação explícita de adaptador para integrar provedores externos.

### 3.3 Oportunidades condicionais (propostas, não implementações atuais)
- **Strategy:** encapsular diferentes algoritmos/provedores de recomendação (IA vs. baseline) ou políticas distintas de cálculo de frete caso ganhem complexidade.
- **Adapter:** uniformizar interfaces em integrações futuras com gateways de pagamento ou transportadoras.

## 4. Decisões arquiteturais, motivação e benefícios

- **Backend organizado em camadas (`routes/`, `controllers/`, `services/`, `repositories/`):** separa comunicação HTTP, regras de negócio e persistência, facilitando manutenção, testes e localização de responsabilidades.
- **Organização por domínios funcionais:** separa autenticação, produtos, pedidos, carrinho, pagamentos e avaliações para agrupar operações relacionadas e facilitar a evolução.
- **Uso de repositórios:** centraliza consultas e reduz consultas espalhadas pelos controllers.
- **Middlewares compartilhados (`auth.ts`, `validacao.ts`, `error.ts`):** reutilizam autenticação, autorização, validação e tratamento de erros.
- **Frontend organizado por responsabilidade (`components/`, `hooks/`, `services/`, `store/`, `lib/`):** separa interface, comportamento, estado e comunicação com APIs, incluindo comportamento diferenciado no carrinho para usuário autenticado vs. visitante.
- **Estado compartilhado próprio (`store/criar-store.ts`):** compartilha estado entre componentes sem introduzir biblioteca externa adicional de gerenciamento de estado.
- **Módulo de IA separado (`modulo-ia/app/`):** isola o processamento de recomendações em serviço Python independente do backend principal.
- **Uso do Prisma para persistência (`lib/prisma.ts` e repositórios):** centraliza o acesso ao PostgreSQL por meio de cliente de banco.

## 5. Limitações e ressalvas encontradas no código

- **`painel.service.ts`:** acessa diretamente o Prisma para consultar técnicas e regiões e acumula responsabilidades de múltiplos contextos (painel de artesão, administração, catálogo e recomendações).
- **Estado em memória:** `produto.repository.ts` e `produto.service.ts` consultam/manipulam estado de validação/curadoria/selos/avaliações em `lib/memoria.ts`, e `ticket.repository.ts` mantém tickets em array local sem persistência no PostgreSQL após reinicialização.
- **Acoplamento a implementações concretas e duplicação:** serviços importam repositórios concretos diretamente e há validações repetidas entre rotas e serviços.
- **Rotas Fake API no frontend:** rotas em `frontend/src/app/api/` baseadas em `mocks/` não devem ser tratadas como endpoints com persistência garantida no backend.
- **Catálogo JSON e divergência de fluxo na IA:** `modulo-ia/app/catalog.py` lê arquivos JSON sem persistência compartilhada com o PostgreSQL, e a rota `frontend/src/app/api/produtos/recomendacoes/route.ts` (via `frontend/src/lib/modulo-ia.ts`) difere do fluxo padrão em que `hooks/useProdutos.ts` → `services/produtos.ts` → `lib/http.ts` chama `/produtos/recomendacoes` no backend (porta 4000) → `ProdutosController.recomendados()` → `produtoService.recomendados()`, que não invoca o serviço Python de IA.

## 6. Diagrama Arquitetural e Fluxos Principais

<img width="1024" height="572" alt="image" src="https://github.com/user-attachments/assets/fd8f86e3-97e4-4220-b03b-a78d20d1db10" />
