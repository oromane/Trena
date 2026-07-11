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


def _is_rate_limit(exc: Exception) -> bool:
    """True si l'exception ressemble à un 429 Garmin (sans coupler la lib)."""
    name = type(exc).__name__.lower()
    text = str(exc).lower()
    return ("toomanyrequests" in name or "429" in text
            or "too many requests" in text or "rate limit" in text)


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

    # Débit des appels de DÉTAIL par activité (zones FC). Garmin rate-limite
    # agressivement : throttle doux + backoff exponentiel sur 429.
    _MIN_DETAIL_INTERVAL_S = 0.4  # ~2,5 req/s max

    def __init__(self, garmin: Any = None):
        self._g = garmin
        self._last_detail_ts = 0.0

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
                               "stress_score": None,
                               "sleep_deep_minutes": None,
                               "sleep_light_minutes": None,
                               "sleep_rem_minutes": None,
                               "sleep_awake_minutes": None}

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
            # Stades de sommeil détaillés (minutes)
            for key, col in (
                ("deepSleepSeconds", "sleep_deep_minutes"),
                ("lightSleepSeconds", "sleep_light_minutes"),
                ("remSleepSeconds", "sleep_rem_minutes"),
                ("awakeSleepSeconds", "sleep_awake_minutes"),
            ):
                v = dto.get(key)
                if v is not None:
                    out[col] = round(v / 60)
            # HRV de secours si l'endpoint HRV n'a rien donné
            if out["hrv_ms"] is None and dto.get("avgOvernightHrv"):
                out["hrv_ms"] = dto["avgOvernightHrv"]
        except Exception:
            pass

        try:
            summary = self._g.get_user_summary(iso) or {}
            rhr = summary.get("restingHeartRate")
            if isinstance(rhr, (int, float)):
                out["resting_heart_rate"] = int(round(rhr))
            stress = summary.get("averageStressLevel")
            if isinstance(stress, (int, float)) and stress >= 0:
                out["stress_score"] = int(round(stress))
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

    def fetch_activity_hr_zones(self, activity_id: str,
                                max_retries: int = 3) -> list[int] | None:
        """Temps par zone FC (secondes) pour une activité : [Z1, Z2, Z3, Z4, Z5].

        Appel de détail par activité (plus lent) : à utiliser en repli quand le
        résumé ne fournit pas le vecteur de zones. None si indisponible.

        Throttle doux entre appels + backoff exponentiel sur rate-limit (429)
        pour ne jamais saturer l'API Garmin lors d'un import volumineux.
        """
        # Throttle : espace les appels de détail successifs.
        wait = self._MIN_DETAIL_INTERVAL_S - (time.monotonic() - self._last_detail_ts)
        if wait > 0:
            time.sleep(wait)

        data = None
        delay = 1.0
        for attempt in range(max_retries):
            try:
                data = self._g.get_activity_hr_in_timezones(activity_id) or []
                break
            except Exception as exc:
                if _is_rate_limit(exc) and attempt < max_retries - 1:
                    time.sleep(delay)
                    delay *= 2
                    continue
                self._last_detail_ts = time.monotonic()
                return None
        self._last_detail_ts = time.monotonic()

        zones = [0, 0, 0, 0, 0]
        for z in data:
            n = z.get("zoneNumber")
            secs = z.get("secsInZone")
            if isinstance(n, int) and 1 <= n <= 5 and secs is not None:
                zones[n - 1] = round(secs)
        return zones if any(zones) else None

    def fetch_wellness(self, day: date) -> dict:
        """Bien-être étendu du jour : pas, calories, poids, VO2max, Body Battery..."""
        iso = day.isoformat()
        out: dict[str, Any] = {
            "recorded_date": iso, "steps": None, "calories_total": None,
            "floors_climbed": None, "body_battery_high": None,
            "body_battery_low": None, "intensity_minutes": None,
            "weight_kg": None, "vo2max": None,
        }

        try:
            def _i(v):  # Garmin renvoie parfois des floats (2188.0) → colonnes INT
                return int(round(v)) if isinstance(v, (int, float)) else None
            s = self._g.get_user_summary(iso) or {}
            out["steps"] = _i(s.get("totalSteps"))
            out["calories_total"] = _i(s.get("totalKilocalories"))
            out["floors_climbed"] = _i(s.get("floorsAscended"))
            out["body_battery_high"] = _i(s.get("bodyBatteryHighestValue"))
            out["body_battery_low"] = _i(s.get("bodyBatteryLowestValue"))
            mod = s.get("moderateIntensityMinutes") or 0
            vig = s.get("vigorousIntensityMinutes") or 0
            out["intensity_minutes"] = _i(mod + vig) or None
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


