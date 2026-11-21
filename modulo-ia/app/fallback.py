from app.catalog import available_products
from app.recommendation import attributes_match, rank_candidates


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

        ranked = rank_candidates(context, stage_candidates)

        for recommendation in ranked:
            if recommendation["product_id"] in selected_ids:
                continue

            selected.append(recommendation)
            selected_ids.add(recommendation["product_id"])

            if len(selected) >= limit:
                return selected

    return selected
