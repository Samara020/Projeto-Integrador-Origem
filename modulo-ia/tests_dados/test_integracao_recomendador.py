from pathlib import Path

import pytest

from app.catalog import load_catalog
from app.repository import get_catalog_items
from app.fallback import select_candidates, select_candidates_batch
from app.recommendation import calculate_score


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@pytest.fixture(params=["catalogo.json", "catalogo_origem.json"])
def catalog(request):
    return load_catalog(DATA_DIR / request.param)


@pytest.fixture
def synthetic_catalog():
    return load_catalog(DATA_DIR / "catalogo.json")


def build_context(reference):
    return {
        "category": reference["category"],
        "technique": reference["technique"],
        "region": reference["region"]
    }


def available_references(catalog):
    return [
        item for item in catalog
        if item.get("available") is True
    ]


def validate_recommendations(recommendations, reference, catalog, limit):
    products = {
        item["product_id"]: item
        for item in catalog
        if item.get("available") is True
    }

    ids = [
        item["product_id"]
        for item in recommendations
    ]

    assert len(ids) <= limit
    assert len(ids) == len(set(ids))
    assert reference["product_id"] not in ids

    context = build_context(reference)

    for recommendation in recommendations:
        product_id = recommendation["product_id"]

        assert product_id in products
        assert 0 < recommendation["score"] <= 1
        assert recommendation["score"] == calculate_score(
            context,
            products[product_id]
        )


@pytest.mark.parametrize("limit", [1, 5, 20])
def test_fluxo_individual(catalog, limit):
    items = get_catalog_items(catalog=catalog)

    for reference in available_references(items):
        recommendations = select_candidates(
            context=build_context(reference),
            reference_product_id=reference["product_id"],
            limit=limit,
            catalog=items
        )

        validate_recommendations(
            recommendations,
            reference,
            items,
            limit
        )


@pytest.mark.parametrize("limit", [1, 5, 20])
def test_fluxo_em_lote(catalog, limit):
    items = get_catalog_items(catalog=catalog)
    references = available_references(items)

    results = select_candidates_batch(
        references=references,
        catalog=items,
        limit=limit
    )

    assert set(results) == {
        reference["product_id"]
        for reference in references
    }

    for reference in references:
        recommendations = results[reference["product_id"]]

        validate_recommendations(
            recommendations,
            reference,
            items,
            limit
        )

        scores = [
            item["score"]
            for item in recommendations
        ]

        assert scores == sorted(scores, reverse=True)


def test_lote_exclui_pontuacao_zero(synthetic_catalog):
    reference = synthetic_catalog[0]

    results = select_candidates_batch(
        references=[reference],
        catalog=synthetic_catalog,
        limit=20
    )

    recommendations = results[reference["product_id"]]

    assert [
        item["product_id"]
        for item in recommendations
    ] == ["prod_002", "prod_004", "prod_003"]

    assert [
        item["score"]
        for item in recommendations
    ] == [1.0, 0.8, 0.7]


def test_individual_e_lote_cenario_equivalente(synthetic_catalog):
    reference = synthetic_catalog[0]

    individual = select_candidates(
        context=build_context(reference),
        reference_product_id=reference["product_id"],
        limit=20,
        catalog=synthetic_catalog
    )

    batch = select_candidates_batch(
        references=[reference],
        catalog=synthetic_catalog,
        limit=20
    )

    assert individual == batch[reference["product_id"]]


def test_lote_sem_produtos_compativeis():
    reference = {
        "product_id": "p1",
        "category": "Cerâmica",
        "technique": "Torno",
        "region": "Caruaru",
        "available": True
    }

    candidate = {
        "product_id": "p2",
        "category": "Madeira",
        "technique": "Entalhe",
        "region": "Recife",
        "available": True
    }

    results = select_candidates_batch(
        references=[reference],
        catalog=[reference, candidate],
        limit=5
    )

    assert results == {"p1": []}


def test_lote_com_catalogo_vazio():
    reference = {
        "product_id": "p1",
        "category": "Cerâmica",
        "technique": "Torno",
        "region": "Caruaru",
        "available": True
    }

    results = select_candidates_batch(
        references=[reference],
        catalog=[],
        limit=5
    )

    assert results == {"p1": []}


def test_lote_sem_referencias(synthetic_catalog):
    results = select_candidates_batch(
        references=[],
        catalog=synthetic_catalog,
        limit=5
    )

    assert results == {}