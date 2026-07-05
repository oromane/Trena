"""Tests probabilité, insights et endpoint /dashboard/summary."""
from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.engine.insights import generate_insights, success_probability
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


# ------------------------------------------------------------- probabilité
def test_probability_bounds_and_monotonicity():
    low = success_probability(10, 2, -30.0, "REDUCE")
    high = success_probability(10, 10, 30.0, "NORMAL")
    assert 0.05 <= low.value < high.value <= 0.95


def test_probability_neutral_without_history():
    p = success_probability(0, 0, 0.0, "NORMAL")
    assert 0.4 <= p.value <= 0.75
    assert any("neutre" in e for e in p.explanation)


def test_probability_adherence_capped_at_1():
    p = success_probability(5, 8, 0.0, "NORMAL")  # sur-réalisation
    assert p.adherence == 1.0


# ---------------------------------------------------------------- insights
def test_insights_detect_declining_hrv_and_sleep():
    hrv_series = [62.0] * 21 + [55.0] * 7      # -11%
    sleep_series = [450.0] * 21 + [380.0] * 7  # -15%
    out = generate_insights(hrv_series, sleep_series, 300, 300,
                            "CAUTION", -1.2, 0.8)
    kinds = {i.kind: i for i in out}
    assert kinds["hrv"].severity == "warning"
    assert kinds["sleep"].severity == "warning"
    assert "chances" in kinds["sleep"].text


def test_insights_ramp_warning():
    out = generate_insights([60] * 28, [450] * 28, 400, 300,
                            "NORMAL", 0.1, 0.9)
    load = [i for i in out if i.kind == "load"]
    assert load and load[0].severity == "warning"


def test_insights_normal_day_is_positive():
    out = generate_insights([60] * 28, [450] * 28, 300, 300,
                            "NORMAL", 0.2, 0.9)
    readiness = [i for i in out if i.kind == "readiness"]
    assert readiness[0].severity == "positive"


# ----------------------------------------------------------------- endpoint
def _sessions_fixture(today: date) -> list[dict]:
    rows = []
    for i in range(1, 15):  # 14 jours passés, complétées
        d = today - timedelta(days=i)
        rows.append({
            "id": f"p{i}", "scheduled_date": d.isoformat(),
            "session_type": "ENDURANCE", "duration_planned_minutes": 60,
            "intensity_target_trimp": 80, "status": "COMPLETED",
            "trimp_actual": 78, "duration_actual_minutes": 58,
        })
    rows.append({
        "id": "today", "scheduled_date": today.isoformat(),
        "session_type": "INTERVAL", "duration_planned_minutes": 45,
        "intensity_target_trimp": 110, "status": "PLANNED",
        "trimp_actual": None, "duration_actual_minutes": None,
    })
    for i in range(1, 8):  # semaine à venir
        d = today + timedelta(days=i)
        rows.append({
            "id": f"f{i}", "scheduled_date": d.isoformat(),
            "session_type": "ENDURANCE", "duration_planned_minutes": 60,
            "intensity_target_trimp": 85, "status": "PLANNED",
            "trimp_actual": None, "duration_actual_minutes": None,
        })
    return rows


def _metrics_fixture(today: date) -> list[dict]:
    rows = []
    for i in range(27, -1, -1):
        d = today - timedelta(days=i)
        rows.append({
            "recorded_date": d.isoformat(),
            "hrv_ms": 60.0 + (i % 3),
            "sleep_minutes": 450,
            "resting_heart_rate": 48,
            "stress_score": 30,
        })
    return rows


def test_summary_full_payload(client, repo):
    today = date.today()
    repo.get_active_objective.return_value = {
        "title": "Semi de Lille", "sport_type": "road_running",
        "target_date": (today + timedelta(days=70)).isoformat(),
        "target_time_seconds": 5400,
    }
    repo.get_metrics_history.return_value = _metrics_fixture(today)
    repo.get_sessions_between.return_value = _sessions_fixture(today)

    r = client.post("/dashboard/summary", headers=HEADERS,
                    json={"user_id": "u1"})
    assert r.status_code == 200
    body = r.json()

    assert body["objective"]["days_remaining"] == 70
    assert body["readiness"]["level"] in ("NORMAL", "CAUTION", "REDUCE")
    assert body["today_session"]["session_type"] == "INTERVAL"
    assert body["physio"]["hrv"]["baseline"] is not None
    assert 0.05 <= body["probability"]["value"] <= 0.95
    # trajectoire : 57 jours passés + 70 futurs
    assert len(body["trajectory"]["form"]) == 57 + 70
    assert body["trajectory"]["today_index"] == 56
    assert len(body["week"]) == 7
    assert any(d["is_today"] for d in body["week"])
    assert 1 <= len(body["history"]) <= 10
    assert body["insights"], "au moins un insight attendu"


def test_summary_without_objective_or_data(client, repo):
    repo.get_active_objective.return_value = None
    repo.get_metrics_history.return_value = []
    repo.get_sessions_between.return_value = []

    r = client.post("/dashboard/summary", headers=HEADERS,
                    json={"user_id": "u1"})
    assert r.status_code == 200
    body = r.json()
    assert body["objective"] is None
    assert body["today_session"] is None
    assert body["physio"]["hrv"] is None
    assert body["readiness"]["level"] == "NORMAL"


def test_summary_requires_internal_key(client, repo):
    r = client.post("/dashboard/summary", json={"user_id": "u1"},
                    headers={"X-Internal-Key": "wrong"})
    assert r.status_code == 401
