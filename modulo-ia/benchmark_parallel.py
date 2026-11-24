import csv
from datetime import datetime, timezone
from pathlib import Path
import platform
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


def _measure_raw(fn, repeats: int = 7, warmups: int = 2):
    for _ in range(warmups):
        fn()

    samples_ms = []
    for _ in range(repeats):
        start = time.perf_counter()
        fn()
        elapsed_ms = (time.perf_counter() - start) * 1000
        samples_ms.append(elapsed_ms)

    return {
        "samples_ms": samples_ms,
        "median_ms": statistics.median(samples_ms),
        "mean_ms": statistics.mean(samples_ms),
        "min_ms": min(samples_ms),
    }


def _calc_metrics(seq_median: float, par_median: float):
    speedup = seq_median / par_median if par_median > 0 else 0.0
    variation_pct = ((seq_median - par_median) / seq_median) * 100 if seq_median > 0 else 0.0
    reduction_pct = max(0.0, variation_pct)
    return speedup, variation_pct, reduction_pct


def main():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}
    sizes = [100, 1000, 5000]
    workers_list = [2, 4]
    modes = [
        ("forcado_min1", 1),
        ("padrao_min32", 32),
    ]

    timestamp = datetime.now(timezone.utc).isoformat()
    env_info = f"{platform.system()} {platform.release()} | Python {platform.python_version()}"
    raw_rows = []

    print(f"Ambiente: {env_info} | Timestamp UTC: {timestamp}")

    for mode_name, min_items in modes:
        print(f"\n=== Modo: {mode_name} (min_items_for_parallel={min_items}) ===")
        for size in sizes:
            candidates = _build_candidates(size)
            seq_stats = _measure_raw(lambda: rank_candidates(context, candidates))
            print(
                f"Tamanho={size} | Sequencial: mediana={seq_stats['median_ms']:.2f} ms "
                f"(média={seq_stats['mean_ms']:.2f} ms)"
            )

            for idx, val in enumerate(seq_stats["samples_ms"], start=1):
                raw_rows.append(
                    {
                        "timestamp_utc": timestamp,
                        "environment": env_info,
                        "mode": mode_name,
                        "min_items_for_parallel": min_items,
                        "executor_type": "sequential",
                        "workers": 1,
                        "candidates_count": size,
                        "repetition": idx,
                        "elapsed_ms": round(val, 6),
                        "median_ms": round(seq_stats["median_ms"], 6),
                        "mean_ms": round(seq_stats["mean_ms"], 6),
                    }
                )

            for workers in workers_list:
                par_stats = _measure_raw(
                    lambda w=workers, m=min_items: rank_candidates_parallel(
                        context,
                        candidates,
                        workers=w,
                        executor_type="thread",
                        min_items_for_parallel=m,
                    )
                )
                speedup, variation_pct, reduction_pct = _calc_metrics(
                    seq_stats["median_ms"], par_stats["median_ms"]
                )
                print(
                    f"  -> Paralelo (thread, workers={workers}, min={min_items}): "
                    f"mediana={par_stats['median_ms']:.2f} ms | Speedup={speedup:.2f}x | "
                    f"Variação={variation_pct:+.2f}% | Redução={reduction_pct:.2f}%"
                )

                for idx, val in enumerate(par_stats["samples_ms"], start=1):
                    raw_rows.append(
                        {
                            "timestamp_utc": timestamp,
                            "environment": env_info,
                            "mode": mode_name,
                            "min_items_for_parallel": min_items,
                            "executor_type": "thread",
                            "workers": workers,
                            "candidates_count": size,
                            "repetition": idx,
                            "elapsed_ms": round(val, 6),
                            "median_ms": round(par_stats["median_ms"], 6),
                            "mean_ms": round(par_stats["mean_ms"], 6),
                        }
                    )

    out_dir = Path(__file__).resolve().parent.parent / "docs"
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "benchmark_amostras_brutas.csv"

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "timestamp_utc",
                "environment",
                "mode",
                "min_items_for_parallel",
                "executor_type",
                "workers",
                "candidates_count",
                "repetition",
                "elapsed_ms",
                "median_ms",
                "mean_ms",
            ],
        )
        writer.writeheader()
        writer.writerows(raw_rows)

    print(f"\nAmostras brutas salvas em: {csv_path}")


if __name__ == "__main__":
    main()
