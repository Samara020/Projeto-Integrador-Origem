import os
import subprocess
import sys
import time
from pathlib import Path

import pytest
import requests


os.environ.setdefault(
    "CATALOGO_IA",
    str(
        Path(__file__).resolve().parent.parent
        / "data"
        / "catalogo.json"
    ),
)

IA_ROOT = Path(__file__).resolve().parent.parent

BASE_URL = "http://127.0.0.1:3001"


@pytest.fixture(scope="session", autouse=True)
def iniciar_servidor_bentoml():
    ambiente_servidor = os.environ.copy()
    ambiente_servidor["CATALOGO_IA"] = str(
        IA_ROOT / "data" / "catalogo_origem.json"
    )

    servidor = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "bentoml",
            "serve",
            "app.service:RecommendationService",
            "--host",
            "127.0.0.1",
            "--port",
            "3001",
        ],
        cwd=IA_ROOT,
        env=ambiente_servidor,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
    )

    try:
        prazo = time.time() + 30

        while time.time() < prazo:
            if servidor.poll() is not None:
                pytest.fail(
                    "O servidor BentoML encerrou antes de iniciar."
                )

            try:
                resposta = requests.post(
                    f"{BASE_URL}/recommendations",
                    json={"category": "artesanato"},
                    timeout=1,
                )

                if resposta.status_code == 401:
                    break

            except requests.RequestException:
                pass

            time.sleep(0.5)

        else:
            pytest.fail(
                "O servidor BentoML não ficou disponível "
                "na porta 3001 em 30 segundos."
            )

        yield

    finally:
        servidor.terminate()

        try:
            servidor.wait(timeout=10)
        except subprocess.TimeoutExpired:
            servidor.kill()
            servidor.wait()