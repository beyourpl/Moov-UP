from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from src.infrastructure.api.deps import get_current_user
from src.infrastructure.api.limiter import limiter
from src.infrastructure.db.models import User
from src.service.onisep_localize import localize_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


class LocalizeRecommendationsIn(BaseModel):
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    language: str = "fr"


class LocalizeRecommendationsOut(BaseModel):
    recommendations: list[dict[str, Any]]


@router.post("/localize", response_model=LocalizeRecommendationsOut)
@limiter.limit("20/minute")
async def localize_recommendations_route(
    request: Request,
    body: LocalizeRecommendationsIn,
    current: User = Depends(get_current_user),
):
    _ = current
    localized = await localize_recommendations(body.recommendations, body.language)
    return LocalizeRecommendationsOut(recommendations=localized)
