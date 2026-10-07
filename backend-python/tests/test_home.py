"""Accueil en un appel (P1-4) : parité stricte avec les routes séparées."""
import threading
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app.advisor import daily
from app.config import settings
from app.db.repo import get_repo
from app.main import app
from app.routers import dashboard, social

ME, BOB, EVE = "u-me", "u-bob", "u-eve"
TODAY = date.today()
H = {"X-Internal-Key": "k"}


def _sessions(uid, n=30):
    return [{"id": f"{uid}-{i}", "status": "COMPLETED", "discipline": "RUN",
             "scheduled_date": (TODAY - timedelta(days=i * 3)).isoformat(),
             "duration_actual_minutes": 45 + i, "distance_m": 8000 + 100 * i, "avg_hr": 145,
             "trimp_actual": 70, "title": f"Sortie {i}", "session_type": "ENDURANCE",
             "activity_metrics": {"avg_pace_s_per_km": 330 - i}} for i in range(n)]


def _metrics(uid):
    return [{"recorded_date": (TODAY - timedelta(days=i)).isoformat(),
             "hrv_ms": 60 + (i % 7) - (5 if i == 0 else 0), "sleep_minutes": 420 - i,
             "resting_heart_rate": 50, "stress_score": 30} for i in range(28)]


class Repo:
    def __init__(self):
        self.calls = []
        self.lock = threading.Lock()

    def _hit(self, n):
        with self.lock:
            self.calls.append(n)

    def get_metrics_history(self, uid, days=28, until=None):
        self._hit("metrics")
        return _metrics(uid)

    def get_sessions_between(self, uid, start, end):
        self._hit("sessions")
        return [s for s in _sessions(uid) if start.isoformat() <= s["scheduled_date"] <= end.isoformat()]

    def get_activity_insights(self, uid, ids):
        self._hit("insights")
        return {ids[0]: {"text": "Belle sortie."}} if ids else {}

    def get_advisor_daily(self, uid, day):
        self._hit("advisor_daily")
        return None

    def get_profile(self, uid):
        self._hit("profile")
        return {"id": uid, "full_name": "Romane Rossignol"}

    def get_profiles(self, ids):
        self._hit("profiles")
        prefs = {BOB: (True, True), EVE: (False, False)}
        return {i: {"id": i, "full_name": i[2:].capitalize(),
                    "share_activities": prefs[i][0], "share_physio": prefs[i][1]} for i in ids}

    def list_friendships(self, uid):
        self._hit("friendships")
        return [{"id": "f1", "requester_id": ME, "addressee_id": BOB, "status": "accepted"},
                {"id": "f2", "requester_id": EVE, "addressee_id": ME, "status": "accepted"},
                {"id": "f3", "requester_id": ME, "addressee_id": "u-zed", "status": "pending"}]


@pytest.fixture
def repo(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "k")
    r = Repo()
    app.dependency_overrides[get_repo] = lambda: r
    yield r
    app.dependency_overrides.clear()


def test_home_matches_separate_routes(repo):
    body = TestClient(app).post("/dashboard/home", headers=H, json={"user_id": ME}).json()
    assert body["overview"] == dashboard.overview(dashboard.OverviewRequest(user_id=ME), repo)
    assert body["daily"] == daily.get_or_summary(repo, ME, TODAY)
    assert body["friends"] == social.feed(ME, repo)["friends"]
    assert body["profile"] == {"full_name": "Romane Rossignol"}


def test_home_reads_each_dataset_once(repo):
    TestClient(app).post("/dashboard/home", headers=H, json={"user_id": ME})
    # Moi : métriques, séances, profil, analyse, amitiés ; puis commentaires,
    # profils amis, et séances + métriques de chacun des 2 amis acceptés.
    assert sorted(repo.calls) == sorted(
        ["metrics", "sessions", "profile", "advisor_daily", "friendships",
         "insights", "profiles", "sessions", "metrics", "sessions", "metrics"])


def test_home_never_exposes_non_shared_friend_data(repo):
    body = TestClient(app).post("/dashboard/home", headers=H, json={"user_id": ME}).json()
    eve = next(f for f in body["friends"] if f["name"] == "Eve")
    assert eve["recent"] == [] and eve["week"] is None and eve["readiness"] is None
    assert all(f["name"] != "Zed" for f in body["friends"])     # demande en attente


def test_home_survives_missing_optional_tables(repo, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("relation does not exist")
    monkeypatch.setattr(repo, "list_friendships", boom)
    monkeypatch.setattr(repo, "get_advisor_daily", boom)
    monkeypatch.setattr(repo, "get_activity_insights", boom)
    r = TestClient(app).post("/dashboard/home", headers=H, json={"user_id": ME})
    assert r.status_code == 200
    body = r.json()
    assert body["friends"] == [] and body["daily"]["source"] == "summary"
    assert body["overview"]["recent"][0]["comment"] is None
