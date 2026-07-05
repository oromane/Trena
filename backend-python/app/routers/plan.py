"""Génération et persistance du plan d'entraînement."""
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db.repo import SupabaseRepo, get_repo
from ..engine.plan_generator import generate_plan
from ..security import require_internal_key

router = APIRouter(prefix="/plan", tags=["plan"],
                   dependencies=[Depends(require_internal_key)])


class PlanRequest(BaseModel):
    user_id: str
    weekly_trimp_start: float = 300.0
    ramp_rate: float = 0.05
    persist: bool = True
    start_date: date | None = None  # défaut : aujourd'hui


class PlannedSessionOut(BaseModel):
    scheduled_date: date
    session_type: str
    duration_minutes: int
    target_trimp: int


class PlanResponse(BaseModel):
    objective_id: str | None
    target_date: date
    n_sessions: int
    total_trimp: int
    persisted: bool
    sessions: list[PlannedSessionOut]


@router.post("/generate", response_model=PlanResponse)
def generate(req: PlanRequest, repo: SupabaseRepo = Depends(get_repo)) -> PlanResponse:
    profile = repo.get_profile(req.user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    objective = repo.get_active_objective(req.user_id)
    if objective is None:
        raise HTTPException(status_code=404, detail="Aucun objectif actif")

    target = date.fromisoformat(objective["target_date"])
    start = req.start_date or date.today()
    if target <= start:
        raise HTTPException(status_code=422, detail="Objectif déjà passé")

    try:
        plan = generate_plan(
            start_date=start,
            target_date=target,
            availability_mask=profile["weekly_availability_mask"],
            weekly_trimp_start=req.weekly_trimp_start,
            ramp_rate=req.ramp_rate,
            sessions_per_week=profile.get("sessions_per_week"),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if req.persist and plan:
        # Remplace les séances planifiées non réalisées à partir de start
        repo.delete_planned_sessions(req.user_id, start)
        repo.insert_sessions([
            {
                "user_id": req.user_id,
                "objective_id": objective["id"],
                "scheduled_date": p.scheduled_date.isoformat(),
                "session_type": p.session_type,
                "duration_planned_minutes": p.duration_minutes,
                "intensity_target_trimp": p.target_trimp,
                "status": "PLANNED",
            }
            for p in plan
        ])

    return PlanResponse(
        objective_id=objective["id"],
        target_date=target,
        n_sessions=len(plan),
        total_trimp=sum(p.target_trimp for p in plan),
        persisted=req.persist and bool(plan),
        sessions=[
            PlannedSessionOut(
                scheduled_date=p.scheduled_date,
                session_type=p.session_type,
                duration_minutes=p.duration_minutes,
                target_trimp=p.target_trimp,
            )
            for p in plan
        ],
    )
