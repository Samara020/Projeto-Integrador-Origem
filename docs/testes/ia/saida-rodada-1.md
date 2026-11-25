# Casos de teste do Origem

São 80 casos em 9 grupos. Prioridade: **A** bloqueia a entrega, **M** é importante, **B** é desejável.

## Premissas

Escrevi sem ver o código nem o contrato da API. Assumi as regras abaixo; confirme antes de executar e ajuste o resultado esperado onde a regra real for outra.

- Peça única tem estoque 1 e sai da vitrine quando é vendida.
- A peça é reservada quando o pagamento começa, não quando entra no carrinho.
- Formas de pagamento: Pix e cartão de crédito.
- Peça nova passa por aprovação do administrador antes de aparecer na vitrine.
- Status do pedido: aguardando pagamento, pago, em preparação, enviado, entregue, cancelado.

## 1. Login e perfis

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-01 | Login de comprador | Conta de comprador ativa | Informar e-mail e senha corretos e enviar | Entra e vai para a vitrine; menu mostra carrinho e "meus pedidos" | A |
| CT-02 | Login de artesão | Conta de artesão ativa | Informar credenciais corretas | Entra e vai para o painel do artesão, com acesso a "minhas peças" | A |
| CT-03 | Login de administrador | Conta de administrador ativa | Informar credenciais corretas | Entra e vai para o painel administrativo | A |
| CT-04 | Senha errada | Conta existente | Informar e-mail certo e senha errada | Não autentica; mensagem genérica ("e-mail ou senha inválidos"), sem revelar qual campo errou | A |
| CT-05 | Campos inválidos | Nenhuma | Enviar vazio; depois enviar e-mail sem "@" | Erro indicado em cada campo; nenhuma tentativa de login é enviada | M |
| CT-06 | Tentativas repetidas | Conta existente | Errar a senha várias vezes seguidas | Bloqueio temporário ou desafio extra; a senha certa só volta a valer depois do prazo | M |
| CT-07 | Comprador em área de artesão | Logado como comprador | Abrir pela URL a tela de cadastro de peça e chamar a rota da API direto | Tela negada e API responde 403; nada é criado | A |
| CT-08 | Artesão em área administrativa | Logado como artesão | Abrir pela URL o painel administrativo e chamar uma rota de administrador | Tela negada e API responde 403 | A |
| CT-09 | Visitante no checkout | Sem login, carrinho com 1 peça | Clicar em finalizar compra | Vai para o login e, depois de entrar, volta ao checkout com o carrinho intacto | A |
| CT-10 | Sessão expirada | Logado, sessão vencida | Tentar uma ação protegida | Pede login de novo, sem erro cru na tela e sem perder o carrinho | M |
| CT-11 | Logout | Logado | Sair e usar o botão voltar do navegador | Sessão encerrada; página protegida não reabre | M |
| CT-12 | Recuperação de senha | Conta existente | Pedir redefinição, usar o link, tentar usar o mesmo link outra vez | Senha trocada na primeira vez; link reutilizado ou vencido é recusado; a resposta não revela se o e-mail existe | M |

## 2. Cadastro de peças

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-13 | Cadastro válido | Logado como artesão | Preencher nome, descrição, preço, categoria, fotos e estoque; salvar | Peça salva como "aguardando aprovação"; ainda fora da vitrine | A |
| CT-14 | Campo obrigatório vazio | Logado como artesão | Salvar sem nome, sem preço e sem foto, um de cada vez | Erro no campo que falta; nada é salvo | A |
| CT-15 | Preço inválido | Logado como artesão | Informar preço 0, negativo e com letras | Recusado nos três casos, na tela e na API | A |
| CT-16 | Foto inválida | Logado como artesão | Enviar arquivo que não é imagem e imagem acima do limite | Recusado com mensagem que diz o formato e o tamanho aceitos | M |
| CT-17 | Peça única | Logado como artesão | Marcar a peça como única e tentar estoque 2 | Estoque fica travado em 1 | A |
| CT-18 | Edição da própria peça | Peça aprovada do artesão | Alterar preço e descrição; salvar | Mudança salva e refletida na vitrine | M |
| CT-19 | Edição de peça alheia | Dois artesãos, peça do artesão B | Logado como A, trocar o ID na URL e chamar a API de edição | 403; peça de B inalterada | A |
| CT-20 | Remoção com pedido em andamento | Peça com pedido pago | Artesão remove a peça | Peça sai da vitrine; o pedido continua mostrando nome, foto e preço da compra | A |
| CT-21 | Texto malicioso | Logado como artesão | Salvar nome e descrição contendo `<script>alert(1)</script>` | Texto aparece como texto na vitrine e no painel; nenhum script roda | A |
| CT-22 | Aprovação e reprovação | Peças aguardando aprovação | Administrador aprova uma e reprova outra com motivo | A aprovada entra na vitrine; a reprovada fica fora e o artesão vê o motivo | A |

