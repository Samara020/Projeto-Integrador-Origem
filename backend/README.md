# Demonstração de concorrência e fila

Esta API ASP.NET Core demonstra a disputa pela última unidade do produto `prd_201` em **um processo**. O estoque inicial é 1. A compra aprovada registra um pedido em memória e publica uma mensagem em uma fila `Channel` limitada a 100 itens. Um `BackgroundService` processa a notificação simulada sem atrasar a resposta da compra.

## Executar

Na raiz do repositório:

```powershell
dotnet run --project .\backend\backend\Origem.Concorrencia\Origem.Concorrencia.csproj -- --urls http://localhost:5000
```

Para usar o checkout do site, copie `frontend/.env.example` para `frontend/.env.local` se ainda não existir, e reinicie `npm run dev`. O produto `prd_201` exige que `NEXT_PUBLIC_CONCORRENCIA_API_URL` aponte para a API. Use dois navegadores ou perfis separados, pois o carrinho fica no `localStorage`.

## Fluxo

1. `POST /demo/compras` valida o produto, a quantidade e o identificador `tentativaId`.
2. Dentro do mesmo `lock`, a API reconhece uma tentativa repetida, confere o estoque, coloca a mensagem na fila, desconta a unidade e registra o pedido em memória.
3. Uma repetição com o mesmo ID e os mesmos dados devolve o mesmo `pedidoId`, sem novo desconto nem nova mensagem. Reutilizar o ID com dados diferentes retorna `409`.
4. O processador registra uma notificação simulada e atualiza o estado consultável em `GET /demo/mensagens/{pedidoId}` para `PROCESSADA` ou `FALHOU`.

Se a fila estiver cheia, a compra retorna `503` e o estoque não é descontado. O corpo dos erros contém `mensagem`. O contrato das rotas está em `docs/ContratoDeAPI.md`.

## Evidência reproduzível

Com a API recém-iniciada e estoque 1, execute na raiz do repositório. Este comando funciona no Prompt de Comando e no PowerShell:

```text
.\backend\testar-demo.cmd
```

O arquivo `.cmd` inicia o script PowerShell no próprio processo, sem depender da associação de arquivos `.ps1` do Windows. A política de execução é ajustada somente para esse processo. Se estiver no PowerShell e preferir chamar o script diretamente, use `& .\backend\testar-demo.ps1`.

O script envia duas compras concorrentes, exige um `200` e um `409`, repete a tentativa vencedora, verifica a recusa de um ID reutilizado com outros dados, aguarda a mensagem ser processada e confirma estoque final 0. Para repetir, reinicie a API.

Em 22/09/2026, o script passou com uma compra aprovada, uma recusada, repetição idempotente, reutilização conflitante recusada, mensagem processada e estoque final 0. Também passaram `dotnet build`, `npm run lint` e `npm run build`.

## Limites da demonstração

- Estoque, pedidos, IDs processados, fila e estados das mensagens ficam apenas em memória e são perdidos ao reiniciar a API. Não há garantia de entrega após queda do processo.
- O `lock` protege apenas uma instância da API. Não coordena várias instâncias nem substitui transação de banco de dados.
- O frontend ainda grava pedido e pagamento simulados no `localStorage`; a API guarda somente o registro da compra demonstrada. O catálogo usa dados estáticos e pode exibir estoque desatualizado.
- A fila executa uma notificação simulada. `FALHOU` fica visível para diagnóstico, sem nova tentativa automática.
