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