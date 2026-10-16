import os
from pathlib import Path

# Os testes de lógica usam o catálogo sintético (prod_001...), não o do site.
os.environ.setdefault(
    "CATALOGO_IA",
    str(Path(__file__).resolve().parent.parent / "data" / "catalogo.json"),
)
