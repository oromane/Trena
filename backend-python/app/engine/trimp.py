"""Calcul du score TRIMP (Training Impulse) de Banister.

TRIMP = durée (min) × HRr × y
avec HRr = (FC_moyenne - FC_repos) / (FC_max - FC_repos)
et  y = 0.64 × e^(1.92 × HRr)  (homme)
    y = 0.86 × e^(1.67 × HRr)  (femme)
"""
import math


def heart_rate_reserve_ratio(hr_avg: float, hr_rest: float, hr_max: float) -> float:
    if hr_max <= hr_rest:
        raise ValueError("hr_max doit être supérieur à hr_rest")
    ratio = (hr_avg - hr_rest) / (hr_max - hr_rest)
    return min(max(ratio, 0.0), 1.0)


def trimp(
    duration_minutes: float,
    hr_avg: float,
    hr_rest: float,
    hr_max: float,
    sex: str = "M",
) -> float:
    """Score TRIMP d'une séance."""
    if duration_minutes < 0:
        raise ValueError("duration_minutes doit être positif")
    hrr = heart_rate_reserve_ratio(hr_avg, hr_rest, hr_max)
    if sex.upper() == "F":
        y = 0.86 * math.exp(1.67 * hrr)
    else:
        y = 0.64 * math.exp(1.92 * hrr)
    return duration_minutes * hrr * y
