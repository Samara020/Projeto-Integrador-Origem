import json
import os
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"

CATALOG_PATH = Path(
    os.getenv("CATALOGO_IA", DATA_DIR / "catalogo_origem.json")
)


def validate_catalog(catalog):
    if not isinstance(catalog, list):
        raise TypeError("O catálogo deve ser uma lista.")

    for product in catalog:
        if not isinstance(product, dict):
            raise TypeError("Cada produto deve ser um dicionário.")

        product_id = product.get("product_id")

        if not isinstance(product_id, str) or not product_id.strip():
            raise ValueError("O produto deve possuir um identificador válido.")

    return catalog


def normalize_filter(value):
    if value is None:
        return None

    if not isinstance(value, str):
        raise TypeError("O parâmetro deve ser uma string.")

    value = value.strip()

    return value if value else None

def attributes_match(context_value, candidate_value):
    if context_value is None or candidate_value is None:
        return False

    if isinstance(context_value, str) and isinstance(candidate_value, str):
        return context_value.strip().casefold() == candidate_value.strip().casefold()

    return context_value == candidate_value

def load_catalog(path=None):
    catalog_path = Path(path) if path is not None else CATALOG_PATH

    try:
        with catalog_path.open("r", encoding="utf-8") as file:
            catalog = json.load(file)
    except FileNotFoundError as error:
        raise FileNotFoundError(
            f"Arquivo de catálogo não encontrado: {catalog_path}"
        ) from error
    except json.JSONDecodeError as error:
        raise ValueError(
            f"Arquivo de catálogo contém JSON inválido: {catalog_path}"
        ) from error

    return validate_catalog(catalog)


def resolve_catalog(catalog=None):
    if catalog is not None:
        return validate_catalog(catalog)

    return load_catalog()


def find_product(product_id, catalog=None):
    product_id = normalize_filter(product_id)

    if product_id is None:
        return None

    items = resolve_catalog(catalog)

    for product in items:
        if product["product_id"] == product_id:
            return product

    return None


def is_product_available(product, default=False):
    return product.get("available", default) is True


def available_products(reference_product_id=None, catalog=None):
    reference_product_id = normalize_filter(reference_product_id)

    items = resolve_catalog(catalog)

    return [
        product
        for product in items
        if is_product_available(product)
        and product["product_id"] != reference_product_id
    ]


def filter_products(
    category=None,
    technique=None,
    region=None,
    reference_product_id=None,
    catalog=None
):
    filters = {
        "category": normalize_filter(category),
        "technique": normalize_filter(technique),
        "region": normalize_filter(region)
    }

    candidates = available_products(
        reference_product_id=reference_product_id,
        catalog=catalog
    )

    return [
        product
        for product in candidates
        if all(
            isinstance(product.get(field), str)
            and attributes_match(value, product.get(field))
            for field, value in filters.items()
            if value is not None
        )
    ]
