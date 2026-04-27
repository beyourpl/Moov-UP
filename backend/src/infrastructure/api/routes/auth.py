from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.infrastructure.api.limiter import limiter
from src.infrastructure.api.schemas import RegisterIn, LoginIn, AuthOut, UserOut
from src.infrastructure.api.deps import get_current_user
from src.infrastructure.db.database import get_db
from src.infrastructure.db.models import User
from src.service.auth_service import hash_password, verify_password, create_token


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthOut, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterIn, db: Session = Depends(get_db)):
    user = User(email=body.email.lower(), password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already registered")
    db.refresh(user)
    token = create_token(user.id, user.email)
    return AuthOut(token=token, user=UserOut(id=user.id, email=user.email))


@router.post("/login", response_model=AuthOut)
@limiter.limit("10/minute")
def login(request: Request, body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user.id, user.email)
    return AuthOut(token=token, user=UserOut(id=user.id, email=user.email))


@router.get("/me", response_model=UserOut)
@limiter.limit("60/minute")
def me(request: Request, current: User = Depends(get_current_user)):
    return UserOut(id=current.id, email=current.email)


@router.delete("/me", status_code=204)
@limiter.limit("10/minute")
def delete_me(request: Request, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    db.delete(current)
    db.commit()
    return Response(status_code=204)
