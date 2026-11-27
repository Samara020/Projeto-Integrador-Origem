import os
from urllib.parse import quote

from app.catalog import (
    available_products,
    filter_products,
    find_product,
    load_catalog,
    validate_catalog
)


def _build_db_dsn():
    database_url = (os.getenv("DATABASE_URL") or "").strip()

    if database_url:
        return database_url

    host = (
        os.getenv("POSTGRES_HOST")
        or os.getenv("DB_HOST")
        or ""
    ).strip()

    dbname = (
        os.getenv("POSTGRES_DB")
        or os.getenv("DB_NAME")
        or ""
    ).strip()

    user = (
        os.getenv("POSTGRES_USER")
        or os.getenv("DB_USER")
        or ""
    ).strip()

    password = (
        os.getenv("POSTGRES_PASSWORD")
        or os.getenv("DB_PASSWORD")
        or ""
    )

    port = (
        os.getenv("POSTGRES_PORT")
        or os.getenv("DB_PORT")
        or "5432"
    ).strip()

    if host and dbname and user:
        encoded_user = quote(user, safe="")
        encoded_password = quote(password, safe="")
        encoded_dbname = quote(dbname, safe="")

        return (
            f"postgresql://{encoded_user}:{encoded_password}"
            f"@{host}:{port}/{encoded_dbname}"
        )

    return None


def _normalize_row(row):
    product_id = row.get("product_id")

    return {
        "product_id": (
            str(product_id).strip()
            if product_id is not None
            else ""
        ),
        "name": row.get("name"),
        "category": (
            row["category"].strip()
            if isinstance(row.get("category"), str)
            else row.get("category")
        ),
        "technique": (
            row["technique"].strip()
            if isinstance(row.get("technique"), str)
            else row.get("technique")
        ),
        "region": (
            row["region"].strip()
            if isinstance(row.get("region"), str)
            else row.get("region")
        ),
        "available": row.get("available") is True
    }


def fetch_catalog_from_db(dsn=None):
    target_dsn = dsn or _build_db_dsn()

    if not target_dsn:
        return None

    try:
        import psycopg
        from psycopg.rows import dict_row
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
        with psycopg.connect(
            target_dsn,
            row_factory=dict_row,
            connect_timeout=2
        ) as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()

    except psycopg.Error:
        return None

    items = [_normalize_row(row) for row in rows]

    return validate_catalog(items)


def get_catalog_items(catalog=None, use_db=True):
    if not isinstance(use_db, bool):
        raise TypeError("use_db deve ser um valor booleano.")

    if catalog is not None:
        return validate_catalog(catalog)

    if use_db:
        db_items = fetch_catalog_from_db()

        if db_items is not None:
            return validate_catalog(db_items)

    return load_catalog()


def get_repository_product(
    product_id,
    catalog=None,
    use_db=True
):
    items = get_catalog_items(
        catalog=catalog,
        use_db=use_db
    )

    return find_product(
        product_id,
        catalog=items
    )


def get_repository_available_products(
    reference_product_id=None,
    catalog=None,
    use_db=True
):
    items = get_catalog_items(
        catalog=catalog,
        use_db=use_db
    )

    return available_products(
        reference_product_id=reference_product_id,
        catalog=items
    )


def get_repository_filtered_products(
    category=None,
    technique=None,
    region=None,
    reference_product_id=None,
    catalog=None,
    use_db=True
):
    items = get_catalog_items(
        catalog=catalog,
        use_db=use_db
    )

    return filter_products(
        category=category,
        technique=technique,
        region=region,
        reference_product_id=reference_product_id,
        catalog=items
    )
