import time

from app.recommendation import rank_candidates


def test_desempenho_com_10000_produtos():
    contexto = {
        "category": "Cerâmica",
        "technique": "Modelagem manual",
        "region": "Caruaru",
    }

    candidatos = [
        {
            "product_id": f"prod_{i:05d}",
            "category": "Cerâmica" if i % 2 == 0 else "Madeira",
            "technique": "Modelagem manual" if i % 3 == 0 else "Torno",
            "region": "Caruaru" if i % 4 == 0 else "Recife",
        }
        for i in range(10000)
    ]

    tempos = []

    for _ in range(20):
        inicio = time.perf_counter()

        resultado = rank_candidates(contexto, candidatos)

        fim = time.perf_counter()

        tempos.append(fim - inicio)

        assert len(resultado) == 10000

    tempos.sort()

    indice_p95 = int(len(tempos) * 0.95) - 1
    p95 = tempos[indice_p95]

    print(f"\nP95: {p95:.4f}s")

    assert p95 <= 2.0