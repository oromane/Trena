"""Module Strength — Gestion des exercices et sessions de musculation."""
from fastapi import APIRouter, HTTPException, Query
import httpx
import os
from typing import Optional

router = APIRouter(prefix="/strength", tags=["strength"])


@router.get("/exercises")
async def list_exercises(
    muscle: Optional[str] = Query(None, description="Filtre par muscle principal (chest, back, legs, etc.)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Liste les exercices avec filtrage optionnel par muscle."""
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise HTTPException(status_code=500, detail="Supabase credentials not configured")

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }

    # Construire la requête avec filtrage
    select_clause = "id,name,slug,muscle_primary,muscles_secondary,equipment"
    url = f"{supabase_url}/rest/v1/exercises?select={select_clause}&limit={limit}&offset={offset}"

    if muscle:
        url += f"&muscle_primary=eq.{muscle.lower()}"

    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers=headers, timeout=10)

    if r.status_code != 200:
        raise HTTPException(status_code=r.status_code, detail=f"Supabase error: {r.text}")

    return r.json()
