# Módulo de IA (BentoML) do Origem, em três estágios.
# 1. deps:    cria uma venv com as dependências do requirements.txt.
# 2. test:    roda o pytest dentro da imagem. Se um teste falhar, o build da imagem falha
#             e nada quebrado chega ao runtime.
# 3. runtime: imagem final só com a venv, o código e os dados. Sem a pasta tests/.

FROM python:3.13-slim AS deps
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install -r requirements.txt

FROM deps AS test
WORKDIR /app
COPY . .
ENV PYTHONPATH=/app
RUN python -m pytest tests -p no:cacheprovider -q

FROM python:3.13-slim AS runtime
ENV PATH="/venv/bin:$PATH" \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=3001
RUN useradd --create-home --uid 10001 ia
COPY --from=deps /venv /venv
# Copiar algo do estágio de teste obriga o Docker a executá-lo antes do runtime.
COPY --from=test /app/app /app/app
COPY --from=test /app/data /app/data
WORKDIR /app
USER ia
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/readyz', timeout=4)" || exit 1
# PORT vem do ambiente (o Render define a sua); 3001 é o padrão local.
CMD ["sh", "-c", "bentoml serve app.service:RecommendationService --host 0.0.0.0 --port ${PORT}"]
