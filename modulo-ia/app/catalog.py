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


def find_product(product_id):
    catalog = load_catalog()

    for product in catalog:
        if product["product_id"] == product_id:
            return product

    return None


def available_products(reference_product_id=None):
    catalog = load_catalog()

    return [
        product
        for product in catalog
        if product["available"]
        and product["product_id"] != reference_product_id
    ]
