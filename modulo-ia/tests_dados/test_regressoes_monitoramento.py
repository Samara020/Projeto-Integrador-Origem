"""Regressões dos contratos de acesso e do monitoramento, sem banco real."""
import json
import math
import os
import time
from pathlib import Path

import psycopg
import pytest

from app import repository
import resumo_uso_dados


CATALOGO = [
    {"product_id": "p1", "name": "A", "category": "Cat", "technique": "T", "region": "R", "available": True},
    {"product_id": "p2", "name": "B", "category": "Cat", "technique": "T", "region": "R", "available": True},
]


def linhas_do_log():
    arquivo = Path(os.environ["LOG_USO_DADOS"])
    return [json.loads(linha) for linha in arquivo.read_text(encoding="utf-8").splitlines()]


@pytest.mark.parametrize("ids", ["p1", "", {"p1": True}, {}, 42, 0, True, False, [42], ["p1", 42], [None], ["p1", None]])
def test_ids_invalidos_sao_rejeitados_e_registrados(ids):
    with pytest.raises(TypeError):
        repository.get_repository_products_by_ids(ids, catalog=CATALOGO, use_db=False)

    eventos = linhas_do_log()
    erros = [evento for evento in eventos if evento.get("status") == "erro"]
    assert len(erros) == 1
    assert erros[0]["funcao"] == "get_repository_products_by_ids"
    assert erros[0]["registros"] == 0
    assert "TypeError" in erros[0]["erro"]


def test_ids_validos_normalizam_deduplicam_e_preservam_ordem():
    produtos = repository.get_repository_products_by_ids(
        ("p2", "p1", "p1", " p2 "), catalog=CATALOGO, use_db=False,
    )
    assert [produto["product_id"] for produto in produtos] == ["p2", "p1"]
    assert linhas_do_log()[-1]["ids"] == ["p2", "p1"]


@pytest.mark.parametrize("ids", [None, []])
def test_busca_sem_ids_continua_vazia(ids):
    assert repository.get_repository_products_by_ids(ids, catalog=CATALOGO, use_db=False) == []
    assert linhas_do_log()[-1]["status"] == "vazio"


def test_duracao_da_consulta_inclui_o_carregamento(monkeypatch):
    def carregar():
        time.sleep(0.02)
        return CATALOGO

    monkeypatch.setattr(repository, "load_catalog", carregar)
    assert repository.get_catalog_items(use_db=False) == CATALOGO
    duracao = linhas_do_log()[-1]["duracao_ms"]
    assert math.isfinite(duracao)
    assert duracao >= 15


def test_fallback_pg_preserva_catalogo_e_registra_falha_sem_credenciais(monkeypatch):
    dsn = "postgresql://usuario_secreto:senha_secreta@127.0.0.1:1/base_teste"
    monkeypatch.setenv("DATABASE_URL", dsn)
    chamadas = []

    def falhar(*args, **kwargs):
        chamadas.append(1)
        raise psycopg.OperationalError(f"falha simulada {dsn}")

    monkeypatch.setattr(psycopg, "connect", falhar)
    monkeypatch.setattr(repository, "load_catalog", lambda: CATALOGO)
    assert repository.get_catalog_items() == CATALOGO
    assert chamadas == [1]
    eventos = linhas_do_log()
    assert any(evento.get("status") == "erro" for evento in eventos)
    assert any(evento.get("fonte") == "json" and evento.get("status") == "sucesso" for evento in eventos)
    texto = json.dumps(eventos, ensure_ascii=False)
    for segredo in (dsn, "usuario_secreto", "senha_secreta", "postgresql://"):
        assert segredo not in texto


def test_resumo_mantem_contagem_de_logs_antigos():
    antigos = [
        {"funcao": "get_catalog_items", "chamador": "direto", "status": "sucesso", "registros": 2},
        {"funcao": "get_repository_product", "chamador": "POST /recommendations", "status": "sucesso", "registros": 1, "ids": ["p1"]},
        {"funcao": "get_repository_product", "chamador": "POST /recommendations", "status": "erro", "registros": 0, "erro": "produto nao encontrado: ausente"},
    ]
    resumo = resumo_uso_dados.resumir(antigos, ["p1", "p2"])
    assert resumo["por_funcao"]["get_repository_product"]["total"] == 2
    assert resumo["por_funcao"]["get_repository_product"]["erro"] == 1
    assert resumo["consultas"]["p1"] == 1
    assert resumo["nunca"] == ["p2"]
    assert resumo["inexistentes"]["ausente"] == 1


def test_resumo_sem_eventos_nao_inventa_execucoes():
    resumo = resumo_uso_dados.resumir([], ["p1", "p2"])
    assert resumo["execucoes"]["requisicoes"] == 0
    assert resumo["execucoes"]["vazias"] == 0
    assert resumo["execucoes"]["sugestoes"] == 0
    assert resumo["nunca"] == ["p1", "p2"]
    assert resumo["execucoes"]["latencia_ms"] is None
    assert resumo["execucoes"]["latencia_consultas_ms"] is None


def test_resumo_separa_requisicoes_acessos_e_calcula_latencias():
    acessos = [
        {"funcao": "get_catalog_items", "status": "sucesso", "registros": 2, "duracao_ms": 5},
        {"funcao": "get_repository_product", "status": "sucesso", "registros": 1, "duracao_ms": 15},
        # Linha antiga, sem duração: não pode inventar amostra zero.
        {"funcao": "get_repository_product", "status": "sucesso", "registros": 1},
    ]
    execucoes = [
        {"evento": "modulo_ia_execucao", "rota": "/recommendations/batch",
         "status": "erro" if n == 20 else "sucesso",
         "resultado": "erro" if n == 20 else ("vazio" if n == 1 else "com_sugestoes"),
         "elapsed_ms": n, "total_resultados": 999, "total_sugestoes": 0 if n in (1, 20) else 1}
        for n in range(1, 21)
    ]
    resumo = resumo_uso_dados.resumir(acessos + execucoes, ["p1", "p2"])
    indicadores = resumo["execucoes"]
    assert indicadores["requisicoes"] == 20
    assert indicadores["sucesso"] == 19
    assert indicadores["erro"] == 1
    assert indicadores["vazias"] == 1
    assert indicadores["sugestoes"] == 18
    assert sum(c["total"] for c in resumo["por_funcao"].values()) == 3
    assert indicadores["latencia_ms"] == {"amostras": 20, "media": 10.5, "p95": 19, "max": 20}
    assert indicadores["latencia_consultas_ms"] == {"amostras": 2, "media": 10, "p95": 15, "max": 15}
