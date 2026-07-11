import pytest

from app.engine.gap import (grade_adjust_factor, gap_from_summary,
                            gap_pace_s_per_km, minetti_cost)


def test_flat_factor_is_one():
    assert grade_adjust_factor(0.0) == pytest.approx(1.0)


def test_uphill_costs_more_downhill_less():
    assert grade_adjust_factor(0.10) > 1.0
    assert grade_adjust_factor(-0.05) < 1.0


def test_uphill_gap_is_faster_than_actual():
    """En montée, l'allure-plat-équivalente (GAP) est plus rapide (s/km plus bas)."""
    actual = 300  # 5:00/km réel
    gap = gap_pace_s_per_km(actual, 0.08)
    assert gap is not None and gap < actual


def test_loop_gap_near_actual():
    """Boucle (D+ ≈ D-) → pente nette ≈ 0 → GAP ≈ allure brute."""
    gap = gap_from_summary(avg_pace_s_per_km=300, distance_m=10000,
                           elevation_gain_m=150, elevation_loss_m=150)
    assert gap == pytest.approx(300, abs=1)


def test_net_climb_gap_faster():
    gap = gap_from_summary(avg_pace_s_per_km=330, distance_m=5000,
                           elevation_gain_m=250, elevation_loss_m=0)
    assert gap is not None and gap < 330


def test_domain_clamped():
    # Au-delà du domaine de validité, pas d'explosion : coût borné.
    assert minetti_cost(5.0) == minetti_cost(0.45)
    assert minetti_cost(-5.0) == minetti_cost(-0.45)


def test_missing_data_returns_none():
    assert gap_from_summary(None, 10000, 100) is None
    assert gap_from_summary(300, 0, 100) is None
    assert gap_pace_s_per_km(0, 0.1) is None
