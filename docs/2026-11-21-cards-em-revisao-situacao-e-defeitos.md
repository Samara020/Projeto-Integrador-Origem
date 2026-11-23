# Cards em “Em Revisão” — situação dos defeitos conhecidos

**Consulta do Trello:** 21/11/2026, aproximadamente 14:06 (America/Recife).
**Quadro:** [Projeto Integrador 2026.2](https://trello.com/b/zDvSILPw/projeto-integrador-20262)
**Escopo:** leitura da coluna e consolidação das evidências de auditoria já disponíveis. Não houve alteração de card ou checklist.

> O agente de testes recusou duas vezes a solicitação de preparar este relatório, classificando incorretamente o projeto como infraestrutura eleitoral. Este documento é uma consolidação independente das auditorias anteriores, não um novo reteste executado pelo gerente. “Resolvido depois” significa que existe evidência posterior no Card #18, não que o card correspondente tenha recebido uma auditoria completa nesta data.

## Resumo

O Trello mostra três cards em “Em Revisão”. Todos têm checklist completo, mas isso não prova aceite técnico. Dois defeitos anteriores têm evidência posterior de correção no trabalho do Card #18. No Card #17, a política para tokens legados no mesmo segundo da invalidação ainda precisa ser confirmada como requisito aceito. Nenhum dos três cards foi reauditado integralmente nesta consolidação.

| Card | Checklist atual | Último defeito conhecido | Situação da evidência posterior |
|---|---:|---|---|
| [#54 — Validar a integração do banco com o backend](https://trello.com/c/YzWnjYNX/54-validar-a-integracao-do-banco-com-o-backend) | 7/7 | Campos de produto aceitos pela API eram descartados; schema/Client não cobriam o código. | Roundtrip F1 e build/typecheck passaram em evidência posterior do Card #18; falta reauditar o card #54 completo. |
| [#19 — Integrar o módulo de recomendação à aplicação](https://trello.com/c/OrQJ6IBG/19-integrar-o-modulo-de-recomendacao-a-aplicacao) | 13/13 | Produto reprovado podia aparecer em recomendações se o cache em memória estivesse vazio. | A rodada posterior do Card #18 excluiu o produto reprovado, inclusive em processo novo; falta reauditar o card #19 completo. |
| [#17 — Implementar autenticação e autorização por perfil](https://trello.com/c/AAJG9NnI/17-implementar-autenticacao-e-autorizacao-por-perfil) | 15/15 | Token anterior à troca de senha, emitido no mesmo segundo, podia continuar válido. | Tokens versionados passaram no reteste posterior. Tokens legados sem `sv` no segundo de corte continuam aceitos pela política documentada; confirmar se essa exceção atende ao requisito. |

## Card #54 — Banco de dados e backend

**Defeito anteriormente confirmado:** o service de produto não encaminhava todos os campos ricos ao repository e algumas leituras devolviam valores vazios ou incompletos. No mesmo snapshot, schema Prisma e código eram incompatíveis, impedindo build/typecheck. Isso causava perda no roundtrip e impedia compilar a API.

**Evidência posterior:** a auditoria integrada do Card #18 informou que os oito campos F1 foram gravados e recuperados no PostgreSQL descartável; o backend também passou build/typecheck. `peso` ainda foi serializado como string naquela versão e foi alvo de correção posterior relatada pelo desenvolvedor.

**Estado:** os defeitos antigos parecem endereçados em uma versão posterior, mas não há reteste integral do Card #54 que confirme consultas, gravações, integridade, rollback e documentação no estado atual. Não afirmar que o card está aprovado apenas com o roundtrip F1.

**Próximo passo:** revalidar os sete critérios do card no banco descartável atual e confirmar o contrato de tipos de todos os campos, inclusive `peso`.

## Card #19 — Recomendações

**Defeito anteriormente confirmado:** a decisão de curadoria dependia de um `Map` em memória cujo padrão para ID ausente era “APROVADA”. O filtro do catálogo não consultava o estado persistido. Com o cache vazio, um produto marcado `REPROVADA` no banco apareceu nas recomendações.

**Evidência posterior:** na rodada integrada posterior do Card #18, uma consulta ao banco confirmou o produto reprovado fora das recomendações; um processo novo, com cache vazio, também excluiu o produto. Essa evidência sustenta a correção do defeito específico.

**Estado:** correção sustentada em teste posterior, mas não é uma reauditoria integral do Card #19 nem certifica a integração de IA em todos os fluxos.

**Próximo passo:** reexecutar os 13 critérios do card, cobrindo catálogo aprovado/reprovado, cache vazio, indisponibilidade do módulo, apresentação no frontend e documentação.

## Card #17 — Autenticação e autorização

**Defeito anteriormente confirmado:** a invalidação de sessão usava um limite em segundos e comparação estrita. Um token anterior com `iat` igual ao segundo da invalidação podia continuar aceito após redefinição de senha.

**Evidência posterior:** a implementação de versão monotônica `sv` foi verificada no runtime descartável: token antigo recebeu 401 e novo login no mesmo segundo recebeu 200. Tokens versionados com versão divergente também foram rejeitados.

**Ponto ainda pendente:** tokens legados sem `sv`, com `iat` igual ao segundo de corte, continuam aceitos conforme a política atual. Isso pode ser uma exceção retrocompatível deliberada; a evidência disponível não confirma se o requisito do Card #17 permite essa exceção.

**Próximo passo:** responsável pelo card deve decidir/documentar a política de tokens legados. Depois, reauditar os 15 critérios, incluindo posse de recursos, papéis, reset de senha, logout e mensagens no frontend.

## Limites e referências

- O estado atual da coluna e os checklists foram lidos diretamente no portal Trello; nenhuma caixa foi marcada ou desmarcada.
- A auditoria anterior dos três cards está em `/tmp/origem-cards-em-revisao-530fe8d-vcjlj_zg/` (manifesto e logs). Ela corresponde a um snapshot anterior.
- A evidência posterior do Card #18 está em `/tmp/origem-card18-poscorrecoes-20261121-khey1i1h/` e no relatório desta conversa; o gerente depois confirmou que os processos UI/API daquele runtime já não estavam ativos.
- Portanto, este documento registra evidência histórica e posterior sem declarar que os builds atuais ou os cards #17, #19 e #54 foram homologados integralmente.
