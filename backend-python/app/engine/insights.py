"""Probabilité de réussite (heuristique v1) et insights déterministes.

La probabilité v1 est une combinaison transparente de trois composantes,
pas un modèle appris — elle sera remplacée par une calibration individuelle
quand l'historique le permettra :
  - adhérence au plan (28 derniers jours)
  - fraîcheur actuelle (form = fitness - fatigue, modèle de Banister)
  - disponibilité du jour (readiness HRV/sommeil)
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field


@dataclass
class ProbabilityResult:
    value: float                       # 0..1
    adherence: float                   # 0..1
    form_score: float                  # -1..1 (tanh normalisé)
    readiness_factor: int              # -1 / 0 / +1
    explanation: list[str] = field(default_factory=list)


def success_probability(
    n_due: int,
    n_completed: int,
    form_now: float,
    readiness: str,
) -> ProbabilityResult:
    """Heuristique v1 bornée [0.05, 0.95].

    p = 0.5 + 0.25*adh_norm + 0.15*form_score + 0.10*readiness_factor
    """
    adherence = (n_completed / n_due) if n_due > 0 else 0.7
    adherence = min(adherence, 1.0)
    adh_norm = max(-1.0, min(1.0, (adherence - 0.7) / 0.3))

    form_score = math.tanh(form_now / 20.0)

    readiness_factor = {"NORMAL": 1, "CAUTION": 0, "REDUCE": -1}.get(readiness, 0)

    p = 0.5 + 0.25 * adh_norm + 0.15 * form_score + 0.10 * readiness_factor
    p = max(0.05, min(0.95, p))

    explanation: list[str] = []
    if n_due > 0:
        explanation.append(
            f"Adhérence au plan : {n_completed}/{n_due} séances réalisées "
            f"sur 28 jours ({adherence:.0%})."
        )
    else:
        explanation.append("Pas encore de séances dues — adhérence neutre.")
    if form_score >= 0.2:
        explanation.append("Fraîcheur positive : la charge est bien absorbée.")
    elif form_score <= -0.2:
        explanation.append("Fatigue supérieure à l'aptitude : fraîcheur négative.")
    else:
        explanation.append("Équilibre charge/récupération neutre.")
    if readiness_factor > 0:
        explanation.append("Disponibilité du jour : optimale.")
    elif readiness_factor < 0:
        explanation.append("Disponibilité du jour dégradée (HRV + sommeil).")

    return ProbabilityResult(
        value=round(p, 3),
        adherence=round(adherence, 3),
        form_score=round(form_score, 3),
        readiness_factor=readiness_factor,
        explanation=explanation,
    )


# ---------------------------------------------------------------- insights
@dataclass
class Insight:
    kind: str        # 'hrv' | 'sleep' | 'load' | 'readiness' | 'adherence'
    severity: str    # 'positive' | 'info' | 'warning'
    text: str


def _mean(xs: list[float]) -> float | None:
    return sum(xs) / len(xs) if xs else None


def generate_insights(
    hrv_series: list[float],
    sleep_series: list[float],
    week_planned_trimp: float,
    last_week_actual_trimp: float,
    readiness: str,
    hrv_zscore: float | None,
    adherence: float,
) -> list[Insight]:
    """Règles déterministes : 7 derniers jours vs 21 précédents.

    Les séries sont ordonnées chronologiquement (le plus récent en dernier).
    """
    out: list[Insight] = []

    def trend(series: list[float]) -> float | None:
        if len(series) < 14:
            return None
        recent, previous = _mean(series[-7:]), _mean(series[:-7])
        if not previous:
            return None
        return (recent - previous) / previous

    hrv_t = trend(hrv_series)
    if hrv_t is not None:
        if hrv_t <= -0.05:
            out.append(Insight("hrv", "warning",
                f"Ta récupération ralentit : HRV moyen en baisse de "
                f"{abs(hrv_t):.0%} sur 7 jours vs les 3 semaines précédentes."))
        elif hrv_t >= 0.05:
            out.append(Insight("hrv", "positive",
                f"Récupération en amélioration : HRV moyen +{hrv_t:.0%} "
                f"sur 7 jours."))

    sleep_t = trend(sleep_series)
    if sleep_t is not None and sleep_t <= -0.08:
        gain = min(6, 3 + round(abs(hrv_zscore or 0)))
        out.append(Insight("sleep", "warning",
            f"Ton sommeil est en baisse ({sleep_t:.0%} sur 7 jours). "
            f"Décaler la prochaine séance intense améliorerait tes chances "
            f"d'environ {gain}%."))

    if last_week_actual_trimp > 0:
        ramp = (week_planned_trimp - last_week_actual_trimp) / last_week_actual_trimp
        if ramp > 0.15:
            out.append(Insight("load", "warning",
                f"Charge prévue cette semaine +{ramp:.0%} vs réalisé la semaine "
                f"dernière — au-dessus de la progression sûre (~10%)."))

    if readiness == "REDUCE":
        out.append(Insight("readiness", "warning",
            "HRV effondré + déficit de sommeil : la séance du jour a été "
            "remplacée par de la basse intensité pour protéger l'objectif."))
    elif readiness == "CAUTION":
        out.append(Insight("readiness", "info",
            "HRV sous ta norme : intensité plafonnée aujourd'hui, "
            "le volume est conservé."))
    elif readiness == "NORMAL":
        out.append(Insight("readiness", "positive",
            "Signaux physiologiques dans ta norme : prêt·e à encaisser la "
            "séance prévue."))

    if adherence < 0.6:
        out.append(Insight("adherence", "warning",
            f"Adhérence au plan {adherence:.0%} sur 28 jours : c'est le levier "
            f"n°1 pour faire remonter ta probabilité de réussite."))

    return out
