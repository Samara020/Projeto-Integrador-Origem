# Banco de Dados — Origem

## 1. Visão geral

Este diretório contém os scripts SQL e a documentação do banco de dados do projeto **Origem**, um marketplace voltado ao artesanato pernambucano.

A estrutura utiliza PostgreSQL e contempla tabelas, relacionamentos, chaves primárias e estrangeiras, restrições de integridade, índices, funções e gatilhos destinados a preservar a consistência dos dados e apoiar as regras de negócio.

Este documento apresenta os requisitos do ambiente, a organização dos arquivos, os comandos de execução, os procedimentos de verificação e os resultados dos testes registrados.

Os testes descritos foram realizados no banco de testes `origem_teste`. O banco principal `origem_db` não foi utilizado nos testes de integridade e de dados sintéticos aqui documentados.

## 2. Requisitos

Para executar os scripts, são necessários:

- Docker Desktop;
- Docker Compose;
- PostgreSQL 17;
- PowerShell;
- arquivos SQL disponíveis no repositório.

O pgAdmin 4 é opcional e pode ser utilizado para consultar tabelas, executar comandos SQL e inspecionar relacionamentos visualmente.

## 3. Organização dos arquivos SQL

Os scripts estão localizados em `database/sql/`.

| Arquivo | Finalidade |
|---|---|
| `create_tables.sql` | Cria as 14 tabelas e suas restrições estruturais. |
| `integrity_rules.sql` | Define funções e gatilhos de integridade. |
| `create_indexes.sql` | Cria 12 índices adicionais. |
| `seed_teste.sql` | Insere dados fictícios para validar relacionamentos e consultas. |
| `create_tables_backup.sql` | Cópia de segurança da versão inicial do esquema. Não faz parte da sequência normal de execução. |

**Importante:** antes de executar qualquer script, confira seu conteúdo e o banco selecionado. Scripts de criação podem falhar quando executados sobre objetos existentes ou causar inconsistências quando alterados para contornar erros.

## 4. Configuração do ambiente Docker

O ambiente utiliza um contêiner PostgreSQL com a porta `5432` do contêiner mapeada para a porta `5433` do computador.

| Configuração | Valor |
|---|---|
| Contêiner | `origem-postgres` |
| Porta no computador | `5433` |
| Porta no contêiner | `5432` |
| Banco de testes | `origem_teste` |
| Banco principal | `origem_db` |
| Usuário PostgreSQL | `origem_user` |

As credenciais devem ser configuradas localmente. O arquivo `.env` não deve conter informações sensíveis versionadas no Git.

### 4.1. Verificar se o contêiner está em execução

Execute no PowerShell:

```powershell
docker ps --filter "name=origem-postgres"
```

O contêiner `origem-postgres` deve aparecer na listagem.

### 4.2. Verificar a disponibilidade do PostgreSQL

```powershell
docker exec origem-postgres pg_isready -U origem_user
```

A resposta esperada indica que o servidor está aceitando conexões.

### 4.3. Confirmar o acesso ao banco de testes

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT current_database(), current_user, version();"
```

Confirme que o banco retornado é `origem_teste` antes de executar os testes.

## 5. Preparação do banco de testes

Os scripts de criação devem ser executados em um banco de testes vazio ou em um ambiente preparado especificamente para essa finalidade.

Antes de iniciar:

1. Confirme que o contêiner está em execução.
2. Confirme que o banco `origem_teste` existe.
3. Verifique se ele já contém tabelas ou dados.
4. Se o banco já estiver preenchido, não execute novamente os scripts de criação sem avaliar os efeitos.
5. Se for necessário um ambiente limpo, prepare outro banco de testes isolado, preservando o banco principal e os dados existentes.

Para conferir as tabelas já existentes:

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "\dt"
```

**Atenção:** não utilize comandos de remoção de banco, tabelas ou volumes como etapa automática de preparação. A limpeza deve ser planejada e limitada ao ambiente de testes.

## 6. Ordem de execução

A sequência de preparação do esquema é:

1. `create_tables.sql`;
2. `integrity_rules.sql`;
3. `create_indexes.sql`;
4. `seed_teste.sql`, para inserir os dados sintéticos.

Os três primeiros scripts preparam a estrutura do banco. O quarto insere os registros utilizados na validação dos relacionamentos.

## 7. Como executar os scripts SQL

Os comandos abaixo devem ser executados no PowerShell, a partir da raiz do repositório, com o contêiner `origem-postgres` em execução.

O parâmetro `ON_ERROR_STOP=1` faz com que o `psql` interrompa o processamento do script ao encontrar um erro SQL.

### 7.1. Criar as tabelas

```powershell
Get-Content .\database\sql\create_tables.sql | docker exec -i origem-postgres psql -U origem_user -d origem_teste -v ON_ERROR_STOP=1
```

### 7.2. Criar as funções e os gatilhos