def sync_wellness(repo, client: GarminClient, user_id: str,
                  days: int = 7, until: date | None = None) -> dict:
    """Récupère le bien-être étendu Garmin (pas, calories, poids, VO2max,
    Body Battery, minutes intensives...) et upsert dans garmin_wellness.

    Retourne {'days_fetched': n, 'days_with_data': m}.
    """
    until = until or date.today()
    rows = []
    for i in range(days):
        d = until - timedelta(days=i)
        row = client.fetch_wellness(d)
        # Conserver le jour si au moins une métrique (hors la date) est présente.
        if any(v is not None for k, v in row.items() if k != "recorded_date"):
            rows.append(row)
    if rows:
        repo.upsert_wellness(user_id, rows)
    return {"days_fetched": days, "days_with_data": len(rows)}


# ------------------------------------------------------------- activités
# Types d'activité Garmin considérés comme de la course à pied
RUNNING_TYPES = {
    "running", "trail_running", "track_running",
    "treadmill_running", "street_running", "indoor_running",
}


def _pace_s_per_km(speed_m_s) -> int | None:
    """Allure (s/km) depuis une vitesse (m/s)."""
    return round(1000 / speed_m_s) if isinstance(speed_m_s, (int, float)) and speed_m_s else None


def extract_activity_metrics(a: dict) -> dict:
    """Métriques riches d'une activité Garmin (type Strava) → blob JSONB.

    Toutes les valeurs absentes sont écartées. Le vecteur de temps par zone
    de FC (hrTimeInZone_1..5) est la base d'un futur TRIMP zonal.
    """
    def num(v, nd: int | None = None):
        if not isinstance(v, (int, float)):
            return None
        return round(v, nd) if nd is not None else round(v)

    zones = [a.get(f"hrTimeInZone_{z}") for z in range(1, 6)]
    metrics = {
        # Base
        "distance_m": num(a.get("distance")),
        "duration_s": num(a.get("duration")),
        "moving_duration_s": num(a.get("movingDuration")),
        "elapsed_duration_s": num(a.get("elapsedDuration")),
        "avg_pace_s_per_km": _pace_s_per_km(a.get("averageSpeed")),
        "best_pace_s_per_km": _pace_s_per_km(a.get("maxSpeed")),
        "elevation_gain_m": num(a.get("elevationGain")),
        "elevation_loss_m": num(a.get("elevationLoss")),
        "calories": num(a.get("calories")),
        # Cardiaque
        "avg_hr": num(a.get("averageHR")),
        "max_hr": num(a.get("maxHR")),
        "hr_time_in_zone_s": [num(z) for z in zones] if any(z is not None for z in zones) else None,
        # Dynamique de course
        "avg_cadence_spm": num(a.get("averageRunningCadenceInStepsPerMinute")),
        "max_cadence_spm": num(a.get("maxRunningCadenceInStepsPerMinute")),
        "avg_stride_length_cm": num(a.get("avgStrideLength"), 1),
        "training_effect_aerobic": num(a.get("aerobicTrainingEffect"), 1),
        "training_effect_anaerobic": num(a.get("anaerobicTrainingEffect"), 1),
        # Environnement
        "min_temperature_c": num(a.get("minTemperature"), 1),
        "max_temperature_c": num(a.get("maxTemperature"), 1),
        "start_elevation_m": num(a.get("minElevation"), 1),
        # Évolution
        "vo2max": num(a.get("vO2MaxValue"), 1),
    }
    return {k: v for k, v in metrics.items() if v is not None}


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

    # Plafond d'appels de DÉTAIL par synchro : borne le N+1 même sur une
    # fenêtre chargée. Les activités déjà importées sont ignorées avant tout
    # appel réseau → une resynchro d'une fenêtre stable ne coûte aucun détail.
    MAX_DETAIL_CALLS = 30
    detail_calls = 0

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

        metrics = extract_activity_metrics(a)
        # Repli : si le résumé n'a pas le vecteur de zones FC, on récupère le
        # détail de l'activité (plus lent, un appel par sortie).
        if "hr_time_in_zone_s" not in metrics and detail_calls < MAX_DETAIL_CALLS:
            detail_calls += 1
            zones = client.fetch_activity_hr_zones(activity_id)
            if zones:
                metrics["hr_time_in_zone_s"] = zones

        actuals = {
            "status": "COMPLETED",
            "duration_actual_minutes": duration_min,
            "trimp_actual": trimp_val,
            "distance_m": round(a["distance"]) if a.get("distance") else None,
            "avg_hr": round(avg_hr) if avg_hr else None,
            "garmin_activity_id": activity_id,
            "activity_metrics": metrics or None,
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
            "already_imported": skipped, "detail_calls": detail_calls}


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