## 3. Vitrine, busca e filtros

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-23 | Vitrine só mostra o que pode ser comprado | Peças aprovadas, pendentes, reprovadas e vendidas | Abrir a vitrine | Só aparecem as aprovadas e disponíveis | A |
| CT-24 | Busca por nome | Peça "Boneco de barro" na vitrine | Buscar "boneco" | A peça aparece no resultado | A |
| CT-25 | Busca sem acento e sem maiúscula | Peça "Cerâmica de Tracunhaém" | Buscar "ceramica tracunhaem" | A peça aparece | M |
| CT-26 | Busca sem resultado | Nenhuma | Buscar um termo que não existe | Mensagem de "nada encontrado" e caminho para limpar a busca; sem tela em branco | M |
| CT-27 | Busca com entrada estranha | Nenhuma | Buscar `%`, `'`, emoji e um texto de 500 caracteres | Não quebra, não mostra erro técnico; devolve lista ou vazio | M |
| CT-28 | Filtro por categoria | Peças em mais de uma categoria | Escolher "Cerâmica" | Só peças dessa categoria; contagem bate com a lista | M |
| CT-29 | Filtro por faixa de preço | Peças de R$ 50, R$ 100 e R$ 150 | Filtrar de R$ 50 a R$ 100 | Aparecem as de R$ 50 e R$ 100 (limites incluídos); a de R$ 150 fica fora | M |
| CT-30 | Filtro por cidade ou região | Peças de Caruaru e de Olinda | Filtrar por Caruaru | Só peças de artesãos de Caruaru | M |
| CT-31 | Filtros combinados com busca | Massa variada de peças | Aplicar categoria, preço e termo de busca; depois limpar tudo | Resultado é a interseção dos três; limpar devolve a lista completa | M |
| CT-32 | Paginação | Mais peças que uma página | Percorrer todas as páginas (ou "carregar mais") | Nenhuma peça repetida nem pulada; total confere | M |
| CT-33 | Link direto de peça vendida | Peça única já vendida | Abrir a URL da peça | Página mostra a peça como vendida, sem botão de compra | A |

## 4. Carrinho

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-34 | Adicionar ao carrinho | Peça disponível | Clicar em adicionar | Item no carrinho com nome, foto e preço; contador sobe | A |
| CT-35 | Peça única duas vezes | Peça única já no carrinho | Adicionar a mesma peça de novo | Quantidade continua 1; aviso de que é peça única | A |
| CT-36 | Quantidade acima do estoque | Peça com estoque 3 | Tentar levar 4, pela tela e pela API | Limitado a 3 com aviso | A |
| CT-37 | Remover item | Carrinho com 2 itens | Remover um; depois o outro | Total recalculado; ao esvaziar, mostra estado vazio com link para a vitrine | M |
| CT-38 | Peças de artesãos diferentes | Peças de 2 artesãos | Adicionar uma de cada | Itens agrupados por artesão; subtotal e total corretos | M |
| CT-39 | Carrinho entre sessões | Logado, carrinho com itens | Sair, entrar de novo; repetir começando como visitante e logando depois | Itens preservados nos dois casos, sem duplicar | M |
| CT-40 | Peça vendida enquanto está no carrinho | Peça única no carrinho de A | Comprador B compra a peça; A abre o carrinho | Item marcado como indisponível; A não consegue seguir para o checkout com ele | A |
| CT-41 | Preço alterado enquanto está no carrinho | Peça no carrinho | Artesão muda o preço; comprador abre o carrinho | Carrinho mostra o preço novo e avisa da mudança | A |

