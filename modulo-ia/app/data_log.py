"""Registro do uso dos dados pelo módulo de IA.

Cada chamada a uma função de acesso (app/repository.py) acrescenta uma
linha JSON ao arquivo de log (padrão: modulo-ia/logs/uso_dados.jsonl).
O arquivo nunca é apagado nem sobrescrito: só recebe linhas novas.

Além das linhas de acesso (chave "funcao"), cada execução de rota grava
um evento "modulo_ia_execucao" (sem chave "funcao") com filtros, contagens,
duração e resultado. As duas linhas compartilham "execucao_id".

Este log é separado do log de execução das rotas (app/observability.py),
que continua indo também para a saída padrão.
"""

import json
import os
import re
import threading
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime
from pathlib import Path


DEFAULT_LOG_PATH = (
    Path(__file__).resolve().parent.parent / "logs" / "uso_dados.jsonl"
)

_chamador_atual = ContextVar("chamador_uso_dados", default="direto")
# Estado da execução em andamento (id de correlação, fonte do catálogo,
# motivo do fallback). Fora de uma rota (chamada direta) fica vazio.
_execucao_atual = ContextVar("execucao_uso_dados", default=None)
_trava_arquivo = threading.Lock()

# Remove DSN/credenciais de qualquer texto antes de gravar.
_PADROES_SEGREDO = (
    (re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://\S+"), "<url-removida>"),
    (
        re.compile(
            r"(?i)(password|passwd|pwd|senha|secret|token|api[_-]?key)"
            r"\s*[=:]\s*\S+"
        ),
        r"\1=<removido>",
    ),
)


def limpar_texto(valor):
    """Mascara URLs/DSN e pares senha=valor em mensagens de erro."""
    texto = str(valor)
    for padrao, troca in _PADROES_SEGREDO:
        texto = padrao.sub(troca, texto)
    return texto


def agora_iso():
    return datetime.now().astimezone().isoformat(timespec="milliseconds")


def caminho_log():
    return Path(os.getenv("LOG_USO_DADOS", DEFAULT_LOG_PATH))


@contextmanager
def chamador(nome):
    """Marca quem está chamando as funções de acesso (rota ou ferramenta)."""
    token = _chamador_atual.set(nome)
    token_execucao = _execucao_atual.set({"execucao_id": uuid.uuid4().hex[:12]})
    try:
        yield
    finally:
        _execucao_atual.reset(token_execucao)
        _chamador_atual.reset(token)


def chamador_atual():
    return _chamador_atual.get()


def execucao_atual():
    """Dados da execução em andamento (cópia). Vazio fora de uma rota."""
    return dict(_execucao_atual.get() or {})


def anotar_execucao(**dados):
    """Guarda fonte do catálogo/motivo de fallback para o evento da execução."""
    estado = _execucao_atual.get()
    if estado is not None:
        # O primeiro registro vale: é a origem real do catálogo da execução.
        for chave, valor in dados.items():
            if valor is not None:
                estado.setdefault(chave, valor)


def _gravar(linha):
    try:
        destino = caminho_log()
        destino.parent.mkdir(parents=True, exist_ok=True)
        texto = json.dumps(linha, ensure_ascii=False, default=str) + "\n"
        with _trava_arquivo:
            with destino.open("a", encoding="utf-8") as arquivo:
                arquivo.write(texto)
    except Exception:
        # Falha ao gravar o log não pode derrubar a recomendação.
        pass


def registrar_evento_execucao(evento):
    """Grava no log o evento de execução de uma rota (sem chave 'funcao')."""
    linha = {"data_hora": agora_iso(), **evento}
    _gravar(linha)
    return linha


def registrar_uso(
    *,
    funcao,
    parametros,
    registros,
    status,
    ids=None,
    fonte=None,
    erro=None,
    duracao_ms=None,
    motivo_fallback=None,
):
    """Acrescenta uma linha ao log. Só identificadores, nunca dados pessoais."""
    linha = {
        "data_hora": agora_iso(),
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
        linha["erro"] = limpar_texto(erro)
    if duracao_ms is not None:
        linha["duracao_ms"] = duracao_ms

    execucao = execucao_atual()
    if execucao.get("execucao_id"):
        linha["execucao_id"] = execucao["execucao_id"]
    motivo = motivo_fallback or (
        execucao.get("motivo_fallback") if fonte == "json" else None
    )
    if motivo:
        linha["motivo_fallback"] = motivo

    _gravar(linha)
    return linha
