"""Verifie que slowapi est correctement cable et que les 429 sortent au bon moment."""
import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.infrastructure.api.limiter import limiter


@pytest.fixture
def enabled_limiter():
    """Active le limiter et reset son etat avant/apres le test."""
    limiter.reset()
    limiter.enabled = True
    yield limiter
    limiter.reset()
    limiter.enabled = False


def test_health_endpoint_returns_429_after_60_calls(enabled_limiter):
    """/api/health a une limite de 60/minute. Le 61eme appel doit retourner 429."""
    c = TestClient(app)
    statuses = []
    for _ in range(62):
        statuses.append(c.get("/api/health").status_code)

    # Les 60 premiers passent
    assert all(s == 200 for s in statuses[:60]), f"Premier 60 devraient etre 200, got: {statuses[:60]}"
    # Au moins un 429 dans les 2 derniers (le 61e ou 62e)
    assert 429 in statuses[60:], f"Attendait un 429 apres 60 appels, got: {statuses[60:]}"


def test_login_endpoint_limited_to_10_per_minute(enabled_limiter):
    """/api/auth/login a une limite de 10/minute."""
    c = TestClient(app)
    statuses = []
    for _ in range(12):
        r = c.post("/api/auth/login", json={"email": "x@y.fr", "password": "Wr0ng!Pass#word"})
        statuses.append(r.status_code)

    # Les 10 premiers : 401 (creds invalides, mais la requete a ete acceptee)
    assert sum(1 for s in statuses[:10] if s == 401) == 10, \
        f"Premier 10 devraient etre 401, got: {statuses[:10]}"
    # Au moins un 429 dans les 2 derniers
    assert 429 in statuses[10:], f"Attendait un 429 apres 10 appels, got: {statuses[10:]}"


def test_limiter_disabled_by_default_in_tests():
    """Sanity check : la conftest desactive bien le limiter par defaut."""
    # Pas de fixture enabled_limiter ici → limiter doit etre off
    c = TestClient(app)
    # 100 appels devraient tous passer
    for _ in range(100):
        assert c.get("/api/health").status_code == 200
