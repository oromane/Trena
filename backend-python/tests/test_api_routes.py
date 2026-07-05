"""Tests d'intégration API avec repo mocké (aucun appel réseau)."""
from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.main import app

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}


@pytest.fixture(autouse=True)
def configure_security(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)


@pytest.fixture
def repo():
    mock = MagicMock()
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


# --------------------------------------------------------------- sécurité
def test_protected_route_rejects_bad_key(client, repo):
    r = client.post("/ingest/daily-metrics",
                    json={"user_id": "u1", "metrics": [{"recorded_date": "2026-07-01"}]},
                    headers={"X-Internal-Key": "wrong"})
    assert r.status_code == 401


def test_protected_route_fails_closed_without_config(client, repo, monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "")
    r = client.post("/ingest/daily-metrics",
                    json={"user_id": "u1", "metrics": [{"recorded_date": "2026-07-01"}]},
                    headers=HEADERS)
    assert r.status_code == 503


def test_stateless_endpoints_remain_open(client):
    r = client.post("/simulate", json={"loads": [100, 0, 0]})
    assert r.status_code == 200


# ---------------------------------------------------------------- ingestion
def test_ingest_upserts_metrics(client, repo):
    repo.upsert_daily_metrics.return_value = [{"id": "m1"}]
    r = client.post("/ingest/daily-metrics", headers=HEADERS, json={
        "user_id": "u1",
        "metrics": [{"recorded_date": "2026-07-01", "hrv_ms": 62.5, "sleep_minutes": 440}],
    })
    assert r.status_code == 200
    assert r.json() == {"upserted": 1}
    repo.upsert_daily_metrics.assert_called_once()


# --------------------------------------------------------------------- plan
def test_plan_generate_persists(client, repo):
    today = date.today()
    repo.get_profile.return_value = {
        "id": "u1", "weekly_availability_mask": [60, 60, 60, 60, 60, 120, 90],
    }
    repo.get_active_objective.return_value = {
        "id": "obj1",
        "target_date": (today + timedelta(weeks=10)).isoformat(),
    }
    r = client.post("/plan/generate", headers=HEADERS,
                    json={"user_id": "u1", "persist": True})
    assert r.status_code == 200
    body = r.json()
    assert body["n_sessions"] > 0
    assert body["persisted"] is True
    repo.delete_planned_sessions.assert_called_once()
    repo.insert_sessions.assert_called_once()


def test_plan_requires_active_objective(client, repo):
    repo.get_profile.return_value = {"id": "u1", "weekly_availability_mask": [60] * 7}
    repo.get_active_objective.return_value = None
    r = client.post("/plan/generate", headers=HEADERS, json={"user_id": "u1"})
    assert r.status_code == 404


# ------------------------------------------------------------- daily adjust
def _metrics_rows(day: date, hrv_today: float, sleep_today: int) -> list[dict]:
    rows = []
    for i in range(27, 0, -1):
        d = day - timedelta(days=i)
        rows.append({"recorded_date": d.isoformat(), "hrv_ms": 60.0 + (i % 3),
                     "sleep_minutes": 450})
    rows.append({"recorded_date": day.isoformat(), "hrv_ms": hrv_today,
                 "sleep_minutes": sleep_today})
    return rows


def test_daily_adjust_reduces_on_bad_hrv_and_sleep(client, repo):
    day = date.today()
    repo.get_session_for_date.return_value = {
        "id": "s1", "session_type": "INTERVAL",
        "duration_planned_minutes": 60, "intensity_target_trimp": 120,
        "calendar_event_id": None,
    }
    repo.get_metrics_history.return_value = _metrics_rows(day, hrv_today=40.0,
                                                          sleep_today=300)
    r = client.post("/daily-adjust/run", headers=HEADERS, json={"user_id": "u1"})
    assert r.status_code == 200
    body = r.json()
    assert body["readiness"] == "REDUCE"
    assert body["modified"] is True
    assert body["session_type"] == "ENDURANCE"
    repo.update_session.assert_called_once()


def test_daily_adjust_keeps_plan_when_normal(client, repo):
    day = date.today()
    repo.get_session_for_date.return_value = {
        "id": "s1", "session_type": "TEMPO",
        "duration_planned_minutes": 50, "intensity_target_trimp": 100,
        "calendar_event_id": None,
    }
    repo.get_metrics_history.return_value = _metrics_rows(day, hrv_today=61.0,
                                                          sleep_today=450)
    r = client.post("/daily-adjust/run", headers=HEADERS, json={"user_id": "u1"})
    body = r.json()
    assert body["readiness"] == "NORMAL"
    assert body["modified"] is False
    repo.update_session.assert_not_called()


def test_daily_adjust_no_session(client, repo):
    repo.get_session_for_date.return_value = None
    r = client.post("/daily-adjust/run", headers=HEADERS, json={"user_id": "u1"})
    assert r.status_code == 200
    assert "Aucune séance" in r.json()["detail"]


def test_daily_adjust_insufficient_data_keeps_plan(client, repo):
    repo.get_session_for_date.return_value = {
        "id": "s1", "session_type": "INTERVAL",
        "duration_planned_minutes": 60, "intensity_target_trimp": 120,
        "calendar_event_id": None,
    }
    repo.get_metrics_history.return_value = []  # aucune donnée
    r = client.post("/daily-adjust/run", headers=HEADERS, json={"user_id": "u1"})
    body = r.json()
    assert body["modified"] is False
    assert "insuffisantes" in body["detail"]


# ------------------------------------------------------------- users/active
def test_active_users(client, repo):
    repo.list_active_user_ids.return_value = ["u1", "u2"]
    r = client.get("/users/active", headers=HEADERS)
    assert r.json() == {"user_ids": ["u1", "u2"]}
