using System.Threading.Channels;

public sealed class FilaPedidos
{
    private readonly Channel<MensagemPedido> _fila;

    public FilaPedidos()
    {
        var opcoes = new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        };

        _fila = Channel.CreateBounded<MensagemPedido>(opcoes);
    }

    public ValueTask EnfileirarAsync(
        MensagemPedido mensagem,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(mensagem);

        return _fila.Writer.WriteAsync(
            mensagem,
            cancellationToken
        );
    }

    public IAsyncEnumerable<MensagemPedido> LerAsync(
        CancellationToken cancellationToken = default)
    {
        return _fila.Reader.ReadAllAsync(cancellationToken);
    }

    public void EncerrarEscrita()
    {
        _fila.Writer.TryComplete();
    }
}