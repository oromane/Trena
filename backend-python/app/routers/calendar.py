"""Connexion Google Calendar + publication du plan en événements."""
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..crypto import TokenCipher
from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key
from ..services import calendar_sync

router = APIRouter(prefix="/calendar", tags=["calendar"],
                   dependencies=[Depends(require_internal_key)])


def _require_google_config() -> None:
    if not settings.google_client_id or not settings.token_encryption_key:
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_CLIENT_ID / TOKEN_ENCRYPTION_KEY non configurés",
        )


def get_gcal() -> calendar_sync.GoogleCalendarClient:
    """Factory injectable (remplacée dans les tests)."""
    return calendar_sync.GoogleCalendarClient(
        settings.google_client_id, settings.google_client_secret
    )


# ------------------------------------------------------------------- OAuth2
class AuthorizeUrlRequest(BaseModel):
    redirect_uri: str
    state: str


@router.post("/oauth/authorize-url")
def authorize_url(req: AuthorizeUrlRequest) -> dict:
    """URL de consentement Google. Le `state` (anti-CSRF) est généré et
    vérifié par le frontend via un cookie httpOnly."""
    _require_google_config()
    return {
        "url": calendar_sync.build_authorize_url(
            settings.google_client_id, req.redirect_uri, req.state
        )
    }


class ExchangeRequest(BaseModel):
    user_id: str
    code: str
    redirect_uri: str


@router.post("/oauth/exchange")
def exchange_code(
    req: ExchangeRequest,
    repo: SupabaseRepo = Depends(get_repo),
    gcal: calendar_sync.GoogleCalendarClient = Depends(get_gcal),
) -> dict:
    """Échange code → tokens, chiffre et persiste (spec §7.1)."""
    _require_google_config()
    try:
        tokens = gcal.exchange_code(req.code, req.redirect_uri)
    except Exception:
        raise HTTPException(status_code=502,
                            detail="Échange OAuth refusé par Google")
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=502,
            detail="Pas de refresh_token émis — réessayer (prompt=consent)",
        )
    cipher = TokenCipher(settings.token_encryption_key)
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=tokens.get("expires_in", 3600)
    )
    repo.upsert_oauth_token({
        "user_id": req.user_id,
        "provider": "google_calendar",
        "access_token_encrypted": cipher.encrypt(tokens["access_token"]),
        "refresh_token_encrypted": cipher.encrypt(refresh_token),
        "expires_at": expires_at.isoformat(),
        "scopes": tokens.get("scope", "").split(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"linked": True}


@router.get("/status")
def calendar_status(user_id: str,
                    repo: SupabaseRepo = Depends(get_repo)) -> dict:
    row = repo.get_oauth_token(user_id, "google_calendar")
    if row is None:
        return {"linked": False}
    return {
        "linked": True,
        "expires_at": row.get("expires_at"),
        "scopes": row.get("scopes", []),
    }


@router.delete("/tokens/{user_id}")
def unlink(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    repo.delete_oauth_token(user_id, "google_calendar")
    return {"deleted": True}


class StoreTokenRequest(BaseModel):
    """Appelé par le frontend après l'échange OAuth2 (code → tokens)."""
    user_id: str
    access_token: str
    refresh_token: str
    expires_in: int = 3600
    scopes: list[str] = []


@router.post("/tokens")
def store_tokens(req: StoreTokenRequest,
                 repo: SupabaseRepo = Depends(get_repo)) -> dict:
    _require_google_config()
    cipher = TokenCipher(settings.token_encryption_key)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=req.expires_in)
    repo.upsert_oauth_token({
        "user_id": req.user_id,
        "provider": "google_calendar",
        "access_token_encrypted": cipher.encrypt(req.access_token),
        "refresh_token_encrypted": cipher.encrypt(req.refresh_token),
        "expires_at": expires_at.isoformat(),
        "scopes": req.scopes,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"stored": True}


class PurgeRequest(BaseModel):
    user_id: str
    days_back: int = 60
    days_forward: int = 400


@router.post("/purge")
def purge_events(req: PurgeRequest,
                 repo: SupabaseRepo = Depends(get_repo),
                 gcal: calendar_sync.GoogleCalendarClient = Depends(get_gcal),
                 ) -> dict:
    """Supprime TOUS les événements créés par Trena dans le calendrier
    (y compris les doublons de publications multiples), puis remet à zéro
    les références calendar_event_id des séances."""
    _require_google_config()
    cipher = TokenCipher(settings.token_encryption_key)
    token = calendar_sync.get_valid_access_token(repo, cipher, gcal, req.user_id)
    if token is None:
        raise HTTPException(status_code=404, detail="Compte Google non lié")

    now = datetime.now(timezone.utc)
    try:
        deleted = gcal.purge_trena_events(
            token,
            time_min=(now - timedelta(days=req.days_back)).isoformat(),
            time_max=(now + timedelta(days=req.days_forward)).isoformat(),
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Google Calendar a refusé la purge : {e.response.text[:200]}",
        )
    repo.clear_calendar_event_ids(req.user_id)
    return {"events_deleted": deleted}


class PublishRequest(BaseModel):
    user_id: str
    from_date: date | None = None
    start_hour: int = 18
    timezone: str = "Europe/Paris"


@router.post("/publish")
def publish_plan(req: PublishRequest,
                 repo: SupabaseRepo = Depends(get_repo),
                 gcal: calendar_sync.GoogleCalendarClient = Depends(get_gcal),
                 ) -> dict:
    """Crée les événements Calendar pour toutes les séances planifiées
    sans calendar_event_id (POST groupés, spec §7.1)."""
    _require_google_config()
    cipher = TokenCipher(settings.token_encryption_key)
    token = calendar_sync.get_valid_access_token(repo, cipher, gcal, req.user_id)
    if token is None:
        raise HTTPException(status_code=404, detail="Compte Google non lié")

    start = req.from_date or date.today()
    # Récupère les séances planifiées à publier
    sessions = repo._get("/training_sessions", {
        "user_id": f"eq.{req.user_id}",
        "status": "eq.PLANNED",
        "scheduled_date": f"gte.{start.isoformat()}",
        "calendar_event_id": "is.null",
        "select": "*",
        "order": "scheduled_date.asc",
    })

    created = 0
    for s in sessions:
        stime = None
        if s.get("scheduled_time"):
            stime = datetime.strptime(s["scheduled_time"][:5], "%H:%M").time()
        event = calendar_sync.session_to_event(
            s["session_type"],
            s["duration_planned_minutes"],
            s["intensity_target_trimp"],
            date.fromisoformat(s["scheduled_date"]),
            start_hour=req.start_hour,
            tz=req.timezone,
            start_time=stime,
        )
        try:
            result = gcal.create_event(token, event)
        except httpx.HTTPStatusError as e:
            # Remonte l'erreur Google lisible (ex: API non activée, quota)
            raise HTTPException(
                status_code=502,
                detail=(
                    f"Google Calendar a refusé la création "
                    f"({e.response.status_code}) après {created} événement(s) : "
                    f"{e.response.text[:300]}"
                ),
            )
        repo.update_session(s["id"], {"calendar_event_id": result["id"]})
        created += 1

    return {"events_created": created}
