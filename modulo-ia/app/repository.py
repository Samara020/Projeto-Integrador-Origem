import os
from urllib.parse import urlparse

from app.catalog import available_products, find_product, load_catalog


def _build_db_dsn():
    database_url = (os.getenv("DATABASE_URL") or "").strip()
    if database_url:
        parsed = urlparse(database_url)
        # Se a URL aponta para localhost/127.0.0.1 dentro do container, respeita DB_HOST/POSTGRES_HOST se definido
        return database_url

    host = (os.getenv("POSTGRES_HOST") or os.getenv("DB_HOST") or "").strip()
    dbname = (os.getenv("POSTGRES_DB") or os.getenv("DB_NAME") or "").strip()
    user = (os.getenv("POSTGRES_USER") or os.getenv("DB_USER") or "").strip()
    password = os.getenv("POSTGRES_PASSWORD") or os.getenv("DB_PASSWORD") or ""
    port = (os.getenv("POSTGRES_PORT") or os.getenv("DB_PORT") or "5432").strip()

    if host and dbname and user:
        return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

    return None


def _normalize_row(row):
    return {
        "product_id": str(row["product_id"]).strip(),
        "name": row.get("name"),
        "category": row["category"].strip() if isinstance(row.get("category"), str) else row.get("category"),
        "technique": row["technique"].strip() if isinstance(row.get("technique"), str) else row.get("technique"),
        "region": row["region"].strip() if isinstance(row.get("region"), str) else row.get("region"),
        "available": bool(row.get("available", False)),
    }


def fetch_catalog_from_db(dsn=None):
    """
    Consulta a view public.vw_catalogo_recomendacao_ia no PostgreSQL.
    Retorna None se o banco nao estiver configurado, driver indisponivel ou houver erro de conexao.
    """
    target_dsn = dsn or _build_db_dsn()
    if not target_dsn:
        return None

    try:
        import psycopg  # type: ignore
        from psycopg.rows import dict_row  # type: ignore
    except ImportError:
        return None

    query = """
        SELECT
            product_id,
            name,
            category,
            technique,
            region,
            available
        FROM public.vw_catalogo_recomendacao_ia
        ORDER BY id_produto ASC
    """

    try:
        with psycopg.connect(target_dsn, row_factory=dict_row, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()
                return [_normalize_row(r) for r in rows]
    except Exception:
        return None


def get_catalog_items(catalog=None, use_db=True):
    """
    Fonte unificada de catalogo:
    1. Usa `catalog` explicito quando informado (ex.: payload ou testes).
    2. Se `use_db` estiver ativo, tenta ler do PostgreSQL via `vw_catalogo_recomendacao_ia`.
    3. Faz fallback para `load_catalog()` (JSON).
    """
    if catalog is not None:
        return catalog

    if use_db:
        db_items = fetch_catalog_from_db()
        if db_items is not None:
            return db_items

    return load_catalog()


def get_repository_product(product_id, catalog=None, use_db=True):
    items = get_catalog_items(catalog=catalog, use_db=use_db)
    return find_product(product_id, catalog=items)


def get_repository_available_products(reference_product_id=None, catalog=None, use_db=True):
    items = get_catalog_items(catalog=catalog, use_db=use_db)
    return available_products(reference_product_id=reference_product_id, catalog=items)
