"""Fenêtre glissante idempotente — repo + client Garmin factices."""
from datetime import date, timedelta

from app.services import plan_sync


class FakeRepo:
    def __init__(self, sessions):
        self._sessions = sessions          # list[dict] training_sessions
        self.links = {}                     # session_id -> link row
        self.revisions = []
        self._rev = 0

    # plan_revisions
    def next_revision_number(self, user_id):
        return self._rev + 1

    def insert_plan_revision(self, user_id, revision, trigger, rationale, snap):
        self._rev = revision
        self.revisions.append({"revision": revision, "trigger": trigger})
        return {"revision": revision}

    # sessions
    def get_sessions_between(self, user_id, start, end):
        return [s for s in self._sessions
                if start <= date.fromisoformat(s["scheduled_date"]) <= end]

    # links
    def get_links_in_window(self, user_id, start, end):
        out = []
        for sid, link in self.links.items():
            s = next(x for x in self._sessions if x["id"] == sid)
            if start <= date.fromisoformat(s["scheduled_date"]) <= end:
                out.append({**link, "session_id": sid})
        return out

    def upsert_session_link(self, user_id, session_id, wid, sid, revision):
        self.links[session_id] = {"garmin_workout_id": wid,
                                  "garmin_scheduled_id": sid,
                                  "plan_revision": revision}

    def delete_session_link(self, session_id):
        self.links.pop(session_id, None)


class FakeClient:
    def __init__(self):
        self.live_workouts = set()
        self.live_schedules = set()
        self._wid = 0
        self._sid = 0
        self.pushes = 0
        self.retracts = 0

    def create_workout(self, payload):
        self._wid += 1
        self.live_workouts.add(self._wid)
        self.pushes += 1
        return self._wid

    def schedule_workout(self, workout_id, day):
        self._sid += 1
        self.live_schedules.add(self._sid)
        return self._sid

    def unschedule_workout(self, schedule_id):
        self.live_schedules.discard(schedule_id)
        self.retracts += 1

    def delete_workout(self, workout_id):
        self.live_workouts.discard(workout_id)


def _sessions_14_days():
    start = date(2026, 7, 13)
    out = []
    for i in range(20):  # 20 jours de plan, fenêtre 14
        d = start + timedelta(days=i)
        stype = ["ENDURANCE", "INTERVAL", "TEMPO", "RECOVERY"][i % 4]
        out.append({"id": f"s{i}", "scheduled_date": d.isoformat(),
                    "session_type": stype, "duration_planned_minutes": 45,
                    "status": "PLANNED", "title": f"J{i}"})
    return out


def test_first_replan_pushes_window_only():
    sessions = _sessions_14_days()
    repo, client = FakeRepo(sessions), FakeClient()
    today = date(2026, 7, 13)
    res = plan_sync.run_replan(repo, client, "u1", trigger="WEEKLY",
                               metrics_snapshot={"acwr": 1.1}, window_days=14, today=today)
    assert res["revision"] == 1
    assert res["retracted"] == 0
    # 15 jours dans [today, today+14] inclus
    assert res["pushed"] == 15
    assert len(client.live_workouts) == 15
    assert len(repo.links) == 15


def test_second_replan_is_idempotent_no_landfill():
    sessions = _sessions_14_days()
    repo, client = FakeRepo(sessions), FakeClient()
    today = date(2026, 7, 13)
    plan_sync.run_replan(repo, client, "u1", window_days=14, today=today)
    live_after_1 = len(client.live_workouts)

    res2 = plan_sync.run_replan(repo, client, "u1", trigger="HRV_LOW",
                                metrics_snapshot={"acwr": 1.38}, window_days=14, today=today)
    assert res2["revision"] == 2
    assert res2["retracted"] == 15                 # retract exact de la fenêtre 1
    assert res2["pushed"] == 15
    # pas de décharge : l'état de la montre ne grossit pas
    assert len(client.live_workouts) == live_after_1
    assert len(repo.links) == 15


def test_completed_sessions_not_pushed():
    sessions = _sessions_14_days()
    sessions[0]["status"] = "COMPLETED"            # déjà faite → pas de push
    repo, client = FakeRepo(sessions), FakeClient()
    today = date(2026, 7, 13)
    res = plan_sync.run_replan(repo, client, "u1", window_days=14, today=today)
    assert res["pushed"] == 14
