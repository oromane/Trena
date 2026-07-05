"""Tests : purge calendrier, CRUD séances, workout, sessions_per_week."""
from datetime import date
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.crypto import generate_key
from app.db.repo import get_repo
from app.engine.plan_generator import generate_plan
from app.engine.workout import describe_session
from app.main import app
from app.routers.calendar import get_gcal
from app.services.calendar_sync import format_duration, session_to_event

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}
FERNET_KEY = generate_key()
MASK = [60, 0, 60, 0, 60, 120, 90]


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)
    monkeypatch.setattr(settings, "token_encryption_key", FERNET_KEY)
    monkeypatch.setattr(settings, "google_client_id", "cid")
    monkeypatch.setattr(settings, "google_client_secret", "cs")


@pytest.fixture
def repo():
    mock = MagicMock()
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def gcal():
    mock = MagicMock()
    app.dependency_overrides[get_gcal] = lambda: mock
    yield mock
    app.dependency_overrides.pop(get_gcal, None)


@pytest.fixture
def client():
    return TestClient(app)


# ------------------------------------------------------------ format/event
def test_format_duration():
    assert format_duration(105) == "1h45"
    assert format_duration(60) == "1h"
    assert format_duration(45) == "45 min"


def test_event_has_trena_marker_and_time():
    from datetime import time
    ev = session_to_event("TEMPO", 105, 120, date(2026, 7, 7),
                          start_time=time(8, 0))
    assert ev["extendedProperties"]["private"]["trena"] == "1"
    assert "1h45" in ev["summary"]
    assert "—" not in ev["summary"] and "—" not in ev["description"]
    assert ev["start"]["dateTime"].endswith("08:00:00")


# ----------------------------------------------------------------- workout
def test_workout_interval_structure():
    w = describe_session("INTERVAL", 60)
    labels = [b["label"] for b in w["blocks"]]
    assert labels == ["Échauffement", "Corps de séance", "Retour au calme"]
    assert "×" in w["blocks"][1]["detail"]
    assert w["focus"]


def test_workout_endurance_single_block():
    w = describe_session("ENDURANCE", 105)
    assert len(w["blocks"]) == 1
    assert "1h45" in w["blocks"][0]["detail"]


# ------------------------------------------------------- sessions_per_week
def test_plan_respects_sessions_per_week():
    start = date(2026, 7, 6)
    plan = generate_plan(start, start.replace(month=9), MASK,
                         sessions_per_week=3)
    weeks: dict = {}
    for p in plan:
        wk = p.scheduled_date.isocalendar()[1]
        weeks.setdefault(wk, 0)
        weeks[wk] += 1
    assert max(weeks.values()) <= 3


# ------------------------------------------------------------------- purge
def test_purge_deletes_and_clears_refs(client, repo, gcal):
    from app.crypto import TokenCipher
    cipher = TokenCipher(FERNET_KEY)
    from datetime import datetime, timedelta, timezone
    repo.get_oauth_token.return_value = {
        "access_token_encrypted": cipher.encrypt("tok"),
        "refresh_token_encrypted": cipher.encrypt("rtok"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "scopes": [],
    }
    gcal.purge_trena_events.return_value = 12
    r = client.post("/calendar/purge", headers=HEADERS, json={"user_id": "u1"})
    assert r.status_code == 200
    assert r.json() == {"events_deleted": 12}
    repo.clear_calendar_event_ids.assert_called_once_with("u1")


def test_purge_404_when_not_linked(client, repo, gcal):
    repo.get_oauth_token.return_value = None
    r = client.post("/calendar/purge", headers=HEADERS, json={"user_id": "u1"})
    assert r.status_code == 404


# ------------------------------------------------------------ CRUD séances
def test_reschedule_updates_date_and_time(client, repo):
    repo.get_session.return_value = {
        "id": "s1", "session_type": "TEMPO",
        "duration_planned_minutes": 60, "intensity_target_trimp": 100,
        "calendar_event_id": None, "scheduled_time": None,
    }
    r = client.post("/sessions/reschedule", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1",
        "new_date": "2026-07-07", "new_time": "08:00",
    })
    assert r.status_code == 200
    assert r.json()["rescheduled"] is True
    fields = repo.update_session.call_args[0][1]
    assert fields["scheduled_date"] == "2026-07-07"
    assert fields["scheduled_time"] == "08:00:00"


def test_reschedule_404_unknown_session(client, repo):
    repo.get_session.return_value = None
    r = client.post("/sessions/reschedule", headers=HEADERS, json={
        "user_id": "u1", "session_id": "nope", "new_date": "2026-07-07",
    })
    assert r.status_code == 404


def test_create_session_computes_trimp(client, repo):
    repo.get_active_objective.return_value = {"id": "obj1"}
    repo.insert_sessions.return_value = [{"id": "new1"}]
    r = client.post("/sessions/create", headers=HEADERS, json={
        "user_id": "u1", "scheduled_date": "2026-07-08",
        "scheduled_time": "08:00", "session_type": "ENDURANCE",
        "duration_minutes": 105,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["created"] is True and body["session_id"] == "new1"
    assert body["target_trimp"] == round(105 * 1.2)
    row = repo.insert_sessions.call_args[0][0][0]
    assert row["scheduled_time"] == "08:00:00"


def test_create_rejects_bad_type(client, repo):
    r = client.post("/sessions/create", headers=HEADERS, json={
        "user_id": "u1", "scheduled_date": "2026-07-08",
        "session_type": "YOGA", "duration_minutes": 60,
    })
    assert r.status_code == 422


def test_delete_session(client, repo):
    repo.get_session.return_value = {"id": "s1", "calendar_event_id": None}
    r = client.post("/sessions/delete", headers=HEADERS, json={
        "user_id": "u1", "session_id": "s1",
    })
    assert r.status_code == 200
    repo.delete_session.assert_called_once_with("s1", "u1")
