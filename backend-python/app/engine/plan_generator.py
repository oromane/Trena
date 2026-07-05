"""Génération du plan d'entraînement périodisé.

Périodisation classique :
- montée en charge progressive (+ramp_rate par semaine)
- semaine de récupération toutes les `recovery_every` semaines (-30 %)
- affûtage (taper) sur les 2 dernières semaines avant l'objectif (60 % puis 40 %)

La répartition intra-semaine respecte le masque de disponibilité
(minutes par jour, lundi=index 0) : les séances clés vont sur les jours
les plus disponibles, la durée est plafonnée par la disponibilité.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

# TRIMP par minute approximatif par type de séance
TRIMP_PER_MIN = {
    "INTERVAL": 2.5,
    "TEMPO": 2.0,
    "ENDURANCE": 1.2,
    "RECOVERY": 0.8,
}

MIN_SESSION_MINUTES = 30


@dataclass(frozen=True)
class PlannedDay:
    scheduled_date: date
    session_type: str
    duration_minutes: int
    target_trimp: int


def weekly_trimp_targets(
    n_weeks: int,
    start_trimp: float,
    ramp_rate: float = 0.05,
    recovery_every: int = 4,
    recovery_factor: float = 0.7,
) -> list[float]:
    """Cible TRIMP hebdomadaire avec progression, récupération et taper."""
    if n_weeks < 1:
        return []
    targets: list[float] = []
    load = start_trimp
    for w in range(n_weeks):
        is_recovery = (w + 1) % recovery_every == 0
        targets.append(load * recovery_factor if is_recovery else load)
        if not is_recovery:
            load *= 1 + ramp_rate

    # Affûtage : 2 dernières semaines avant l'objectif
    peak = max(targets)
    if n_weeks >= 2:
        targets[-2] = peak * 0.6
        targets[-1] = peak * 0.4
    elif n_weeks == 1:
        targets[-1] = peak * 0.5
    return targets


def _distribute_week(
    week_start: date,
    weekly_trimp: float,
    availability_mask: list[int],
    last_day: date,
) -> list[PlannedDay]:
    """Répartit la charge hebdomadaire sur les jours disponibles."""
    days = [
        (i, availability_mask[i])
        for i in range(7)
        if availability_mask[i] >= MIN_SESSION_MINUTES
        and week_start + timedelta(days=i) <= last_day
    ]
    if not days:
        return []

    # Jours triés par disponibilité décroissante : les clés d'abord
    by_capacity = sorted(days, key=lambda d: d[1], reverse=True)
    n = len(by_capacity)

    # Répartition des types : 1 INTERVAL, 1 TEMPO si >=3 jours, le reste ENDURANCE,
    # dernier jour (le moins disponible) en RECOVERY si >=4 jours.
    assignments: list[tuple[int, str, float]] = []  # (weekday, type, part de TRIMP)
    if n == 1:
        assignments = [(by_capacity[0][0], "ENDURANCE", 1.0)]
    elif n == 2:
        assignments = [
            (by_capacity[0][0], "INTERVAL", 0.45),
            (by_capacity[1][0], "ENDURANCE", 0.55),
        ]
    else:
        parts: list[tuple[str, float]] = [("INTERVAL", 0.25), ("TEMPO", 0.25)]
        n_endurance = n - 2 - (1 if n >= 4 else 0)
        endurance_share = (0.5 - (0.05 if n >= 4 else 0.0)) / max(n_endurance, 1)
        parts += [("ENDURANCE", endurance_share)] * n_endurance
        if n >= 4:
            parts.append(("RECOVERY", 0.05))
        assignments = [
            (by_capacity[i][0], t, share) for i, (t, share) in enumerate(parts)
        ]

    capacity = dict(days)
    plan: list[PlannedDay] = []
    for weekday, stype, share in assignments:
        target = weekly_trimp * share
        minutes = min(
            round(target / TRIMP_PER_MIN[stype]),
            capacity[weekday],
        )
        if minutes < MIN_SESSION_MINUTES:
            minutes = min(MIN_SESSION_MINUTES, capacity[weekday])
        trimp = round(minutes * TRIMP_PER_MIN[stype])
        plan.append(
            PlannedDay(
                scheduled_date=week_start + timedelta(days=weekday),
                session_type=stype,
                duration_minutes=int(minutes),
                target_trimp=int(trimp),
            )
        )
    return sorted(plan, key=lambda p: p.scheduled_date)


def generate_plan(
    start_date: date,
    target_date: date,
    availability_mask: list[int],
    weekly_trimp_start: float = 300.0,
    ramp_rate: float = 0.05,
) -> list[PlannedDay]:
    """Génère le plan complet entre start_date et la veille de l'objectif."""
    if target_date <= start_date:
        raise ValueError("target_date doit être postérieure à start_date")
    if len(availability_mask) != 7:
        raise ValueError("availability_mask doit contenir 7 valeurs (lundi→dimanche)")

    # Aligner sur le lundi de la semaine de départ
    first_monday = start_date - timedelta(days=start_date.weekday())
    last_day = target_date - timedelta(days=1)  # pas de séance le jour J
    n_weeks = ((last_day - first_monday).days // 7) + 1

    targets = weekly_trimp_targets(n_weeks, weekly_trimp_start, ramp_rate)
    plan: list[PlannedDay] = []
    for w, weekly in enumerate(targets):
        week_start = first_monday + timedelta(weeks=w)
        week_plan = _distribute_week(week_start, weekly, availability_mask, last_day)
        # Exclure les jours antérieurs à start_date (semaine partielle initiale)
        plan.extend(p for p in week_plan if p.scheduled_date >= start_date)
    return plan
