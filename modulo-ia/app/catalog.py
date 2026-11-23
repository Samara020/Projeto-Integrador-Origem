import json
import os
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Por padrão usa o catálogo do site (mesmos IDs prd_ do frontend).
# Os testes trocam para data/catalogo.json pela variável CATALOGO_IA.
CATALOG_PATH = Path(
    os.getenv("CATALOGO_IA", DATA_DIR / "catalogo_origem.json")
)


def load_catalog():
    with CATALOG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def resolve_catalog(catalog=None):
    if catalog is not None:
        return catalog
    return load_catalog()


def find_product(product_id, catalog=None):
    items = resolve_catalog(catalog)

    for product in items:
        if product["product_id"] == product_id:
            return product

    return None


def available_products(reference_product_id=None, catalog=None):
    items = resolve_catalog(catalog)

    return [
        product
        for product in items
        if product.get("available")
        and product["product_id"] != reference_product_id
    ]
