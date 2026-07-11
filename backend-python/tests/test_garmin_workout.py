import pytest

from app.engine.garmin_workout import (Repeat, Step, build_workout,
                                       from_session)
from app.services.garmin_sync import GarminClient


# ------------------------------------------------------------------ builder
def test_build_time_hr_zone_step():
    wk = build_workout("T", [Step("interval", duration_s=600, hr_zone=3)])
    step = wk["workoutSegments"][0]["workoutSteps"][0]
    assert step["endCondition"]["conditionTypeKey"] == "time"
    assert step["endConditionValue"] == 600
    assert step["targetType"]["workoutTargetTypeKey"] == "heart.rate.zone"
    assert step["zoneNumber"] == 3


def test_distance_and_pace_zone():
    wk = build_workout("I", [Step("interval", distance_m=1000, pace_mps=(4.0, 4.3))])
    step = wk["workoutSegments"][0]["workoutSteps"][0]
    assert step["endCondition"]["conditionTypeKey"] == "distance"
    assert step["endConditionValue"] == 1000
    assert step["targetType"]["workoutTargetTypeKey"] == "pace.zone"
    assert step["targetValueOne"] == 4.0 and step["targetValueTwo"] == 4.3


def test_repeat_group_and_step_order():
    wk = build_workout("R", [
        Step("warmup", duration_s=600, hr_zone=2),
        Repeat(3, [Step("interval", duration_s=180, hr_zone=4),
                   Step("recovery", duration_s=120, hr_zone=1)]),
        Step("cooldown", duration_s=300, hr_zone=1),
    ])
    steps = wk["workoutSegments"][0]["workoutSteps"]
    assert steps[1]["type"] == "RepeatGroupDTO"
    assert steps[1]["numberOfIterations"] == 3
    # stepOrder monotone et unique à travers le groupe
    orders = [steps[0]["stepOrder"], steps[1]["stepOrder"],
              *[c["stepOrder"] for c in steps[1]["workoutSteps"]], steps[2]["stepOrder"]]
    assert orders == sorted(orders) and len(set(orders)) == len(orders)


def test_from_session_interval_has_repeat():
    wk = from_session("INTERVAL", 60)
    kinds = [s.get("type") for s in wk["workoutSegments"][0]["workoutSteps"]]
    assert "RepeatGroupDTO" in kinds


def test_invalid_step():
    with pytest.raises(ValueError):
        Step("interval", duration_s=600, distance_m=1000)   # deux critères
    with pytest.raises(ValueError):
        Step("interval", hr_zone=9)                          # zone hors 1..5
    with pytest.raises(ValueError):
        Repeat(0, [Step("interval", duration_s=60)])         # times < 1


# ------------------------------------------------------------------ push (mock garth)
class _FakeGarth:
    def __init__(self):
        self.calls = []
        self.workouts = {}
        self.schedules = {}
        self._wid = 100
        self._sid = 500

    def connectapi(self, path, method="GET", **kwargs):
        self.calls.append((method, path, kwargs.get("json")))
        if method == "POST" and path.endswith("/workout"):
            self._wid += 1
            self.workouts[self._wid] = kwargs["json"]
            return {"workoutId": self._wid}
        if method == "POST" and "/schedule/" in path:
            self._sid += 1
            self.schedules[self._sid] = int(path.rsplit("/", 1)[1])
            return {"workoutScheduleId": self._sid}
        if method == "DELETE" and "/workout/" in path:
            self.workouts.pop(int(path.rsplit("/", 1)[1]), None)
            return {}
        if method == "DELETE" and "/schedule/" in path:
            self.schedules.pop(int(path.rsplit("/", 1)[1]), None)
            return {}
        return {}


class _FakeGarmin:
    def __init__(self):
        self.garth = _FakeGarth()


def test_push_create_schedule_unschedule_delete():
    from datetime import date
    g = _FakeGarmin()
    client = GarminClient(g)
    payload = from_session("TEMPO", 45)

    wid = client.create_workout(payload)
    assert wid in g.garth.workouts

    sid = client.schedule_workout(wid, date(2026, 7, 20))
    assert g.garth.schedules[sid] == wid

    client.unschedule_workout(sid)
    assert sid not in g.garth.schedules

    client.delete_workout(wid)
    assert wid not in g.garth.workouts
