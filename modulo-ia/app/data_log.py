"""Registro do uso dos dados pelo módulo de IA.

Cada chamada a uma função de acesso (app/repository.py) acrescenta uma
linha JSON ao arquivo de log (padrão: modulo-ia/logs/uso_dados.jsonl).
O arquivo nunca é apagado nem sobrescrito: só recebe linhas novas.

Este log é separado do log de execução das rotas (app/observability.py),
que continua indo para a saída padrão.
"""

import json
import os
import threading
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path


DEFAULT_LOG_PATH = (
    Path(__file__).resolve().parent.parent / "logs" / "uso_dados.jsonl"
)

_chamador_atual = ContextVar("chamador_uso_dados", default="direto")
_trava_arquivo = threading.Lock()


def caminho_log():
    return Path(os.getenv("LOG_USO_DADOS", DEFAULT_LOG_PATH))


@contextmanager
def chamador(nome):
    """Marca quem está chamando as funções de acesso (rota ou ferramenta)."""
    token = _chamador_atual.set(nome)
    try:
        yield
    finally:
        _chamador_atual.reset(token)


def chamador_atual():
    return _chamador_atual.get()


def registrar_uso(
    *,
    funcao,
    parametros,
    registros,
    status,
    ids=None,
    fonte=None,
    erro=None,
):
    """Acrescenta uma linha ao log. Só identificadores, nunca dados pessoais."""
    linha = {
        "data_hora": datetime.now().astimezone().isoformat(timespec="seconds"),
        "funcao": funcao,
        "chamador": chamador_atual(),
        "parametros": parametros,
        "registros": registros,
        "status": status,
    }
    if ids is not None:
        linha["ids"] = ids
    if fonte is not None:
        linha["fonte"] = fonte
    if erro is not None:
        linha["erro"] = erro

    destino = caminho_log()
    try:
        destino.parent.mkdir(parents=True, exist_ok=True)
        with _trava_arquivo:
            with destino.open("a", encoding="utf-8") as arquivo:
                arquivo.write(json.dumps(linha, ensure_ascii=False) + "\n")
    except OSError:
        # Falha ao gravar o log não pode derrubar a recomendação.
        pass

    return linha
