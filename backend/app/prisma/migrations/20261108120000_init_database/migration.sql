-- CreateTable
CREATE TABLE "usuario" (
    "id_usuario" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20),
    "usuario_tipo" VARCHAR(20) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id_categoria" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "loja" (
    "id_loja" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "fk_usuario_id_usuario" INTEGER NOT NULL,

    CONSTRAINT "loja_pkey" PRIMARY KEY ("id_loja")
);

-- CreateTable
CREATE TABLE "endereco_de_entrega" (
    "id_endereco" SERIAL NOT NULL,
    "logradouro" VARCHAR(200) NOT NULL,
    "bairro" VARCHAR(100) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "cpf" CHAR(11) NOT NULL,

    CONSTRAINT "endereco_de_entrega_pkey" PRIMARY KEY ("id_endereco"),
    CONSTRAINT "ck_endereco_de_entrega_cpf" CHECK (cpf ~ '^[0-9]{11}$')
);

-- CreateTable
CREATE TABLE "produto" (
    "id_produto" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "tecnica" VARCHAR(100) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "origem" VARCHAR(150) NOT NULL,
    "modalidade_producao" VARCHAR(30) NOT NULL,
    "peca_unica" BOOLEAN NOT NULL,
    "fk_loja_id_loja" INTEGER NOT NULL,
    "fk_categoria_id_categoria" INTEGER NOT NULL,

    CONSTRAINT "produto_pkey" PRIMARY KEY ("id_produto"),
    CONSTRAINT "ck_produto_preco" CHECK (preco >= 0)
);

-- CreateTable
CREATE TABLE "estoque" (
    "id_estoque" SERIAL NOT NULL,
    "quantidade_disponivel" INTEGER NOT NULL,
    "ponto_reposicao" INTEGER NOT NULL,
    "fk_produto_id_produto" INTEGER NOT NULL,

    CONSTRAINT "estoque_pkey" PRIMARY KEY ("id_estoque"),
    CONSTRAINT "ck_estoque_quantidade" CHECK (quantidade_disponivel >= 0),
    CONSTRAINT "ck_estoque_reposicao" CHECK (ponto_reposicao >= 0)
);

-- CreateTable
CREATE TABLE "imagem" (
    "id_imagem" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "fk_produto_id_produto" INTEGER NOT NULL,

    CONSTRAINT "imagem_pkey" PRIMARY KEY ("id_imagem")
);

-- CreateTable
CREATE TABLE "carrinho" (
    "id_carrinho" SERIAL NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "data_criacao" TIMESTAMP(6) NOT NULL,
    "fk_usuario_id_usuario" INTEGER NOT NULL,

    CONSTRAINT "carrinho_pkey" PRIMARY KEY ("id_carrinho")
);

-- CreateTable
CREATE TABLE "item_carrinho" (
    "numero_item" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "fk_produto_id_produto" INTEGER NOT NULL,
    "fk_carrinho_id_carrinho" INTEGER NOT NULL,

    CONSTRAINT "pk_item_carrinho" PRIMARY KEY ("fk_carrinho_id_carrinho","numero_item"),
    CONSTRAINT "ck_item_carrinho_quantidade" CHECK (quantidade > 0),
    CONSTRAINT "ck_item_carrinho_preco" CHECK (preco_unitario >= 0)
);

-- CreateTable
CREATE TABLE "pedido" (
    "id_pedidos" SERIAL NOT NULL,
    "data" TIMESTAMP(6) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "fk_usuario_id_usuario" INTEGER NOT NULL,
    "fk_endereco_de_entrega_id_endereco" INTEGER NOT NULL,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("id_pedidos")
);

