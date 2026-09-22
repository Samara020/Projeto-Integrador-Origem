# Pontos de Concorrência

## 1. Objetivo

Identificar os principais pontos de concorrência do sistema Origem e orientar sua implementação.

## 2. Checkout simultâneo

Diferentes compradores podem realizar pedidos simultaneamente.

**Risco:** conflitos na criação de pedidos e atualização do estoque.

**Controle:** garantir consistência nas operações de compra.

## 3. Controle de estoque

O estoque pode ser acessado e atualizado simultaneamente por diferentes operações.

**Risco:** venda acima da disponibilidade, estoque negativo e inconsistência dos dados.

**Controle:** sincronização das operações de estoque.

## 4. Threads

Operações concorrentes poderão ser executadas por diferentes threads, exigindo controle adequado dos recursos compartilhados.

## 5. Condição de corrida

O acesso simultâneo ao mesmo recurso pode gerar condições de corrida, principalmente durante compras e atualizações do estoque.

**Controle:** utilização de mecanismos de sincronização.

## 6. Processamento assíncrono

Tarefas relacionadas a pedidos e notificações poderão utilizar processamento assíncrono para evitar bloqueios no fluxo principal.

## 7. Resumo

| Ponto | Risco |
|---|---|
| Checkout | Conflitos entre pedidos |
| Estoque | Inconsistência e venda acima da disponibilidade |
| Threads | Acesso concorrente a recursos |
| Condição de corrida | Dados inconsistentes |
| Processamento assíncrono | Bloqueio do fluxo principal |

## 8. Considerações finais

Os principais pontos de concorrência estão relacionados ao checkout, estoque, threads e processamento assíncrono. A implementação deverá garantir sincronização e consistência dos dados.

## 9. Demonstração implementada

Na branch `backend`, a API em `backend/backend/Origem.Concorrencia/` demonstra a compra concorrente do produto `prd_201` com estoque inicial 1. Um serviço singleton compartilha o estoque entre requisições, e um `lock` cobre a verificação, a publicação da mensagem e o desconto. A API devolve `409` à compra que não encontra estoque.

Cada tentativa traz um `tentativaId`. A API registra o resultado aprovado e devolve o mesmo pedido se receber novamente o mesmo ID e os mesmos dados. Um ID repetido com dados diferentes é recusado. Após a aprovação, uma fila limitada em memória recebe uma mensagem; um `BackgroundService` processa uma notificação simulada e expõe o estado da mensagem para consulta.

O roteiro `backend/testar-demo.ps1` verifica duas compras concorrentes, repetição da tentativa, conflito de dados, processamento da mensagem e estoque final. A solução demonstra esses conceitos dentro de um processo. O checkout e o pagamento gerais do marketplace continuam simulados no navegador; persistência e coordenação entre servidores não fazem parte desta demonstração.
