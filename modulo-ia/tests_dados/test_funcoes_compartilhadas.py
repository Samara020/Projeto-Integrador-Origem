import pytest

from app import catalog
from app import recommendation
from app import repository
from app import service


@pytest.mark.parametrize(
    "contexto,candidato,esperado",
    [
        ("Cerâmica", "Cerâmica", True),
        ("CERÂMICA", "cerâmica", True),
        (" Cerâmica ", "cerâmica", True),
        ("Madeira", "Cerâmica", False),
        (None, "Cerâmica", False),
        ("Cerâmica", None, False),
        (None, None, False),
        (1, 1, True),
        (1, 2, False),
    ]
)
def test_comparacao_compartilhada(contexto, candidato, esperado):
    assert catalog.attributes_match(contexto, candidato) is esperado


def test_recomendador_reutiliza_comparacao():
    assert recommendation.attributes_match is catalog.attributes_match


@pytest.mark.parametrize(
    "produto,padrao,esperado",
    [
        ({"available": True}, False, True),
        ({"available": False}, True, False),
        ({"available": None}, True, False),
        ({"available": 1}, False, False),
        ({"available": "true"}, False, False),
        ({}, False, False),
        ({}, True, True),
    ]
)
def test_disponibilidade_compartilhada(produto, padrao, esperado):
    assert catalog.is_product_available(produto, default=padrao) is esperado


def test_recomendador_reutiliza_disponibilidade():
    assert recommendation.is_product_available is catalog.is_product_available


def test_servico_usa_funcoes_de_acesso_no_lote():
    # A rota em lote chega aos dados só pelas funções de acesso do repositório.
    assert (
        service.get_repository_available_products
        is repository.get_repository_available_products
    )
    assert (
        service.get_repository_products_by_ids
        is repository.get_repository_products_by_ids
    )


@pytest.mark.parametrize(
    "valor,esperado",
    [
        (None, None),
        ("", None),
        ("   ", None),
        (" Cerâmica ", "Cerâmica"),
    ]
)
def test_normalizacao_servico(valor, esperado):
    assert service.normalizar_texto(valor) == esperado


def test_normalizacao_servico_parametro_invalido():
    with pytest.raises(TypeError):
        service.normalizar_texto(123)


def test_catalogo_recebido_pela_requisicao(monkeypatch):
    produto = service.CatalogItem(
        product_id="p1",
        name="Produto artesanal",
        category="Cerâmica",
        technique="Torno",
        region="Agreste",
        available=True
    )

    esperado = [produto.model_dump()]

    def consultar(catalog=None):
        assert catalog == esperado
        return catalog

    monkeypatch.setattr(service, "get_catalog_items", consultar)

    assert service.resolver_catalogo_requisicao([produto]) == esperado


def test_catalogo_vazio_recebido_pela_requisicao(monkeypatch):
    def consultar(catalog=None):
        assert catalog == []
        return catalog

    monkeypatch.setattr(service, "get_catalog_items", consultar)

    assert service.resolver_catalogo_requisicao([]) == []


def test_catalogo_ausente_na_requisicao(monkeypatch):
    esperado = [{"product_id": "p1", "available": True}]

    def consultar(catalog=None):
        assert catalog is None
        return esperado

    monkeypatch.setattr(service, "get_catalog_items", consultar)

    assert service.resolver_catalogo_requisicao(None) == esperado


def test_recomendacao_lote_exclui_indisponiveis():
    referencia = {
        "product_id": "p1",
        "category": "Cerâmica",
        "technique": "Torno",
        "region": "Agreste",
        "available": True
    }

    produtos = [
        referencia,
        {**referencia, "product_id": "p2"},
        {**referencia, "product_id": "p3", "available": False},
        {**referencia, "product_id": "p4", "available": 1},
        {**referencia, "product_id": "p5", "available": "true"},
    ]

    identificador, resultado = recommendation._rank_single_reference(
        referencia,
        produtos,
        10
    )

    assert identificador == "p1"
    assert [item["product_id"] for item in resultado] == ["p2"]


def test_recomendacao_lote_preserva_disponibilidade_padrao():
    referencia = {
        "product_id": "p1",
        "category": "Cerâmica",
        "technique": "Torno",
        "region": "Agreste",
        "available": True
    }

    candidato = {
        "product_id": "p2",
        "category": "Cerâmica",
        "technique": "Torno",
        "region": "Agreste"
    }

    identificador, resultado = recommendation._rank_single_reference(
        referencia,
        [referencia, candidato],
        10
    )

    assert identificador == "p1"
    assert [item["product_id"] for item in resultado] == ["p2"]