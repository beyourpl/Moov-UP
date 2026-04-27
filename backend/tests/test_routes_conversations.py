import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.infrastructure.db.database import init_db, engine
from src.infrastructure.db.models import Base


@pytest.fixture
def client_with_user():
    Base.metadata.drop_all(engine)
    init_db()

    class FakeRag:
        def initial_recommendations(self, profile, niveau_max, top_k=5, q1=None):
            return [{"metier": {"libelle": "dev", "sous_domaine_key": "informatique"}, "formations": []}]
        def search_for_message(self, msg, niveau_max, top_k=5, q1=None):
            return [{"metier": {"libelle": "dev", "sous_domaine_key": "informatique"}, "formations": []}]

    app.state.rag = FakeRag()
    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "u@x.fr", "password": "Sup3rPass!word"})
    token = c.post("/api/auth/login", json={"email": "u@x.fr", "password": "Sup3rPass!word"}).json()["token"]
    return c, token


def test_create_conversation_returns_id_and_initial_recs(client_with_user):
    c, token = client_with_user
    r = c.post("/api/conversations",
               headers={"Authorization": f"Bearer {token}"},
               json={"quiz_answers": {"q1": "tech", "q3": "terminale"}})
    assert r.status_code == 201, r.text
    body = r.json()
    assert "conversation_id" in body
    assert "profile_text" in body
    assert len(body["initial_recommendations"]) == 1
    assert body.get("niveau_max") == 4
    assert body.get("quiz_answers", {}).get("q1") == "tech"
    assert body.get("quiz_answers", {}).get("q3") == "terminale"

    # Verify q1 is persisted in DB
    from src.infrastructure.db.database import SessionLocal
    from src.infrastructure.db.models import Conversation
    with SessionLocal() as s:
        conv = s.get(Conversation, body["conversation_id"])
        assert conv.q1 == "tech"


def test_get_conversation_returns_owner_only(client_with_user):
    c, token = client_with_user
    cid = c.post("/api/conversations",
                 headers={"Authorization": f"Bearer {token}"},
                 json={"quiz_answers": {"q1": "tech", "q3": "terminale"}}).json()["conversation_id"]
    r = c.get(f"/api/conversations/{cid}", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["conversation_id"] == cid
    assert body.get("niveau_max") == 4
    assert body.get("quiz_answers", {}).get("q3") == "terminale"

    c.post("/api/auth/register", json={"email": "v@x.fr", "password": "Sup3rPass!word"})
    other_token = c.post("/api/auth/login", json={"email": "v@x.fr", "password": "Sup3rPass!word"}).json()["token"]
    r = c.get(f"/api/conversations/{cid}", headers={"Authorization": f"Bearer {other_token}"})
    assert r.status_code == 404
