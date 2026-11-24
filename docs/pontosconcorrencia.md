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

## 10. Tarefa selecionada para processamento paralelo

### Tarefa existente no produto
Avaliação e ranqueamento de produtos candidatos a partir de um produto de referência ou filtros (`POST /recommendations` em `modulo-ia/`, integrado via `GET /produtos/recomendacoes` no backend) — complementando a análise de concorrência/fila já documentada em `backend/backend/Origem.Concorrencia/`.

### Dados de entrada e resultado esperado
- **Entrada:** contexto de referência (`product_id`) e/ou filtros (`category`, `technique`, `region`), `limit` e lista de produtos elegíveis (`available: true`, excluindo o produto de referência quando houver `product_id`).
- **Resultado esperado:** lista ordenada por `score` (com `product_id`, `score` e `reason`), aplicando regras de disponibilidade, *fallback* e `limit`, com saída funcionalmente equivalente entre as execuções sequencial e paralela.

### Operações independentes que podem ser executadas em paralelo
- O cálculo de compatibilidade/score (categoria, técnica e região) e a montagem da justificativa de cada produto candidato — ou de **partições/fatias da lista de candidatos** — são independentes entre si e não alteram estado compartilhado durante a avaliação.
- As partições podem ser processadas em paralelo por *workers* e consolidadas (ordenando e aplicando o `limit`) apenas na etapa final.

### Como comparar os resultados sequenciais e paralelos
- **Corretude:** comparar a saída sequencial e a paralela para a mesma entrada, verificando mesmos `product_id`, mesma ordem, mesmos *scores* (dentro de tolerância numérica) e mesmas justificativas.
- **Desempenho:** executar ambas as versões com o mesmo conjunto de entradas em múltiplas repetições, variando o volume de candidatos/iterações e o número de *workers*, registrando tempo médio/mediano, *speedup* ($T_{\text{sequencial}} / T_{\text{paralelo}}$) e o impacto do *overhead* de paralelização em cargas pequenas vs. maiores.

### Justificativa da escolha
A avaliação de candidatos é uma operação computacional *read-only* sobre cada item/partição, adequada para divisão em tarefas independentes com consolidação final sem disputa de escrita. Ao mesmo tempo, permite registrar de forma honesta que, com o catálogo sintético reduzido do Origem, o ganho prático depende do volume/repetição do lote frente ao *overhead* de coordenação — mantendo o módulo `Origem.Concorrencia` documentado especificamente para concorrência, `lock` e fila (`Channel` + `BackgroundService`).
