"""Synchronisation Garmin Connect (API non officielle, lib garminconnect).

Principe :
  1. /garmin/link (étape 1) : login email/mot de passe avec return_on_mfa=True.
     Si MFA requis, l'objet Garmin est mis de côté en mémoire et un session_id
     est retourné au frontend.
     /garmin/link/mfa (étape 2) : soumet le code MFA via resume_login().
     On ne conserve JAMAIS le mot de passe. Le jeton de session
     (valide ~1 an, auto-rafraîchi) est chiffré (Fernet) et stocké dans
     `oauth_tokens` (provider='garmin').
  2. /garmin/sync : recharge le jeton, récupère HRV / sommeil / FC repos /
     stress par jour et upsert dans `daily_metrics`.

L'import de `garminconnect` est paresseux et le client injectable : les tests
tournent sans la lib ni réseau.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

PROVIDER = "garmin"

# Durée max d'attente pour le code MFA (secondes)
MFA_TIMEOUT = 120


class GarminAuthError(Exception):
    """Login refusé (identifiants, MFA requis, rate-limit)."""


class GarminMfaRequired(Exception):
    """Signal interne : le login a déclenché un prompt MFA."""


# ---------------------------------------------------------------- MFA state
@dataclass
class PendingMfaSession:
    """État d'un login Garmin en attente du code MFA."""
    session_id: str
    user_id: str
    garmin_instance: Any = None    # L'objet Garmin en attente de resume_login()
    created_at: float = field(default_factory=time.time)


# Sessions MFA pendantes (en mémoire — durée de vie < 2 min)
_pending: dict[str, PendingMfaSession] = {}


def _cleanup_expired() -> None:
    """Supprime les sessions expirées (> MFA_TIMEOUT)."""
    now = time.time()
    expired = [k for k, v in _pending.items()
               if now - v.created_at > MFA_TIMEOUT]
    for k in expired:
        del _pending[k]


def get_pending_session(session_id: str) -> PendingMfaSession | None:
    _cleanup_expired()
    return _pending.get(session_id)


