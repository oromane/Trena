"""GAP — Grade-Adjusted Pace (courbe de Minetti).

Coût métabolique de la course en fonction de la pente (Minetti et al., 2002).
Sert à comparer des allures sur terrains vallonnés : à effort égal, courir en
côte est plus lent que sur le plat. La GAP ramène l'allure réelle à une allure
équivalente sur le plat.

Deux niveaux d'usage :
    * `grade_adjust_factor(pente)` : le multiplicateur pur, exact par échantillon
      quand on dispose du flux (vitesse + altitude seconde par seconde).
    * `gap_from_summary(...)` : estimation depuis le résumé d'activité (allure
      moyenne + D+ net / distance). Approximation — la pente moyenne d'une boucle
      est ~0 ; utile surtout sur du point-à-point ou du vallonné soutenu.

À implémenter dès le jour 1 : le coût marginal est nul, et rétro-adapter tout
l'historique plus tard coûte cher.
"""
from __future__ import annotations

# Coefficients du polynôme de Minetti : coût C(i) en J/(kg·m), i = pente (fraction).
_A5, _A4, _A3, _A2, _A1, _A0 = 155.4, -30.4, -43.3, 46.3, 19.5, 3.6
_GRADE_MIN, _GRADE_MAX = -0.45, 0.45  # domaine de validité du fit


def minetti_cost(gradient: float) -> float:
    """Coût énergétique de la course par mètre à une pente donnée (fraction)."""
    i = max(_GRADE_MIN, min(_GRADE_MAX, gradient))
    return _A5 * i**5 + _A4 * i**4 + _A3 * i**3 + _A2 * i**2 + _A1 * i + _A0


_FLAT_COST = minetti_cost(0.0)  # ≈ 3.6


def grade_adjust_factor(gradient: float) -> float:
    """Multiplicateur allure→allure-plat-équivalente.

    C(i)/C(0) : monter coûte plus cher, donc la GAP est *plus rapide* que
    l'allure brute (facteur > 1 en montée, < 1 en descente douce).
    """
    return minetti_cost(gradient) / _FLAT_COST


def gap_pace_s_per_km(actual_pace_s_per_km: float, gradient: float) -> int | None:
    """Allure ajustée à la pente (s/km) depuis une allure réelle + une pente."""
    if not actual_pace_s_per_km or actual_pace_s_per_km <= 0:
        return None
    # allure_plat = allure_reelle / facteur (facteur>1 en montée → allure plus vive)
    return round(actual_pace_s_per_km / grade_adjust_factor(gradient))


def gap_from_summary(avg_pace_s_per_km: float | None,
                     distance_m: float | None,
                     elevation_gain_m: float | None,
                     elevation_loss_m: float | None = None) -> int | None:
    """GAP estimée depuis le résumé d'activité.

    Pente moyenne = D+ net / distance. Sur une boucle, D+ ≈ D- → pente ≈ 0 et
    la GAP ≈ l'allure brute : c'est attendu. L'intérêt réel est le flux par
    échantillon (voir `grade_adjust_factor`). None si données insuffisantes.
    """
    if not avg_pace_s_per_km or not distance_m or distance_m <= 0:
        return None
    net_gain = (elevation_gain_m or 0.0) - (elevation_loss_m or 0.0)
    gradient = net_gain / distance_m
    return gap_pace_s_per_km(avg_pace_s_per_km, gradient)
