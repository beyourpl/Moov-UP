import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.infrastructure.db.database import init_db, engine
from src.infrastructure.db.models import Base


@pytest.fixture
def setup(monkeypatch):
    Base.metadata.drop_all(engine)
    init_db()

    class FakeRag:
        def initial_recommendations(self, *a, **k):
            return [{"metier": {"libelle": "dev"}, "formations": []}]
        def search_for_message(self, *a, **k):
            return [{"metier": {"libelle": "dev"}, "formations": []}]
    app.state.rag = FakeRag()

    async def fake_chat(self, messages, **k):
        return "Réponse simulée"
    from src.service import llm_client
    monkeypatch.setattr(llm_client.OpenRouterClient, "chat", fake_chat)

    c = TestClient(app)
    c.post("/api/auth/register", json={"email": "u@x.fr", "password": "Sup3rPass!word"})
    token = c.post("/api/auth/login", json={"email": "u@x.fr", "password": "Sup3rPass!word"}).json()["token"]
    cid = c.post("/api/conversations",
                 headers={"Authorization": f"Bearer {token}"},
                 json={"quiz_answers": {"q1": "tech", "q3": "terminale"}}).json()["conversation_id"]
    return c, token, cid


def test_chat_returns_reply_and_persists_messages(setup):
    c, token, cid = setup
    r = c.post("/api/chat",
               headers={"Authorization": f"Bearer {token}"},
               json={"conversation_id": cid, "message": "Quels métiers ?"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["reply"] == "Réponse simulée"
    assert len(body["updated_history"]) == 2


def test_chat_respects_owner(setup):
    c, _, cid = setup
    c.post("/api/auth/register", json={"email": "v@x.fr", "password": "Sup3rPass!word"})
    other = c.post("/api/auth/login", json={"email": "v@x.fr", "password": "Sup3rPass!word"}).json()["token"]
    r = c.post("/api/chat",
               headers={"Authorization": f"Bearer {other}"},
               json={"conversation_id": cid, "message": "hi"})
    assert r.status_code == 404


def test_chat_persists_all_messages(setup):
    c, token, cid = setup
    for i in range(7):
        c.post("/api/chat",
               headers={"Authorization": f"Bearer {token}"},
               json={"conversation_id": cid, "message": f"m{i}"})
    r = c.get(f"/api/conversations/{cid}", headers={"Authorization": f"Bearer {token}"})
    msgs = r.json()["messages"]
    assert len(msgs) == 14


def test_chat_embeds_only_current_message_not_history(setup):
    c, token, cid = setup
    captured_queries = []

    class CapturingRag:
        def initial_recommendations(self, *a, **k):
            return [{"metier": {"libelle": "dev"}, "formations": []}]
        def search_for_message(self, message, niveau_max, top_k=5, q1=None):
            captured_queries.append(message)
            return [{"metier": {"libelle": "dev"}, "formations": []}]

    from src.main import app
    app.state.rag = CapturingRag()

    c.post("/api/chat",
           headers={"Authorization": f"Bearer {token}"},
           json={"conversation_id": cid, "message": "Quel est le salaire d'un ingenieur systemes embarques ?"})

    c.post("/api/chat",
           headers={"Authorization": f"Bearer {token}"},
           json={"conversation_id": cid, "message": "et la duree ?"})

    assert captured_queries[0] == "Quel est le salaire d'un ingenieur systemes embarques ?"
    assert captured_queries[1] == "et la duree ?"
    assert "|" not in captured_queries[1]


def test_chat_passes_q1_to_rag(setup):
    c, token, cid = setup
    captured = {}

    class CapturingRag:
        def initial_recommendations(self, *a, **k):
            return [{"metier": {"libelle": "dev"}, "formations": []}]
        def search_for_message(self, message, niveau_max, top_k=5, q1=None):
            captured["q1"] = q1
            return [{"metier": {"libelle": "dev"}, "formations": []}]

    app.state.rag = CapturingRag()

    r = c.post("/api/chat",
               headers={"Authorization": f"Bearer {token}"},
               json={"conversation_id": cid, "message": "test"})
    assert r.status_code == 200, r.text
    assert captured["q1"] == "tech"
