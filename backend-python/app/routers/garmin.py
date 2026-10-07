"""Liaison et synchronisation Garmin Connect (login 2 étapes avec MFA)."""
import logging
from datetime import date as date_type
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from ..config import settings
from ..crypto import TokenCipher
from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key
from ..advisor import activity as advisor_activity
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
    # Lecture optionnelle : ne doit jamais casser le statut « connecté »
    # (ex. table sync_runs pas encore migrée).
    try:
        last_sync = repo.get_last_sync_run(user_id)
    except Exception:
        logger.exception("last_sync_fetch_failed", extra={"user_id": user_id})
        last_sync = None
    if row is None:
        return {"linked": False, "last_sync": last_sync}
    return {"linked": True, "updated_at": row.get("updated_at"), "last_sync": last_sync}

@router.delete("/link/{user_id}")
def unlink(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    repo.delete_oauth_token(user_id, garmin_sync.PROVIDER)
    return {"deleted": True}

class SyncRequest(BaseModel):
    user_id: str
    days: int = 7
    until: date_type | None = None

def _hr_params(repo: SupabaseRepo, user_id: str) -> tuple[float, float, str]:
    """(hr_rest, hr_max, sex) depuis le profil, avec repli raisonnable."""
    profile = repo.get_profile(user_id) or {}
    hr_rest = profile.get("hr_rest")
    if hr_rest is None:
        # repli : moyenne des FC repos mesurées, sinon 60
        try:
            hist = repo.get_metrics_history(user_id, days=28)
            vals = [m["resting_heart_rate"] for m in hist
                    if m.get("resting_heart_rate")]
            hr_rest = round(sum(vals) / len(vals)) if vals else 60
        except Exception:
            hr_rest = 60
    return float(hr_rest), float(profile.get("hr_max") or 190), \
        (profile.get("sex") or "M")

def _run_sync_job(repo: SupabaseRepo, user_id: str, days: int, until,
                  run_id: str | None, cipher, client) -> None:
    """Tâche de fond : exécute la synchro et clôture le sync_run.

    Ne bloque pas la requête HTTP. Le repo est le singleton applicatif
    (client httpx persistant, sûr entre threads). Erreurs logguées.
    """
    result: dict = {}
    errors: list[str] = []

    try:
        result = garmin_sync.sync_user(repo, cipher, client, user_id,
                                       days=days, until=until)
    except Exception as e:
        logger.exception("garmin_daily_sync_failed", extra={"user_id": user_id})
        errors.append(f"daily: {e}")

    try:
        result["wellness"] = garmin_sync.sync_wellness(
            repo, client, user_id, days=days, until=until)
    except Exception as e:
        logger.exception("garmin_wellness_sync_failed", extra={"user_id": user_id})
        result["wellness"] = None
        errors.append(f"wellness: {e}")

    try:
        hr_rest, hr_max, sex = _hr_params(repo, user_id)
        result["activities"] = garmin_sync.import_activities(
            repo, client, user_id, days=days, until=until,
            hr_rest=hr_rest, hr_max=hr_max, sex=sex)
    except Exception as e:
        logger.exception("garmin_activities_import_failed", extra={"user_id": user_id})
        result["activities"] = None
        errors.append(f"activities: {e}")

    try:
        _store_token(repo, cipher, client, user_id)
    except Exception:
        logger.exception("garmin_token_store_failed", extra={"user_id": user_id})

    daily_ok = "days_with_data" in result
    status = "success" if not errors else ("error" if not daily_ok else "partial")
    repo.finish_sync_run(run_id, {
        "status": status,
        "daily_days": result.get("days_with_data"),
        "wellness_days": (result.get("wellness") or {}).get("days_with_data"),
        "activities_imported": (result.get("activities") or {}).get("imported"),
        "error": (" | ".join(errors)[:1000]) or None,
    })

@router.post("/sync")
def sync(req: SyncRequest, background_tasks: BackgroundTasks,
         repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Lance la synchro en TÂCHE DE FOND (non-bloquant) et retourne aussitôt.
    Le statut est suivi via /garmin/status (dernier sync_run : running →
    success/partial/error)."""
    if not 1 <= req.days <= 60:
        raise HTTPException(status_code=422, detail="days doit être entre 1 et 60")
    cipher = _require_crypto()
    client = _load_client(repo, cipher, req.user_id)  # fail-fast si non lié
    run_id = repo.start_sync_run(req.user_id)
    background_tasks.add_task(_run_sync_job, repo, req.user_id, req.days,
                             req.until, run_id, cipher, client)
    # Après la synchro (les tâches s'exécutent dans l'ordre) : commentaires
    # de Perlo sur les nouvelles séances. Lent (LLM CPU), sans effet sur le
    # statut de synchro déjà clôturé.
    background_tasks.add_task(advisor_activity.run_pending, repo, req.user_id)
    return {"status": "running", "sync_run_id": run_id}

class ImportActivitiesRequest(BaseModel):
    user_id: str
    days: int = 14
    until: date_type | None = None

@router.post("/import-activities")
def import_activities(req: ImportActivitiesRequest,
                      repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Importe les activités course à pied : TRIMP réel, statut COMPLETED."""
    if not 1 <= req.days <= 90:
        raise HTTPException(status_code=422, detail="days doit être entre 1 et 90")
    cipher = _require_crypto()
    client = _load_client(repo, cipher, req.user_id)
    hr_rest, hr_max, sex = _hr_params(repo, req.user_id)
    return garmin_sync.import_activities(
        repo, client, req.user_id, days=req.days, until=req.until,
        hr_rest=hr_rest, hr_max=hr_max, sex=sex)

# ---------------------------------------------------- Replan / fenêtre glissante
def _metrics_snapshot(repo: SupabaseRepo, user_id: str) -> dict:
    """ACWR courant depuis les charges TRIMP réalisées — best-effort.

    Sert de `metrics_snapshot` de la révision (le « pourquoi » du replan). Ne
    doit jamais faire échouer le replan : renvoie {} en cas de souci."""
    try:
        from ..engine.acwr import acwr_point
        rows = repo.get_completed_loads(user_id, days=42)
        by_day: dict = {}
        for r in rows:
            d = r.get("scheduled_date")
            if not d:
                continue
            by_day[d] = by_day.get(d, 0.0) + (r.get("trimp_actual") or 0.0)
        if not by_day:
            return {}
        start = date_type.fromisoformat(min(by_day))
        end = date_type.fromisoformat(max(by_day))
        series = [by_day.get((start + timedelta(days=i)).isoformat(), 0.0)
                  for i in range((end - start).days + 1)]
        pt = acwr_point(series)
        return {"acwr": round(pt.ratio, 3), "acute": round(pt.acute, 1),
                "chronic": round(pt.chronic, 1), "verdict": pt.verdict}
    except Exception:
        logger.exception("metrics_snapshot_failed", extra={"user_id": user_id})
        return {}

class ReplanRequest(BaseModel):
    user_id: str
    trigger: str = "WEEKLY"
    window_days: int = 14

