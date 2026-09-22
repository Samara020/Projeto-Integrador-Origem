param(
    [string]$BaseUrl = 'http://localhost:5000'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$base = $BaseUrl.TrimEnd('/')
$produtoId = 'prd_201'
$cliente = [System.Net.Http.HttpClient]::new()

try {
    $estoqueInicial = Invoke-RestMethod -Uri "$base/demo/estoque"
    if ($estoqueInicial.estoque -ne 1) {
        throw "Reinicie a API antes do teste. Estoque encontrado: $($estoqueInicial.estoque)."
    }

    $tentativa1 = [guid]::NewGuid().ToString()
    $tentativa2 = [guid]::NewGuid().ToString()
    $compra1 = @{ tentativaId = $tentativa1; usuario = 'comprador-1'; produtoId = $produtoId; quantidade = 1 }
    $compra2 = @{ tentativaId = $tentativa2; usuario = 'comprador-2'; produtoId = $produtoId; quantidade = 1 }
    $conteudo1 = [System.Net.Http.StringContent]::new(
        ($compra1 | ConvertTo-Json -Compress),
        [System.Text.Encoding]::UTF8,
        'application/json'
    )
    $conteudo2 = [System.Net.Http.StringContent]::new(
        ($compra2 | ConvertTo-Json -Compress),
        [System.Text.Encoding]::UTF8,
        'application/json'
    )

    $tarefa1 = $cliente.PostAsync("$base/demo/compras", $conteudo1)
    $tarefa2 = $cliente.PostAsync("$base/demo/compras", $conteudo2)
    [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]@($tarefa1, $tarefa2))

    $respostas = @(
        [pscustomobject]@{
            Tentativa = $tentativa1
            Status = [int]$tarefa1.Result.StatusCode
            Corpo = ($tarefa1.Result.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json)
            Compra = $compra1
        },
        [pscustomobject]@{
            Tentativa = $tentativa2
            Status = [int]$tarefa2.Result.StatusCode
            Corpo = ($tarefa2.Result.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json)
            Compra = $compra2
        }
    )

    if (@($respostas | Where-Object Status -eq 200).Count -ne 1 -or
        @($respostas | Where-Object Status -eq 409).Count -ne 1) {
        throw "Esperado um HTTP 200 e um HTTP 409. Recebido: $($respostas.Status -join ', ')."
    }

    $vencedora = $respostas | Where-Object Status -eq 200 | Select-Object -First 1
    $pedidoId = $vencedora.Corpo.pedidoId
    if (-not $pedidoId) {
        throw 'A compra aprovada não retornou pedidoId.'
    }

    $repeticao = $cliente.PostAsync(
        "$base/demo/compras",
        [System.Net.Http.StringContent]::new(
            ($vencedora.Compra | ConvertTo-Json -Compress),
            [System.Text.Encoding]::UTF8,
            'application/json'
        )
    ).GetAwaiter().GetResult()
    $corpoRepeticao = $repeticao.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
    if ([int]$repeticao.StatusCode -ne 200 -or $corpoRepeticao.pedidoId -ne $pedidoId) {
        throw 'Repetir a mesma tentativa deveria devolver o mesmo pedido.'
    }

    $compraAlterada = @{
        tentativaId = $vencedora.Tentativa
        usuario = 'outro-comprador'
        produtoId = $produtoId
        quantidade = 1
    }
    $conflito = $cliente.PostAsync(
        "$base/demo/compras",
        [System.Net.Http.StringContent]::new(
            ($compraAlterada | ConvertTo-Json -Compress),
            [System.Text.Encoding]::UTF8,
            'application/json'
        )
    ).GetAwaiter().GetResult()
    if ([int]$conflito.StatusCode -ne 409) {
        throw 'Reutilizar o identificador com outros dados deveria retornar HTTP 409.'
    }

    $estado = $null
    for ($indice = 0; $indice -lt 30; $indice++) {
        $estado = Invoke-RestMethod -Uri "$base/demo/mensagens/$pedidoId"
        if ($estado.estado -eq 'PROCESSADA') { break }
        Start-Sleep -Milliseconds 100
    }
    if ($estado.estado -ne 'PROCESSADA') {
        throw "Mensagem não processada. Estado atual: $($estado.estado)."
    }

    $estoqueFinal = Invoke-RestMethod -Uri "$base/demo/estoque"
    if ($estoqueFinal.estoque -ne 0) {
        throw "Estoque final esperado: 0. Recebido: $($estoqueFinal.estoque)."
    }

    Write-Output 'PASSOU: uma compra aprovada (200) e uma recusada (409).'
    Write-Output "PASSOU: repetir $pedidoId devolveu o mesmo pedido sem novo desconto."
    Write-Output 'PASSOU: reutilizar o identificador com outros dados foi recusado (409).'
    Write-Output "PASSOU: mensagem $pedidoId processada; estoque final 0."
}
finally {
    $cliente.Dispose()
}
