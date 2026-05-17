from fastapi import APIRouter, Depends, Request

from src.infrastructure.api.deps import get_current_user
from src.infrastructure.api.limiter import limiter
from src.infrastructure.api.rag_state import get_rag, schedule_rag_warmup
from src.infrastructure.db.models import User


router = APIRouter(prefix="/api/rag", tags=["rag"])


@router.post("/warmup")
@limiter.limit("120/minute")
def warmup_rag(
    request: Request,
    current: User = Depends(get_current_user),
):
    """Précharge l'index métiers pendant le questionnaire (réduit l'attente à 100 %)."""
    schedule_rag_warmup(request.app)
    rag = get_rag(request)
    return {"ready": rag is not None}
