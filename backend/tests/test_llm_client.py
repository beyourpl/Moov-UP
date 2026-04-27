import pytest
import httpx

from src.service.llm_client import OpenRouterClient


class FakeResp:
    def __init__(self, status, payload):
        self.status_code = status
        self._p = payload
    def json(self): return self._p
    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("fail", request=None, response=None)


@pytest.mark.asyncio
async def test_chat_returns_assistant_text(monkeypatch):
    captured = {}

    async def fake_post(self, url, json=None, headers=None, timeout=None):
        captured["body"] = json
        captured["headers"] = headers
        return FakeResp(200, {"choices": [{"message": {"content": "Bonjour élève"}}]})

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    client = OpenRouterClient(api_key="k", model="m")
    out = await client.chat([{"role": "user", "content": "hi"}])
    assert out == "Bonjour élève"
    assert captured["body"]["model"] == "m"
    assert captured["headers"]["Authorization"] == "Bearer k"
