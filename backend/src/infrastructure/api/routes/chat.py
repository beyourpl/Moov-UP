import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from src.infrastructure.api.limiter import limiter
from src.infrastructure.api.schemas import ChatIn, ChatOut
from src.infrastructure.api.deps import get_current_user
from src.infrastructure.db.database import get_db
from src.infrastructure.db.models import Conversation, Message, User
from src.metier.prompt import build_prompt, sanitize_chat_reply
from src.service.llm_client import OpenRouterClient


router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger("moovup.chat")

HISTORY_WINDOW_MESSAGES = 10  # 10 = 5 pairs of user+assistant exchanges


def _last_messages(db: Session, conversation_id: int, limit: int) -> list[dict]:
    rows = (db.query(Message)
              .filter(Message.conversation_id == conversation_id)
              .order_by(Message.created_at.desc())
              .limit(limit)
              .all())
    rows.reverse()
    return [{"role": r.role, "content": r.content} for r in rows]


@router.post("", response_model=ChatOut)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    body: ChatIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    conv = db.get(Conversation, body.conversation_id)
    if conv is None or conv.user_id != current.id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    rag = request.app.state.rag
    if rag is None:
        raise HTTPException(status_code=503, detail="RAG index not built yet")

    history = _last_messages(db, conv.id, limit=HISTORY_WINDOW_MESSAGES)

    logger.info("[chat] user=%s conv=%s msg=%r history_msgs=%d",
                current.email, conv.id, body.message, len(history))

    rag_ctx = rag.search_for_message(body.message, niveau_max=conv.niveau_max, top_k=5, q1=conv.q1)
    metier_with_scores = [
        (hit["metier"].get("libelle", "?")[:50], hit.get("score"))
        for hit in rag_ctx
    ]
    logger.info("[chat] rag top_metiers (libellé, score): %s", metier_with_scores)

    messages = build_prompt(conv.profile_text, history, rag_ctx, body.message)
    logger.debug("[chat] prompt_system=%r", messages[0]["content"][:300])
    logger.debug("[chat] prompt_user_block=%r", messages[1]["content"][:1500])

    client = OpenRouterClient()
    reply = await client.chat(messages)
    reply = sanitize_chat_reply(reply)
    logger.info("[chat] llm_reply (%d chars): %s", len(reply), reply[:300].replace("\n", " "))

    db.add(Message(conversation_id=conv.id, role="user", content=body.message))
    db.add(Message(conversation_id=conv.id, role="assistant", content=reply))
    db.commit()

    updated = _last_messages(db, conv.id, limit=HISTORY_WINDOW_MESSAGES)
    return ChatOut(reply=reply, recommended_metiers=rag_ctx, updated_history=updated)
