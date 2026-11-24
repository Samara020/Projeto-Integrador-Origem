import os

import pytest
import requests


# O Next usa a porta 3000, então o serviço de IA sobe na 3001.
BASE_URL = os.getenv("IA_BASE_URL", "http://localhost:3001")
API_KEY = "origem-mockup-key"


def test_recomendacoes_http():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json={
            "product_id": "prd_201",
            "limit": 5,
        },
        timeout=5,
    )

    assert response.status_code == 200

    data = response.json()
    recomendacoes = data["recommendations"]

    assert 0 < len(recomendacoes) <= 5
    assert not {"prd_206", "prd_208"}.intersection(
        item["product_id"] for item in recomendacoes
    )
    assert all(item["product_id"] != "prd_201" for item in recomendacoes)

    scores = [item["score"] for item in recomendacoes]
    assert scores == sorted(scores, reverse=True)


def test_recomendacoes_sem_autenticacao():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        json={"product_id": "prd_201", "limit": 5},
        timeout=5,
    )

    assert response.status_code == 401


def test_recomendacoes_com_chave_invalida():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": "chave-invalida"},
        json={"product_id": "prd_201", "limit": 5},
        timeout=5,
    )

    assert response.status_code == 403


def test_recomendacoes_com_limite_invalido():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json={"product_id": "prd_201", "limit": 21},
        timeout=5,
    )

    assert response.status_code == 400


def test_recomendacoes_produto_inexistente():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json={"product_id": "prd_999", "limit": 5},
        timeout=5,
    )

    assert response.status_code == 404


@pytest.mark.parametrize(
    ("filtros", "esperados", "motivo"),
    [
        (
            {"technique": "Cerâmica"},
            {"prd_201", "prd_202", "prd_205", "prd_212", "prd_213"},
            "Recomendado por mesma técnica artesanal.",
        ),
        (
            {"region": "Agreste"},
            {"prd_202", "prd_204", "prd_205", "prd_207", "prd_211"},
            "Recomendado por mesma região.",
        ),
    ],
)
def test_recomendacoes_http_por_filtro_sem_categoria(filtros, esperados, motivo):
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json=filtros,
        timeout=5,
    )

    assert response.status_code == 200
    recomendacoes = response.json()["recommendations"]
    assert {item["product_id"] for item in recomendacoes} == esperados
    assert all(item["score"] == 1.0 for item in recomendacoes)
    assert all(item["reason"] == motivo for item in recomendacoes)


def test_recomendacoes_http_com_catalogo_dinamico():
    catalogo = [
        {
            "product_id": "2001",
            "name": "Vaso Cerâmica Raízes",
            "category": "Arte e Decoração",
            "technique": "Cerâmica",
            "region": "Zona da Mata - PE",
            "available": True,
        },
        {
            "product_id": "2013",
            "name": "Santo Antônio de Barro",
            "category": "Arte e Decoração",
            "technique": "Cerâmica",
            "region": "Zona da Mata - PE",
            "available": True,
        },
        {
            "product_id": "2002",
            "name": "Luminária de Barro",
            "category": "Arte e Decoração",
            "technique": "Cerâmica",
            "region": "Agreste - PE",
            "available": True,
        },
        {
            "product_id": "2008",
            "name": "Matriz Entalhada Pavão",
            "category": "Arte e Decoração",
            "technique": "Cerâmica",
            "region": "Zona da Mata - PE",
            "available": False,
        },
    ]

    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json={
            "product_id": "2001",
            "limit": 4,
            "catalog": catalogo,
        },
        timeout=5,
    )

    assert response.status_code == 200
    recomendacoes = response.json()["recommendations"]
    assert [item["product_id"] for item in recomendacoes] == ["2013", "2002"]
    assert recomendacoes[0]["score"] == 1.0
    assert recomendacoes[1]["score"] == 0.8


def test_recomendacoes_batch_http():
    response = requests.post(
        f"{BASE_URL}/recommendations/batch",
        headers={"X-API-Key": API_KEY},
        json={"product_ids": ["prd_201", "prd_202"], "limit": 3},
        timeout=5,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_products"] == 2
    assert set(data["recommendations_by_product"].keys()) == {"prd_201", "prd_202"}
    assert 0 < len(data["recommendations_by_product"]["prd_201"]) <= 3
    assert all(
        item["product_id"] != "prd_201"
        for item in data["recommendations_by_product"]["prd_201"]
    )


def test_recomendacoes_batch_sem_autenticacao():
    response = requests.post(
        f"{BASE_URL}/recommendations/batch",
        json={"limit": 3},
        timeout=5,
    )

    assert response.status_code == 401
