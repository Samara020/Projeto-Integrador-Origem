# ADR-001 — Persistência e uso do Prisma

- **Status:** Registrada (arquitetura observada)
- **Data do registro:** 07/11/2026
- **Responsável pelo registro:** Equipe de desenvolvimento do projeto Origem.
- **Responsável individual pela decisão:** Não identificado nos arquivos consultados.

## Contexto

O Origem utiliza PostgreSQL como banco de dados e Prisma como ferramenta de acesso aos dados.

O schema Prisma informa que as tabelas atuais são criadas por scripts SQL e que o Prisma realiza o mapeamento dessas tabelas.

## Decisão

Manter o Prisma Client como camada de acesso ao PostgreSQL, utilizando o schema Prisma para mapear as tabelas existentes.

A criação e preparação da estrutura atual do banco são realizadas por scripts SQL versionados em `database/sql/`.

## Alternativas consideradas

1. Prisma Migrate: utilizar migrations do Prisma para criar e evoluir a estrutura do banco.
2. Prisma db push: sincronizar diretamente o schema Prisma com o banco.
3. Scripts SQL: manter scripts SQL versionados como mecanismo de criação e preparação da estrutura.

## Critérios de comparação

| Critério | Prisma Migrate | Prisma db push | Scripts SQL |
|---|---|---|---|
| Compatibilidade com a estrutura atual | Exige adaptação | Pode gerar divergências | Compatível com o modelo existente |
| Controle das alterações | Histórico de migrations | Sincronização do schema | Histórico dos scripts |
| Complexidade de adoção | Média/alta | Baixa | Já adotada |
| Manutenção | Centralizada no Prisma | Depende do schema | Exige manter scripts e schema alinhados |
| Risco para tabelas existentes | Exige planejamento | Exige cautela | Segue o processo atual |

## Justificativa

O schema atual informa que as tabelas são criadas pelos scripts SQL e que o Prisma apenas realiza o mapeamento.

O arquivo `setup-db.ts` também executa scripts SQL para preparar o banco.

A manutenção do processo atual evita introduzir uma estratégia de alteração estrutural incompatível com a organização já existente.

## Consequências

- Os scripts SQL precisam ser versionados e revisados.
- O schema Prisma deve permanecer alinhado às tabelas existentes.
- Alterações estruturais exigem atualização coordenada dos scripts SQL e do schema.
- Embora exista um script `prisma:push` no `package.json`, ele não deve ser utilizado nas tabelas atuais sem decisão e validação específicas.

## Evidências

- `backend/app/prisma/schema.prisma`
- `backend/app/src/lib/prisma.ts`
- `backend/app/src/lib/setup-db.ts`
- `database/sql/`
