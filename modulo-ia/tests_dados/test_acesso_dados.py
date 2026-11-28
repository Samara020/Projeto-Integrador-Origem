import json
import pytest

from app.catalog import (
    validate_catalog,
    normalize_filter,
    load_catalog,
    resolve_catalog,
    find_product,
    available_products,
    filter_products
)


@pytest.fixture
def catalogo():
    return [
        {
            "product_id": "p1",
            "name": "Vaso artesanal",
            "category": "Cerâmica",
            "technique": "Torno",
            "region": "Agreste",
            "available": True
        },
        {
            "product_id": "p2",
            "name": "Peça de madeira",
            "category": "Madeira",
            "technique": "Entalhe",
            "region": "Recife",
            "available": True
        },
        {
            "product_id": "p3",
            "name": "Vaso indisponível",
            "category": "Cerâmica",
            "technique": "Torno",
            "region": "Agreste",
            "available": False
        },
        {
            "product_id": "p4",
            "name": "Peça modelada",
            "category": "Cerâmica",
            "technique": "Modelagem manual",
            "region": "Zona da Mata",
            "available": True
        }
    ]


def test_validar_catalogo_valido(catalogo):
    assert validate_catalog(catalogo) == catalogo


def test_validar_catalogo_vazio():
    assert validate_catalog([]) == []


@pytest.mark.parametrize("valor", [None, {}, "catalogo", 123])
def test_validar_catalogo_com_tipo_invalido(valor):
    with pytest.raises(TypeError):
        validate_catalog(valor)


@pytest.mark.parametrize("produto", [None, "produto", 123])
def test_validar_registro_com_tipo_invalido(produto):
    with pytest.raises(TypeError):
        validate_catalog([produto])


@pytest.mark.parametrize(
    "produto",
    [
        {},
        {"product_id": None},
        {"product_id": ""},
        {"product_id": "   "},
        {"product_id": 123}
    ]
)
def test_validar_identificador_invalido(produto):
    with pytest.raises(ValueError):
        validate_catalog([produto])


@pytest.mark.parametrize(
    "valor,esperado",
    [
        (None, None),
        ("", None),
        ("   ", None),
        (" Cerâmica ", "Cerâmica")
    ]
)
def test_normalizar_filtros(valor, esperado):
    assert normalize_filter(valor) == esperado


@pytest.mark.parametrize("valor", [123, True, [], {}])
def test_normalizar_filtro_invalido(valor):
    with pytest.raises(TypeError):
        normalize_filter(valor)


def test_carregar_catalogo_json(tmp_path, catalogo):
    arquivo = tmp_path / "catalogo.json"
    arquivo.write_text(
        json.dumps(catalogo),
        encoding="utf-8"
    )

    assert load_catalog(arquivo) == catalogo


def test_carregar_catalogo_vazio(tmp_path):
    arquivo = tmp_path / "catalogo.json"
    arquivo.write_text("[]", encoding="utf-8")

    assert load_catalog(arquivo) == []


