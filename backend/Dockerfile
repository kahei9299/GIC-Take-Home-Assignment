FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

ARG PIP_INDEX_URL=https://pypi.org/simple
ARG PIP_TRUSTED_HOST=pypi.org
ARG PIP_DEFAULT_TIMEOUT=120

ENV PIP_INDEX_URL=${PIP_INDEX_URL} \
    PIP_TRUSTED_HOST=${PIP_TRUSTED_HOST} \
    PIP_DEFAULT_TIMEOUT=${PIP_DEFAULT_TIMEOUT}

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN pip install --no-cache-dir .

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

CMD ["/app/docker-entrypoint.sh"]
