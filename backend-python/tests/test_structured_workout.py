"""Tests du constructeur de séance structuré (types, conditions, cibles)."""
import pytest

from app.engine.templates import build_structured_workout


def _track_session():
    return build_structured_workout("VMA piste", [
        {"type": "warmup", "condition": "time", "minutes": 15, "zone": 2, "target": "none"},
        {"kind": "repeat", "times": 6, "steps": [
            {"type": "work", "condition": "distance", "distance_m": 1000, "zone": 4,
             "target": "pace", "pace_low": 240, "pace_high": 250},
            {"type": "recovery", "condition": "lap", "zone": 1, "target": "none"},
        ]},
        {"type": "cooldown", "condition": "time", "minutes": 10, "zone": 1, "target": "none"},
    ])


def test_structured_track_session():
    w = _track_session()
    assert w["duration_minutes"] > 0 and w["target_trimp"] > 0
    assert w["session_type"] == "INTERVAL"
    details = " ".join(b["detail"] for b in w["structure"]["blocks"])
    assert "allure 4:00–4:10/km" in details   # bornes triées et formatées
    assert "jusqu'au lap (manuel)" in details  # condition lap
    assert "Échauffement" in {b["label"] for b in w["structure"]["blocks"]}


def test_structured_distance_estimates_duration():
    # 2 km en Z2 (allure nominale 5:45/km) ≈ 11–12 min
    w = build_structured_workout("Sortie", [
        {"type": "work", "condition": "distance", "distance_m": 2000, "zone": 2, "target": "hr"},
    ])
    assert 10 <= w["duration_minutes"] <= 13


@pytest.mark.parametrize("bad", [
    [{"type": "INVALID", "condition": "time", "minutes": 20, "zone": 2}],
    [{"type": "work", "condition": "time", "minutes": 20, "zone": 9}],
    [{"type": "work", "condition": "distance", "distance_m": 50, "zone": 2}],
    [{"type": "work", "condition": "time", "minutes": 20, "zone": 3, "target": "pace"}],
    [{"type": "work", "condition": "bad", "minutes": 20, "zone": 2}],
    [],
])
def test_structured_rejects_invalid(bad):
    with pytest.raises(ValueError):
        build_structured_workout("x", bad)


def test_structured_repeat_bounds():
    with pytest.raises(ValueError):
        build_structured_workout("x", [
            {"kind": "repeat", "times": 1, "steps": [
                {"type": "work", "condition": "time", "minutes": 3, "zone": 4, "target": "none"}]},
        ])
