# Origem.Concorrencia — Demonstração de Concorrência no Checkout

## O que é este projeto, em uma frase

Uma pequena API que prova, na prática, que o sistema Origem consegue vender a **última unidade** de um produto para **duas pessoas comprando ao mesmo tempo** sem bagunçar o estoque, sem duplicar pedidos e sem travar o site esperando notificações serem processadas.

Se alguém nunca viu o projeto, a ideia central é essa: **duas requisições chegam juntas, só uma pode ganhar, e o sistema precisa decidir isso de forma justa e sem erro.**

---


## Por que isso existe

O documento [`docs/pontosconcorrencia.md`](../../../docs/pontosconcorrencia.md) listou os pontos do sistema Origem onde várias coisas podem acontecer **ao mesmo tempo** e dar problema:

- Vários compradores fechando pedido do mesmo produto ao mesmo tempo.
- O estoque sendo lido e alterado por mais de uma operação simultaneamente.
- Tarefas (como notificar o pedido) que não podem travar a resposta da compra.

Este projeto (`Origem.Concorrencia`) é a **prova de conceito** desses pontos: uma API pequena, focada só nisso, para mostrar as técnicas usadas — sem se misturar com o resto do sistema.

## O problema, explicado com uma analogia

Imagine um caixa de loja com **1 produto** na prateleira e **2 vendedores diferentes** atendendo **2 clientes ao mesmo tempo**, cada um em seu computador, mas olhando o mesmo estoque no sistema.

Sem nenhum cuidado, pode acontecer isto:

1. Vendedor A olha o sistema: "tem 1 em estoque". ✅
2. Vendedor B olha o sistema, ao mesmo tempo: "tem 1 em estoque". ✅
3. Vendedor A vende e desconta: estoque vira 0.
4. Vendedor B **também** vende, porque já tinha visto "tem 1" antes de A terminar — e desconta de novo: estoque vira **-1**.

Isso é vender algo que não existe. Na programação, esse tipo de bug tem nome: **condição de corrida** (*race condition*) — quando o resultado final depende de "quem chega primeiro" de um jeito imprevisível, e isso gera dado errado.

Este projeto existe para mostrar, com código rodando de verdade, como evitar esse cenário.

## Glossário rápido (para quem não é da área)

| Termo | O que significa aqui, em palavras simples |
|---|---|
| **Concorrência** | Duas ou mais coisas acontecendo "ao mesmo tempo" no sistema (duas compras chegando juntas, por exemplo). |
| **Thread** | Uma "linha de execução" — como se fosse um funcionário trabalhando. O servidor pode ter vários "funcionários" atendendo pedidos ao mesmo tempo. |
| **Condição de corrida (*race condition*)** | O bug que acontece quando duas threads mexem no mesmo dado ao mesmo tempo sem combinar entre si, e o resultado sai errado (explicado na analogia acima). |
| **Região crítica / `lock`** | Um trecho de código onde só **uma** thread pode entrar por vez — como uma porta com uma única chave. Enquanto uma pessoa está lá dentro, as outras esperam na fila. |
| **Idempotência** | Fazer a mesma operação duas vezes tem o mesmo efeito de fazer uma vez só. Ex.: se o app do cliente reenviar a mesma compra por falha de internet, o sistema não desconta duas vezes. |
| **Fila (*queue*)** | Uma lista de tarefas pendentes, processadas uma de cada vez, na ordem em que chegaram — como uma fila de banco. |
| **Processamento assíncrono** | Fazer uma tarefa "depois, em segundo plano", sem obrigar o cliente a esperar ela terminar para receber uma resposta. |
| **`BackgroundService`** | Um "funcionário" que fica ligado o tempo todo, rodando em paralelo, só processando o que está na fila. |

## Como o sistema resolve o problema

Quatro ideias, cada uma resolvendo um pedaço do problema:

1. **Só uma pessoa mexe no estoque por vez.**
   Todo o trecho que confere, decide e desconta o estoque fica protegido por um `lock` (a "porta com uma chave só"). Isso garante que a leitura e a escrita do estoque nunca se cruzem.

2. **Repetir a mesma compra não desconta duas vezes.**
   Cada tentativa de compra carrega um identificador único (`tentativaId`). Se o mesmo identificador chegar de novo com os mesmos dados, o sistema devolve o pedido já feito — sem descontar estoque outra vez. Se o mesmo identificador chegar com dados diferentes, o sistema recusa (isso indicaria um erro ou uma tentativa indevida).

3. **A compra não espera a notificação ser processada.**
   Depois que a compra é aprovada, uma mensagem é colocada em uma fila. Um processo separado (`BackgroundService`) vai processando essa fila em segundo plano, sem atrasar a resposta que o comprador recebe.

4. **A fila tem limite, para o sistema não travar.**
   Se a fila de notificações encher (100 itens, no exemplo), novas compras são recusadas de forma controlada (erro `503`) em vez de o sistema ficar instável.

## Passo a passo de uma compra

