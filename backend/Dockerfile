FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/root/.cache/huggingface \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
COPY src/ ./src/
# PyTorch depuis PyPI embarque CUDA (~2 Go+ de wheels NVIDIA) : inutile sur VPS CPU.
# On fixe d’abord torch CPU (index PyTorch), puis le reste — déploiements beaucoup plus rapides / légers.
RUN pip install --upgrade pip \
 && pip install --index-url https://download.pytorch.org/whl/cpu torch \
 && pip install -e .
COPY data/ ./data/
COPY scripts/ ./scripts/
COPY tests/ ./tests/

EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
