from app.config import WEIGHTS


def calculate_score(context, candidate):
    score = 0.0
    total_weight = 0.0

    for attribute, weight in WEIGHTS.items():
        context_value = context.get(attribute)
        candidate_value = candidate.get(attribute)

        if context_value is None:
            continue

        total_weight += weight

        if context_value == candidate_value:
            score += weight

    if total_weight == 0:
        return 0.0

    return round(score / total_weight, 4)


def build_reason(context, candidate):
    matches = []

    if (
        context.get("category") is not None
        and context.get("category") == candidate.get("category")
    ):
        matches.append("mesma categoria")

    if (
        context.get("technique") is not None
        and context.get("technique") == candidate.get("technique")
    ):
        matches.append("mesma técnica artesanal")

    if (
        context.get("region") is not None
        and context.get("region") == candidate.get("region")
    ):
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
        key=lambda item: (-item["score"], item["product_id"])
    )
