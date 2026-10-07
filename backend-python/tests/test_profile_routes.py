"""Routes profil (P0-2) : liste blanche, validation, export."""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.main import app

H = {"X-Internal-Key": "k"}


@pytest.fixture
def repo(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "k")
    r = MagicMock()
    r.get_profile.return_value = {"id": "u1", "full_name": "Romane R", "hr_max": 192,
                                  "weekly_availability_mask": [60] * 7}
    app.dependency_overrides[get_repo] = lambda: r
    yield r
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_requires_internal_key(client, repo):
    assert client.get("/profile", params={"user_id": "u1"}).status_code == 401


def test_get_profile_exposes_only_public_fields(client, repo):
    body = client.get("/profile", headers=H, params={"user_id": "u1"}).json()
    assert body["full_name"] == "Romane R" and body["hr_max"] == 192
    assert "weekly_availability_mask" not in body and "id" not in body


def test_ensure_creates_once(client, repo):
    repo.get_profile.return_value = None
    assert client.post("/profile/ensure", headers=H, json={"user_id": "u1"}).json() == {"created": True}
    repo.create_profile.assert_called_once_with("u1")
    repo.get_profile.return_value = {"id": "u1"}
    assert client.post("/profile/ensure", headers=H, json={"user_id": "u1"}).json() == {"created": False}


def test_update_only_sends_provided_fields(client, repo):
    r = client.post("/profile/update", headers=H,
                    json={"user_id": "u1", "hr_max": 190, "hr_rest": 48, "sex": "M"})
    assert r.json() == {"updated": ["hr_max", "hr_rest", "sex"]}
    repo.update_profile.assert_called_once_with("u1", {"hr_max": 190, "hr_rest": 48, "sex": "M"})


def test_update_blank_name_becomes_null(client, repo):
    client.post("/profile/update", headers=H, json={"user_id": "u1", "full_name": "   "})
    repo.update_profile.assert_called_once_with("u1", {"full_name": None})


@pytest.mark.parametrize("payload", [
    {"hr_max": 300}, {"hr_rest": 10}, {"sessions_per_week": 9}, {"sex": "X"},
    {"hr_max": 150, "hr_rest": 160},
])
def test_update_rejects_invalid_values(client, repo, payload):
    r = client.post("/profile/update", headers=H, json={"user_id": "u1", **payload})
    assert r.status_code == 422
    repo.update_profile.assert_not_called()


def test_update_ignores_unknown_fields(client, repo):
    client.post("/profile/update", headers=H,
                json={"user_id": "u1", "friend_code": "HACKED12", "id": "other"})
    repo.update_profile.assert_not_called()


def test_recent_metrics_are_latest_first_and_bounded(client, repo):
    repo.get_metrics_history.return_value = [
        {"recorded_date": f"2026-10-{d:02d}", "hrv_ms": d} for d in range(1, 8)]
    rows = client.get("/profile/metrics", headers=H, params={"user_id": "u1", "limit": 3}).json()
    assert [r["recorded_date"] for r in rows] == ["2026-10-07", "2026-10-06", "2026-10-05"]


def test_trends_keep_only_chart_columns(client, repo):
    repo.get_metrics_history.return_value = [
        {"recorded_date": "2026-10-01", "hrv_ms": 60, "user_id": "u1", "id": "x"}]
    repo.get_wellness_history.return_value = [{"recorded_date": "2026-10-01", "steps": 9000}]
    body = client.get("/profile/trends", headers=H, params={"user_id": "u1"}).json()
    assert body["metrics"] == [{"recorded_date": "2026-10-01", "hrv_ms": 60,
                                "resting_heart_rate": None, "sleep_minutes": None}]
    assert body["wellness"][0]["steps"] == 9000


def test_export_covers_user_tables_but_never_tokens(client, repo):
    repo.export_table.return_value = []
    body = client.get("/profile/export", headers=H, params={"user_id": "u1"}).json()
    tables = {c.args[0] for c in repo.export_table.call_args_list}
    assert tables == {"objectives", "daily_metrics", "garmin_wellness", "training_sessions"}
    assert "oauth_tokens" not in body and body["profile"]["full_name"] == "Romane R"


def test_manual_metric_does_not_wipe_other_fields(client, repo):
    repo.upsert_daily_metrics.return_value = [{}]
    client.post("/ingest/daily-metrics", headers=H, json={
        "user_id": "u1", "metrics": [{"recorded_date": "2026-10-07", "hrv_ms": 62}]})
    rows = repo.upsert_daily_metrics.call_args.args[1]
    assert rows == [{"recorded_date": "2026-10-07", "hrv_ms": 62.0}]


def test_export_table_paginates_past_supabase_cap():
    import httpx

    from app.db.repo import SupabaseRepo

    total = 2500
    seen = []

    def handler(req: httpx.Request):
        off, lim = int(req.url.params["offset"]), int(req.url.params["limit"])
        seen.append(off)
        rows = [{"id": i} for i in range(off, min(off + lim, total))]
        return httpx.Response(200, json=rows)

    client = httpx.Client(base_url="http://x/rest/v1", transport=httpx.MockTransport(handler))
    rows = SupabaseRepo("", "", client=client).export_table("daily_metrics", "u1",
                                                            "recorded_date.asc")
    assert len(rows) == total and seen == [0, 1000, 2000]
