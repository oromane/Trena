"""Amis et partage : contrôle d'accès avant tout."""
from datetime import date, timedelta
from unittest.mock import MagicMock

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.main import app
from app.routers import social

H = {"X-Internal-Key": "k"}
ME, BOB, EVE = "u-me", "u-bob", "u-eve"


class FakeRepo:
    """Base en mémoire : profils + relations, avec la sémantique PostgREST utile."""

    def __init__(self):
        self.profiles = {
            ME: {"id": ME, "full_name": "Romane Rossignol", "friend_code": "MECODE23",
                 "share_activities": True, "share_physio": False},
            BOB: {"id": BOB, "full_name": "Bob", "friend_code": "BOBCODE2",
                  "share_activities": True, "share_physio": True},
            EVE: {"id": EVE, "full_name": "Eve", "friend_code": "EVECODE2",
                  "share_activities": False, "share_physio": False},
        }
        self.friendships: list[dict] = []
        self.sessions: dict[str, list[dict]] = {}
        self.metrics: dict[str, list[dict]] = {}
        self._n = 0

    def get_profile(self, uid):
        return self.profiles.get(uid)

    def update_profile(self, uid, fields):
        if "friend_code" in fields and any(
                p.get("friend_code") == fields["friend_code"] for p in self.profiles.values()):
            req = httpx.Request("PATCH", "http://x")
            raise httpx.HTTPStatusError("409", request=req,
                                        response=httpx.Response(409, request=req))
        self.profiles[uid].update(fields)
        return self.profiles[uid]

    def get_profile_by_code(self, code):
        return next((p for p in self.profiles.values() if p.get("friend_code") == code), None)

    def get_profiles(self, ids):
        return {i: self.profiles[i] for i in ids if i in self.profiles}

    def list_friendships(self, uid):
        return [f for f in self.friendships if uid in (f["requester_id"], f["addressee_id"])]

    def insert_friendship(self, a, b):
        self._n += 1
        f = {"id": f"f{self._n}", "requester_id": a, "addressee_id": b, "status": "pending"}
        self.friendships.append(f)
        return f

    def update_friendship(self, fid, fields):
        f = next(f for f in self.friendships if f["id"] == fid)
        f.update(fields)
        return f

    def delete_friendship(self, fid):
        self.friendships = [f for f in self.friendships if f["id"] != fid]

    def get_sessions_between(self, uid, start, end):
        return self.sessions.get(uid, [])

    def get_metrics_history(self, uid, days=28, until=None):
        return self.metrics.get(uid, [])


@pytest.fixture
def repo(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "k")
    social._requests.clear()
    r = FakeRepo()
    app.dependency_overrides[get_repo] = lambda: r
    yield r
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def befriend(repo, a, b):
    f = repo.insert_friendship(a, b)
    f["status"] = "accepted"
    return f


def session(uid, days_ago, **kw):
    return {"id": f"{uid}-{days_ago}", "status": "COMPLETED", "discipline": "RUN",
            "scheduled_date": (date.today() - timedelta(days=days_ago)).isoformat(),
            "duration_actual_minutes": 45, "distance_m": 8000, "avg_hr": 150,
            "trimp_actual": 70, "title": "Footing",
            "activity_metrics": {"avg_pace_s_per_km": 330}, **kw}


# ------------------------------------------------------------ code ami
def test_code_alphabet_is_unambiguous():
    for _ in range(50):
        c = social.new_code()
        assert len(c) == 8 and not set(c) & set("01ILO")


def test_normalize_code_tolerates_spaces_and_case():
    assert social.normalize_code(" bob-code2 ") == "BOBCODE2"


def test_me_generates_missing_code(client, repo):
    repo.profiles[ME]["friend_code"] = None
    body = client.get("/social/me", headers=H, params={"user_id": ME}).json()
    assert len(body["friend_code"]) == 8
    assert body["prefs"] == {"share_activities": True, "share_physio": False}


# ------------------------------------------------------------ demandes
def test_request_then_accept_flow(client, repo):
    r = client.post("/social/request", headers=H, json={"user_id": ME, "code": "bobcode2"})
    assert r.json() == {"status": "pending", "name": "Bob"}
    bob = client.get("/social/me", headers=H, params={"user_id": BOB}).json()
    assert bob["incoming"][0]["name"] == "Romane"
    fid = bob["incoming"][0]["friendship_id"]
    r = client.post("/social/respond", headers=H,
                    json={"user_id": BOB, "friendship_id": fid, "accept": True})
    assert r.json() == {"status": "accepted"}
    me = client.get("/social/me", headers=H, params={"user_id": ME}).json()
    assert me["friends"] == [{"friendship_id": fid, "name": "Bob"}]


