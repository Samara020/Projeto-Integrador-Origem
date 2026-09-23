# Projeto — Parte 1

# Registro de Uso de IA — Projeto Origem

## ChatGPT — GPT-5.6 Luna

Etapa: Estudo, compreensão, depuração e desenvolvimento do projeto.

Solicitações: Explicações e orientações sobre concorrência, condição de corrida, `lock`, `Thread`, Thread Pool, processamento assíncrono, sincronização e controle de estoque. Também foram solicitados auxílios para identificar e corrigir problemas no código, além de orientações para o desenvolvimento de novas páginas do frontend.

Aproveitamento: Foram aproveitadas explicações conceituais e orientações técnicas para compreender os mecanismos de concorrência, identificar problemas na implementação, auxiliar na depuração e organizar o desenvolvimento das novas páginas do frontend.

Validação técnica executada: As orientações foram analisadas durante o desenvolvimento, com verificação das alterações e execução do projeto em ambiente local, conforme as funcionalidades trabalhadas.

## ChatGPT — GPT-5.6 Sol

Etapa: Integração do backend com o frontend.

Solicitações: Avaliar e orientar a comunicação entre o frontend e o backend, a estruturação das chamadas da API e a integração das funcionalidades do sistema. Também foram solicitadas orientações sobre a organização da integração e o funcionamento das requisições.

Aproveitamento: Foram aproveitadas orientações técnicas para conectar o frontend ao backend, estruturar as chamadas da API e integrar as funcionalidades desenvolvidas ao sistema.

Validação técnica executada: A integração foi verificada durante a execução do projeto em ambiente local, conforme as funcionalidades implementadas e os testes realizados.

## ChatGPT — GPT-6 Sol — 22/09/2026

Etapa: Revisão e implementação da demonstração de concorrência, fila assíncrona e evidências de teste.

Solicitações: Avaliar a aplicação com base nos critérios de controle de concorrência, consistência de inventário, configuração da fila assíncrona, integridade das mensagens, confiabilidade do sistema e declaração de uso de Inteligência Artificial.

Aproveitamento: Auxiliou nos ajustes da API C# para identificar e reutilizar tentativas de compra, na conexão da compra aprovada ao `Channel` e ao processador de notificação simulada, nos ajustes do checkout do frontend e na criação do script de teste.

Validação técnica executada: Foram executados `dotnet build`, `npm run lint`, `npm run build` e `backend/testar-demo.ps1`. O roteiro contemplou uma compra aprovada, uma compra recusada, repetição idempotente, processamento da mensagem e estoque final igual a 0. O roteiro permite repetir a verificação após reiniciar a API.

Limites declarados: A fila, o estoque e os pedidos da API ficam armazenados em memória. O teste automatizado cobre uma única instância local da aplicação.
