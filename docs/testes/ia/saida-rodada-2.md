# Casos de teste do sistema Origem

Convenções usadas nos casos:

- Valor que os requisitos não fixam aparece como símbolo (L, D, T, Q, X, k, C). Quem executa escolhe o dado concreto; nenhum símbolo é regra do sistema.
- "Ver L-NN" aponta para a seção Lacunas. Nesses casos o teste verifica só a parte do critério que está escrita.
- Nos casos de pagamento, o evento do provedor é simulado na entrada da API, porque a operadora real está fora do escopo.
- As rotas são citadas pela função ("rota de login"), porque os requisitos não trazem caminho, método nem código de resposta.

## HU-01 - Autenticação e perfis de acesso

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-01 |
| HU | HU-01 |
| CA | Login válido |
| Título | Autentica usuário ativo com credenciais válidas e cria sessão |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (classe válida: cadastro ativo e credenciais corretas) |
| Pré-condições | Usuário com cadastro ativo gravado no banco. Nenhuma sessão aberta para ele. Campos que formam as credenciais: ver L-01. |
| Passos | 1. Enviar à rota de login as credenciais corretas do usuário.<br>2. Com a sessão recebida, chamar uma rota protegida permitida ao perfil dele. |
| Resultado esperado | O login é aceito, uma sessão é criada para o usuário e a rota protegida responde com sucesso. Os atributos que tornam a sessão "segura" não são verificados (ver L-02). Então: "autenticá-lo, criar uma sessão segura". |
| Pós-condições | Existe uma sessão ativa do usuário. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-02 |
| HU | HU-01 |
| CA | Login válido |
| Título | Comprador é levado à área do seu perfil depois do login |
| Nível | Sistema |
| Técnica | Tabela de decisão (perfil comprador, área do comprador) |
| Pré-condições | Comprador com cadastro ativo. Navegador sem sessão. Área de cada perfil: ver L-03. |
| Passos | 1. Abrir a tela de login no navegador.<br>2. Informar as credenciais corretas do comprador.<br>3. Confirmar a entrada. |
| Resultado esperado | O navegador abre a área correspondente ao perfil comprador, e não a de artesão nem a de administrador. Então: "direcioná-lo à área correspondente ao seu perfil". |
| Pós-condições | Comprador autenticado, com sessão ativa no navegador. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-03 |
| HU | HU-01 |
| CA | Login válido |
| Título | Artesão é levado à área do seu perfil depois do login |
| Nível | Sistema |
| Técnica | Tabela de decisão (perfil artesão, área do artesão) |
| Pré-condições | Artesão com cadastro ativo. Navegador sem sessão. Área de cada perfil: ver L-03. |
| Passos | 1. Abrir a tela de login no navegador.<br>2. Informar as credenciais corretas do artesão.<br>3. Confirmar a entrada. |
| Resultado esperado | O navegador abre a área correspondente ao perfil artesão, e não a de comprador nem a de administrador. Então: "direcioná-lo à área correspondente ao seu perfil". |
| Pós-condições | Artesão autenticado, com sessão ativa no navegador. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-04 |
| HU | HU-01 |
| CA | Login válido |
| Título | Administrador é levado à área do seu perfil depois do login |
| Nível | Sistema |
| Técnica | Tabela de decisão (perfil administrador, área do administrador) |
| Pré-condições | Administrador com cadastro ativo. Navegador sem sessão. Área de cada perfil: ver L-03. |
| Passos | 1. Abrir a tela de login no navegador.<br>2. Informar as credenciais corretas do administrador.<br>3. Confirmar a entrada. |
| Resultado esperado | O navegador abre a área correspondente ao perfil administrador, e não a de comprador nem a de artesão. Então: "direcioná-lo à área correspondente ao seu perfil". |
| Pós-condições | Administrador autenticado, com sessão ativa no navegador. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-05 |
| HU | HU-01 |
| CA | Credenciais inválidas |
| Título | Nega login de conta existente com senha incorreta |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (classe inválida: conta existe, senha errada) |
| Pré-condições | Usuário com cadastro ativo gravado no banco. Nenhuma sessão aberta para ele. |
| Passos | 1. Enviar à rota de login o identificador da conta existente com uma senha incorreta.<br>2. Ler a resposta inteira.<br>3. Consultar o registro de tentativas de login. |
| Resultado esperado | O acesso é negado e nenhuma sessão é criada. A mensagem não traz dado sensível (lista de dados sensíveis: ver L-05). A tentativa fica registrada (conteúdo do registro: ver L-06). Então: "negar o acesso, exibir mensagem sem revelar dados sensíveis e registrar a tentativa conforme a política de segurança". |
| Pós-condições | Nenhuma sessão criada. Uma tentativa inválida a mais no registro. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-06 |
| HU | HU-01 |
| CA | Credenciais inválidas |
| Título | Nega login com identificador que não tem cadastro |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (classe inválida: conta não existe) |
| Pré-condições | Nenhum cadastro gravado com o identificador usado no teste. |
| Passos | 1. Enviar à rota de login um identificador sem cadastro e uma senha qualquer.<br>2. Ler a resposta inteira.<br>3. Consultar o registro de tentativas de login. |
| Resultado esperado | O acesso é negado e nenhuma sessão é criada. A mensagem não traz dado sensível (ver L-05). A tentativa fica registrada (ver L-06). Então: "negar o acesso, exibir mensagem sem revelar dados sensíveis e registrar a tentativa conforme a política de segurança". |
| Pós-condições | Nenhuma sessão criada. Nenhum cadastro novo. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-07 |
| HU | HU-01 |
| CA | Autorização por role |
| Título | Comprador não executa função exclusiva de artesão |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (perfil comprador, função de artesão) |
| Pré-condições | Comprador autenticado. A função usada é o cadastro de peça da HU-02 (lista de funções exclusivas: ver L-07). |
| Passos | 1. Com a sessão do comprador, enviar à rota de cadastro de peça uma requisição com dados completos.<br>2. Consultar as peças gravadas no banco. |
| Resultado esperado | A operação é bloqueada e a resposta é de acesso não autorizado (formato da resposta: ver L-07). Nenhuma peça é criada. Então: "bloquear a operação e retornar uma resposta de acesso não autorizado". |
| Pós-condições | Banco sem peça nova. Sessão do comprador segue ativa. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-08 |
| HU | HU-01 |
| CA | Autorização por role |
| Título | Comprador não executa função exclusiva de administrador |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (perfil comprador, função de administrador) |
| Pré-condições | Comprador autenticado. Existe uma solicitação de validação com status Pendente. A função usada é a aprovação de validação da HU-03 (ver L-07). |
| Passos | 1. Com a sessão do comprador, enviar à rota de aprovação a aprovação da solicitação Pendente.<br>2. Consultar a solicitação no banco. |
| Resultado esperado | A operação é bloqueada e a resposta é de acesso não autorizado (ver L-07). A solicitação continua Pendente. Então: "bloquear a operação e retornar uma resposta de acesso não autorizado". |
| Pós-condições | Solicitação segue Pendente, sem responsável nem decisão registrados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-09 |
| HU | HU-01 |
| CA | Expiração da sessão |
| Título | Sessão expirada não acessa funcionalidade protegida |
| Nível | Integração de componentes |
| Técnica | Transição de estados (sessão ativa para sessão expirada) |
| Pré-condições | Usuário autenticado. A sessão tem prazo de validade T definido (valor de T e comportamento no instante exato: ver L-08). |
| Passos | 1. Chamar uma rota protegida com a sessão ainda válida e confirmar o sucesso.<br>2. Fazer o prazo T vencer no ambiente de teste.<br>3. Chamar a mesma rota com a mesma sessão. |
| Resultado esperado | No passo 3 o acesso é impedido e a resposta pede nova autenticação (forma do pedido: ver L-08). Então: "impedir o acesso à funcionalidade protegida e solicitar nova autenticação". |
| Pós-condições | Usuário sem sessão válida. Nenhum dado alterado pela chamada do passo 3. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-10 |
| HU | HU-01 |
| CA | Limite de tentativas de login |
| Título | Uma tentativa abaixo do limite não gera bloqueio |
| Nível | Integração de componentes |
| Técnica | Valor-limite (L menos 1 tentativas inválidas) |
| Pré-condições | Política de segurança configurada com limite L e duração de bloqueio D (valores: ver L-09). Usuário ativo sem tentativa inválida registrada. |
| Passos | 1. Enviar L menos 1 logins seguidos com senha incorreta, do mesmo usuário e do mesmo cliente.<br>2. Enviar um login com as credenciais corretas. |
| Resultado esperado | O passo 2 autentica o usuário. O bloqueio temporário não é aplicado, porque o limite não foi atingido. Trecho verificado por contraste: "Quando o usuário atingir o limite de tentativas inválidas" e "aplicar o bloqueio temporário". |
| Pós-condições | Sessão ativa do usuário. Nenhum bloqueio registrado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-11 |
| HU | HU-01 |
| CA | Limite de tentativas de login |
| Título | Atingir o limite aplica o bloqueio temporário |
| Nível | Integração de componentes |
| Técnica | Valor-limite (L tentativas inválidas) |
| Pré-condições | Política de segurança configurada com limite L e duração D (ver L-09). Usuário ativo sem tentativa inválida registrada. |
| Passos | 1. Enviar L logins seguidos com senha incorreta, do mesmo usuário e do mesmo cliente.<br>2. Ler a resposta da tentativa de número L.<br>3. Consultar o registro de ocorrências de segurança. |
| Resultado esperado | O bloqueio temporário é aplicado. A resposta informa a restrição sem trazer dado sensível (ver L-05). A ocorrência fica registrada (ver L-06). Então: "aplicar o bloqueio temporário pelo período configurado, informar a restrição sem revelar dados sensíveis e registrar a ocorrência conforme a política de segurança". |
| Pós-condições | Bloqueio temporário em vigor. Nenhuma sessão criada. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-12 |
| HU | HU-01 |
| CA | Limite de tentativas de login |
| Título | Bloqueio vale durante todo o período configurado |
| Nível | Integração de componentes |
| Técnica | Transição de estados (estado bloqueado, evento de login dentro do período) |
| Pré-condições | Bloqueio temporário recém-aplicado, como ao fim do R2-CT-11. Período D ainda não terminou (ver L-09). |
| Passos | 1. Antes do fim de D, enviar à rota de login as credenciais corretas, do mesmo usuário e do mesmo cliente.<br>2. Ler a resposta. |
| Resultado esperado | O acesso continua negado e a resposta informa a restrição sem trazer dado sensível (ver L-05). Então: "aplicar o bloqueio temporário pelo período configurado, informar a restrição sem revelar dados sensíveis". |
| Pós-condições | Bloqueio segue em vigor. Nenhuma sessão criada. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-13 |
| HU | HU-01 |
| CA | Limite de tentativas de login |
| Título | Bloqueio termina depois do período configurado |
| Nível | Integração de componentes |
| Técnica | Transição de estados (bloqueado para desbloqueado ao fim de D) |
| Pré-condições | Bloqueio temporário aplicado, como ao fim do R2-CT-11. Duração D conhecida (ver L-09). |
| Passos | 1. Fazer o período D terminar no ambiente de teste.<br>2. Enviar à rota de login as credenciais corretas, do mesmo usuário e do mesmo cliente. |
| Resultado esperado | O login é aceito, porque o bloqueio é temporário e vale só pelo período configurado. Então: "aplicar o bloqueio temporário pelo período configurado". |
| Pós-condições | Sessão ativa do usuário. Bloqueio encerrado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-14 |
| HU | HU-01 |
| CA | Recuperação de senha |
| Título | Solicitação válida para conta existente inicia a recuperação sem confirmar a conta |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (conta existente) |
| Pré-condições | Conta ativa gravada no banco. Mecanismo de recuperação e definição de solicitação válida: ver L-10. |
| Passos | 1. Enviar à rota de recuperação de senha uma solicitação válida com o identificador da conta existente.<br>2. Guardar a resposta inteira.<br>3. Consultar o registro do procedimento de recuperação. |
| Resultado esperado | O procedimento de recuperação é iniciado para a conta (evidência observável depende de L-10). A resposta não afirma que a conta existe. Então: "iniciar o procedimento seguro de recuperação, sem revelar se uma conta específica existe". |
| Pós-condições | Procedimento de recuperação aberto para a conta. Senha atual inalterada. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-15 |
| HU | HU-01 |
| CA | Recuperação de senha |
| Título | Solicitação para conta inexistente não revela que a conta não existe |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (conta inexistente) |
| Pré-condições | Nenhum cadastro com o identificador usado. Resposta do R2-CT-14 guardada para comparação. |
| Passos | 1. Enviar à rota de recuperação de senha uma solicitação com identificador sem cadastro.<br>2. Guardar a resposta inteira.<br>3. Comparar com a resposta do R2-CT-14. |
| Resultado esperado | A resposta não diz que a conta não existe e não permite distinguir este caso do R2-CT-14 pelo que o solicitante recebe. Então: "sem revelar se uma conta específica existe". |
| Pós-condições | Nenhuma conta criada nem alterada. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-16 |
| HU | HU-01 |
| CA | Acesso direto a recurso restrito |
| Título | Artesão não aprova validação chamando a API diretamente |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (perfil artesão, operação de administrador) |
| Pré-condições | Artesão autenticado. Solicitação de validação Pendente de uma peça dele. Matriz de permissões por perfil: ver L-11. |
| Passos | 1. Com a sessão do artesão, enviar direto à rota de aprovação a aprovação da solicitação.<br>2. Consultar a solicitação e a peça no banco. |
| Resultado esperado | A operação é negada. A solicitação continua Pendente, sem decisão registrada, e a peça continua sem selo. Então: "negar a operação e preservar a integridade dos dados". |
| Pós-condições | Solicitação e peça iguais ao estado anterior ao teste. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-17 |
| HU | HU-01 |
| CA | Acesso direto a recurso restrito |
| Título | Comprador não altera status de pedido chamando a API diretamente |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (perfil comprador, operação de artesão) |
| Pré-condições | Comprador autenticado. Pedido pago dele, com status e histórico conhecidos. Matriz de permissões: ver L-11. |
| Passos | 1. Com a sessão do comprador, enviar direto à rota de atualização de status do pedido o registro de Preparando.<br>2. Consultar o pedido e o histórico de status. |
| Resultado esperado | A operação é negada. O status e o histórico do pedido ficam iguais aos de antes. Então: "negar a operação e preservar a integridade dos dados". |
| Pós-condições | Pedido e histórico inalterados. |

