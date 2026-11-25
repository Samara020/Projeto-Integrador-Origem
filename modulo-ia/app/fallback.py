from app.catalog import available_products
from app.config import (
    PARALLEL_BATCH_MIN_REQUESTS,
    PARALLEL_EXECUTOR,
    PARALLEL_MIN_ITEMS,
    PARALLEL_WORKERS,
)
from app.recommendation import (
    attributes_match,
    rank_batch_recommendations_parallel,
    rank_candidates_parallel,
)


FALLBACK_STAGES = [
    ("category", "technique", "region"),
    ("category", "technique"),
    ("category", "region"),
    ("category",),
]


def select_candidates(context, reference_product_id=None, limit=5, catalog=None):
    candidates = available_products(reference_product_id, catalog=catalog)

    stages = FALLBACK_STAGES
    if context.get("category") is None:
        # Sem categoria, amplia apenas pelos filtros disponíveis no contexto.
        stages = [("technique", "region"), ("technique",), ("region",)]

    selected = []
    selected_ids = set()

    for stage in stages:
        stage_candidates = []

        for candidate in candidates:
            if candidate["product_id"] in selected_ids:
                continue

            if all(
                attributes_match(context.get(attribute), candidate.get(attribute))
                for attribute in stage
            ):
                stage_candidates.append(candidate)

        ranked = rank_candidates_parallel(
            context,
            stage_candidates,
            workers=PARALLEL_WORKERS,
            executor_type=PARALLEL_EXECUTOR,
            min_items_for_parallel=PARALLEL_MIN_ITEMS,
        )

        for recommendation in ranked:
            if recommendation["product_id"] in selected_ids:
                continue

            selected.append(recommendation)
            selected_ids.add(recommendation["product_id"])

            if len(selected) >= limit:
                return selected

    return selected


def select_candidates_batch(references, catalog, limit=5):
    """
    Gera recomendações em lote para múltiplos produtos do catálogo utilizando
    processamento paralelo por partições independentes.
    """
    return rank_batch_recommendations_parallel(
        references=references,
        catalog=catalog,
        limit=limit,
        workers=PARALLEL_WORKERS,
        executor_type=PARALLEL_EXECUTOR,
        min_requests_for_parallel=PARALLEL_BATCH_MIN_REQUESTS,
    )