class GarminClient:
    """Adaptateur mince autour de garminconnect.Garmin."""

    def __init__(self, garmin: Any = None):
        self._g = garmin

    # ------------------------------------------------------------------ auth
    @classmethod
    def login(cls, email: str, password: str,
              mfa_code: str | None = None) -> "GarminClient":
        """Login direct (legacy) — utilisé quand le code MFA est déjà connu."""
        try:
            from garminconnect import Garmin
        except ImportError as e:  # pragma: no cover
            raise GarminAuthError(f"lib garminconnect absente : {e}")
        try:
            prompt = (lambda: mfa_code) if mfa_code else None
            g = Garmin(email=email, password=password, prompt_mfa=prompt)
            g.login()
        except Exception as e:
            raise GarminAuthError(str(e)[:300])
        return cls(g)

    @classmethod
    def login_step1(cls, email: str, password: str,
                    user_id: str) -> "GarminClient":
        """Étape 1 du login 2-étapes.

        Tente le login avec return_on_mfa=True.
        - Si le compte n'a pas de MFA → retourne le client directement.
        - Si MFA requis → stocke l'objet Garmin et lève GarminMfaRequired(session_id).
        """
        try:
            from garminconnect import Garmin
        except ImportError as e:  # pragma: no cover
            raise GarminAuthError(f"lib garminconnect absente : {e}")

        try:
            g = Garmin(email=email, password=password, return_on_mfa=True)
            mfa_status, _ = g.login()
        except Exception as e:
            raise GarminAuthError(str(e)[:300])

        if mfa_status == "needs_mfa":
            session_id = uuid.uuid4().hex[:12]
            _cleanup_expired()
            _pending[session_id] = PendingMfaSession(
                session_id=session_id,
                user_id=user_id,
                garmin_instance=g,
            )
            raise GarminMfaRequired(session_id)

        # Login réussi sans MFA
        return cls(g)

    @classmethod
    def from_token(cls, token: str) -> "GarminClient":
        try:
            from garminconnect import Garmin
        except ImportError as e:  # pragma: no cover
            raise GarminAuthError(f"lib garminconnect absente : {e}")
        try:
            g = Garmin()
            g.login(tokenstore=token)
        except Exception as e:
            raise GarminAuthError(f"jeton Garmin invalide/expiré : {str(e)[:200]}")
        return cls(g)

    def dump_token(self) -> str:
        return self._g.client.dumps()

    # ------------------------------------------------------------------ data
    def fetch_daily(self, day: date) -> dict:
        """Métriques du jour, clés alignées sur daily_metrics. Valeurs None si absentes."""
        iso = day.isoformat()
        out: dict[str, Any] = {"recorded_date": iso, "hrv_ms": None,
                               "sleep_minutes": None,
                               "resting_heart_rate": None,
                               "stress_score": None}

        try:
            hrv = self._g.get_hrv_data(iso) or {}
            summary = hrv.get("hrvSummary") or {}
            out["hrv_ms"] = summary.get("lastNightAvg")
        except Exception:
            pass

        try:
            sleep = self._g.get_sleep_data(iso) or {}
            dto = sleep.get("dailySleepDTO") or {}
            secs = dto.get("sleepTimeSeconds")
            if secs:
                out["sleep_minutes"] = round(secs / 60)
            # HRV de secours si l'endpoint HRV n'a rien donné
            if out["hrv_ms"] is None and dto.get("avgOvernightHrv"):
                out["hrv_ms"] = dto["avgOvernightHrv"]
        except Exception:
            pass

        try:
            summary = self._g.get_user_summary(iso) or {}
            out["resting_heart_rate"] = summary.get("restingHeartRate")
            stress = summary.get("averageStressLevel")
            if stress is not None and stress >= 0:
                out["stress_score"] = stress
        except Exception:
            pass

        return out

    def fetch_activities(self, start: date, end: date) -> list[dict]:
        """Activités brutes Garmin entre deux dates (bornes incluses)."""
        try:
            return self._g.get_activities_by_date(
                start.isoformat(), end.isoformat()
            ) or []
        except Exception:
            return []

    def fetch_wellness(self, day: date) -> dict:
        """Bien-être étendu du jour : pas, calories, poids, VO2max, Body Battery..."""
        iso = day.isoformat()
        out: dict[str, Any] = {"recorded_date": iso}

        try:
            s = self._g.get_user_summary(iso) or {}
            out["steps"] = s.get("totalSteps")
            out["calories_total"] = s.get("totalKilocalories")
            out["floors_climbed"] = s.get("floorsAscended")
            out["body_battery_high"] = s.get("bodyBatteryHighestValue")
            out["body_battery_low"] = s.get("bodyBatteryLowestValue")
            mod = s.get("moderateIntensityMinutes") or 0
            vig = s.get("vigorousIntensityMinutes") or 0
            out["intensity_minutes"] = (mod + vig) or None
        except Exception:
            pass

        try:
            comp = self._g.get_body_composition(iso) or {}
            weight_g = (comp.get("totalAverage") or {}).get("weight")
            if weight_g:
                out["weight_kg"] = round(weight_g / 1000, 1)
        except Exception:
            pass

        try:
            mm = self._g.get_max_metrics(iso) or []
            if mm:
                generic = (mm[0].get("generic") or {})
                out["vo2max"] = generic.get("vo2MaxValue")
        except Exception:
            pass

        return out


def complete_mfa(session_id: str, mfa_code: str) -> GarminClient:
    """Étape 2 : soumet le code MFA via resume_login().

    Retourne le GarminClient authentifié ou lève GarminAuthError.
    """
    session = get_pending_session(session_id)
    if session is None:
        raise GarminAuthError("Session MFA expirée ou invalide")

    g = session.garmin_instance

    try:
        g.resume_login(None, mfa_code)
    except Exception as e:
        _pending.pop(session_id, None)
        raise GarminAuthError(f"Code MFA invalide : {str(e)[:300]}")

    # Nettoyer
    _pending.pop(session_id, None)

    return GarminClient(g)