## HU-02 - Cadastro de peças

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-18 |
| HU | HU-02 |
| CA | Cadastro completo |
| Título | Artesão cadastra peça com todos os dados |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (todos os dados presentes e válidos) |
| Pré-condições | Artesão autenticado. Regras de validação de cada campo: ver L-13. |
| Passos | 1. Enviar à rota de cadastro de peça nome, descrição, categoria, técnica, origem, preço, imagens, disponibilidade e capacidade de produção, todos válidos.<br>2. Consultar a peça gravada no banco. |
| Resultado esperado | O cadastro é aceito. A peça fica gravada com os nove dados enviados, associada ao artesão autenticado e registrada para publicação no catálogo (momento da publicação: ver L-14). Então: "validar os dados, associar a peça ao artesão e registrar o produto para publicação no catálogo". |
| Pós-condições | Existe uma peça nova do artesão. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-19 |
| HU | HU-02 |
| CA | Dados obrigatórios ausentes |
| Título | Validação aponta o campo obrigatório que falta |
| Nível | Componente |
| Técnica | Partição de equivalência (um campo obrigatório ausente, uma partição por campo) |
| Pré-condições | Função de validação da peça isolada, sem rede nem banco. Lista de campos obrigatórios conhecida (ver L-12). |
| Passos | 1. Montar um conjunto completo e válido de dados da peça.<br>2. Retirar um campo obrigatório.<br>3. Chamar a função de validação.<br>4. Repetir os passos 2 e 3 para cada campo obrigatório, um por vez. |
| Resultado esperado | Em cada repetição a validação reprova os dados e indica exatamente o campo retirado. Então: "impedir o cadastro e indicar os campos que precisam ser corrigidos". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-20 |
| HU | HU-02 |
| CA | Dados obrigatórios ausentes |
| Título | Validação aponta todos os campos obrigatórios que faltam |
| Nível | Componente |
| Técnica | Partição de equivalência (mais de um campo obrigatório ausente) |
| Pré-condições | Função de validação da peça isolada, sem rede nem banco. Lista de campos obrigatórios conhecida (ver L-12). |
| Passos | 1. Montar um conjunto completo e válido de dados da peça.<br>2. Retirar dois campos obrigatórios.<br>3. Chamar a função de validação. |
| Resultado esperado | A validação reprova os dados e indica os dois campos retirados, sem omitir nenhum. Então: "indicar os campos que precisam ser corrigidos". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-21 |
| HU | HU-02 |
| CA | Dados obrigatórios ausentes |
| Título | Rota de cadastro não grava peça com campo obrigatório ausente |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (requisição com campo obrigatório ausente) |
| Pré-condições | Artesão autenticado. Quantidade de peças dele no banco conhecida. Lista de campos obrigatórios: ver L-12. |
| Passos | 1. Enviar à rota de cadastro de peça os dados sem um campo obrigatório.<br>2. Ler a resposta.<br>3. Contar as peças do artesão no banco. |
| Resultado esperado | O cadastro é impedido, a resposta indica o campo a corrigir e a quantidade de peças do artesão não muda. Então: "impedir o cadastro e indicar os campos que precisam ser corrigidos". |
| Pós-condições | Nenhuma peça nova no banco. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-22 |
| HU | HU-02 |
| CA | Produção sob demanda |
| Título | Peça sob demanda grava capacidade e prazo sem virar estoque |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (peça sob demanda) |
| Pré-condições | Artesão autenticado. Unidades de capacidade e de prazo: ver L-15. |
| Passos | 1. Enviar à rota de cadastro uma peça produzida sob demanda, com capacidade C e prazo de produção.<br>2. Consultar a peça gravada.<br>3. Consultar o estoque da peça. |
| Resultado esperado | A capacidade C e o prazo ficam gravados na peça. A quantidade em estoque disponível da peça não recebe o valor C. Então: "registrar essas informações sem tratá-las como estoque previamente disponível". |
| Pós-condições | Peça sob demanda gravada, sem estoque disponível criado a partir da capacidade. |

## HU-03 - Validação de origem e autenticidade

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-23 |
| HU | HU-03 |
| CA | Envio para análise |
| Título | Solicitação de validação nasce com status Pendente, data e versão das evidências |
| Nível | Integração de componentes |
| Técnica | Transição de estados (sem solicitação para Pendente) |
| Pré-condições | Artesão autenticado. Peça dele com origem, técnica, descrição do processo produtivo e evidências de apoio cadastradas. Nenhuma solicitação aberta para a peça. |
| Passos | 1. Enviar à rota de validação a solicitação para a peça.<br>2. Consultar a solicitação gravada. |
| Resultado esperado | A solicitação fica registrada com status Pendente, data e versão das evidências (forma de identificar a versão: ver L-16). Então: "registrar a solicitação com status Pendente, data e versão das evidências". |
| Pós-condições | Solicitação Pendente. Peça sem selo. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-24 |
| HU | HU-03 |
| CA | Aprovação |
| Título | Aprovação registra responsável, data e justificativa e habilita o selo |
| Nível | Integração de componentes |
| Técnica | Transição de estados (Pendente para Aprovada) |
| Pré-condições | Administrador autenticado. Solicitação Pendente, revisada conforme a lista de verificação da equipe (ver L-17). |
| Passos | 1. Enviar à rota de aprovação a aprovação da solicitação, com justificativa.<br>2. Consultar a solicitação.<br>3. Consultar a peça. |
| Resultado esperado | A solicitação guarda o administrador responsável, a data e a justificativa. O status passa a Aprovada. O selo da peça fica habilitado. Então: "registrar responsável, data e justificativa, alterar o status para Aprovada e habilitar o selo de origem/autenticidade". |
| Pós-condições | Solicitação Aprovada. Peça com selo habilitado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-25 |
| HU | HU-03 |
| CA | Pendência ou reprovação |
| Título | Reprovação registra o motivo, notifica o artesão e não exibe o selo |
| Nível | Integração de componentes |
| Técnica | Transição de estados (Pendente, evento reprovar) |
| Pré-condições | Administrador autenticado. Solicitação Pendente com inconsistências. |
| Passos | 1. Enviar à rota de reprovação a reprovação da solicitação, com o motivo.<br>2. Consultar a solicitação.<br>3. Consultar as notificações destinadas ao artesão.<br>4. Consultar os dados públicos da peça. |
| Resultado esperado | O motivo fica registrado. Existe uma notificação para o artesão dono da peça (canal: ver L-18). Os dados públicos da peça não trazem selo. Então: "registrar o motivo, notificar o artesão e não exibir o selo de validação". |
| Pós-condições | Solicitação reprovada. Peça sem selo. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-26 |
| HU | HU-03 |
| CA | Pendência ou reprovação |
| Título | Pedido de ajustes registra o motivo, notifica o artesão e não exibe o selo |
| Nível | Integração de componentes |
| Técnica | Transição de estados (Pendente, evento solicitar ajustes) |
| Pré-condições | Administrador autenticado. Solicitação Pendente com informações faltando. |
| Passos | 1. Enviar à rota correspondente o pedido de ajustes para a solicitação, com o motivo.<br>2. Consultar a solicitação.<br>3. Consultar as notificações destinadas ao artesão.<br>4. Consultar os dados públicos da peça. |
| Resultado esperado | O motivo fica registrado. Existe uma notificação para o artesão (ver L-18). Os dados públicos da peça não trazem selo. O status resultante não é verificado (ver L-18). Então: "registrar o motivo, notificar o artesão e não exibir o selo de validação". |
| Pós-condições | Solicitação com motivo de ajuste registrado. Peça sem selo. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-27 |
| HU | HU-03 |
| CA | Exibição pública |
| Título | Validação Pendente mostra origem declarada e nenhum selo |
| Nível | Componente |
| Técnica | Tabela de decisão (status Pendente, selo ausente) |
| Pré-condições | Função que monta a exibição pública da peça, isolada, sem rede nem banco. |
| Passos | 1. Chamar a função com uma peça cuja validação está Pendente e cuja origem foi informada pelo artesão.<br>2. Ler a saída. |
| Resultado esperado | A saída traz a origem tal como o artesão declarou e não apresenta o selo de validação. Então: "mostrar a origem como declarada pelo artesão e não deve apresentar o selo de validação". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-28 |
| HU | HU-03 |
| CA | Exibição pública |
| Título | Validação Reprovada mostra origem declarada e nenhum selo |
| Nível | Componente |
| Técnica | Tabela de decisão (status Reprovada, selo ausente) |
| Pré-condições | Função que monta a exibição pública da peça, isolada, sem rede nem banco. |
| Passos | 1. Chamar a função com uma peça cuja validação está Reprovada e cuja origem foi informada pelo artesão.<br>2. Ler a saída. |
| Resultado esperado | A saída traz a origem tal como o artesão declarou e não apresenta o selo de validação. Então: "mostrar a origem como declarada pelo artesão e não deve apresentar o selo de validação". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-29 |
| HU | HU-03 |
| CA | Exibição pública |
| Título | Validação Cancelada mostra origem declarada e nenhum selo |
| Nível | Componente |
| Técnica | Tabela de decisão (status Cancelada, selo ausente) |
| Pré-condições | Função que monta a exibição pública da peça, isolada, sem rede nem banco. Como uma validação chega a Cancelada: ver L-19. |
| Passos | 1. Chamar a função com uma peça cuja validação está Cancelada e cuja origem foi informada pelo artesão.<br>2. Ler a saída. |
| Resultado esperado | A saída traz a origem tal como o artesão declarou e não apresenta o selo de validação. Então: "mostrar a origem como declarada pelo artesão e não deve apresentar o selo de validação". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-30 |
| HU | HU-03 |
| CA | Exibição pública |
| Título | Página da peça com validação Pendente não mostra selo ao cliente |
| Nível | Sistema |
| Técnica | Partição de equivalência (peça sem validação aprovada, vista no navegador) |
| Pré-condições | Peça ativa e disponível, com origem cadastrada e validação Pendente. |
| Passos | 1. Abrir a vitrine no navegador como cliente.<br>2. Selecionar a peça.<br>3. Ler a página da peça. |
| Resultado esperado | A página mostra a origem declarada pelo artesão. Nenhum selo de validação aparece na página. Então: "mostrar a origem como declarada pelo artesão e não deve apresentar o selo de validação". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-31 |
| HU | HU-03 |
| CA | Aprovação administrativa da autenticidade |
| Título | Aprovação mantém o histórico de auditoria da solicitação |
| Nível | Integração de componentes |
| Técnica | Transição de estados (pendente para aprovada, com conferência do histórico) |
| Pré-condições | Administrador autorizado e autenticado (ver L-21). Peça com solicitação de validação pendente. Histórico de auditoria da solicitação já contém o envio. |
| Passos | 1. Enviar à rota de aprovação a aprovação da solicitação.<br>2. Consultar a decisão gravada.<br>3. Consultar o histórico de auditoria da solicitação.<br>4. Consultar os dados públicos da peça. |
| Resultado esperado | A decisão fica registrada com o administrador responsável e a data da aprovação. O histórico de auditoria conserva o registro anterior e ganha o registro da aprovação. A exibição do selo de autenticidade passa a ser permitida (regras da plataforma: ver L-20). Então: "registrar a decisão, identificar o responsável e a data da aprovação, manter o histórico de auditoria e permitir a exibição do selo de autenticidade". |
| Pós-condições | Solicitação aprovada. Histórico com os dois registros. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-32 |
| HU | HU-03 |
| CA | Reprovação da autenticidade |
| Título | Reprovação registra decisão e justificativa e impede o selo |
| Nível | Integração de componentes |
| Técnica | Transição de estados (pendente para reprovada) |
| Pré-condições | Administrador autorizado e autenticado (ver L-21). Solicitação de validação pendente. |
| Passos | 1. Enviar à rota de reprovação a reprovação da solicitação, com justificativa.<br>2. Consultar a decisão gravada.<br>3. Chamar a rota pública de detalhes da peça. |
| Resultado esperado | A decisão e a justificativa ficam registradas (quando a justificativa é exigida: ver L-22). A resposta pública da peça não traz o selo de autenticidade. Então: "registrar a decisão e sua justificativa, quando exigida pelo processo, e impedir a exibição do selo de autenticidade". |
| Pós-condições | Solicitação reprovada. Peça sem selo. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-33 |
| HU | HU-03 |
| CA | Solicitação ainda pendente |
| Título | Peça que nunca pediu validação não mostra selo |
| Nível | Componente |
| Técnica | Partição de equivalência (peça sem aprovação: nenhuma solicitação registrada) |
| Pré-condições | Função que monta a exibição pública da peça, isolada, sem rede nem banco. |
| Passos | 1. Chamar a função com uma peça que não tem nenhuma solicitação de validação.<br>2. Ler a saída. |
| Resultado esperado | A saída não apresenta o selo de autenticidade. A partição "solicitação pendente" já está coberta por R2-CT-27 e R2-CT-30. Então: "não deve exibir o selo de autenticidade como se a peça estivesse aprovada". |
| Pós-condições | Nenhuma, o teste não grava dados. |

