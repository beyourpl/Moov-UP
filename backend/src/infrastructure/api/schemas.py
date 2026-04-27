import re
from typing import Any
from pydantic import BaseModel, EmailStr, field_validator


class RegisterIn(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if len(v) < 10:
            raise ValueError("Le mot de passe doit faire au moins 10 caractères.")
        if not re.search(r"\d", v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        if not re.search(r"[^a-zA-Z0-9\s]", v):
            raise ValueError("Le mot de passe doit contenir au moins un symbole.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str


class AuthOut(BaseModel):
    token: str
    user: UserOut


class QuizAnswers(BaseModel):
    q1: str
    q2: str | None = None
    q3: str
    q4: str | None = None
    q5: str | None = None
    q6: str | None = None
    q7: str | None = None
    q8: str | None = None
    q9: str | None = None
    q10: str | None = None


class ConversationCreateIn(BaseModel):
    quiz_answers: QuizAnswers


class ConversationOut(BaseModel):
    conversation_id: int
    profile_text: str
    niveau_max: int
    initial_recommendations: list[dict[str, Any]]
    messages: list[dict[str, Any]] = []
    quiz_answers: dict[str, Any] = {}


class ChatIn(BaseModel):
    conversation_id: int
    message: str


class ChatOut(BaseModel):
    reply: str
    recommended_metiers: list[dict[str, Any]]
    updated_history: list[dict[str, Any]]
