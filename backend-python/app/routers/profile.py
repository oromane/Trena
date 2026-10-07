"""Profil et données personnelles, servis par le moteur (ticket P0-2).

Le frontend ne lit ni n'écrit plus aucune table métier : il s'authentifie
auprès de Supabase puis appelle ces routes avec l'identifiant de session.
Un seul chemin d'accès = une seule source de vérité (cf. bug « le frontend
voit 2 objectifs, le moteur 0 »).

- GET  /profile            : champs affichables du profil.
- POST /profile/ensure     : crée le profil au premier accès (idempotent).
- POST /profile/update     : met à jour une liste blanche de champs validés.
- GET  /profile/metrics    : dernières métriques quotidiennes (page Profil).
- GET  /profile/trends     : séries 90 j (métriques + bien-être Garmin).
- GET  /profile/export     : export complet (RGPD).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key

router = APIRouter(prefix="/profile", tags=["profile"],
                   dependencies=[Depends(require_internal_key)])

PUBLIC_FIELDS = ("full_name", "sessions_per_week", "hr_max", "hr_rest", "sex",
                 "share_activities", "share_physio")
TREND_METRICS = ("recorded_date", "hrv_ms", "resting_heart_rate", "sleep_minutes")


@router.get("")
def get_profile(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    p = repo.get_profile(user_id) or {}
    return {k: p.get(k) for k in PUBLIC_FIELDS}


class UserOnly(BaseModel):
    user_id: str


@router.post("/ensure")
def ensure(req: UserOnly, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    if repo.get_profile(req.user_id) is None:
        repo.create_profile(req.user_id)
        return {"created": True}
    return {"created": False}


class ProfileUpdate(BaseModel):
    """Liste blanche : aucun autre champ n'est modifiable par cette route.

    Un champ absent n'est pas touché ; un champ envoyé à null est effacé.
    """
    user_id: str
    full_name: str | None = Field(default=None, max_length=120)
    sessions_per_week: int | None = Field(default=None, ge=1, le=7)
    hr_max: int | None = Field(default=None, ge=100, le=230)
    hr_rest: int | None = Field(default=None, ge=25, le=120)
    sex: Literal["M", "F"] | None = None


@router.post("/update")
def update(req: ProfileUpdate, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    fields = req.model_dump(exclude_unset=True, exclude={"user_id"})
    if "full_name" in fields:
        fields["full_name"] = (fields["full_name"] or "").strip() or None
    if (fields.get("hr_max") is not None and fields.get("hr_rest") is not None
            and fields["hr_rest"] >= fields["hr_max"]):
        raise HTTPException(status_code=422, detail="La FC de repos doit être inférieure à la FC max.")
    if not fields:
        return {"updated": []}
    repo.update_profile(req.user_id, fields)
    return {"updated": sorted(fields)}


@router.get("/metrics")
def recent_metrics(user_id: str, limit: int = 14,
                   repo: SupabaseRepo = Depends(get_repo)) -> list[dict]:
    limit = max(1, min(limit, 90))
    rows = repo.get_metrics_history(user_id, days=limit * 2)
    return sorted(rows, key=lambda r: r["recorded_date"], reverse=True)[:limit]


@router.get("/trends")
def trends(user_id: str, days: int = 90, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    days = max(7, min(days, 365))
    metrics = repo.get_metrics_history(user_id, days=days)
    return {
        "metrics": [{k: r.get(k) for k in TREND_METRICS} for r in metrics],
        "wellness": repo.get_wellness_history(user_id, days=days),
    }


@router.get("/export")
def export(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Export complet. Les jetons OAuth/Garmin (chiffrés) ne sont jamais inclus."""
    profile = repo.get_profile(user_id)
    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "app": "Trena",
        "profile": profile,
        "objectives": repo.export_table("objectives", user_id, "target_date.asc"),
        "daily_metrics": repo.export_table("daily_metrics", user_id, "recorded_date.asc"),
        "garmin_wellness": repo.export_table("garmin_wellness", user_id, "recorded_date.asc"),
        "training_sessions": repo.export_table("training_sessions", user_id,
                                               "scheduled_date.asc"),
    }
