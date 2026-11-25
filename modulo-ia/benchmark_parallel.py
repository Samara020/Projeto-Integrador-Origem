from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import csv
from datetime import datetime, timezone
from pathlib import Path
import platform
import statistics
import time

from app.recommendation import (
    _init_batch_worker,
    rank_batch_recommendations,
    rank_batch_recommendations_parallel,
    rank_candidates,
    rank_candidates_parallel,
)


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
            "available": True,
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


def _append_rows(raw_rows, meta, stats):
    for idx, val in enumerate(stats["samples_ms"], start=1):
        raw_rows.append(
            {
                **meta,
                "repetition": idx,
                "elapsed_ms": round(val, 6),
                "median_ms": round(stats["median_ms"], 6),
                "mean_ms": round(stats["mean_ms"], 6),
            }
        )


def main():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}
    single_sizes = [100, 1000, 5000]
    batch_catalog_size = 1000
    batch_ref_sizes = [200, 500, 1000]
    workers_list = [2, 4]

    timestamp = datetime.now(timezone.utc).isoformat()
    env_info = f"{platform.system()} {platform.release()} | Python {platform.python_version()}"
    raw_rows = []

    print(f"Ambiente: {env_info} | Timestamp UTC: {timestamp}")

    # =========================================================================
    # Cenario 1: Ranqueamento unitario (demonstracao do efeito do GIL em threads)
    # =========================================================================
    print("\n=== Cenario 1: Ranqueamento unitario (rank_candidates vs thread) ===")
    for size in single_sizes:
        candidates = _build_candidates(size)
        seq_stats = _measure_raw(lambda: rank_candidates(context, candidates))
        print(
            f"Tamanho={size} | Sequencial: mediana={seq_stats['median_ms']:.3f} ms "
            f"(media={seq_stats['mean_ms']:.3f} ms)"
        )
        _append_rows(
            raw_rows,
            {
                "timestamp_utc": timestamp,
                "environment": env_info,
                "scenario": "single_ranking",
                "mode": "forcado_min1",
                "min_items_for_parallel": 1,
                "executor_type": "sequential",
                "workers": 1,
                "candidates_count": size,
            },
            seq_stats,
        )

        for workers in workers_list:
            with ThreadPoolExecutor(max_workers=workers) as pool:
                par_stats = _measure_raw(
                    lambda w=workers, p=pool: rank_candidates_parallel(
                        context,
                        candidates,
                        workers=w,
                        executor_type="thread",
                        min_items_for_parallel=1,
                        executor=p,
                    )
                )
            speedup, variation_pct, reduction_pct = _calc_metrics(
                seq_stats["median_ms"], par_stats["median_ms"]
            )
            print(
                f"  -> Paralelo (thread, w={workers}): mediana={par_stats['median_ms']:.3f} ms | "
                f"Speedup={speedup:.2f}x | Variacao={variation_pct:+.2f}% | Reducao={reduction_pct:.2f}%"
            )
            _append_rows(
                raw_rows,
                {
                    "timestamp_utc": timestamp,
                    "environment": env_info,
                    "scenario": "single_ranking",
                    "mode": "forcado_min1",
                    "min_items_for_parallel": 1,
                    "executor_type": "thread",
                    "workers": workers,
                    "candidates_count": size,
                },
                par_stats,
            )

    # =========================================================================
    # Cenario 2: Pre-calculo de recomendacoes em lote (ProcessPoolExecutor sem GIL)
    # =========================================================================
    print(
        f"\n=== Cenario 2: Pre-calculo de recomendacoes em lote "
        f"(catalogo={batch_catalog_size}, ProcessPoolExecutor) ==="
    )
    catalog = _build_candidates(batch_catalog_size)

    for ref_count in batch_ref_sizes:
        references = catalog[:ref_count]
        seq_stats = _measure_raw(
            lambda refs=references: rank_batch_recommendations(refs, catalog, limit=5)
        )
        print(
            f"Lote={ref_count} produtos (x {batch_catalog_size} catalogo) | "
            f"Sequencial: mediana={seq_stats['median_ms']:.2f} ms "
            f"(media={seq_stats['mean_ms']:.2f} ms)"
        )
        _append_rows(
            raw_rows,
            {
                "timestamp_utc": timestamp,
                "environment": env_info,
                "scenario": "batch_recommendations",
                "mode": "process_pool_reutilizado",
                "min_items_for_parallel": 16,
                "executor_type": "sequential",
                "workers": 1,
                "candidates_count": ref_count,
            },
            seq_stats,
        )

        # Comparacao com ThreadPoolExecutor (preso ao GIL)
        with ThreadPoolExecutor(max_workers=4) as thread_pool:
            thread_stats = _measure_raw(
                lambda refs=references, p=thread_pool: rank_batch_recommendations_parallel(
                    refs,
                    catalog,
                    limit=5,
                    workers=4,
                    executor_type="thread",
                    min_requests_for_parallel=16,
                    executor=p,
                )
            )
        t_speedup, t_var, t_red = _calc_metrics(seq_stats["median_ms"], thread_stats["median_ms"])
        print(
            f"  -> Paralelo (thread, w=4):  mediana={thread_stats['median_ms']:.2f} ms | "
            f"Speedup={t_speedup:.2f}x | Variacao={t_var:+.2f}% | Reducao={t_red:.2f}%"
        )
        _append_rows(
            raw_rows,
            {
                "timestamp_utc": timestamp,
                "environment": env_info,
                "scenario": "batch_recommendations",
                "mode": "thread_pool_reutilizado",
                "min_items_for_parallel": 16,
                "executor_type": "thread",
                "workers": 4,
                "candidates_count": ref_count,
            },
            thread_stats,
        )

        # Execucao paralela real em multiplos nucleos com ProcessPoolExecutor
        for workers in workers_list:
            with ProcessPoolExecutor(
                max_workers=workers,
                initializer=_init_batch_worker,
                initargs=(catalog,),
            ) as proc_pool:
                par_stats = _measure_raw(
                    lambda refs=references, w=workers, p=proc_pool: rank_batch_recommendations_parallel(
                        refs,
                        catalog,
                        limit=5,
                        workers=w,
                        executor_type="process",
                        min_requests_for_parallel=16,
                        executor=p,
                    )
                )
            speedup, variation_pct, reduction_pct = _calc_metrics(
                seq_stats["median_ms"], par_stats["median_ms"]
            )
            print(
                f"  -> Paralelo (process, w={workers}): mediana={par_stats['median_ms']:.2f} ms | "
                f"Speedup={speedup:.2f}x | Variacao={variation_pct:+.2f}% | Reducao={reduction_pct:.2f}%"
            )
            _append_rows(
                raw_rows,
                {
                    "timestamp_utc": timestamp,
                    "environment": env_info,
                    "scenario": "batch_recommendations",
                    "mode": "process_pool_reutilizado",
                    "min_items_for_parallel": 16,
                    "executor_type": "process",
                    "workers": workers,
                    "candidates_count": ref_count,
                },
                par_stats,
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
                "scenario",
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

    print(f"\nAmostras brutas salvas em: {csv_path} ({len(raw_rows)} registros)")


if __name__ == "__main__":
    main()
