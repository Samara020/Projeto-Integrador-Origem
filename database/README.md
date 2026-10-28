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
- `sql/seed_teste.sql`: insere dados sintéticos para validar os relacionamentos entre as tabelas.

## Ambiente Docker

O PostgreSQL é disponibilizado na porta `5433` do computador e na porta `5432` do contêiner.

- Banco de testes: `origem_teste`.
- Banco principal configurado: `origem_db`.
- Usuário PostgreSQL: `origem_user`.

A senha do PostgreSQL é configurada localmente pelo arquivo `.env`, criado com base no `.env.example`. O arquivo `.env` não deve ser enviado ao GitHub.

## Ordem de execução

Em um banco de testes vazio, execute os scripts nesta ordem:

1. `sql/create_tables.sql`
2. `sql/integrity_rules.sql`
3. `sql/create_indexes.sql`
4. `sql/seed_teste.sql`, para inserir os dados sintéticos após a criação da estrutura e das regras.

Os scripts de estrutura, integridade e índices foram testados no banco `origem_teste`.

## Como executar os scripts SQL

Os comandos abaixo devem ser executados no PowerShell, na raiz do repositório, com o Docker Desktop em execução e o contêiner `origem-postgres` disponível.

### 1. Criar as tabelas

Execute somente em um banco de testes vazio:

```powershell
Get-Content database\sql\create_tables.sql -Raw | docker exec -i origem-postgres psql -v ON_ERROR_STOP=1 -U origem_user -d origem_teste
```

O resultado esperado é a criação das 14 tabelas.

### 2. Aplicar as regras de integridade

```powershell
Get-Content database\sql\integrity_rules.sql -Raw | docker exec -i origem-postgres psql -v ON_ERROR_STOP=1 -U origem_user -d origem_teste
```

Esse script cria as funções e os gatilhos de validação do estoque e das regras de peças únicas.

### 3. Criar os índices adicionais

```powershell
Get-Content database\sql\create_indexes.sql -Raw | docker exec -i origem-postgres psql -v ON_ERROR_STOP=1 -U origem_user -d origem_teste
```

Esse script cria os índices adicionais definidos para as consultas do sistema.

### 4. Inserir dados sintéticos

```powershell
Get-Content database\sql\seed_teste.sql -Raw | docker exec -i origem-postgres psql -v ON_ERROR_STOP=1 -U origem_user -d origem_teste
```

O script insere registros fictícios para validar os relacionamentos entre usuários, lojas, produtos, estoque, imagens, carrinho, pedidos, pagamentos, avaliações e histórico de pedidos.

**Atenção:** o script utiliza identificadores fixos, como `9001` e `9002`. Antes de executá-lo novamente, remova os registros de teste anteriores na ordem correta de dependência ou utilize um banco de testes limpo. Não execute esse script no banco principal `origem_db`.

### 5. Verificar as tabelas criadas

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "\dt"
```

Para contar as tabelas:

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT COUNT(*) AS total_tabelas FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
```

O resultado esperado é `14`.

### 6. Validar os relacionamentos do pedido

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT p.id_pedidos AS pedido, u.nome AS comprador, e.cidade, pr.nome AS produto, ip.quantidade, ip.preco_unitario, ip.subtotal, pg.valor AS valor_pagamento FROM pedido p JOIN usuario u ON u.id_usuario = p.fk_usuario_id_usuario JOIN endereco_de_entrega e ON e.id_endereco = p.fk_endereco_de_entrega_id_endereco JOIN item_pedido ip ON ip.fk_pedido_id_pedidos = p.id_pedidos JOIN produto pr ON pr.id_produto = ip.fk_produto_id_produto JOIN pagamento pg ON pg.fk_pedido_id_pedidos = p.id_pedidos WHERE p.id_pedidos = 9001;"
```

No cenário de teste documentado, o pedido `9001` possui duas unidades de R$ 25,00, totalizando R$ 50,00. O valor do pagamento também é de R$ 50,00.

## Controle de estoque

A função `baixar_estoque(p_id_produto, p_quantidade)`:

- Rejeita quantidades menores ou iguais a zero.
- Bloqueia a linha de estoque durante a leitura com `FOR UPDATE`.
- Rejeita produtos sem registro de estoque.
- Rejeita baixas superiores à quantidade disponível.
- Atualiza a quantidade disponível após validar a operação.

A função deve ser chamada pela aplicação dentro da mesma transação que registra a venda. A integração com o checkout e a prevenção de processamento duplicado de pedidos precisam ser implementadas e testadas na aplicação.

## Regras de peça única

Os gatilhos de estoque e produto impedem estoque superior a uma unidade para produtos marcados como peça única, inclusive quando um produto comum é alterado para peça única enquanto possui mais de uma unidade em estoque.

## Testes de integridade realizados

Os seguintes testes foram executados no banco `origem_teste`:

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

## Validação com dados sintéticos

Os dados sintéticos foram inseridos no banco `origem_teste` por meio do script `sql/seed_teste.sql`.

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
- As consultas retornaram os registros esperados para os cenários executados.

Os testes de integridade e os testes com dados sintéticos foram realizados no banco `origem_teste`. O banco principal `origem_db` não foi utilizado nesses testes.

## Cuidados na execução

- Execute os scripts de estrutura, integridade e índices na ordem indicada.
- Não execute `create_tables_backup.sql` na sequência normal.
- Não execute scripts de criação novamente em um banco que já possui as tabelas, funções, gatilhos e índices correspondentes.
- O Docker executa os scripts de inicialização automaticamente somente quando inicializa um volume de dados vazio. Em um volume existente, execute os scripts manualmente quando necessário.
- Os testes devem ser realizados em `origem_teste`, nunca em `origem_db`.
- Se ocorrer um erro durante a execução de um script, interrompa a sequência e investigue a causa antes de continuar.
- A integração da função `baixar_estoque` com o checkout e a prevenção de processamento duplicado de pedidos ainda precisam ser implementadas e testadas na aplicação.
