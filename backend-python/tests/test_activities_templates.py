"""Tests : import d'activités Garmin, modèles structurés, bien-être étendu."""
from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.engine.templates import build_from_template, list_templates
from app.main import app
from app.services.garmin_sync import (
    GarminClient,
    import_activities,
    sync_wellness,
)

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}


@pytest.fixture(autouse=True)
def configure(monkeypatch):
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


def _activity(aid="123", type_key="running", day="2026-07-05",
              duration=3600, avg_hr=155, distance=10500):
    return {
        "activityId": aid,
        "activityName": "Course matinale",
        "activityType": {"typeKey": type_key},
        "startTimeLocal": f"{day} 08:00:00",
        "duration": duration,
        "movingDuration": duration,
        "averageHR": avg_hr,
        "distance": distance,
    }


# --------------------------------------------------------- import activités
def test_import_matches_planned_session():
    g = MagicMock()
    g.get_activities_by_date.return_value = [_activity()]
    repo = MagicMock()
    repo.get_session_by_activity.return_value = None
    repo.get_session_for_date.return_value = {
        "id": "s1", "status": "PLANNED",
    }
    result = import_activities(repo, GarminClient(g), "u1", days=7,
                               until=date(2026, 7, 6),
                               hr_rest=50, hr_max=190, sex="F")
    assert result["matched"] == 1 and result["created"] == 0
    fields = repo.update_session.call_args[0][1]
    assert fields["status"] == "COMPLETED"
    assert fields["duration_actual_minutes"] == 60
    assert fields["trimp_actual"] > 0
    assert fields["distance_m"] == 10500
    assert fields["garmin_activity_id"] == "123"


def test_import_creates_unplanned_session():
    g = MagicMock()
    g.get_activities_by_date.return_value = [_activity()]
    repo = MagicMock()
    repo.get_session_by_activity.return_value = None
    repo.get_session_for_date.return_value = None
    result = import_activities(repo, GarminClient(g), "u1", days=7,
                               until=date(2026, 7, 6))
    assert result["created"] == 1
    row = repo.insert_sessions.call_args[0][0][0]
    assert row["status"] == "COMPLETED"
    assert row["title"] == "Course matinale"


def test_import_skips_already_imported_and_non_running():
    g = MagicMock()
    g.get_activities_by_date.return_value = [
        _activity(aid="dup"),
        _activity(aid="bike", type_key="cycling"),
    ]
    repo = MagicMock()
    repo.get_session_by_activity.return_value = {"id": "s-old"}
    result = import_activities(repo, GarminClient(g), "u1", days=7,
                               until=date(2026, 7, 6))
    assert result["already_imported"] == 1
    assert result["imported"] == 0
    repo.insert_sessions.assert_not_called()


def test_import_fallback_trimp_without_hr():
    g = MagicMock()
    g.get_activities_by_date.return_value = [_activity(avg_hr=None)]
    repo = MagicMock()
    repo.get_session_by_activity.return_value = None
    repo.get_session_for_date.return_value = None
    import_activities(repo, GarminClient(g), "u1", days=7,
                      until=date(2026, 7, 6))
    row = repo.insert_sessions.call_args[0][0][0]
    assert row["trimp_actual"] == 72  # 60 min * 1.2


# --------------------------------------------------------------- bien-être
def test_sync_wellness_upserts():
    g = MagicMock()
    g.get_user_summary.return_value = {
        "totalSteps": 9000, "totalKilocalories": 2400,
        "floorsAscended": 8, "bodyBatteryHighestValue": 90,
        "bodyBatteryLowestValue": 25, "moderateIntensityMinutes": 30,
        "vigorousIntensityMinutes": 20,
    }
    g.get_body_composition.return_value = {"totalAverage": {"weight": 62300}}
    g.get_max_metrics.return_value = [{"generic": {"vo2MaxValue": 48.0}}]
    repo = MagicMock()
    result = sync_wellness(repo, GarminClient(g), "u1", days=2,
                           until=date(2026, 7, 6))
    assert result["days_with_data"] == 2
    rows = repo.upsert_wellness.call_args[0][1]
    assert rows[0]["weight_kg"] == 62.3
    assert rows[0]["steps"] == 9000
    assert rows[0]["vo2max"] == 48.0
    assert rows[0]["intensity_minutes"] == 50


# ----------------------------------------------------------------- modèles
def test_list_templates_shape():
    ts = list_templates()
    assert len(ts) >= 6
    ids = {t["id"] for t in ts}
    assert {"thirty_thirty", "track_1000", "long_run_blocks"} <= ids
    for t in ts:
        assert t["params"] and t["name"] and t["session_type"]


def test_build_template_defaults():
    built = build_from_template("track_1000")
    assert built["session_type"] == "INTERVAL"
    assert built["duration_minutes"] > 30
    assert built["target_trimp"] > 50
    assert built["structure"]["blocks"]
    assert built["structure"]["focus"]


def test_build_template_custom_params_change_load():
    small = build_from_template("thirty_thirty", {"reps": 6, "sets": 1})
    big = build_from_template("thirty_thirty", {"reps": 20, "sets": 4})
    assert big["target_trimp"] > small["target_trimp"]
    assert big["duration_minutes"] > small["duration_minutes"]


def test_build_template_rejects_out_of_bounds():
    with pytest.raises(ValueError):
        build_from_template("thirty_thirty", {"reps": 100, "sets": 1})


# --------------------------------------------------------------- endpoints
def test_templates_endpoint(client, repo):
    r = client.get("/sessions/templates", headers=HEADERS)
    assert r.status_code == 200
    assert len(r.json()["templates"]) >= 6


def test_create_from_template_endpoint(client, repo):
    repo.get_active_objective.return_value = {"id": "obj1"}
    repo.insert_sessions.return_value = [{"id": "new1"}]
    r = client.post("/sessions/create", headers=HEADERS, json={
        "user_id": "u1", "scheduled_date": "2026-07-08",
        "scheduled_time": "08:00",
        "template_id": "long_run_blocks",
        "params": {"total_min": 105, "blocks": 2, "block_min": 10},
    })
    assert r.status_code == 200
    row = repo.insert_sessions.call_args[0][0][0]
    assert row["title"] == "Sortie longue à blocs"
    assert row["structure"]["blocks"]
    assert row["duration_planned_minutes"] == 105


def test_create_from_unknown_template_404(client, repo):
    r = client.post("/sessions/create", headers=HEADERS, json={
        "user_id": "u1", "scheduled_date": "2026-07-08",
        "template_id": "yoga_flow",
    })
    assert r.status_code == 404
