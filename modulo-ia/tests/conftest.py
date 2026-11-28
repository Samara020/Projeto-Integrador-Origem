import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests


IA_ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("CATALOGO_IA", str(IA_ROOT / "data" / "catalogo.json"))


@pytest.fixture(scope="session")
def servidor_ia(tmp_path_factory):
    """Inicia somente processos próprios e conserva seus logs no tmp do pytest."""
    processos = []

    def encerrar(processo, stream):
        processo.terminate()
        try:
            processo.wait(timeout=10)
        except subprocess.TimeoutExpired:
            processo.kill()
            processo.wait()
        stream.close()

    def iniciar(*, falha=None):
        destino = tmp_path_factory.mktemp("servidor-ia")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            porta = sock.getsockname()[1]

        ambiente = os.environ.copy()
        ambiente.update(
            CATALOGO_IA=str(IA_ROOT / "data" / "catalogo_origem.json"),
            LOG_USO_DADOS=str(destino / "uso.jsonl"),
            DATABASE_URL="", POSTGRES_HOST="", DB_HOST="",
            RECOMENDACAO_API_KEY="origem-mockup-key",
        )
        modulo = "app.service:RecommendationService"
        if falha == "json":
            catalogo = destino / "catalogo-invalido.json"
            catalogo.write_text("{invalido", encoding="utf-8")
            ambiente["CATALOGO_IA"] = str(catalogo)
        elif falha == "postgres":
            # O erro tem credenciais fictícias para verificar sua não divulgação.
            # O processo nunca usa um banco de dados: connect é substituído.
            ambiente["DATABASE_URL"] = (
                "postgresql://usuario_secreto:senha_secreta@127.0.0.1:1/base_teste"
            )
            (destino / "servico_pg_indisponivel.py").write_text(
                "import psycopg\n"
                "def falhar(*args, **kwargs):\n"
                "    raise psycopg.OperationalError("
                "'falha simulada: postgresql://usuario_secreto:senha_secreta@host/base_teste')\n"
                "psycopg.connect = falhar\n"
                "from app.service import RecommendationService\n",
                encoding="utf-8",
            )
            ambiente["PYTHONPATH"] = os.pathsep.join(
                [str(destino), str(IA_ROOT), ambiente.get("PYTHONPATH", "")]
            )
            modulo = "servico_pg_indisponivel:RecommendationService"
        elif falha == "log":
            # Um diretório não pode ser aberto como arquivo JSONL.
            ambiente["LOG_USO_DADOS"] = str(destino)

        execucao = destino / "servidor.log"
        stream = execucao.open("w", encoding="utf-8")
        try:
            processo = subprocess.Popen(
                [sys.executable, "-m", "bentoml", "serve", modulo,
                 "--host", "127.0.0.1", "--port", str(porta)],
                cwd=IA_ROOT, env=ambiente, stdout=stream, stderr=subprocess.STDOUT,
            )
        except BaseException:
            stream.close()
            raise
        processos.append((processo, stream))
        url = f"http://127.0.0.1:{porta}"
        prazo = time.monotonic() + 30
        try:
            while time.monotonic() < prazo:
                if processo.poll() is not None:
                    pytest.fail(f"BentoML encerrou: {execucao.read_text(encoding='utf-8')}")
                try:
                    if requests.get(f"{url}/readyz", timeout=0.5).status_code == 200:
                        return {"url": url, "uso": destino / "uso.jsonl", "execucao": execucao}
                except requests.RequestException:
                    pass
                time.sleep(0.1)
            pytest.fail(f"BentoML não ficou pronto: {execucao.read_text(encoding='utf-8')}")
        except BaseException:
            processos.remove((processo, stream))
            encerrar(processo, stream)
            raise

    yield iniciar

    for processo, stream in reversed(processos):
        encerrar(processo, stream)


@pytest.fixture(scope="session")
def iniciar_servidor_bentoml(servidor_ia):
    return servidor_ia()


@pytest.fixture(scope="session")
def ia_url(iniciar_servidor_bentoml):
    return iniciar_servidor_bentoml["url"]
