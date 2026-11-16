CREATE INDEX idx_loja_usuario
ON loja (fk_usuario_id_usuario);

CREATE INDEX idx_produto_loja
ON produto (fk_loja_id_loja);

CREATE INDEX idx_produto_categoria
ON produto (fk_categoria_id_categoria);

CREATE INDEX idx_imagem_produto
ON imagem (fk_produto_id_produto);

CREATE INDEX idx_item_carrinho_produto
ON item_carrinho (fk_produto_id_produto);

CREATE INDEX idx_pedido_usuario
ON pedido (fk_usuario_id_usuario);

CREATE INDEX idx_pedido_endereco
ON pedido (fk_endereco_de_entrega_id_endereco);

CREATE INDEX idx_item_pedido_produto
ON item_pedido (fk_produto_id_produto);

CREATE INDEX idx_pagamento_pedido
ON pagamento (fk_pedido_id_pedidos);

CREATE INDEX idx_avaliacao_usuario
ON avaliacao (fk_usuario_id_usuario);

CREATE INDEX idx_avaliacao_produto
ON avaliacao (fk_produto_id_produto);

CREATE INDEX idx_historico_pedido
ON historico_pedido (fk_pedido_id_pedidos);
