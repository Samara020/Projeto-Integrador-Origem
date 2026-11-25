# Prompt da rodada 2 (IA com insumos)

Prompt exato a enviar ao modelo, sem nenhum outro contexto. Os critérios de aceite foram copiados do Backlog Priorizado 1.1. Tudo abaixo da linha é o prompt.

---

Você vai escrever casos de teste para o sistema Origem, um marketplace de artesanato de Pernambuco com três perfis: comprador, artesão e administrador.

Use somente os requisitos abaixo. Não invente regra, valor nem mensagem que não esteja escrita neles. Quando um critério for ambíguo, não tiver valor definido ou não puder ser testado como está, não preencha por conta própria: liste em uma seção final chamada "Lacunas", dizendo o critério e o que falta.

## Insumo 1: histórias e critérios de aceite, na íntegra

### HU-01 - Autenticação e perfis de acesso

História: Como usuário, quero autenticar-me na plataforma, para acessar minha conta com segurança.

Critérios de aceite:

Login válido
  Dado que o usuário possui cadastro ativo e credenciais válidas.
  Quando informar suas credenciais.
  Então o sistema deve autenticá-lo, criar uma sessão segura e direcioná-lo à área correspondente ao seu perfil.
Credenciais inválidas
  Dado que o usuário informa credenciais incorretas.
  Quando tentar entrar.
  Então o sistema deve negar o acesso, exibir mensagem sem revelar dados sensíveis e registrar a tentativa conforme a política de segurança.
Autorização por role
  Dado que um comprador está autenticado.
  Quando tentar acessar uma função exclusiva de artesão ou administrador.
  Então o sistema deve bloquear a operação e retornar uma resposta de acesso não autorizado.
Expiração da sessão
  Dado que o usuário está autenticado e sua sessão possui um prazo de validade definido.
  Quando a sessão expirar e o usuário tentar acessar uma funcionalidade protegida.
  Então o sistema deve impedir o acesso à funcionalidade protegida e solicitar nova autenticação.
Limite de tentativas de login
  Dado que existe uma política de segurança configurada, com limite máximo de tentativas inválidas e duração do bloqueio temporário definidos.
  Quando o usuário atingir o limite de tentativas inválidas estabelecido pela política.
  Então o sistema deve aplicar o bloqueio temporário pelo período configurado, informar a restrição sem revelar dados sensíveis e registrar a ocorrência conforme a política de segurança.
Recuperação de senha
  Dado que o usuário solicita a recuperação de sua senha pelo mecanismo disponibilizado pela plataforma.
  Quando enviar uma solicitação válida.
  Então o sistema deve iniciar o procedimento seguro de recuperação, sem revelar se uma conta específica existe, conforme a política de segurança adotada.
Acesso direto a recurso restrito
  Dado que o usuário está autenticado com um perfil sem permissão para determinada operação.
  Quando tentar executar a operação diretamente por uma rota ou requisição à API.
  Então o sistema deve negar a operação e preservar a integridade dos dados.

### HU-02 - Cadastro de peças

História: Como artesão, quero cadastrar minhas peças com informações de produção, técnica e origem, para disponibilizá-las corretamente na plataforma.

Critérios de aceite:

Cadastro completo
  Dado que um artesão autenticado informa nome, descrição, categoria, técnica, origem, preço, imagens, disponibilidade e capacidade de produção.
  Quando salvar a peça.
  Então o sistema deve validar os dados, associar a peça ao artesão e registrar o produto para publicação no catálogo.
  Dados obrigatórios ausentes
  Dado que um artesão não preenche um campo obrigatório.
  Quando tentar salvar a peça.
  Então o sistema deve impedir o cadastro e indicar os campos que precisam ser corrigidos.
Produção sob demanda
  Dado que a peça é produzida sob demanda.
  Quando o artesão informar a capacidade e o prazo de produção.
  Então o sistema deve registrar essas informações sem tratá-las como estoque previamente disponível.

### HU-03 - Validação de origem e autenticidade

História: Como administrador, quero analisar as informações de origem e os indícios de autenticidade enviados pelo artesão, para conceder o selo somente a peças que concluírem o processo de validação.

Critérios de aceite:

