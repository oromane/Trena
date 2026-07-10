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


# Nombre de séances/semaine par défaut si l'athlète ne l'a pas fixé : laisse
# au moins 2 jours de repos sur une semaine complète.
DEFAULT_SESSIONS_PER_WEEK = 5


def _pick_spread_days(days: list[tuple[int, int]], n: int) -> list[tuple[int, int]]:
    """Choisit n jours RÉGULIÈREMENT répartis sur la semaine (repos intercalé).

    Vise des positions idéales également espacées (ex. Lun/Mer/Ven/Dim pour 4)
    puis les rabat sur le jour disponible le plus proche. Évite d'enchaîner
    les séances. Retour trié par jour croissant.
    """
    avail = sorted(d[0] for d in days)
    cap = dict(days)
    if n >= len(avail):
        return sorted(days, key=lambda d: d[0])

    span = avail[-1] - avail[0]
    if n > 1:
        ideal = [avail[0] + round(k * span / (n - 1)) for k in range(n)]
    else:
        ideal = [avail[len(avail) // 2]]

    chosen: list[int] = []
    used: set[int] = set()
    for p in ideal:
        for d in sorted(avail, key=lambda x: (abs(x - p), x)):
            if d not in used:
                used.add(d)
                chosen.append(d)
                break
    # Collisions éventuelles : compléter avec les jours restants.
    for d in avail:
        if len(chosen) >= n:
            break
        if d not in used:
            used.add(d)
            chosen.append(d)
    return [(d, cap[d]) for d in sorted(chosen)]


def _week_type_slots(n: int) -> list[tuple[str, float]]:
    """Types de séance par créneau (jour croissant), séances dures séparées.

    Le fractionné (INTERVAL) et le tempo (TEMPO) sont placés à des créneaux
    éloignés, avec de l'endurance/récupération entre eux.
    """
    if n <= 1:
        return [("ENDURANCE", 1.0)]
    if n == 2:
        return [("INTERVAL", 0.45), ("ENDURANCE", 0.55)]
    has_rec = n >= 4
    n_end = n - 2 - (1 if has_rec else 0)
    end_share = (0.5 - (0.05 if has_rec else 0.0)) / max(n_end, 1)
    slots: list[tuple[str, float] | None] = [None] * n
    slots[0] = ("INTERVAL", 0.25)
    slots[n // 2] = ("TEMPO", 0.25)
    if has_rec:
        slots[n - 1] = ("RECOVERY", 0.05)
    for i in range(n):
        if slots[i] is None:
            slots[i] = ("ENDURANCE", end_share)
    return slots  # type: ignore[return-value]


def _distribute_week(
    week_start: date,
    weekly_trimp: float,
    availability_mask: list[int],
    last_day: date,
    sessions_per_week: int | None = None,
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

    # Nombre de séances visé : choix de l'athlète, sinon défaut (laisse du repos).
    target_count = (sessions_per_week if sessions_per_week is not None
                    else DEFAULT_SESSIONS_PER_WEEK)
    target_count = max(1, min(target_count, len(days)))

    # Sélection des jours ESPACÉS (repos intercalé), triés par jour croissant.
    days = _pick_spread_days(days, target_count)
    n = len(days)

    # Types par créneau, séances dures séparées.
    assignments: list[tuple[int, str, float]] = [
        (days[i][0], stype, share)
        for i, (stype, share) in enumerate(_week_type_slots(n))
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
    sessions_per_week: int | None = None,
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
        week_plan = _distribute_week(week_start, weekly, availability_mask,
                                     last_day, sessions_per_week)
        # Exclure les jours antérieurs à start_date (semaine partielle initiale)
        plan.extend(p for p in week_plan if p.scheduled_date >= start_date)
    return plan


@dataclass(frozen=True)
class SeasonDay:
    """Séance planifiée rattachée à une course (objectif) de la saison."""
    scheduled_date: date
    session_type: str
    duration_minutes: int
    target_trimp: int
    objective_id: str


def _to_date(value) -> date:
    return value if isinstance(value, date) else date.fromisoformat(str(value)[:10])


def generate_season_plan(
    start_date: date,
    objectives: list[dict],
    availability_mask: list[int],
    weekly_trimp_start: float = 300.0,
    ramp_rate: float = 0.05,
    sessions_per_week: int | None = None,
    recovery_days_after_race: int = 4,
) -> list[SeasonDay]:
    """Plan de saison enchaîné sur plusieurs courses.

    Pour chaque course à venir (triée par date), génère un bloc périodisé
    (montée + affûtage sur les 2 dernières semaines) depuis la fin de la
    récupération de la course précédente. Après chaque course, une coupure
    de `recovery_days_after_race` jours sans séance modélise le repos, puis
    le bloc suivant démarre.

    Args:
        objectives: dicts contenant au moins `id` et `target_date`.

    Returns:
        Séances de toute la saison, chacune rattachée à sa course (objective_id).
    """
    if len(availability_mask) != 7:
        raise ValueError("availability_mask doit contenir 7 valeurs (lundi→dimanche)")

    races = sorted(
        ((o, _to_date(o["target_date"])) for o in objectives),
        key=lambda x: x[1],
    )

    season: list[SeasonDay] = []
    seg_start = start_date
    for obj, race_date in races:
        # Course déjà passée ou absorbée par le bloc précédent : ignorée.
        if race_date <= seg_start:
            continue
        block = generate_plan(
            start_date=seg_start,
            target_date=race_date,
            availability_mask=availability_mask,
            weekly_trimp_start=weekly_trimp_start,
            ramp_rate=ramp_rate,
            sessions_per_week=sessions_per_week,
        )
        season.extend(
            SeasonDay(
                scheduled_date=p.scheduled_date,
                session_type=p.session_type,
                duration_minutes=p.duration_minutes,
                target_trimp=p.target_trimp,
                objective_id=obj["id"],
            )
            for p in block
        )
        # Repos après la course avant d'enchaîner le bloc suivant.
        seg_start = race_date + timedelta(days=1 + recovery_days_after_race)

    return season
