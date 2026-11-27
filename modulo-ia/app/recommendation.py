from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import math

from app.catalog import attributes_match, is_product_available
from app.config import WEIGHTS


_WORKER_CATALOG = []


def _init_batch_worker(catalog):
    global _WORKER_CATALOG
    _WORKER_CATALOG = catalog

def calculate_score(context, candidate):
    score = 0.0
    total_weight = 0.0

    for attribute, weight in WEIGHTS.items():
        context_value = context.get(attribute)
        candidate_value = candidate.get(attribute)

        if context_value is None:
            continue

        total_weight += weight

        if attributes_match(context_value, candidate_value):
            score += weight

    if total_weight == 0:
        return 0.0

    return round(score / total_weight, 4)


def build_reason(context, candidate):
    matches = []

    if attributes_match(context.get("category"), candidate.get("category")):
        matches.append("mesma categoria")

    if attributes_match(context.get("technique"), candidate.get("technique")):
        matches.append("mesma técnica artesanal")

    if attributes_match(context.get("region"), candidate.get("region")):
        matches.append("mesma região")

    if not matches:
        return "Relação por atributos disponíveis no contexto."

    return "Recomendado por " + ", ".join(matches) + "."


def rank_candidates(context, candidates):
    ranked = []

    for candidate in candidates:
        ranked.append(
            {
                "product_id": candidate["product_id"],
                "score": calculate_score(context, candidate),
                "reason": build_reason(context, candidate),
            }
        )

    return sorted(
        ranked,
        key=lambda item: (-item["score"], item["product_id"]),
    )


def _chunk_items(items, num_chunks):
    if not items or num_chunks <= 1:
        return [items] if items else []

    chunk_size = math.ceil(len(items) / num_chunks)
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


def _rank_chunk(args):
    context, chunk = args
    return [
        {
            "product_id": candidate["product_id"],
            "score": calculate_score(context, candidate),
            "reason": build_reason(context, candidate),
        }
        for candidate in chunk
    ]


def rank_candidates_parallel(
    context,
    candidates,
    workers=4,
    executor_type="thread",
    min_items_for_parallel=32,
    executor=None,
):
    """
    Avalia candidatos em partições independentes em paralelo e consolida a ordenação ao final.
    Em listas pequenas ou com 1 worker, executa de forma sequencial para evitar overhead.
    """
    if len(candidates) < min_items_for_parallel or workers <= 1:
        return rank_candidates(context, candidates)

    chunks = _chunk_items(candidates, workers)
    tasks = [(context, chunk) for chunk in chunks]

    combined = []
    if executor is not None:
        for partial in executor.map(_rank_chunk, tasks):
            combined.extend(partial)
    else:
        executor_cls = ProcessPoolExecutor if executor_type == "process" else ThreadPoolExecutor
        with executor_cls(max_workers=workers) as pool:
            for partial in pool.map(_rank_chunk, tasks):
                combined.extend(partial)

    return sorted(
        combined,
        key=lambda item: (-item["score"], item["product_id"]),
    )


def _rank_single_reference(reference, catalog, limit):
    ref_id = reference.get("product_id")
    context = {
        "category": reference.get("category"),
        "technique": reference.get("technique"),
        "region": reference.get("region"),
    }
    candidates = [
        item
        for item in catalog
        if is_product_available(item, default=True)
        and item.get("product_id") != ref_id
    ]
    ranked = rank_candidates(context, candidates)
    compatible = [
        item for item in ranked
        if item["score"] > 0
    ]
    return ref_id, compatible[:limit]

def _rank_batch_chunk_with_shared_catalog(args):
    references_chunk, limit = args
    return [
        _rank_single_reference(ref, _WORKER_CATALOG, limit)
        for ref in references_chunk
    ]


def _rank_batch_chunk_inline(args):
    references_chunk, catalog, limit = args
    return [
        _rank_single_reference(ref, catalog, limit)
        for ref in references_chunk
    ]


def rank_batch_recommendations(references, catalog, limit=5):
    """
    Pré-calcula sequencialmente as recomendações top-N para um lote de produtos de referência.
    """
    results = {}
    for ref in references:
        ref_id, top_items = _rank_single_reference(ref, catalog, limit)
        results[ref_id] = top_items
    return results


def rank_batch_recommendations_parallel(
    references,
    catalog,
    limit=5,
    workers=4,
    executor_type="process",
    min_requests_for_parallel=16,
    executor=None,
):
    """
    Pré-calcula em paralelo as recomendações top-N para um lote de produtos de referência.
    Com ProcessPoolExecutor, carrega o catálogo uma única vez por processo worker (initializer),
    eliminando o GIL e evitando serialização repetida do catálogo entre processos.
    """
    if len(references) < min_requests_for_parallel or workers <= 1:
        return rank_batch_recommendations(references, catalog, limit=limit)

    chunks = _chunk_items(references, workers)
    results = {}

    if executor is not None:
        if executor_type == "process":
            tasks = [(chunk, limit) for chunk in chunks]
            for partial in executor.map(_rank_batch_chunk_with_shared_catalog, tasks):
                for ref_id, top_items in partial:
                    results[ref_id] = top_items
        else:
            tasks = [(chunk, catalog, limit) for chunk in chunks]
            for partial in executor.map(_rank_batch_chunk_inline, tasks):
                for ref_id, top_items in partial:
                    results[ref_id] = top_items
        return results

    if executor_type == "process":
        tasks = [(chunk, limit) for chunk in chunks]
        with ProcessPoolExecutor(
            max_workers=workers,
            initializer=_init_batch_worker,
            initargs=(catalog,),
        ) as pool:
            for partial in pool.map(_rank_batch_chunk_with_shared_catalog, tasks):
                for ref_id, top_items in partial:
                    results[ref_id] = top_items
    else:
        tasks = [(chunk, catalog, limit) for chunk in chunks]
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for partial in pool.map(_rank_batch_chunk_inline, tasks):
                for ref_id, top_items in partial:
                    results[ref_id] = top_items

    return results
