"""Moteur de décision - API FastAPI (usage interne réseau Docker uniquement)."""
from fastapi import FastAPI, HTTPException

from .engine import banister, hrv, planner, trimp
from .routers import calendar as calendar_router
from .routers import daily as daily_router
from .routers import dashboard as dashboard_router
from .routers import garmin as garmin_router
from .routers import ingest as ingest_router
from .routers import plan as plan_router
from .routers import sessions as sessions_router
from .models import (
    DailyAdjustRequest,
    DailyAdjustResponse,
    SessionIn,
    SimulateRequest,
    SimulateResponse,
    TrimpRequest,
    TrimpResponse,
)

app = FastAPI(
    title="Adaptive Training System - Performance Engine",
    version="0.2.0",
)

app.include_router(ingest_router.router)
app.include_router(plan_router.router)
app.include_router(daily_router.router)
app.include_router(calendar_router.router)
app.include_router(dashboard_router.router)
app.include_router(garmin_router.router)
app.include_router(sessions_router.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest) -> SimulateResponse:
    """Trajectoire fitness/fatigue/performance (modèle de Banister)."""
    try:
        params = banister.BanisterParams(
            p0=req.p0, k1=req.k1, k2=req.k2, tau1=req.tau1, tau2=req.tau2
        )
        state = banister.simulate(req.loads, params)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return SimulateResponse(
        fitness=state.fitness.tolist(),
        fatigue=state.fatigue.tolist(),
        performance=state.performance.tolist(),
        form=state.form.tolist(),
    )


@app.post("/trimp", response_model=TrimpResponse)
def compute_trimp(req: TrimpRequest) -> TrimpResponse:
    try:
        value = trimp.trimp(
            req.duration_minutes, req.hr_avg, req.hr_rest, req.hr_max, req.sex
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return TrimpResponse(trimp=value)


@app.post("/daily-adjust", response_model=DailyAdjustResponse)
def daily_adjust(req: DailyAdjustRequest) -> DailyAdjustResponse:
    """Ajustement matinal de la séance selon HRV + sommeil (spec §5.2)."""
    try:
        readiness, z = hrv.assess_readiness(
            req.hrv_history, req.hrv_today, req.sleep_history, req.sleep_today
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    planned = planner.PlannedSession(
        session_type=req.planned_session.session_type,
        duration_minutes=req.planned_session.duration_minutes,
        target_trimp=req.planned_session.target_trimp,
    )
    result = planner.adjust_session(planned, readiness, z, req.tau2_base)
    return DailyAdjustResponse(
        readiness=result.readiness.value,
        hrv_zscore=result.hrv_zscore,
        tau2_adjusted=result.tau2_adjusted,
        modified=result.modified,
        session=SessionIn(
            session_type=result.session.session_type,
            duration_minutes=result.session.duration_minutes,
            target_trimp=result.session.target_trimp,
        ),
    )