-- CreateTable
CREATE TABLE "item_pedido" (
    "numero_item" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "fk_pedido_id_pedidos" INTEGER NOT NULL,
    "fk_produto_id_produto" INTEGER NOT NULL,

    CONSTRAINT "pk_item_pedido" PRIMARY KEY ("fk_pedido_id_pedidos","numero_item"),
    CONSTRAINT "ck_item_pedido_quantidade" CHECK (quantidade > 0),
    CONSTRAINT "ck_item_pedido_preco" CHECK (preco_unitario >= 0),
    CONSTRAINT "ck_item_pedido_subtotal" CHECK (subtotal >= 0)
);

-- CreateTable
CREATE TABLE "pagamento" (
    "id_pagamento" SERIAL NOT NULL,
    "data" TIMESTAMP(6) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "forma_pagamento" VARCHAR(30) NOT NULL,
    "fk_pedido_id_pedidos" INTEGER NOT NULL,

    CONSTRAINT "pagamento_pkey" PRIMARY KEY ("id_pagamento"),
    CONSTRAINT "ck_pagamento_valor" CHECK (valor >= 0)
);

-- CreateTable
CREATE TABLE "avaliacao" (
    "id_avaliacao" SERIAL NOT NULL,
    "nota" SMALLINT NOT NULL,
    "comentario" TEXT,
    "data_avaliacao" TIMESTAMP(6) NOT NULL,
    "fk_usuario_id_usuario" INTEGER NOT NULL,
    "fk_produto_id_produto" INTEGER NOT NULL,

    CONSTRAINT "avaliacao_pkey" PRIMARY KEY ("id_avaliacao"),
    CONSTRAINT "ck_avaliacao_nota" CHECK (nota BETWEEN 1 AND 5)
);