def test_requester_cannot_accept_own_request(client, repo):
    f = repo.insert_friendship(ME, BOB)
    r = client.post("/social/respond", headers=H,
                    json={"user_id": ME, "friendship_id": f["id"], "accept": True})
    assert r.status_code == 403
    assert f["status"] == "pending"


def test_stranger_cannot_touch_a_relation(client, repo):
    f = repo.insert_friendship(ME, BOB)
    for path, body in (("/social/respond", {"accept": True}), ("/social/remove", {})):
        r = client.post(path, headers=H, json={"user_id": EVE, "friendship_id": f["id"], **body})
        assert r.status_code == 404
    assert repo.friendships == [f]


def test_entering_inviter_code_accepts(client, repo):
    repo.insert_friendship(BOB, ME)
    r = client.post("/social/request", headers=H, json={"user_id": ME, "code": "BOBCODE2"})
    assert r.json()["status"] == "accepted"
    assert len(repo.friendships) == 1


def test_own_code_and_unknown_code(client, repo):
    assert client.post("/social/request", headers=H,
                       json={"user_id": ME, "code": "MECODE23"}).status_code == 400
    assert client.post("/social/request", headers=H,
                       json={"user_id": ME, "code": "ZZZZZZZZ"}).status_code == 404


def test_code_guessing_is_rate_limited(client, repo):
    for _ in range(social.MAX_REQUESTS_PER_HOUR):
        client.post("/social/request", headers=H, json={"user_id": ME, "code": "ZZZZZZZZ"})
    r = client.post("/social/request", headers=H, json={"user_id": ME, "code": "BOBCODE2"})
    assert r.status_code == 429


def test_decline_and_remove(client, repo):
    f = repo.insert_friendship(BOB, ME)
    client.post("/social/respond", headers=H,
                json={"user_id": ME, "friendship_id": f["id"], "accept": False})
    assert repo.friendships == []
    f = befriend(repo, ME, BOB)
    client.post("/social/remove", headers=H, json={"user_id": BOB, "friendship_id": f["id"]})
    assert repo.friendships == []


# ------------------------------------------------------------ flux
def test_feed_only_shows_accepted_friends(client, repo):
    repo.insert_friendship(ME, BOB)              # en attente
    repo.sessions[BOB] = [session(BOB, 1)]
    assert client.get("/social/feed", headers=H, params={"user_id": ME}).json() == {"friends": []}


def test_feed_respects_friend_prefs_and_hides_raw_physio(client, repo):
    befriend(repo, ME, BOB)
    repo.sessions[BOB] = [session(BOB, d) for d in (1, 5, 8, 11, 14)]
    repo.metrics[BOB] = [{"recorded_date": (date.today() - timedelta(days=i)).isoformat(),
                          "hrv_ms": 60.0, "sleep_minutes": 420} for i in range(10)]
    bob = client.get("/social/feed", headers=H, params={"user_id": ME}).json()["friends"][0]
    assert bob["name"] == "Bob" and bob["recent"]
    assert bob["readiness"] in ("NORMAL", "CAUTION", "REDUCE")
    raw = str(bob)
    for forbidden in ("hrv", "sleep", "avg_hr", "trimp", "activity_metrics", BOB):
        assert forbidden not in raw


def test_feed_hides_activities_when_friend_opts_out(client, repo):
    befriend(repo, EVE, ME)
    repo.sessions[EVE] = [session(EVE, 1)]
    eve = client.get("/social/feed", headers=H, params={"user_id": ME}).json()["friends"][0]
    assert eve["shares_activities"] is False
    assert eve["recent"] == [] and eve["week"] is None and eve["readiness"] is None


def test_prefs_update_applies_to_feed(client, repo):
    befriend(repo, ME, BOB)
    repo.sessions[ME] = [session(ME, 1)]
    client.post("/social/prefs", headers=H,
                json={"user_id": ME, "share_activities": False, "share_physio": False})
    me_seen_by_bob = client.get("/social/feed", headers=H, params={"user_id": BOB}).json()
    assert me_seen_by_bob["friends"][0]["recent"] == []
