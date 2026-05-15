from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from src.infrastructure.api.limiter import limiter
from src.infrastructure.api.schemas import (
    RegisterIn,
    LoginIn,
    AuthOut,
    UserOut,
    LoginNeeds2FAOut,
    Login2FAIn,
    TwoFASetupOut,
    TwoFAEnableIn,
    TwoFADisableIn,
)
from src.infrastructure.api.deps import get_current_user
from src.infrastructure.db.database import get_db
from src.infrastructure.db.models import User
from src.service.auth_service import (
    hash_password,
    verify_password,
    create_token,
    create_2fa_pending_token,
    decode_2fa_pending_token,
    AuthError,
)
from src.service.totp_service import new_totp_secret, provisioning_uri, verify_totp


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(u: User) -> UserOut:
    return UserOut(id=u.id, email=u.email, totp_enabled=bool(u.totp_enabled))


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
    return AuthOut(token=token, user=_user_out(user))


@router.post("/login", response_model=AuthOut | LoginNeeds2FAOut)
@limiter.limit("10/minute")
def login(request: Request, body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.totp_enabled and user.totp_secret:
        temp = create_2fa_pending_token(user.id, user.email)
        return LoginNeeds2FAOut(temp_token=temp, user=_user_out(user))
    token = create_token(user.id, user.email)
    return AuthOut(token=token, user=_user_out(user))


@router.post("/login/2fa", response_model=AuthOut)
@limiter.limit("10/minute")
def login_2fa(request: Request, body: Login2FAIn, db: Session = Depends(get_db)):
    try:
        payload = decode_2fa_pending_token(body.temp_token)
    except AuthError:
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA session")
    user = db.get(User, payload["user_id"])
    if user is None or user.email != payload["email"]:
        raise HTTPException(status_code=401, detail="Invalid or expired 2FA session")
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=401, detail="2FA not enabled")
    if not verify_totp(user.totp_secret, body.code):
        raise HTTPException(status_code=422, detail="Invalid 2FA code")
    token = create_token(user.id, user.email)
    return AuthOut(token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
@limiter.limit("60/minute")
def me(request: Request, current: User = Depends(get_current_user)):
    return _user_out(current)


@router.post("/2fa/setup", response_model=TwoFASetupOut)
@limiter.limit("10/minute")
def twofa_setup(request: Request, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if current.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA already enabled")
    secret = new_totp_secret()
    current.totp_secret = secret
    db.add(current)
    db.commit()
    uri = provisioning_uri(secret, current.email)
    return TwoFASetupOut(otpauth_uri=uri, secret=secret)


@router.post("/2fa/enable", status_code=204)
@limiter.limit("10/minute")
def twofa_enable(
    request: Request,
    body: TwoFAEnableIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA already enabled")
    if not current.totp_secret:
        raise HTTPException(status_code=400, detail="Run setup first")
    if not verify_totp(current.totp_secret, body.code):
        raise HTTPException(status_code=422, detail="Invalid 2FA code")
    current.totp_enabled = True
    db.add(current)
    db.commit()
    return Response(status_code=204)


@router.post("/2fa/disable", status_code=204)
@limiter.limit("10/minute")
def twofa_disable(
    request: Request,
    body: TwoFADisableIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if not current.totp_enabled or not current.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not enabled")
    if not verify_password(body.password, current.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")
    if not verify_totp(current.totp_secret, body.code):
        raise HTTPException(status_code=422, detail="Invalid 2FA code")
    current.totp_enabled = False
    current.totp_secret = None
    db.add(current)
    db.commit()
    return Response(status_code=204)


@router.delete("/me", status_code=204)
@limiter.limit("10/minute")
def delete_me(request: Request, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    db.delete(current)
    db.commit()
    return Response(status_code=204)
