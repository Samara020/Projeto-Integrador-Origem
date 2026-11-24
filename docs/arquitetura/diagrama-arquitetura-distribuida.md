# Arquitetura Distribuida - Projeto Origem

## 1. Diagrama da Arquitetura Distribuida

```mermaid
flowchart LR
    subgraph Clientes["Clientes"]
        FE["Frontend Web<br/>Next.js 16 / React 19 / TypeScript (:3000)"]
        CLI["Cliente externo<br/>da demonstracao"]
    end

    subgraph Origem["Nucleo do Origem"]
        BE["Backend principal<br/>Node.js / Express / Prisma (:4000)"]
        DB[("PostgreSQL<br/>(:5433)")]
    end

    subgraph IA["Servico independente de IA"]
        AI["Python / BentoML (:3001)<br/>Recomendacao de produtos"]
    end

    subgraph Concorrencia["Demonstracao independente - C# / .NET 10 (:5000)"]
        API["API ASP.NET Core<br/>Program.cs"]
        Fila[["Channel<br/>Fila limitada em memoria<br/>100 mensagens<br/>(FilaPedidos.cs)"]]
        Worker["BackgroundService<br/>ProcessadorPedidos.cs"]
    end

    FE -->|"HTTP/REST - JSON"| BE
    BE -->|"Prisma ORM / PostgreSQL TCP"| DB
    BE -->|"HTTP/REST - POST /recommendations<br/>X-API-Key + timeout"| AI
    AI -->|"JSON ou falha / timeout<br/>fallback baseline local"| BE

    CLI -->|"HTTP/REST"| API
    API -->|"Enfileiramento assincrono em memoria"| Fila
    Fila -->|"Leitura assincrona"| Worker
```

## 2. Responsabilidades e Correspondencia com o Codigo

- **Marketplace Origem (Frontend :3000, Backend :4000, PostgreSQL :5433):** fluxo principal via HTTP/REST/JSON e persistencia relacional no PostgreSQL via Prisma.
- **Servico de Recomendacao (Modulo de IA :3001):** recebe POST /recommendations autenticado por X-API-Key com timeout configurado; em falha ou tempo esgotado, o Backend aplica o Fallback baseline local.
- **Demonstracao de Concorrencia .NET 10 (:5000):** modulo demonstrativo independente do checkout principal e sem persistencia no PostgreSQL; Program.cs recebe requisicoes e registra compras/solicitacoes, FilaPedidos.cs implementa a fila limitada em memoria via Channel (100 mensagens) e ProcessadorPedidos.cs (BackgroundService) consome os itens de forma assincrona (fila, estoque demonstrativo e pedidos em memoria).