## 5. Checkout

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-42 | Checkout completo | Logado, carrinho com itens | Informar endereço válido e avançar | Resumo com itens, frete e total antes de pagar | A |
| CT-43 | Endereço inválido | No checkout | Informar CEP inexistente; deixar número e cidade vazios | Erro por campo; não avança | M |
| CT-44 | Conferência do total | Carrinho com 2 itens e frete | Comparar o total da tela com itens + frete e com o valor enviado ao pagamento | Os três valores são iguais, em centavos | A |
| CT-45 | Valor adulterado na requisição | No checkout | Alterar preço ou total no corpo da requisição | Servidor recalcula com o preço do banco e ignora o valor enviado | A |
| CT-46 | Duplo clique em finalizar | No checkout | Clicar duas vezes rápido em finalizar | Um único pedido e uma única cobrança | A |
| CT-47 | Checkout com carrinho vazio | Logado, carrinho vazio | Abrir a URL do checkout | Redireciona para o carrinho ou vitrine; nenhum pedido criado | M |

## 6. Pagamento

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-48 | Cartão aprovado | Pedido aguardando pagamento | Pagar com cartão de teste aprovado | Pedido vira "pago"; peça sai da vitrine; comprador e artesão são avisados | A |
| CT-49 | Cartão recusado | Pedido aguardando pagamento | Pagar com cartão de teste recusado | Pedido não fica pago; mensagem clara; comprador pode tentar outra forma; peça liberada se desistir | A |
| CT-50 | Geração do Pix | Pedido aguardando pagamento | Escolher Pix | QR code e código copia e cola com o valor exato e o prazo de validade | A |
| CT-51 | Pix pago no prazo | Pix gerado | Pagar (ou simular a confirmação do provedor) | Pedido vira "pago" sozinho, sem o comprador recarregar a página | A |
| CT-52 | Pix vencido | Pix gerado e não pago | Esperar o prazo acabar | Pedido cancelado; peça volta à vitrine | A |
| CT-53 | Confirmação duplicada | Pedido aguardando pagamento | Enviar duas vezes a mesma notificação de pagamento (webhook) | Processada uma vez só; um pedido, uma baixa de estoque | A |
| CT-54 | Confirmação falsa | Pedido aguardando pagamento | Enviar notificação de pagamento sem assinatura válida | Rejeitada; pedido continua aguardando | A |
| CT-55 | Aba fechada depois de pagar | Pagamento concluído no provedor | Fechar a aba antes de voltar ao site; entrar depois em "meus pedidos" | Pedido aparece como pago | A |
| CT-56 | Dado de cartão exposto | Pagamento com cartão feito | Procurar número e CVV em URL, resposta da API, log e banco | Não aparecem em nenhum lugar | A |

## 7. Estoque e peça única

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-57 | Corrida pela mesma peça única | Peça única; compradores A e B no checkout | Os dois iniciam o pagamento ao mesmo tempo | Só um conclui; o outro recebe aviso e não é cobrado | A |
| CT-58 | Baixa de estoque na venda | Peça única disponível | Concluir a compra | Estoque 0; peça some da vitrine, da busca e dos filtros | A |
| CT-59 | Estoque nunca negativo | Peça com estoque 3 | Dois pedidos simultâneos de 2 unidades | Um passa, o outro falha; estoque final 1 | A |
| CT-60 | Reserva que expira | Peça reservada por pagamento iniciado | Abandonar o pagamento até o prazo acabar | Reserva cai e a peça volta a ficar disponível | A |
| CT-61 | Devolução ao estoque | Pedido pago de peça única | Cancelar o pedido | Peça volta ao estoque e à vitrine, uma única vez | A |
| CT-62 | Ajuste manual do artesão | Peça com estoque 5 | Mudar para 2; tentar -1 | 2 é aceito e reflete na vitrine; negativo é recusado | M |

