"""Liaison et synchronisation Garmin Connect (login 2 étapes avec MFA)."""
from datetime import date as date_type
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..config import settings
from ..crypto import TokenCipher
from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key
from ..services import garmin_sync
from ..services.garmin_sync import (
    GarminAuthError,
    GarminClient,
    GarminMfaRequired,
    complete_mfa,
)

router = APIRouter(prefix="/garmin", tags=["garmin"],
                   dependencies=[Depends(require_internal_key)])


def _require_crypto() -> TokenCipher:
    if not settings.token_encryption_key:
        raise HTTPException(status_code=503,
                            detail="TOKEN_ENCRYPTION_KEY non configurée")
    return TokenCipher(settings.token_encryption_key)


def _load_client(repo: SupabaseRepo, cipher: TokenCipher,
                 user_id: str) -> GarminClient:
    row = repo.get_oauth_token(user_id, garmin_sync.PROVIDER)
    if row is None:
        raise HTTPException(status_code=404, detail="Compte Garmin non lié")
    token = cipher.decrypt(row["access_token_encrypted"])
    try:
        return GarminClient.from_token(token)
    except GarminAuthError as e:
        raise HTTPException(status_code=502, detail=str(e))


def _store_token(repo: SupabaseRepo, cipher: TokenCipher,
                 client: GarminClient, user_id: str) -> None:
    """Chiffre et persiste le jeton garth."""
    now = datetime.now(timezone.utc)
    repo.upsert_oauth_token({
        "user_id": user_id,
        "provider": garmin_sync.PROVIDER,
        "access_token_encrypted": cipher.encrypt(client.dump_token()),
        "refresh_token_encrypted": cipher.encrypt("garth"),
        "expires_at": (now + timedelta(days=365)).isoformat(),
        "scopes": ["wellness"],
        "updated_at": now.isoformat(),
    })


# ---------------------------------------------------- Étape 1 : email + mdp
class LinkRequest(BaseModel):
    user_id: str
    email: str
    password: str


@router.post("/link")
def link(req: LinkRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Étape 1 — login Garmin avec email + mot de passe.

    - Si pas de MFA → jeton stocké, retourne {"linked": true}
    - Si MFA requis → retourne {"needs_mfa": true, "session_id": "..."}
    """
    cipher = _require_crypto()
    try:
        client = GarminClient.login_step1(req.email, req.password, req.user_id)
    except GarminMfaRequired as e:
        session_id = str(e)
        return {"needs_mfa": True, "session_id": session_id}
    except GarminAuthError as e:
        raise HTTPException(status_code=502,
                            detail=f"Login Garmin refusé : {e}")

    _store_token(repo, cipher, client, req.user_id)
    return {"linked": True}


# ---------------------------------------------------- Étape 2 : code MFA
class MfaRequest(BaseModel):
    user_id: str
    session_id: str
    mfa_code: str


@router.post("/link/mfa")
def link_mfa(req: MfaRequest,
             repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Étape 2 — soumet le code MFA pour compléter le login."""
    cipher = _require_crypto()
    try:
        client = complete_mfa(req.session_id, req.mfa_code)
    except GarminAuthError as e:
        raise HTTPException(status_code=502,
                            detail=f"MFA Garmin échoué : {e}")

    _store_token(repo, cipher, client, req.user_id)
    return {"linked": True}


@router.get("/status")
def status(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    row = repo.get_oauth_token(user_id, garmin_sync.PROVIDER)
    if row is None:
        return {"linked": False}
    return {"linked": True, "updated_at": row.get("updated_at")}


@router.delete("/link/{user_id}")
def unlink(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    repo.delete_oauth_token(user_id, garmin_sync.PROVIDER)
    return {"deleted": True}


class SyncRequest(BaseModel):
    user_id: str
    days: int = 7
    until: date_type | None = None


@router.post("/sync")
def sync(req: SyncRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Récupère les N derniers jours et upsert dans daily_metrics.
    Re-persiste le jeton garth (rafraîchi automatiquement par la lib)."""
    if not 1 <= req.days <= 60:
        raise HTTPException(status_code=422, detail="days doit être entre 1 et 60")
    cipher = _require_crypto()
    client = _load_client(repo, cipher, req.user_id)

    result = garmin_sync.sync_user(repo, cipher, client, req.user_id,
                                   days=req.days, until=req.until)

    # Persistance du jeton potentiellement rafraîchi (best effort)
    try:
        _store_token(repo, cipher, client, req.user_id)
    except Exception:
        pass

    return result
