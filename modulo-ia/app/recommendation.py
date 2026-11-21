from app.config import WEIGHTS


def attributes_match(context_value, candidate_value):
    if context_value is None or candidate_value is None:
        return False

    if isinstance(context_value, str) and isinstance(candidate_value, str):
        return context_value.strip().casefold() == candidate_value.strip().casefold()

    return context_value == candidate_value


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
        key=lambda item: (-item["score"], item["product_id"])
    )
