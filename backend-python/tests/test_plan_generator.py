from datetime import date, timedelta

import pytest

from app.engine.plan_generator import (
    PlannedDay,
    generate_plan,
    weekly_trimp_targets,
)

MASK = [60, 0, 60, 0, 60, 120, 90]  # lun, mer, ven, sam, dim disponibles


def test_weekly_targets_ramp_and_recovery():
    t = weekly_trimp_targets(8, 300, ramp_rate=0.05, recovery_every=4)
    assert t[1] > t[0]                    # progression
    assert t[3] < t[2]                    # semaine 4 = récupération
    assert t[-1] < t[-2] < max(t)         # taper décroissant


def test_taper_last_two_weeks():
    t = weekly_trimp_targets(12, 300)
    # Ratio 0.6/0.4 entre les 2 semaines d'affûtage, toutes deux sous le pic
    assert t[-1] / t[-2] == pytest.approx(0.4 / 0.6)
    assert t[-2] < max(t)
    assert t[-1] < t[-2]


def test_generate_plan_respects_availability():
    start = date(2026, 7, 6)  # un lundi
    target = start + timedelta(weeks=10)
    plan = generate_plan(start, target, MASK)
    assert plan, "le plan ne doit pas être vide"
    for p in plan:
        weekday = p.scheduled_date.weekday()
        assert MASK[weekday] >= 30, f"séance un jour indisponible : {p}"
        assert p.duration_minutes <= MASK[weekday]


def test_no_session_on_or_after_race_day():
    start = date(2026, 7, 6)
    target = start + timedelta(weeks=6)
    plan = generate_plan(start, target, MASK)
    assert all(p.scheduled_date < target for p in plan)


def test_no_session_before_start_date():
    start = date(2026, 7, 9)  # un jeudi (semaine partielle)
    target = start + timedelta(weeks=8)
    plan = generate_plan(start, target, MASK)
    assert all(p.scheduled_date >= start for p in plan)


def test_key_sessions_present():
    start = date(2026, 7, 6)
    target = start + timedelta(weeks=8)
    plan = generate_plan(start, target, MASK)
    types = {p.session_type for p in plan}
    assert "INTERVAL" in types
    assert "ENDURANCE" in types


def test_invalid_inputs():
    with pytest.raises(ValueError):
        generate_plan(date(2026, 7, 6), date(2026, 7, 6), MASK)
    with pytest.raises(ValueError):
        generate_plan(date(2026, 7, 6), date(2026, 9, 6), [60, 60])
