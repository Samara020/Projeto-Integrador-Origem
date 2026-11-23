# ADR-009: Adotar chaves de idempotência e transações atômicas no checkout e pagamento

- **Status:** Proposta
- **Data:** 2026-11-23
- **Autor:** LEANDRO MANUEL FRANCISCO (lmf4@cesar.school)
- **Turma:** Embarque (segundas)
- **Projeto:** Origem · marketplace da economia criativa e do artesanato de Pernambuco

## Contexto

O Origem é desenvolvido por uma equipe pequena no prazo de um semestre, com stack acordada (Next.js, Express e PostgreSQL/Prisma) e hospedagem sem orçamento. O marketplace comercializa peças artesanais frequentemente únicas ou com baixo estoque. Atualmente, os fluxos de criação de pedido e registro de pagamento (pedido.service.ts e pagamento.service.ts) estão sujeitos a retentativas por falhas de rede ou cliques duplos, com risco de duplicação de pedidos, cobranças repetidas e inconsistência de estoque.

## Preocupações

confiabilidade, consistência de dados, integridade financeira, custo de mudança, prazo

## Decisão

Exigir um cabeçalho Idempotency-Key gerado pelo cliente nas requisições de criação de pedido e pagamento, persistindo a chave e o resultado no PostgreSQL. Executar a validação de estoque, criação do pedido, decremento de unidades e registro do pagamento dentro de uma única transação atômica ACID (prisma.$transaction) com controle otimista/bloqueio de linha no banco.

## Justificativa

A combinação de chave de idempotência persistida com transação atômica no PostgreSQL garante que retentativas de uma mesma operação retornem exatamente a resposta original sem reexecutar baixas de estoque ou cobranças (100% de proteção contra duplicidade), mantendo toda a solução dentro do banco relacional já acordado sem depender de infraestrutura externa.

## Consequências

Ganhos: eliminação de pedidos e pagamentos duplicados por timeout ou duplo clique, garantia de que o estoque nunca fique negativo e rastreabilidade clara de falhas transacionais. Perdas e custos: aumento na latência das operações de escrita no checkout devido ao lock transacional e à consulta prévia da chave de idempotência, necessidade de criar tabela/índice para chaves de idempotência e rotina de expiração após 24 horas, além de exigir que o frontend gere e envie o UUID da operação antes do envio.

## Alternativas consideradas

1) Debounce/bloqueio apenas no botão do frontend: descartada porque não protege contra falhas de rede, timeouts de proxy ou requisições repetidas fora da interface visual. 2) Arquitetura Orientada a Eventos com filas e padrão Saga: descartada por exigir brokers adicionais, consistência eventual e alta complexidade de implementação para uma equipe pequena no prazo de um semestre e sem orçamento de infraestrutura.

## Rastreabilidade

**Atributo de qualidade:** Confiabilidade · Tolerância a falhas

**Cenário que originou a decisão:**

> Durante a operação normal em ambiente de produção, um comprador ou cliente HTTP com conexão instável reenvia a mesma requisição de fechamento de pedido e pagamento após um timeout de rede nos serviços de pedido e pagamento da API (pedido.service.ts e pagamento.service.ts). O sistema reconhece a chave de idempotência da requisição, evita criar um segundo pedido ou nova baixa de estoque, e retorna o resultado da transação original em 100% das retentativas dentro da janela de 24 horas, garantindo zero pedidos duplicados e consistência total de estoque em até 400 ms.

**Padrão arquitetural adotado:** Cliente-servidor

**Táticas empacotadas:** Centralizar regra e dado no servidor

Módulos afetados: backend/app/src/services/pedido.service.ts, backend/app/src/services/pagamento.service.ts, backend/app/prisma/schema.prisma e frontend/src/lib/http.ts. Complementa os ADRs 001 (Prisma/PostgreSQL), 003 (concorrência) e 005 (integridade).

## Verificação

- **Teste do cenário:** Teste automatizado de integração (Vitest/Supertest) enviando duas requisições POST simultâneas ou sequenciais para /pedidos e /pagamentos com o mesmo cabeçalho Idempotency-Key para uma peça com 1 unidade em estoque, verificando que apenas 1 pedido é criado, o estoque final é 0, ambas as respostas retornam o mesmo ID de pedido/pagamento (HTTP 201/200) e o tempo de resposta permanece abaixo de 400 ms.

---

_Gerado pelo estudo dirigido de Arquitetura de Software · ADS020 · 2026.2._
