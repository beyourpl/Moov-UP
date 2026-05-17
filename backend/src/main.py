import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.config import settings
from src.infrastructure.api.limiter import limiter
from src.infrastructure.db.database import init_db


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception:
        logging.getLogger("moovup").exception(
            "init_db failed — API en mode dégradé (vérifie DATABASE_URL et permissions /app/db)"
        )
    app.state.rag = None
    app.state.rag_load_failed = False
    logging.getLogger("moovup").info("Moov'Up API prête (RAG chargé à la demande)")
    yield


app = FastAPI(title="Moov'Up API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_origins = [o.strip() for o in settings.ALLOWED_ORIGIN.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
@limiter.limit("60/minute")
def health(request: Request):
    rag_ok = getattr(request.app.state, "rag", None) is not None
    rag_failed = bool(getattr(request.app.state, "rag_load_failed", False))
    llm_ok = settings.OPENROUTER_API_KEY not in ("", "missing")
    return {
        "status": "ok",
        "flavor": "fastapi",
        "coach_llm_configured": llm_ok,
        "coach_rag_available": rag_ok,
        "coach_rag_load_failed": rag_failed,
    }


from src.infrastructure.api.routes import auth as auth_routes

app.include_router(auth_routes.router)
from src.infrastructure.api.routes import conversations as conv_routes, chat as chat_routes
app.include_router(conv_routes.router)
app.include_router(chat_routes.router)
