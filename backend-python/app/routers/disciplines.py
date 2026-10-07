"""Modules Vélo, Natation et Triathlon.

Contrairement à `strength.py`, ce routeur passe par `SupabaseRepo` comme le
reste du backend : les accès base restent centralisés, mockables et testables.
C'est le modèle à suivre pour les prochains modules.

Les contraintes ci-dessous ne sont pas des conventions mais le reflet exact du
schéma, relevé par sondage sur la base le 3 août 2026 :
  - `discipline` est un ENUM Postgres : RUN, STRENGTH, BIKE, SWIM, TRIATHLON.
  - Une contrainte CHECK restreint `session_type` selon la discipline.
Toute valeur hors de ces listes est rejetée par la base (code 23514) — on la
refuse donc en amont, avec un message exploitable plutôt qu'une erreur 500.
"""
from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key

router = APIRouter(prefix="/disciplines", tags=["disciplines"],
                   dependencies=[Depends(require_internal_key)])

# Types de séance réellement acceptés par la contrainte CHECK, par discipline.
ALLOWED_SESSION_TYPES: dict[str, list[str]] = {
    "BIKE": ["ENDURANCE", "TEMPO", "INTERVAL", "RECOVERY"],
    "SWIM": ["ENDURANCE", "TEMPO", "INTERVAL", "RECOVERY"],
    "TRIATHLON": ["BRICK"],
}

SESSION_TYPE_LABELS: dict[str, str] = {
    "ENDURANCE": "Endurance fondamentale",
    "TEMPO": "Tempo / seuil",
    "INTERVAL": "Fractionné",
    "RECOVERY": "Récupération",
    "BRICK": "Enchaînement vélo-course",
}

DISCIPLINE_META: dict[str, dict] = {
    "BIKE": {
        "label": "Vélo",
        "tracks_distance": True,
        "hint": "Le vélo n'entraîne pas de baisse significative de force : "
                "c'est l'endurance à privilégier quand tu veux protéger tes "
                "gains en salle.",
    },
    "SWIM": {
        "label": "Natation",
        "tracks_distance": True,
        "hint": "Impact articulaire quasi nul. Très dépendante de la "
                "technique : une séance peut être épuisante sans que le "
                "système cardiovasculaire ait beaucoup travaillé.",
    },
    "TRIATHLON": {
        "label": "Triathlon",
        "tracks_distance": True,
        "hint": "Les enchaînements vélo-course entraînent la transition. "
                "Un brick modéré toutes les 1 à 3 semaines suffit en pratique "
                "loisir — inutile d'en faire des séances épuisantes.",
    },
}

STATS_WINDOW_DAYS = 365
HISTORY_DEFAULT_LIMIT = 30

def _check_discipline(discipline: str) -> str:
    d = discipline.upper()
    if d not in ALLOWED_SESSION_TYPES:
        raise HTTPException(
            status_code=404,
            detail=f"Discipline inconnue : {discipline}. "
                   f"Valeurs gérées : {', '.join(ALLOWED_SESSION_TYPES)}.",
        )
    return d

class SessionIn(BaseModel):
    user_id: str
    scheduled_date: date_type
    session_type: str
    duration_minutes: int = Field(gt=0, le=1440)
    distance_m: int | None = Field(default=None, ge=0, le=1_000_000)
    avg_hr: int | None = Field(default=None, ge=30, le=250)
    session_rpe: int | None = Field(default=None, ge=1, le=10)
    title: str | None = Field(default=None, max_length=150)
    completed: bool = True

def _trimp_from_rpe(duration_minutes: int, rpe: int | None) -> int:
    """Charge de séance selon Foster : durée × effort perçu.

    Approximation assumée : elle ne remplace pas un TRIMP calculé sur les
    zones cardiaques, mais reste comparable d'une séance à l'autre, ce qui
    suffit à suivre une tendance de charge.
    """
    return int(duration_minutes * (rpe if rpe else 5))

@router.get("/{discipline}/sessions")
def list_sessions(discipline: str,
                  user_id: str = Query(...),
                  limit: int = Query(HISTORY_DEFAULT_LIMIT, ge=1, le=200),
                  repo: SupabaseRepo = Depends(get_repo)) -> dict:
    d = _check_discipline(discipline)
    rows = repo.list_sessions_by_discipline(user_id, d, limit=limit)
    return {
        "discipline": d,
        "sessions": [
            {
                "id": s["id"],
                "date": s["scheduled_date"],
                "session_type": s.get("session_type"),
                "session_type_label": SESSION_TYPE_LABELS.get(
                    s.get("session_type", ""), s.get("session_type")
                ),
                "title": s.get("title"),
                "status": s.get("status"),
                "duration_minutes": s.get("duration_actual_minutes")
                or s.get("duration_planned_minutes"),
                "distance_m": s.get("distance_m"),
                "avg_hr": s.get("avg_hr"),
                "rpe": s.get("session_rpe"),
                "trimp": s.get("trimp_actual") or s.get("intensity_target_trimp"),
            }
            for s in rows
        ],
    }

@router.get("/{discipline}/stats")
def stats(discipline: str,
          user_id: str = Query(...),
          today: date_type | None = None,
          repo: SupabaseRepo = Depends(get_repo)) -> dict:
    d = _check_discipline(discipline)
    ref = today or date_type.today()
    since = ref - timedelta(days=STATS_WINDOW_DAYS)
    rows = repo.list_sessions_by_discipline(user_id, d, since=since, limit=200)

    done = [s for s in rows if s.get("status") == "COMPLETED"]
    month_start = ref.replace(day=1)
    week_start = ref - timedelta(days=ref.weekday())

    def agg(subset: list[dict]) -> dict:
        return {
            "sessions": len(subset),
            "minutes": sum(s.get("duration_actual_minutes") or 0 for s in subset),
            "distance_m": sum(s.get("distance_m") or 0 for s in subset),
            "trimp": sum(s.get("trimp_actual") or 0 for s in subset),
        }

    def in_range(s: dict, start: date_type) -> bool:
        return date_type.fromisoformat(s["scheduled_date"]) >= start

    longest = max((s.get("distance_m") or 0 for s in done), default=0)
    return {
        "discipline": d,
        "week": agg([s for s in done if in_range(s, week_start)]),
        "month": agg([s for s in done if in_range(s, month_start)]),
        "all_time": agg(done),
        "longest_distance_m": longest or None,
        "last_session_date": done[0]["scheduled_date"] if done else None,
    }
