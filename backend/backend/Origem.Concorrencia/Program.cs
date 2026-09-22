var builder = WebApplication.CreateBuilder(args);

// Uma única instância atende todas as requisições desta API.
builder.Services.AddSingleton<EstoqueDemonstracao>();
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

app.MapPost("/demo/compras", (
    CompraRequest compra,
    EstoqueDemonstracao estoque) =>
{
    if (string.IsNullOrWhiteSpace(compra.Usuario))
        return Results.BadRequest(new { mensagem = "Informe o usuário." });
    if (compra.ProdutoId != EstoqueDemonstracao.ProdutoId)
        return Results.BadRequest(new { mensagem = "Produto fora da demonstração." });
    if (compra.Quantidade <= 0)
        return Results.BadRequest(new { mensagem = "Informe uma quantidade válida." });

    var resultado = estoque.Comprar(compra.Quantidade);

    if (!resultado.Aprovada)
        return Results.Conflict(new
        {
            mensagem = "Estoque esgotado.",
            estoque = resultado.EstoqueRestante
        });

    return Results.Ok(new
    {
        mensagem = "Compra aprovada.",
        usuario = compra.Usuario,
        estoque = resultado.EstoqueRestante
    });
});

app.Run();

record CompraRequest(string Usuario, string ProdutoId, int Quantidade);
record ResultadoCompra(bool Aprovada, int EstoqueRestante);

sealed class EstoqueDemonstracao
{
    public const string ProdutoId = "prd_201";
    private readonly object _trava = new();
    private int _estoque = 1;

    public int Consultar()
    {
        lock (_trava)
        {
            return _estoque;
        }
    }

    public ResultadoCompra Comprar(int quantidade)
    {
        lock (_trava)
        {
            if (_estoque < quantidade)
                return new ResultadoCompra(false, _estoque);

            _estoque -= quantidade;
            return new ResultadoCompra(true, _estoque);
        }
    }
}
