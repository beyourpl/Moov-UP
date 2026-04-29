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
    init_db()
    if not getattr(app.state, "rag", None):
        try:
            from src.service.rag_service import RagService
            app.state.rag = RagService()
        except FileNotFoundError:
            app.state.rag = None
        except Exception:
            logging.getLogger("moovup").exception(
                "RAG / SentenceTransformer indisponible au démarrage — "
                "auth et /api/health OK ; quiz/chat nécessitent le modèle HF (voir logs)."
            )
            app.state.rag = None
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
    return {"status": "ok"}


from src.infrastructure.api.routes import auth as auth_routes

app.include_router(auth_routes.router)
from src.infrastructure.api.routes import conversations as conv_routes, chat as chat_routes
app.include_router(conv_routes.router)
app.include_router(chat_routes.router)
