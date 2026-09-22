var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<EstoqueDemonstracao>();
builder.Services.AddSingleton<FilaPedidos>();
builder.Services.AddHostedService<ProcessadorPedidos>();
builder.Services.AddCors(opcoes => opcoes.AddPolicy("FrontendLocal", politica =>
    politica.WithOrigins("http://localhost:3000")
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();
app.UseCors("FrontendLocal");

app.MapGet("/demo/saude", () =>
    Results.Ok(new { mensagem = "API funcionando" }));

app.MapGet("/demo/estoque", (EstoqueDemonstracao estoque) =>
    Results.Ok(new { estoque = estoque.Consultar() }));

app.MapGet("/demo/mensagens/{pedidoId}", (string pedidoId, FilaPedidos fila) =>
    fila.ConsultarEstado(pedidoId) is { } estado
        ? Results.Ok(new { pedidoId, estado })
        : Results.NotFound(new { mensagem = "Mensagem não encontrada." }));

app.MapPost("/demo/compras", (
    CompraRequest compra,
    EstoqueDemonstracao estoque) =>
{
    if (compra.TentativaId == Guid.Empty)
        return Results.BadRequest(new { mensagem = "Informe o identificador da tentativa." });
    if (string.IsNullOrWhiteSpace(compra.Usuario))
        return Results.BadRequest(new { mensagem = "Informe o usuário." });
    if (compra.ProdutoId != EstoqueDemonstracao.ProdutoId)
        return Results.BadRequest(new { mensagem = "Produto fora da demonstração." });
    if (compra.Quantidade <= 0)
        return Results.BadRequest(new { mensagem = "Informe uma quantidade válida." });

    var resultado = estoque.Comprar(compra);

    if (resultado.Status == StatusCompra.Esgotada)
        return Results.Conflict(new
        {
            mensagem = "Estoque esgotado.",
            estoque = resultado.EstoqueRestante
        });

    if (resultado.Status == StatusCompra.TentativaReutilizada)
        return Results.Conflict(new { mensagem = "Tentativa já utilizada com outros dados." });

    if (resultado.Status == StatusCompra.FilaCheia)
        return Results.Json(
            new { mensagem = "Fila de pedidos temporariamente cheia." },
            statusCode: StatusCodes.Status503ServiceUnavailable
        );

    return Results.Ok(new
    {
        mensagem = "Compra aprovada e notificação enfileirada.",
        pedidoId = resultado.PedidoId,
        usuario = compra.Usuario,
        estoque = resultado.EstoqueRestante
    });
});

app.Run();

record CompraRequest(Guid TentativaId, string Usuario, string ProdutoId, int Quantidade);
record ResultadoCompra(StatusCompra Status, string? PedidoId, int EstoqueRestante);
record CompraRegistrada(string Usuario, string ProdutoId, int Quantidade, string PedidoId, int EstoqueRestante);

enum StatusCompra
{
    Aprovada,
    Esgotada,
    TentativaReutilizada,
    FilaCheia
}

sealed class EstoqueDemonstracao
{
    public const string ProdutoId = "prd_201";
    private readonly object _trava = new();
    private readonly Dictionary<Guid, CompraRegistrada> _compras = new();
    private readonly FilaPedidos _fila;
    private int _estoque = 1;

    public EstoqueDemonstracao(FilaPedidos fila)
    {
        _fila = fila;
    }

    public int Consultar()
    {
        lock (_trava)
        {
            return _estoque;
        }
    }

    public ResultadoCompra Comprar(CompraRequest compra)
    {
        lock (_trava)
        {
            if (_compras.TryGetValue(compra.TentativaId, out var registrada))
            {
                if (registrada.Usuario != compra.Usuario ||
                    registrada.ProdutoId != compra.ProdutoId ||
                    registrada.Quantidade != compra.Quantidade)
                    return new ResultadoCompra(StatusCompra.TentativaReutilizada, null, _estoque);

                return new ResultadoCompra(
                    StatusCompra.Aprovada,
                    registrada.PedidoId,
                    registrada.EstoqueRestante
                );
            }

            if (_estoque < compra.Quantidade)
                return new ResultadoCompra(StatusCompra.Esgotada, null, _estoque);

            var pedidoId = $"ped_demo_{compra.TentativaId:N}";
            var mensagem = new MensagemPedido(
                pedidoId,
                compra.Usuario,
                compra.ProdutoId,
                compra.Quantidade,
                DateTimeOffset.UtcNow
            );
            if (!_fila.TentarEnfileirar(mensagem))
                return new ResultadoCompra(StatusCompra.FilaCheia, null, _estoque);

            _estoque -= compra.Quantidade;
            _compras.Add(compra.TentativaId, new CompraRegistrada(
                compra.Usuario,
                compra.ProdutoId,
                compra.Quantidade,
                pedidoId,
                _estoque
            ));
            return new ResultadoCompra(StatusCompra.Aprovada, pedidoId, _estoque);
        }
    }
}
