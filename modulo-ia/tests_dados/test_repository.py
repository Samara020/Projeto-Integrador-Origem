from unittest.mock import MagicMock

import psycopg
import pytest

from app import repository


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
            "name": "Escultura",
            "category": "Madeira",
            "technique": "Entalhe",
            "region": "Recife",
            "available": True
        },
        {
            "product_id": "p3",
            "name": "Prato artesanal",
            "category": "Cerâmica",
            "technique": "Torno",
            "region": "Agreste",
            "available": False
        }
    ]


@pytest.fixture
def ambiente_limpo(monkeypatch):
    variaveis = [
        "DATABASE_URL",
        "POSTGRES_HOST",
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_PORT",
        "DB_HOST",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
        "DB_PORT"
    ]

    for variavel in variaveis:
        monkeypatch.delenv(variavel, raising=False)


def test_dsn_sem_configuracao(ambiente_limpo):
    assert repository._build_db_dsn() is None


def test_dsn_prioriza_database_url(
    ambiente_limpo,
    monkeypatch
):
    url = "postgresql://usuario:senha@localhost:5432/origem"

    monkeypatch.setenv("DATABASE_URL", url)
    monkeypatch.setenv("POSTGRES_HOST", "outro-host")

    assert repository._build_db_dsn() == url


@pytest.mark.parametrize("prefixo", ["POSTGRES", "DB"])
def test_dsn_por_variaveis(
    ambiente_limpo,
    monkeypatch,
    prefixo
):
    monkeypatch.setenv(f"{prefixo}_HOST", "localhost")
    monkeypatch.setenv(f"{prefixo}_USER", "usuario")
    monkeypatch.setenv(f"{prefixo}_PASSWORD", "senha")
    monkeypatch.setenv(f"{prefixo}_PORT", "5433")

    nome_variavel = (
        "POSTGRES_DB"
        if prefixo == "POSTGRES"
        else "DB_NAME"
    )

    monkeypatch.setenv(nome_variavel, "origem")

    assert repository._build_db_dsn() == (
        "postgresql://usuario:senha@localhost:5433/origem"
    )


def test_dsn_codifica_credenciais(
    ambiente_limpo,
    monkeypatch
):
    monkeypatch.setenv("POSTGRES_HOST", "localhost")
    monkeypatch.setenv("POSTGRES_DB", "origem")
    monkeypatch.setenv("POSTGRES_USER", "usuario@teste")
    monkeypatch.setenv("POSTGRES_PASSWORD", "senha@123")

    assert repository._build_db_dsn() == (
        "postgresql://usuario%40teste:senha%40123"
        "@localhost:5432/origem"
    )


def test_normalizar_registro():
    registro = {
        "product_id": 123,
        "name": "Vaso",
        "category": " Cerâmica ",
        "technique": " Torno ",
        "region": " Agreste ",
        "available": True
    }

    resultado = repository._normalize_row(registro)

    assert resultado == {
        "product_id": "123",
        "name": "Vaso",
        "category": "Cerâmica",
        "technique": "Torno",
        "region": "Agreste",
        "available": True
    }


@pytest.mark.parametrize(
    "valor",
    [False, None, 0, 1, "true", "false"]
)
def test_normalizar_disponibilidade(valor):
    resultado = repository._normalize_row({
        "product_id": "p1",
        "available": valor
    })

    assert resultado["available"] is False


def test_catalogo_explicito_prioritario(
    catalogo,
    monkeypatch
):
    banco = MagicMock()
    json_local = MagicMock()

    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        banco
    )

    monkeypatch.setattr(
        repository,
        "load_catalog",
        json_local
    )

    assert repository.get_catalog_items(
        catalog=catalogo
    ) == catalogo

    banco.assert_not_called()
    json_local.assert_not_called()


def test_catalogo_explicito_vazio(monkeypatch):
    banco = MagicMock()
    json_local = MagicMock()

    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        banco
    )

    monkeypatch.setattr(
        repository,
        "load_catalog",
        json_local
    )

    assert repository.get_catalog_items(catalog=[]) == []

    banco.assert_not_called()
    json_local.assert_not_called()


def test_catalogo_explicito_invalido():
    with pytest.raises(TypeError):
        repository.get_catalog_items(catalog={})


def test_catalogo_do_banco(catalogo, monkeypatch):
    banco = MagicMock(return_value=catalogo)
    json_local = MagicMock()

    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        banco
    )

    monkeypatch.setattr(
        repository,
        "load_catalog",
        json_local
    )

    assert repository.get_catalog_items() == catalogo

    banco.assert_called_once()
    json_local.assert_not_called()


def test_banco_vazio_sem_fallback(monkeypatch):
    banco = MagicMock(return_value=[])
    json_local = MagicMock()

    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        banco
    )

    monkeypatch.setattr(
        repository,
        "load_catalog",
        json_local
    )

    assert repository.get_catalog_items() == []

    banco.assert_called_once()
    json_local.assert_not_called()


