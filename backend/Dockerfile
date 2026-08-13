FROM python:3.12-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR /app

COPY requirements.txt /app/requirements.txt
COPY wheels /wheels

RUN python -m pip install --no-cache-dir --no-index --find-links=/wheels -r /app/requirements.txt

COPY app /app/app

# Migration authority. Without these two the entrypoint cannot bring the schema
# to head, and the container would start against an unmigrated database.
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

# The entrypoint runs `alembic upgrade head` under an advisory lock and only
# then execs the command below. A failed migration stops the container.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
