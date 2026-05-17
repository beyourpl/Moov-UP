from __future__ import annotations

import logging
import threading

from fastapi import FastAPI, Request

from src.service.rag_service import RagService


logger = logging.getLogger("moovup.rag")
_warmup_lock = threading.Lock()


def _load_rag_into_app(app: FastAPI) -> RagService | None:
    if getattr(app.state, "rag", None) is not None:
        return app.state.rag
    if getattr(app.state, "rag_load_failed", False):
        return None
    try:
        logger.info("Chargement de l'index RAG…")
        app.state.rag = RagService()
        logger.info("Index RAG prêt")
        return app.state.rag
    except FileNotFoundError:
        logger.error("Fichiers RAG absents (DATA_DIR / metiers.faiss)")
        app.state.rag_load_failed = True
        return None
    except Exception:
        logger.exception("Échec chargement RAG")
        app.state.rag_load_failed = True
        return None


def schedule_rag_warmup(app: FastAPI) -> None:
    """Démarre le chargement RAG en arrière-plan (idempotent)."""
    if getattr(app.state, "rag", None) is not None:
        return
    if getattr(app.state, "rag_warmup_started", False):
        return
    with _warmup_lock:
        if getattr(app.state, "rag_warmup_started", False):
            return
        app.state.rag_warmup_started = True

        def _run() -> None:
            _load_rag_into_app(app)

        threading.Thread(target=_run, daemon=True, name="rag-warmup").start()


def get_rag(request: Request) -> RagService | None:
    """Retourne le service RAG, en le chargeant au besoin (bloquant)."""
    app = request.app
    existing = getattr(app.state, "rag", None)
    if existing is not None:
        return existing
    if getattr(app.state, "rag_load_failed", False):
        return None
    schedule_rag_warmup(app)
    # Attente courte si un warm-up est déjà en cours
    for _ in range(120):
        loaded = getattr(app.state, "rag", None)
        if loaded is not None:
            return loaded
        if getattr(app.state, "rag_load_failed", False):
            return None
        if not getattr(app.state, "rag_warmup_started", False):
            break
        threading.Event().wait(0.5)
    return _load_rag_into_app(app)
