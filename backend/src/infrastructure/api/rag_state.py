from __future__ import annotations

import logging

from fastapi import Request

from src.service.rag_service import RagService


logger = logging.getLogger("moovup.rag")


def get_rag(request: Request) -> RagService | None:
    """Charge l'index RAG à la première utilisation (évite OOM / timeout au boot)."""
    app = request.app
    existing = getattr(app.state, "rag", None)
    if existing is not None:
        return existing
    if getattr(app.state, "rag_load_failed", False):
        return None
    try:
        logger.info("Chargement de l'index RAG (première requête quiz/chat)...")
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