def test_banco_invalido(monkeypatch):
    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        lambda: {}
    )

    with pytest.raises(TypeError):
        repository.get_catalog_items()


def test_fallback_para_json(catalogo, monkeypatch):
    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        lambda: None
    )

    monkeypatch.setattr(
        repository,
        "load_catalog",
        lambda: catalogo
    )

    assert repository.get_catalog_items() == catalogo


def test_consulta_com_banco_desativado(
    catalogo,
    monkeypatch
):
    banco = MagicMock()

    monkeypatch.setattr(
        repository,
        "fetch_catalog_from_db",
        banco
    )

    monkeypatch.setattr(
        repository,
        "load_catalog",
        lambda: catalogo
    )

    assert repository.get_catalog_items(
        use_db=False
    ) == catalogo

    banco.assert_not_called()


@pytest.mark.parametrize(
    "valor",
    [None, 1, "true", [], {}]
)
def test_use_db_invalido(valor):
    with pytest.raises(TypeError):
        repository.get_catalog_items(use_db=valor)


def test_buscar_produto(catalogo):
    resultado = repository.get_repository_product(
        "p1",
        catalog=catalogo
    )

    assert resultado == catalogo[0]


def test_buscar_produto_inexistente(catalogo):
    assert repository.get_repository_product(
        "inexistente",
        catalog=catalogo
    ) is None


def test_buscar_produto_identificador_invalido(catalogo):
    with pytest.raises(TypeError):
        repository.get_repository_product(
            123,
            catalog=catalogo
        )


def test_consultar_disponiveis(catalogo):
    resultado = repository.get_repository_available_products(
        catalog=catalogo
    )

    assert [item["product_id"] for item in resultado] == [
        "p1",
        "p2"
    ]


def test_excluir_referencia(catalogo):
    resultado = repository.get_repository_available_products(
        reference_product_id="p1",
        catalog=catalogo
    )

    assert [item["product_id"] for item in resultado] == [
        "p2"
    ]


def test_filtrar_categoria(catalogo):
    resultado = repository.get_repository_filtered_products(
        category="cerâmica",
        catalog=catalogo
    )

    assert [item["product_id"] for item in resultado] == [
        "p1"
    ]


def test_filtrar_atributos_combinados(catalogo):
    resultado = repository.get_repository_filtered_products(
        category="Cerâmica",
        technique="Torno",
        region="Agreste",
        catalog=catalogo
    )

    assert [item["product_id"] for item in resultado] == [
        "p1"
    ]


def test_filtrar_sem_resultados(catalogo):
    assert repository.get_repository_filtered_products(
        category="Inexistente",
        catalog=catalogo
    ) == []


def test_filtrar_catalogo_vazio():
    assert repository.get_repository_filtered_products(
        catalog=[]
    ) == []


def test_filtrar_parametro_invalido(catalogo):
    with pytest.raises(TypeError):
        repository.get_repository_filtered_products(
            category=123,
            catalog=catalogo
        )


def test_consulta_banco_sem_configuracao(
    ambiente_limpo,
    monkeypatch
):
    conectar = MagicMock()

    monkeypatch.setattr(psycopg, "connect", conectar)

    assert repository.fetch_catalog_from_db() is None

    conectar.assert_not_called()


def test_consulta_banco_com_sucesso(
    catalogo,
    monkeypatch
):
    conectar = MagicMock()

    conexao = conectar.return_value.__enter__.return_value
    cursor = conexao.cursor.return_value.__enter__.return_value

    cursor.fetchall.return_value = catalogo

    monkeypatch.setattr(psycopg, "connect", conectar)

    resultado = repository.fetch_catalog_from_db(
        dsn="postgresql://teste"
    )

    assert resultado == catalogo

    cursor.execute.assert_called_once()

    consulta = cursor.execute.call_args.args[0]

    assert "public.vw_catalogo_recomendacao_ia" in consulta


def test_consulta_banco_sem_registros(monkeypatch):
    conectar = MagicMock()

    conexao = conectar.return_value.__enter__.return_value
    cursor = conexao.cursor.return_value.__enter__.return_value

    cursor.fetchall.return_value = []

    monkeypatch.setattr(psycopg, "connect", conectar)

    assert repository.fetch_catalog_from_db(
        dsn="postgresql://teste"
    ) == []


def test_consulta_banco_indisponivel(monkeypatch):
    conectar = MagicMock(
        side_effect=psycopg.OperationalError(
            "Banco indisponível"
        )
    )

    monkeypatch.setattr(psycopg, "connect", conectar)

    assert repository.fetch_catalog_from_db(
        dsn="postgresql://teste"
    ) is None


def test_consulta_banco_registro_invalido(monkeypatch):
    conectar = MagicMock()

    conexao = conectar.return_value.__enter__.return_value
    cursor = conexao.cursor.return_value.__enter__.return_value

    cursor.fetchall.return_value = [
        {"product_id": None}
    ]

    monkeypatch.setattr(psycopg, "connect", conectar)

    with pytest.raises(ValueError):
        repository.fetch_catalog_from_db(
            dsn="postgresql://teste"
        )