## HU-04 - Vitrine

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-34 |
| HU | HU-04 |
| CA | Catálogo disponível |
| Título | Listagem da vitrine traz os dados de cada peça disponível |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (peça cadastrada, ativa e disponível) |
| Pré-condições | Peças A e B cadastradas, ativas e disponíveis, cada uma de um artesão conhecido. Definição de ativa e de disponível: ver L-23. |
| Passos | 1. Chamar a rota de listagem da vitrine como cliente.<br>2. Localizar A e B na resposta.<br>3. Conferir os dados de cada uma. |
| Resultado esperado | A e B aparecem na listagem, cada uma com imagem, nome, preço, artesão e indicação de disponibilidade. Então: "apresentar as peças com imagem, nome, preço, artesão e indicação de disponibilidade". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-35 |
| HU | HU-04 |
| CA | Catálogo disponível |
| Título | Vitrine no navegador apresenta as peças disponíveis |
| Nível | Sistema |
| Técnica | Partição de equivalência (vitrine com peças disponíveis) |
| Pré-condições | Peças A e B cadastradas, ativas e disponíveis. |
| Passos | 1. Abrir a vitrine no navegador como cliente.<br>2. Localizar A e B na tela.<br>3. Conferir o que é mostrado de cada uma. |
| Resultado esperado | A tela mostra A e B com imagem, nome, preço, artesão e indicação de disponibilidade. Então: "apresentar as peças com imagem, nome, preço, artesão e indicação de disponibilidade". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-36 |
| HU | HU-04 |
| CA | Produto indisponível |
| Título | Peça sem estoque não aparece como disponível para compra |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (situação: sem estoque) |
| Pré-condições | Peça A ativa e disponível, usada como controle. Peça B ativa e sem estoque. |
| Passos | 1. Chamar a rota de listagem da vitrine como cliente.<br>2. Verificar como A e B aparecem na resposta. |
| Resultado esperado | B não é apresentada como disponível para compra (se some da vitrine ou aparece marcada como indisponível: ver L-24). A aparece como disponível. Então: "não deve apresentá-la como disponível para compra". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-37 |
| HU | HU-04 |
| CA | Produto indisponível |
| Título | Peça reservada não aparece como disponível para compra |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (situação: reservada) |
| Pré-condições | Peça A ativa e disponível, usada como controle. Peça B ativa e reservada. |
| Passos | 1. Chamar a rota de listagem da vitrine como cliente.<br>2. Verificar como A e B aparecem na resposta. |
| Resultado esperado | B não é apresentada como disponível para compra (ver L-24). A aparece como disponível. Então: "não deve apresentá-la como disponível para compra". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-38 |
| HU | HU-04 |
| CA | Produto indisponível |
| Título | Peça inativa não aparece como disponível para compra |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (situação: inativa) |
| Pré-condições | Peça A ativa e disponível, usada como controle. Peça B inativa. |
| Passos | 1. Chamar a rota de listagem da vitrine como cliente.<br>2. Verificar como A e B aparecem na resposta. |
| Resultado esperado | B não é apresentada como disponível para compra (ver L-24). A aparece como disponível. Então: "não deve apresentá-la como disponível para compra". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-39 |
| HU | HU-04 |
| CA | Navegação |
| Título | Vitrine navega entre páginas e abre o produto em tela de desktop |
| Nível | Sistema |
| Técnica | Partição de equivalência (tamanho de tela de desktop) |
| Pré-condições | Peças ativas e disponíveis em quantidade que ocupe mais de uma página da vitrine (itens por página: ver L-25). Navegador em um tamanho de tela definido para desktop (ver L-25). |
| Passos | 1. Abrir a vitrine no navegador.<br>2. Ir para a página seguinte.<br>3. Voltar para a página anterior.<br>4. Selecionar uma peça. |
| Resultado esperado | A vitrine troca de página nos dois sentidos e cada página mostra suas peças com os dados do critério Catálogo disponível. A seleção abre a página do produto. Nenhum conteúdo ou função fica inacessível. Então: "permitir a navegação entre as páginas da vitrine e o acesso à página do produto sem perda de conteúdo ou funcionalidade nos tamanhos de tela definidos". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-40 |
| HU | HU-04 |
| CA | Navegação |
| Título | Vitrine navega entre páginas e abre o produto em tela de dispositivo móvel |
| Nível | Sistema |
| Técnica | Partição de equivalência (tamanho de tela de dispositivo móvel) |
| Pré-condições | Peças ativas e disponíveis em quantidade que ocupe mais de uma página da vitrine (ver L-25). Navegador em um tamanho de tela definido para dispositivos móveis (ver L-25). |
| Passos | 1. Abrir a vitrine no navegador.<br>2. Ir para a página seguinte.<br>3. Voltar para a página anterior.<br>4. Selecionar uma peça. |
| Resultado esperado | A vitrine troca de página nos dois sentidos e cada página mostra suas peças com os dados do critério Catálogo disponível. A seleção abre a página do produto. Nenhum conteúdo ou função fica inacessível. Então: "permitir a navegação entre as páginas da vitrine e o acesso à página do produto sem perda de conteúdo ou funcionalidade nos tamanhos de tela definidos". |
| Pós-condições | Nenhum dado alterado. |

## HU-05 - Detalhes da peça e do artesão

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-41 |
| HU | HU-05 |
| CA | Detalhes completos |
| Título | Rota de detalhes devolve todos os dados da peça e do artesão |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (peça com todos os dados cadastrados) |
| Pré-condições | Peça com todos os dados cadastrados, associada a um artesão. Valores de modalidade de produção e informações do artesão: ver L-26. |
| Passos | 1. Chamar a rota de detalhes da peça como cliente.<br>2. Conferir os dados da resposta com os gravados no banco. |
| Resultado esperado | A resposta traz descrição, imagens, técnica, categoria, origem, preço, disponibilidade, modalidade de produção e informações do artesão associado, iguais aos gravados. Então: "apresentar descrição, imagens, técnica, categoria, origem, preço, disponibilidade, modalidade de produção e informações do artesão associado". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-42 |
| HU | HU-05 |
| CA | Detalhes completos |
| Título | Página da peça apresenta todos os dados ao cliente |
| Nível | Sistema |
| Técnica | Partição de equivalência (peça com todos os dados cadastrados, vista no navegador) |
| Pré-condições | Peça ativa e disponível, com todos os dados cadastrados e associada a um artesão. |
| Passos | 1. Abrir a vitrine no navegador como cliente.<br>2. Selecionar a peça.<br>3. Percorrer a página da peça. |
| Resultado esperado | A página mostra descrição, imagens, técnica, categoria, origem, preço, disponibilidade, modalidade de produção e informações do artesão associado. Então: "apresentar descrição, imagens, técnica, categoria, origem, preço, disponibilidade, modalidade de produção e informações do artesão associado". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-43 |
| HU | HU-05 |
| CA | Autenticidade |
| Título | Validação Aprovada exibe o selo |
| Nível | Componente |
| Técnica | Tabela de decisão (status Aprovada, selo presente) |
| Pré-condições | Função que monta a exibição pública da peça, isolada, sem rede nem banco. |
| Passos | 1. Chamar a função com uma peça cuja validação está aprovada.<br>2. Ler a saída. |
| Resultado esperado | A saída apresenta o selo. Este caso completa a tabela de decisão dos casos R2-CT-27, R2-CT-28, R2-CT-29 e R2-CT-33. Então: "exibir o selo". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-44 |
| HU | HU-05 |
| CA | Autenticidade |
| Título | Consulta das informações validadas não expõe documentos privados |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (peça aprovada com documento privado entre as evidências) |
| Pré-condições | Peça com validação aprovada. A solicitação tem pelo menos um documento classificado como privado (classificação e lista de informações validadas: ver L-27). |
| Passos | 1. Chamar a rota de detalhes da peça como cliente.<br>2. Chamar a consulta das informações validadas da peça.<br>3. Procurar nas duas respostas o documento privado ou um endereço que leve a ele. |
| Resultado esperado | A resposta traz o selo e as informações validadas. Nenhuma das respostas contém o documento privado nem um endereço de acesso a ele. Então: "exibir o selo e permitir consultar as informações validadas sem expor documentos privados". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-45 |
| HU | HU-05 |
| CA | Informação opcional ausente |
| Título | Campo opcional vazio não quebra a página da peça |
| Nível | Componente |
| Técnica | Partição de equivalência (um campo opcional ausente, uma partição por campo) |
| Pré-condições | Função de apresentação da página da peça, isolada, com dados fixos, sem rede nem banco. Lista de campos opcionais conhecida (ver L-28). |
| Passos | 1. Montar os dados de uma peça com todos os campos preenchidos.<br>2. Retirar um campo opcional.<br>3. Gerar a apresentação da página.<br>4. Repetir os passos 2 e 3 para cada campo opcional, um por vez. |
| Resultado esperado | Em cada repetição o campo retirado é omitido ou aparece indicado como não fornecido (qual das duas formas: ver L-28). Os demais campos são apresentados e a geração termina sem erro. Então: "omitir o campo ou indicar que a informação não foi fornecida, sem quebrar a apresentação". |
| Pós-condições | Nenhuma, o teste não grava dados. |

## HU-06 - Busca e filtros

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-46 |
| HU | HU-06 |
| CA | Busca combinada |
| Título | Texto mais um filtro devolve só a peça disponível que atende aos dois |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (atende ao texto, atende ao filtro, está disponível) |
| Pré-condições | Categoria K cadastrada. Peça A: contém o termo, categoria K, disponível. Peça B: contém o termo, outra categoria, disponível. Peça C: não contém o termo, categoria K, disponível. Peça D: contém o termo, categoria K, indisponível. Campos em que o texto é procurado: ver L-29. |
| Passos | 1. Chamar a rota de busca com o termo como texto e o filtro de categoria igual a K.<br>2. Listar as peças devolvidas. |
| Resultado esperado | Só a peça A é devolvida. B, C e D ficam de fora. Então: "apresentar apenas as peças disponíveis que correspondem à combinação dos critérios". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-47 |
| HU | HU-06 |
| CA | Busca combinada |
| Título | Texto mais categoria, técnica e região devolve só a peça que atende a todos |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (cada peça falha em exatamente um critério) |
| Pré-condições | Peça A: contém o termo, categoria K, técnica Te, região R, disponível. Peça B igual a A, mas de outra categoria. Peça C igual a A, mas de outra técnica. Peça D igual a A, mas de outra região. Peça E igual a A, mas sem o termo. Relação entre região e os campos do cadastro: ver L-29. |
| Passos | 1. Chamar a rota de busca com o termo como texto e os filtros categoria K, técnica Te e região R.<br>2. Listar as peças devolvidas. |
| Resultado esperado | Só a peça A é devolvida. B, C, D e E ficam de fora, cada uma por falhar em um critério. Então: "apresentar apenas as peças disponíveis que correspondem à combinação dos critérios". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-48 |
| HU | HU-06 |
| CA | Sem resultados |
| Título | Busca sem correspondência informa que nada foi encontrado e deixa mexer nos filtros |
| Nível | Sistema |
| Técnica | Partição de equivalência (conjunto de resultados vazio) |
| Pré-condições | Existem peças disponíveis cadastradas. Nenhuma atende ao texto e aos filtros usados no teste. |
| Passos | 1. Abrir a busca no navegador como cliente.<br>2. Informar o texto e selecionar os filtros sem correspondência.<br>3. Executar a busca.<br>4. Limpar os filtros pelo controle oferecido na tela.<br>5. Repetir os passos 2 e 3 e, desta vez, alterar um filtro. |
| Resultado esperado | Nos passos 3 e 5 a tela informa que nenhum resultado foi encontrado (texto da mensagem: ver L-30). A tela permite limpar os filtros (passo 4) e alterar os filtros (passo 5). Então: "informar que nenhum resultado foi encontrado e permitir limpar ou alterar os filtros". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-49 |
| HU | HU-06 |
| CA | Remoção de filtro |
| Título | Remover um filtro atualiza o resultado e mantém os outros critérios |
| Nível | Sistema |
| Técnica | Tabela de decisão (filtro removido, critérios mantidos) |
| Pré-condições | Peça A: contém o termo, categoria K, técnica Te, disponível. Peça B: contém o termo, outra categoria, técnica Te, disponível. Peça C: contém o termo, categoria K, outra técnica, disponível. |
| Passos | 1. Abrir a busca no navegador como cliente.<br>2. Informar o termo e selecionar os filtros categoria K e técnica Te.<br>3. Confirmar que só A aparece.<br>4. Remover o filtro de categoria.<br>5. Ler o resultado e os critérios que seguem selecionados. |
| Resultado esperado | O resultado passa a mostrar A e B, e C continua de fora. O texto e o filtro técnica Te seguem selecionados. Então: "atualizar os resultados e manter os demais critérios selecionados". |
| Pós-condições | Nenhum dado alterado. |

## HU-07 - Perfil do artesão e da loja

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-50 |
| HU | HU-07 |
| CA | Perfil ativo |
| Título | Perfil ativo devolve dados da loja, do artesão e os produtos associados |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (artesão e loja ativos) |
| Pré-condições | Artesão e loja com cadastro ativo, com história, técnicas e região preenchidas e produtos associados. |
| Passos | 1. Chamar a rota do perfil público como cliente.<br>2. Conferir a resposta com os dados gravados. |
| Resultado esperado | A resposta traz informações da loja e do artesão, história, técnicas, região e produtos associados (se produtos indisponíveis entram na lista: ver L-31). Então: "apresentar informações da loja e do artesão, história, técnicas, região e produtos associados". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-51 |
| HU | HU-07 |
| CA | Navegação pelo produto |
| Título | Nome do artesão na página da peça abre o perfil do artesão |
| Nível | Sistema |
| Técnica | Tabela de decisão (elemento selecionado: nome do artesão) |
| Pré-condições | Peça ativa e disponível de um artesão ativo, com loja ativa. |
| Passos | 1. Abrir a página da peça no navegador como cliente.<br>2. Selecionar o nome do artesão. |
| Resultado esperado | O navegador abre o perfil daquele artesão (se artesão e loja têm perfis separados: ver L-31). Então: "abrir o respectivo perfil". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-52 |
| HU | HU-07 |
| CA | Navegação pelo produto |
| Título | Nome da loja na página da peça abre o perfil da loja |
| Nível | Sistema |
| Técnica | Tabela de decisão (elemento selecionado: nome da loja) |
| Pré-condições | Peça ativa e disponível de um artesão ativo, com loja ativa. |
| Passos | 1. Abrir a página da peça no navegador como cliente.<br>2. Selecionar o nome da loja. |
| Resultado esperado | O navegador abre o perfil daquela loja (ver L-31). Então: "abrir o respectivo perfil". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-53 |
| HU | HU-07 |
| CA | Perfil inativo |
| Título | Perfil de artesão inativo não aparece como ativo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (artesão inativo, loja ativa) |
| Pré-condições | Artesão inativo com loja ativa. A loja tem produtos, entre eles pelo menos um indisponível. |
| Passos | 1. Chamar a rota do perfil público como visitante.<br>2. Ler a resposta. |
| Resultado esperado | O perfil não é apresentado como ativo e nenhum produto indisponível é listado (o que aparece no lugar: ver L-32). Então: "não deve apresentá-lo como ativo nem listar produtos indisponíveis". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-54 |
| HU | HU-07 |
| CA | Perfil inativo |
| Título | Perfil de loja inativa não aparece como ativo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (artesão ativo, loja inativa) |
| Pré-condições | Artesão ativo com loja inativa. A loja tem produtos, entre eles pelo menos um indisponível. |
| Passos | 1. Chamar a rota do perfil público como visitante.<br>2. Ler a resposta. |
| Resultado esperado | O perfil não é apresentado como ativo e nenhum produto indisponível é listado (ver L-32). Então: "não deve apresentá-lo como ativo nem listar produtos indisponíveis". |
| Pós-condições | Nenhum dado alterado. |

