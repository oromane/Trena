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
def test_plan_requires_active_objective(client, repo):
    repo.get_profile.return_value = {"id": "u1", "weekly_availability_mask": [60] * 7}
    repo.get_active_objectives.return_value = []
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


# ------------------------------------------------------------- users/active