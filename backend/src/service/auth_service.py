from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError

from src.config import settings


class AuthError(Exception):
    pass


_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ALGO = "HS256"
_EXPIRES = timedelta(days=7)


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + _EXPIRES,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=_ALGO)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[_ALGO])
        return {"user_id": payload["user_id"], "email": payload["email"]}
    except (JWTError, KeyError) as e:
        raise AuthError(str(e))
