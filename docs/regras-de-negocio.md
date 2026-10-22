# Regras de Negócio — Sistema Origem

**Projeto:** Origem — Marketplace de Artesanato Pernambucano  
**Versão:** 1.0

## 1. Usuários e artesãos

**RN01 — Unicidade do e-mail:** Cada e-mail de cadastro deve ser único, impedindo que duas contas utilizem o mesmo endereço de e-mail.

**RN02 — Associação do produto ao artesão:** Cada produto cadastrado deve estar associado ao artesão responsável por sua comercialização no marketplace.

**RN03 — Integridade dos dados do usuário:** Os dados obrigatórios definidos para o cadastro devem ser preenchidos, e as informações de autenticação devem ser armazenadas de forma segura.

## 2. Produtos e catálogo

**RN04 — Dados obrigatórios do produto:** Cada produto deve possuir as informações obrigatórias para sua identificação, classificação e comercialização.

**RN05 — Preço não negativo:** O preço de um produto não pode ser inferior a zero.

**RN06 — Classificação dos produtos:** Os produtos devem utilizar as categorias, técnicas e informações de região previstas no sistema.

**RN07 — Disponibilidade do produto:** A disponibilidade deve respeitar o estoque existente ou, no caso de produtos sob encomenda, a capacidade de produção definida.

**RN08 — Origem do artesanato:** As informações sobre a origem do produto devem corresponder às informações declaradas pelo artesão responsável.

**RN09 — Selo de autenticidade:** O selo de autenticidade somente pode ser exibido para produtos que tenham sido aprovados conforme os critérios definidos para essa funcionalidade.

## 3. Carrinho de compras

**RN10 — Associação dos itens ao carrinho:** Cada item adicionado deve estar associado a um carrinho válido e a um produto existente.

**RN11 — Quantidade dos itens:** A quantidade selecionada deve respeitar as condições de comercialização e a disponibilidade do produto. Para peças únicas, a quantidade permitida por compra não pode ser superior a uma unidade.

**RN12 — Cálculo do subtotal:** O subtotal de cada item deve corresponder ao preço unitário considerado na compra multiplicado pela quantidade selecionada.

**RN13 — Validação antes da confirmação:** Antes da confirmação do pedido, o sistema deve validar novamente os preços e a disponibilidade dos produtos.

**RN14 — Carrinho não confirma venda:** A inclusão de um produto no carrinho não representa uma venda confirmada nem garante, por si só, sua disponibilidade até a conclusão do fluxo de compra.

## 4. Pedidos e entregas

**RN15 — Identificação do pedido:** Cada pedido deve possuir uma identificação única e estar associado ao usuário responsável pela compra.

**RN16 — Endereço de entrega:** Quando a modalidade de compra exigir entrega, o pedido deve possuir um endereço válido para esse fim.

**RN17 — Composição do pedido:** Cada pedido deve registrar os produtos adquiridos, suas quantidades e os valores correspondentes.

**RN18 — Situação inicial do pedido:** O pedido deve ser criado com a situação inicial prevista no fluxo de compra, definida no backlog como “Aguardando pagamento”.

**RN19 — Preservação dos dados da compra:** O pedido deve preservar as informações relevantes da transação, incluindo produtos, quantidades e valores praticados no momento da compra, mesmo que os dados do catálogo sejam alterados posteriormente.

**RN20 — Validação da disponibilidade:** O sistema não deve permitir a confirmação de um pedido com produtos indisponíveis ou com dados obrigatórios inválidos.

## 5. Peças únicas e estoque

**RN21 — Venda única de peça exclusiva:** Uma peça cadastrada como única não pode ter mais de uma venda confirmada.

**RN22 — Controle de concorrência na compra:** Quando dois ou mais compradores tentarem adquirir simultaneamente a mesma peça única, o sistema deve permitir, no máximo, uma reserva válida para a venda.

**RN23 — Limite de estoque:** O sistema não deve permitir a venda de uma quantidade superior à disponibilidade válida do produto.

**RN24 — Estoque não negativo:** Quando houver controle de estoque, a quantidade disponível nunca pode ficar abaixo de zero.

**RN25 — Atualização do estoque:** A disponibilidade deve ser atualizada conforme as regras do fluxo de compra, sem duplicar baixas ou permitir vendas acima do estoque disponível.

**RN26 — Produtos sob encomenda:** Os produtos sob encomenda devem respeitar a capacidade de produção e os prazos definidos para essa modalidade, não sendo tratados necessariamente como produtos com estoque físico imediato.

**RN27 — Liberação de reserva:** Uma reserva de produto deve ser liberada quando a compra for cancelada, o pagamento falhar ou o prazo da reserva expirar, conforme as condições previstas no fluxo de compra.

## 6. Pagamentos

**RN28 — Associação do pagamento ao pedido:** Cada pagamento registrado deve estar associado ao pedido correspondente.

**RN29 — Confirmação do pagamento:** Um pedido somente pode ser considerado pago após a confirmação válida do pagamento.

**RN30 — Pagamento não aprovado:** Quando o pagamento não for aprovado, o pedido não deve ser considerado pago nem resultar em uma venda confirmada.

**RN31 — Atualização da situação do pedido:** A situação do pedido deve refletir o resultado do pagamento e as transições previstas no fluxo de compra.

**RN32 — Processamento único de eventos de pagamento:** O processamento repetido de uma mesma confirmação ou notificação de pagamento não pode duplicar a atualização do pedido, do pagamento ou do estoque.

**RN33 — Tratamento de falhas e cancelamentos:** Em caso de falha, cancelamento ou expiração da compra, o sistema deve atualizar a situação do pedido e liberar eventuais reservas ativas conforme as regras estabelecidas.

## 7. Integridade dos dados

**RN34 — Identificação única dos registros:** Cada entidade deve possuir uma chave primária que identifique unicamente cada registro.

**RN35 — Integridade dos relacionamentos:** Os relacionamentos entre as entidades devem manter referências válidas por meio das chaves estrangeiras aplicáveis.

**RN36 — Campos obrigatórios:** Os campos definidos como obrigatórios devem ser preenchidos antes da gravação do registro.

**RN37 — Validação dos valores:** Os atributos sujeitos a limites ou condições específicas devem respeitar as regras estabelecidas, como preços não negativos, quantidades válidas e referências existentes.

**RN38 — Consistência das transações:** As operações relacionadas à confirmação de pedidos, pagamentos, reservas e atualização de estoque devem preservar a consistência dos dados, evitando registros duplicados e estados incompatíveis.
