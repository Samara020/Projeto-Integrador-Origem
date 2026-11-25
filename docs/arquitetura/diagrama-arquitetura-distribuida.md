# Arquitetura Distribuída — Projeto Origem

## 1. Diagrama da Arquitetura Distribuída

```mermaid
flowchart LR
    subgraph Clientes["Clientes"]
        FE["Frontend Web<br/>Next.js 16 / React 19 / TypeScript (:3000)"]
        CLI["Cliente externo<br/>da demonstração"]
    end

    subgraph Origem["Núcleo do Origem"]
        BE["Backend principal<br/>Node.js / Express / Prisma (:4000)"]
        DB[("PostgreSQL 17<br/>(:5433)")]
    end

    subgraph IA["Serviço independente de IA"]
        AI["Python / BentoML (:3001)<br/>Recomendação de produtos"]
    end

    subgraph Concorrencia["Demonstração independente — C# / .NET 10 (:5000)"]
        API["API ASP.NET Core<br/>Program.cs"]
        Fila[["Channel<br/>Fila limitada em memória<br/>100 mensagens<br/>(FilaPedidos.cs)"]]
        Worker["BackgroundService<br/>ProcessadorPedidos.cs"]
    end

    FE -->|"HTTP/REST - JSON"| BE
    BE -->|"Prisma ORM / PostgreSQL TCP"| DB
    BE -->|"HTTP/REST - POST /recommendations<br/>X-API-Key + timeout"| AI
    AI -->|"JSON ou falha / timeout<br/>fallback baseline local"| BE

    CLI -->|"HTTP/REST"| API
    API -->|"Enfileiramento assíncrono em memória"| Fila
    Fila -->|"Leitura assíncrona"| Worker
```

## 2. Responsabilidades e Correspondência com o Código

- **Marketplace Origem (Frontend `:3000`, Backend `:4000`, PostgreSQL `:5433`):** fluxo principal via HTTP/REST/JSON e persistência relacional no PostgreSQL via Prisma.
- **Serviço de Recomendação (Módulo de IA `:3001`):** recebe `POST /recommendations` (e `POST /recommendations/batch`) autenticado por `X-API-Key` com timeout configurado (`2.000 ms`); em falha ou tempo esgotado, o Backend aplica o fallback *baseline* local.
- **Demonstração de Concorrência .NET 10 (`:5000`):** módulo demonstrativo independente do checkout principal e sem persistência no PostgreSQL; `Program.cs` recebe requisições e registra compras/solicitações, `FilaPedidos.cs` implementa a fila limitada em memória via `Channel` (`100` mensagens) e `ProcessadorPedidos.cs` (`BackgroundService`) consome os itens de forma assíncrona (fila, estoque demonstrativo e pedidos em memória).
- **Documentação completa:** ver [`arquitetura-distribuida.md`](arquitetura-distribuida.md).