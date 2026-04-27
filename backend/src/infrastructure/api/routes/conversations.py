import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.infrastructure.api.limiter import limiter
from src.infrastructure.api.schemas import ConversationCreateIn, ConversationOut
from src.infrastructure.api.deps import get_current_user
from src.infrastructure.db.database import get_db
from src.infrastructure.db.models import Conversation, User, Message
from src.metier.profile_builder import build_profile, InvalidQuizAnswers


router = APIRouter(prefix="/api/conversations", tags=["conversations"])


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

    rag = request.app.state.rag
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG index not built yet — run scripts.scrape and scripts.build_index")
    q1 = body.quiz_answers.q1
    recs = rag.initial_recommendations(profile_text, niveau_max=niveau_max, top_k=5, q1=q1)
    import logging
    logging.getLogger("moovup.conversations").info(
        "[create_conversation] user=%s q1=%s niveau_max=%d top5=%s",
        current.email, q1, niveau_max,
        [(r["metier"].get("libelle", "?")[:50], r.get("score")) for r in recs],
    )

    qa_dump: dict[str, Any] = body.quiz_answers.model_dump()
    conv = Conversation(
        user_id=current.id,
        profile_text=profile_text,
        niveau_max=niveau_max,
        q1=q1,
        initial_metiers=json.dumps(recs, ensure_ascii=False),
        quiz_answers_json=json.dumps(qa_dump, ensure_ascii=False),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

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
        raise HTTPException(status_code=404, detail="Not found")
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
