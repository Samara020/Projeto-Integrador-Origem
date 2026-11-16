import os
import time

import bentoml
from pydantic import BaseModel

from app.catalog import find_product
from app.config import API_KEY, DEFAULT_LIMIT, MAX_LIMIT
from app.fallback import select_candidates


class RecommendationRequest(BaseModel):
    product_id: str | None = None
    category: str | None = None
    technique: str | None = None
    region: str | None = None
    limit: int = DEFAULT_LIMIT


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

    if api_key != API_KEY:
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
        request.product_id is None
        and request.category is None
        and request.technique is None
        and request.region is None
    ):
        return error_response(
            ctx,
            400,
            "INVALID_REQUEST",
            "Informe um produto de referência ou pelo menos um filtro.",
        )

    return None


def obter_produto_referencia(ctx, product_id):
    if product_id is None:
        return None, None

    reference_product = find_product(product_id)

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
        "category": request.category,
        "technique": request.technique,
        "region": request.region,
    }

    if reference_product is not None:
        context["category"] = (
            context["category"] or reference_product["category"]
        )
        context["technique"] = (
            context["technique"] or reference_product["technique"]
        )
        context["region"] = (
            context["region"] or reference_product["region"]
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

        reference_product, erro = obter_produto_referencia(
            ctx,
            request.product_id,
        )
        if erro is not None:
            return erro

        context = montar_contexto(request, reference_product)

        recommendations = select_candidates(
            context=context,
            reference_product_id=request.product_id,
            limit=request.limit,
        )

        registrar_desempenho(recommendations, start_time)

        return {
            "recommendations": recommendations
        }