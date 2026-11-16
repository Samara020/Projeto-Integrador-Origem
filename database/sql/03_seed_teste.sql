
BEGIN;

INSERT INTO categoria (id_categoria, nome, descricao)
VALUES (9001, 'Artesanato de teste', 'Categoria utilizada em testes automatizados.');

INSERT INTO usuario
    (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES
    (9001, 'Comprador Teste', 'comprador.teste@example.com',
     'senha_ficticia_teste', '81999990001', 'COMPRADOR');

INSERT INTO usuario
    (id_usuario, nome, email, senha, telefone, usuario_tipo)
VALUES
    (9002, 'Artesão Teste', 'artesao.teste@example.com',
     'senha_ficticia_teste', '81999990002', 'VENDEDOR');

INSERT INTO loja (id_loja, nome, descricao, fk_usuario_id_usuario)
VALUES
    (9001, 'Loja de Teste', 'Loja fictícia para validar relacionamentos.', 9002);

INSERT INTO produto
    (id_produto, nome, descricao, tecnica, preco, origem,
     modalidade_producao, peca_unica, fk_loja_id_loja,
     fk_categoria_id_categoria)
VALUES
    (9001, 'Peça de Teste', 'Produto fictício para testes.',
     'Modelagem manual', 25.00, 'Recife',
     'Artesanal', FALSE, 9001, 9001);

INSERT INTO estoque
    (id_estoque, quantidade_disponivel, ponto_reposicao,
     fk_produto_id_produto)
VALUES
    (9001, 5, 1, 9001);

INSERT INTO imagem (id_imagem, url, fk_produto_id_produto)
VALUES
    (9001, 'https://example.com/imagem-teste.jpg', 9001);

INSERT INTO endereco_de_entrega
    (id_endereco, logradouro, bairro, cidade, cpf)
VALUES
    (9001, 'Rua de Teste, 100', 'Boa Viagem', 'Recife', '12345678901');

INSERT INTO carrinho
    (id_carrinho, status, data_criacao, fk_usuario_id_usuario)
VALUES
    (9001, 'ABERTO', CURRENT_TIMESTAMP, 9001);

INSERT INTO item_carrinho
    (numero_item, quantidade, preco_unitario,
     fk_produto_id_produto, fk_carrinho_id_carrinho)
VALUES
    (1, 2, 25.00, 9001, 9001);

INSERT INTO pedido
    (id_pedidos, data, status, fk_usuario_id_usuario,
     fk_endereco_de_entrega_id_endereco)
VALUES
    (9001, CURRENT_TIMESTAMP, 'PENDENTE', 9001, 9001);

INSERT INTO item_pedido
    (numero_item, preco_unitario, subtotal, quantidade,
     fk_pedido_id_pedidos, fk_produto_id_produto)
VALUES
    (1, 25.00, 50.00, 2, 9001, 9001);

INSERT INTO pagamento
    (id_pagamento, data, valor, status, forma_pagamento,
     fk_pedido_id_pedidos)
VALUES
    (9001, CURRENT_TIMESTAMP, 50.00, 'PENDENTE',
     'PIX', 9001);

INSERT INTO historico_pedido
    (id_historico, status, observacao, data, fk_pedido_id_pedidos)
VALUES
    (9001, 'PENDENTE', 'Registro fictício para teste.', CURRENT_TIMESTAMP, 9001);

INSERT INTO avaliacao
    (id_avaliacao, nota, comentario, data_avaliacao,
     fk_usuario_id_usuario, fk_produto_id_produto)
VALUES
    (9001, 5, 'Avaliação fictícia para teste.', CURRENT_TIMESTAMP, 9001, 9001);

COMMIT;