import json
from pathlib import Path


CATALOG_PATH = Path(__file__).resolve().parent.parent / "data" / "catalogo.json"


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
