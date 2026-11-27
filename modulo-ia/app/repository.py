import os
from urllib.parse import quote

from app.catalog import (
    available_products,
    filter_products,
    find_product,
    load_catalog,
    normalize_filter,
    validate_catalog
)
from app.data_log import registrar_uso


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


def _carregar_catalogo(catalog=None, use_db=True):
    """Devolve (itens, fonte). Uso interno: não grava log."""
    if not isinstance(use_db, bool):
        raise TypeError("use_db deve ser um valor booleano.")

    if catalog is not None:
        return validate_catalog(catalog), "lista_recebida"

    if use_db:
        db_items = fetch_catalog_from_db()

        if db_items is not None:
            return validate_catalog(db_items), "postgres"

    return load_catalog(), "json"


def _ids(items):
    return [item.get("product_id") for item in items]


def _registrar_erro(funcao, parametros, error):
    registrar_uso(
        funcao=funcao,
        parametros=parametros,
        registros=0,
        status="erro",
        erro=f"{type(error).__name__}: {error}",
    )


def get_catalog_items(catalog=None, use_db=True):
    """Carrega o catálogo inteiro (payload, PostgreSQL ou JSON)."""
    parametros = {"catalogo_no_payload": catalog is not None}

    try:
        items, fonte = _carregar_catalogo(catalog=catalog, use_db=use_db)
    except (TypeError, ValueError, FileNotFoundError) as error:
        _registrar_erro("get_catalog_items", parametros, error)
        raise

    registrar_uso(
        funcao="get_catalog_items",
        parametros=parametros,
        registros=len(items),
        status="sucesso" if items else "vazio",
        fonte="payload" if fonte == "lista_recebida" else fonte,
    )

    return items


def get_repository_product(
    product_id,
    catalog=None,
    use_db=True
):
    """Busca um produto pelo identificador. Devolve None se não existir."""
    parametros = {"product_id": product_id}

    try:
        items, fonte = _carregar_catalogo(catalog=catalog, use_db=use_db)
        product = find_product(product_id, catalog=items)
    except (TypeError, ValueError, FileNotFoundError) as error:
        _registrar_erro("get_repository_product", parametros, error)
        raise

    if product is None:
        registrar_uso(
            funcao="get_repository_product",
            parametros=parametros,
            registros=0,
            status="erro",
            fonte=fonte,
            erro=f"produto nao encontrado: {product_id}",
        )
        return None

    registrar_uso(
        funcao="get_repository_product",
        parametros=parametros,
        registros=1,
        status="sucesso",
        ids=[product["product_id"]],
        fonte=fonte,
    )

    return product


def get_repository_products_by_ids(
    product_ids,
    catalog=None,
    use_db=True
):
    """Busca vários produtos pelos identificadores, na ordem pedida.

    Identificadores inexistentes são ignorados e ficam registrados no log.
    Devolve lista vazia se nenhum existir.
    """
    pedidos = []
    for product_id in product_ids or []:
        normalizado = normalize_filter(product_id)
        if normalizado is not None and normalizado not in pedidos:
            pedidos.append(normalizado)

    parametros = {"product_ids": pedidos}

    try:
        items, fonte = _carregar_catalogo(catalog=catalog, use_db=use_db)
    except (TypeError, ValueError, FileNotFoundError) as error:
        _registrar_erro("get_repository_products_by_ids", parametros, error)
        raise

    por_id = {item["product_id"]: item for item in items}
    encontrados = [por_id[pid] for pid in pedidos if pid in por_id]
    faltando = [pid for pid in pedidos if pid not in por_id]

    registrar_uso(
        funcao="get_repository_products_by_ids",
        parametros=parametros,
        registros=len(encontrados),
        status="sucesso" if encontrados else "vazio",
        ids=_ids(encontrados),
        fonte=fonte,
        erro=(
            f"produtos nao encontrados: {', '.join(faltando)}"
            if faltando
            else None
        ),
    )

    return encontrados


def get_repository_available_products(
    reference_product_id=None,
    catalog=None,
    use_db=True
):
    """Lista os produtos disponíveis, sem o produto de referência."""
    parametros = {"reference_product_id": reference_product_id}

    try:
        items, fonte = _carregar_catalogo(catalog=catalog, use_db=use_db)
        result = available_products(
            reference_product_id=reference_product_id,
            catalog=items
        )
    except (TypeError, ValueError, FileNotFoundError) as error:
        _registrar_erro("get_repository_available_products", parametros, error)
        raise

    registrar_uso(
        funcao="get_repository_available_products",
        parametros=parametros,
        registros=len(result),
        status="sucesso" if result else "vazio",
        ids=_ids(result),
        fonte=fonte,
    )

    return result


def get_repository_filtered_products(
    category=None,
    technique=None,
    region=None,
    reference_product_id=None,
    catalog=None,
    use_db=True
):
    """Lista os produtos disponíveis que batem com os filtros informados."""
    parametros = {
        "category": category,
        "technique": technique,
        "region": region,
        "reference_product_id": reference_product_id,
    }
    parametros = {k: v for k, v in parametros.items() if v is not None}

    try:
        items, fonte = _carregar_catalogo(catalog=catalog, use_db=use_db)
        result = filter_products(
            category=category,
            technique=technique,
            region=region,
            reference_product_id=reference_product_id,
            catalog=items
        )
    except (TypeError, ValueError, FileNotFoundError) as error:
        _registrar_erro("get_repository_filtered_products", parametros, error)
        raise

    registrar_uso(
        funcao="get_repository_filtered_products",
        parametros=parametros,
        registros=len(result),
        status="sucesso" if result else "vazio",
        ids=_ids(result),
        fonte=fonte,
    )

    return result
