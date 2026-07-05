"""Tests du flux OAuth Google Calendar (aucun appel réseau)."""
from unittest.mock import MagicMock
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.crypto import TokenCipher, generate_key
from app.db.repo import get_repo
from app.main import app
from app.routers.calendar import get_gcal
from app.services.calendar_sync import build_authorize_url

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}
FERNET_KEY = generate_key()


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)
    monkeypatch.setattr(settings, "google_client_id", "cid.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "google_client_secret", "csecret")
    monkeypatch.setattr(settings, "token_encryption_key", FERNET_KEY)


@pytest.fixture
def repo():
    mock = MagicMock()
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.pop(get_repo, None)


@pytest.fixture
def gcal():
    mock = MagicMock()
    app.dependency_overrides[get_gcal] = lambda: mock
    yield mock
    app.dependency_overrides.pop(get_gcal, None)


@pytest.fixture
def client():
    return TestClient(app)


# ------------------------------------------------------------ authorize-url
def test_build_authorize_url_params():
    url = build_authorize_url("cid", "http://localhost:3000/cb", "st4te")
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    assert parsed.netloc == "accounts.google.com"
    assert q["client_id"] == ["cid"]
    assert q["redirect_uri"] == ["http://localhost:3000/cb"]
    assert q["state"] == ["st4te"]
    assert q["access_type"] == ["offline"]
    assert q["prompt"] == ["consent"]  # garantit le refresh_token
    assert "calendar.events" in q["scope"][0]


def test_authorize_url_endpoint(client, repo):
    r = client.post("/calendar/oauth/authorize-url", headers=HEADERS,
                    json={"redirect_uri": "http://localhost:3000/cb",
                          "state": "abc"})
    assert r.status_code == 200
    assert r.json()["url"].startswith("https://accounts.google.com")


def test_authorize_url_requires_internal_key(client, repo):
    r = client.post("/calendar/oauth/authorize-url",
                    json={"redirect_uri": "x", "state": "y"},
                    headers={"X-Internal-Key": "wrong"})
    assert r.status_code == 401


def test_authorize_url_503_without_google_config(client, repo, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    r = client.post("/calendar/oauth/authorize-url", headers=HEADERS,
                    json={"redirect_uri": "x", "state": "y"})
    assert r.status_code == 503


# ---------------------------------------------------------------- exchange
def test_exchange_stores_encrypted_tokens(client, repo, gcal):
    gcal.exchange_code.return_value = {
        "access_token": "at-123",
        "refresh_token": "rt-456",
        "expires_in": 3599,
        "scope": "https://www.googleapis.com/auth/calendar.events",
    }
    r = client.post("/calendar/oauth/exchange", headers=HEADERS, json={
        "user_id": "u1", "code": "authcode",
        "redirect_uri": "http://localhost:3000/cb",
    })
    assert r.status_code == 200
    assert r.json() == {"linked": True}

    row = repo.upsert_oauth_token.call_args[0][0]
    assert row["user_id"] == "u1"
    assert row["provider"] == "google_calendar"
    # Chiffré en base, déchiffrable avec la clé serveur
    cipher = TokenCipher(FERNET_KEY)
    assert row["access_token_encrypted"] != "at-123"
    assert cipher.decrypt(row["access_token_encrypted"]) == "at-123"
    assert cipher.decrypt(row["refresh_token_encrypted"]) == "rt-456"
    assert row["scopes"] == ["https://www.googleapis.com/auth/calendar.events"]


def test_exchange_rejects_missing_refresh_token(client, repo, gcal):
    gcal.exchange_code.return_value = {"access_token": "at", "expires_in": 3600}
    r = client.post("/calendar/oauth/exchange", headers=HEADERS, json={
        "user_id": "u1", "code": "c", "redirect_uri": "http://x/cb",
    })
    assert r.status_code == 502
    repo.upsert_oauth_token.assert_not_called()


def test_exchange_maps_google_error_to_502(client, repo, gcal):
    gcal.exchange_code.side_effect = RuntimeError("invalid_grant")
    r = client.post("/calendar/oauth/exchange", headers=HEADERS, json={
        "user_id": "u1", "code": "bad", "redirect_uri": "http://x/cb",
    })
    assert r.status_code == 502


# ------------------------------------------------------------------ status
def test_status_not_linked(client, repo):
    repo.get_oauth_token.return_value = None
    r = client.get("/calendar/status", params={"user_id": "u1"}, headers=HEADERS)
    assert r.json() == {"linked": False}


def test_status_linked(client, repo):
    repo.get_oauth_token.return_value = {
        "expires_at": "2026-07-04T18:00:00+00:00",
        "scopes": ["s1"],
    }
    r = client.get("/calendar/status", params={"user_id": "u1"}, headers=HEADERS)
    body = r.json()
    assert body["linked"] is True
    assert body["scopes"] == ["s1"]


# ------------------------------------------------------------------ unlink
def test_unlink_deletes_tokens(client, repo):
    r = client.delete("/calendar/tokens/u1", headers=HEADERS)
    assert r.status_code == 200
    repo.delete_oauth_token.assert_called_once_with("u1", "google_calendar")
