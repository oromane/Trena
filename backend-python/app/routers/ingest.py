"""Ingestion des métriques physiologiques (HealthKit / Health Connect / saisie manuelle)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key

router = APIRouter(prefix="/ingest", tags=["ingest"],
                   dependencies=[Depends(require_internal_key)])


class MetricIn(BaseModel):
    recorded_date: date
    hrv_ms: float | None = None
    sleep_minutes: int | None = None
    resting_heart_rate: int | None = None
    stress_score: int | None = None


class IngestRequest(BaseModel):
    user_id: str
    metrics: list[MetricIn] = Field(..., min_length=1, max_length=90)


@router.post("/daily-metrics")
def ingest_daily_metrics(req: IngestRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    # Seuls les champs fournis sont écrits : un champ absent ne doit pas
    # effacer une valeur synchronisée par Garmin (upsert merge-duplicates).
    rows = [m.model_dump(mode="json", exclude_unset=True) for m in req.metrics]
    try:
        saved = repo.upsert_daily_metrics(req.user_id, rows)
    except Exception as e:  # httpx.HTTPStatusError et erreurs réseau
        raise HTTPException(status_code=502, detail=f"Erreur Supabase : {e}")
    return {"upserted": len(saved)}
