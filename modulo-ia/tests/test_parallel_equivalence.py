from app.fallback import select_candidates, select_candidates_batch
from app.recommendation import (
    rank_batch_recommendations,
    rank_batch_recommendations_parallel,
    rank_candidates,
    rank_candidates_parallel,
)


def _sample_candidates():
    return [
        {"product_id": "p3", "category": "Cerâmica", "technique": "Torno", "region": "Agreste", "available": True},
        {"product_id": "p1", "category": "Cerâmica", "technique": "Torno", "region": "Agreste", "available": True},
        {"product_id": "p2", "category": "Cerâmica", "technique": "Manual", "region": "Agreste", "available": True},
        {"product_id": "p4", "category": "Literatura", "technique": "Xilogravura", "region": "Recife", "available": True},
    ]


def test_sequential_and_parallel_return_identical_ranking():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}
    candidates = _sample_candidates()

    sequential = rank_candidates(context, candidates)
    parallel_thread = rank_candidates_parallel(
        context,
        candidates,
        workers=2,
        executor_type="thread",
        min_items_for_parallel=1,
    )
    parallel_process = rank_candidates_parallel(
        context,
        candidates,
        workers=2,
        executor_type="process",
        min_items_for_parallel=1,
    )

    assert parallel_thread == sequential
    assert parallel_process == sequential


def test_parallel_handles_empty_candidates():
    context = {"category": "Cerâmica", "technique": "Torno", "region": "Agreste"}

    assert rank_candidates_parallel(context, [], workers=2, min_items_for_parallel=1) == []


def test_batch_sequential_and_parallel_return_identical_recommendations():
    catalog = _sample_candidates()
    references = catalog[:3]

    sequential = rank_batch_recommendations(references, catalog, limit=3)
    parallel_thread = rank_batch_recommendations_parallel(
        references,
        catalog,
        limit=3,
        workers=2,
        executor_type="thread",
        min_requests_for_parallel=1,
    )
    parallel_process = rank_batch_recommendations_parallel(
        references,
        catalog,
        limit=3,
        workers=2,
        executor_type="process",
        min_requests_for_parallel=1,
    )

    assert parallel_thread == sequential
    assert parallel_process == sequential


def test_select_candidates_and_batch_integrate_parallel_path():
    catalog = _sample_candidates()

    single = select_candidates(
        context={"category": "Cerâmica", "technique": "Torno", "region": "Agreste"},
        reference_product_id="p1",
        limit=2,
        catalog=catalog,
    )
    assert [item["product_id"] for item in single] == ["p3", "p2"]

    batch = select_candidates_batch(catalog[:2], catalog, limit=2)
    assert set(batch.keys()) == {"p3", "p1"}
    assert batch["p1"][0]["product_id"] == "p3"
