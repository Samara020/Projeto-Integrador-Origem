from app.catalog import available_products
from app.fallback import select_candidates
from app.recommendation import calculate_score, rank_candidates


def test_exclui_produto_de_referencia():
    candidatos = available_products("prd_201")
    ids = [produto["product_id"] for produto in candidatos]
    assert "prd_201" not in ids


def test_exclui_produtos_indisponiveis():
    candidatos = available_products("prd_201")
    ids = [produto["product_id"] for produto in candidatos]
    assert "prd_206" not in ids
    assert "prd_208" not in ids


def test_calcula_score_com_tres_atributos():
    contexto = {
        "category": "arte-e-decoracao",
        "technique": "ceramica",
        "region": "zona-da-mata",
    }
    candidato = {
        "category": "arte-e-decoracao",
        "technique": "ceramica",
        "region": "zona-da-mata",
    }
    assert calculate_score(contexto, candidato) == 1.0


def test_ordena_por_score():
    contexto = {
        "category": "arte-e-decoracao",
        "technique": "ceramica",
        "region": "zona-da-mata",
    }
    candidatos = [
        {
            "product_id": "prd_202",
            "category": "arte-e-decoracao",
            "technique": "ceramica",
            "region": "agreste",
        },
        {
            "product_id": "prd_213",
            "category": "arte-e-decoracao",
            "technique": "ceramica",
            "region": "zona-da-mata",
        },
    ]
    resultado = rank_candidates(contexto, candidatos)
    assert resultado[0]["product_id"] == "prd_213"


def test_fallback_reduz_criterios():
    contexto = {
        "category": "arte-e-decoracao",
        "technique": "xilogravura",
        "region": "zona-da-mata",
    }
    resultado = select_candidates(context=contexto, limit=5)
    ids = [item["product_id"] for item in resultado]
    assert "prd_201" in ids
    assert "prd_213" in ids


def test_retorna_lista_vazia_quando_nao_ha_candidatos():
    contexto = {
        "category": "categoria-inexistente",
        "technique": "tecnica-inexistente",
        "region": "regiao-inexistente",
    }
    resultado = select_candidates(context=contexto, limit=5)
    assert resultado == []
