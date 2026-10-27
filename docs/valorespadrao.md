# DOCUMENTAÇÃO DE VALORES PADRÃO DO BANCO DE DADOS

## Projeto Origem — Marketplace de Artesanato Pernambucano

**Versão:** 1.0  
**Status:** Documentação para implementação do banco físico  
**SGBD previsto:** PostgreSQL

### 1. Introdução

Este documento registra as definições de valores padrão propostas para o banco de dados do projeto Origem, um marketplace voltado à comercialização de artesanato pernambucano.
Os valores padrão permitem que o banco de dados atribua automaticamente um valor a determinado campo quando ele não é informado durante uma operação de inserção. Esse recurso contribui para a consistência dos registros e para a padronização de estados iniciais, datas e informações de controle.
As definições consideram as regras de negócio descritas no Backlog Priorizado do Sistema Origem, versão 1.1, distinguindo o comportamento explicitamente previsto no backlog das propostas técnicas que ainda dependem de validação.

### 2. Tabela de valores padrão

| Tabela | Campo | Valor padrão proposto | Fundamentação |
|---|---|---|---|
| CARRINHO | `data_criacao` | `CURRENT_TIMESTAMP` | Proposta para registrar automaticamente a data e a hora de criação do carrinho. |
| CARRINHO | `status` | `'Ativo'` | Proposta para identificar o estado inicial do carrinho, sujeita à confirmação dos estados adotados pela aplicação. |
| PEDIDO | `status` | `'Aguardando pagamento'` | Valor inicial previsto no critério de aceite da HU-09 para a criação do pedido durante o checkout. |
| HISTORICO_PEDIDO | `data` | `CURRENT_TIMESTAMP` | Proposta para registrar automaticamente a data e a hora do evento armazenado no histórico do pedido. |
| ESTOQUE | `quantidade_disponivel` | `0` | Proposta para inicializar a quantidade disponível em zero quando não houver estoque físico inicial, respeitando a modalidade de produção do produto. |

O valor `'Aguardando pagamento'` possui fundamentação explícita no critério de aceite da HU-09, que determina a criação do pedido com esse estado inicial. Os demais valores são propostas técnicas e deverão ser confirmados de acordo com as regras de negócio e a implementação do sistema.

### 3. Critérios para definição dos valores padrão

A definição de valores padrão deverá considerar a finalidade de cada atributo e as regras de negócio associadas. O preenchimento automático será apropriado quando existir um valor inicial previsível e válido para a operação correspondente.
Nos campos `data_criacao`, da tabela `CARRINHO`, e `data`, da tabela `HISTORICO_PEDIDO`, o valor `CURRENT_TIMESTAMP` poderá ser utilizado para registrar automaticamente o momento da criação do carrinho ou da inclusão de um evento no histórico.
Para o campo `status`, da tabela `PEDIDO`, o valor `'Aguardando pagamento'` representa o estado inicial estabelecido para o fluxo de checkout. Os estados posteriores deverão ser atualizados conforme os eventos do pedido e as regras da aplicação.
O campo `status`, da tabela `CARRINHO`, poderá utilizar `'Ativo'` como valor inicial se esse estado for confirmado como parte do ciclo de vida dos carrinhos no sistema.
O campo `quantidade_disponivel`, da tabela `ESTOQUE`, poderá ser inicializado com zero quando não houver quantidade física disponível no momento do cadastro. Essa definição não deverá ser aplicada indiscriminadamente a produtos sob demanda, cuja disponibilidade depende da capacidade e do prazo de produção, e não de estoque físico previamente disponível.

### 4. Campos sem valor padrão definido

Nem todos os campos do banco de dados deverão receber valores padrão. A definição de um valor automático deverá ser justificada pela regra de negócio correspondente, evitando o preenchimento de informações que dependam de uma decisão explícita do usuário ou de um evento do sistema.
O atributo `peca_unica`, da tabela `PRODUTO`, não possui valor padrão definido nesta versão da documentação. Conforme a HU-11 do backlog, o artesão deve poder marcar um produto como peça única, e essa classificação interfere nas regras de reserva, disponibilidade e venda. Portanto, a atribuição automática de `FALSE` dependerá de uma decisão explícita sobre o comportamento esperado para produtos cuja classificação não tenha sido informada.
Da mesma forma, o campo `ponto_reposicao`, da tabela `ESTOQUE`, não possui valor padrão definido nesta versão. O backlog estabelece que o limite de estoque baixo deverá ser definido pelo artesão; atribuir automaticamente zero poderia comprometer a finalidade desse controle.
Os demais campos deverão receber valores conforme sua natureza, suas restrições de integridade e as informações exigidas pelos fluxos de cadastro e operação.

### 5. Implementação no banco de dados físico

Os valores padrão aprovados serão configurados durante a implementação do banco de dados físico, utilizando o recurso `DEFAULT` do PostgreSQL, por meio de comandos SQL ou migrações.
O modelo lógico desenvolvido no brModelo representa as entidades, os atributos, as chaves e os relacionamentos do sistema. Assim, não é necessário modificá-lo exclusivamente para registrar valores padrão, desde que essas definições sejam documentadas e aplicadas na etapa de implementação física.
A configuração definitiva deverá utilizar os nomes reais das tabelas e dos campos no modelo lógico aprovado, respeitar os tipos de dados definidos no esquema e manter compatibilidade com as validações da aplicação.
Um valor padrão não substitui restrições como `NOT NULL`, verificações de integridade ou validações de negócio. Ele também não impede que a aplicação informe outro valor válido durante a inserção de um registro.

### 6. Considerações finais

A definição de valores padrão para o banco de dados do Origem busca assegurar que os registros recebam valores iniciais coerentes com as regras de negócio, sem introduzir comportamentos automáticos não previstos nos requisitos do sistema.
O status inicial do pedido possui fundamentação direta no backlog. As demais propostas deverão ser confirmadas de acordo com o modelo lógico aprovado, os tipos de dados e as regras operacionais adotadas durante a implementação.
