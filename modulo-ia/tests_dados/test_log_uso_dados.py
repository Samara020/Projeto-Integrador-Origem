import json
import os
from pathlib import Path

import pytest

from app import repository
from app.data_log import chamador

import resumo_uso_dados


CATALOGO = [
    {"product_id": "p1", "name": "A", "category": "Cat", "technique": "T", "region": "R", "available": True},
    {"product_id": "p2", "name": "B", "category": "Cat", "technique": "T", "region": "R", "available": True},
    {"product_id": "p3", "name": "C", "category": "Outra", "technique": "X", "region": "Y", "available": False},
]

CAMPOS_OBRIGATORIOS = {"data_hora", "funcao", "chamador", "parametros", "registros", "status"}


def ler_linhas():
    caminho = Path(os.environ["LOG_USO_DADOS"])
    if not caminho.exists():
        return []
    return [json.loads(t) for t in caminho.read_text(encoding="utf-8").splitlines() if t.strip()]


def test_cada_chamada_grava_uma_linha_com_os_campos_minimos():
    repository.get_catalog_items(catalog=CATALOGO)
    repository.get_repository_product("p1", catalog=CATALOGO)
    repository.get_repository_available_products(catalog=CATALOGO)
    repository.get_repository_filtered_products(category="Cat", catalog=CATALOGO)
    repository.get_repository_products_by_ids(["p1", "p2"], catalog=CATALOGO)

    linhas = ler_linhas()

    assert [l["funcao"] for l in linhas] == [
        "get_catalog_items",
        "get_repository_product",
        "get_repository_available_products",
        "get_repository_filtered_products",
        "get_repository_products_by_ids",
    ]
    for linha in linhas:
        assert CAMPOS_OBRIGATORIOS <= linha.keys()
        assert linha["status"] == "sucesso"
    assert [l["registros"] for l in linhas] == [3, 1, 2, 2, 2]


def test_log_so_acrescenta_linhas():
    caminho = Path(os.environ["LOG_USO_DADOS"])
    caminho.write_text('{"linha": "anterior"}\n', encoding="utf-8")

    repository.get_repository_product("p1", catalog=CATALOGO)
    repository.get_repository_product("p2", catalog=CATALOGO)

    linhas = ler_linhas()
    assert linhas[0] == {"linha": "anterior"}
    assert len(linhas) == 3


def test_produto_inexistente_registra_erro_com_o_identificador():
    assert repository.get_repository_product("nao-existe", catalog=CATALOGO) is None

    linha = ler_linhas()[-1]
    assert linha["status"] == "erro"
    assert linha["registros"] == 0
    assert "nao-existe" in linha["erro"]


def test_filtro_sem_resultado_registra_vazio():
    assert repository.get_repository_filtered_products(category="Nenhuma", catalog=CATALOGO) == []

    linha = ler_linhas()[-1]
    assert linha["status"] == "vazio"
    assert linha["registros"] == 0


def test_busca_por_ids_registra_os_que_faltaram():
    encontrados = repository.get_repository_products_by_ids(["p2", "zzz"], catalog=CATALOGO)

    assert [p["product_id"] for p in encontrados] == ["p2"]
    linha = ler_linhas()[-1]
    assert linha["ids"] == ["p2"]
    assert "zzz" in linha["erro"]


def test_busca_por_ids_sem_nenhum_encontrado_devolve_vazio():
    assert repository.get_repository_products_by_ids(["zzz"], catalog=CATALOGO) == []
    assert ler_linhas()[-1]["status"] == "vazio"


def test_chamador_identifica_a_rota():
    with chamador("POST /recommendations"):
        repository.get_repository_product("p1", catalog=CATALOGO)
    repository.get_repository_product("p1", catalog=CATALOGO)

    linhas = ler_linhas()
    assert linhas[0]["chamador"] == "POST /recommendations"
    assert linhas[1]["chamador"] == "direto"


def test_parametros_registram_apenas_identificadores():
    repository.get_repository_product("p1", catalog=CATALOGO)

    linha = ler_linhas()[-1]
    assert linha["parametros"] == {"product_id": "p1"}
    texto = json.dumps(linha)
    assert '"name"' not in texto


def test_erro_ao_carregar_catalogo_tambem_e_registrado(tmp_path, monkeypatch):
    monkeypatch.setattr(repository, "fetch_catalog_from_db", lambda: None)
    monkeypatch.setattr(
        repository,
        "load_catalog",
        lambda: (_ for _ in ()).throw(FileNotFoundError("catalogo sumiu")),
    )

    with pytest.raises(FileNotFoundError):
        repository.get_repository_product("p1")

    linha = ler_linhas()[-1]
    assert linha["status"] == "erro"
    assert "FileNotFoundError" in linha["erro"]


def test_resumo_conta_funcoes_erros_e_produtos(tmp_path):
    repository.get_catalog_items(catalog=CATALOGO)
    repository.get_repository_product("p1", catalog=CATALOGO)
    repository.get_repository_product("p1", catalog=CATALOGO)
    repository.get_repository_product("nao-existe", catalog=CATALOGO)

    linhas = ler_linhas()
    resumo = resumo_uso_dados.resumir(linhas, ["p1", "p2", "p3"])

    assert resumo["por_funcao"]["get_repository_product"]["total"] == 3
    assert resumo["por_funcao"]["get_repository_product"]["erro"] == 1
    assert resumo["consultas"]["p1"] == 2
    assert resumo["nunca"] == ["p2", "p3"]
    assert resumo["inexistentes"]["nao-existe"] == 1