## HU-08 - Carrinho

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-55 |
| HU | HU-08 |
| CA | Adicionar item |
| Título | Adicionar peça disponível inclui item com quantidade, preço vigente e subtotal |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (peça disponível) |
| Pré-condições | Comprador com carrinho vazio. Peça A disponível, com preço vigente conhecido. |
| Passos | 1. Enviar à rota do carrinho a inclusão da peça A.<br>2. Consultar o carrinho. |
| Resultado esperado | O carrinho contém o item A com a quantidade permitida, o preço vigente de A e um subtotal (regra da quantidade permitida e fórmula do subtotal: ver L-33). Então: "incluir o item, quantidade permitida, preço vigente e subtotal". |
| Pós-condições | Carrinho com um item. Estoque e vendas de A inalterados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-56 |
| HU | HU-08 |
| CA | Alterar carrinho |
| Título | Alterar a quantidade atualiza os totais e preserva os outros itens |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (ação: alterar para quantidade permitida) |
| Pré-condições | Carrinho com as peças A e B. A nova quantidade de A usada no teste é permitida. Totais atuais anotados. |
| Passos | 1. Enviar à rota do carrinho a nova quantidade de A.<br>2. Consultar o carrinho. |
| Resultado esperado | A aparece com a nova quantidade. Os totais mudam para refletir a alteração. O item B fica igual, com a mesma quantidade e o mesmo preço. Então: "atualizar os totais e preservar os demais itens". |
| Pós-condições | Carrinho com A na nova quantidade e B inalterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-57 |
| HU | HU-08 |
| CA | Alterar carrinho |
| Título | Remover um item atualiza os totais e preserva os outros itens |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (ação: remover item) |
| Pré-condições | Carrinho com as peças A e B. Totais atuais anotados. |
| Passos | 1. Enviar à rota do carrinho a remoção de A.<br>2. Consultar o carrinho. |
| Resultado esperado | A sai do carrinho. Os totais mudam para refletir a remoção. O item B fica igual, com a mesma quantidade e o mesmo preço. Então: "atualizar os totais e preservar os demais itens". |
| Pós-condições | Carrinho só com B. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-58 |
| HU | HU-08 |
| CA | Revalidar disponibilidade |
| Título | Abrir o carrinho depois de mudança de preço informa a alteração |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (mudança: preço, gatilho: abrir o carrinho) |
| Pré-condições | Carrinho com a peça A, incluída ao preço P1. Depois da inclusão, o artesão alterou o preço de A para P2. |
| Passos | 1. Chamar a rota que abre o carrinho.<br>2. Ler os dados do item A e os avisos da resposta. |
| Resultado esperado | Os dados de A são revalidados e a resposta informa que o preço mudou (forma do aviso e aplicação do novo preço: ver L-34). Então: "revalidar os dados, informar a alteração". |
| Pós-condições | Carrinho revalidado. Nenhum pedido criado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-59 |
| HU | HU-08 |
| CA | Revalidar disponibilidade |
| Título | Abrir o carrinho com item que ficou indisponível informa e impede a compra dele |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (mudança: disponibilidade, gatilho: abrir o carrinho) |
| Pré-condições | Carrinho com a peça A, incluída quando estava disponível. Depois da inclusão, A ficou indisponível. |
| Passos | 1. Chamar a rota que abre o carrinho.<br>2. Ler os dados do item A e os avisos da resposta.<br>3. Tentar seguir para a compra com A no carrinho. |
| Resultado esperado | A resposta informa que A deixou de estar disponível e a compra de A é impedida (destino do item no carrinho: ver L-34). Então: "revalidar os dados, informar a alteração e impedir a compra de item indisponível". |
| Pós-condições | Nenhum pedido criado com A. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-60 |
| HU | HU-08 |
| CA | Revalidar disponibilidade |
| Título | Iniciar o checkout depois de mudança de preço informa a alteração |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (mudança: preço, gatilho: iniciar o checkout) |
| Pré-condições | Carrinho com a peça A, incluída ao preço P1. Depois da inclusão, o artesão alterou o preço de A para P2. O carrinho não foi reaberto desde então. |
| Passos | 1. Chamar a rota que inicia o checkout.<br>2. Ler os dados do item A e os avisos da resposta. |
| Resultado esperado | Os dados de A são revalidados e a resposta informa que o preço mudou (ver L-34). Então: "revalidar os dados, informar a alteração". |
| Pós-condições | Nenhum pedido criado ao preço P1. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-61 |
| HU | HU-08 |
| CA | Revalidar disponibilidade |
| Título | Iniciar o checkout com item que ficou indisponível impede a compra dele |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (mudança: disponibilidade, gatilho: iniciar o checkout) |
| Pré-condições | Carrinho com a peça A, incluída quando estava disponível. Depois da inclusão, A ficou indisponível. O carrinho não foi reaberto desde então. |
| Passos | 1. Chamar a rota que inicia o checkout.<br>2. Ler os avisos da resposta.<br>3. Consultar os pedidos do comprador. |
| Resultado esperado | A resposta informa que A deixou de estar disponível e a compra de A é impedida. Nenhum pedido com A é criado. Então: "revalidar os dados, informar a alteração e impedir a compra de item indisponível". |
| Pós-condições | Nenhum pedido criado com A. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-62 |
| HU | HU-08 |
| CA | Peça única |
| Título | Peça única entra no carrinho com uma unidade e não vira venda |
| Nível | Integração de componentes |
| Técnica | Valor-limite (quantidade igual a 1, no limite) |
| Pré-condições | Comprador com carrinho vazio. Peça U marcada como única, ativa e disponível, sem venda confirmada. |
| Passos | 1. Enviar à rota do carrinho a inclusão de U.<br>2. Consultar o carrinho.<br>3. Consultar as vendas confirmadas de U. |
| Resultado esperado | U está no carrinho com quantidade igual a uma unidade. Não existe venda confirmada de U. Então: "limitar a quantidade a uma unidade sem considerar a simples inclusão como venda confirmada". |
| Pós-condições | Carrinho com U. Nenhuma venda confirmada de U. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-63 |
| HU | HU-08 |
| CA | Peça única |
| Título | Quantidade de peça única não passa de uma unidade |
| Nível | Integração de componentes |
| Técnica | Valor-limite (quantidade igual a 2, logo acima do limite) |
| Pré-condições | Carrinho com a peça única U, quantidade igual a uma unidade. |
| Passos | 1. Enviar à rota do carrinho a alteração da quantidade de U para duas unidades.<br>2. Consultar o carrinho. |
| Resultado esperado | A quantidade de U no carrinho continua igual a uma unidade (se a tentativa é rejeitada ou ajustada: ver L-35). Então: "limitar a quantidade a uma unidade". |
| Pós-condições | Carrinho com U em uma unidade. |

## HU-09 - Criação do pedido e checkout

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-64 |
| HU | HU-09 |
| CA | Criar pedido |
| Título | Checkout confirmado cria pedido com status Aguardando pagamento |
| Nível | Integração de componentes |
| Técnica | Transição de estados (carrinho válido para pedido Aguardando pagamento) |
| Pré-condições | Comprador autenticado. Carrinho com itens válidos. Dados de entrega completos (campos exigidos: ver L-36). |
| Passos | 1. Enviar à rota de checkout a confirmação.<br>2. Consultar o pedido gravado. |
| Resultado esperado | Existe um pedido com identificador, os itens do carrinho, valores, endereço de entrega, status Aguardando pagamento e registro de data. Então: "criar um pedido com identificador, itens, valores, endereço, status Aguardando pagamento e registro de data". |
| Pós-condições | Pedido do comprador em Aguardando pagamento. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-65 |
| HU | HU-09 |
| CA | Criar pedido |
| Título | Comprador transforma o carrinho em pedido pelo navegador |
| Nível | Sistema |
| Técnica | Partição de equivalência (jornada com carrinho válido e entrega completa) |
| Pré-condições | Comprador com cadastro ativo. Peça A disponível. |
| Passos | 1. Entrar na plataforma como comprador.<br>2. Adicionar A ao carrinho.<br>3. Iniciar o checkout.<br>4. Preencher todos os dados de entrega.<br>5. Confirmar o checkout.<br>6. Abrir o pedido criado. |
| Resultado esperado | O pedido é criado e aparece para o comprador com identificador, item A, valores, endereço informado, status Aguardando pagamento e data. Então: "criar um pedido com identificador, itens, valores, endereço, status Aguardando pagamento e registro de data". |
| Pós-condições | Pedido do comprador em Aguardando pagamento. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-66 |
| HU | HU-09 |
| CA | Dados inválidos |
| Título | Checkout sem dado de entrega não cria pedido |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (entrega incompleta, itens disponíveis) |
| Pré-condições | Comprador autenticado. Carrinho com itens válidos. Um dado de entrega exigido está ausente (ver L-36). Quantidade de pedidos do comprador anotada. |
| Passos | 1. Enviar à rota de checkout a confirmação.<br>2. Ler a resposta.<br>3. Contar os pedidos do comprador. |
| Resultado esperado | O pedido não é criado. A resposta explica o que precisa ser corrigido nos dados de entrega (forma da explicação: ver L-37). Então: "impedir a criação do pedido e explicar as correções necessárias". |
| Pós-condições | Nenhum pedido novo. Carrinho inalterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-67 |
| HU | HU-09 |
| CA | Dados inválidos |
| Título | Checkout com item indisponível não cria pedido |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (entrega completa, item indisponível) |
| Pré-condições | Comprador autenticado. Dados de entrega completos. O carrinho tem um item que ficou indisponível. Quantidade de pedidos do comprador anotada. |
| Passos | 1. Enviar à rota de checkout a confirmação.<br>2. Ler a resposta.<br>3. Contar os pedidos do comprador. |
| Resultado esperado | O pedido não é criado. A resposta explica que o item indisponível precisa ser corrigido (ver L-37). Então: "impedir a criação do pedido e explicar as correções necessárias". |
| Pós-condições | Nenhum pedido novo. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-68 |
| HU | HU-09 |
| CA | Imutabilidade do histórico |
| Título | Pedido guarda o preço do momento da compra |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (dado alterado depois da compra: preço) |
| Pré-condições | Pedido criado com a peça A ao preço P1. |
| Passos | 1. Como artesão, alterar o preço de A para P2.<br>2. Como comprador, consultar o pedido. |
| Resultado esperado | O pedido continua mostrando o preço P1 para A e os mesmos valores de antes. Então: "o pedido deve preservar um retrato dos dados relevantes no momento da compra". |
| Pós-condições | Peça A com preço P2. Pedido inalterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-69 |
| HU | HU-09 |
| CA | Imutabilidade do histórico |
| Título | Pedido guarda a descrição do momento da compra |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (dado alterado depois da compra: descrição) |
| Pré-condições | Pedido criado com a peça A, cuja descrição no momento da compra é conhecida. |
| Passos | 1. Como artesão, alterar a descrição de A.<br>2. Como comprador, consultar o pedido. |
| Resultado esperado | O pedido continua mostrando a descrição que A tinha no momento da compra. A partição "perfil do produto" não tem caso (ver L-38). Então: "o pedido deve preservar um retrato dos dados relevantes no momento da compra". |
| Pós-condições | Peça A com a nova descrição. Pedido inalterado. |

## HU-10 - Pagamento

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-70 |
| HU | HU-10 |
| CA | Pagamento aprovado |
| Título | Confirmação do provedor leva o pedido a Pago e atualiza a disponibilidade |
| Nível | Integração de componentes |
| Técnica | Transição de estados (Aguardando pagamento para Pago) |
| Pré-condições | Pedido em Aguardando pagamento com a peça A. Disponibilidade de A anotada. Evento do provedor simulado (formato: ver L-39). |
| Passos | 1. Entregar à API o evento de transação confirmada, com um identificador externo.<br>2. Consultar o pagamento e o pedido.<br>3. Consultar a disponibilidade de A. |
| Resultado esperado | O pagamento fica associado ao pedido, com o identificador externo gravado. O pedido passa a Pago. A disponibilidade de A é atualizada. Então: "associar o pagamento ao pedido, registrar o identificador externo, alterar o pedido para Pago e atualizar a disponibilidade da peça". |
| Pós-condições | Pedido Pago. Venda confirmada. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-71 |
| HU | HU-10 |
| CA | Pagamento recusado |
| Título | Recusa do provedor mantém o pedido não pago e não confirma venda |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (resposta do provedor: recusada) |
| Pré-condições | Pedido em Aguardando pagamento com a peça A. Vendas confirmadas de A anotadas. Evento do provedor simulado. |
| Passos | 1. Entregar à API a resposta de transação recusada.<br>2. Consultar o pedido.<br>3. Consultar o que o comprador recebe sobre o pedido.<br>4. Consultar as vendas confirmadas de A. |
| Resultado esperado | O pedido não está Pago (status exato: ver L-40). O comprador é informado da recusa (forma: ver L-40). O número de vendas confirmadas de A não muda. Então: "o pedido deve permanecer não pago, o comprador deve ser informado e nenhuma venda deve ser confirmada". |
| Pós-condições | Pedido não pago. Nenhuma venda nova. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-72 |
| HU | HU-10 |
| CA | Falha ou cancelamento |
| Título | Falha no pagamento registra o motivo, atualiza o pedido e libera a reserva |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (evento: falha) |
| Pré-condições | Pedido em Aguardando pagamento com a peça A reservada. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de falha do pagamento.<br>2. Consultar o pedido e o motivo registrado.<br>3. Consultar as reservas de A. |
| Resultado esperado | O motivo da falha fica registrado. O pedido é atualizado (status de destino: ver L-41). A reserva de A é liberada. Então: "registrar o motivo, atualizar o pedido e liberar reservas conforme as regras de estoque e peça única". |
| Pós-condições | Pedido atualizado. A sem a reserva deste pedido. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-73 |
| HU | HU-10 |
| CA | Falha ou cancelamento |
| Título | Expiração do pagamento registra o motivo, atualiza o pedido e libera a reserva |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (evento: expiração) |
| Pré-condições | Pedido em Aguardando pagamento com a peça A reservada. Prazo de expiração: ver L-41. |
| Passos | 1. Fazer o pagamento expirar e processar o evento de expiração.<br>2. Consultar o pedido e o motivo registrado.<br>3. Consultar as reservas de A. |
| Resultado esperado | O motivo da expiração fica registrado. O pedido é atualizado (ver L-41). A reserva de A é liberada. Então: "registrar o motivo, atualizar o pedido e liberar reservas conforme as regras de estoque e peça única". |
| Pós-condições | Pedido atualizado. A sem a reserva deste pedido. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-74 |
| HU | HU-10 |
| CA | Falha ou cancelamento |
| Título | Cancelamento do pagamento registra o motivo, atualiza o pedido e libera a reserva |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (evento: cancelamento) |
| Pré-condições | Pedido em Aguardando pagamento com a peça A reservada. Evento de cancelamento simulado (quem pode cancelar: ver L-41). |
| Passos | 1. Entregar à API o evento de cancelamento do pagamento.<br>2. Consultar o pedido e o motivo registrado.<br>3. Consultar as reservas de A. |
| Resultado esperado | O motivo do cancelamento fica registrado. O pedido é atualizado (ver L-41). A reserva de A é liberada. Então: "registrar o motivo, atualizar o pedido e liberar reservas conforme as regras de estoque e peça única". |
| Pós-condições | Pedido atualizado. A sem a reserva deste pedido. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-75 |
| HU | HU-10 |
| CA | Idempotência |
| Título | Evento de confirmação repetido atualiza pagamento e estoque uma vez só |
| Nível | Integração de componentes |
| Técnica | Valor-limite (segunda entrega do mesmo evento) |
| Pré-condições | Pedido em Aguardando pagamento com a peça A. Estoque de A anotado. Evento do provedor simulado (o que identifica o mesmo evento: ver L-42). |
| Passos | 1. Entregar à API o evento de transação confirmada.<br>2. Anotar pagamento, pedido e estoque de A.<br>3. Entregar de novo o mesmo evento.<br>4. Consultar pagamento, pedido e estoque de A. |
| Resultado esperado | Depois do passo 3 existe um único pagamento para o pedido e o estoque de A é igual ao anotado no passo 2. Então: "o pagamento e o estoque devem ser atualizados uma única vez". |
| Pós-condições | Um pagamento, pedido Pago, estoque baixado uma vez. |

