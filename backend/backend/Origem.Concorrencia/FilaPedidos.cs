using System.Collections.Concurrent;
using System.Threading.Channels;

public sealed class FilaPedidos
{
    private readonly Channel<MensagemPedido> _fila;
    private readonly ConcurrentDictionary<string, string> _estados = new();

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

    public bool TentarEnfileirar(MensagemPedido mensagem)
    {
        ArgumentNullException.ThrowIfNull(mensagem);
        if (string.IsNullOrWhiteSpace(mensagem.Id) ||
            string.IsNullOrWhiteSpace(mensagem.Usuario) ||
            string.IsNullOrWhiteSpace(mensagem.ProdutoId) ||
            mensagem.Quantidade <= 0)
            throw new ArgumentException("Mensagem de pedido inválida.", nameof(mensagem));

        if (!_estados.TryAdd(mensagem.Id, "ENFILEIRADA"))
            return false;

        if (_fila.Writer.TryWrite(mensagem))
            return true;

        _estados.TryRemove(mensagem.Id, out _);
        return false;
    }

    public string? ConsultarEstado(string pedidoId) =>
        _estados.TryGetValue(pedidoId, out var estado) ? estado : null;

    public void MarcarProcessada(string pedidoId) =>
        _estados[pedidoId] = "PROCESSADA";

    public void MarcarFalha(string pedidoId) =>
        _estados[pedidoId] = "FALHOU";

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
