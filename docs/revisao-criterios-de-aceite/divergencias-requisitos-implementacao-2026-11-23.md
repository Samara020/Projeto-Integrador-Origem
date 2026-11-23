# Divergências entre Requisitos, Plano de Testes e Implementação — Sistema Origem

- **Data:** 2026-11-23
- **Escopo inspecionado:** 62 arquivos em `backend/app/src/`, 194 arquivos em `frontend/src/`, 4 specs Cypress em `e2e/cypress/e2e/`, módulo de IA em `modulo-ia/` e documentos/evidências em `docs/`. (O ZIP não contém `.git`, impedindo auditoria independente do histórico de commits além dos registros presentes).

## 1. Correspondência entre Backlog, Plano de Testes e Execuções

- **Classificação do Backlog (`docs/Backlog Priorizado 1.1 - RPSV.docx.pdf`):**
  - `HU-01` a `HU-16` (**Must Have**): escopo obrigatório do MVP; a avaliação dos 65 critérios cobre exclusivamente esse conjunto.
  - `HU-17` a `HU-23` (**Should Have**): desejáveis, fora do compromisso obrigatório do MVP.
  - `HU-24` e `HU-25` (**Could Have**): melhorias adiáveis.
- **Plano de Testes 1.4 (`docs/Plano de Testes 1.4.pdf`):** define `TC01` a `TC24` e `TS01` a `TS20` (não apenas `TC01`–`TC14` ou `TC01`–`TC16`).
- **Cypress E2E (`e2e/cypress/e2e/` e `e2e/cypress.config.js`):** existem **4 specs** (`acesso.cy.js`, `cadastro-peca.cy.js`, `compra.cy.js`, `vitrine.cy.js`), configuradas para `http://localhost:3000` e rotas/mocks *Fake API* (não substituindo testes de integração contra o backend Express na porta 4000 e PostgreSQL). A dependência está em `e2e/package.json`; a não execução no ambiente atual é limitação de execução do ambiente.
- **Execuções distintas:**
  - **Integração backend / PostgreSQL (`origem_teste`):** `docs/testes/log-integracao-postgres-2026-11-23.txt` registra **12/12 suítes e 175/175 testes aprovados** (incluindo `FOR UPDATE` em `carrinho` e `pedido`, baixa/reposição atômica de estoque, consumo único atômico de token `[200, 401]` e pagamentos concorrentes). Isso comprova os cenários testados no backend/banco, não a cobertura integral de todos os requisitos ou da UI.
  - **Execução manual anterior (`docs/RPSV · Execução de Testes · Embarque Digital.pdf`):** registra execução de 18/11/2026 no commit `bc03f92` com 24 casos (9 aprovados, 9 reprovados, 6 bloqueados) em ambiente externo da disciplina — evidência histórica, não resultado atual do código.

## 2. Divergências e Lacunas Identificadas

