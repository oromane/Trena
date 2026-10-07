"""Recalcul du TRIMP zonal (P2-7) : simulation par défaut, application ciblée."""
from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.main import app

H = {"X-Internal-Key": "k"}


def s(id, zones=None, avg_hr=140, trimp=60, disc="RUN", garmin=True, method=None):
    m = {}
    if zones:
        m["hr_time_in_zone_s"] = zones
    if method:
        m["trimp_method"] = method
    return {"id": id, "status": "COMPLETED", "discipline": disc, "title": id,
            "scheduled_date": (date.today() - timedelta(days=1)).isoformat(),
            "duration_actual_minutes": 60, "avg_hr": avg_hr, "trimp_actual": trimp,
            "garmin_activity_id": "g" + id if garmin else None, "activity_metrics": m}


@pytest.fixture
def repo(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", "k")
    r = MagicMock()
    r.get_profile.return_value = {"hr_rest": 50, "hr_max": 190, "sex": "M"}
    # Fractionné : 30 min Z1 + 30 min Z5 (FC moyenne cohérente ≈ 142 bpm)
    r.get_sessions_between.return_value = [
        s("intervals", zones=[1800, 0, 0, 0, 1800], avg_hr=142, trimp=90),
        s("nozones", zones=None, avg_hr=150, trimp=1),
        s("manual", garmin=False),
        s("lift", zones=[1800, 1800, 0, 0, 0], disc="STRENGTH", avg_hr=110, trimp=40),
    ]
    app.dependency_overrides[get_repo] = lambda: r
    yield r
    app.dependency_overrides.clear()


def call(apply=False):
    return TestClient(app).post("/garmin/recompute-trimp", headers=H,
                                json={"user_id": "u1", "apply": apply}).json()


def test_dry_run_reports_without_writing(repo):
    body = call()
    assert body["applied"] is False
    assert body["sessions_checked"] == 3           # la séance manuelle est ignorée
    assert body["methods"] == {"zonal": 1, "avg_hr": 2}
    by_title = {c["title"]: c for c in body["biggest_changes"]}
    # Fractionné : la FC moyenne sous-estimait la charge
    assert by_title["intervals"]["after"] > by_title["intervals"]["before"]
    assert by_title["intervals"]["method"] == "zonal"
    repo.update_session.assert_not_called()


def test_apply_writes_changes_and_method(repo):
    body = call(apply=True)
    assert body["applied"] is True
    written = {c.args[0]: c.args[1] for c in repo.update_session.call_args_list}
    assert written["intervals"]["activity_metrics"]["trimp_method"] == "zonal"
    assert written["intervals"]["activity_metrics"]["hr_time_in_zone_s"] == [1800, 0, 0, 0, 1800]
    assert written["lift"]["activity_metrics"]["trimp_method"] == "avg_hr"


def test_rejects_absurd_window(repo):
    r = TestClient(app).post("/garmin/recompute-trimp", headers=H,
                             json={"user_id": "u1", "days": 5000})
    assert r.status_code == 422