Envio para análise
  Dado que o artesão cadastrou origem, técnica, descrição do processo produtivo e evidências de apoio.
  Quando solicitar a validação.
  Então o sistema deve registrar a solicitação com status Pendente, data e versão das evidências.
Aprovação
  Dado que um administrador revisou a solicitação conforme a lista de verificação definida pela equipe.
  Quando aprovar a validação.
  Então o sistema deve registrar responsável, data e justificativa, alterar o status para Aprovada e habilitar o selo de origem/autenticidade.
Pendência ou reprovação
  Dado que faltam informações ou existem inconsistências.
  Quando o administrador solicitar ajustes ou reprovar a solicitação.
  Então o sistema deve registrar o motivo, notificar o artesão e não exibir o selo de validação.
Exibição pública
  Dado que a validação está Pendente, Reprovada ou Cancelada.
  Quando um cliente visualizar a peça.
  Então o sistema deve mostrar a origem como declarada pelo artesão e não deve apresentar o selo de validação.
Aprovação administrativa da autenticidade
  Dado que uma peça possui uma solicitação de validação de origem ou autenticidade pendente.
  Quando um administrador autorizado analisar as informações e aprovar a solicitação.
  Então o sistema deve registrar a decisão, identificar o responsável e a data da aprovação, manter o histórico de auditoria e permitir a exibição do selo de autenticidade conforme as regras da plataforma.
Reprovação da autenticidade
  Dado que uma solicitação de validação de origem ou autenticidade está pendente.
  Quando um administrador autorizado reprovar a solicitação.
  Então o sistema deve registrar a decisão e sua justificativa, quando exigida pelo processo, e impedir a exibição do selo de autenticidade.
Solicitação ainda pendente
  Dado que uma peça ainda não recebeu aprovação administrativa.
  Quando o cliente consultar os detalhes da peça.
  Então o sistema não deve exibir o selo de autenticidade como se a peça estivesse aprovada.

### HU-04 - Vitrine

História: Como cliente, quero visualizar as peças disponíveis, para conhecer e adquirir produtos artesanais.

Critérios de aceite:

Catálogo disponível
  Dado que existem peças cadastradas, ativas e disponíveis.
  Quando o cliente acessar a vitrine.
  Então o sistema deve apresentar as peças com imagem, nome, preço, artesão e indicação de disponibilidade.
Produto indisponível
  Dado que uma peça está sem estoque, reservada ou inativa.
  Quando a vitrine for carregada.
  Então o sistema não deve apresentá-la como disponível para compra.
Navegação
  Dado que o cliente visualiza a vitrine.
  Quando selecionar uma peça ou navegar entre páginas.
  Então o sistema deve permitir a navegação entre as páginas da vitrine e o acesso à página do produto sem perda de conteúdo ou funcionalidade nos tamanhos de tela definidos para desktop e dispositivos móveis.

### HU-05 - Detalhes da peça e do artesão

História: Como cliente, quero visualizar os detalhes da peça e do artesão, para conhecer sua origem e produção.

Critérios de aceite:

Detalhes completos
  Dado que a peça possui dados cadastrados.
  Quando o cliente abrir sua página.
  Então o sistema deve apresentar descrição, imagens, técnica, categoria, origem, preço, disponibilidade, modalidade de produção e informações do artesão associado.
Autenticidade
  Dado que a peça possui validação aprovada.
  Quando o cliente visualizar os detalhes.
  Então o sistema deve exibir o selo e permitir consultar as informações validadas sem expor documentos privados.
Informação opcional ausente
  Dado que um campo opcional não foi preenchido.
  Quando a página for carregada.
  Então o sistema deve omitir o campo ou indicar que a informação não foi fornecida, sem quebrar a apresentação.

### HU-06 - Busca e filtros

História: Como cliente, quero buscar e filtrar peças, para encontrar produtos de meu interesse.

Critérios de aceite:

Busca combinada
  Dado que existem peças cadastradas em diferentes categorias, técnicas e regiões.
  Quando o cliente informar um texto e selecionar filtros.
  Então o sistema deve apresentar apenas as peças disponíveis que correspondem à combinação dos critérios.
