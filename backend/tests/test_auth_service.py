import pytest
from src.service.auth_service import (
    hash_password, verify_password,
    create_token, decode_token, AuthError,
)


def test_hash_then_verify_password_succeeds():
    h = hash_password("hunter2")
    assert h != "hunter2"
    assert verify_password("hunter2", h) is True
    assert verify_password("wrong", h) is False


def test_create_then_decode_token_round_trip():
    token = create_token(user_id=42, email="me@example.com")
    payload = decode_token(token)
    assert payload["user_id"] == 42
    assert payload["email"] == "me@example.com"


def test_decode_invalid_token_raises():
    with pytest.raises(AuthError):
        decode_token("not.a.token")
