# Banco de Dados - Origem

## Requisitos

- Docker Desktop
- Docker Compose
- PostgreSQL 17
- pgAdmin 4

## Arquivos SQL

- `sql/create_tables.sql`: cria as 14 tabelas e suas restrições.
- `sql/integrity_rules.sql`: cria funções e gatilhos de integridade.
- `sql/create_indexes.sql`: cria 12 índices adicionais.
- `sql/create_tables_backup.sql`: cópia de segurança da versão inicial do esquema; não executar na sequência normal.
- `sql/create_tables_pre_regras.sql`: cópia da estrutura anterior às regras adicionais.

## Ambiente Docker

O PostgreSQL é disponibilizado na porta `5433` do computador e na porta `5432` do contêiner.

Banco de testes: `origem_teste`.

Banco principal configurado: `origem_db`.

## Ordem de execução

1. `sql/create_tables.sql`
2. `sql/integrity_rules.sql`
3. `sql/create_indexes.sql`

Os scripts foram testados no banco `origem_teste`.

## Controle de estoque

A função `baixar_estoque(p_id_produto, p_quantidade)`:

- rejeita quantidades menores ou iguais a zero;
- bloqueia a linha de estoque durante a leitura com `FOR UPDATE`;
- rejeita produtos sem registro de estoque;
- rejeita baixas superiores à quantidade disponível;
- atualiza a quantidade disponível após validar a operação.

A função deve ser chamada pela aplicação dentro da mesma transação que registra a venda. A integração com o checkout e a prevenção de processamento duplicado de pedidos precisam ser implementadas e testadas na aplicação.

## Regras de peça única

Os gatilhos de estoque e produto impedem estoque superior a uma unidade para produtos marcados como peça única, inclusive quando um produto comum é alterado para peça única enquanto possui mais de uma unidade em estoque.

## Testes realizados

- Criação das 14 tabelas.
- Criação das funções e dos gatilhos.
- Criação dos 12 índices adicionais.
- Rejeição de CPF não numérico.
- Rejeição de preço negativo.
- Rejeição de quantidade negativa no estoque.
- Rejeição de baixa acima do estoque disponível.
- Baixa válida de uma unidade.
- Rejeição de estoque superior a uma unidade para peça única.
- Rejeição da alteração para peça única quando o estoque é superior a uma unidade.
- Verificação de remoção dos registros temporários de teste.

## Observação

Os testes de integridade foram realizados no banco `origem_teste`. O banco `origem_db` não foi usado para esses testes.

