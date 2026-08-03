"""Module Strength — Gestion des exercices et sessions de musculation."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import httpx
import os
from typing import Optional
from uuid import uuid4
from datetime import datetime

router = APIRouter(prefix="/strength", tags=["strength"])

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
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Liste les exercices avec filtrage optionnel par muscle."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    select_clause = "id,name,slug,muscle_primary,muscles_secondary,equipment"
    url = f"{supabase_url}/rest/v1/exercises?select={select_clause}&limit={limit}&offset={offset}"

    if muscle:
        url += f"&muscle_primary=eq.{muscle.lower()}"

    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, timeout=10)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"Supabase error: {r.text}")

    return r.json()


@router.post("/sessions")
async def create_session(req: SessionCreate):
    """Créer une nouvelle séance d'entraînement avec prescriptions."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    session_id = str(uuid4())

    # 1. Créer d'abord la training_sessions
    training_session_data = {
        "id": session_id,
        "user_id": req.user_id,
        "scheduled_date": req.session_date,
        "session_type": "FULL_BODY",  # Défaut pour strength
        "discipline": "STRENGTH",
        "duration_planned_minutes": 60,  # Défaut
        "intensity_target_trimp": 0,  # Défaut pour strength
        "status": "PLANNED",
        "title": f"Strength Session {req.session_date}",
    }

    async with httpx.AsyncClient() as client:
        r_session = await client.post(
            f"{supabase_url}/rest/v1/training_sessions",
            headers=headers,
            json=training_session_data,
            timeout=10,
        )

    if r_session.status_code not in [200, 201]:
        raise HTTPException(status_code=r_session.status_code, detail=f"Failed to create training session: {r_session.text}")

    # 2. Créer les prescriptions
    prescriptions_data = [
        {
            "id": str(uuid4()),
            "session_id": session_id,
            "user_id": req.user_id,
            "exercise_id": p.exercise_id,
            "exercise_order": p.exercise_order,
            "sets_planned": p.sets_planned,
            "reps_min": p.reps_min,
            "reps_max": p.reps_max,
            "target_rir": p.target_rir,
            "load_planned_kg": p.load_planned_kg,
            "rest_seconds": p.rest_seconds,
            "notes": p.notes,
        }
        for p in req.prescriptions
    ]

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{supabase_url}/rest/v1/strength_prescriptions",
            headers=headers,
            json=prescriptions_data,
            timeout=10,
        )

    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=r.status_code, detail=f"Failed to create prescriptions: {r.text}")

    return {"session_id": session_id, "prescriptions_count": len(req.prescriptions)}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, user_id: str = Query(...)):
    """Récupérer une séance avec toutes ses prescriptions et logs."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    async with httpx.AsyncClient() as client:
        # Récupérer les prescriptions
        r = await client.get(
            f"{supabase_url}/rest/v1/strength_prescriptions?session_id=eq.{session_id}&user_id=eq.{user_id}",
            headers=headers,
            timeout=10,
        )

    if r.status_code != 200:
        raise HTTPException(status_code=404, detail="Session not found")

    prescriptions = r.json()
    if not prescriptions:
        raise HTTPException(status_code=404, detail="No prescriptions found for this session")

    return {
        "session_id": session_id,
        "prescriptions": prescriptions,
        "prescription_count": len(prescriptions),
    }


@router.put("/sessions/{session_id}/rir")
async def log_set_rir(session_id: str, prescription_id: str, set_log: SetLog):
    """Logger le RIR et les données d'une série."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    # Récupérer le numéro de série (count des logs existants + 1)
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{supabase_url}/rest/v1/strength_set_logs?prescription_id=eq.{prescription_id}",
            headers=headers,
            timeout=10,
        )

    set_number = 1
    if r.status_code == 200:
        existing_logs = r.json()
        if existing_logs and isinstance(existing_logs, list):
            set_number = len(existing_logs) + 1

    log_data = {
        "id": str(uuid4()),
        "prescription_id": prescription_id,
        "set_number": set_number,
        "reps_completed": set_log.reps_completed,
        "rir_actual": set_log.rir_actual,
        "load_kg": set_log.load_kg,
        # tonnage_kg est une colonne générée, ne pas l'inclure
        "recorded_at": datetime.utcnow().isoformat(),
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{supabase_url}/rest/v1/strength_set_logs",
            headers=headers,
            json=log_data,
            timeout=10,
        )

    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=r.status_code, detail=f"Failed to log set: {r.text}")

    return {"set_number": set_number, "logged": True}


