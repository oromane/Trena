"""Ajustement quotidien piloté par la base (appelé chaque matin par n8n)."""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..crypto import TokenCipher
from ..db.repo import SupabaseRepo, get_repo
from ..engine import hrv, planner
from ..security import require_internal_key
from ..services import calendar_sync

router = APIRouter(tags=["daily"], dependencies=[Depends(require_internal_key)])


class DailyRunRequest(BaseModel):
    user_id: str
    date: date_type | None = None  # défaut : aujourd'hui
    sync_calendar: bool = True


class DailyRunResponse(BaseModel):
    user_id: str
    date: date_type
    readiness: str
    hrv_zscore: float | None
    session_id: str | None
    modified: bool
    session_type: str | None
    duration_minutes: int | None
    target_trimp: int | None
    calendar_synced: bool
    detail: str | None = None


@router.get("/users/active")
def active_users(repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Utilisateurs avec objectif actif — itérés par le workflow n8n."""
    return {"user_ids": repo.list_active_user_ids()}


def _try_garmin_sync(repo: SupabaseRepo, user_id: str) -> None:
    """Sync Garmin best-effort (3 jours) avant la décision matinale.
    Ne doit jamais faire échouer l'ajustement."""
    try:
        from ..services import garmin_sync
        from ..services.garmin_sync import GarminClient
        if not settings.token_encryption_key:
            return
        row = repo.get_oauth_token(user_id, garmin_sync.PROVIDER)
        if row is None:
            return
        cipher = TokenCipher(settings.token_encryption_key)
        client = GarminClient.from_token(
            cipher.decrypt(row["access_token_encrypted"])
        )
        garmin_sync.sync_user(repo, cipher, client, user_id, days=3)
    except Exception:
        pass


@router.post("/daily-adjust/run", response_model=DailyRunResponse)
def run_daily_adjust(req: DailyRunRequest,
                     repo: SupabaseRepo = Depends(get_repo)) -> DailyRunResponse:
    day = req.date or date_type.today()

    _try_garmin_sync(repo, req.user_id)

    session = repo.get_session_for_date(req.user_id, day)
    if session is None:
        return DailyRunResponse(
            user_id=req.user_id, date=day, readiness="NORMAL", hrv_zscore=None,
            session_id=None, modified=False, session_type=None,
            duration_minutes=None, target_trimp=None, calendar_synced=False,
            detail="Aucune séance planifiée ce jour",
        )

    metrics = repo.get_metrics_history(req.user_id, days=28, until=day)
    today_row = next(
        (m for m in metrics if m["recorded_date"] == day.isoformat()), None
    )
    history = [m for m in metrics if m["recorded_date"] != day.isoformat()]

    hrv_hist = [m["hrv_ms"] for m in history if m.get("hrv_ms") is not None]
    sleep_hist = [m["sleep_minutes"] for m in history if m.get("sleep_minutes") is not None]

    if today_row is None or today_row.get("hrv_ms") is None or len(hrv_hist) < 7:
        # Données insuffisantes : planning maintenu, pas de décision forcée
        return DailyRunResponse(
            user_id=req.user_id, date=day, readiness="NORMAL", hrv_zscore=None,
            session_id=session["id"], modified=False,
            session_type=session["session_type"],
            duration_minutes=session["duration_planned_minutes"],
            target_trimp=session["intensity_target_trimp"],
            calendar_synced=False,
            detail="Données HRV insuffisantes : planning maintenu",
        )

    readiness, z = hrv.assess_readiness(
        hrv_hist,
        today_row["hrv_ms"],
        sleep_hist or [420.0],
        today_row.get("sleep_minutes") or 420.0,
        caution_z=settings.hrv_caution_z,
        critical_z=settings.hrv_critical_z,
        sleep_deficit_threshold=settings.sleep_deficit_minutes,
    )

    planned = planner.PlannedSession(
        session_type=session["session_type"],
        duration_minutes=session["duration_planned_minutes"],
        target_trimp=session["intensity_target_trimp"],
    )
    result = planner.adjust_session(planned, readiness, z, settings.default_tau2)

    if result.modified:
        repo.update_session(session["id"], {
            "session_type": result.session.session_type,
            "intensity_target_trimp": result.session.target_trimp,
            "status": "MODIFIED",
        })

    # Synchronisation Google Calendar (PATCH ciblé, spec §7.1)
    calendar_synced = False
    if (
        req.sync_calendar
        and result.modified
        and session.get("calendar_event_id")
        and settings.google_client_id
        and settings.token_encryption_key
    ):
        try:
            cipher = TokenCipher(settings.token_encryption_key)
            gcal = calendar_sync.GoogleCalendarClient(
                settings.google_client_id, settings.google_client_secret
            )
            token = calendar_sync.get_valid_access_token(repo, cipher, gcal, req.user_id)
            if token:
                event = calendar_sync.session_to_event(
                    result.session.session_type,
                    result.session.duration_minutes,
                    result.session.target_trimp,
                    day,
                )
                gcal.patch_event(token, session["calendar_event_id"], {
                    "summary": event["summary"],
                    "description": event["description"],
                })
                calendar_synced = True
        except Exception:
            # La sync calendrier ne doit jamais faire échouer la décision
            calendar_synced = False

    return DailyRunResponse(
        user_id=req.user_id, date=day,
        readiness=result.readiness.value,
        hrv_zscore=round(result.hrv_zscore, 3),
        session_id=session["id"],
        modified=result.modified,
        session_type=result.session.session_type,
        duration_minutes=result.session.duration_minutes,
        target_trimp=result.session.target_trimp,
        calendar_synced=calendar_synced,
    )
