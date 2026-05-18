import json
import logging
from typing import Any

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.infrastructure.api.limiter import limiter
from src.infrastructure.api.schemas import ConversationCreateIn, ConversationOut
from src.infrastructure.api.deps import get_current_user
from src.infrastructure.api.rag_state import get_rag
from src.infrastructure.db.database import get_db
from src.infrastructure.db.models import Conversation, User, Message
from src.metier.profile_builder import build_profile, InvalidQuizAnswers
from src.metier.recommendations_slim import slim_recommendations


router = APIRouter(prefix="/api/conversations", tags=["conversations"])
logger = logging.getLogger("moovup.conversations")


def _json_safe(value: Any) -> Any:
    """Évite les 500 lors de json.dumps / réponse FastAPI (numpy, etc.)."""
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, (np.floating, float)):
        f = float(value)
        if f != f:  # NaN
            return None
        return f
    if isinstance(value, (np.integer, int)):
        return int(value)
    return value


@router.post("", response_model=ConversationOut, status_code=201)
@limiter.limit("20/minute")
def create_conversation(
    request: Request,
    body: ConversationCreateIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    try:
        profile_text, niveau_max, _domains = build_profile(body.quiz_answers.model_dump())
    except InvalidQuizAnswers as e:
        raise HTTPException(status_code=400, detail=str(e))

    rag = get_rag(request)
    if rag is None:
        raise HTTPException(
            status_code=503,
            detail="Index métiers indisponible — réessaie dans quelques minutes.",
        )

    qa = body.quiz_answers.model_dump()
    try:
        recs = rag.initial_recommendations(
            profile_text,
            niveau_max=niveau_max,
            q1=qa.get("q1"),
            specialty=qa.get("specialty"),
            quiz_answers=qa,
        )
        recs = _json_safe(slim_recommendations(recs))
    except Exception:
        logger.exception(
            "[create_conversation] RAG failed user=%s q1=%s",
            current.email,
            qa.get("q1"),
        )
        raise HTTPException(
            status_code=500,
            detail="Génération du parcours impossible. Réessaie dans un instant.",
        )

    logger.info(
        "[create_conversation] user=%s q1=%s niveau_max=%d top=%s formations=%s",
        current.email,
        qa.get("q1"),
        niveau_max,
        [(r["metier"].get("libelle", "?")[:50], r.get("score")) for r in recs],
        [len(r.get("formations") or []) for r in recs],
    )

    qa_dump: dict[str, Any] = qa
    try:
        conv = Conversation(
            user_id=current.id,
            profile_text=profile_text,
            niveau_max=niveau_max,
            q1=str(qa.get("q1") or ""),
            initial_metiers=json.dumps(recs, ensure_ascii=False),
            quiz_answers_json=json.dumps(qa_dump, ensure_ascii=False),
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
    except Exception:
        db.rollback()
        logger.exception("[create_conversation] DB persist failed user=%s", current.email)
        raise HTTPException(
            status_code=500,
            detail="Enregistrement du parcours impossible. Réessaie.",
        )

    return ConversationOut(
        conversation_id=conv.id,
        profile_text=profile_text,
        niveau_max=niveau_max,
        initial_recommendations=recs,
        messages=[],
        quiz_answers=qa_dump,
    )


@router.get("/{cid}", response_model=ConversationOut)
@limiter.limit("60/minute")
def get_conversation(
    request: Request,
    cid: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    conv = db.get(Conversation, cid)
    if conv is None or conv.user_id != current.id:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    msgs = (db.query(Message)
              .filter(Message.conversation_id == cid)
              .order_by(Message.created_at)
              .all())
    try:
        qa = json.loads(conv.quiz_answers_json)
    except (json.JSONDecodeError, TypeError):
        qa = {}
    return ConversationOut(
        conversation_id=conv.id,
        profile_text=conv.profile_text,
        niveau_max=conv.niveau_max,
        initial_recommendations=json.loads(conv.initial_metiers),
        messages=[{"role": m.role, "content": m.content} for m in msgs],
        quiz_answers=qa if isinstance(qa, dict) else {},
    )