Sem resultados
  Dado que nenhuma peça corresponde aos critérios.
  Quando o cliente realizar a busca.
  Então o sistema deve informar que nenhum resultado foi encontrado e permitir limpar ou alterar os filtros.
Remoção de filtro
  Dado que existem filtros ativos.
  Quando o cliente remover um filtro.
  Então o sistema deve atualizar os resultados e manter os demais critérios selecionados.

### HU-07 - Perfil do artesão e da loja

História: Como cliente, quero acessar o perfil de um artesão e de sua loja, para conhecer sua história, técnicas, região de origem e produtos disponíveis e me conectar com a arte.

Critérios de aceite:

Perfil ativo
  Dado que o artesão e sua loja possuem cadastro ativo.
  Quando o cliente acessar o perfil.
  Então o sistema deve apresentar informações da loja e do artesão, história, técnicas, região e produtos associados.
Navegação pelo produto
  Dado que o cliente está na página de uma peça.
  Quando selecionar o nome do artesão ou da loja.
  Então o sistema deve abrir o respectivo perfil.
Perfil inativo
  Dado que a loja ou o artesão está inativo.
  Quando um visitante tentar acessar o perfil público.
  Então o sistema não deve apresentá-lo como ativo nem listar produtos indisponíveis.

### HU-08 - Carrinho

História: Como comprador, quero adicionar, remover e alterar itens no carrinho, para organizar os produtos que desejo adquirir antes de finalizar a compra.

Critérios de aceite:

Adicionar item
  Dado que uma peça está disponível.
  Quando o comprador adicioná-la ao carrinho.
  Então o sistema deve incluir o item, quantidade permitida, preço vigente e subtotal.
Alterar carrinho
  Dado que o carrinho contém itens.
  Quando o comprador alterar uma quantidade permitida ou remover um item.
  Então o sistema deve atualizar os totais e preservar os demais itens.
Revalidar disponibilidade
  Dado que o preço ou a disponibilidade de um item mudou após sua inclusão.
  Quando o comprador abrir o carrinho ou iniciar o checkout.
  Então o sistema deve revalidar os dados, informar a alteração e impedir a compra de item indisponível.
Peça única
  Dado que a peça está marcada como única.
  Quando o comprador adicioná-la ao carrinho.
  Então o sistema deve limitar a quantidade a uma unidade sem considerar a simples inclusão como venda confirmada.

### HU-09 - Criação do pedido e checkout

História: Como comprador, quero confirmar meus dados e transformar o carrinho em um pedido, para prosseguir com segurança para o pagamento.

Critérios de aceite:

Criar pedido
  Dado que o comprador está autenticado, o carrinho possui itens válidos e os dados de entrega estão completos.
  Quando confirmar o checkout.
  Então o sistema deve criar um pedido com identificador, itens, valores, endereço, status Aguardando pagamento e registro de data.
  Dados inválidos
  Dado que existem dados de entrega ausentes ou itens indisponíveis.
  Quando o comprador tentar confirmar.
  Então o sistema deve impedir a criação do pedido e explicar as correções necessárias.
Imutabilidade do histórico
  Dado que o pedido foi criado.
  Quando preço, descrição ou perfil do produto mudar posteriormente.
  Então o pedido deve preservar um retrato dos dados relevantes no momento da compra.

### HU-10 - Pagamento

História: Como comprador, quero pagar meu pedido por uma forma disponibilizada no checkout, para concluir a compra pela plataforma.

Critérios de aceite:

Pagamento aprovado
  Dado que existe um pedido aguardando pagamento.
  Quando o provedor confirmar a transação.
  Então o sistema deve associar o pagamento ao pedido, registrar o identificador externo, alterar o pedido para Pago e atualizar a disponibilidade da peça.
Pagamento recusado
  Dado que o provedor recusa a transação.
  Quando o sistema receber a resposta.
  Então o pedido deve permanecer não pago, o comprador deve ser informado e nenhuma venda deve ser confirmada.
Falha ou cancelamento
  Dado que o pagamento falha, expira ou é cancelado.
  Quando o evento for processado.
  Então o sistema deve registrar o motivo, atualizar o pedido e liberar reservas conforme as regras de estoque e peça única.
