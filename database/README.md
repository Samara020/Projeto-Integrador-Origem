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

## Validação com dados sintéticos

Os testes foram realizados no banco `origem_teste`, utilizando dados fictícios inseridos pelo script `sql/seed_teste.sql`.

### Como executar os dados sintéticos

Execute o script `sql/seed_teste.sql` somente no banco `origem_teste`.

O script utiliza identificadores fixos para facilitar a validação dos relacionamentos. Antes de executá-lo novamente, remova os registros de teste anteriores na ordem correta de dependência ou utilize um banco de testes limpo.

Não execute este script no banco principal `origem_db`.

### Relacionamentos validados

- Produto relacionado à categoria, loja, estoque e imagem.
- Carrinho relacionado ao usuário e aos itens do carrinho.
- Pedido relacionado ao usuário e ao endereço de entrega.
- Itens do pedido relacionados ao pedido e ao produto.
- Pagamento relacionado ao pedido.
- Avaliação relacionada ao usuário e ao produto.
- Histórico relacionado ao pedido.

### Resultados obtidos

- Inserção de 15 registros de teste concluída com sucesso.
- Consulta do pedido confirmou a relação entre comprador, endereço, produto, item do pedido e pagamento.
- Consulta do produto confirmou as relações com categoria, loja, estoque e imagem.
- Consulta do carrinho confirmou a relação com usuário e produto.
- Consultas de avaliação e histórico confirmaram os respectivos relacionamentos.
- O subtotal calculado foi de R$ 50,00, correspondente a duas unidades de R$ 25,00.

Os dados sintéticos foram inseridos no banco de testes. O banco principal `origem_db` não foi utilizado nesses testes.