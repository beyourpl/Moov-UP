from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.infrastructure.db.database import get_db
from src.infrastructure.db.models import User
from src.service.auth_service import decode_token, AuthError


_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = decode_token(creds.credentials)
    except AuthError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(User, payload["user_id"])
    if user is None:
        raise HTTPException(status_code=401, detail="Unknown user")
    return user