## 8. Acompanhamento de pedidos

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-63 | Lista de pedidos do comprador | Comprador com pedidos | Abrir "meus pedidos" | Só os pedidos dele, com status, data e total, do mais novo ao mais antigo | A |
| CT-64 | Pedido de outro comprador | Pedido do comprador B | Logado como A, abrir o pedido de B pelo ID na URL e na API | 403 ou 404; nenhum dado de B aparece | A |
| CT-65 | Pedidos do artesão | Pedido com peças de 2 artesãos | Cada artesão abre seus pedidos | Cada um vê só os próprios itens e o endereço de entrega; não vê itens do outro | A |
| CT-66 | Envio com rastreio | Pedido pago | Artesão marca como enviado e informa o código de rastreio | Comprador vê "enviado" e o código; recebe aviso | A |
| CT-67 | Mudança de status inválida | Pedido aguardando pagamento; pedido entregue | Tentar marcar o primeiro como enviado e o segundo como em preparação | As duas mudanças são recusadas, na tela e na API | A |
| CT-68 | Cancelamento antes do envio | Pedido pago, não enviado | Comprador cancela | Pedido cancelado, estorno iniciado, estoque devolvido | M |
| CT-69 | Cancelamento depois do envio | Pedido enviado | Comprador tenta cancelar | Bloqueado, com orientação do que fazer | M |
| CT-70 | Histórico do pedido | Pedido que passou por vários status | Abrir o detalhe | Linha do tempo com cada status, data e hora, em ordem | B |
| CT-71 | Pedido com dois artesãos | Pedido com peças de 2 artesãos | Um artesão envia, o outro não | Comprador vê o andamento separado por artesão | M |
| CT-72 | Visão do administrador | Pedidos em vários status | Administrador lista e filtra por status | Vê todos os pedidos; o filtro devolve só o status escolhido | M |

## 9. Administração e requisitos gerais

| ID | Cenário | Pré-condição | Passos | Resultado esperado | Prior. |
|---|---|---|---|---|---|
| CT-73 | Suspensão de artesão | Artesão com peças na vitrine e pedido em andamento | Administrador suspende a conta | Peças saem da vitrine; artesão não entra; pedido em andamento continua visível para o comprador | M |
| CT-74 | Conta desativada | Comprador desativado | Tentar login | Login recusado com mensagem adequada | M |
| CT-75 | Compra completa no celular | Tela de 360 px de largura | Buscar, adicionar ao carrinho, fazer checkout e pagar | Fluxo inteiro sem rolagem horizontal nem botão cortado | A |
| CT-76 | Navegação por teclado | Nenhuma | Fazer login, busca e checkout só com Tab, Enter e Espaço | Tudo alcançável, foco visível, ordem lógica | M |
| CT-77 | Leitor de tela | Leitor de tela ligado | Passar por formulário de login e checkout com erros | Campos têm rótulo e os erros são anunciados | M |
| CT-78 | API fora do ar | Simular falha da API | Abrir vitrine, carrinho e pedidos | Cada tela mostra mensagem e botão de tentar de novo; sem tela em branco | M |
| CT-79 | Carregamento lento | Rede lenta simulada | Abrir vitrine e detalhe de peça | Indicador de carregamento; layout não pula quando as imagens chegam | B |
| CT-80 | Ponta a ponta | Ambiente limpo | Artesão cadastra peça única, administrador aprova, comprador busca, compra e paga, artesão envia, comprador acompanha | Cada etapa reflete na seguinte; no fim a peça está vendida e o pedido entregue | A |

## Por onde começar

Se o tempo for curto, rode nesta ordem. São os casos em que um erro custa dinheiro ou vaza dado:

1. CT-57 e CT-59: duas pessoas comprando a mesma peça.
2. CT-45, CT-53 e CT-54: valor adulterado e confirmação de pagamento duplicada ou falsa.
3. CT-07, CT-08, CT-19 e CT-64: um perfil acessando o que é de outro.
4. CT-52, CT-60 e CT-61: peça presa ou liberada errado depois de pagamento que não fechou.
5. CT-80: o fluxo inteiro, do cadastro à entrega.
