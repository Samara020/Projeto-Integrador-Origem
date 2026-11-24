from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import math

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
):
    """
    Avalia candidatos em partições independentes em paralelo e consolida a ordenação ao final.
    Em listas pequenas ou com 1 worker, executa de forma sequencial para evitar overhead.
    """
    if len(candidates) < min_items_for_parallel or workers <= 1:
        # Caminho sequencial direto para cargas pequenas
        return rank_candidates(context, candidates)

    chunks = _chunk_items(candidates, workers)
    tasks = [(context, chunk) for chunk in chunks]

    # Ponto de execução paralela: cada worker avalia sua partição sem estado compartilhado
    executor_cls = ProcessPoolExecutor if executor_type == "process" else ThreadPoolExecutor
    combined = []

    with executor_cls(max_workers=workers) as executor:
        for partial in executor.map(_rank_chunk, tasks):
            combined.extend(partial)

    # Consolidação e ordenação idênticas à versão sequencial
    return sorted(
        combined,
        key=lambda item: (-item["score"], item["product_id"]),
    )