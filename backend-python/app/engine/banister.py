"""Modèle Fitness-Fatigue de Banister.

Implémentation récursive (équivalente à la forme intégrale, O(n)) :
    fitness(t) = fitness(t-1) * exp(-1/tau1) + w(t)
    fatigue(t) = fatigue(t-1) * exp(-1/tau2) + w(t)
    p(t) = p0 + k1 * fitness(t) - k2 * fatigue(t)
"""
from dataclasses import dataclass, field

import numpy as np


@dataclass
class BanisterParams:
    p0: float = 0.0
    k1: float = 1.0
    k2: float = 2.0
    tau1: float = 42.0  # jours — décroissance de l'aptitude
    tau2: float = 7.0   # jours — décroissance de la fatigue

    def __post_init__(self) -> None:
        if self.tau1 <= 0 or self.tau2 <= 0:
            raise ValueError("tau1 et tau2 doivent être strictement positifs")
        if self.k1 < 0 or self.k2 < 0:
            raise ValueError("k1 et k2 doivent être positifs")


@dataclass
class BanisterState:
    """Trajectoire complète calculée sur une série de charges."""
    fitness: np.ndarray = field(default_factory=lambda: np.array([]))
    fatigue: np.ndarray = field(default_factory=lambda: np.array([]))
    performance: np.ndarray = field(default_factory=lambda: np.array([]))

    @property
    def form(self) -> np.ndarray:
        """Fraîcheur (TSB-like) : fitness - fatigue."""
        return self.fitness - self.fatigue


def simulate(loads: np.ndarray | list[float], params: BanisterParams) -> BanisterState:
    """Calcule fitness, fatigue et performance jour par jour.

    Args:
        loads: charges quotidiennes (TRIMP), une valeur par jour (0 = repos).
        params: paramètres individuels du modèle.
    """
    w = np.asarray(loads, dtype=float)
    if w.ndim != 1:
        raise ValueError("loads doit être un vecteur 1D")
    if np.any(w < 0):
        raise ValueError("les charges TRIMP doivent être positives")

    n = w.size
    fitness = np.zeros(n)
    fatigue = np.zeros(n)
    d1 = np.exp(-1.0 / params.tau1)
    d2 = np.exp(-1.0 / params.tau2)

    prev_fit = 0.0
    prev_fat = 0.0
    for i in range(n):
        prev_fit = prev_fit * d1 + w[i]
        prev_fat = prev_fat * d2 + w[i]
        fitness[i] = prev_fit
        fatigue[i] = prev_fat

    performance = params.p0 + params.k1 * fitness - params.k2 * fatigue
    return BanisterState(fitness=fitness, fatigue=fatigue, performance=performance)


def project(
    loads_history: np.ndarray | list[float],
    loads_future: np.ndarray | list[float],
    params: BanisterParams,
) -> BanisterState:
    """Projette la trajectoire future en tenant compte de l'historique."""
    full = np.concatenate([np.asarray(loads_history, dtype=float),
                           np.asarray(loads_future, dtype=float)])
    state = simulate(full, params)
    n_hist = len(loads_history)
    return BanisterState(
        fitness=state.fitness[n_hist:],
        fatigue=state.fatigue[n_hist:],
        performance=state.performance[n_hist:],
    )
