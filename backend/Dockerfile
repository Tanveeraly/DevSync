# ── DevSync / ProjectBoard API ───────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install runtime dependencies first (layer cached unless pyproject.toml changes)
COPY pyproject.toml .
RUN python -c "import tomllib; print('\n'.join(tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']))" > requirements.txt \
    && pip install -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

# Single worker on purpose: the WebSocket connection manager is in-memory.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
