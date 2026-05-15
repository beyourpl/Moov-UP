from fastapi.testclient import TestClient
from src.main import app


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["flavor"] == "fastapi"
    assert "coach_llm_configured" in data and "coach_rag_available" in data
