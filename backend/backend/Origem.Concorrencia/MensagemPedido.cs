public sealed record MensagemPedido(
    string Id,
    string Usuario,
    string ProdutoId,
    int Quantidade,
    DateTimeOffset CriadoEm
);