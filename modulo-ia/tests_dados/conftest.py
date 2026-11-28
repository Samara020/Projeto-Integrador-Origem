import pytest


@pytest.fixture(autouse=True)
def log_uso_dados_temporario(tmp_path, monkeypatch):
    # Os testes não escrevem no log real (logs/uso_dados.jsonl).
    monkeypatch.setenv("LOG_USO_DADOS", str(tmp_path / "uso_dados.jsonl"))