def sync_user(repo, cipher, client: GarminClient, user_id: str,
              days: int = 7, until: date | None = None) -> dict:
    """Récupère `days` jours et upsert dans daily_metrics.

    Retourne {'days_fetched': n, 'days_with_data': m}.
    """
    until = until or date.today()
    rows = []
    for i in range(days):
        d = until - timedelta(days=i)
        row = client.fetch_daily(d)
        if any(row[k] is not None for k in
               ("hrv_ms", "sleep_minutes", "resting_heart_rate", "stress_score")):
            rows.append(row)
    if rows:
        repo.upsert_daily_metrics(user_id, rows)
    return {"days_fetched": days, "days_with_data": len(rows)}


# ------------------------------------------------------------- activités
# Types d'activité Garmin considérés comme de la course à pied
RUNNING_TYPES = {
    "running", "trail_running", "track_running",
    "treadmill_running", "street_running", "indoor_running",
}


def import_activities(repo, client: GarminClient, user_id: str,
                      days: int = 14, until: date | None = None,
                      hr_rest: float = 60.0, hr_max: float = 190.0,
                      sex: str = "M") -> dict:
    """Importe les activités course à pied et met à jour les séances.

    - Activité déjà importée (garmin_activity_id connu) : ignorée.
    - Séance planifiée le même jour : passée en COMPLETED avec le réalisé.
    - Sinon : séance COMPLETED créée (activité hors plan, compte dans la charge).
    """
    from ..engine.trimp import trimp as trimp_score

    until = until or date.today()
    start = until - timedelta(days=days - 1)
    activities = client.fetch_activities(start, until)

    imported = matched = created = skipped = 0
    for a in activities:
        type_key = ((a.get("activityType") or {}).get("typeKey") or "").lower()
        if type_key not in RUNNING_TYPES:
            continue
        activity_id = str(a.get("activityId") or "")
        if not activity_id:
            continue
        if repo.get_session_by_activity(user_id, activity_id) is not None:
            skipped += 1
            continue

        day_str = str(a.get("startTimeLocal") or "")[:10]
        if not day_str:
            continue
        duration_s = a.get("movingDuration") or a.get("duration") or 0
        duration_min = max(1, round(duration_s / 60))
        avg_hr = a.get("averageHR")

        if avg_hr and hr_max > hr_rest:
            trimp_val = round(trimp_score(duration_min, avg_hr, hr_rest,
                                          hr_max, sex))
        else:
            trimp_val = round(duration_min * 1.2)  # fallback sans FC

        actuals = {
            "status": "COMPLETED",
            "duration_actual_minutes": duration_min,
            "trimp_actual": trimp_val,
            "distance_m": round(a["distance"]) if a.get("distance") else None,
            "avg_hr": round(avg_hr) if avg_hr else None,
            "garmin_activity_id": activity_id,
        }

        planned = repo.get_session_for_date(user_id, date.fromisoformat(day_str))
        if planned is not None and planned.get("status") in ("PLANNED", "MODIFIED"):
            repo.update_session(planned["id"], actuals)
            matched += 1
        else:
            repo.insert_sessions([{
                "user_id": user_id,
                "scheduled_date": day_str,
                "session_type": "ENDURANCE",
                "title": a.get("activityName"),
                "duration_planned_minutes": duration_min,
                "intensity_target_trimp": trimp_val,
                **actuals,
            }])
            created += 1
        imported += 1

    return {"activities_found": len(activities), "imported": imported,
            "matched": matched, "created": created,
            "already_imported": skipped}


# ------------------------------------------------------------- bien-être
WELLNESS_FIELDS = ("weight_kg", "steps", "calories_total", "vo2max",
                   "body_battery_high", "body_battery_low",
                   "floors_climbed", "intensity_minutes")


def sync_wellness(repo, client: GarminClient, user_id: str,
                  days: int = 7, until: date | None = None) -> dict:
    """Récupère le bien-être étendu et upsert dans garmin_wellness."""
    until = until or date.today()
    rows = []
    for i in range(days):
        d = until - timedelta(days=i)
        row = client.fetch_wellness(d)
        if any(row.get(k) is not None for k in WELLNESS_FIELDS):
            rows.append(row)
    if rows:
        repo.upsert_wellness(user_id, rows)
    return {"days_fetched": days, "days_with_data": len(rows)}