-- CreateTable
CREATE TABLE "historico_pedido" (
    "id_historico" SERIAL NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "observacao" TEXT,
    "data" TIMESTAMP(6) NOT NULL,
    "fk_pedido_id_pedidos" INTEGER NOT NULL,

    CONSTRAINT "historico_pedido_pkey" PRIMARY KEY ("id_historico")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_usuario_email" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "idx_loja_usuario" ON "loja"("fk_usuario_id_usuario");

-- CreateIndex
CREATE INDEX "idx_produto_loja" ON "produto"("fk_loja_id_loja");

-- CreateIndex
CREATE INDEX "idx_produto_categoria" ON "produto"("fk_categoria_id_categoria");

-- CreateIndex
CREATE UNIQUE INDEX "uq_estoque_produto" ON "estoque"("fk_produto_id_produto");

-- CreateIndex
CREATE INDEX "idx_imagem_produto" ON "imagem"("fk_produto_id_produto");

-- CreateIndex
CREATE UNIQUE INDEX "uq_carrinho_usuario" ON "carrinho"("fk_usuario_id_usuario");

-- CreateIndex
CREATE INDEX "idx_item_carrinho_produto" ON "item_carrinho"("fk_produto_id_produto");

-- CreateIndex
CREATE INDEX "idx_pedido_usuario" ON "pedido"("fk_usuario_id_usuario");

-- CreateIndex
CREATE INDEX "idx_pedido_endereco" ON "pedido"("fk_endereco_de_entrega_id_endereco");

-- CreateIndex
CREATE INDEX "idx_item_pedido_produto" ON "item_pedido"("fk_produto_id_produto");

-- CreateIndex
CREATE INDEX "idx_pagamento_pedido" ON "pagamento"("fk_pedido_id_pedidos");

-- CreateIndex
CREATE INDEX "idx_avaliacao_usuario" ON "avaliacao"("fk_usuario_id_usuario");

-- CreateIndex
CREATE INDEX "idx_avaliacao_produto" ON "avaliacao"("fk_produto_id_produto");

-- CreateIndex
CREATE INDEX "idx_historico_pedido" ON "historico_pedido"("fk_pedido_id_pedidos");

-- AddForeignKey
ALTER TABLE "loja" ADD CONSTRAINT "fk_loja_usuario" FOREIGN KEY ("fk_usuario_id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "fk_produto_loja" FOREIGN KEY ("fk_loja_id_loja") REFERENCES "loja"("id_loja") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produto" ADD CONSTRAINT "fk_produto_categoria" FOREIGN KEY ("fk_categoria_id_categoria") REFERENCES "categoria"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque" ADD CONSTRAINT "fk_estoque_produto" FOREIGN KEY ("fk_produto_id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagem" ADD CONSTRAINT "fk_imagem_produto" FOREIGN KEY ("fk_produto_id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carrinho" ADD CONSTRAINT "fk_carrinho_usuario" FOREIGN KEY ("fk_usuario_id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_carrinho" ADD CONSTRAINT "fk_item_carrinho_produto" FOREIGN KEY ("fk_produto_id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_carrinho" ADD CONSTRAINT "fk_item_carrinho_carrinho" FOREIGN KEY ("fk_carrinho_id_carrinho") REFERENCES "carrinho"("id_carrinho") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_usuario" FOREIGN KEY ("fk_usuario_id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "fk_pedido_endereco" FOREIGN KEY ("fk_endereco_de_entrega_id_endereco") REFERENCES "endereco_de_entrega"("id_endereco") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "fk_item_pedido_pedido" FOREIGN KEY ("fk_pedido_id_pedidos") REFERENCES "pedido"("id_pedidos") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pedido" ADD CONSTRAINT "fk_item_pedido_produto" FOREIGN KEY ("fk_produto_id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento" ADD CONSTRAINT "fk_pagamento_pedido" FOREIGN KEY ("fk_pedido_id_pedidos") REFERENCES "pedido"("id_pedidos") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao" ADD CONSTRAINT "fk_avaliacao_usuario" FOREIGN KEY ("fk_usuario_id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacao" ADD CONSTRAINT "fk_avaliacao_produto" FOREIGN KEY ("fk_produto_id_produto") REFERENCES "produto"("id_produto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_pedido" ADD CONSTRAINT "fk_historico_pedido" FOREIGN KEY ("fk_pedido_id_pedidos") REFERENCES "pedido"("id_pedidos") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Functions & Triggers de Integridade
CREATE OR REPLACE FUNCTION validar_estoque_peca_unica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_peca_unica BOOLEAN;
BEGIN
    SELECT peca_unica
    INTO v_peca_unica
    FROM produto
    WHERE id_produto = NEW.fk_produto_id_produto;

    IF v_peca_unica IS TRUE AND NEW.quantidade_disponivel > 1 THEN
        RAISE EXCEPTION 'Peca unica nao pode ter estoque superior a uma unidade.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_estoque_peca_unica
BEFORE INSERT OR UPDATE OF quantidade_disponivel, fk_produto_id_produto
ON estoque
FOR EACH ROW
EXECUTE FUNCTION validar_estoque_peca_unica();

CREATE OR REPLACE FUNCTION baixar_estoque(
    p_id_produto INTEGER,
    p_quantidade INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_quantidade INTEGER;
BEGIN
    IF p_quantidade <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero.';
    END IF;

    SELECT quantidade_disponivel
    INTO v_quantidade
    FROM estoque
    WHERE fk_produto_id_produto = p_id_produto
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Estoque nao encontrado para o produto %.', p_id_produto;
    END IF;

    IF v_quantidade < p_quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto %.', p_id_produto;
    END IF;

    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel - p_quantidade
    WHERE fk_produto_id_produto = p_id_produto;
END;
$$;

CREATE OR REPLACE FUNCTION validar_produto_peca_unica()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_quantidade INTEGER;
BEGIN
    IF NEW.peca_unica IS TRUE THEN
        SELECT quantidade_disponivel
        INTO v_quantidade
        FROM estoque
        WHERE fk_produto_id_produto = NEW.id_produto;

        IF FOUND AND v_quantidade > 1 THEN
            RAISE EXCEPTION 'Peca unica nao pode ter estoque superior a uma unidade.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_produto_peca_unica
BEFORE UPDATE OF peca_unica
ON produto
FOR EACH ROW
EXECUTE FUNCTION validar_produto_peca_unica();
