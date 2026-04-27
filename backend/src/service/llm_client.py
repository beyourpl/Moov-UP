from __future__ import annotations

import httpx

from src.config import settings


URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterClient:
    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.LLM_MODEL

    async def chat(self, messages: list[dict], temperature: float = 0.4, max_tokens: int = 1500) -> str:
        body = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient() as c:
            r = await c.post(URL, json=body, headers=headers, timeout=60)
            r.raise_for_status()
            data = r.json()
        return data["choices"][0]["message"]["content"]
