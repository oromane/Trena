"""Module Strength — catalogue d'exercices en consultation.

Le module ne crée plus de séance : il ne reste que la lecture du catalogue,
consommée par la page `/strength/exercises` du site.

Le routeur était jusqu'ici le seul à ne pas exiger la clé interne — le
catalogue était donc joignable sans authentification dès que le moteur était
exposé. La dépendance est alignée sur les autres routeurs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import httpx
import os
from typing import Optional

from ..security import require_internal_key

router = APIRouter(prefix="/strength", tags=["strength"],
                   dependencies=[Depends(require_internal_key)])

# ============ Models ============

class ExerciseResponse(BaseModel):
    id: str
    name: str
    slug: str
    muscle_primary: str
    muscles_secondary: list[str]
    equipment: list[str]

class SetLog(BaseModel):
    reps_completed: int
    rir_actual: int
    load_kg: float
    tonnage_kg: Optional[float] = None

class PrescriptionCreate(BaseModel):
    exercise_id: str
    exercise_order: int
    sets_planned: int
    reps_min: int
    reps_max: int
    target_rir: int
    load_planned_kg: Optional[float] = None
    rest_seconds: int = 60
    notes: Optional[str] = None

class SessionCreate(BaseModel):
    user_id: str
    prescriptions: list[PrescriptionCreate]
    session_date: str  # ISO format: 2026-08-03

class ProgressionUpdate(BaseModel):
    progression_type: str  # "increase", "maintain", "decrease"
    notes: Optional[str] = None

class ReadinessResponse(BaseModel):
    user_id: str
    recovery_status: str  # "green", "yellow", "red"
    last_session_date: Optional[str]
    days_since_last_session: Optional[int]
    average_tonnage_weekly: Optional[float]

# ============ Helpers ============

def _get_supabase_headers() -> dict:
    """Get Supabase API headers."""
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not service_role_key:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }

def _get_supabase_url() -> str:
    """Get Supabase URL."""
    url = os.getenv("SUPABASE_URL")
    if not url:
        raise HTTPException(status_code=500, detail="Supabase URL not configured")
    return url

# ============ Endpoints ============

@router.get("/exercises", response_model=list[dict])
async def list_exercises(
    muscle: Optional[str] = Query(None, description="Filtre par muscle principal (chest, back, legs, etc.)"),
    id: Optional[str] = Query(None, description="Filtre par UUID d'exercice (recherche exacte)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Liste les exercices avec filtrage optionnel par muscle ou par id."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    select_clause = "id,name,slug,muscle_primary,muscles_secondary,equipment,image_url,video_url,instructions,instructions_steps"
    url = f"{supabase_url}/rest/v1/exercises?select={select_clause}&limit={limit}&offset={offset}"

    if muscle:
        url += f"&muscle_primary=eq.{muscle.lower()}"
    if id:
        url += f"&id=eq.{id}"

    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, timeout=10)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"Supabase error: {r.text}")

    return r.json()

