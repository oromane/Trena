"""Tests Garmin : mapping des données et endpoints (client mocké, zéro réseau).

Inclut les tests du flow de login 2 étapes (MFA) utilisant
return_on_mfa=True et resume_login() de garminconnect.
"""
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.crypto import TokenCipher, generate_key
from app.db.repo import get_repo
from app.main import app
from app.services.garmin_sync import (
    GarminAuthError,
    GarminClient,
    GarminMfaRequired,
    complete_mfa,
    sync_user,
)

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}
FERNET_KEY = generate_key()


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)
    monkeypatch.setattr(settings, "token_encryption_key", FERNET_KEY)


@pytest.fixture
def repo():
    mock = MagicMock()
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def _fake_garmin(hrv=55.0, sleep_secs=27000, rhr=48, stress=32):
    g = MagicMock()
    g.get_hrv_data.return_value = {"hrvSummary": {"lastNightAvg": hrv}}
    g.get_sleep_data.return_value = {
        "dailySleepDTO": {"sleepTimeSeconds": sleep_secs}
    }
    g.get_user_summary.return_value = {
        "restingHeartRate": rhr, "averageStressLevel": stress,
    }
    g.client.dumps.return_value = "garth-token-blob"
    return g


# ------------------------------------------------------------- fetch_daily
def test_fetch_daily_maps_fields():
    gc = GarminClient(_fake_garmin())
    row = gc.fetch_daily(date(2026, 7, 4))
    assert row == {
        "recorded_date": "2026-07-04",
        "hrv_ms": 55.0,
        "sleep_minutes": 450,
        "resting_heart_rate": 48,
        "stress_score": 32,
    }


def test_fetch_daily_hrv_fallback_from_sleep():
    g = _fake_garmin()
    g.get_hrv_data.return_value = {}
    g.get_sleep_data.return_value = {
        "dailySleepDTO": {"sleepTimeSeconds": 25200, "avgOvernightHrv": 61.0}
    }
    row = GarminClient(g).fetch_daily(date(2026, 7, 4))
    assert row["hrv_ms"] == 61.0
    assert row["sleep_minutes"] == 420


def test_fetch_daily_survives_api_errors():
    g = _fake_garmin()
    g.get_hrv_data.side_effect = RuntimeError("boom")
    g.get_sleep_data.side_effect = RuntimeError("boom")
    g.get_user_summary.return_value = {"restingHeartRate": 50,
                                       "averageStressLevel": -1}
    row = GarminClient(g).fetch_daily(date(2026, 7, 4))
    assert row["hrv_ms"] is None
    assert row["resting_heart_rate"] == 50
    assert row["stress_score"] is None  # -1 = pas de données chez Garmin


# --------------------------------------------------------------- sync_user
def test_sync_user_upserts_only_days_with_data():
    g = _fake_garmin()
    gc = GarminClient(g)
    repo = MagicMock()
    result = sync_user(repo, None, gc, "u1", days=3, until=date(2026, 7, 4))
    assert result == {"days_fetched": 3, "days_with_data": 3}
    rows = repo.upsert_daily_metrics.call_args[0][1]
    assert {r["recorded_date"] for r in rows} == {
        "2026-07-04", "2026-07-03", "2026-07-02",
    }


# --------------------------------------------------------- endpoints: link
def test_link_direct_no_mfa(client, repo):
    """Login sans MFA → {"linked": true} directement."""
    fake_client = GarminClient(_fake_garmin())
    with patch.object(GarminClient, "login_step1",
                      return_value=fake_client) as step1:
        r = client.post("/garmin/link", headers=HEADERS, json={
            "user_id": "u1", "email": "a@b.c", "password": "secret",
        })
    assert r.status_code == 200
    assert r.json() == {"linked": True}
    step1.assert_called_once_with("a@b.c", "secret", "u1")
    row = repo.upsert_oauth_token.call_args[0][0]
    assert row["provider"] == "garmin"
    cipher = TokenCipher(FERNET_KEY)
    assert cipher.decrypt(row["access_token_encrypted"]) == "garth-token-blob"


