from app.recommendation import rank_candidates, rank_candidates_parallel


def _sample_candidates():
    return [
        {"product_id": "p3", "category": "Cerâmica", "technique": "Torno", "region": "Agreste"},
        {"product_id": "p1", "category": "Cerâmica", "technique": "Torno", "region": "Agreste"},
        {"product_id": "p2", "category": "Cerâmica", "technique": "Manual", "region": "Agreste"},
        {"product_id": "p4", "category": "Literatura", "technique": "Xilogravura", "region": "Recife"},
    ]


def test_sequential_and_parallel_return_identical_ranking():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}
    candidates = _sample_candidates()

    sequential = rank_candidates(context, candidates)
    parallel = rank_candidates_parallel(
        context,
        candidates,
        workers=2,
        executor_type="thread",
        min_items_for_parallel=1,
    )

    assert parallel == sequential


def test_parallel_handles_empty_candidates():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}

    assert rank_candidates_parallel(context, [], workers=2, min_items_for_parallel=1) == []