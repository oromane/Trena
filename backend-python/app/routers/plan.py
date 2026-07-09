"""Génération et persistance du plan d'entraînement."""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..db.repo import SupabaseRepo, get_repo
from ..engine import calibration
from ..engine.plan_generator import generate_season_plan
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


class CalibrateRequest(BaseModel):
    user_id: str
    history_days: int = 180
    persist: bool = True
    min_r2: float = calibration.DEFAULT_MIN_R2


class CalibrateResponse(BaseModel):
    calibrated: bool
    persisted: bool = False
    tau1: float | None = None
    tau2: float | None = None
    k1: float | None = None
    k2: float | None = None
    p0: float | None = None
    r2: float | None = None
    rmse: float | None = None
    n_days: int | None = None
    n_points: int | None = None
    detail: str | None = None


@router.post("/calibrate", response_model=CalibrateResponse)
def calibrate_user(req: CalibrateRequest,
                   repo: SupabaseRepo = Depends(get_repo)) -> CalibrateResponse:
    """Calibre tau1/tau2/k1/k2/p0 par régression sur l'historique réel.

    Proxy de performance : VO2max Garmin. Nécessite >= 8 semaines de
    charges réalisées et >= 10 mesures de VO2max, sinon les défauts
    du moteur restent en vigueur.
    """
    if repo.get_profile(req.user_id) is None:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    loads = repo.get_completed_loads(req.user_id, days=req.history_days)
    wellness = repo.get_wellness_history(req.user_id, days=req.history_days)
    result = calibration.calibrate_from_history(loads, wellness,
                                                min_r2=req.min_r2)
    if result is None:
        return CalibrateResponse(
            calibrated=False,
            detail=(
                "Historique insuffisant ou ajustement trop faible : "
                f">= {calibration.MIN_HISTORY_DAYS} jours de charges, "
                f">= {calibration.MIN_PERF_POINTS} mesures VO2max et "
                f"R² >= {req.min_r2} requis. Paramètres par défaut conservés."
            ),
        )

    persisted = False
    if req.persist:
        repo.update_profile(req.user_id, {
            "banister_tau1": result.params.tau1,
            "banister_tau2": result.params.tau2,
            "banister_k1": result.params.k1,
            "banister_k2": result.params.k2,
            "banister_p0": result.params.p0,
            "banister_r2": result.r2,
            "banister_calibrated_at": datetime.now(timezone.utc).isoformat(),
        })
        persisted = True

    return CalibrateResponse(
        calibrated=True, persisted=persisted,
        tau1=result.params.tau1, tau2=result.params.tau2,
        k1=result.params.k1, k2=result.params.k2, p0=result.params.p0,
        r2=result.r2, rmse=result.rmse,
        n_days=result.n_days, n_points=result.n_points,
    )


@router.post("/generate", response_model=PlanResponse)
def generate(req: PlanRequest, repo: SupabaseRepo = Depends(get_repo)) -> PlanResponse:
    profile = repo.get_profile(req.user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    objectives = repo.get_active_objectives(req.user_id)
    if not objectives:
        raise HTTPException(status_code=404, detail="Aucune course à venir")

    start = req.start_date or date.today()

    try:
        # Plan de saison enchaîné : un bloc périodisé par course (affûtage
        # avant, récupération après), du plus proche au plus lointain.
        season = generate_season_plan(
            start_date=start,
            objectives=objectives,
            availability_mask=profile["weekly_availability_mask"],
            weekly_trimp_start=req.weekly_trimp_start,
            ramp_rate=req.ramp_rate,
            sessions_per_week=profile.get("sessions_per_week"),
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not season:
        raise HTTPException(status_code=422, detail="Aucune course exploitable (dates déjà passées)")

    if req.persist:
        # Remplace les séances planifiées non réalisées à partir de start
        repo.delete_planned_sessions(req.user_id, start)
        repo.insert_sessions([
            {
                "user_id": req.user_id,
                "objective_id": s.objective_id,
                "scheduled_date": s.scheduled_date.isoformat(),
                "session_type": s.session_type,
                "duration_planned_minutes": s.duration_minutes,
                "intensity_target_trimp": s.target_trimp,
                "status": "PLANNED",
            }
            for s in season
        ])

    # target_date de la réponse : la course la plus lointaine du plan.
    last_target = date.fromisoformat(objectives[-1]["target_date"])
    return PlanResponse(
        objective_id=None,  # plan multi-objectifs (saison)
        target_date=last_target,
        n_sessions=len(season),
        total_trimp=sum(s.target_trimp for s in season),
        persisted=req.persist and bool(season),
        sessions=[
            PlannedSessionOut(
                scheduled_date=s.scheduled_date,
                session_type=s.session_type,
                duration_minutes=s.duration_minutes,
                target_trimp=s.target_trimp,
            )
            for s in season
        ],
    )
