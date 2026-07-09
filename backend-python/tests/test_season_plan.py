"""Tests du plan de saison enchaîné (multi-objectifs)."""
from datetime import date, timedelta

from app.engine.plan_generator import generate_season_plan

MASK = [60, 60, 60, 60, 60, 120, 120]  # lundi→dimanche


def test_season_chains_two_races():
    start = date(2026, 1, 5)  # lundi
    objs = [
        {"id": "A", "target_date": "2026-03-01"},
        {"id": "B", "target_date": "2026-06-01"},
    ]
    season = generate_season_plan(start, objs, MASK, sessions_per_week=4)
    assert season
    assert {s.objective_id for s in season} == {"A", "B"}
    # Séances de A avant la course A ; séances de B après la course A.
    assert all(s.scheduled_date < date(2026, 3, 1)
               for s in season if s.objective_id == "A")
    assert all(s.scheduled_date > date(2026, 3, 1)
               for s in season if s.objective_id == "B")
    # Aucune séance après la course la plus lointaine.
    assert all(s.scheduled_date < date(2026, 6, 1) for s in season)


def test_season_rest_gap_after_race():
    start = date(2026, 1, 5)
    objs = [
        {"id": "A", "target_date": "2026-03-01"},
        {"id": "B", "target_date": "2026-06-01"},
    ]
    season = generate_season_plan(start, objs, MASK, sessions_per_week=5,
                                  recovery_days_after_race=4)
    race = date(2026, 3, 1)
    # Aucune séance dans les 4 jours de récup suivant la course A.
    for d in range(1, 5):
        gap = race + timedelta(days=d)
        assert all(s.scheduled_date != gap for s in season)


def test_season_taper_before_each_race():
    # Les dernières semaines avant une course sont allégées (affûtage),
    # hérité de generate_plan. On raisonne sur la charge hebdomadaire.
    from collections import defaultdict

    start = date(2026, 1, 5)
    objs = [{"id": "A", "target_date": "2026-04-01"}]
    season = generate_season_plan(start, objs, MASK, sessions_per_week=5)

    weekly: dict = defaultdict(int)
    for s in season:
        monday = s.scheduled_date - timedelta(days=s.scheduled_date.weekday())
        weekly[monday] += s.target_trimp
    weeks = [weekly[w] for w in sorted(weekly)]
    assert len(weeks) >= 3
    # Les 2 dernières semaines de bloc sont sous le pic de charge.
    assert weeks[-1] < max(weeks)
    assert weeks[-2] < max(weeks)


def test_season_ignores_past_races():
    start = date(2026, 5, 1)
    objs = [
        {"id": "past", "target_date": "2026-03-01"},
        {"id": "future", "target_date": "2026-08-01"},
    ]
    season = generate_season_plan(start, objs, MASK, sessions_per_week=4)
    assert {s.objective_id for s in season} == {"future"}


def test_season_empty_when_all_past():
    start = date(2026, 9, 1)
    objs = [{"id": "A", "target_date": "2026-03-01"}]
    assert generate_season_plan(start, objs, MASK) == []
