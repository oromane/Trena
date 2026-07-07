"""Monotonie et contrainte d'entraînement (Foster, 1998).

Complète la surveillance HRV : détecte le risque de surentraînement lié à
la STRUCTURE de la charge, pas seulement à la réponse physiologique.

    monotonie = moyenne(charges 7 j) / écart-type(charges 7 j)
    strain    = charge totale 7 j × monotonie

Interprétation classique :
  - monotonie < 1.5  : variété saine (jours durs / jours faciles)
  - 1.5 – 2.0        : vigilance
  - >= 2.0           : zone à risque (charge trop uniforme)

Le strain est relatif au niveau de charge de l'athlète : on le signale
quand monotonie ET charge hebdomadaire sont simultanément élevées.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

MONOTONY_CAUTION = 1.5
MONOTONY_HIGH = 2.0
MIN_WEEKLY_LOAD = 100.0  # en-dessous : volume trop faible pour être signifiant


@dataclass(frozen=True)
class FosterResult:
    monotony: float | None     # None si < 7 jours de données ou écart-type nul
    strain: float | None
    weekly_load: float
    level: str                 # 'ok' | 'caution' | 'high' | 'insufficient'


def foster_metrics(daily_loads_7d: list[float] | np.ndarray) -> FosterResult:
    """Calcule monotonie et strain sur les 7 derniers jours de charge.

    Args:
        daily_loads_7d: charges TRIMP quotidiennes, jours de repos = 0.
                        Doit contenir exactement les 7 derniers jours.
    """
    w = np.asarray(daily_loads_7d, dtype=float)
    weekly_load = float(w.sum())

    if w.size < 7 or weekly_load < MIN_WEEKLY_LOAD:
        return FosterResult(None, None, weekly_load, "insufficient")

    std = float(w.std(ddof=0))
    if std == 0.0:
        # Charge identique chaque jour : monotonie maximale par définition
        return FosterResult(None, None, weekly_load, "high")

    monotony = float(w.mean()) / std
    strain = weekly_load * monotony

    if monotony >= MONOTONY_HIGH:
        level = "high"
    elif monotony >= MONOTONY_CAUTION:
        level = "caution"
    else:
        level = "ok"

    return FosterResult(
        monotony=round(monotony, 2),
        strain=round(strain, 1),
        weekly_load=round(weekly_load, 1),
        level=level,
    )
