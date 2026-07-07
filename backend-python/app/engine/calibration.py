"""Calibration individuelle des paramètres de Banister (tau1/tau2/k1/k2/p0).

Principe : pour un couple (tau1, tau2) fixé, la performance du modèle
    p(t) = p0 + k1 * fitness(t) - k2 * fatigue(t)
est LINÉAIRE en (p0, k1, k2). On résout donc exactement (p0, k1, k2) par
moindres carrés pour chaque couple d'une grille physiologiquement plausible,
et on retient le couple minimisant l'erreur quadratique.

Proxy de performance : le VO2max Garmin (table garmin_wellness), mesuré
irrégulièrement — la régression n'utilise que les jours où une mesure existe.

Garde-fous :
  - >= MIN_HISTORY_DAYS jours d'historique de charges (8 semaines)
  - >= MIN_PERF_POINTS mesures de performance distinctes
  - R² >= min_r2, sinon la calibration est rejetée (retour None) et
    l'appelant conserve les paramètres par défaut.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np

from .banister import BanisterParams, simulate

MIN_HISTORY_DAYS = 56   # 8 semaines


def params_from_profile(profile: dict | None,
                        defaults: BanisterParams) -> BanisterParams:
    """Paramètres calibrés du profil si présents, sinon défauts moteur."""
    if not profile or profile.get("banister_tau1") is None:
        return defaults
    return BanisterParams(
        p0=float(profile.get("banister_p0") or defaults.p0),
        k1=float(profile.get("banister_k1") or defaults.k1),
        k2=float(profile.get("banister_k2") or defaults.k2),
        tau1=float(profile["banister_tau1"]),
        tau2=float(profile.get("banister_tau2") or defaults.tau2),
    )
MIN_PERF_POINTS = 10
DEFAULT_MIN_R2 = 0.2

# Grilles physiologiquement plausibles (jours)
TAU1_GRID = tuple(range(25, 61, 5))   # aptitude : 25..60
TAU2_GRID = tuple(range(3, 16, 2))    # fatigue  : 3..15


@dataclass(frozen=True)
class CalibrationResult:
    params: BanisterParams
    r2: float
    rmse: float
    n_days: int
    n_points: int


def _fit_linear(fitness: np.ndarray, fatigue: np.ndarray,
                perf: np.ndarray) -> tuple[float, float, float, float] | None:
    """Résout p ≈ p0 + k1*fitness - k2*fatigue par moindres carrés.

    Retourne (p0, k1, k2, sse) ou None si les contraintes k1,k2 >= 0
    sont violées (couple tau non physiologique pour ces données).
    """
    X = np.column_stack([np.ones_like(fitness), fitness, -fatigue])
    coef, *_ = np.linalg.lstsq(X, perf, rcond=None)
    p0, k1, k2 = float(coef[0]), float(coef[1]), float(coef[2])
    if k1 < 0 or k2 < 0:
        return None
    residuals = perf - X @ coef
    return p0, k1, k2, float(residuals @ residuals)


def calibrate(
    loads: np.ndarray | list[float],
    perf_indices: list[int],
    perf_values: list[float],
    *,
    tau1_grid: tuple[int, ...] = TAU1_GRID,
    tau2_grid: tuple[int, ...] = TAU2_GRID,
    min_r2: float = DEFAULT_MIN_R2,
) -> CalibrationResult | None:
    """Calibre les paramètres sur un historique de charges quotidiennes.

    Args:
        loads: charges TRIMP quotidiennes (0 = repos), chronologiques.
        perf_indices: indices (jours) dans `loads` où une mesure existe.
        perf_values: valeurs du proxy de performance à ces indices.
        min_r2: qualité d'ajustement minimale pour accepter la calibration.
    """
    w = np.asarray(loads, dtype=float)
    idx = np.asarray(perf_indices, dtype=int)
    perf = np.asarray(perf_values, dtype=float)

    if idx.size != perf.size:
        raise ValueError("perf_indices et perf_values doivent être alignés")
    if idx.size and (np.any(idx < 0) or np.any(idx >= w.size)):
        raise ValueError("perf_indices hors de l'historique")
    if w.size < MIN_HISTORY_DAYS or idx.size < MIN_PERF_POINTS:
        return None

    ss_tot = float(np.sum((perf - perf.mean()) ** 2))
    if ss_tot == 0.0:  # proxy constant : rien à calibrer
        return None

    best: tuple[float, BanisterParams] | None = None
    for tau1 in tau1_grid:
        for tau2 in tau2_grid:
            if tau2 >= tau1:  # la fatigue décroît plus vite que l'aptitude
                continue
            state = simulate(w, BanisterParams(tau1=tau1, tau2=tau2))
            fit = _fit_linear(state.fitness[idx], state.fatigue[idx], perf)
            if fit is None:
                continue
            p0, k1, k2, sse = fit
            if best is None or sse < best[0]:
                best = (sse, BanisterParams(
                    p0=p0, k1=k1, k2=k2, tau1=float(tau1), tau2=float(tau2)))

    if best is None:
        return None
    sse, params = best
    r2 = 1.0 - sse / ss_tot
    if r2 < min_r2:
        return None
    return CalibrationResult(
        params=params,
        r2=round(r2, 4),
        rmse=round(float(np.sqrt(sse / idx.size)), 4),
        n_days=int(w.size),
        n_points=int(idx.size),
    )


def calibrate_from_history(
    completed_loads: list[dict],
    wellness_rows: list[dict],
    *,
    min_r2: float = DEFAULT_MIN_R2,
) -> CalibrationResult | None:
    """Adapte les lignes Supabase au format attendu par `calibrate`.

    Args:
        completed_loads: lignes {scheduled_date, trimp_actual} (COMPLETED).
        wellness_rows: lignes garmin_wellness {recorded_date, vo2max, ...}.
    """
    loads_by_date: dict[date, float] = {}
    for row in completed_loads:
        if row.get("trimp_actual"):
            d = date.fromisoformat(row["scheduled_date"])
            loads_by_date[d] = loads_by_date.get(d, 0.0) + float(row["trimp_actual"])

    perf_by_date: dict[date, float] = {
        date.fromisoformat(r["recorded_date"]): float(r["vo2max"])
        for r in wellness_rows
        if r.get("vo2max") is not None
    }
    if not loads_by_date or not perf_by_date:
        return None

    start = min(loads_by_date)
    end = max(max(loads_by_date), max(perf_by_date))
    n_days = (end - start).days + 1
    if n_days < MIN_HISTORY_DAYS:
        return None

    loads = [loads_by_date.get(start + timedelta(days=i), 0.0)
             for i in range(n_days)]
    perf_indices, perf_values = [], []
    for d, v in sorted(perf_by_date.items()):
        i = (d - start).days
        if 0 <= i < n_days:
            perf_indices.append(i)
            perf_values.append(v)

    return calibrate(
        loads, perf_indices, perf_values, min_r2=min_r2,
    )