| Item / Requisito | Divergência / Lacuna | Evidência | Prioridade / Decisão |
| :--- | :--- | :--- | :--- |
| Contagem da matriz de 65 critérios | Resumo anterior divergia da matriz (`17/45/3` vs. `20` Atendidos, `41` Parcialmente atendidos, `4` Não atendidos). | `docs/revisao-criterios-de-aceite/avaliacao-final-criterios-aceite-2026-11-23.md` | **Corrigido agora** na documentação. |
| Referência documental e codificação | Citação a `2026-11-22-execucao-testes-automatizados.md` (ausente no ZIP) e `evidencia-integracao-banco.md` em Windows-1252. | `docs/revisao-criterios-de-aceite/` e `docs/testes/` | **Corrigido / normalizado agora** na documentação. |
| `HU-01` (01.5) — Bloqueio após tentativas inválidas | Login retorna 401 sem registro de tentativas ou bloqueio temporário / rate limit. | `backend/app/src/services/auth.service.ts` | **Evolução futura** (não encaixar às pressas). |
| `HU-03` (03.5) — Auditoria de aprovação | Sem comprovação de trilha persistida auditável (responsável/data) e estado em memória. | `backend/app/src/lib/memoria.ts`, `produto.repository.ts`, `produto.service.ts` | **Evolução futura** (exige persistência/auditoria). |
| `HU-06` (06.3) — Remover filtro preservando demais | Sem teste automatizado cobrindo remoção individual de filtro preservando os demais. | Avaliação de critérios e suítes atuais | **Avaliar teste pontual** sem alterar escopo obrigatório. |
| `HU-10` — Pagamento recusado/falho e idempotência | Registra pagamento `APROVADO` / pedido `PAGO`; sem fluxo de recusa/falha nem chave de idempotência dedicada por requisição. | `backend/app/src/services/pagamento.service.ts`, `integracao-persistencia.test.ts` | **Evolução futura** (integração de provedor / idempotência persistente). |
| `HU-11` — Expiração automática de reserva | Checkout reduz estoque e cancelamento repõe, mas não há expiração automática temporal da reserva. | `backend/app/src/repositories/pedido.repository.ts` | **Evolução futura** (mecanismo temporal e recuperação). |
| `HU-12` (12.4) — Alerta de estoque baixo | Sem regra automatizada/teste comprovado de alerta conforme limite configurado pelo artesão. | `avaliacao-final-criterios-aceite-2026-11-23.md` | **Avaliar regra/teste** antes de mexer no código. |
| `HU-25` (*Could Have*) — Limite de comparação | Backlog prevê até 5 peças (6ª impedida com aviso); implementação define `MAXIMO_COMPARACAO = 3` com `.slice(-MAXIMO_COMPARACAO)`. | `frontend/src/services/comparacao.ts`, `useComparacao.ts`, `Comparacao.tsx` | **Não entra automaticamente no Must Have**; depende de decisão de prioridade `Could Have`. |
| Recomendação e IA (`HU-17` / integração) | `modulo-ia/app/catalog.py` lê JSON (não PostgreSQL); rota Next.js `app/api/produtos/recomendacoes/route.ts` usa `lib/modulo-ia.ts` e fallback, enquanto fluxo padrão (`useProdutos.ts` -> `services/produtos.ts` -> `lib/http.ts`) vai ao backend Express (`localhost:4000` -> `produtoService.recomendados()`). | `modulo-ia/app/catalog.py`, `frontend/src/app/api/produtos/recomendacoes/route.ts`, `frontend/src/services/produtos.ts`, `backend/app/src/routes/produtos.routes.ts` | **Documentado**; alinhamento de rota/contrato exige definição explícita. |
| Persistência em memória e acúmulo de papéis | `painel.service.ts` acessa Prisma diretamente e reúne múltiplos contextos; `ticket.repository.ts` mantém tickets em array local; `lib/memoria.ts` guarda estados de curadoria/selos/avaliações. | `backend/app/src/services/painel.service.ts`, `ticket.repository.ts`, `lib/memoria.ts` | **Limitação registrada** para evolução futura. |

## 3. Justificativa Formal das Pendências Fora do Escopo Obrigatório

- **`HU-17` e `HU-19` a `HU-23` (*Should Have*):** não integram o escopo obrigatório de 16 histórias *Must Have* para a entrega atual; permanecem documentadas quanto ao estado observado e à necessidade de priorização em ciclo futuro.
- **`HU-18` (*Should Have*):** decisão de escopo mantida explícita; a presença de campos de envio não equivale à conclusão integral do critério sem validação formal de escopo e fluxo.
- **`HU-24` e `HU-25` (*Could Have*):** classificadas como melhorias adiáveis no backlog; `HU-25` possui implementação parcial divergente (limite 3 vs. 5) e não deve ser promovida a item obrigatório sem decisão expressa da equipe/disciplina.
- **Testes manuais externos e ambiente Cypress:** a execução manual de 18/11/2026 ocorreu em ambiente externo da disciplina (não reproduzível localmente como evidência automatizada da versão atual) e a ausência de execução do Cypress neste ambiente reflete limitação de ambiente local, não ausência da dependência em `e2e/package.json`.

## 4. Registro Visual, Correções Aplicadas e Rastreabilidade

<img width="1024" height="572" alt="image" src="https://github.com/user-attachments/assets/c4b701ae-c58d-4f6b-8cc9-0a66536164c3" />
