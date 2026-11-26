import json
import logging
import time


logger = logging.getLogger("modulo_ia.execucao")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


def iniciar_cronometro() -> float:
    return time.perf_counter()


def calcular_latencia_ms(start_time: float) -> float:
    return round((time.perf_counter() - start_time) * 1000, 2)


def registrar_execucao(
    *,
    rota: str,
    status: str,
    start_time: float,
    product_id: str | None = None,
    origem_catalogo: str | None = None,
    total_resultados: int | None = None,
    codigo_erro: str | None = None,
    detalhe: str | None = None,
) -> dict:
    evento = {
        "evento": "modulo_ia_execucao",
        "rota": rota,
        "status": status,
        "elapsed_ms": calcular_latencia_ms(start_time),
        "product_id": product_id,
        "origem_catalogo": origem_catalogo,
        "total_resultados": total_resultados,
        "codigo_erro": codigo_erro,
        "detalhe": detalhe,
    }
    payload_limpo = {k: v for k, v in evento.items() if v is not None}
    logger.info(json.dumps(payload_limpo, ensure_ascii=False))
    return payload_limpo