```powershell
Get-Content .\database\sql\integrity_rules.sql | docker exec -i origem-postgres psql -U origem_user -d origem_teste -v ON_ERROR_STOP=1
```

### 7.3. Criar os índices

```powershell
Get-Content .\database\sql\create_indexes.sql | docker exec -i origem-postgres psql -U origem_user -d origem_teste -v ON_ERROR_STOP=1
```

### 7.4. Inserir os dados sintéticos

Execute somente após preparar a estrutura:

```powershell
Get-Content .\database\sql\seed_teste.sql | docker exec -i origem-postgres psql -U origem_user -d origem_teste -v ON_ERROR_STOP=1
```

### 7.5. Cuidados durante a execução

- Os comandos pressupõem os nomes de contêiner, usuário, banco e arquivos apresentados neste documento.
- Execute os scripts de criação apenas em um ambiente preparado para recebê-los.
- Não execute `create_tables_backup.sql` na sequência normal.
- O script `seed_teste.sql` utiliza identificadores fixos. Não o execute repetidamente sem preparar um banco limpo ou remover os registros anteriores respeitando as dependências entre tabelas.
- Não redirecione os comandos de teste para `origem_db`.
- `ON_ERROR_STOP=1` interrompe o processamento em caso de erro, mas não garante o desfazimento automático de todas as operações anteriores.
- Uma execução sem erros deve ser complementada pelas consultas de verificação apresentadas na seção seguinte.

## 8. Verificação da estrutura

Após a execução dos scripts, utilize as consultas a seguir para conferir o esquema.

### 8.1. Contar as tabelas

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
```

**Resultado esperado:** `14`, considerando a estrutura documentada para o projeto.

### 8.2. Listar as tabelas

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "\dt"
```

Confira os nomes das tabelas exibidas e compare-os com os definidos em `create_tables.sql`.

### 8.3. Contar as chaves estrangeiras

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY';"
```

O resultado deve ser comparado com a quantidade definida no esquema atual. O registro de testes anterior indicou 16 chaves estrangeiras.

### 8.4. Consultar as restrições CHECK

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public' AND constraint_type = 'CHECK';"
```

Essa consulta permite verificar as restrições `CHECK` registradas no esquema. O registro anterior indicou 11 restrições, valor que deve ser reconfirmado após alterações nos scripts.

