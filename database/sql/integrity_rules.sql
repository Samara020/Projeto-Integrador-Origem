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
