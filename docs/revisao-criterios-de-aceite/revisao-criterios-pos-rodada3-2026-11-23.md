# Revisão dos Critérios de Aceite após a Rodada 3 — HU-01 a HU-16

- **Data:** 23/11/2026
- **Responsável pela revisão:** Lara Thaylanne Ho da Silva
- **Base revisada:** [`avaliacao-final-criterios-aceite-2026-11-23.md`](./avaliacao-final-criterios-aceite-2026-11-23.md) (classificação feita antes das correções da tarde de 23/11)
- **Código avaliado:** branch `main` após o merge `3ae37ab` (pagamento recusado/expirado, idempotência, bloqueio de login e contrato canônico de curadoria)
- **Evidência de execução:** [`../testes/log-integracao-postgres-2026-11-23.txt`](../testes/log-integracao-postgres-2026-11-23.txt)

## 1. Evidência visível da execução

Comando executado em `backend/app`, contra banco PostgreSQL descartável `origem_teste` (Neon, região São Paulo):

```
npm test
```

| Resultado | Suítes | Testes | Tempo |
|---|---:|---:|---:|
| Aprovados | 14 | 195 | |
| Reprovados | 1 | 1 | |
| **Total** | **15** | **196** | 434,7 s |

Suítes aprovadas: `pedidos`, `produto-service.unit`, `produtos`, `aed-buscas`, `auth`, `recomendacoes.unit`, `aed-estruturas`, `pagamento-auth.unit`, `bloqueios-contrato`, `integracao-persistencia`, `produtos-posse`, `auth-permissoes`, `admin-def04`, `artesaos`.

Suíte reprovada: `seguranca-regressao` (ver seção 3).

## 2. Critérios reclassificados

Somente critérios com teste automatizado aprovado nesta execução foram promovidos. Os demais mantêm a classificação da avaliação base.

| HU | Critério | Antes | Agora | Evidência (teste aprovado no log) |
|---|---|---|---|---|
| HU-01 | 01.2 Credenciais inválidas, mensagem e tentativa registrada | Parcialmente atendido | **Atendido** | `pagamento-auth.unit.test.ts` · "registra falha em tentativa com senha incorreta e responde 401" (tabela `tentativa_login`) |
| HU-01 | 01.5 Limite e bloqueio temporário após tentativas | Não atendido | **Atendido** | `auth.test.ts` · "TC11 · bloqueia temporariamente com 429 após 5 tentativas inválidas e libera após expiração" e "TC11 · login bem-sucedido antes do limite zera o contador de falhas" |
| HU-03 | 03.2 Aprovação, responsável/data/justificativa e selo | Parcialmente atendido | **Atendido** | `bloqueios-contrato.test.ts` · "aprovação pela rota canônica muda estado, ativa selo e registra auditoria" (verifica `justificativa`, `decididoPorId`, `decididoEm` e `seloAtivo`) |
| HU-03 | 03.5 Aprovação auditável com responsável e data | Não atendido | **Atendido** | mesmo teste acima: o registro de auditoria guarda o administrador responsável e a data da decisão |
| HU-03 | 03.6 Reprovação com decisão/justificativa | Parcialmente atendido | **Atendido** | `bloqueios-contrato.test.ts` · "reprovação pela rota legada não concede selo e preserva auditoria" |
| HU-03 | 03.7 Solicitação ainda pendente não exibe selo | Parcialmente atendido | **Atendido** | `bloqueios-contrato.test.ts` · peça `PENDENTE` não aparece publicamente (404) antes da aprovação |
| HU-10 | 10.2 Recusa mantém não pago e informa comprador | Parcialmente atendido | **Atendido** | `pedidos.test.ts` · "RN33 · pagamento recusado cancela pedido, persiste motivo e libera reserva de peça única" (resposta 402) |
| HU-10 | 10.3 Falha/cancelamento registra motivo e libera reserva | Parcialmente atendido | **Atendido** | `pedidos.test.ts` · RN33 recusado e "RN33 · pagamento expirado libera reserva de estoque uma única vez" |
| HU-10 | 10.4 Evento repetido processa uma vez (idempotência) | Parcialmente atendido | **Atendido** | `pedidos.test.ts` · "RN38 · eventos repetidos e simultâneos com a mesma Idempotency-Key não duplicam pagamento nem histórico" |
| HU-11 | 11.4 Falha/cancelamento/expiração libera a peça ativa | Parcialmente atendido | **Atendido** | `pedidos.test.ts` · RN33 recusado, RN33 expirado e "PUT /artesao/pedidos/:id/status para CANCELADO restaura estoque no banco" |
| HU-11 | 11.6 Liberação após falha sem venda confirmada | Parcialmente atendido | **Atendido** | `pedidos.test.ts` · "RN33/RN38 · recusa concorrente com mesma Idempotency-Key repõe estoque uma única vez" |

Observação: as evidências acima são de API e banco (backend + PostgreSQL). O comportamento visual na interface não foi revalidado nesta rodada.

## 3. Critério com regressão encontrada

| HU | Critério | Classificação | Situação |
|---|---|---|---|
| HU-01 | 01.6 Recuperação segura sem revelar existência da conta | Parcialmente atendido (mantido) | **Defeito encontrado.** `tests/seguranca-regressao.test.ts:137` falhou: `POST /auth/recuperar-senha` ainda devolve `token`/`tokenRecuperacao` na resposta HTTP em ambiente de teste (`auth.service.ts`, variável `servidorTesteIsolado`), mas o teste exige que o token vá apenas pelo e-mail. Regressão causada pela combinação dos commits `40c21b8` (teste) e `3ae37ab` (serviço). Nenhum outro teste depende do token na resposta. **Precisa de correção.** |

## 4. Critérios que continuam não atendidos

| HU | Critério | Motivo |
|---|---|---|
| HU-06 | 06.3 Remover um filtro preserva os demais | Sem teste automatizado da remoção individual de filtro. |
| HU-12 | 12.4 Alerta no limite configurado pelo artesão | Sem regra ou teste de alerta de estoque baixo. |

## 5. Resumo quantitativo atualizado (65 critérios)

| Classificação | Avaliação base (13h18) | Após revisão | Variação |
|---|---:|---:|---:|
| Atendidos | 20 (30,8%) | **31 (47,7%)** | +11 |
| Parcialmente atendidos | 41 (63,1%) | **32 (49,2%)** | −9 |
| Não atendidos | 4 (6,2%) | **2 (3,1%)** | −2 |
| **Total** | 65 | 65 | |

## 6. Próximos passos

1. Corrigir a exposição do token em `auth.service.ts` e reexecutar `seguranca-regressao.test.ts` (critério 01.6).
2. Criar teste para a remoção individual de filtro (06.3).
3. Decidir com a equipe se o alerta de estoque baixo (12.4) entra nesta entrega ou fica registrado como evolução futura.
4. Revalidar na interface (Cypress) os critérios promovidos com base em evidência de API.
