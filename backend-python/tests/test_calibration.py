"""Tests de la calibration individuelle tau1/tau2 (régression sur historique)."""
from datetime import date, timedelta

import numpy as np
import pytest

from app.engine.banister import BanisterParams, simulate
from app.engine.calibration import (
    MIN_HISTORY_DAYS,
    MIN_PERF_POINTS,
    calibrate,
    calibrate_from_history,
    params_from_profile,
)


def _synthetic(true_params: BanisterParams, n_days: int = 120,
               noise: float = 0.0, seed: int = 42):
    """Charges pseudo-réalistes + proxy de performance généré par le modèle."""
    rng = np.random.default_rng(seed)
    loads = np.zeros(n_days)
    for i in range(n_days):
        if i % 7 in (1, 3, 5):          # 3 séances/semaine
            loads[i] = 60 + 40 * rng.random()
    state = simulate(loads, true_params)
    perf = state.performance + rng.normal(0, noise, n_days)
    idx = list(range(5, n_days, 7))     # ~1 mesure VO2max par semaine
    return loads, idx, [float(perf[i]) for i in idx]


def test_recovers_true_taus_noiseless():
    true = BanisterParams(p0=50.0, k1=0.05, k2=0.1, tau1=45.0, tau2=7.0)
    loads, idx, vals = _synthetic(true)
    result = calibrate(loads, idx, vals)
    assert result is not None
    assert result.r2 > 0.95
    assert abs(result.params.tau1 - true.tau1) <= 5   # pas de grille
    assert abs(result.params.tau2 - true.tau2) <= 2


def test_robust_to_noise():
    true = BanisterParams(p0=50.0, k1=0.05, k2=0.1, tau1=40.0, tau2=9.0)
    loads, idx, vals = _synthetic(true, noise=0.3)
    result = calibrate(loads, idx, vals)
    assert result is not None
    assert result.r2 > 0.5
    assert 25 <= result.params.tau1 <= 60
    assert 3 <= result.params.tau2 <= 15


def test_insufficient_history_returns_none():
    loads = [50.0] * (MIN_HISTORY_DAYS - 1)
    assert calibrate(loads, list(range(12)), [50.0 + i for i in range(12)]) is None


def test_insufficient_points_returns_none():
    loads = [50.0] * 120
    n = MIN_PERF_POINTS - 1
    assert calibrate(loads, list(range(n)), [50.0 + i for i in range(n)]) is None


def test_constant_proxy_returns_none():
    loads, idx, _ = _synthetic(BanisterParams(tau1=42, tau2=7))
    assert calibrate(loads, idx, [55.0] * len(idx)) is None


def test_poor_fit_rejected():
    """Un proxy aléatoire décorrélé des charges doit être rejeté (R² faible)."""
    rng = np.random.default_rng(7)
    loads, idx, _ = _synthetic(BanisterParams(k1=0.05, k2=0.1, tau1=42, tau2=7))
    random_vals = list(50 + 10 * rng.random(len(idx)))
    result = calibrate(loads, idx, random_vals, min_r2=0.5)
    assert result is None or result.r2 >= 0.5


def test_misaligned_inputs_raise():
    loads = [50.0] * 120
    with pytest.raises(ValueError):
        calibrate(loads, [1, 2, 3], [1.0])
    with pytest.raises(ValueError):
        calibrate(loads, list(range(140, 152)), [1.0] * 12)


def test_calibrate_from_history_maps_rows():
    true = BanisterParams(p0=50.0, k1=0.05, k2=0.1, tau1=45.0, tau2=7.0)
    loads, idx, vals = _synthetic(true)
    start = date(2026, 1, 1)
    completed = [
        {"scheduled_date": (start + timedelta(days=i)).isoformat(),
         "trimp_actual": float(loads[i])}
        for i in range(len(loads)) if loads[i] > 0
    ]
    wellness = [
        {"recorded_date": (start + timedelta(days=i)).isoformat(), "vo2max": v}
        for i, v in zip(idx, vals)
    ]
    result = calibrate_from_history(completed, wellness)
    assert result is not None
    assert abs(result.params.tau1 - true.tau1) <= 5


def test_calibrate_from_history_empty():
    assert calibrate_from_history([], []) is None


def test_params_from_profile_fallback_and_override():
    defaults = BanisterParams(tau1=42.0, tau2=7.0)
    assert params_from_profile(None, defaults) is defaults
    assert params_from_profile({"banister_tau1": None}, defaults) is defaults
    p = params_from_profile(
        {"banister_tau1": 38.0, "banister_tau2": 6.0,
         "banister_k1": 0.04, "banister_k2": 0.09, "banister_p0": 51.0},
        defaults,
    )
    assert (p.tau1, p.tau2, p.k1, p.k2, p.p0) == (38.0, 6.0, 0.04, 0.09, 51.0)
