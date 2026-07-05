"""Schémas Pydantic de l'API."""
from pydantic import BaseModel, Field


class SimulateRequest(BaseModel):
    loads: list[float] = Field(..., description="Charges TRIMP quotidiennes (0 = repos)")
    p0: float = 0.0
    k1: float = 1.0
    k2: float = 2.0
    tau1: float = 42.0
    tau2: float = 7.0


class SimulateResponse(BaseModel):
    fitness: list[float]
    fatigue: list[float]
    performance: list[float]
    form: list[float]


class TrimpRequest(BaseModel):
    duration_minutes: float
    hr_avg: float
    hr_rest: float
    hr_max: float
    sex: str = "M"


class TrimpResponse(BaseModel):
    trimp: float


class SessionIn(BaseModel):
    session_type: str
    duration_minutes: int
    target_trimp: int


class DailyAdjustRequest(BaseModel):
    hrv_history: list[float] = Field(..., description="HRV des ~28 derniers jours (ms)")
    hrv_today: float
    sleep_history: list[float] = Field(..., description="Sommeil des derniers jours (min)")
    sleep_today: float
    planned_session: SessionIn
    tau2_base: float = 7.0


class DailyAdjustResponse(BaseModel):
    readiness: str
    hrv_zscore: float
    tau2_adjusted: float
    modified: bool
    session: SessionIn
