-- 07_suporte_exclusao_logica_produto.sql
-- Adiciona suporte a pausa e exclusão lógica na tabela produto para persistência permanente.

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS pausado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_produto_visibilidade ON produto (fk_loja_id_loja, excluido, pausado);
