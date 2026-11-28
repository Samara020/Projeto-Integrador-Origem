import json
import logging
import time

from app.data_log import (
    agora_iso,
    execucao_atual,
    limpar_texto,
    registrar_evento_execucao,
)


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
    filtros: dict | None = None,
    contexto_referencia: dict | None = None,
    total_catalogo: int | None = None,
    total_candidatos: int | None = None,
    total_analisados: int | None = None,
    total_compativeis: int | None = None,
    total_sugestoes: int | None = None,
    total_referencias: int | None = None,
) -> dict:
    """Registra o evento de execução de uma rota (stdout e log de uso).

    Os campos novos são opcionais; os antigos mantêm o significado.
    `resultado` deixa explícito se a resposta teve sugestões, veio vazia
    ou terminou em erro. `fonte_catalogo` e `motivo_fallback` vêm da
    execução em andamento (anotados pelo repositório).
    """
    execucao = execucao_atual()

    if status == "erro":
        resultado = "erro"
    elif total_sugestoes is None:
        resultado = None
    else:
        resultado = "com_sugestoes" if total_sugestoes > 0 else "vazio"

    evento = {
        "evento": "modulo_ia_execucao",
        "data_hora": agora_iso(),
        "execucao_id": execucao.get("execucao_id"),
        "rota": rota,
        "status": status,
        "resultado": resultado,
        "elapsed_ms": calcular_latencia_ms(start_time),
        "product_id": product_id,
        "filtros": filtros or None,
        "contexto_referencia": contexto_referencia or None,
        "origem_catalogo": origem_catalogo,
        "fonte_catalogo": execucao.get("fonte_catalogo"),
        "motivo_fallback": execucao.get("motivo_fallback"),
        "total_catalogo": total_catalogo,
        "total_candidatos": total_candidatos,
        "total_analisados": total_analisados,
        "total_compativeis": total_compativeis,
        "total_sugestoes": total_sugestoes,
        "total_referencias": total_referencias,
        "total_resultados": total_resultados,
        "codigo_erro": codigo_erro,
        "detalhe": limpar_texto(detalhe) if detalhe is not None else None,
    }
    payload_limpo = {k: v for k, v in evento.items() if v is not None}
    try:
        logger.info(json.dumps(payload_limpo, ensure_ascii=False))
        registrar_evento_execucao(payload_limpo)
    except Exception:
        # Falha de log não pode derrubar a recomendação.
        pass
    return payload_limpo