Idempotência
  Dado que o mesmo evento de confirmação é recebido mais de uma vez.
  Quando o sistema processá-lo.
  Então o pagamento e o estoque devem ser atualizados uma única vez.

### HU-11 - Peças únicas

História: Como artesão, quero marcar produtos como peças únicas e impedir novas compras após a venda, para evitar a venda simultânea da mesma peça.

Critérios de aceite:

Marcação
  Dado que o artesão cadastra ou edita um produto.
  Quando marcá-lo como peça única.
  Então o sistema deve limitar sua disponibilidade vendável a uma unidade.
Compra concorrente
  Dado que dois compradores tentam concluir a compra da mesma peça única.
  Quando os checkouts forem confirmados.
  Então somente a primeira reserva válida deve prosseguir e o segundo comprador deve receber aviso de indisponibilidade.
Pagamento confirmado
  Dado que o pagamento da peça única é aprovado.
  Quando o evento for processado.
  Então a peça deve ficar indisponível para novas compras e permanecer visível no histórico do pedido.
Liberação
  Dado que a reserva expira ou o pagamento falha ou é cancelado.
  Quando o evento for processado.
  Então a peça deve voltar ao catálogo se continuar ativa e apta à venda.
Tentativas simultâneas de compra
  Dado que existe uma peça única disponível e dois ou mais compradores tentam adquiri-la simultaneamente.
  Quando as tentativas de compra forem processadas.
  Então o sistema deve permitir, no máximo, uma venda confirmada para a peça e impedir que a mesma peça seja vendida a mais de um comprador.
Liberação após falha na compra
  Dado que uma peça única está reservada para uma tentativa de compra.
  Quando o pagamento falhar, for cancelado ou a reserva expirar, conforme as regras da plataforma.
  Então o sistema deve liberar a peça para nova tentativa de compra, desde que ela continue ativa e não exista venda confirmada.

### HU-12 - Estoque

História: Como artesão, quero acompanhar a quantidade disponível e os itens vendidos, para gerenciar o estoque.

Critérios de aceite:

Consulta
  Dado que o artesão possui produtos cadastrados.
  Quando acessar a gestão de estoque.
  Então o sistema deve mostrar quantidade disponível, reservada e vendida de cada produto.
Baixa após venda
  Dado que um pagamento é confirmado.
  Quando o evento for processado.
  Então o estoque deve ser atualizado uma única vez e a venda sem estoque deve ser impedida.
Produção sob demanda
  Dado que o produto é sob demanda.
  Quando o estoque for exibido.
  Então o sistema não deve contabilizá-lo como estoque previamente disponível e deve considerar capacidade e prazo de produção.
Estoque baixo
  Dado que a quantidade alcança o limite definido pelo artesão.
  Quando a gestão de estoque for consultada.
  Então o sistema deve apresentar uma indicação de estoque baixo.
Estoque insuficiente
  Dado que a quantidade disponível de um produto é inferior à quantidade solicitada pelo comprador.
  Quando o comprador tentar adicionar a quantidade indisponível ou confirmar a compra.
  Então o sistema deve impedir a operação que exceda a disponibilidade e informar que a quantidade solicitada não pode ser atendida.
Consistência do estoque após a compra
  Dado que um produto possui quantidade disponível registrada.
  Quando uma compra for confirmada.
  Então o sistema deve atualizar a disponibilidade de acordo com a quantidade efetivamente vendida, impedindo saldo negativo e preservando a consistência do estoque.
Produto sob demanda
  Dado que um produto está configurado para produção sob demanda.
  Quando o sistema verificar sua disponibilidade para compra.
  Então deve considerar a capacidade e o prazo de produção registrados, sem tratar essa capacidade como estoque físico previamente disponível.

### HU-13 - Acompanhamento de pedidos pelo comprador

História: Como comprador, quero consultar meus pedidos e seus status, para acompanhar minhas compras desde a criação até a conclusão ou o cancelamento.

Critérios de aceite:

Lista de pedidos
  Dado que o comprador está autenticado e possui pedidos.
  Quando acessar a área Meus pedidos.
  Então o sistema deve listar apenas seus pedidos com número, data, valor e status atual.