```
1) O cliente envia: "quero comprar o produto X, minha tentativa tem o código Y"
                              │
2) A API entra na "sala com uma porta só" (lock):
       a. Já processei essa tentativa Y antes?
              - Sim, com os mesmos dados → devolve o pedido já criado (não desconta de novo)
              - Sim, com dados diferentes → recusa (409 Conflict)
       b. Tem estoque suficiente?
              - Não → recusa (409 Conflict), estoque não muda
       c. Coloca uma mensagem "avisar sobre este pedido" na fila
              - Se a fila estiver cheia → recusa (503), estoque não muda
       d. Desconta o estoque e guarda o pedido
3) A API já responde "compra aprovada" para o cliente — sem esperar a notificação
                              │
4) Em paralelo, um processo em segundo plano pega a mensagem da fila
       e processa a notificação (simulada), marcando o pedido como
       PROCESSADA (ou FALHOU, se der erro)
5) Quem quiser pode consultar esse estado depois, a qualquer momento
```

## Arquitetura (os arquivos e o papel de cada um)

| Arquivo | O que faz, em uma frase |
|---|---|
| `Program.cs` | Liga tudo (rotas da API) e contém a classe `EstoqueDemonstracao`, onde fica a "porta com uma chave só" (o `lock`) que protege o estoque. |
| `FilaPedidos.cs` | A fila de notificações (com limite de 100) e o painel que guarda o estado de cada pedido ("ENFILEIRADA", "PROCESSADA", "FALHOU"). |
| `MensagemPedido.cs` | O formato de cada "recado" que entra na fila: quem comprou, o quê, quanto e quando. |
| `ProcessadorPedidos.cs` | O "funcionário" que fica ligado o tempo todo, tirando recados da fila e processando a notificação simulada. |

## Endpoints da API

| Método | Rota | Para que serve |
|---|---|---|
| `GET` | `/demo/saude` | Confirma que a API está no ar. |
| `GET` | `/demo/estoque` | Mostra quanto ainda tem do produto de demonstração. |
| `POST` | `/demo/compras` | Tenta fazer a compra (envia `tentativaId`, `usuario`, `produtoId`, `quantidade`). |
| `GET` | `/demo/mensagens/{pedidoId}` | Consulta se a notificação daquele pedido já foi processada. |

Possíveis respostas de `POST /demo/compras`:

| Resposta | O que aconteceu |
|---|---|
| `200 OK` | Compra aprovada — ou repetição de uma compra já feita (idempotência). |
| `400 Bad Request` | Faltou algum dado ou os dados são inválidos. |
| `409 Conflict` | Não tinha mais estoque, ou o `tentativaId` foi reaproveitado com dados diferentes. |
| `503 Service Unavailable` | A fila de notificações está cheia no momento; nada foi descontado. |

## Como executar

Na raiz do repositório:

```powershell
dotnet run --project .\backend\backend\Origem.Concorrencia\Origem.Concorrencia.csproj -- --urls http://localhost:5000
```

Para testar pelo checkout do site (frontend), copie `frontend/.env.example` para `frontend/.env.local` (se ainda não existir) e configure `NEXT_PUBLIC_CONCORRENCIA_API_URL` apontando para essa API. Use dois navegadores (ou dois perfis) diferentes, já que o carrinho fica salvo no `localStorage` de cada um.

## Como provar que funciona (teste automatizado)

Com a API recém-iniciada (estoque em 1), rode a partir da raiz do repositório:

```text
.\backend\testar-demo.cmd
```

Esse script dispara **duas compras ao mesmo tempo** e confere, em sequência, que:

1. Uma foi aprovada (`200`) e a outra recusada por falta de estoque (`409`).
2. Repetir a compra que ganhou devolve o mesmo pedido, sem descontar de novo.
3. Reaproveitar o mesmo identificador com dados diferentes é recusado (`409`).
4. A notificação daquele pedido acaba processada (estado `PROCESSADA`).
5. O estoque final fecha em `0` — nem a mais, nem a menos.

Para rodar de novo, é só reiniciar a API (todo o estado vive em memória).

## O que essa demonstração NÃO faz

Importante deixar claro os limites, para não passar a impressão de que é um sistema completo:

- **Nada é salvo de verdade.** Estoque, pedidos e fila existem só na memória da API. Se ela reiniciar, tudo volta ao ponto zero.
- **Só protege uma cópia da API.** O `lock` funciona dentro de um único processo. Se o sistema rodasse em vários servidores ao mesmo tempo, essa trava sozinha não seria suficiente — precisaria de banco de dados fazendo esse controle.
- **A notificação é fingida.** O "processamento" da mensagem é só uma simulação (uma espera curta), não um envio de e-mail/SMS de verdade.
- **O checkout completo do site continua simulado.** Esta API cobre só a disputa pelo estoque e a fila; o restante do fluxo de compra/pagamento do marketplace roda separado, no navegador.

## Roteiro rápido para apresentar isso a alguém

Se for explicar isso para alguém que nunca viu o projeto, uma sequência que funciona bem:

1. **Comece pelo problema:** "Duas pessoas podem tentar comprar a última unidade de um produto ao mesmo tempo. Sem cuidado nenhum, o sistema pode vender pra duas, ou vender estoque negativo."
2. **Mostre a analogia dos dois vendedores** (seção acima) — é a parte que mais gera entendimento rápido.
3. **Explique a solução em uma frase:** "A gente coloca uma 'porta com uma chave só' em volta da parte que mexe no estoque, então só uma compra passa por vez."
4. **Mostre o teste rodando** (`testar-demo.cmd`) — ver na prática um `200` e um `409` saindo ao mesmo tempo é o momento que convence.
5. **Feche com os limites** — deixa claro que é uma demonstração de conceito, não o checkout final do site.