## HU-11 - Peças únicas

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-76 |
| HU | HU-11 |
| CA | Marcação |
| Título | Produto cadastrado como peça única fica com uma unidade vendável |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (momento da marcação: cadastro) |
| Pré-condições | Artesão autenticado. |
| Passos | 1. Enviar à rota de cadastro um produto marcado como peça única.<br>2. Consultar a disponibilidade vendável do produto. |
| Resultado esperado | A disponibilidade vendável do produto é de uma unidade. Então: "limitar sua disponibilidade vendável a uma unidade". |
| Pós-condições | Produto gravado como peça única. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-77 |
| HU | HU-11 |
| CA | Marcação |
| Título | Produto editado para peça única fica com uma unidade vendável |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (momento da marcação: edição) |
| Pré-condições | Artesão autenticado. Produto dele já cadastrado, ainda não marcado como único, sem reserva nem pedido em aberto (outras situações: ver L-45). |
| Passos | 1. Enviar à rota de edição do produto a marcação de peça única.<br>2. Consultar a disponibilidade vendável do produto. |
| Resultado esperado | A disponibilidade vendável do produto é de uma unidade. Então: "limitar sua disponibilidade vendável a uma unidade". |
| Pós-condições | Produto gravado como peça única. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-78 |
| HU | HU-11 |
| CA | Compra concorrente |
| Título | Dois checkouts ao mesmo tempo: só uma reserva segue |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (confirmações simultâneas) |
| Pré-condições | Peça única U ativa e disponível. Compradores A e B autenticados, cada um com U no carrinho e dados de entrega completos. |
| Passos | 1. Disparar ao mesmo tempo a confirmação do checkout de A e a de B.<br>2. Ler as duas respostas.<br>3. Consultar as reservas e os pedidos que contêm U. |
| Resultado esperado | Só um dos checkouts prossegue, com reserva válida de U. O outro comprador recebe aviso de indisponibilidade. Existe uma única reserva de U. Então: "somente a primeira reserva válida deve prosseguir e o segundo comprador deve receber aviso de indisponibilidade". |
| Pós-condições | Um pedido em Aguardando pagamento com U. U reservada. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-79 |
| HU | HU-11 |
| CA | Compra concorrente |
| Título | Segundo checkout depois da reserva do primeiro recebe aviso de indisponibilidade |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (confirmações em sequência) |
| Pré-condições | Peça única U. Comprador A já confirmou o checkout e tem reserva válida de U, com pedido em Aguardando pagamento. Comprador B tem U no carrinho e dados de entrega completos. |
| Passos | 1. Enviar a confirmação do checkout de B.<br>2. Ler a resposta.<br>3. Consultar as reservas de U. |
| Resultado esperado | B recebe aviso de indisponibilidade e não ganha reserva. A reserva de A continua válida. Então: "somente a primeira reserva válida deve prosseguir e o segundo comprador deve receber aviso de indisponibilidade". |
| Pós-condições | Só a reserva de A existe. Nenhum pedido de B com U. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-80 |
| HU | HU-11 |
| CA | Pagamento confirmado |
| Título | Peça única paga fica indisponível e continua visível no pedido |
| Nível | Integração de componentes |
| Técnica | Transição de estados (reservada para vendida) |
| Pré-condições | Pedido do comprador A com a peça única U, em Aguardando pagamento, com reserva válida. Comprador B autenticado. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de pagamento aprovado do pedido de A.<br>2. Como B, tentar adicionar U ao carrinho.<br>3. Como A, consultar o histórico do pedido. |
| Resultado esperado | U fica indisponível para novas compras e a tentativa de B não resulta em compra de U. U continua visível no pedido de A. Então: "a peça deve ficar indisponível para novas compras e permanecer visível no histórico do pedido". |
| Pós-condições | U vendida para A. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-81 |
| HU | HU-11 |
| CA | Liberação |
| Título | Reserva expirada devolve a peça única ativa ao catálogo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (evento: reserva expira, peça ativa e apta) |
| Pré-condições | Peça única U ativa e apta à venda, reservada para um pedido em Aguardando pagamento. Duração da reserva: ver L-43. |
| Passos | 1. Fazer a reserva expirar e processar o evento.<br>2. Chamar a rota de listagem da vitrine. |
| Resultado esperado | U volta a aparecer no catálogo como disponível. Então: "a peça deve voltar ao catálogo se continuar ativa e apta à venda". |
| Pós-condições | U disponível, sem reserva. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-82 |
| HU | HU-11 |
| CA | Liberação |
| Título | Falha no pagamento devolve a peça única ativa ao catálogo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (evento: pagamento falha, peça ativa e apta) |
| Pré-condições | Peça única U ativa e apta à venda, reservada para um pedido em Aguardando pagamento. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de falha do pagamento.<br>2. Chamar a rota de listagem da vitrine. |
| Resultado esperado | U volta a aparecer no catálogo como disponível. Então: "a peça deve voltar ao catálogo se continuar ativa e apta à venda". |
| Pós-condições | U disponível, sem reserva. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-83 |
| HU | HU-11 |
| CA | Liberação |
| Título | Cancelamento do pagamento devolve a peça única ativa ao catálogo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (evento: pagamento cancelado, peça ativa e apta) |
| Pré-condições | Peça única U ativa e apta à venda, reservada para um pedido em Aguardando pagamento. Evento de cancelamento simulado. |
| Passos | 1. Entregar à API o evento de cancelamento do pagamento.<br>2. Chamar a rota de listagem da vitrine. |
| Resultado esperado | U volta a aparecer no catálogo como disponível. Então: "a peça deve voltar ao catálogo se continuar ativa e apta à venda". |
| Pós-condições | U disponível, sem reserva. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-84 |
| HU | HU-11 |
| CA | Liberação |
| Título | Peça única inativada durante a reserva não volta ao catálogo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (evento: pagamento falha, peça inativa) |
| Pré-condições | Peça única U reservada para um pedido em Aguardando pagamento. Depois da reserva, U foi inativada. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de falha do pagamento.<br>2. Chamar a rota de listagem da vitrine. |
| Resultado esperado | U não volta ao catálogo como disponível, porque não continua ativa (critério de "apta à venda": ver L-44). Então: "a peça deve voltar ao catálogo se continuar ativa e apta à venda". |
| Pós-condições | U inativa, sem reserva. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-85 |
| HU | HU-11 |
| CA | Tentativas simultâneas de compra |
| Título | Três compradores ao mesmo tempo geram no máximo uma venda confirmada |
| Nível | Integração de componentes |
| Técnica | Valor-limite (número de vendas confirmadas: máximo 1, com três tentativas) |
| Pré-condições | Peça única U ativa e disponível. Compradores A, B e C autenticados, cada um com U no carrinho e dados de entrega completos. Evento do provedor simulado. |
| Passos | 1. Disparar ao mesmo tempo a confirmação do checkout de A, B e C.<br>2. Para cada pedido criado, entregar o evento de pagamento aprovado.<br>3. Contar as vendas confirmadas de U.<br>4. Listar os compradores ligados a essas vendas. |
| Resultado esperado | Existe no máximo uma venda confirmada de U, ligada a um único comprador. Então: "permitir, no máximo, uma venda confirmada para a peça e impedir que a mesma peça seja vendida a mais de um comprador". |
| Pós-condições | U vendida a no máximo um comprador. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-86 |
| HU | HU-11 |
| CA | Liberação após falha na compra |
| Título | Peça única liberada pode ser comprada por outro comprador |
| Nível | Integração de componentes |
| Técnica | Transição de estados (reservada para disponível, depois nova reserva) |
| Pré-condições | Peça única U ativa, reservada para a tentativa de compra de A, sem venda confirmada. Comprador B autenticado, com dados de entrega completos. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de falha do pagamento de A.<br>2. Como B, adicionar U ao carrinho.<br>3. Como B, confirmar o checkout. |
| Resultado esperado | U é liberada no passo 1 e a nova tentativa de B é aceita, com pedido criado contendo U. Então: "liberar a peça para nova tentativa de compra, desde que ela continue ativa e não exista venda confirmada". |
| Pós-condições | Pedido de B com U em Aguardando pagamento. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-87 |
| HU | HU-11 |
| CA | Liberação após falha na compra |
| Título | Peça única com venda confirmada não é liberada por evento de falha |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (evento de falha, venda confirmada existente) |
| Pré-condições | Peça única U com venda confirmada para o comprador A. Evento de falha, cancelamento ou expiração de uma tentativa de compra de U pronto para envio (origem e ordem desse evento: ver L-44). |
| Passos | 1. Entregar à API o evento.<br>2. Consultar a situação de U.<br>3. Chamar a rota de listagem da vitrine. |
| Resultado esperado | U não é liberada e não volta a ficar disponível para compra. A venda confirmada de A continua registrada. Então: "desde que ela continue ativa e não exista venda confirmada". |
| Pós-condições | U segue vendida para A. |

