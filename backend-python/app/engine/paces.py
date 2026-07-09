"""Allures d'entraînement personnalisées à partir d'un objectif chrono.

Principe : la formule de Riegel (t2 = t1·(d2/d1)^1.06) projette la
performance visée sur l'objectif (temps cible + distance) vers des
distances de référence, dont on dérive une allure par zone d'intensité.

Robuste par construction : les allures sont strictement monotones
(Z1 la plus lente → Z5 la plus rapide) quelle que soit la distance de
l'objectif, et le modèle ne dépend d'aucune table VDOT à maintenir.

Si la distance n'est pas renseignée sur l'objectif, elle est déduite du
titre (« marathon », « semi », « 10 km »...).
"""
from __future__ import annotations

import re

RIEGEL_EXP = 1.06

# Distances de référence pour l'ancrage des zones (mètres).
_D_Z5 = 3_000      # fractionné court / VMA
_D_Z4 = 10_000     # seuil / tempo
_D_Z3 = 21_097     # allure spécifique (semi) — base des zones faciles

# Décalages (s/km) des allures faciles par rapport à l'allure Z3.
_Z2_OFFSET = 40    # endurance fondamentale
_Z1_OFFSET = 75    # récupération

# Distances nominales reconnues dans un titre d'objectif (mètres).
# L'ordre compte : « semi-marathon » contient « marathon ».
_KEYWORDS: list[tuple[tuple[str, ...], int]] = [
    (("semi", "half", "half-marathon", "semi-marathon"), 21_097),
    (("marathon",), 42_195),
    (("10 km", "10km", "10 k", "10k", "dix km"), 10_000),
    (("5 km", "5km", "5 k", "5k", "cinq km"), 5_000),
]

# Zone d'intensité dominante par type de séance.
_TYPE_ZONE = {
    "INTERVAL": 5,
    "TEMPO": 4,
    "ENDURANCE": 2,
    "RECOVERY": 1,
}

ZONE_LABEL = {
    1: "Z1 récupération",
    2: "Z2 endurance",
    3: "Z3 allure spécifique",
    4: "Z4 seuil",
    5: "Z5 VMA",
}


def parse_distance_m(title: str | None) -> int | None:
    """Déduit une distance (m) d'un titre d'objectif. None si indéterminée."""
    if not title:
        return None
    t = title.lower()

    # 1) Valeur numérique explicite : « 21,1 km », « 42195 m », « 10K ».
    m = re.search(r"(\d+(?:[.,]\d+)?)\s*(km|k|m)\b", t)
    if m:
        val = float(m.group(1).replace(",", "."))
        unit = m.group(2)
        meters = val * 1000 if unit in ("km", "k") else val
        if 1_000 <= meters <= 300_000:  # garde-fou : 1 km – 300 km
            return int(round(meters))

    # 2) Mots-clés de course.
    for names, meters in _KEYWORDS:
        if any(n in t for n in names):
            return meters
    return None


def race_distance_m(objective: dict | None) -> int | None:
    """Distance de l'objectif : champ explicite, sinon déduite du titre."""
    if not objective:
        return None
    explicit = objective.get("distance_m")
    if explicit and explicit > 0:
        return int(explicit)
    return parse_distance_m(objective.get("title"))


def _predict_pace_s_per_km(goal_time_s: float, goal_dist_m: float,
                           target_dist_m: float) -> float:
    """Allure (s/km) prédite à `target_dist_m` via Riegel depuis l'objectif."""
    predicted_time = goal_time_s * (target_dist_m / goal_dist_m) ** RIEGEL_EXP
    return predicted_time / (target_dist_m / 1000.0)


def zone_paces(goal_time_s: float, goal_dist_m: float) -> dict[int, float]:
    """Allure (s/km) par zone Z1→Z5. Monotone : Z1 lente … Z5 rapide."""
    z5 = _predict_pace_s_per_km(goal_time_s, goal_dist_m, _D_Z5)
    z4 = _predict_pace_s_per_km(goal_time_s, goal_dist_m, _D_Z4)
    z3 = _predict_pace_s_per_km(goal_time_s, goal_dist_m, _D_Z3)
    return {
        5: z5,
        4: z4,
        3: z3,
        2: z3 + _Z2_OFFSET,
        1: z3 + _Z1_OFFSET,
    }


def format_pace(s_per_km: float) -> str:
    """Formate une allure en « m:ss/km »."""
    total = int(round(s_per_km))
    minutes, seconds = divmod(total, 60)
    return f"{minutes}:{seconds:02d}/km"


def session_zone(session_type: str) -> int:
    """Zone dominante d'un type de séance (défaut Z2)."""
    return _TYPE_ZONE.get(session_type, 2)


def training_paces(objective: dict | None) -> dict | None:
    """Payload d'allures pour l'API, ou None si l'objectif ne permet pas le calcul.

    Retour :
        {
          "distance_m": 42195,
          "race": {"pace_s_per_km": 300.0, "pace": "5:00/km"},
          "zones": [{"zone": 5, "label": "...", "pace_s_per_km": .., "pace": ".."}, ...]
        }
    """
    if not objective:
        return None
    goal_time = objective.get("target_time_seconds")
    dist = race_distance_m(objective)
    if not goal_time or goal_time <= 0 or not dist:
        return None

    paces = zone_paces(float(goal_time), float(dist))
    race_pace = float(goal_time) / (dist / 1000.0)
    return {
        "distance_m": dist,
        "race": {"pace_s_per_km": round(race_pace, 1),
                 "pace": format_pace(race_pace)},
        "zones": [
            {"zone": z, "label": ZONE_LABEL[z],
             "pace_s_per_km": round(paces[z], 1), "pace": format_pace(paces[z])}
            for z in (1, 2, 3, 4, 5)
        ],
    }


def session_pace_hint(session_type: str, objective: dict | None) -> str | None:
    """Allure cible formatée pour un type de séance, ou None."""
    payload = training_paces(objective)
    if not payload:
        return None
    z = session_zone(session_type)
    pace = next((p["pace"] for p in payload["zones"] if p["zone"] == z), None)
    return f"~{pace} ({ZONE_LABEL[z]})" if pace else None
