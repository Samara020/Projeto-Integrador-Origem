import requests


BASE_URL = "http://localhost:3001"
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

    assert len(recomendacoes) <= 5
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