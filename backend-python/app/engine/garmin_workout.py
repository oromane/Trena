"""Builder de séance structurée Garmin (workout-service).

Comble le trou de `garminconnect` : ses helpers ne font que du pas au temps
sans cible. Ici on encode aussi les **zones FC** (le modèle de Trena, robuste
sans historique d'allure) et, en option, la **distance** et les **zones
d'allure** (m/s).

Contrat d'encodage (vérifié sur l'API) :
    endCondition    : time (s) | distance (m) | lap.button | iterations
    heart.rate.zone : `zoneNumber` (1-5) → cible la zone FC configurée sur la montre
    pace.zone       : targetValueOne/Two en m/s

Le builder est pur (aucune I/O) : testable sans réseau. Le push vit dans
`GarminClient` (services/garmin_sync.py) — un seul writer vers Garmin.
"""
from __future__ import annotations

from dataclasses import dataclass, field

_SPORT = {"sportTypeId": 1, "sportTypeKey": "running"}

_STEP_IDS = {"warmup": 1, "cooldown": 2, "interval": 3, "recovery": 4, "rest": 5, "repeat": 6}
_END_IDS = {"lap.button": 1, "time": 2, "distance": 3, "iterations": 7}


@dataclass
class Step:
    """Un pas exécutable. Un seul critère de fin : durée OU distance."""
    kind: str = "interval"                 # warmup/cooldown/interval/recovery/rest
    duration_s: float | None = None
    distance_m: float | None = None
    hr_zone: int | None = None             # 1-5 → heart.rate.zone
    pace_mps: tuple[float, float] | None = None  # (low, high) m/s → pace.zone
    label: str | None = None

    def __post_init__(self) -> None:
        if self.kind not in _STEP_IDS or self.kind == "repeat":
            raise ValueError(f"kind invalide : {self.kind}")
        if self.duration_s is not None and self.distance_m is not None:
            raise ValueError("un pas est borné au temps OU à la distance, pas les deux")
        if self.hr_zone is not None and not (1 <= self.hr_zone <= 5):
            raise ValueError("hr_zone doit être dans 1..5")


@dataclass
class Repeat:
    """Groupe répété : `times` × `steps` (ex. 5 × (3 min Z4 + 2 min récup))."""
    times: int
    steps: list[Step]

    def __post_init__(self) -> None:
        if self.times < 1:
            raise ValueError("times >= 1 requis")
        if not self.steps:
            raise ValueError("un Repeat doit contenir au moins un pas")


class _Order:
    def __init__(self) -> None:
        self._n = 0

    def next(self) -> int:
        self._n += 1
        return self._n


def _end(step: Step) -> tuple[str, float | None]:
    if step.distance_m is not None:
        return "distance", float(step.distance_m)
    if step.duration_s is not None:
        return "time", float(step.duration_s)
    return "lap.button", None


def _target(step: Step) -> dict:
    if step.hr_zone is not None:
        return {"targetType": {"workoutTargetTypeId": 4, "workoutTargetTypeKey": "heart.rate.zone"},
                "zoneNumber": step.hr_zone}
    if step.pace_mps is not None:
        low, high = step.pace_mps
        return {"targetType": {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "pace.zone"},
                "targetValueOne": float(low), "targetValueTwo": float(high)}
    return {"targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}}


def _step_dto(step: Step, order: _Order) -> dict:
    end_key, end_val = _end(step)
    dto: dict = {
        "type": "ExecutableStepDTO",
        "stepOrder": order.next(),
        "stepType": {"stepTypeId": _STEP_IDS[step.kind], "stepTypeKey": step.kind},
        "endCondition": {"conditionTypeId": _END_IDS[end_key], "conditionTypeKey": end_key},
    }
    if end_val is not None:
        dto["endConditionValue"] = end_val
    dto.update(_target(step))
    if step.label:
        dto["description"] = step.label
    return dto


def _repeat_dto(rep: Repeat, order: _Order) -> dict:
    group = order.next()
    children = [_step_dto(s, order) for s in rep.steps]
    return {
        "type": "RepeatGroupDTO",
        "stepOrder": group,
        "stepType": {"stepTypeId": _STEP_IDS["repeat"], "stepTypeKey": "repeat"},
        "numberOfIterations": rep.times,
        "smartRepeat": False,
        "endCondition": {"conditionTypeId": _END_IDS["iterations"], "conditionTypeKey": "iterations"},
        "endConditionValue": float(rep.times),
        "workoutSteps": children,
    }


def build_workout(name: str, elements: list) -> dict:
    """Assemble le payload workout-service depuis une liste de Step/Repeat."""
    order = _Order()
    steps: list[dict] = []
    for el in elements:
        if isinstance(el, Repeat):
            steps.append(_repeat_dto(el, order))
        elif isinstance(el, Step):
            steps.append(_step_dto(el, order))
        else:
            raise TypeError(f"élément invalide : {type(el)}")
    return {
        "sportType": _SPORT,
        "workoutName": name,
        "workoutSegments": [{"segmentOrder": 1, "sportType": _SPORT, "workoutSteps": steps}],
    }


# --------------------------------------------------------------------------- #
# Mapper : type de séance Trena (zones FC) → séance structurée Garmin
# --------------------------------------------------------------------------- #

def from_session(session_type: str, duration_minutes: int, name: str | None = None) -> dict:
    """Traduit une séance planifiée (type + durée) en séance Garmin structurée,
    en zones FC — miroir de `engine.workout.describe_session`."""
    d = max(int(duration_minutes), 20)
    st = (session_type or "ENDURANCE").upper()
    name = name or f"{st.title()} {d}min"

    if st == "INTERVAL":
        warm = min(15, d // 4)
        cool = min(10, d // 5)
        core = max(5, d - warm - cool)
        reps = max(2, core // 5)
        return build_workout(name, [
            Step("warmup", duration_s=warm * 60, hr_zone=2, label="Échauffement"),
            Repeat(reps, [
                Step("interval", duration_s=3 * 60, hr_zone=4, label="Effort"),
                Step("recovery", duration_s=2 * 60, hr_zone=1, label="Récup"),
            ]),
            Step("cooldown", duration_s=cool * 60, hr_zone=1, label="Retour au calme"),
        ])
    if st == "TEMPO":
        warm = min(15, d // 4)
        cool = min(10, d // 5)
        core = max(5, d - warm - cool)
        return build_workout(name, [
            Step("warmup", duration_s=warm * 60, hr_zone=2, label="Échauffement"),
            Step("interval", duration_s=core * 60, hr_zone=3, label="Seuil (Z3-Z4)"),
            Step("cooldown", duration_s=cool * 60, hr_zone=1, label="Retour au calme"),
        ])
    if st == "RECOVERY":
        return build_workout(name, [
            Step("interval", duration_s=d * 60, hr_zone=1, label="Récupération Z1 strict"),
        ])
    # ENDURANCE par défaut
    return build_workout(name, [
        Step("interval", duration_s=d * 60, hr_zone=2, label="Endurance Z2"),
    ])
