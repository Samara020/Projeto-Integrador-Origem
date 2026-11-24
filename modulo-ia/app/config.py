import os

DEFAULT_LIMIT = 5
MAX_LIMIT = 20

WEIGHTS = {
    "category": 0.50,
    "technique": 0.30,
    "region": 0.20,
}

API_KEY = os.getenv("RECOMENDACAO_API_KEY", "origem-mockup-key")

PARALLEL_WORKERS = max(1, int(os.getenv("RECOMENDACAO_PARALLEL_WORKERS", "4")))
PARALLEL_EXECUTOR = os.getenv("RECOMENDACAO_PARALLEL_EXECUTOR", "process").strip().lower()
PARALLEL_MIN_ITEMS = max(1, int(os.getenv("RECOMENDACAO_PARALLEL_MIN_ITEMS", "2000")))
PARALLEL_BATCH_MIN_REQUESTS = max(1, int(os.getenv("RECOMENDACAO_PARALLEL_BATCH_MIN_REQUESTS", "16")))


def get_api_key():
    return os.getenv("RECOMENDACAO_API_KEY", API_KEY)