@router.put("/sessions/{session_id}/progression")
async def update_progression(session_id: str, user_id: str, exercise_id: str, update: ProgressionUpdate):
    """Mettre à jour la progression pour un exercice."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    # 1. Récupérer la prescription pour cette session et cet exercice
    async with httpx.AsyncClient() as client:
        r_prescription = await client.get(
            f"{supabase_url}/rest/v1/strength_prescriptions?session_id=eq.{session_id}&exercise_id=eq.{exercise_id}&limit=1",
            headers=headers,
            timeout=10,
        )

    if r_prescription.status_code != 200:
        raise HTTPException(status_code=404, detail="Prescription not found")

    prescriptions = r_prescription.json()
    if not prescriptions:
        raise HTTPException(status_code=404, detail="No prescription found for this exercise in this session")

    prescription_id = prescriptions[0]["id"]

    # 2. Récupérer le dernier log pour cette prescription
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{supabase_url}/rest/v1/strength_set_logs?prescription_id=eq.{prescription_id}&order=recorded_at.desc&limit=1",
            headers=headers,
            timeout=10,
        )

    if r.status_code != 200:
        raise HTTPException(status_code=404, detail="No set logs found for this exercise")

    last_log = r.json()
    if not last_log:
        raise HTTPException(status_code=404, detail="No logs found")

    progression_data = {
        "id": str(uuid4()),
        "user_id": user_id,
        "exercise_id": exercise_id,
        "load_kg": float(last_log[0]["load_kg"]),
        "reps": last_log[0]["reps_completed"],
        "rir": last_log[0]["rir_actual"],
        "tonnage_kg": float(last_log[0]["tonnage_kg"] or 0),
        "progression_type": update.progression_type,
        "session_date": datetime.utcnow().date().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{supabase_url}/rest/v1/strength_progression",
            headers=headers,
            json=progression_data,
            timeout=10,
        )

    if r.status_code not in [200, 201]:
        raise HTTPException(status_code=r.status_code, detail=f"Failed to update progression: {r.text}")

    return {"progression_type": update.progression_type, "updated": True}


@router.get("/readiness", response_model=ReadinessResponse)
async def get_readiness(user_id: str = Query(...)):
    """Évaluer l'état de forme basé sur les données de progression."""
    supabase_url = _get_supabase_url()
    headers = _get_supabase_headers()

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{supabase_url}/rest/v1/strength_progression?user_id=eq.{user_id}&order=session_date.desc&limit=7",
            headers=headers,
            timeout=10,
        )

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail="Failed to fetch readiness data")

    progressions = r.json()

    if not progressions:
        return ReadinessResponse(
            user_id=user_id,
            recovery_status="green",
            last_session_date=None,
            days_since_last_session=None,
            average_tonnage_weekly=None,
        )

    last_date = progressions[0]["session_date"]
    avg_tonnage = sum(p["tonnage_kg"] for p in progressions) / len(progressions)

    # Déterminer le statut de récupération
    increase_count = sum(1 for p in progressions if p["progression_type"] == "increase")
    decrease_count = sum(1 for p in progressions if p["progression_type"] == "decrease")

    if increase_count > decrease_count:
        status = "green"
    elif decrease_count > increase_count:
        status = "red"
    else:
        status = "yellow"

    return ReadinessResponse(
        user_id=user_id,
        recovery_status=status,
        last_session_date=last_date,
        days_since_last_session=0,  # À calculer avec la date actuelle
        average_tonnage_weekly=avg_tonnage,
    )


@router.post("/feedback")
async def post_feedback(user_id: str, session_id: str, feedback: dict):
    """Enregistrer le retour d'expérience post-séance."""
    # Simplement retourner un succès pour maintenant
    # À implémenter avec une table strength_feedback si nécessaire
    return {
        "user_id": user_id,
        "session_id": session_id,
        "feedback_received": True,
        "timestamp": datetime.utcnow().isoformat(),
    }