def test_link_needs_mfa_returns_session_id(client, repo):
    """MFA requis → {"needs_mfa": true, "session_id": "..."}."""
    with patch.object(GarminClient, "login_step1",
                      side_effect=GarminMfaRequired("abc123")):
        r = client.post("/garmin/link", headers=HEADERS, json={
            "user_id": "u1", "email": "a@b.c", "password": "secret",
        })
    assert r.status_code == 200
    body = r.json()
    assert body["needs_mfa"] is True
    assert body["session_id"] == "abc123"
    repo.upsert_oauth_token.assert_not_called()


def test_link_maps_auth_error_to_502(client, repo):
    """Identifiants invalides → 502."""
    with patch.object(GarminClient, "login_step1",
                      side_effect=GarminAuthError("bad creds")):
        r = client.post("/garmin/link", headers=HEADERS, json={
            "user_id": "u1", "email": "a@b.c", "password": "wrong",
        })
    assert r.status_code == 502
    repo.upsert_oauth_token.assert_not_called()


# --------------------------------------------------------- endpoints: MFA
def test_mfa_completes_login(client, repo):
    """Étape 2 : code MFA valide → {"linked": true}."""
    fake_client = GarminClient(_fake_garmin())
    with patch("app.routers.garmin.complete_mfa",
               return_value=fake_client) as cm:
        r = client.post("/garmin/link/mfa", headers=HEADERS, json={
            "user_id": "u1", "session_id": "abc123", "mfa_code": "123456",
        })
    assert r.status_code == 200
    assert r.json() == {"linked": True}
    cm.assert_called_once_with("abc123", "123456")
    row = repo.upsert_oauth_token.call_args[0][0]
    cipher = TokenCipher(FERNET_KEY)
    assert cipher.decrypt(row["access_token_encrypted"]) == "garth-token-blob"


def test_mfa_invalid_session_returns_502(client, repo):
    """Session MFA invalide/expirée → 502."""
    with patch("app.routers.garmin.complete_mfa",
               side_effect=GarminAuthError("Session MFA expirée ou invalide")):
        r = client.post("/garmin/link/mfa", headers=HEADERS, json={
            "user_id": "u1", "session_id": "expired", "mfa_code": "000000",
        })
    assert r.status_code == 502
    assert "expirée" in r.json()["detail"]
    repo.upsert_oauth_token.assert_not_called()


def test_mfa_wrong_code_returns_502(client, repo):
    """Code MFA incorrect → 502."""
    with patch("app.routers.garmin.complete_mfa",
               side_effect=GarminAuthError("MFA invalide")):
        r = client.post("/garmin/link/mfa", headers=HEADERS, json={
            "user_id": "u1", "session_id": "abc123", "mfa_code": "999999",
        })
    assert r.status_code == 502
    repo.upsert_oauth_token.assert_not_called()


# --------------------------------------------------------- endpoints: sync
def test_sync_endpoint_full_flow(client, repo):
    cipher = TokenCipher(FERNET_KEY)
    repo.get_oauth_token.return_value = {
        "access_token_encrypted": cipher.encrypt("garth-token-blob"),
    }
    fake_client = GarminClient(_fake_garmin())
    with patch.object(GarminClient, "from_token", return_value=fake_client):
        r = client.post("/garmin/sync", headers=HEADERS,
                        json={"user_id": "u1", "days": 2,
                              "until": "2026-07-04"})
    assert r.status_code == 200
    assert r.json() == {"days_fetched": 2, "days_with_data": 2}
    repo.upsert_daily_metrics.assert_called_once()


def test_sync_404_when_not_linked(client, repo):
    repo.get_oauth_token.return_value = None
    r = client.post("/garmin/sync", headers=HEADERS, json={"user_id": "u1"})
    assert r.status_code == 404


def test_sync_validates_days_range(client, repo):
    r = client.post("/garmin/sync", headers=HEADERS,
                    json={"user_id": "u1", "days": 0})
    assert r.status_code == 422


def test_status_and_unlink(client, repo):
    repo.get_oauth_token.return_value = {"updated_at": "2026-07-04T06:00:00Z"}
    assert client.get("/garmin/status", params={"user_id": "u1"},
                      headers=HEADERS).json()["linked"] is True
    r = client.delete("/garmin/link/u1", headers=HEADERS)
    assert r.status_code == 200
    repo.delete_oauth_token.assert_called_once_with("u1", "garmin")
