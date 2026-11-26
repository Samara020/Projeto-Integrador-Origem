-- 10_estrutura_modulo_ia.sql

CREATE INDEX IF NOT EXISTS idx_produto_recomendacao_ativo
    ON public.produto (status_validacao, excluido, pausado, fk_categoria_id_categoria, fk_loja_id_loja)
    WHERE NOT excluido AND NOT pausado;

CREATE OR REPLACE VIEW public.vw_catalogo_recomendacao_ia AS
SELECT
    p.id_produto::text AS product_id,
    p.id_produto,
    p.nome AS name,
    c.nome AS category,
    NULLIF(TRIM(p.tecnica), '') AS technique,
    COALESCE(NULLIF(TRIM(l.regiao), ''), NULLIF(TRIM(p.origem), '')) AS region,
    (
        NOT p.excluido
        AND NOT p.pausado
        AND UPPER(TRIM(p.status_validacao)) = 'APROVADA'
        AND COALESCE(e.quantidade_disponivel, 0) > 0
    ) AS available,
    p.preco,
    p.selo_ativo,
    COALESCE(e.quantidade_disponivel, 0) AS quantidade_disponivel,
    p.fk_loja_id_loja AS id_loja,
    p.fk_categoria_id_categoria AS id_categoria
FROM public.produto p
INNER JOIN public.categoria c
    ON c.id_categoria = p.fk_categoria_id_categoria
INNER JOIN public.loja l
    ON l.id_loja = p.fk_loja_id_loja
LEFT JOIN public.estoque e
    ON e.fk_produto_id_produto = p.id_produto;
