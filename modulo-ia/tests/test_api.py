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
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data["recommendations"]) <= 5
    assert all(
        item["product_id"] != "prd_201"
        for item in data["recommendations"]
    )

    scores = [
        item["score"]
        for item in data["recommendations"]
    ]

    assert scores == sorted(scores, reverse=True)


def test_recomendacoes_sem_autenticacao():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        json={"product_id": "prd_201", "limit": 5},
    )

    assert response.status_code == 401


def test_recomendacoes_com_chave_invalida():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": "chave-invalida"},
        json={"product_id": "prd_201", "limit": 5},
    )

    assert response.status_code == 403


def test_recomendacoes_com_limite_invalido():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json={"product_id": "prd_201", "limit": 21},
    )

    assert response.status_code == 400


def test_recomendacoes_produto_inexistente():
    response = requests.post(
        f"{BASE_URL}/recommendations",
        headers={"X-API-Key": API_KEY},
        json={"product_id": "prd_999", "limit": 5},
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
