using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public sealed class ProcessadorPedidos : BackgroundService
{
    private readonly FilaPedidos _filaPedidos;
    private readonly ILogger<ProcessadorPedidos> _logger;

    public ProcessadorPedidos(
        FilaPedidos filaPedidos,
        ILogger<ProcessadorPedidos> logger)
    {
        _filaPedidos = filaPedidos;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "Processador de pedidos iniciado."
        );

        try
        {
            await foreach (
                var mensagem in _filaPedidos.LerAsync(stoppingToken))
            {
                await ProcessarMensagemAsync(
                    mensagem,
                    stoppingToken
                );
            }
        }
        catch (OperationCanceledException)
            when (stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation(
                "Processador encerrado."
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Erro no processador de pedidos."
            );

            throw;
        }
    }

    private async Task ProcessarMensagemAsync(
        MensagemPedido mensagem,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Pedido recebido: Id={Id}, Usuario={Usuario}, Produto={ProdutoId}, Quantidade={Quantidade}",
            mensagem.Id,
            mensagem.Usuario,
            mensagem.ProdutoId,
            mensagem.Quantidade
        );

        await Task.Delay(
            TimeSpan.FromMilliseconds(100),
            cancellationToken
        );

        _logger.LogInformation(
            "Pedido processado com sucesso: Id={Id}",
            mensagem.Id
        );
    }
}