"""Tests de la personnalisation des séances (/sessions/update)."""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.main import app

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}

SESSION = {
    "id": "s1", "user_id": "u1", "scheduled_date": "2026-07-08",
    "scheduled_time": None, "session_type": "ENDURANCE",
    "duration_planned_minutes": 30, "intensity_target_trimp": 36,
    "status": "PLANNED", "calendar_event_id": None,
    "structure": {"blocks": [{"label": "x", "detail": "y"}], "focus": "z"},
}


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)


@pytest.fixture
def repo():
    mock = MagicMock()
    mock.get_session.return_value = dict(SESSION)
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_update_type_and_duration_recomputes_trimp(client, repo):
    r = client.post("/sessions/update", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1",
        "session_type": "INTERVAL", "duration_minutes": 45,
    })
    assert r.status_code == 200
    fields = repo.update_session.call_args[0][1]
    assert fields["session_type"] == "INTERVAL"
    assert fields["duration_planned_minutes"] == 45
    assert fields["intensity_target_trimp"] == round(45 * 2.5)
    # structure obsolète purgée
    assert fields["structure"] is None


def test_update_reschedule_only(client, repo):
    r = client.post("/sessions/update", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1",
        "scheduled_date": "2026-07-10", "scheduled_time": "08:00",
    })
    assert r.status_code == 200
    fields = repo.update_session.call_args[0][1]
    assert fields == {"scheduled_date": "2026-07-10",
                      "scheduled_time": "08:00:00"}


def test_update_with_custom_builder(client, repo):
    r = client.post("/sessions/update", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1",
        "custom": {"title": "Ma séance", "steps": [
            {"kind": "step", "label": "Course", "minutes": 40, "zone": 2},
        ]},
    })
    assert r.status_code == 200
    fields = repo.update_session.call_args[0][1]
    assert fields["title"] == "Ma séance"
    assert fields["duration_planned_minutes"] == 40
    assert fields["structure"]["blocks"]


def test_update_requires_changes(client, repo):
    r = client.post("/sessions/update", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1",
    })
    assert r.status_code == 422


def test_update_unknown_session_404(client, repo):
    repo.get_session.return_value = None
    r = client.post("/sessions/update", headers=HEADERS, json={
        "user_id": "u1", "session_id": "nope", "duration_minutes": 60,
    })
    assert r.status_code == 404


def test_update_invalid_type_422(client, repo):
    r = client.post("/sessions/update", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1", "session_type": "YOGA",
    })
    assert r.status_code == 422
