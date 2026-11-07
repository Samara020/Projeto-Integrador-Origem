# ADR-002 — Fake API e backend principal

- **Status:** Registrada (arquitetura observada)
- **Data do registro:** 07/11/2026
- **Responsável pelo registro:** Equipe de desenvolvimento do projeto Origem.
- **Responsável individual pela decisão:** Não identificado nos arquivos consultados.

## Contexto

O frontend possui rotas de Fake API e um cliente HTTP centralizado que permite definir a URL base por variável de ambiente.

O backend Express está organizado separadamente no diretório `backend/app/`.

## Decisão

Documentar a Fake API como mecanismo de simulação disponível no frontend e o backend Express como API principal independente.

O destino das chamadas do cliente HTTP depende da configuração de `NEXT_PUBLIC_API_URL`.

## Alternativas consideradas

1. Utilizar somente a Fake API durante o desenvolvimento.
2. Direcionar todas as chamadas diretamente ao backend Express.
3. Manter a possibilidade de alternar o destino por configuração de ambiente.

## Critérios de comparação

| Critério | Somente Fake API | Somente Express | Configuração por ambiente |
|---|---|---|---|
| Facilidade de desenvolvimento | Alta | Depende do backend | Alta |
| Integração com banco real | Não representa persistência real | Sim | Conforme configuração |
| Flexibilidade de testes | Alta para simulação | Depende do ambiente | Alta |
| Complexidade de configuração | Baixa | Média | Média |
| Fidelidade ao estado atual do projeto | Parcial | Parcial | Representa os caminhos existentes |

## Justificativa

O cliente HTTP utiliza `NEXT_PUBLIC_API_URL` e adota `/api` como valor padrão.

O repositório contém rotas Next.js de Fake API e uma API Express separada.

A documentação deve preservar essa distinção para evitar afirmar que todas as funcionalidades do frontend já estão integradas ao backend real.

## Consequências

- A configuração do ambiente precisa ser considerada ao executar e testar o frontend.
- A existência de uma rota simulada não comprova que a funcionalidade esteja integrada ao backend Express.
- Os testes devem identificar qual implementação está sendo utilizada.

## Evidências

- `frontend/src/lib/http.ts`
- `frontend/src/app/api/`
- `docs/FakeAPI.md`
- `backend/app/src/index.ts`
