"""Requisitos de logs observados por chamadas HTTP reais ao serviço isolado."""
import json
import math
from datetime import datetime

import pytest
import requests

import resumo_uso_dados


CATALOGO = [
    {"product_id": "p1", "name": "Referência", "category": "Cat", "technique": "T", "region": "R", "available": True},
    {"product_id": "p2", "name": "Mesmo contexto", "category": "Cat", "technique": "T", "region": "R", "available": True},
    {"product_id": "p3", "name": "Outra região", "category": "Cat", "technique": "T", "region": "S", "available": True},
    {"product_id": "p4", "name": "Sem semelhante", "category": "Outra", "technique": "X", "region": "Z", "available": True},
    {"product_id": "p5", "name": "Indisponível", "category": "Cat", "technique": "T", "region": "R", "available": False},
    {"product_id": "p6", "name": "Outra técnica", "category": "Cat", "technique": "Y", "region": "R", "available": True},
]


def ler_eventos(caminho):
    if not caminho.exists():
        return []
    eventos = []
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        try:
            evento = json.loads(linha)
        except ValueError:
            continue
        if isinstance(evento, dict):
            eventos.append(evento)
    return eventos


def chamar(servidor, rota, payload):
    antes = len(ler_eventos(servidor["uso"]))
    antes_stdout = len(ler_eventos(servidor["execucao"]))
    resposta = requests.post(
        servidor["url"] + rota, headers={"X-API-Key": "origem-mockup-key"},
        json=payload, timeout=5,
    )
    eventos = ler_eventos(servidor["uso"])[antes:]
    conclusoes = [evento for evento in eventos if evento.get("evento") == "modulo_ia_execucao"]
    assert len(conclusoes) == 1, eventos
    evento = conclusoes[0]
    stdout = ler_eventos(servidor["execucao"])[antes_stdout:]
    assert any(
        item.get("execucao_id") == evento["execucao_id"]
        and item.get("rota") == rota
        and item.get("status") == evento["status"]
        and item.get("total_sugestoes") == evento.get("total_sugestoes")
        for item in stdout
    )
    assert math.isfinite(evento["elapsed_ms"]) and evento["elapsed_ms"] >= 0
    assert datetime.fromisoformat(evento["data_hora"]).utcoffset() is not None
    return resposta, evento, eventos


@pytest.mark.parametrize("filtros", [
    {"category": "Cat"}, {"technique": "T"}, {"region": "R"},
    {"category": "Cat", "technique": "T", "region": "R"},
])
def test_filtros_http_aparecem_no_evento(iniciar_servidor_bentoml, filtros):
    resposta, evento, _ = chamar(iniciar_servidor_bentoml, "/recommendations", dict(catalog=CATALOGO, **filtros))
    assert resposta.status_code == 200
    for campo, valor in filtros.items():
        assert evento["filtros"][campo] == valor
    assert evento["total_sugestoes"] == len(resposta.json()["recommendations"])


def test_contexto_efetivo_da_referencia_e_contadores(iniciar_servidor_bentoml):
    resposta, evento, _ = chamar(
        iniciar_servidor_bentoml, "/recommendations",
        dict(product_id=" p1 ", catalog=CATALOGO, limit=5),
    )
    assert resposta.status_code == 200
    assert [item["product_id"] for item in resposta.json()["recommendations"]] == ["p2", "p3", "p6"]
    contexto = {"category": "Cat", "technique": "T", "region": "R"}
    assert evento["contexto_referencia"] == contexto
    for campo, valor in contexto.items():
        assert evento["filtros"][campo] == valor
    assert evento["total_catalogo"] == 6
    assert evento["total_candidatos"] == 4
    assert evento["total_analisados"] == 4
    assert evento["total_sugestoes"] == 3
    assert evento["fonte_catalogo"] == "payload"


