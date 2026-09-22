# Registro de Uso de IA — Projeto Origem

## ChatGPT — GPT-5.6 Sol

**Etapa:** Integração do backend com o frontend.

**Solicitações:** Orientações sobre a comunicação entre frontend e backend, estruturação das chamadas da API e integração das funcionalidades.

**Aproveitamento:** Apoio técnico na integração entre as partes do sistema.

**Validação:** Verificação da integração durante a execução do projeto em ambiente local.

## ChatGPT — GPT-5.6 Luna

**Etapa:** Estudo, compreensão, depuração e desenvolvimento do projeto.

**Solicitações:** Explicações sobre concorrência, condição de corrida, `lock`, `Thread`, Thread Pool, processamento assíncrono, sincronização e controle de estoque. Também foi utilizado para auxiliar na depuração do projeto e no desenvolvimento de novas páginas do frontend.

**Aproveitamento:** Explicações conceituais, apoio na identificação e correção de problemas e orientação durante a implementação.

**Validação:** Verificação das alterações e execução do projeto em ambiente local.

## ChatGPT 6 Sol — 22/09/2026

**Etapa:** Revisão e implementação da demonstração de concorrência, fila assíncrona e evidências de teste.

**Solicitações:** Avaliar a aplicação nos critérios de concorrência, consistência de inventário, fila, mensagens, confiabilidade e declaração de IA.

**Aproveitamento:** Auxiliou nos ajustes da API C# para identificar e reutilizar tentativas de compra, apoio para conectar a compra aprovada ao `Channel` e ao processador de notificação simulada, ajustou o checkout do frontend, apoio na criação para o scrypt de teste.

**Validação técnica executada:** `dotnet build`; `npm run lint`; `npm run build`; `backend/testar-demo.ps1` com uma compra aprovada, uma recusada, repetição idempotente, mensagem processada e estoque final 0. O roteiro permite repetir a verificação após reiniciar a API.

**Limites declarados:** A fila, o estoque e os pedidos da API ficam em memória. O teste automatizado cobre uma instância local.
