import os

import bentoml
from pydantic import BaseModel

from app.config import DEFAULT_LIMIT, MAX_LIMIT, get_api_key
from app.fallback import select_candidates, select_candidates_batch
from app.observability import iniciar_cronometro, registrar_execucao
from app.catalog import attributes_match, available_products, normalize_filter
from app.data_log import chamador
from app.repository import (
    get_catalog_items,
    get_repository_available_products,
    get_repository_product,
    get_repository_products_by_ids,
)


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


def resolver_catalogo_requisicao(catalog):
    items = (
        [item.model_dump() for item in catalog]
        if catalog is not None
        else None
    )
    return get_catalog_items(catalog=items)


def normalizar_texto(valor):
    return normalize_filter(valor)


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

    reference_product = get_repository_product(product_id, catalog=catalog)

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


def _atributos_do_contexto(valores):
    """Mantém só os atributos preenchidos (category/technique/region)."""
    return {
        chave: valores.get(chave)
        for chave in ("category", "technique", "region")
        if valores.get(chave) is not None
    }


def contar_candidatos(context, reference_id, catalog):
    """Devolve (candidatos, analisados, compativeis) da busca individual.

    candidatos: produtos disponíveis, sem o de referência.
    analisados: candidatos examinados pelo fallback (todos, inclusive os
    rejeitados por não casarem com os filtros).
    compativeis: candidatos que casam com o filtro mais amplo do fallback
    (categoria, ou técnica/região quando não há categoria).
    """
    candidatos = available_products(reference_id, catalog=catalog)
    atributos = (
        ("category",)
        if context.get("category") is not None
        else ("technique", "region")
    )
    compativeis = [
        item
        for item in candidatos
        if any(
            attributes_match(context.get(atributo), item.get(atributo))
            for atributo in atributos
        )
    ]
    return len(candidatos), len(candidatos), len(compativeis)


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
        with chamador("POST /recommendations"):
            return self._recommendations(ctx, params)

    def _recommendations(self, ctx, params) -> dict:
        start_time = iniciar_cronometro()
        try:
            return self._executar_recommendations(ctx, params, start_time)
        except Exception as error:
            product_id = params.get("product_id")
            registrar_execucao(
                rota="/recommendations",
                status="erro",
                start_time=start_time,
                product_id=product_id if isinstance(product_id, str) else None,
                codigo_erro=type(error).__name__,
                detalhe=str(error),
            )
            raise

    def _executar_recommendations(self, ctx, params, start_time) -> dict:
        request = RecommendationRequest(**params)
        reference_id = normalizar_texto(request.product_id)
        origem_catalogo = "payload" if request.catalog is not None else "repository_or_json"
        filtros_pedido = {
            "product_id": reference_id,
            "category": normalizar_texto(request.category),
            "technique": normalizar_texto(request.technique),
            "region": normalizar_texto(request.region),
            "limit": request.limit,
        }
        filtros_pedido = {k: v for k, v in filtros_pedido.items() if v is not None}

        erro = validar_disponibilidade(ctx)
        if erro is not None:
            registrar_execucao(
                rota="/recommendations",
                status="erro",
                start_time=start_time,
                product_id=reference_id,
                origem_catalogo=origem_catalogo,
                codigo_erro=erro["error"]["code"],
                filtros=filtros_pedido,
            )
            return erro

        erro = validar_autenticacao(ctx)
        if erro is not None:
            registrar_execucao(
                rota="/recommendations",
                status="erro",
                start_time=start_time,
                product_id=reference_id,
                origem_catalogo=origem_catalogo,
                codigo_erro=erro["error"]["code"],
                filtros=filtros_pedido,
            )
            return erro

        erro = validar_requisicao(ctx, request)
        if erro is not None:
            registrar_execucao(
                rota="/recommendations",
                status="erro",
                start_time=start_time,
                product_id=reference_id,
                origem_catalogo=origem_catalogo,
                codigo_erro=erro["error"]["code"],
                filtros=filtros_pedido,
            )
            return erro

        catalog = resolver_catalogo_requisicao(request.catalog)

        reference_product, erro = obter_produto_referencia(
            ctx,
            reference_id,
            catalog=catalog,
        )
        if erro is not None:
            registrar_execucao(
                rota="/recommendations",
                status="erro",
                start_time=start_time,
                product_id=reference_id,
                origem_catalogo=origem_catalogo,
                codigo_erro=erro["error"]["code"],
                filtros=filtros_pedido,
            )
            return erro

        context = montar_contexto(request, reference_product)

        recommendations = select_candidates(
            context=context,
            reference_product_id=reference_id,
            limit=request.limit,
            catalog=catalog,
        )

        total_candidatos, total_analisados, total_compativeis = contar_candidatos(
            context, reference_id, catalog
        )
        registrar_execucao(
            rota="/recommendations",
            status="sucesso",
            start_time=start_time,
            product_id=reference_id,
            origem_catalogo=origem_catalogo,
            total_resultados=len(recommendations),
            filtros={
                **_atributos_do_contexto(context),
                **{
                    k: v
                    for k, v in filtros_pedido.items()
                    if k in ("product_id", "limit")
                },
            },
            contexto_referencia=_atributos_do_contexto(reference_product or {}),
            total_catalogo=len(catalog),
            total_candidatos=total_candidatos,
            total_analisados=total_analisados,
            total_compativeis=total_compativeis,
            total_sugestoes=len(recommendations),
        )

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
        with chamador("POST /recommendations/batch"):
            return self._recommendations_batch(ctx, params)

    def _recommendations_batch(self, ctx, params) -> dict:
        start_time = iniciar_cronometro()
        try:
            return self._executar_recommendations_batch(ctx, params, start_time)
        except Exception as error:
            registrar_execucao(
                rota="/recommendations/batch",
                status="erro",
                start_time=start_time,
                codigo_erro=type(error).__name__,
                detalhe=str(error),
            )
            raise

    def _executar_recommendations_batch(self, ctx, params, start_time) -> dict:
        request = BatchRecommendationRequest(**params)
        filtros_pedido = {
            "limit": request.limit,
            "product_ids_informados": len(request.product_ids or []),
        }
        origem_catalogo = "payload" if request.catalog is not None else "repository_or_json"

        erro = validar_disponibilidade(ctx)
        if erro is not None:
            registrar_execucao(
                rota="/recommendations/batch",
                status="erro",
                start_time=start_time,
                origem_catalogo=origem_catalogo,
                codigo_erro=erro["error"]["code"],
                filtros=filtros_pedido,
            )
            return erro

        erro = validar_autenticacao(ctx)
        if erro is not None:
            registrar_execucao(
                rota="/recommendations/batch",
                status="erro",
                start_time=start_time,
                origem_catalogo=origem_catalogo,
                codigo_erro=erro["error"]["code"],
                filtros=filtros_pedido,
            )
            return erro

        if request.limit < 1 or request.limit > MAX_LIMIT:
            registrar_execucao(
                rota="/recommendations/batch",
                status="erro",
                start_time=start_time,
                origem_catalogo=origem_catalogo,
                codigo_erro="INVALID_LIMIT",
                filtros=filtros_pedido,
            )
            return error_response(
                ctx,
                400,
                "INVALID_LIMIT",
                "O limite deve estar entre 1 e 20.",
            )

        catalog = resolver_catalogo_requisicao(request.catalog)

        if request.product_ids:
            references = get_repository_products_by_ids(
                request.product_ids,
                catalog=catalog,
            )
        else:
            references = get_repository_available_products(catalog=catalog)

        recommendations_by_product = select_candidates_batch(
            references=references,
            catalog=catalog,
            limit=request.limit,
        )

        registrar_execucao(
            rota="/recommendations/batch",
            status="sucesso",
            start_time=start_time,
            origem_catalogo=origem_catalogo,
            total_resultados=len(recommendations_by_product),
            filtros=filtros_pedido,
            total_catalogo=len(catalog),
            total_referencias=len(references),
            total_sugestoes=sum(
                len(itens) for itens in recommendations_by_product.values()
            ),
        )

        return {
            "total_products": len(recommendations_by_product),
            "recommendations_by_product": recommendations_by_product,
        }
