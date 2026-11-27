
import json
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

CATALOGOS = [
    "catalogo.json",
    "catalogo_origem.json"
]

CAMPOS_TEXTO = [
    "product_id",
    "name",
    "category",
    "technique",
    "region"
]


@pytest.fixture(params=CATALOGOS)
def catalogo(request):
    caminho = DATA_DIR / request.param

    with caminho.open(encoding="utf-8") as arquivo:
        return json.load(arquivo)


def test_catalogo_nao_vazio(catalogo):
    assert isinstance(catalogo, list)
    assert len(catalogo) > 0


def test_identificadores_unicos(catalogo):
    ids = [produto["product_id"] for produto in catalogo]

    assert len(ids) == len(set(ids))


def test_campos_obrigatorios(catalogo):
    campos = set(CAMPOS_TEXTO + ["available"])

    for produto in catalogo:
        assert campos.issubset(produto.keys())


def test_campos_textuais_validos(catalogo):
    for produto in catalogo:
        for campo in CAMPOS_TEXTO:
            assert isinstance(produto[campo], str)
            assert produto[campo].strip()


def test_disponibilidade_booleana(catalogo):
    for produto in catalogo:
        assert isinstance(produto["available"], bool)


def test_diversidade_categorias(catalogo):
    categorias = {produto["category"] for produto in catalogo}

    assert len(categorias) > 1


def test_diversidade_tecnicas(catalogo):
    tecnicas = {produto["technique"] for produto in catalogo}

    assert len(tecnicas) > 1


def test_diversidade_regioes(catalogo):
    regioes = {produto["region"] for produto in catalogo}

    assert len(regioes) > 1