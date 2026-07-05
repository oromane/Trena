"""Analyse HRV : ligne de base 28 jours, z-score et niveau de disponibilité."""
from enum import Enum

import numpy as np


class Readiness(str, Enum):
    NORMAL = "NORMAL"        # planning maintenu
    CAUTION = "CAUTION"      # intensité plafonnée
    REDUCE = "REDUCE"        # séance remplacée par basse intensité


def hrv_zscore(hrv_history: list[float] | np.ndarray, hrv_today: float) -> float:
    """Z-score du HRV du jour vs baseline (histoire récente, idéalement 28 jours)."""
    h = np.asarray(hrv_history, dtype=float)
    h = h[~np.isnan(h)]
    if h.size < 7:
        raise ValueError("au moins 7 jours d'historique HRV requis")
    std = h.std(ddof=1)
    if std == 0:
        return 0.0
    return float((hrv_today - h.mean()) / std)


def sleep_deficit(sleep_history: list[float] | np.ndarray, sleep_today: float) -> float:
    """Déficit de sommeil (minutes) vs moyenne récente. Positif = déficit."""
    s = np.asarray(sleep_history, dtype=float)
    s = s[~np.isnan(s)]
    if s.size == 0:
        return 0.0
    return float(s.mean() - sleep_today)


def assess_readiness(
    hrv_history: list[float],
    hrv_today: float,
    sleep_history: list[float],
    sleep_today: float,
    caution_z: float = -1.0,
    critical_z: float = -1.5,
    sleep_deficit_threshold: float = 60.0,
) -> tuple[Readiness, float]:
    """Règle de décision quotidienne (spec §5.2).

    Returns:
        (niveau de disponibilité, z-score HRV)
    """
    z = hrv_zscore(hrv_history, hrv_today)
    deficit = sleep_deficit(sleep_history, sleep_today)

    if z <= critical_z and deficit >= sleep_deficit_threshold:
        return Readiness.REDUCE, z
    if z <= caution_z:
        return Readiness.CAUTION, z
    return Readiness.NORMAL, z


def impute_missing(values: list[float | None], window: int = 7) -> list[float]:
    """Imputation par moyenne mobile centrée sur `window` jours (spec §4.2)."""
    arr = np.array([np.nan if v is None else float(v) for v in values])
    result = arr.copy()
    half = window // 2
    for i in np.where(np.isnan(arr))[0]:
        lo, hi = max(0, i - half), min(arr.size, i + half + 1)
        neighborhood = arr[lo:hi]
        valid = neighborhood[~np.isnan(neighborhood)]
        result[i] = valid.mean() if valid.size else 0.0
    return result.tolist()
