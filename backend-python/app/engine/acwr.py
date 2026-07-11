"""ACWR — Acute:Chronic Workload Ratio.

Contrainte dure de blessure, complémentaire au modèle de Banister : là où
`fatigue` (tau2=7) mesure l'état, l'ACWR mesure la *dynamique* de charge —
à quelle vitesse tu montes le volume. Au-dessus du plafond, le risque de
blessure grimpe indépendamment de la forme.

Deux formulations, sur les mêmes charges quotidiennes (TRIMP) :
    * rolling  : moyenne aiguë 7 j / moyenne chronique 28 j (Gabbett, robuste).
    * EWMA     : ratio des moyennes exponentielles (Williams), couplé à Banister.

Les charges sont une série quotidienne, une valeur par jour (0 = repos) —
mêmes conventions que `banister.simulate`.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Plafonds — ce sont NOS contraintes (pas une boîte noire Garmin).
ACWR_CEILING = 1.30      # cible : ne pas dépasser en progression
ACWR_SWEETSPOT = (0.80, 1.30)
ACWR_DANGER = 1.50       # zone rouge documentée (risque de blessure ↑)


@dataclass
class AcwrPoint:
    acute: float
    chronic: float
    ratio: float

    @property
    def verdict(self) -> str:
        if self.ratio == 0.0:
            return "n/a"
        if self.ratio < ACWR_SWEETSPOT[0]:
            return "détraining"
        if self.ratio <= ACWR_CEILING:
            return "optimal"
        if self.ratio < ACWR_DANGER:
            return "prudence"
        return "danger"


def _validate(loads) -> np.ndarray:
    w = np.asarray(loads, dtype=float)
    if w.ndim != 1:
        raise ValueError("loads doit être un vecteur 1D")
    if np.any(w < 0):
        raise ValueError("les charges TRIMP doivent être positives")
    return w


def acwr_rolling(loads, acute_days: int = 7, chronic_days: int = 28) -> float:
    """ACWR (moyennes glissantes) au dernier jour de la série.

    Retourne 0.0 tant que l'historique est plus court que `acute_days` ou que
    la charge chronique est nulle (évite la division par zéro au démarrage).
    """
    if acute_days <= 0 or chronic_days <= 0 or acute_days > chronic_days:
        raise ValueError("0 < acute_days <= chronic_days requis")
    w = _validate(loads)
    if w.size < acute_days:
        return 0.0
    acute = float(w[-acute_days:].mean())
    chronic_window = w[-chronic_days:] if w.size >= chronic_days else w
    chronic = float(chronic_window.mean())
    return acute / chronic if chronic > 1e-9 else 0.0


def acwr_series(loads, acute_days: int = 7, chronic_days: int = 28) -> np.ndarray:
    """ACWR jour par jour (même longueur que `loads`)."""
    w = _validate(loads)
    return np.array([
        acwr_rolling(w[: i + 1], acute_days, chronic_days)
        for i in range(w.size)
    ])


def acwr_ewma(loads, acute_tau: int = 7, chronic_tau: int = 28) -> float:
    """ACWR EWMA (Williams) : ratio des moyennes exponentielles au dernier jour.

    Couplé au même noyau exponentiel que Banister. Sensible au démarrage à
    froid (série courte partant de 0) : préférer `acwr_rolling` tant que
    l'historique < chronic_tau, ou amorcer depuis un backfill.
    """
    if acute_tau <= 0 or chronic_tau <= 0:
        raise ValueError("tau strictement positifs requis")
    w = _validate(loads)
    if w.size == 0:
        return 0.0
    a_alpha = 1.0 - np.exp(-1.0 / acute_tau)
    c_alpha = 1.0 - np.exp(-1.0 / chronic_tau)
    acute = chronic = 0.0
    for x in w:
        acute += a_alpha * (x - acute)
        chronic += c_alpha * (x - chronic)
    return acute / chronic if chronic > 1e-9 else 0.0


def acwr_point(loads, acute_days: int = 7, chronic_days: int = 28) -> AcwrPoint:
    """ACWR + charges aiguë/chronique + verdict, au dernier jour."""
    w = _validate(loads)
    if w.size < acute_days:
        return AcwrPoint(0.0, 0.0, 0.0)
    acute = float(w[-acute_days:].mean())
    chronic_window = w[-chronic_days:] if w.size >= chronic_days else w
    chronic = float(chronic_window.mean())
    ratio = acute / chronic if chronic > 1e-9 else 0.0
    return AcwrPoint(acute=acute, chronic=chronic, ratio=ratio)