### 8.5. Listar os índices

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;"
```

A consulta apresenta os índices existentes. Para conferir os 12 índices adicionais, compare os nomes retornados com `create_indexes.sql`, sem confundir esses índices com os criados automaticamente para chaves primárias e restrições de unicidade.

### 8.6. Listar as funções relacionadas ao estoque

```powershell
docker exec origem-postgres psql -U origem_user -d origem_teste -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;"
```

Confira se a função `baixar_estoque` aparece na listagem.

## 9. Controle de estoque

O banco possui a função `baixar_estoque(p_id_produto, p_quantidade)`, destinada a controlar a baixa de estoque.

Conforme os testes registrados, a função:

- rejeita quantidades menores ou iguais a zero;
- utiliza `FOR UPDATE` para bloquear a linha de estoque durante a operação;
- rejeita produtos sem registro de estoque;
- rejeita baixas superiores à quantidade disponível;
- atualiza a quantidade disponível após validar a operação.

O bloqueio da linha ajuda a evitar inconsistências quando operações concorrentes tentam modificar o mesmo estoque.

A função deve ser integrada ao fluxo de checkout dentro da mesma transação que registra a venda, de modo que o registro do pedido e a baixa de estoque sejam tratados de forma consistente.

A integração com o checkout e a prevenção de processamento duplicado de pedidos ainda precisam ser implementadas e testadas na aplicação.

## 10. Regras para peças únicas

Os gatilhos relacionados às peças únicas impedem estoque superior a uma unidade para produtos classificados dessa forma.

As regras também tratam a situação em que um produto comum é alterado para peça única enquanto possui mais de uma unidade em estoque.

Essas validações ajudam a preservar as regras de negócio no banco de dados, complementando as verificações realizadas pela aplicação.

## 11. Testes de integridade

Os testes de integridade registrados foram executados no banco `origem_teste`.

| Teste | Resultado registrado |
|---|---|
| Criação das 14 tabelas | Executada |
| Criação das funções e dos gatilhos | Executada |
| Criação dos 12 índices adicionais | Executada |
| Rejeição de CPF não numérico | Testada |
| Rejeição de preço negativo | Testada |
| Rejeição de quantidade negativa no estoque | Testada |
| Rejeição de baixa acima do estoque disponível | Testada |
| Baixa válida de uma unidade | Testada |
| Rejeição de estoque superior a uma unidade para peça única | Testada |
| Rejeição da alteração para peça única com estoque superior a uma unidade | Testada |
| Verificação da remoção dos registros temporários dos testes de integridade | Registrada |

Esses resultados correspondem aos testes anteriormente registrados e não significam que todos foram repetidos após a última alteração do banco.

### 11.1. Como reproduzir os testes

Para reproduzir uma validação:

1. Utilize um banco de testes preparado e confirme o nome do banco conectado.
2. Identifique no arquivo SQL a tabela, a coluna e a restrição responsáveis pela regra que será testada.
3. Execute uma operação válida para verificar o comportamento esperado.
4. Execute uma operação inválida, com os dados adequados para acionar a restrição.
5. Confira se o PostgreSQL rejeitou a operação conforme esperado.
6. Verifique se os dados permaneceram consistentes após a tentativa.
7. Registre o comando executado, o resultado obtido e qualquer ajuste necessário.

Para testar operações que alteram dados, utilize uma transação quando apropriado e confirme que as alterações temporárias foram revertidas. A transação não substitui a verificação dos efeitos de funções e gatilhos.

Os testes devem utilizar os nomes reais de tabelas e colunas definidos nos scripts. Não execute comandos genéricos de alteração de dados sem antes conferir o esquema.

## 12. Validação com dados sintéticos

O script `seed_teste.sql` insere registros fictícios para verificar se as principais entidades estão relacionadas corretamente.

### 12.1. Dados utilizados

Foram inseridos 15 registros sintéticos no banco `origem_teste`, utilizando identificadores fixos para facilitar a identificação durante as consultas.

### 12.2. Relacionamentos validados

- Produto relacionado à categoria, loja, estoque e imagem.
- Carrinho relacionado ao usuário e aos itens do carrinho.
- Pedido relacionado ao usuário e ao endereço de entrega.
- Itens do pedido relacionados ao pedido e ao produto.
- Pagamento relacionado ao pedido.
- Avaliação relacionada ao usuário e ao produto.
- Histórico relacionado ao pedido.

### 12.3. Resultados registrados

- Inserção de 15 registros de teste concluída com sucesso.
- Consulta do pedido confirmou as relações entre comprador, endereço, produto, item do pedido e pagamento.
- Consulta do produto confirmou as relações com categoria, loja, estoque e imagem.
- Consulta do carrinho confirmou a relação com usuário e produto.
- Consultas de avaliação e histórico confirmaram os respectivos relacionamentos.
- O subtotal calculado foi de R$ 50,00, correspondente a duas unidades de R$ 25,00.

### 12.4. Cuidados com os dados sintéticos

O script utiliza identificadores fixos. Antes de repetir a carga:

- verifique se os registros já existem;
- prepare um banco de testes limpo ou remova os registros anteriores respeitando as dependências entre as tabelas;
- confirme que a operação está sendo realizada em `origem_teste`;
- execute novamente as consultas de validação.

Não execute o script no banco principal `origem_db`.

## 13. Segurança e boas práticas

- Não versionar arquivos `.env` que contenham credenciais reais.
- Manter um arquivo `.env.example` sem senhas reais para documentar as variáveis necessárias.
- Utilizar o banco de testes para validar scripts e alterações estruturais.
- Não executar scripts destrutivos sem revisar seu conteúdo e confirmar o banco selecionado.
- Manter os arquivos SQL versionados para rastrear alterações no esquema e nas regras de integridade.
- Conferir os resultados das consultas de verificação após alterações.
- Não considerar um teste aprovado apenas porque o comando foi executado; verificar o resultado esperado.
- Não afirmar compatibilidade com ferramentas de ORM sem validar o esquema efetivamente utilizado pela aplicação.

## 14. Pendências de integração

As seguintes atividades permanecem como pontos de validação ou implementação:

- Validar a compatibilidade do esquema SQL com o `schema.prisma` utilizado pelo backend, caso o Prisma seja o ORM efetivamente adotado.
- Integrar a função de controle de estoque ao fluxo de checkout.
- Implementar e testar a prevenção de processamento duplicado de pedidos.
- Reproduzir os testes de integridade após mudanças relevantes nos scripts.
- Registrar eventuais falhas encontradas, correções realizadas e resultados das novas execuções.

## 15. Critérios para considerar a validação concluída

A validação do banco de dados pode ser considerada concluída para uma versão específica quando:

- os scripts de criação forem executados sem erros em um banco de testes preparado;
- as tabelas, restrições e índices corresponderem ao esquema esperado;
- as regras de integridade forem verificadas com operações válidas e inválidas;
- os relacionamentos dos dados sintéticos forem confirmados por consultas;
- os resultados forem registrados;
- as pendências de integração forem identificadas separadamente das funcionalidades já testadas.

A validação do esquema SQL, isoladamente, não comprova a integração completa com o backend ou com o checkout.

## 16. Resumo

Este documento descreve a organização dos scripts SQL, a configuração do ambiente Docker, a sequência de execução, os comandos PowerShell, as consultas de verificação, as regras de integridade e os resultados registrados dos testes com dados sintéticos.

O banco `origem_teste` deve ser utilizado para validar mudanças no esquema e nos dados. O banco principal `origem_db` deve permanecer separado dos testes até que as alterações sejam revisadas e aprovadas.
