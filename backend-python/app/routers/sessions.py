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
from ..engine import templates
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


class UpdateRequest(BaseModel):
    user_id: str
    session_id: str
    scheduled_date: date_type | None = None
    scheduled_time: str | None = None
    session_type: str | None = None
    duration_minutes: int | None = None
    title: str | None = None
    # Remplacement complet du contenu par le constructeur libre :
    custom: dict | None = None
    # Ou par le constructeur structuré (types, conditions, cibles) :
    structured: dict | None = None


@router.post("/update")
def update(req: UpdateRequest,
           repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Personnalise une séance existante : planification, contenu, ou les deux.

    - Champs simples : type, durée (TRIMP recalculé), titre, date, heure.
    - `custom` : remplace tout le contenu par une séance construite.
    """
    session = repo.get_session(req.session_id, req.user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Séance introuvable")

    fields: dict = {}

    if req.structured or req.custom:
        try:
            if req.structured:
                built = templates.build_structured_workout(
                    req.structured.get("title", ""), req.structured.get("steps") or []
                )
            else:
                built = templates.build_custom_workout(
                    req.custom.get("title", ""), req.custom.get("steps") or []
                )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        fields.update({
            "session_type": built["session_type"],
            "title": built["title"],
            "structure": built["structure"],
            "duration_planned_minutes": built["duration_minutes"],
            "intensity_target_trimp": built["target_trimp"],
        })
    else:
        if req.session_type is not None:
            if req.session_type not in VALID_TYPES:
                raise HTTPException(status_code=422,
                                    detail=f"session_type doit être dans {VALID_TYPES}")
            fields["session_type"] = req.session_type
        if req.duration_minutes is not None:
            if not 10 <= req.duration_minutes <= 360:
                raise HTTPException(status_code=422,
                                    detail="duration_minutes doit être entre 10 et 360")
            fields["duration_planned_minutes"] = req.duration_minutes
        if req.title is not None:
            fields["title"] = req.title.strip()[:150] or None
        # Type ou durée modifié : TRIMP recalculé, structure obsolète purgée
        if "session_type" in fields or "duration_planned_minutes" in fields:
            new_type = fields.get("session_type", session["session_type"])
            new_dur = fields.get("duration_planned_minutes",
                                 session["duration_planned_minutes"])
            fields["intensity_target_trimp"] = round(new_dur * TRIMP_PER_MIN[new_type])
            if session.get("structure"):
                fields["structure"] = None

    if req.scheduled_date is not None:
        fields["scheduled_date"] = req.scheduled_date.isoformat()
    new_time = _parse_time(req.scheduled_time)
    if new_time is not None:
        fields["scheduled_time"] = new_time.isoformat()

    if not fields:
        raise HTTPException(status_code=422, detail="Aucune modification fournie")
    repo.update_session(req.session_id, fields)

    # Sync Google Calendar (horaire + contenu), best effort
    calendar_synced = False
    if session.get("calendar_event_id"):
        gcal, token = _calendar_client_and_token(repo, req.user_id)
        if gcal and token:
            try:
                day = (req.scheduled_date
                       or date_type.fromisoformat(session["scheduled_date"]))
                event = calendar_sync.session_to_event(
                    fields.get("session_type", session["session_type"]),
                    fields.get("duration_planned_minutes",
                               session["duration_planned_minutes"]),
                    fields.get("intensity_target_trimp",
                               session["intensity_target_trimp"]),
                    day,
                    start_time=new_time or _parse_time(session.get("scheduled_time")),
                )
                gcal.patch_event(token, session["calendar_event_id"], {
                    "summary": event["summary"],
                    "description": event["description"],
                    "start": event["start"], "end": event["end"],
                })
                calendar_synced = True
            except Exception:
                calendar_synced = False

    return {"updated": True, "calendar_synced": calendar_synced,
            "target_trimp": fields.get("intensity_target_trimp")}


class CreateRequest(BaseModel):
    user_id: str
    scheduled_date: date_type
    scheduled_time: str | None = None
    # Séance simple :
    session_type: str | None = None
    duration_minutes: int | None = None
    # Ou depuis un modèle structuré :
    template_id: str | None = None
    params: dict | None = None
    # Ou constructeur libre (style Garmin) :
    custom: dict | None = None  # {"title": ..., "steps": [...]}
    # Ou constructeur structuré avancé (types, conditions, cibles) :
    structured: dict | None = None  # {"title": ..., "steps": [...]}


@router.get("/templates")
def list_workout_templates() -> dict:
    """Bibliothèque de séances structurées (paramètres personnalisables)."""
    return {"templates": templates.list_templates()}


@router.post("/create")
def create(req: CreateRequest,
           repo: SupabaseRepo = Depends(get_repo)) -> dict:
    objective = repo.get_active_objective(req.user_id)

    if req.structured:
        # ------------------------------------- constructeur structuré avancé
        try:
            built = templates.build_structured_workout(
                req.structured.get("title", ""), req.structured.get("steps") or []
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        row = {
            "user_id": req.user_id,
            "objective_id": objective["id"] if objective else None,
            "scheduled_date": req.scheduled_date.isoformat(),
            "session_type": built["session_type"],
            "title": built["title"],
            "structure": built["structure"],
            "duration_planned_minutes": built["duration_minutes"],
            "intensity_target_trimp": built["target_trimp"],
            "status": "PLANNED",
        }
        trimp = built["target_trimp"]
    elif req.custom:
        # ---------------------------------------- constructeur libre
        try:
            built = templates.build_custom_workout(
                req.custom.get("title", ""), req.custom.get("steps") or []
            )
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        row = {
            "user_id": req.user_id,
            "objective_id": objective["id"] if objective else None,
            "scheduled_date": req.scheduled_date.isoformat(),
            "session_type": built["session_type"],
            "title": built["title"],
            "structure": built["structure"],
            "duration_planned_minutes": built["duration_minutes"],
            "intensity_target_trimp": built["target_trimp"],
            "status": "PLANNED",
        }
        trimp = built["target_trimp"]
    elif req.template_id:
        # ------------------------------------------- séance structurée
        try:
            built = templates.build_from_template(req.template_id, req.params)
        except KeyError:
            raise HTTPException(status_code=404,
                                detail=f"Modèle inconnu : {req.template_id}")
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        row = {
            "user_id": req.user_id,
            "objective_id": objective["id"] if objective else None,
            "scheduled_date": req.scheduled_date.isoformat(),
            "session_type": built["session_type"],
            "title": built["title"],
            "structure": built["structure"],
            "duration_planned_minutes": built["duration_minutes"],
            "intensity_target_trimp": built["target_trimp"],
            "status": "PLANNED",
        }
        trimp = built["target_trimp"]
    else:
        # ------------------------------------------------ séance simple
        if req.session_type not in VALID_TYPES:
            raise HTTPException(status_code=422,
                                detail=f"session_type doit être dans {VALID_TYPES}")
        if req.duration_minutes is None or not 10 <= req.duration_minutes <= 360:
            raise HTTPException(status_code=422,
                                detail="duration_minutes doit être entre 10 et 360")
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


# --------------------------------------------- bibliothèque de séances (test)
def _build_library_payload(custom: dict | None, structured: dict | None) -> dict:
    if structured:
        return templates.build_structured_workout(
            structured.get("title", ""), structured.get("steps") or [])
    if custom:
        return templates.build_custom_workout(
            custom.get("title", ""), custom.get("steps") or [])
    raise HTTPException(status_code=422, detail="Aucune structure fournie")


class LibrarySaveRequest(BaseModel):
    user_id: str
    custom: dict | None = None
    structured: dict | None = None


@router.post("/library/save")
def library_save(req: LibrarySaveRequest,
                 repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Enregistre une séance construite dans la bibliothèque de test (isolée
    du moteur : n'impacte pas la charge prévisionnelle Banister)."""
    try:
        built = _build_library_payload(req.custom, req.structured)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    saved = repo.save_template(req.user_id, {
        "title": built["title"],
        "session_type": built["session_type"],
        "duration_minutes": built["duration_minutes"],
        "target_trimp": built["target_trimp"],
        "structure": built["structure"],
    })
    return {"saved": True, "template_id": saved["id"] if saved else None}


@router.get("/library")
def library_list(user_id: str,
                 repo: SupabaseRepo = Depends(get_repo)) -> dict:
    return {"templates": repo.list_library(user_id)}


class LibraryIdRequest(BaseModel):
    user_id: str
    template_id: str


@router.post("/library/delete")
def library_delete(req: LibraryIdRequest,
                   repo: SupabaseRepo = Depends(get_repo)) -> dict:
    repo.delete_template(req.user_id, req.template_id)
    return {"deleted": True}


class LibraryScheduleRequest(BaseModel):
    user_id: str
    template_id: str
    scheduled_date: date_type
    scheduled_time: str | None = None


@router.post("/library/schedule")
def library_schedule(req: LibraryScheduleRequest,
                     repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Instancie un modèle de la bibliothèque en séance planifiée (entre alors
    dans le plan et la charge prévisionnelle)."""
    tpl = repo.get_template(req.user_id, req.template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    objective = repo.get_active_objective(req.user_id)
    row = {
        "user_id": req.user_id,
        "objective_id": objective["id"] if objective else None,
        "scheduled_date": req.scheduled_date.isoformat(),
        "session_type": tpl["session_type"],
        "title": tpl["title"],
        "structure": tpl["structure"],
        "duration_planned_minutes": tpl["duration_minutes"],
        "intensity_target_trimp": tpl["target_trimp"],
        "status": "PLANNED",
    }
    t = _parse_time(req.scheduled_time)
    if t is not None:
        row["scheduled_time"] = t.isoformat()
    created = repo.insert_sessions([row])
    return {"created": True,
            "session_id": created[0]["id"] if created else None}


class CompleteRequest(BaseModel):
    user_id: str
    session_id: str
    done: bool = True  # True = valider (faite), False = annuler la validation


@router.post("/complete")
def complete(req: CompleteRequest,
             repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Validation manuelle d'une séance : la passe en COMPLETED (→ historique
    + adhérence), sans supposer qu'elle est faite automatiquement.

    Le réalisé est initialisé au prévu (durée + TRIMP) tant qu'aucune donnée
    Garmin réelle n'existe. `done=False` annule la validation (retour PLANNED),
    en préservant un éventuel réalisé importé depuis Garmin.
    """
    session = repo.get_session(req.session_id, req.user_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Séance introuvable")

    if req.done:
        fields: dict = {"status": "COMPLETED"}
        # Ne pas écraser un réalisé déjà importé (Garmin).
        if session.get("duration_actual_minutes") is None:
            fields["duration_actual_minutes"] = session["duration_planned_minutes"]
        if session.get("trimp_actual") is None:
            fields["trimp_actual"] = session["intensity_target_trimp"]
    else:
        fields = {"status": "PLANNED"}
        # Efface le réalisé seulement s'il a été saisi manuellement
        # (pas de séance Garmin rattachée).
        if not session.get("garmin_activity_id"):
            fields["duration_actual_minutes"] = None
            fields["trimp_actual"] = None

    repo.update_session(req.session_id, fields)
    return {"completed": req.done, "status": fields["status"]}


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