## HU-12 - Estoque

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-88 |
| HU | HU-12 |
| CA | Consulta |
| Título | Gestão de estoque mostra disponível, reservada e vendida de cada produto |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (artesão com produtos cadastrados) |
| Pré-condições | Artesão autenticado com dois produtos. Para cada produto, quantidades disponível, reservada e vendida preparadas e anotadas. |
| Passos | 1. Chamar a rota de gestão de estoque.<br>2. Comparar as quantidades de cada produto com as anotadas. |
| Resultado esperado | A resposta traz, para cada produto, a quantidade disponível, a reservada e a vendida, iguais às anotadas. Então: "mostrar quantidade disponível, reservada e vendida de cada produto". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-89 |
| HU | HU-12 |
| CA | Baixa após venda |
| Título | Pagamento confirmado baixa o estoque uma única vez |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (pagamento confirmado com estoque suficiente) |
| Pré-condições | Produto com estoque suficiente. Pedido em Aguardando pagamento com k unidades do produto. Quantidades de estoque anotadas. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de pagamento confirmado.<br>2. Consultar o estoque do produto.<br>3. Consultar o registro de movimentações do estoque. |
| Resultado esperado | As k unidades passam a constar como vendidas e deixam de estar disponíveis para compra. Há uma única atualização de estoque para esse pagamento. Então: "o estoque deve ser atualizado uma única vez". |
| Pós-condições | Estoque baixado em k unidades. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-90 |
| HU | HU-12 |
| CA | Baixa após venda |
| Título | Pagamento confirmado de produto sem estoque não gera venda |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (pagamento confirmado sem estoque) |
| Pré-condições | Produto sem estoque, estado preparado direto no banco. Pedido em Aguardando pagamento com esse produto. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de pagamento confirmado.<br>2. Consultar o estoque e as vendas do produto. |
| Resultado esperado | A venda sem estoque é impedida: não há venda nova do produto e o estoque não fica negativo. O destino do pagamento e do pedido não é verificado (ver L-46). Então: "a venda sem estoque deve ser impedida". |
| Pós-condições | Estoque do produto inalterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-91 |
| HU | HU-12 |
| CA | Produção sob demanda |
| Título | Gestão de estoque não conta produto sob demanda como estoque disponível |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (produto sob demanda) |
| Pré-condições | Artesão autenticado com um produto sob demanda, capacidade C e prazo de produção cadastrados, sem estoque físico. |
| Passos | 1. Chamar a rota de gestão de estoque.<br>2. Ler os dados do produto sob demanda. |
| Resultado esperado | O produto não aparece com C como quantidade disponível em estoque. A capacidade e o prazo de produção são considerados na exibição (forma de considerar: ver L-47). Então: "não deve contabilizá-lo como estoque previamente disponível e deve considerar capacidade e prazo de produção". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-92 |
| HU | HU-12 |
| CA | Estoque baixo |
| Título | Quantidade uma unidade acima do limite não indica estoque baixo |
| Nível | Componente |
| Técnica | Valor-limite (quantidade igual a X mais 1) |
| Pré-condições | Função que decide a indicação de estoque baixo, isolada, sem rede nem banco. Limite X definido pelo artesão. |
| Passos | 1. Chamar a função com limite X e quantidade igual a X mais 1.<br>2. Ler a saída. |
| Resultado esperado | A saída não traz indicação de estoque baixo, porque a quantidade não alcançou o limite. Trecho verificado por contraste: "Dado que a quantidade alcança o limite definido pelo artesão" e "apresentar uma indicação de estoque baixo". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-93 |
| HU | HU-12 |
| CA | Estoque baixo |
| Título | Quantidade igual ao limite indica estoque baixo |
| Nível | Componente |
| Técnica | Valor-limite (quantidade igual a X) |
| Pré-condições | Função que decide a indicação de estoque baixo, isolada, sem rede nem banco. Limite X definido pelo artesão. |
| Passos | 1. Chamar a função com limite X e quantidade igual a X.<br>2. Ler a saída. |
| Resultado esperado | A saída traz a indicação de estoque baixo. O valor X menos 1 não tem caso (ver L-48). Então: "apresentar uma indicação de estoque baixo". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-94 |
| HU | HU-12 |
| CA | Estoque insuficiente |
| Título | Quantidade solicitada igual à disponível é aceita |
| Nível | Componente |
| Técnica | Valor-limite (solicitada igual a Q) |
| Pré-condições | Função que valida a quantidade solicitada contra a disponível, isolada, sem rede nem banco. |
| Passos | 1. Chamar a função com quantidade disponível Q e quantidade solicitada Q.<br>2. Ler a saída. |
| Resultado esperado | A operação é aceita, porque a quantidade disponível não é inferior à solicitada. Trecho verificado por contraste: "Dado que a quantidade disponível de um produto é inferior à quantidade solicitada" e "impedir a operação que exceda a disponibilidade". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-95 |
| HU | HU-12 |
| CA | Estoque insuficiente |
| Título | Quantidade solicitada uma unidade acima da disponível é impedida |
| Nível | Componente |
| Técnica | Valor-limite (solicitada igual a Q mais 1) |
| Pré-condições | Função que valida a quantidade solicitada contra a disponível, isolada, sem rede nem banco. |
| Passos | 1. Chamar a função com quantidade disponível Q e quantidade solicitada Q mais 1.<br>2. Ler a saída. |
| Resultado esperado | A operação é impedida e a saída informa que a quantidade solicitada não pode ser atendida. Então: "impedir a operação que exceda a disponibilidade e informar que a quantidade solicitada não pode ser atendida". |
| Pós-condições | Nenhuma, o teste não grava dados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-96 |
| HU | HU-12 |
| CA | Estoque insuficiente |
| Título | Carrinho não aceita quantidade acima da disponível |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (gatilho: adicionar ao carrinho) |
| Pré-condições | Comprador com carrinho vazio. Produto com quantidade disponível Q gravada no banco. |
| Passos | 1. Enviar à rota do carrinho a inclusão de Q mais 1 unidades do produto.<br>2. Ler a resposta.<br>3. Consultar o carrinho. |
| Resultado esperado | A inclusão é impedida e a resposta informa que a quantidade solicitada não pode ser atendida (texto e ajuste automático: ver L-49). O carrinho não fica com Q mais 1 unidades. Então: "impedir a operação que exceda a disponibilidade e informar que a quantidade solicitada não pode ser atendida". |
| Pós-condições | Carrinho sem quantidade acima da disponível. Estoque inalterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-97 |
| HU | HU-12 |
| CA | Estoque insuficiente |
| Título | Compra não é confirmada quando o estoque caiu abaixo do carrinho |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (gatilho: confirmar a compra) |
| Pré-condições | Comprador autenticado, com k unidades do produto no carrinho e dados de entrega completos. Depois da inclusão, a quantidade disponível do produto caiu para k menos 1. |
| Passos | 1. Enviar à rota de checkout a confirmação da compra.<br>2. Ler a resposta.<br>3. Consultar os pedidos do comprador e o estoque do produto. |
| Resultado esperado | A confirmação é impedida e a resposta informa que a quantidade solicitada não pode ser atendida. Nenhum pedido com k unidades é criado e o estoque não muda. Então: "impedir a operação que exceda a disponibilidade e informar que a quantidade solicitada não pode ser atendida". |
| Pós-condições | Nenhum pedido novo. Estoque inalterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-98 |
| HU | HU-12 |
| CA | Consistência do estoque após a compra |
| Título | Compra confirmada reduz a disponibilidade na quantidade vendida |
| Nível | Integração de componentes |
| Técnica | Valor-limite (k menor que Q) |
| Pré-condições | Produto com quantidade disponível Q registrada. Pedido em Aguardando pagamento com k unidades, sendo k menor que Q. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de pagamento confirmado.<br>2. Consultar o estoque do produto. |
| Resultado esperado | A quantidade vendida aumenta exatamente k. As unidades que seguem compráveis são Q menos k. A soma das quantidades do produto continua coerente com a de antes. Então: "atualizar a disponibilidade de acordo com a quantidade efetivamente vendida, impedindo saldo negativo e preservando a consistência do estoque". |
| Pós-condições | Estoque baixado em k unidades. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-99 |
| HU | HU-12 |
| CA | Consistência do estoque após a compra |
| Título | Compra de todo o estoque zera a disponibilidade sem saldo negativo |
| Nível | Integração de componentes |
| Técnica | Valor-limite (k igual a Q) |
| Pré-condições | Produto com quantidade disponível Q registrada. Pedido em Aguardando pagamento com Q unidades. Evento do provedor simulado. |
| Passos | 1. Entregar à API o evento de pagamento confirmado.<br>2. Consultar o estoque do produto. |
| Resultado esperado | A quantidade vendida aumenta exatamente Q. Não sobra unidade comprável e nenhum saldo fica negativo. Então: "atualizar a disponibilidade de acordo com a quantidade efetivamente vendida, impedindo saldo negativo e preservando a consistência do estoque". |
| Pós-condições | Produto sem unidades disponíveis. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-100 |
| HU | HU-12 |
| CA | Consistência do estoque após a compra |
| Título | Compras simultâneas que somam mais que o estoque não geram saldo negativo |
| Nível | Integração de componentes |
| Técnica | Valor-limite (soma solicitada igual a 2Q, acima de Q) |
| Pré-condições | Produto com quantidade disponível Q registrada. Compradores A e B autenticados, cada um com Q unidades no carrinho e dados de entrega completos. Evento do provedor simulado. |
| Passos | 1. Disparar ao mesmo tempo a confirmação do checkout de A e a de B.<br>2. Para cada pedido criado, entregar o evento de pagamento confirmado.<br>3. Consultar o estoque do produto. |
| Resultado esperado | Nenhum saldo do produto fica negativo. O total vendido não passa de Q. A soma das quantidades do produto continua coerente com a de antes. Então: "impedindo saldo negativo e preservando a consistência do estoque". |
| Pós-condições | No máximo Q unidades vendidas. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-101 |
| HU | HU-12 |
| CA | Produto sob demanda |
| Título | Verificação de compra de produto sob demanda não usa estoque físico |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (produto sob demanda) |
| Pré-condições | Produto sob demanda com capacidade C e prazo de produção registrados, sem estoque físico. Comprador com carrinho vazio. |
| Passos | 1. Enviar à rota do carrinho a inclusão do produto.<br>2. Ler o resultado da verificação de disponibilidade.<br>3. Consultar o estoque físico do produto. |
| Resultado esperado | O estoque físico disponível do produto não recebe o valor C e não é alterado pela verificação. A resposta de disponibilidade considera capacidade e prazo. O resultado da verificação (pode ou não comprar) não é afirmado aqui, porque a regra não está escrita (ver L-47). Então: "considerar a capacidade e o prazo de produção registrados, sem tratar essa capacidade como estoque físico previamente disponível". |
| Pós-condições | Estoque físico do produto inalterado. |

## HU-13 - Acompanhamento de pedidos pelo comprador

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-102 |
| HU | HU-13 |
| CA | Lista de pedidos |
| Título | Meus pedidos lista só os pedidos do comprador autenticado |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (pedidos próprios e pedidos de outro comprador) |
| Pré-condições | Comprador A autenticado, com dois pedidos. Comprador B com um pedido. |
| Passos | 1. Com a sessão de A, chamar a rota de Meus pedidos.<br>2. Conferir cada pedido devolvido. |
| Resultado esperado | A resposta traz os dois pedidos de A, cada um com número, data, valor e status atual. O pedido de B não aparece. Então: "listar apenas seus pedidos com número, data, valor e status atual". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-103 |
| HU | HU-13 |
| CA | Detalhes e histórico |
| Título | Detalhes do pedido mostram os dados e o histórico cronológico de status |
| Nível | Integração de componentes |
| Técnica | Transição de estados (histórico com mais de uma mudança de status) |
| Pré-condições | Comprador autenticado. Pedido dele que já passou por Aguardando pagamento e Pago, com as datas de cada mudança anotadas. |
| Passos | 1. Chamar a rota de detalhes do pedido.<br>2. Conferir os dados devolvidos.<br>3. Conferir a ordem das entradas do histórico. |
| Resultado esperado | A resposta traz itens, artesão, endereço, pagamento e o histórico de status, com as entradas ordenadas pela data em que ocorreram (sentido da ordem: ver L-51). Personalização e transporte não são verificados (ver L-51). Então: "mostrar itens, artesão, endereço, pagamento, personalização, transporte e histórico cronológico de status". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-104 |
| HU | HU-13 |
| CA | Isolamento |
| Título | Comprador não consulta pedido de outro usuário trocando o identificador |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (identificador de pedido alheio) |
| Pré-condições | Compradores A e B, cada um com um pedido. A autenticado. Identificador do pedido de B conhecido. |
| Passos | 1. Com a sessão de A, chamar a rota de detalhes do pedido usando o identificador do pedido de B.<br>2. Ler a resposta. |
| Resultado esperado | O acesso é negado e a resposta não traz nenhum dado do pedido de B (formato da resposta: ver L-52). Então: "negar o acesso". |
| Pós-condições | Nenhum dado alterado. |

## HU-14 - Gestão de pedidos pelo artesão

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-105 |
| HU | HU-14 |
| CA | Fila de pedidos |
| Título | Fila do artesão lista só os itens dele |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (itens próprios e itens de outro artesão) |
| Pré-condições | Pedido pago 1 com um item do artesão A e um item do artesão B. Pedido pago 2 só com item de B. Artesão A autenticado. |
| Passos | 1. Com a sessão de A, chamar a rota de gestão de pedidos.<br>2. Conferir os itens devolvidos. |
| Resultado esperado | A resposta traz só o item de A do pedido 1, com prazo e status (qual prazo: ver L-53). Os itens de B não aparecem. Então: "listar somente os itens sob sua responsabilidade, com prazo e status". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-106 |
| HU | HU-14 |
| CA | Atualização válida |
| Título | Artesão registra Preparando em pedido que permite esse avanço |
| Nível | Integração de componentes |
| Técnica | Transição de estados (status que permite avanço para Preparando) |
| Pré-condições | Artesão autenticado. Pedido com item dele, em um status que permite avançar para Preparando (matriz de transições: ver L-54). |
| Passos | 1. Enviar à rota de atualização de status o registro de Preparando.<br>2. Consultar o pedido e o histórico.<br>3. Com a sessão do comprador, consultar os detalhes do pedido. |
| Resultado esperado | A transição é aceita. O histórico guarda a data e o artesão responsável. O comprador vê o status Preparando no pedido. Então: "validar a transição, registrar data e responsável e disponibilizar a atualização ao comprador". |
| Pós-condições | Pedido em Preparando. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-107 |
| HU | HU-14 |
| CA | Atualização válida |
| Título | Artesão registra Pronto para envio em pedido que permite esse avanço |
| Nível | Integração de componentes |
| Técnica | Transição de estados (status que permite avanço para Pronto para envio) |
| Pré-condições | Artesão autenticado. Pedido com item dele, em um status que permite avançar para Pronto para envio (ver L-54). |
| Passos | 1. Enviar à rota de atualização de status o registro de Pronto para envio.<br>2. Consultar o pedido e o histórico.<br>3. Com a sessão do comprador, consultar os detalhes do pedido. |
| Resultado esperado | A transição é aceita. O histórico guarda a data e o artesão responsável. O comprador vê o status Pronto para envio no pedido. Então: "validar a transição, registrar data e responsável e disponibilizar a atualização ao comprador". |
| Pós-condições | Pedido em Pronto para envio. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-108 |
| HU | HU-14 |
| CA | Atualização válida |
| Título | Artesão registra Enviado em pedido que permite esse avanço |
| Nível | Integração de componentes |
| Técnica | Transição de estados (status que permite avanço para Enviado) |
| Pré-condições | Artesão autenticado. Pedido com item dele, em um status que permite avançar para Enviado (ver L-54). |
| Passos | 1. Enviar à rota de atualização de status o registro de Enviado.<br>2. Consultar o pedido e o histórico.<br>3. Com a sessão do comprador, consultar os detalhes do pedido. |
| Resultado esperado | A transição é aceita. O histórico guarda a data e o artesão responsável. O comprador vê o status Enviado no pedido. Então: "validar a transição, registrar data e responsável e disponibilizar a atualização ao comprador". |
| Pós-condições | Pedido em Enviado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-109 |
| HU | HU-14 |
| CA | Atualização inválida |
| Título | Pedido cancelado não aceita mudança de status |
| Nível | Integração de componentes |
| Técnica | Transição de estados (estado cancelado, qualquer evento do artesão) |
| Pré-condições | Artesão autenticado. Pedido cancelado com item dele. Histórico do pedido anotado. |
| Passos | 1. Enviar à rota de atualização de status o registro de Preparando.<br>2. Ler a resposta.<br>3. Consultar o pedido e o histórico. |
| Resultado esperado | A operação é impedida. O pedido continua cancelado e o histórico é igual ao anotado. Então: "impedir a operação e preservar o histórico". |
| Pós-condições | Pedido e histórico inalterados. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-110 |
| HU | HU-14 |
| CA | Atualização inválida |
| Título | Transição não permitida é recusada e o histórico fica intacto |
| Nível | Integração de componentes |
| Técnica | Transição de estados (par de status que a matriz não permite) |
| Pré-condições | Artesão autenticado. Pedido com item dele, em um status do qual a transição pedida não é permitida (a matriz de transições não está escrita: ver L-54). Histórico do pedido anotado. |
| Passos | 1. Enviar à rota de atualização de status o registro do status não permitido.<br>2. Ler a resposta.<br>3. Consultar o pedido e o histórico. |
| Resultado esperado | A operação é impedida. O status do pedido não muda e o histórico é igual ao anotado. Então: "impedir a operação e preservar o histórico". |
| Pós-condições | Pedido e histórico inalterados. |

