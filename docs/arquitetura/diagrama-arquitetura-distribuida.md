# Arquitetura Distribuida - Projeto Origem

## 1. Diagrama da Arquitetura Distribuida

```mermaid
flowchart LR
    subgraph Clientes["Clientes"]
        Usuario["Usuario / Navegador"]
        ClienteDemo["Cliente externo da demonstracao"]
    end

    subgraph Marketplace["Marketplace Origem"]
        Frontend["Frontend<br/>Next.js (:3000)"]
        Backend["Backend<br/>Node.js / Express (:4000)"]
        Postgres[("PostgreSQL<br/>(:5433)")]
    end

    subgraph Recomendacao["Servico de Recomendacao"]
        IA["Modulo de IA<br/>Python / BentoML (:3001)"]
    end

    subgraph Concorrencia["Demonstracao de Concorrencia .NET 10 (em memoria)"]
        ApiDotNet["API ASP.NET Core (:5000)<br/>(Program.cs)"]
        Channel["Fila limitada Channel (100 mensagens)<br/>(FilaPedidos.cs)"]
        BgService["BackgroundService<br/>(ProcessadorPedidos.cs)"]
    end

    Usuario -->|"HTTP"| Frontend
    Frontend -->|"HTTP / REST / JSON"| Backend
    Backend -->|"Prisma / PostgreSQL"| Postgres
    Backend -->|"POST /recommendations<br/>(X-API-Key + timeout)"| IA
    IA -->|"JSON ou falha / timeout<br/>(fallback baseline local)"| Backend
    ClienteDemo -->|"HTTP / REST"| ApiDotNet
    ApiDotNet -->|"Enfileiramento em memoria"| Channel
    Channel -->|"Leitura assincrona"| BgService
```

## 2. Responsabilidades e Correspondencia com o Codigo

- **Marketplace Origem (Frontend :3000, Backend :4000, PostgreSQL :5433):** fluxo principal via HTTP/REST/JSON e persistencia relacional no PostgreSQL via Prisma.
- **Servico de Recomendacao (Modulo de IA :3001):** recebe POST /recommendations autenticado por X-API-Key com timeout configurado; em falha ou tempo esgotado, o Backend aplica o fallback aseline local.
- **Demonstracao de Concorrencia .NET 10 (:5000):** modulo demonstrativo independente do checkout principal e sem persistencia no PostgreSQL; Program.cs recebe requisicoes e registra compras/solicitacoes, FilaPedidos.cs implementa a fila limitada em memoria via Channel (100 mensagens) e ProcessadorPedidos.cs (BackgroundService) consome os itens de forma assincrona (com fila, estoque demonstrativo e pedidos em memoria).