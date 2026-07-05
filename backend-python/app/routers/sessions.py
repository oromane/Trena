"""Édition des séances : déplacer (jour + heure), créer, supprimer.

Chaque mutation garde Google Calendar cohérent quand la séance y est publiée
(patch de l'horaire, suppression de l'événement) : best-effort, l'échec
calendrier ne bloque jamais la mutation en base.
"""
from datetime import date as date_type
from datetime import datetime, time as time_type

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..crypto import TokenCipher
from ..db.repo import SupabaseRepo, get_repo
from ..engine.plan_generator import TRIMP_PER_MIN
from ..security import require_internal_key
from ..services import calendar_sync

router = APIRouter(prefix="/sessions", tags=["sessions"],
                   dependencies=[Depends(require_internal_key)])

VALID_TYPES = ("INTERVAL", "TEMPO", "ENDURANCE", "RECOVERY")


def _parse_time(value: str | None) -> time_type | None:
    if not value:
        return None
    return datetime.strptime(value[:5], "%H:%M").time()


def _calendar_client_and_token(repo: SupabaseRepo, user_id: str):
    """(gcal, token) si Google est configuré et lié, sinon (None, None)."""
    if not settings.google_client_id or not settings.token_encryption_key:
        return None, None
    try:
        cipher = TokenCipher(settings.token_encryption_key)
        gcal = calendar_sync.GoogleCalendarClient(
            settings.google_client_id, settings.google_client_secret
        )
        token = calendar_sync.get_valid_access_token(repo, cipher, gcal, user_id)
        return (gcal, token) if token else (None, None)
    except Exception:
        return None, None


class RescheduleRequest(BaseModel):
    user_id: str
    session_id: str
    new_date: date_type
    new_time: str | None = None  # "HH:MM"


@router.post("/reschedule")
def reschedule(req: RescheduleRequest,
               repo: SupabaseRepo = Depends(get_repo)) -> dict:
    session = repo.get_session(req.session_id, req.user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Séance introuvable")

    new_time = _parse_time(req.new_time)
    fields: dict = {"scheduled_date": req.new_date.isoformat()}
    if new_time is not None:
        fields["scheduled_time"] = new_time.isoformat()
    repo.update_session(req.session_id, fields)

    calendar_synced = False
    if session.get("calendar_event_id"):
        gcal, token = _calendar_client_and_token(repo, req.user_id)
        if gcal and token:
            try:
                event = calendar_sync.session_to_event(
                    session["session_type"],
                    session["duration_planned_minutes"],
                    session["intensity_target_trimp"],
                    req.new_date,
                    start_time=new_time or _parse_time(session.get("scheduled_time")),
                )
                gcal.patch_event(token, session["calendar_event_id"], {
                    "start": event["start"], "end": event["end"],
                })
                calendar_synced = True
            except Exception:
                calendar_synced = False

    return {"rescheduled": True, "calendar_synced": calendar_synced}


class CreateRequest(BaseModel):
    user_id: str
    scheduled_date: date_type
    scheduled_time: str | None = None
    session_type: str
    duration_minutes: int


@router.post("/create")
def create(req: CreateRequest,
           repo: SupabaseRepo = Depends(get_repo)) -> dict:
    if req.session_type not in VALID_TYPES:
        raise HTTPException(status_code=422,
                            detail=f"session_type doit être dans {VALID_TYPES}")
    if not 10 <= req.duration_minutes <= 360:
        raise HTTPException(status_code=422,
                            detail="duration_minutes doit être entre 10 et 360")

    objective = repo.get_active_objective(req.user_id)
    trimp = round(req.duration_minutes * TRIMP_PER_MIN[req.session_type])
    row = {
        "user_id": req.user_id,
        "objective_id": objective["id"] if objective else None,
        "scheduled_date": req.scheduled_date.isoformat(),
        "session_type": req.session_type,
        "duration_planned_minutes": req.duration_minutes,
        "intensity_target_trimp": trimp,
        "status": "PLANNED",
    }
    t = _parse_time(req.scheduled_time)
    if t is not None:
        row["scheduled_time"] = t.isoformat()
    created = repo.insert_sessions([row])
    return {"created": True,
            "session_id": created[0]["id"] if created else None,
            "target_trimp": trimp}


class DeleteRequest(BaseModel):
    user_id: str
    session_id: str


@router.post("/delete")
def delete(req: DeleteRequest,
           repo: SupabaseRepo = Depends(get_repo)) -> dict:
    session = repo.get_session(req.session_id, req.user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Séance introuvable")

    calendar_deleted = False
    if session.get("calendar_event_id"):
        gcal, token = _calendar_client_and_token(repo, req.user_id)
        if gcal and token:
            try:
                gcal.delete_event(token, session["calendar_event_id"])
                calendar_deleted = True
            except Exception:
                calendar_deleted = False

    repo.delete_session(req.session_id, req.user_id)
    return {"deleted": True, "calendar_deleted": calendar_deleted}