## HU-15 - Painel de gestão do artesão

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-111 |
| HU | HU-15 |
| CA | Resumo |
| Título | Painel do artesão traz os indicadores de produtos, estoque baixo e pedidos |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (artesão com dados em todos os indicadores) |
| Pré-condições | Artesão autenticado. Quantidade de produtos ativos, de produtos com estoque baixo e de pedidos em cada status preparada e anotada. |
| Passos | 1. Chamar a rota do painel do artesão.<br>2. Comparar cada indicador com o valor anotado. |
| Resultado esperado | A resposta traz os indicadores de produtos ativos, estoque baixo e pedidos por status, iguais aos anotados. Avaliações recentes não são verificadas (ver L-55). Então: "apresentar indicadores de produtos ativos, estoque baixo e pedidos por status". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-112 |
| HU | HU-15 |
| CA | Atalhos |
| Título | Indicador de produtos ativos leva à lista de produtos ativos |
| Nível | Sistema |
| Técnica | Tabela de decisão (indicador: produtos ativos) |
| Pré-condições | Artesão com produtos ativos e pelo menos um produto inativo. |
| Passos | 1. Entrar na plataforma como artesão.<br>2. Abrir o painel.<br>3. Selecionar o indicador de produtos ativos. |
| Resultado esperado | O navegador abre a lista de produtos filtrada pelos ativos. O produto inativo não aparece. Então: "direcioná-lo à lista filtrada correspondente". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-113 |
| HU | HU-15 |
| CA | Atalhos |
| Título | Indicador de estoque baixo leva à lista de produtos com estoque baixo |
| Nível | Sistema |
| Técnica | Tabela de decisão (indicador: estoque baixo) |
| Pré-condições | Artesão com pelo menos um produto com estoque baixo e um produto fora dessa situação. |
| Passos | 1. Entrar na plataforma como artesão.<br>2. Abrir o painel.<br>3. Selecionar o indicador de estoque baixo. |
| Resultado esperado | O navegador abre a lista filtrada pelos produtos com estoque baixo. O outro produto não aparece. Então: "direcioná-lo à lista filtrada correspondente". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-114 |
| HU | HU-15 |
| CA | Atalhos |
| Título | Indicador de pedidos de um status leva à lista de pedidos desse status |
| Nível | Sistema |
| Técnica | Tabela de decisão (indicador: pedidos por status) |
| Pré-condições | Artesão com pedidos em pelo menos dois status diferentes. |
| Passos | 1. Entrar na plataforma como artesão.<br>2. Abrir o painel.<br>3. Selecionar o indicador de pedidos de um dos status. |
| Resultado esperado | O navegador abre a lista de pedidos filtrada pelo status escolhido. Pedidos de outro status não aparecem. Então: "direcioná-lo à lista filtrada correspondente". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-115 |
| HU | HU-15 |
| CA | Escopo |
| Título | Painel do artesão não mistura dados de outra loja |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (dados próprios e dados de outro artesão) |
| Pré-condições | Artesãos A e B, cada um com produtos, estoque e pedidos próprios e em quantidades diferentes. A autenticado. |
| Passos | 1. Com a sessão de A, chamar a rota do painel.<br>2. Comparar os indicadores com os dados de A e com os dados de B. |
| Resultado esperado | Todos os indicadores correspondem só aos dados da loja e dos produtos de A. Nenhum dado de B entra na conta. Então: "incluir somente informações de sua própria loja e produtos". |
| Pós-condições | Nenhum dado alterado. |

## HU-16 - Painel administrativo

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-116 |
| HU | HU-16 |
| CA | Visão administrativa |
| Título | Painel administrativo apresenta as filas que exigem ação |
| Nível | Integração de componentes |
| Técnica | Partição de equivalência (administrador autenticado, base com itens em todas as filas) |
| Pré-condições | Administrador autenticado. Base com uma solicitação de validação Pendente, usuários, artesãos, produtos e uma ocorrência que exige ação (critério da ocorrência: ver L-57). |
| Passos | 1. Chamar a rota do painel administrativo.<br>2. Localizar cada item preparado na resposta. |
| Resultado esperado | A resposta traz a fila de validação com a solicitação Pendente, os usuários, os artesãos, os produtos e a ocorrência. Então: "apresentar filas de validação, usuários, artesãos, produtos e ocorrências que exigem ação". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-117 |
| HU | HU-16 |
| CA | Ação auditável |
| Título | Suspensão de registro grava responsável, data e resultado |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (ação: suspender) |
| Pré-condições | Administrador autenticado. Registro de usuário ativo. |
| Passos | 1. Enviar à rota administrativa a suspensão do registro, com justificativa.<br>2. Confirmar a ação.<br>3. Consultar o registro de auditoria. |
| Resultado esperado | A auditoria guarda o administrador responsável, a data e o resultado da suspensão. A obrigatoriedade da justificativa não é verificada (ver L-58). Então: "exigir justificativa quando aplicável e registrar responsável, data e resultado". |
| Pós-condições | Registro suspenso. Uma entrada nova na auditoria. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-118 |
| HU | HU-16 |
| CA | Ação auditável |
| Título | Reativação de registro grava responsável, data e resultado |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (ação: reativar) |
| Pré-condições | Administrador autenticado. Registro de usuário suspenso. |
| Passos | 1. Enviar à rota administrativa a reativação do registro, com justificativa.<br>2. Confirmar a ação.<br>3. Consultar o registro de auditoria. |
| Resultado esperado | A auditoria guarda o administrador responsável, a data e o resultado da reativação (ver L-58). Então: "exigir justificativa quando aplicável e registrar responsável, data e resultado". |
| Pós-condições | Registro reativado. Uma entrada nova na auditoria. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-119 |
| HU | HU-16 |
| CA | Ação auditável |
| Título | Moderação de conteúdo reportado grava responsável, data e resultado |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (ação: moderar) |
| Pré-condições | Administrador autenticado. Conteúdo reportado aguardando ação (o que é moderar e como um conteúdo é reportado: ver L-57 e L-58). |
| Passos | 1. Enviar à rota administrativa a moderação do conteúdo, com justificativa.<br>2. Confirmar a ação.<br>3. Consultar o registro de auditoria. |
| Resultado esperado | A auditoria guarda o administrador responsável, a data e o resultado da moderação. As ações aprovar e reprovar têm o registro verificado em R2-CT-24, R2-CT-25, R2-CT-31 e R2-CT-32. Então: "exigir justificativa quando aplicável e registrar responsável, data e resultado". |
| Pós-condições | Conteúdo moderado. Uma entrada nova na auditoria. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-120 |
| HU | HU-16 |
| CA | Acesso restrito |
| Título | Comprador não acessa endpoint administrativo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (papel: comprador, alvo: endpoint) |
| Pré-condições | Comprador autenticado. Base com dados administrativos. |
| Passos | 1. Com a sessão do comprador, chamar a rota do painel administrativo.<br>2. Ler a resposta inteira. |
| Resultado esperado | O acesso é negado e a resposta não contém nenhum dado administrativo (formato da resposta: ver L-59). Então: "negar o acesso e não expor dados administrativos". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-121 |
| HU | HU-16 |
| CA | Acesso restrito |
| Título | Artesão não acessa endpoint administrativo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (papel: artesão, alvo: endpoint) |
| Pré-condições | Artesão autenticado. Base com dados administrativos. |
| Passos | 1. Com a sessão do artesão, chamar a rota do painel administrativo.<br>2. Ler a resposta inteira. |
| Resultado esperado | O acesso é negado e a resposta não contém nenhum dado administrativo (ver L-59). Então: "negar o acesso e não expor dados administrativos". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-122 |
| HU | HU-16 |
| CA | Acesso restrito |
| Título | Requisição sem sessão não acessa endpoint administrativo |
| Nível | Integração de componentes |
| Técnica | Tabela de decisão (papel: nenhum, alvo: endpoint) |
| Pré-condições | Nenhuma sessão. Base com dados administrativos. Se o critério cobre quem não está autenticado: ver L-59. |
| Passos | 1. Sem sessão, chamar a rota do painel administrativo.<br>2. Ler a resposta inteira. |
| Resultado esperado | O acesso é negado e a resposta não contém nenhum dado administrativo (ver L-59). Então: "negar o acesso e não expor dados administrativos". |
| Pós-condições | Nenhum dado alterado. |

| Campo | Conteúdo |
|---|---|
| ID | R2-CT-123 |
| HU | HU-16 |
| CA | Acesso restrito |
| Título | Comprador não abre o painel administrativo pelo navegador |
| Nível | Sistema |
| Técnica | Tabela de decisão (papel: comprador, alvo: painel) |
| Pré-condições | Comprador com cadastro ativo. Base com dados administrativos. Endereço do painel administrativo conhecido. |
| Passos | 1. Entrar na plataforma como comprador.<br>2. Abrir direto no navegador o endereço do painel administrativo.<br>3. Ler a tela exibida. |
| Resultado esperado | O acesso ao painel é negado e nenhuma fila, usuário, artesão, produto ou ocorrência aparece na tela. Então: "negar o acesso e não expor dados administrativos". |
| Pós-condições | Nenhum dado alterado. |

## Tabela final: regra, técnica, partições ou valores, casos

| Regra | Técnica | Partições ou valores | IDs dos casos |
|---|---|---|---|
| HU-01 Login válido | Partição de equivalência, tabela de decisão | Cadastro ativo com credenciais corretas; perfil comprador, artesão, administrador | R2-CT-01 a R2-CT-04 |
| HU-01 Credenciais inválidas | Partição de equivalência | Conta existe com senha errada; conta não existe | R2-CT-05, R2-CT-06 |
| HU-01 Autorização por role | Tabela de decisão | Comprador em função de artesão; comprador em função de administrador | R2-CT-07, R2-CT-08 |
| HU-01 Expiração da sessão | Transição de estados | Sessão ativa; sessão expirada depois de T | R2-CT-09 |
| HU-01 Limite de tentativas de login | Valor-limite, transição de estados | L menos 1; L; dentro de D; depois de D | R2-CT-10 a R2-CT-13 |
| HU-01 Recuperação de senha | Partição de equivalência | Conta existente; conta inexistente | R2-CT-14, R2-CT-15 |
| HU-01 Acesso direto a recurso restrito | Tabela de decisão | Artesão em operação de administrador; comprador em operação de artesão | R2-CT-16, R2-CT-17 |
| HU-02 Cadastro completo | Partição de equivalência | Nove dados presentes e válidos | R2-CT-18 |
| HU-02 Dados obrigatórios ausentes | Partição de equivalência | Um campo obrigatório ausente (por campo); dois ausentes; requisição pela rota | R2-CT-19 a R2-CT-21 |
| HU-02 Produção sob demanda | Partição de equivalência | Peça sob demanda com capacidade C e prazo | R2-CT-22 |
| HU-03 Envio para análise | Transição de estados | Sem solicitação para Pendente | R2-CT-23 |
| HU-03 Aprovação | Transição de estados | Pendente para Aprovada | R2-CT-24 |
| HU-03 Pendência ou reprovação | Transição de estados | Evento reprovar; evento solicitar ajustes | R2-CT-25, R2-CT-26 |
| HU-03 Exibição pública | Tabela de decisão, partição de equivalência | Pendente; Reprovada; Cancelada; Pendente no navegador | R2-CT-27 a R2-CT-30 |
| HU-03 Aprovação administrativa da autenticidade | Transição de estados | Pendente para aprovada, com histórico de auditoria | R2-CT-31 |
| HU-03 Reprovação da autenticidade | Transição de estados | Pendente para reprovada | R2-CT-32 |
| HU-03 Solicitação ainda pendente | Partição de equivalência | Sem solicitação (pendente já coberta em R2-CT-27 e R2-CT-30) | R2-CT-33 |
| HU-04 Catálogo disponível | Partição de equivalência | Peça cadastrada, ativa e disponível, na rota e no navegador | R2-CT-34, R2-CT-35 |
| HU-04 Produto indisponível | Tabela de decisão | Sem estoque; reservada; inativa | R2-CT-36 a R2-CT-38 |
| HU-04 Navegação | Partição de equivalência | Tela de desktop; tela de dispositivo móvel | R2-CT-39, R2-CT-40 |
| HU-05 Detalhes completos | Partição de equivalência | Peça com todos os dados, na rota e no navegador | R2-CT-41, R2-CT-42 |
| HU-05 Autenticidade | Tabela de decisão, partição de equivalência | Status Aprovada com selo; evidências com documento privado | R2-CT-43, R2-CT-44 |
| HU-05 Informação opcional ausente | Partição de equivalência | Um campo opcional ausente (por campo) | R2-CT-45 |
| HU-06 Busca combinada | Tabela de decisão | Texto e um filtro; texto e três filtros; peça indisponível que atende a tudo | R2-CT-46, R2-CT-47 |
| HU-06 Sem resultados | Partição de equivalência | Conjunto de resultados vazio | R2-CT-48 |
| HU-06 Remoção de filtro | Tabela de decisão | Filtro de categoria removido; texto e técnica mantidos | R2-CT-49 |
| HU-07 Perfil ativo | Partição de equivalência | Artesão e loja ativos | R2-CT-50 |
| HU-07 Navegação pelo produto | Tabela de decisão | Nome do artesão; nome da loja | R2-CT-51, R2-CT-52 |
| HU-07 Perfil inativo | Tabela de decisão | Artesão inativo com loja ativa; loja inativa com artesão ativo | R2-CT-53, R2-CT-54 |
| HU-08 Adicionar item | Partição de equivalência | Peça disponível | R2-CT-55 |
| HU-08 Alterar carrinho | Partição de equivalência | Alterar para quantidade permitida; remover item | R2-CT-56, R2-CT-57 |
| HU-08 Revalidar disponibilidade | Tabela de decisão | Mudança de preço ou de disponibilidade, ao abrir o carrinho ou ao iniciar o checkout | R2-CT-58 a R2-CT-61 |
| HU-08 Peça única | Valor-limite | Quantidade 1; quantidade 2 | R2-CT-62, R2-CT-63 |
| HU-09 Criar pedido | Transição de estados, partição de equivalência | Carrinho válido para Aguardando pagamento, na rota e na jornada | R2-CT-64, R2-CT-65 |
| HU-09 Dados inválidos | Tabela de decisão | Entrega incompleta; item indisponível | R2-CT-66, R2-CT-67 |
| HU-09 Imutabilidade do histórico | Tabela de decisão | Preço alterado; descrição alterada (perfil do produto sem caso, L-38) | R2-CT-68, R2-CT-69 |
| HU-10 Pagamento aprovado | Transição de estados | Aguardando pagamento para Pago | R2-CT-70 |
| HU-10 Pagamento recusado | Partição de equivalência | Transação recusada | R2-CT-71 |
| HU-10 Falha ou cancelamento | Partição de equivalência | Falha; expiração; cancelamento | R2-CT-72 a R2-CT-74 |
| HU-10 Idempotência | Valor-limite | Primeira e segunda entrega do mesmo evento | R2-CT-75 |
| HU-11 Marcação | Partição de equivalência | Marcar no cadastro; marcar na edição | R2-CT-76, R2-CT-77 |
| HU-11 Compra concorrente | Partição de equivalência | Confirmações simultâneas; confirmações em sequência | R2-CT-78, R2-CT-79 |
| HU-11 Pagamento confirmado | Transição de estados | Reservada para vendida | R2-CT-80 |
| HU-11 Liberação | Tabela de decisão | Reserva expira, pagamento falha ou é cancelado com peça ativa; falha com peça inativa | R2-CT-81 a R2-CT-84 |
| HU-11 Tentativas simultâneas de compra | Valor-limite | Três tentativas, no máximo uma venda confirmada | R2-CT-85 |
| HU-11 Liberação após falha na compra | Transição de estados, tabela de decisão | Sem venda confirmada (libera); com venda confirmada (não libera) | R2-CT-86, R2-CT-87 |
| HU-12 Consulta | Partição de equivalência | Artesão com produtos e três quantidades por produto | R2-CT-88 |
| HU-12 Baixa após venda | Partição de equivalência | Pagamento confirmado com estoque; pagamento confirmado sem estoque | R2-CT-89, R2-CT-90 |
| HU-12 Produção sob demanda | Partição de equivalência | Produto sob demanda na gestão de estoque | R2-CT-91 |
| HU-12 Estoque baixo | Valor-limite | X mais 1; X (X menos 1 sem caso, L-48) | R2-CT-92, R2-CT-93 |
| HU-12 Estoque insuficiente | Valor-limite, tabela de decisão | Solicitada Q; solicitada Q mais 1; ao adicionar ao carrinho; ao confirmar a compra | R2-CT-94 a R2-CT-97 |
| HU-12 Consistência do estoque após a compra | Valor-limite | k menor que Q; k igual a Q; soma 2Q em compras simultâneas | R2-CT-98 a R2-CT-100 |
| HU-12 Produto sob demanda | Partição de equivalência | Produto sob demanda na verificação de compra | R2-CT-101 |
| HU-13 Lista de pedidos | Partição de equivalência | Pedidos próprios; pedidos de outro comprador | R2-CT-102 |
| HU-13 Detalhes e histórico | Transição de estados | Histórico com mais de uma mudança de status | R2-CT-103 |
| HU-13 Isolamento | Partição de equivalência | Identificador de pedido alheio | R2-CT-104 |
| HU-14 Fila de pedidos | Partição de equivalência | Itens próprios; itens de outro artesão | R2-CT-105 |
| HU-14 Atualização válida | Transição de estados | Avanço para Preparando; para Pronto para envio; para Enviado | R2-CT-106 a R2-CT-108 |
| HU-14 Atualização inválida | Transição de estados | Pedido cancelado; transição não permitida | R2-CT-109, R2-CT-110 |
| HU-15 Resumo | Partição de equivalência | Artesão com dados em todos os indicadores | R2-CT-111 |
| HU-15 Atalhos | Tabela de decisão | Produtos ativos; estoque baixo; pedidos por status | R2-CT-112 a R2-CT-114 |
| HU-15 Escopo | Partição de equivalência | Dados próprios; dados de outro artesão | R2-CT-115 |
| HU-16 Visão administrativa | Partição de equivalência | Administrador com itens em todas as filas | R2-CT-116 |
| HU-16 Ação auditável | Tabela de decisão | Suspender; reativar; moderar (aprovar e reprovar em R2-CT-24, R2-CT-25, R2-CT-31, R2-CT-32) | R2-CT-117 a R2-CT-119 |
| HU-16 Acesso restrito | Tabela de decisão | Comprador, artesão e sem sessão no endpoint; comprador no painel pelo navegador | R2-CT-120 a R2-CT-123 |

