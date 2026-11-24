import statistics
import time

from app.recommendation import rank_candidates, rank_candidates_parallel


def _build_candidates(count: int):
    categories = ["Cerâmica", "Literatura", "Renda", "Madeira"]
    techniques = ["Torno", "Xilogravura", "Manual", "Entalhe"]
    regions = ["Agreste", "Recife", "Sertão", "Zona da Mata"]

    return [
        {
            "product_id": f"prd_{i:06d}",
            "category": categories[i % len(categories)],
            "technique": techniques[i % len(techniques)],
            "region": regions[i % len(regions)],
        }
        for i in range(count)
    ]


def _measure(fn, repeats: int = 7, warmups: int = 2):
    for _ in range(warmups):
        fn()

    times_ms = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        elapsed_ms = (time.perf_counter() - start) * 1000
        times_ms.append(elapsed_ms)

    return {
        "median_ms": statistics.median(times_ms),
        "mean_ms": statistics.mean(times_ms),
        "min_ms": min(times_ms),
    }


def main():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}
    sizes = [100, 1000, 5000]
    workers_list = [2, 4]

    for size in sizes:
        candidates = _build_candidates(size)
        seq_stats = _measure(lambda: rank_candidates(context, candidates))
        print(
            f"Tamanho={size} | Sequencial: mediana={seq_stats['median_ms']:.2f} ms "
            f"(média={seq_stats['mean_ms']:.2f} ms)"
        )

        for workers in workers_list:
            par_stats = _measure(
                lambda w=workers: rank_candidates_parallel(
                    context,
                    candidates,
                    workers=w,
                    executor_type="thread",
                    min_items_for_parallel=1,
                )
            )
            speedup = (
                seq_stats["median_ms"] / par_stats["median_ms"]
                if par_stats["median_ms"] > 0
                else 0.0
            )
            print(
                f"  -> Paralelo (thread, workers={workers}): mediana={par_stats['median_ms']:.2f} ms "
                f"| Speedup={speedup:.2f}x"
            )


if __name__ == "__main__":
    main()