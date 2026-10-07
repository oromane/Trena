"""Analyse de séance : comparaison chiffrée et commentaires Perlo (LLM mocké)."""
import asyncio
from datetime import date, timedelta
from unittest.mock import MagicMock

from app.advisor import activity, llm
from app.engine.activity_compare import analyze, history_for

TODAY = date(2026, 10, 7)


def run(day_offset, *, id=None, dist=8000, minutes=45, hr=145, pace=330,
        trimp=70, elev=60, zones=None, disc="RUN", te=None):
    m = {"avg_pace_s_per_km": pace, "elevation_gain_m": elev}
    if zones:
        m["hr_time_in_zone_s"] = zones
    if te:
        m["training_effect_aerobic"] = te
    return {
        "id": id or f"s{day_offset}", "status": "COMPLETED", "discipline": disc,
        "scheduled_date": (TODAY - timedelta(days=day_offset)).isoformat(),
        "distance_m": dist, "duration_actual_minutes": minutes, "avg_hr": hr,
        "trimp_actual": trimp, "activity_metrics": m,
    }


HISTORY = [run(d) for d in (4, 6, 9, 12, 15)]


def test_distance_record_is_the_headline():
    a = analyze(run(0, dist=15000, minutes=85), HISTORY)
    assert a.headline == "Record de distance sur 90 jours"
    assert "record" in a.tags
    assert any("15,0 km" in f for f in a.facts)


def test_efficiency_faster_with_lower_hr():
    a = analyze(run(0, pace=315, hr=139), HISTORY)
    assert "efficiency" in a.tags
    assert any("15 s/km plus rapide" in f for f in a.facts)
    assert any("6 bpm plus basse" in f for f in a.facts)


def test_easy_session_from_zones():
    a = analyze(run(0, zones=[600, 1800, 300, 0, 0]), HISTORY)
    assert a.headline == "Sortie en endurance fondamentale"
    assert any("89 % du temps en zones 1-2" in f for f in a.facts)


def test_hard_session_from_zones_and_load():
    a = analyze(run(0, trimp=120, zones=[200, 600, 600, 700, 300]), HISTORY)
    assert "hard" in a.tags
    assert any("prévois une récupération" in f for f in a.facts)


def test_usual_session_has_neutral_headline():
    a = analyze(run(0), HISTORY)
    assert a.headline == "Dans tes habitudes"
    assert a.facts == []


def test_not_enough_history():
    a = analyze(run(0), HISTORY[:2])
    assert a.headline == "Séance enregistrée"
    assert any("Pas encore assez" in f for f in a.facts)


def test_history_is_same_discipline_and_before():
    bike = run(2, disc="BIKE")
    future = run(-1)
    old = run(120)
    s = run(0)
    h = history_for(s, HISTORY + [bike, future, old, s])
    assert {x["id"] for x in h} == {x["id"] for x in HISTORY}


def test_missing_metrics_do_not_crash():
    s = {"id": "x", "status": "COMPLETED", "discipline": "STRENGTH",
         "scheduled_date": TODAY.isoformat(), "activity_metrics": None}
    a = analyze(s, [])
    assert a.headline == "Séance enregistrée"


# ------------------------------------------------------------ commentaires LLM
def _repo(sessions, existing=None):
    repo = MagicMock()
    repo.get_sessions_between.return_value = sessions
    repo.get_activity_insights.return_value = existing or {}
    return repo


def test_run_pending_comments_only_new_recent_sessions(monkeypatch):
    seen = []

    async def fake_chat(system, user, **kw):
        seen.append(user)
        return "Belle sortie."

    monkeypatch.setattr(llm, "chat", fake_chat)
    sessions = HISTORY + [run(0, id="new"), run(1, id="done")]
    repo = _repo(sessions, existing={"done": {"text": "déjà"}})
    out = asyncio.run(activity.run_pending(repo, "u1", today=TODAY))
    assert out == {"generated": 1, "failed": 0}
    repo.upsert_activity_insight.assert_called_once()
    assert repo.upsert_activity_insight.call_args.args[0] == "new"
    assert '"faits"' in seen[0] and "<donnees>" in seen[0]


def test_run_pending_is_bounded(monkeypatch):
    async def fake_chat(system, user, **kw):
        return "ok"

    monkeypatch.setattr(llm, "chat", fake_chat)
    sessions = [run(0, id=f"n{i}") for i in range(8)]
    out = asyncio.run(activity.run_pending(_repo(sessions), "u1", today=TODAY))
    assert out["generated"] == activity.MAX_PER_RUN


def test_run_pending_survives_missing_table():
    repo = _repo([run(0)])
    repo.get_activity_insights.side_effect = RuntimeError("relation does not exist")
    out = asyncio.run(activity.run_pending(repo, "u1", today=TODAY))
    assert out == {"generated": 0, "failed": 0}


def test_run_pending_continues_after_llm_failure(monkeypatch):
    calls = {"n": 0}

    async def flaky(system, user, **kw):
        calls["n"] += 1
        if calls["n"] == 1:
            raise llm.LLMUnavailable("timeout")
        return "ok"

    monkeypatch.setattr(llm, "chat", flaky)
    sessions = [run(0, id="a"), run(1, id="b")]
    out = asyncio.run(activity.run_pending(_repo(sessions), "u1", today=TODAY))
    assert out == {"generated": 1, "failed": 1}


# ------------------------------------------------------------ accueil
def test_overview_feed_carries_analysis_and_comment(monkeypatch):
    from fastapi.testclient import TestClient

    from app.config import settings
    from app.db.repo import get_repo
    from app.main import app

    monkeypatch.setattr(settings, "internal_api_key", "k")
    sessions = HISTORY + [run(0, id="new", dist=15000, minutes=85)]
    repo = MagicMock()
    repo.get_metrics_history.return_value = []
    repo.get_sessions_between.return_value = sessions
    repo.get_activity_insights.return_value = {"new": {"text": "Superbe sortie longue."}}
    app.dependency_overrides[get_repo] = lambda: repo
    try:
        r = TestClient(app).post("/dashboard/overview", headers={"X-Internal-Key": "k"},
                                 json={"user_id": "u1", "date": TODAY.isoformat()})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200
    first = r.json()["recent"][0]
    assert first["id"] == "new"
    assert first["analysis"]["headline"] == "Record de distance sur 90 jours"
    assert first["comment"] == "Superbe sortie longue."
    assert r.json()["recent"][1]["comment"] is None