def test_carregar_catalogo_inexistente(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_catalog(tmp_path / "inexistente.json")


def test_carregar_json_invalido(tmp_path):
    arquivo = tmp_path / "catalogo.json"
    arquivo.write_text("{", encoding="utf-8")

    with pytest.raises(ValueError):
        load_catalog(arquivo)


def test_carregar_catalogo_com_estrutura_invalida(tmp_path):
    arquivo = tmp_path / "catalogo.json"
    arquivo.write_text("{}", encoding="utf-8")

    with pytest.raises(TypeError):
        load_catalog(arquivo)


def test_resolver_catalogo_informado(catalogo):
    assert resolve_catalog(catalogo) == catalogo


def test_resolver_catalogo_vazio():
    assert resolve_catalog([]) == []


def test_resolver_catalogo_invalido():
    with pytest.raises(TypeError):
        resolve_catalog({})


def test_resolver_catalogo_padrao(monkeypatch, catalogo):
    monkeypatch.setattr(
        "app.catalog.load_catalog",
        lambda: catalogo
    )

    assert resolve_catalog() == catalogo


def test_buscar_produto_existente(catalogo):
    resultado = find_product("p1", catalogo)
    assert resultado["product_id"] == "p1"


def test_buscar_produto_inexistente(catalogo):
    assert find_product("p999", catalogo) is None


def test_buscar_produto_com_espacos(catalogo):
    resultado = find_product(" p1 ", catalogo)
    assert resultado["product_id"] == "p1"


def test_buscar_produto_em_catalogo_vazio():
    assert find_product("p1", []) is None


@pytest.mark.parametrize("valor", [None, "", "   "])
def test_buscar_produto_sem_identificador(catalogo, valor):
    assert find_product(valor, catalogo) is None


def test_buscar_produto_com_identificador_invalido(catalogo):
    with pytest.raises(TypeError):
        find_product(123, catalogo)


def test_consultar_produtos_disponiveis(catalogo):
    resultado = available_products(catalog=catalogo)

    assert [item["product_id"] for item in resultado] == [
        "p1", "p2", "p4"
    ]


def test_excluir_produto_de_referencia(catalogo):
    resultado = available_products(
        reference_product_id="p1",
        catalog=catalogo
    )

    assert [item["product_id"] for item in resultado] == [
        "p2", "p4"
    ]


def test_disponibilidade_estritamente_booleana():
    catalogo = [
        {"product_id": "p1", "available": True},
        {"product_id": "p2", "available": False},
        {"product_id": "p3", "available": "true"},
        {"product_id": "p4", "available": 1},
        {"product_id": "p5"}
    ]

    resultado = available_products(catalog=catalogo)

    assert [item["product_id"] for item in resultado] == ["p1"]


def test_consultar_catalogo_vazio():
    assert available_products(catalog=[]) == []


def test_consultar_catalogo_indisponivel(catalogo):
    itens = [
        dict(item, available=False)
        for item in catalogo
    ]

    assert available_products(catalog=itens) == []


@pytest.mark.parametrize(
    "filtros,esperados",
    [
        ({"category": "Cerâmica"}, ["p1", "p4"]),
        ({"technique": "Entalhe"}, ["p2"]),
        ({"region": "Agreste"}, ["p1"]),
        (
            {
                "category": "Cerâmica",
                "technique": "Torno",
                "region": "Agreste"
            },
            ["p1"]
        ),
        ({"category": " CERÂMICA "}, ["p1", "p4"]),
        ({"category": "Inexistente"}, []),
        ({"category": "Cerâmica", "region": "Recife"}, []),
        ({"category": "   "}, ["p1", "p2", "p4"]),
        ({}, ["p1", "p2", "p4"])
    ]
)
def test_filtrar_produtos(catalogo, filtros, esperados):
    resultado = filter_products(
        catalog=catalogo,
        **filtros
    )

    assert [item["product_id"] for item in resultado] == esperados


@pytest.mark.parametrize(
    "filtros",
    [
        {"category": 123},
        {"technique": True},
        {"region": []},
        {"reference_product_id": {}}
    ]
)
def test_filtrar_com_parametros_invalidos(catalogo, filtros):
    with pytest.raises(TypeError):
        filter_products(catalog=catalogo, **filtros)


def test_filtrar_catalogo_vazio():
    assert filter_products(
        category="Cerâmica",
        catalog=[]
    ) == []


def test_filtrar_excluindo_produto_de_referencia(catalogo):
    resultado = filter_products(
        category="Cerâmica",
        reference_product_id="p1",
        catalog=catalogo
    )

    assert [item["product_id"] for item in resultado] == ["p4"]


def test_filtrar_produto_com_atributo_ausente():
    catalogo = [
        {"product_id": "p1", "available": True}
    ]

    assert filter_products(
        category="Cerâmica",
        catalog=catalogo
    ) == []