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