Detalhes e histórico
  Dado que o comprador seleciona um pedido.
  Quando abrir seus detalhes.
  Então o sistema deve mostrar itens, artesão, endereço, pagamento, personalização, transporte e histórico cronológico de status.
Isolamento
  Dado que um comprador tenta consultar pedido de outro usuário.
  Quando informar ou manipular o identificador.
  Então o sistema deve negar o acesso.

### HU-14 - Gestão de pedidos pelo artesão

História: Como artesão, quero visualizar e atualizar os pedidos relacionados aos meus produtos, para organizar a produção, a embalagem e o envio das encomendas.

Critérios de aceite:

Fila de pedidos
  Dado que existem pedidos pagos contendo produtos do artesão.
  Quando ele acessar a gestão de pedidos.
  Então o sistema deve listar somente os itens sob sua responsabilidade, com prazo e status.
Atualização válida
  Dado que o pedido está em um status que permite avanço.
  Quando o artesão registrar Preparando, Pronto para envio ou Enviado.
  Então o sistema deve validar a transição, registrar data e responsável e disponibilizar a atualização ao comprador.
Atualização inválida
  Dado que o pedido está cancelado ou a transição não é permitida.
  Quando o artesão tentar alterar o status.
  Então o sistema deve impedir a operação e preservar o histórico.

### HU-15 - Painel de gestão do artesão

História: Como artesão, quero acessar um painel consolidado de produtos, estoque, pedidos e avaliações, para acompanhar e gerenciar minha operação na plataforma.

Critérios de aceite:

Resumo
  Dado que o artesão está autenticado.
  Quando acessar seu painel.
  Então o sistema deve apresentar indicadores de produtos ativos, estoque baixo e pedidos por status, além de avaliações recentes quando houver avaliações disponíveis.
Atalhos
  Dado que um indicador possui itens associados.
  Quando o artesão selecioná-lo.
  Então o sistema deve direcioná-lo à lista filtrada correspondente.
Escopo
  Dado que o artesão acessa o painel.
  Quando os dados forem carregados.
  Então o sistema deve incluir somente informações de sua própria loja e produtos.

### HU-16 - Painel administrativo

História: Como administrador, quero gerenciar usuários, artesãos, produtos, validações e conteúdos reportados, para manter a plataforma segura e em conformidade com suas regras.

Critérios de aceite:

Visão administrativa
  Dado que o administrador está autenticado.
  Quando acessar o painel.
  Então o sistema deve apresentar filas de validação, usuários, artesãos, produtos e ocorrências que exigem ação.
Ação auditável
  Dado que o administrador suspende, reativa, aprova, reprova ou modera um registro.
  Quando confirmar a ação.
  Então o sistema deve exigir justificativa quando aplicável e registrar responsável, data e resultado.
Acesso restrito
  Dado que um usuário sem papel de administrador tenta acessar o painel ou seus endpoints.
  Quando realizar a tentativa.
  Então o sistema deve negar o acesso e não expor dados administrativos.

## Insumo 2: formato exato de cada caso

Uma tabela por caso, com estes campos, nesta ordem:

- ID: R2-CT-NN, numerado em sequência
- HU: a história de origem
- CA: o nome do critério de aceite, como está escrito acima
- Título
- Nível: Componente, Integração de componentes ou Sistema
- Técnica: partição de equivalência, valor-limite, transição de estados ou tabela de decisão
- Pré-condições
- Passos, numerados
- Resultado esperado, com o trecho do "Então" que ele verifica
- Pós-condições

## Insumo 3: escopo

Dentro: as 16 histórias acima. Fora: operadora de pagamento real, transportadora real, aplicativo mobile, avaliações, suporte, personalização e comparação de peças. O que o Origem faz quando o pagamento é recusado ou falha está dentro.

## Insumo 4: níveis cobertos

- Componente: função ou serviço isolado, sem rede nem banco.
- Integração de componentes: rota real da API com banco PostgreSQL real.
- Sistema: jornada no navegador com frontend, API e banco reais.

Ponha cada caso no nível mais barato que consegue prová-lo. Aceite e integração com sistemas de terceiros não entram.

## Entrega

1. Os casos, agrupados por história.
2. Uma tabela final: regra, técnica, partições ou valores, IDs dos casos.
3. A seção "Lacunas".