## Lacunas

| Nº | HU | Critério | O que falta |
|---|---|---|---|
| L-01 | HU-01 | Login válido | Quais campos formam as "credenciais" (o identificador de login não é nomeado). |
| L-02 | HU-01 | Login válido | O que torna a sessão "segura": nenhum atributo verificável foi escrito. |
| L-03 | HU-01 | Login válido | Qual é a "área correspondente" de cada um dos três perfis. |
| L-04 | HU-01 | Login válido | O que acontece quando o cadastro está inativo e as credenciais estão corretas. |
| L-05 | HU-01 | Credenciais inválidas, Limite de tentativas de login | Lista do que conta como "dado sensível" e se a mensagem pode diferenciar conta inexistente de senha errada. |
| L-06 | HU-01 | Credenciais inválidas, Limite de tentativas de login | A "política de segurança" não foi fornecida: o que se registra de cada tentativa e de cada ocorrência, e onde. |
| L-07 | HU-01 | Autorização por role | Formato da "resposta de acesso não autorizado" e lista das funções exclusivas de cada perfil. O critério só fala do comprador. |
| L-08 | HU-01 | Expiração da sessão | Valor do prazo de validade, comportamento no instante exato do vencimento, se o uso renova o prazo e a forma de "solicitar nova autenticação". |
| L-09 | HU-01 | Limite de tentativas de login | Valor do limite, duração do bloqueio, o que é bloqueado (conta, endereço, dispositivo), janela de contagem e se um login válido zera a contagem. |
| L-10 | HU-01 | Recuperação de senha | Qual é o mecanismo, o que torna a solicitação "válida", os passos do "procedimento seguro", a validade do meio de recuperação e as regras da nova senha. |
| L-11 | HU-01 | Acesso direto a recurso restrito | Matriz de perfil por operação. Não há critério para quem não está autenticado e chama rota protegida, fora o caso de sessão expirada. |
| L-12 | HU-02 | Dados obrigatórios ausentes | Quais campos da peça são obrigatórios e quais são opcionais. |
| L-13 | HU-02 | Cadastro completo | Regras de validação de cada campo: limites do preço, quantidade e tipo das imagens, valores aceitos de categoria, técnica, origem e disponibilidade. |
| L-14 | HU-02 | Cadastro completo | "Registrar para publicação": a peça é publicada na hora ou depende de outra etapa, e qual é o status inicial. |
| L-15 | HU-02 | Produção sob demanda | Como se marca a peça como sob demanda, e a unidade e os valores aceitos de capacidade e de prazo. |
| L-16 | HU-03 | Envio para análise | O que acontece se faltar origem, técnica, descrição do processo ou evidência, formato das evidências, como a "versão" é identificada e se pode haver nova solicitação com uma aberta. |
| L-17 | HU-03 | Aprovação | A "lista de verificação definida pela equipe" não foi fornecida. Não está claro se a justificativa é obrigatória na aprovação. |
| L-18 | HU-03 | Pendência ou reprovação | Status que resulta de "solicitar ajustes", e canal e conteúdo da notificação ao artesão. |
| L-19 | HU-03 | Exibição pública | O status Cancelada aparece sem critério que leve a ele (quem cancela e quando). Não está claro se "como declarada pelo artesão" exige um rótulo na tela. |
| L-20 | HU-03 | Aprovação, Aprovação administrativa da autenticidade | Três nomes para o selo (de origem/autenticidade, de validação, de autenticidade): não se sabe se é um selo ou mais de um. As "regras da plataforma" para exibir não foram fornecidas. |
| L-21 | HU-03 | Aprovação administrativa da autenticidade | O que é "administrador autorizado", conteúdo mínimo do histórico de auditoria, decisão sobre solicitação que não está pendente e efeito de editar a peça depois da aprovação. |
| L-22 | HU-03 | Reprovação da autenticidade | Em que situações a justificativa é "exigida pelo processo". |
| L-23 | HU-04 | Catálogo disponível | Definição de peça "ativa" e "disponível", ordenação, qual imagem aparece quando há várias, forma da indicação de disponibilidade e vitrine sem nenhuma peça. |
| L-24 | HU-04 | Produto indisponível | Se a peça indisponível some da vitrine ou aparece marcada. Se peça sob demanda sem estoque físico conta como "sem estoque". |
| L-25 | HU-04 | Navegação | Os tamanhos de tela "definidos" não foram informados, nem os itens por página, nem o critério de "sem perda de conteúdo ou funcionalidade". |
| L-26 | HU-05 | Detalhes completos | Valores possíveis de "modalidade de produção" e quais são as "informações do artesão". |
| L-27 | HU-05 | Autenticidade | Quais são as "informações validadas" que o cliente pode consultar e o que conta como "documento privado". |
| L-28 | HU-05 | Informação opcional ausente | Quais campos são opcionais, se cada um é omitido ou indicado como não fornecido, e o texto da indicação. |
| L-29 | HU-06 | Busca combinada | Em que campos o texto é procurado, regra de correspondência (parcial, acentos, maiúsculas), lista dos filtros, combinação de vários valores no mesmo filtro e relação entre "região" e o campo "origem" do cadastro. |
| L-30 | HU-06 | Sem resultados | Texto da mensagem e se "limpar ou alterar" exige as duas opções ou basta uma. |
| L-31 | HU-07 | Perfil ativo, Navegação pelo produto | Se artesão e loja têm um perfil só ou dois. O critério diz "produtos associados" e a história diz "produtos disponíveis": não se sabe se os indisponíveis entram. |
| L-32 | HU-07 | Perfil inativo | O que o visitante vê no lugar do perfil, se produtos disponíveis de loja inativa aparecem e qual o efeito na vitrine. |
| L-33 | HU-08 | Adicionar item | Regra da "quantidade permitida" para peça que não é única, fórmula do subtotal e dos totais, carrinho de visitante sem login, inclusão repetida da mesma peça e inclusão de peça indisponível. |
| L-34 | HU-08 | Revalidar disponibilidade | Forma de "informar a alteração", se o novo preço vale sem aceite do comprador e se o item indisponível é removido ou fica marcado. |
| L-35 | HU-08 | Peça única | Se a quantidade maior que um é rejeitada ou ajustada, e se incluir no carrinho cria reserva. |
| L-36 | HU-09 | Criar pedido | Campos exigidos na entrega, formato do identificador, composição dos "valores", destino do carrinho depois do pedido, pedido com itens de vários artesãos e momento em que a reserva nasce. |
| L-37 | HU-09 | Dados inválidos | Forma e texto da explicação, checkout com carrinho vazio e checkout sem login. |
| L-38 | HU-09 | Imutabilidade do histórico | "Perfil do produto" é ambíguo e a lista dos "dados relevantes" do retrato não foi escrita. |
| L-39 | HU-10 | Pagamento aprovado | Formas de pagamento, formato do evento e do identificador externo, verificação de autenticidade do evento e confirmação para pedido que não está em Aguardando pagamento. |
| L-40 | HU-10 | Pagamento recusado | Qual status significa "não pago", como o comprador é informado e se pode tentar pagar de novo. |
| L-41 | HU-10 | Falha ou cancelamento | Status de destino do pedido em cada evento, prazo de expiração, quem pode cancelar e as "regras de estoque e peça única" para liberar reserva. |
| L-42 | HU-10 | Idempotência | O que identifica "o mesmo evento" e o que fazer com eventos fora de ordem. |
| L-43 | HU-11 | Compra concorrente | Momento em que a reserva nasce, duração da reserva, critério de "primeira reserva válida" e texto do aviso de indisponibilidade. |
| L-44 | HU-11 | Liberação, Liberação após falha na compra | Critério de "apta à venda", as "regras da plataforma" citadas e o que fazer com evento de falha quando já existe venda confirmada. |
| L-45 | HU-11 | Marcação | Marcar como única um produto com mais de uma unidade em estoque, ou com reserva ou pedido em aberto, e desmarcar. |
| L-46 | HU-12 | Baixa após venda | O que acontece com o pagamento e com o pedido quando a venda sem estoque é impedida. |
| L-47 | HU-12 | Produção sob demanda, Produto sob demanda | Como "considerar" capacidade e prazo: regra que decide se pode comprar, se a venda consome capacidade e o que ocorre quando a capacidade acaba. |
| L-48 | HU-12 | Estoque baixo | Comportamento abaixo do limite (o critério só diz "alcança"), produto sem limite definido, limite zero e forma da indicação. |
| L-49 | HU-12 | Estoque insuficiente | Texto da mensagem, se "disponível" já desconta as reservas e se a quantidade é ajustada ao máximo ou só rejeitada. |
| L-50 | HU-13 | Lista de pedidos | Comprador sem pedidos, ordenação e paginação da lista. |
| L-51 | HU-13 | Detalhes e histórico | O critério cita personalização e transporte, que o escopo exclui. Faltam o sentido da ordem cronológica e quais dados de pagamento aparecem. |
| L-52 | HU-13 | Isolamento | Formato da negação, se pedido inexistente e pedido alheio respondem igual, e consulta feita por artesão ou administrador. |
| L-53 | HU-14 | Fila de pedidos | Qual é o "prazo", se pedidos não pagos aparecem e a ordenação da fila. |
| L-54 | HU-14 | Atualização válida, Atualização inválida | Matriz de transições e lista completa de status do pedido (a "conclusão" da HU-13 não tem status), status por item ou por pedido com vários artesãos e artesão alterando item de outro. |
| L-55 | HU-15 | Resumo | O critério cita avaliações, que o escopo exclui. Faltam a definição de "produto ativo" e quais status entram em "pedidos por status". |
| L-56 | HU-15 | Atalhos | Comportamento do indicador sem itens e destino exato de cada indicador. |
| L-57 | HU-16 | Visão administrativa | Critério de "ocorrências que exigem ação". Nenhuma história descreve como um conteúdo é reportado. |
| L-58 | HU-16 | Ação auditável | Em quais ações a justificativa é "aplicável", efeito de suspender e reativar e o que é "moderar". |
| L-59 | HU-16 | Acesso restrito | Formato da negação e se o critério cobre quem não está autenticado. |
| L-60 | Todas | Geral | "Usuário", "cliente", "visitante" e "comprador" aparecem sem definição: não se sabe o que cada um faz sem login (ver vitrine, montar carrinho). |
