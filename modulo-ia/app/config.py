import os

DEFAULT_LIMIT = 5
MAX_LIMIT = 20

WEIGHTS = {
    "category": 0.50,
    "technique": 0.30,
    "region": 0.20,
}

API_KEY = os.getenv("RECOMENDACAO_API_KEY", "origem-mockup-key")


def get_api_key():
    return os.getenv("RECOMENDACAO_API_KEY", API_KEY)
