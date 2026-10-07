"""Tests du routeur /disciplines (vélo, natation, triathlon).

Repo mocké : aucun appel réseau. On vérifie surtout que les contraintes
réelles de la base sont refusées *en amont*, avec un message exploitable,
plutôt que de laisser remonter une erreur 500 depuis PostgREST.
"""
from datetime import date
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


# ------------------------------------------------------------------- config
# ------------------------------------------------------------------ création
def _payload(**over):
    base = {
        "user_id": "u1",
        "scheduled_date": "2026-08-04",
        "session_type": "ENDURANCE",
        "duration_minutes": 60,
    }
    base.update(over)
    return base


# ----------------------------------------------------------------- historique
def test_list_sessions_maps_fields_and_labels(client, repo):
    repo.list_sessions_by_discipline.return_value = [
        {
            "id": "s1", "scheduled_date": "2026-08-03", "session_type": "TEMPO",
            "status": "COMPLETED", "duration_actual_minutes": 45,
            "duration_planned_minutes": 50, "distance_m": 20000,
            "avg_hr": 148, "session_rpe": 7, "trimp_actual": 315,
            "title": None,
        }
    ]
    r = client.get("/disciplines/bike/sessions?user_id=u1", headers=HEADERS)
    assert r.status_code == 200
    s = r.json()["sessions"][0]
    assert s["session_type_label"] == "Tempo / seuil"
    # Le réalisé prime sur le prévu
    assert s["duration_minutes"] == 45
    assert s["trimp"] == 315


def test_list_sessions_falls_back_to_planned_duration(client, repo):
    repo.list_sessions_by_discipline.return_value = [
        {"id": "s1", "scheduled_date": "2026-08-03", "session_type": "ENDURANCE",
         "status": "PLANNED", "duration_planned_minutes": 60,
         "intensity_target_trimp": 300}
    ]
    r = client.get("/disciplines/bike/sessions?user_id=u1", headers=HEADERS)
    s = r.json()["sessions"][0]
    assert s["duration_minutes"] == 60
    assert s["trimp"] == 300


# --------------------------------------------------------------------- stats
def test_stats_counts_only_completed_sessions(client, repo):
    repo.list_sessions_by_discipline.return_value = [
        {"scheduled_date": "2026-08-03", "status": "COMPLETED",
         "duration_actual_minutes": 60, "distance_m": 30000, "trimp_actual": 300},
        {"scheduled_date": "2026-08-02", "status": "PLANNED",
         "duration_planned_minutes": 90, "distance_m": 50000},
    ]
    r = client.get("/disciplines/bike/stats?user_id=u1&today=2026-08-04",
                   headers=HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["all_time"]["sessions"] == 1
    assert body["all_time"]["distance_m"] == 30000
    assert body["longest_distance_m"] == 30000
    assert body["last_session_date"] == "2026-08-03"


def test_stats_week_and_month_windows(client, repo):
    # 2026-08-04 est un mardi : la semaine commence le lundi 2026-08-03.
    repo.list_sessions_by_discipline.return_value = [
        {"scheduled_date": "2026-08-03", "status": "COMPLETED",
         "duration_actual_minutes": 30, "distance_m": 0, "trimp_actual": 150},
        {"scheduled_date": "2026-08-01", "status": "COMPLETED",
         "duration_actual_minutes": 60, "distance_m": 0, "trimp_actual": 300},
        {"scheduled_date": "2026-07-20", "status": "COMPLETED",
         "duration_actual_minutes": 90, "distance_m": 0, "trimp_actual": 450},
    ]
    body = client.get("/disciplines/bike/stats?user_id=u1&today=2026-08-04",
                      headers=HEADERS).json()
    assert body["week"]["sessions"] == 1        # seulement le 03/08
    assert body["month"]["sessions"] == 2       # 01/08 et 03/08
    assert body["all_time"]["sessions"] == 3


def test_stats_empty_history(client, repo):
    repo.list_sessions_by_discipline.return_value = []
    body = client.get("/disciplines/swim/stats?user_id=u1", headers=HEADERS).json()
    assert body["all_time"]["sessions"] == 0
    assert body["longest_distance_m"] is None
    assert body["last_session_date"] is None
