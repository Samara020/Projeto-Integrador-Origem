import pytest

from app.catalog import available_products
from app.fallback import select_candidates
from app.recommendation import calculate_score, rank_candidates


def test_exclui_produto_de_referencia():
    candidatos = available_products("prod_001")

    ids = [produto["product_id"] for produto in candidatos]

    assert "prod_001" not in ids


def test_exclui_produtos_indisponiveis():
    candidatos = available_products("prod_001")

    ids = [produto["product_id"] for produto in candidatos]

    assert "prod_006" not in ids


def test_calcula_score_com_tres_atributos():
    contexto = {
        "category": "Cerâmica",
        "technique": "Modelagem manual",
        "region": "Caruaru",
    }

    candidato = {
        "category": "Cerâmica",
        "technique": "Modelagem manual",
        "region": "Caruaru",
    }

    score = calculate_score(contexto, candidato)

    assert score == 1.0


def test_ordena_por_score():
    contexto = {
        "category": "Cerâmica",
        "technique": "Modelagem manual",
        "region": "Caruaru",
    }

    candidatos = [
        {
            "product_id": "prod_003",
            "category": "Cerâmica",
            "technique": "Torno",
            "region": "Caruaru",
        },
        {
            "product_id": "prod_002",
            "category": "Cerâmica",
            "technique": "Modelagem manual",
            "region": "Caruaru",
        },
    ]

    resultado = rank_candidates(contexto, candidatos)

    assert resultado[0]["product_id"] == "prod_002"


def test_fallback_reduz_criterios():
    contexto = {
        "category": "Cerâmica",
        "technique": "Modelagem manual",
        "region": "Recife",
    }

    resultado = select_candidates(
        context=contexto,
        limit=5,
    )

    ids = [item["product_id"] for item in resultado]

    assert "prod_002" in ids
    assert "prod_004" in ids


def test_retorna_lista_vazia_quando_nao_ha_candidatos():
    contexto = {
        "category": "Ouro",
        "technique": "Ourivesaria",
        "region": "Fernando de Noronha",
    }

    resultado = select_candidates(
        context=contexto,
        limit=5,
    )

    assert resultado == []


@pytest.mark.parametrize(
    ("contexto", "esperados"),
    [
        ({"technique": "Modelagem manual"}, ["prod_001", "prod_002", "prod_004"]),
        ({"region": "Caruaru"}, ["prod_001", "prod_002", "prod_003"]),
        (
            {"technique": "Modelagem manual", "region": "Caruaru"},
            ["prod_001", "prod_002", "prod_004", "prod_003"],
        ),
    ],
)
def test_recomenda_por_filtros_sem_categoria(contexto, esperados):
    resultado = select_candidates(contexto, limit=20)

    assert [item["product_id"] for item in resultado] == esperados
    scores = [item["score"] for item in resultado]
    assert scores == sorted(scores, reverse=True)
    assert all("categoria" not in item["reason"] for item in resultado)


def test_filtros_sem_categoria_respeitam_limite_e_exclusao_da_referencia():
    resultado = select_candidates(
        {"technique": "Modelagem manual", "region": "Caruaru"},
        reference_product_id="prod_001",
        limit=2,
    )

    assert [item["product_id"] for item in resultado] == ["prod_002", "prod_004"]


@pytest.mark.parametrize(
    "contexto",
    [
        {},
        {"technique": "Inexistente"},
        {"region": "Inexistente"},
        {"category": "Inexistente", "region": "Caruaru"},
    ],
)
def test_nao_recomenda_pecas_sem_relacao_com_os_filtros(contexto):
    assert select_candidates(contexto) == []
