"""Route POST /garmin/replan — repo + client Garmin mockés, zéro réseau."""
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.main import app

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)
    monkeypatch.setattr(settings, "token_encryption_key", "x" * 44)


@pytest.fixture
def repo():
    mock = MagicMock()
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def _window_sessions():
    today = date.today()
    return [{
        "id": f"s{i}", "scheduled_date": (today + timedelta(days=i)).isoformat(),
        "session_type": ["ENDURANCE", "INTERVAL", "TEMPO"][i % 3],
        "duration_planned_minutes": 45, "status": "PLANNED", "title": f"J{i}",
    } for i in range(5)]


class _FakeGarminClient:
    def __init__(self):
        self._w = 0
        self._s = 0

    def create_workout(self, payload):
        self._w += 1
        return self._w

    def schedule_workout(self, wid, day):
        self._s += 1
        return self._s

    def unschedule_workout(self, sid):
        pass

    def delete_workout(self, wid):
        pass


def test_replan_requires_internal_key(client):
    r = client.post("/garmin/replan", json={"user_id": "u1"})
    assert r.status_code == 401


def test_replan_pushes_window(client, repo):
    repo.get_completed_loads.return_value = []           # snapshot vide → {}
    repo.next_revision_number.return_value = 1
    repo.get_links_in_window.return_value = []
    repo.get_sessions_between.return_value = _window_sessions()

    with patch("app.routers.garmin._load_client",
               return_value=_FakeGarminClient()), \
         patch("app.routers.garmin._require_crypto", return_value=object()):
        r = client.post("/garmin/replan",
                        json={"user_id": "u1", "trigger": "WEEKLY", "window_days": 14},
                        headers=HEADERS)

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["revision"] == 1
    assert body["pushed"] == 5
    assert body["retracted"] == 0
    repo.insert_plan_revision.assert_called_once()
    assert repo.upsert_session_link.call_count == 5


def test_replan_validates_window(client, repo):
    with patch("app.routers.garmin._load_client", return_value=_FakeGarminClient()), \
         patch("app.routers.garmin._require_crypto", return_value=object()):
        r = client.post("/garmin/replan",
                        json={"user_id": "u1", "window_days": 99}, headers=HEADERS)
    assert r.status_code == 422
