# ADR-003 — Módulo independente de demonstração de concorrência

- **Status:** Registrada (arquitetura observada)
- **Data do registro:** 07/11/2026
- **Responsável pelo registro:** Equipe de desenvolvimento do projeto Origem.
- **Responsável individual pela decisão:** Não identificado nos arquivos consultados.

## Contexto

O repositório contém uma aplicação ASP.NET Core / .NET 10 destinada a demonstrar o tratamento de compras concorrentes de um produto com estoque limitado.

O módulo possui projeto, endpoints e mecanismos de processamento próprios.

## Decisão

Documentar o módulo `backend/backend/Origem.Concorrencia` como uma aplicação independente, separada do backend principal Express.

## Alternativas consideradas

1. Incorporar o controle de concorrência diretamente ao backend Express.
2. Utilizar a demonstração como serviço independente.
3. Implementar o controle de estoque com persistência compartilhada no PostgreSQL.

## Critérios de comparação

| Critério | Integrar ao Express | Serviço independente | Persistência compartilhada |
|---|---|---|---|
| Separação de responsabilidades | Média | Alta | Depende da implementação |
| Complexidade de integração | Menor em uma API | Exige comunicação entre serviços | Exige integração com banco |
| Isolamento da demonstração | Baixo | Alto | Depende da arquitetura |
| Persistência do estoque | Depende da implementação | Atualmente em memória | Persistência possível |
| Coordenação entre instâncias | Exige solução específica | O lock atual não resolve múltiplos processos | Exige mecanismo transacional ou de concorrência no banco |

## Justificativa

O módulo possui projeto próprio, endpoints próprios e estado em memória.

O frontend o acessa por meio da variável `NEXT_PUBLIC_CONCORRENCIA_API_URL` no fluxo específico do produto `prd_201`.

A implementação atual demonstra o controle de concorrência sem modificar o fluxo principal de persistência do marketplace.

## Consequências

- O estoque demonstrativo não é persistido no PostgreSQL.
- O estado em memória é perdido quando a aplicação é reiniciada.
- O mecanismo `lock` protege o estado dentro de um único processo.
- A implementação atual não garante coordenação entre múltiplas instâncias da aplicação.
- O módulo deve ser tratado como demonstração independente.

## Evidências

- `backend/backend/Origem.Concorrencia/Program.cs`
- `backend/backend/Origem.Concorrencia/README.md`
- `backend/backend/Origem.Concorrencia/Origem.Concorrencia.csproj`
- `frontend/src/services/pedidos.ts`

## Nota sobre o registro

Este ADR foi elaborado a partir da análise do código e da estrutura atual do repositório. As alternativas e os critérios apresentados representam uma avaliação arquitetural para fins de documentação. Não foi identificada evidência suficiente para afirmar que essas alternativas foram formalmente discutidas ou aprovadas pela equipe na data deste registro.
