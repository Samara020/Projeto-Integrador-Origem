import os
import time

import bentoml
from pydantic import BaseModel

from app.catalog import find_product, load_catalog
from app.config import DEFAULT_LIMIT, MAX_LIMIT, get_api_key
from app.fallback import select_candidates, select_candidates_batch


class CatalogItem(BaseModel):
    product_id: str
    name: str | None = None
    category: str | None = None
    technique: str | None = None
    region: str | None = None
    available: bool = True


class RecommendationRequest(BaseModel):
    product_id: str | None = None
    category: str | None = None
    technique: str | None = None
    region: str | None = None
    limit: int = DEFAULT_LIMIT
    catalog: list[CatalogItem] | None = None


class BatchRecommendationRequest(BaseModel):
    product_ids: list[str] | None = None
    limit: int = DEFAULT_LIMIT
    catalog: list[CatalogItem] | None = None


def normalizar_texto(valor):
    if valor is None:
        return None
    texto = valor.strip()
    return texto if texto else None


class ErrorDetail(BaseModel):
    code: str
    message: str


class RecommendationResponse(BaseModel):
    recommendations: list[dict] | None = None


def error_response(ctx, status_code, code, message):
    ctx.response.status_code = status_code

    return {
        "error": {
            "code": code,
            "message": message,
        }
    }


def validar_disponibilidade(ctx):
    if os.getenv("MOCK_SERVICE_UNAVAILABLE") == "true":
        return error_response(
            ctx,
            503,
            "SERVICE_UNAVAILABLE",
            "Serviço de recomendação temporariamente indisponível.",
        )

    if os.getenv("MOCK_INTERNAL_ERROR") == "true":
        return error_response(
            ctx,
            500,
            "INTERNAL_ERROR",
            "Erro interno no módulo de recomendação.",
        )

    return None


def validar_autenticacao(ctx):
    api_key = ctx.request.headers.get("X-API-Key")

    if api_key is None:
        return error_response(
            ctx,
            401,
            "AUTHENTICATION_REQUIRED",
            "Autenticação obrigatória.",
        )

    if api_key != get_api_key():
        return error_response(
            ctx,
            403,
            "FORBIDDEN",
            "Credenciais inválidas ou sem autorização.",
        )

    return None


def validar_requisicao(ctx, request):
    if request.limit < 1 or request.limit > MAX_LIMIT:
        return error_response(
            ctx,
            400,
            "INVALID_LIMIT",
            "O limite deve estar entre 1 e 20.",
        )

    if (
        normalizar_texto(request.product_id) is None
        and normalizar_texto(request.category) is None
        and normalizar_texto(request.technique) is None
        and normalizar_texto(request.region) is None
    ):
        return error_response(
            ctx,
            400,
            "INVALID_REQUEST",
            "Informe um produto de referência ou pelo menos um filtro.",
        )

    return None


def obter_produto_referencia(ctx, product_id, catalog=None):
    product_id = normalizar_texto(product_id)
    if product_id is None:
        return None, None

    reference_product = find_product(product_id, catalog=catalog)

    if reference_product is None:
        return None, error_response(
            ctx,
            404,
            "PRODUCT_NOT_FOUND",
            "Produto de referência não encontrado.",
        )

    return reference_product, None


def montar_contexto(request, reference_product):
    context = {
        "category": normalizar_texto(request.category),
        "technique": normalizar_texto(request.technique),
        "region": normalizar_texto(request.region),
    }

    if reference_product is not None:
        context["category"] = (
            context["category"] or normalizar_texto(reference_product.get("category"))
        )
        context["technique"] = (
            context["technique"] or normalizar_texto(reference_product.get("technique"))
        )
        context["region"] = (
            context["region"] or normalizar_texto(reference_product.get("region"))
        )

    return context


def registrar_desempenho(recommendations, start_time):
    elapsed = time.perf_counter() - start_time

    print(
        f"recommendation_request "
        f"results={len(recommendations)} "
        f"elapsed_ms={elapsed * 1000:.2f}"
    )


@bentoml.service(
    traffic={"timeout": 2}
)
class RecommendationService:

    @bentoml.api(
        route="/recommendations",
        input_spec=RecommendationRequest,
    )
    def recommendations(
        self,
        ctx: bentoml.Context,
        **params,
    ) -> dict:

        request = RecommendationRequest(**params)
        start_time = time.perf_counter()

        erro = validar_disponibilidade(ctx)
        if erro is not None:
            return erro

        erro = validar_autenticacao(ctx)
        if erro is not None:
            return erro

        erro = validar_requisicao(ctx, request)
        if erro is not None:
            return erro

        catalog = (
            [item.model_dump() for item in request.catalog]
            if request.catalog is not None
            else None
        )
        reference_id = normalizar_texto(request.product_id)

        reference_product, erro = obter_produto_referencia(
            ctx,
            reference_id,
            catalog=catalog,
        )
        if erro is not None:
            return erro

        context = montar_contexto(request, reference_product)

        recommendations = select_candidates(
            context=context,
            reference_product_id=reference_id,
            limit=request.limit,
            catalog=catalog,
        )

        registrar_desempenho(recommendations, start_time)

        return {
            "recommendations": recommendations
        }

    @bentoml.api(
        route="/recommendations/batch",
        input_spec=BatchRecommendationRequest,
    )
    def recommendations_batch(
        self,
        ctx: bentoml.Context,
        **params,
    ) -> dict:
        request = BatchRecommendationRequest(**params)
        start_time = time.perf_counter()

        erro = validar_disponibilidade(ctx)
        if erro is not None:
            return erro

        erro = validar_autenticacao(ctx)
        if erro is not None:
            return erro

        if request.limit < 1 or request.limit > MAX_LIMIT:
            return error_response(
                ctx,
                400,
                "INVALID_LIMIT",
                "O limite deve estar entre 1 e 20.",
            )

        catalog = (
            [item.model_dump() for item in request.catalog]
            if request.catalog is not None
            else load_catalog()
        )

        if request.product_ids:
            ids_set = {normalizar_texto(pid) for pid in request.product_ids if normalizar_texto(pid)}
            references = [item for item in catalog if item.get("product_id") in ids_set]
        else:
            references = [item for item in catalog if item.get("available", True)]

        recommendations_by_product = select_candidates_batch(
            references=references,
            catalog=catalog,
            limit=request.limit,
        )

        registrar_desempenho(recommendations_by_product, start_time)

        return {
            "total_products": len(recommendations_by_product),
            "recommendations_by_product": recommendations_by_product,
        }