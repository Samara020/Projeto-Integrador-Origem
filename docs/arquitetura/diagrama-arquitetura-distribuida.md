# Arquitetura Distribuída — Projeto Origem

## 1. Diagrama da Arquitetura Distribuída

```mermaid
flowchart LR
    subgraph Clientes["Clientes"]
        FE["Frontend Web (:3000)<br/>Next.js 16 / React 19 / TypeScript<br/>Responsabilidade: interface de vitrine, catálogo,<br/>carrinho, checkout, conta e painéis (artesão/admin)"]
        CLI["Cliente externo da demonstração<br/>Script HTTP (backend/testar-demo.ps1)<br/>Responsabilidade: disparo concorrente de compras<br/>e verificação de idempotência/fila"]
    end

    subgraph Origem["Núcleo do Origem (Rede Docker Compose)"]
        BE["Backend Principal (:4000)<br/>Node.js / Express / TypeScript / Prisma<br/>Responsabilidade: regras de negócio, Auth JWT/RBAC,<br/>catálogo, pedidos, estoque, pagamentos e cálculo do<br/>fallback baseline local (X-Recomendacao-Fonte: baseline)"]
        DB[("PostgreSQL 17 (:5432 / host :5433)<br/>Responsabilidade: persistência transacional ACID,<br/>integridade relacional e travas SELECT ... FOR UPDATE")]
    end

    subgraph IA["Serviço independente de IA (Rede Docker Compose)"]
        AI["Módulo de IA (:3001)<br/>Python 3.13 / BentoML / ProcessPoolExecutor<br/>Responsabilidade: cálculo de score de afinidade,<br/>ranqueamento e recomendação de produtos"]
    end

    subgraph Externos["Integrações externas opcionais"]
        SMTP["Servidor SMTP externo<br/>Responsabilidade: entrega de e-mails de recuperação<br/>de senha (ou fallback seguro em log local)"]
    end

    subgraph Concorrencia["Demonstração independente - C# / .NET 10 (:5000)"]
        API["API ASP.NET Core (Program.cs)<br/>Responsabilidade: recepção HTTP, controle de estoque<br/>em memória sob lock e idempotência por tentativaId"]
        Fila[["Channel (FilaPedidos.cs)<br/>Responsabilidade: fila assíncrona limitada em memória<br/>(100 mensagens) e rastreamento de estado"]]
        Worker["BackgroundService (ProcessadorPedidos.cs)<br/>Responsabilidade: consumo e processamento assíncrono<br/>das notificações de pedidos em segundo plano"]
    end

    FE -->|"HTTP/REST - JSON (Axios)<br/>Authorization: Bearer JWT<br/>Idempotency-Key (pagamentos)"| BE
    BE -->|"Prisma ORM / PostgreSQL TCP<br/>Transações ACID + FOR UPDATE"| DB
    BE -->|"HTTP/REST - POST /recommendations<br/>X-API-Key + timeout 2s"| AI
    AI -.->|"JSON (200 OK) ou erro/timeout<br/>(em falha, BE aplica baseline sobre o PostgreSQL)"| BE
    BE -.->|"TCP/TLS SMTP (net/tls - timeout 10s)<br/>Recuperação de senha (fallback em log)"| SMTP

    CLI -->|"HTTP/REST - JSON<br/>POST /demo/compras · GET /demo/mensagens/:id"| API
    API -->|"Enfileiramento assíncrono em memória"| Fila
    Fila -->|"Leitura assíncrona (ReadAllAsync)"| Worker
```

## 2. Responsabilidades e Correspondência com o Código

- **Marketplace Origem (`frontend/` `:3000`, `backend/app/` `:4000`, `PostgreSQL` `:5432` / host `:5433`):** fluxo principal via HTTP/REST/JSON (`frontend/src/lib/http.ts`) autenticado por `Authorization: Bearer <JWT>` (e `Idempotency-Key` no pagamento), persistência relacional ACID com travas `SELECT ... FOR UPDATE` no PostgreSQL via Prisma (`backend/app/src/lib/prisma.ts`) e envio opcional de e-mails de recuperação via sockets nativos `net`/`tls` (`backend/app/src/lib/email.ts`, com fallback em log local).
- **Serviço de Recomendação (`modulo-ia/` `:3001`):** recebe `POST /recommendations` autenticado por `X-API-Key` com timeout de `2s` (`backend/app/src/lib/modulo-ia.ts`); em caso de resposta `200 OK`, o Backend retorna `X-Recomendacao-Fonte: ia`, e em falha ou tempo esgotado o próprio Backend calcula localmente o *fallback baseline* sobre o catálogo aprovado no PostgreSQL (`X-Recomendacao-Fonte: baseline` em `backend/app/src/services/recomendacao.service.ts`). O endpoint `POST /recommendations/batch` é disponibilizado para pré-cálculo paralelo em lote em testes e benchmarks.
- **Demonstração de Concorrência .NET 10 (`backend/backend/Origem.Concorrencia/` `:5000`):** módulo demonstrativo independente do checkout principal, sem persistência no PostgreSQL e acionado por cliente externo (`backend/testar-demo.ps1`). `Program.cs` (`EstoqueDemonstracao`) controla estoque e idempotência por `tentativaId` sob `lock`, `FilaPedidos.cs` implementa a fila assíncrona limitada em memória via `Channel` (100 mensagens) e `ProcessadorPedidos.cs` (`BackgroundService`) consome os itens de forma assíncrona via `ReadAllAsync`.