def test_batch_distingue_referencias_de_sugestoes(iniciar_servidor_bentoml):
    resposta, evento, eventos = chamar(
        iniciar_servidor_bentoml, "/recommendations/batch",
        dict(product_ids=["p1", "p4"], catalog=CATALOGO, limit=5),
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["total_products"] == 2
    assert corpo["recommendations_by_product"]["p4"] == []
    total = sum(len(itens) for itens in corpo["recommendations_by_product"].values())
    assert total == 3
    assert evento["total_referencias"] == 2
    assert evento["total_sugestoes"] == total
    resumo = resumo_uso_dados.resumir(eventos, [item["product_id"] for item in CATALOGO])
    assert resumo["execucoes"]["requisicoes"] == 1
    assert resumo["execucoes"]["sugestoes"] == total


@pytest.mark.parametrize("criterios", [{"product_id": "p4"}, {"category": "Inexistente"}])
def test_recomendacao_vazia_chega_ao_resumo(iniciar_servidor_bentoml, criterios):
    resposta, evento, eventos = chamar(
        iniciar_servidor_bentoml, "/recommendations", dict(catalog=CATALOGO, **criterios),
    )
    assert resposta.status_code == 200
    assert resposta.json() == {"recommendations": []}
    assert evento["resultado"] == "vazio"
    assert evento["total_sugestoes"] == 0
    resumo = resumo_uso_dados.resumir(eventos, [item["product_id"] for item in CATALOGO])
    assert resumo["execucoes"]["requisicoes"] == 1
    assert resumo["execucoes"]["vazias"] == 1
    assert resumo["execucoes"]["sugestoes"] == 0


def test_produto_inexistente_mantem_404_e_registra_execucao(iniciar_servidor_bentoml):
    resposta, evento, _ = chamar(
        iniciar_servidor_bentoml, "/recommendations", {"product_id": "ausente", "catalog": CATALOGO},
    )
    assert resposta.status_code == 404
    assert resposta.json()["error"]["code"] == "PRODUCT_NOT_FOUND"
    assert evento["status"] == "erro"
    assert evento["resultado"] == "erro"
    assert evento["codigo_erro"] == "PRODUCT_NOT_FOUND"


@pytest.fixture(scope="module")
def servidor_json_invalido(servidor_ia):
    return servidor_ia(falha="json")


@pytest.fixture(scope="module")
def servidor_pg_indisponivel(servidor_ia):
    return servidor_ia(falha="postgres")


def test_catalogo_json_invalido_fecha_evento_de_erro(servidor_json_invalido):
    resposta, evento, eventos = chamar(servidor_json_invalido, "/recommendations", {"product_id": "prd_201"})
    assert resposta.status_code == 500
    assert evento["status"] == "erro"
    assert evento["resultado"] == "erro"
    assert any(item.get("funcao") == "get_catalog_items" and item.get("status") == "erro" for item in eventos)


@pytest.mark.parametrize("rota,payload", [
    ("/recommendations", {"product_id": "prd_201"}),
    ("/recommendations/batch", {"product_ids": ["prd_201", "prd_215"]}),
])
def test_pg_indisponivel_nao_vaza_credenciais_e_continua_recomendando(servidor_pg_indisponivel, rota, payload):
    resposta, evento, eventos = chamar(servidor_pg_indisponivel, rota, payload)
    assert resposta.status_code == 200
    corpo = resposta.json()
    if rota == "/recommendations":
        assert len(corpo["recommendations"]) == 3
    else:
        assert corpo["total_products"] == 2
        assert sum(map(len, corpo["recommendations_by_product"].values())) == 5
    assert evento["fonte_catalogo"] == "json"
    assert evento["motivo_fallback"]
    assert any(item.get("status") == "erro" for item in eventos)
    texto = (servidor_pg_indisponivel["execucao"].read_text(encoding="utf-8")
             + servidor_pg_indisponivel["uso"].read_text(encoding="utf-8"))
    for segredo in ("usuario_secreto", "senha_secreta", "postgresql://"):
        assert segredo not in texto


@pytest.mark.parametrize("rota,payload", [
    ("/recommendations", {"product_id": "prd_201"}),
    ("/recommendations/batch", {"product_ids": ["prd_201", "prd_215"]}),
])
def test_fonte_json_preservada_apos_consultas_internas(iniciar_servidor_bentoml, rota, payload):
    resposta, evento, _ = chamar(iniciar_servidor_bentoml, rota, payload)
    assert resposta.status_code == 200
    assert evento["fonte_catalogo"] == "json"


def test_falha_de_escrita_do_log_nao_derruba_recomendacao(servidor_ia):
    servidor = servidor_ia(falha="log")
    resposta = requests.post(
        servidor["url"] + "/recommendations",
        headers={"X-API-Key": "origem-mockup-key"},
        json={"product_id": "p1", "catalog": CATALOGO}, timeout=5,
    )
    assert resposta.status_code == 200
    assert len(resposta.json()["recommendations"]) == 3
    conclusoes = [evento for evento in ler_eventos(servidor["execucao"])
                  if evento.get("evento") == "modulo_ia_execucao"]
    assert len(conclusoes) == 1
    assert conclusoes[0]["status"] == "sucesso"
