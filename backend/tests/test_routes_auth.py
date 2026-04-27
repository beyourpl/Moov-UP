import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.infrastructure.db.database import init_db, engine
from src.infrastructure.db.models import Base


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    init_db()
    yield


def test_register_then_login_then_me():
    c = TestClient(app)
    r = c.post("/api/auth/register", json={"email": "a@b.c", "password": "Sup3rPass!word"})
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    assert r.json()["user"]["email"] == "a@b.c"

    r = c.post("/api/auth/login", json={"email": "a@b.c", "password": "Sup3rPass!word"})
    assert r.status_code == 200
    assert "token" in r.json()

    r = c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@b.c"


def test_register_duplicate_email_returns_409():
    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "x@y.z", "password": "Sup3rPass!word"})
    r = c.post("/api/auth/register", json={"email": "x@y.z", "password": "Sup3rPass!word"})
    assert r.status_code == 409


def test_login_with_wrong_password_returns_401():
    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "x@y.z", "password": "Sup3rPass!word"})
    r = c.post("/api/auth/login", json={"email": "x@y.z", "password": "Wr0ng!Pass#word"})
    assert r.status_code == 401


def test_register_with_weak_password_returns_422():
    c = TestClient(app)
    r = c.post("/api/auth/register", json={"email": "weak@x.fr", "password": "short"})
    assert r.status_code == 422
    r = c.post("/api/auth/register", json={"email": "nodigit@x.fr", "password": "longenoughbutnodigit!"})
    assert r.status_code == 422
    r = c.post("/api/auth/register", json={"email": "nosym@x.fr", "password": "longenoughwith1digit"})
    assert r.status_code == 422


def test_me_without_token_returns_401():
    c = TestClient(app)
    r = c.get("/api/auth/me")
    assert r.status_code == 401
