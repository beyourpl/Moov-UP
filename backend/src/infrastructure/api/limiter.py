"""Rate limiting via slowapi.

Une instance unique de Limiter est partagée entre toutes les routes. Elle est
desactivee dans la suite de tests via la variable d'environnement
``RATE_LIMIT_ENABLED=false`` (cf. tests/conftest.py).
"""
from __future__ import annotations

import os

from slowapi import Limiter
from slowapi.util import get_remote_address


_enabled = os.environ.get("RATE_LIMIT_ENABLED", "true").lower() != "false"


def _client_ip(request) -> str:
    """IP réelle derrière Caddy / reverse proxy (X-Forwarded-For)."""
    forwarded = request.headers.get("X-Forwarded-For") if request else None
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_client_ip,
    enabled=_enabled,
)
