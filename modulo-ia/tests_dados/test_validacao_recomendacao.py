
import json
from pathlib import Path

import pytest

from app.fallback import select_candidates

DATA_DIR = Path(__file__).resolve().parent / "../data"


def carregar_catalogo(nome):
    with (DATA_DIR / nome).open(encoding="utf-8") as arquivo:
        return json.load(arquivo)


@pytest.mark.parametrize(
    "arquivo,contexto,esperados",
    [
        (
            "catalogo.json",
            {"category": "Madeira"},
            {"prod_005", "prod_007"}
        ),
        (
            "catalogo.json",
            {"technique": "Bordado"},
            {"prod_008"}
        ),
        (
            "catalogo.json",
            {"region": "Caruaru"},
            {"prod_001", "prod_002", "prod_003"}
        ),
        (
            "catalogo_origem.json",
            {"category": "Literatura"},
            {"prd_209", "prd_210"}
        ),
        (
            "catalogo_origem.json",
            {"technique": "Bordado"},
            {"prd_204", "prd_211"}
        ),
        (
            "catalogo_origem.json",
            {"region": "Sertão do São Francisco"},
            {"prd_203", "prd_214"}
        ),
        (
            "catalogo_origem.json",
            {"technique": "Xilogravura"},
            {"prd_207"}
        ),
        (
            "catalogo_origem.json",
            {
                "category": "Literatura",
                "technique": "Cordel",
                "region": "Sertão do Pajeú"
            },
            {"prd_209", "prd_210"}
        )
    ]
)
def test_recomendacao_por_atributos(arquivo, contexto, esperados):
    catalogo = carregar_catalogo(arquivo)

    resultado = select_candidates(
        context=contexto,
        limit=100,
        catalog=catalogo
    )

    ids = [produto["product_id"] for produto in resultado]

    assert set(ids) == esperados
    assert len(ids) == len(esperados)


@pytest.mark.parametrize(
    "arquivo",
    ["catalogo.json", "catalogo_origem.json"]
)
@pytest.mark.parametrize(
    "contexto",
    [
        {"category": "Categoria inexistente"},
        {"technique": "Técnica inexistente"},
        {"region": "Região inexistente"},
        {
            "category": "Categoria inexistente",
            "technique": "Técnica inexistente",
            "region": "Região inexistente"
        },
        {}
    ]
)
def test_sem_produtos_compativeis(arquivo, contexto):
    catalogo = carregar_catalogo(arquivo)

    resultado = select_candidates(
        context=contexto,
        limit=5,
        catalog=catalogo
    )

    assert resultado == []


def test_catalogo_vazio():
    resultado = select_candidates(
        context={"category": "Artesanato"},
        catalog=[]
    )

    assert resultado == []


def test_catalogo_com_todos_produtos_indisponiveis():
    catalogo = carregar_catalogo("catalogo_origem.json")

    catalogo = [
        dict(produto, available=False)
        for produto in catalogo
    ]

    resultado = select_candidates(
        context={"category": "Artesanato"},
        catalog=catalogo
    )

    assert resultado == []