import logging
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from src.config import settings
from src.infrastructure.db.models import Base


logger = logging.getLogger("moovup")


def _ensure_sqlite_dir(url: str) -> None:
    if url.startswith("sqlite:///"):
        path = Path(url.replace("sqlite:///", "", 1))
        path.parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_dir(settings.DATABASE_URL)
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _migrate_sqlite_users_2fa() -> None:
    if not str(settings.DATABASE_URL).startswith("sqlite"):
        return
    try:
        insp = inspect(engine)
        if not insp.has_table("users"):
            return
        cols = {c["name"] for c in insp.get_columns("users")}
        with engine.begin() as conn:
            if "totp_secret" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR"))
            if "totp_enabled" not in cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT 0"))
    except Exception:
        logger.exception("SQLite migration users 2FA columns")


def init_db() -> None:
    Base.metadata.create_all(engine)
    _migrate_sqlite_users_2fa()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
