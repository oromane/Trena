"""Synchronisation Google Calendar (spec §7).

Client httpx injectable. Les tokens sont stockés chiffrés (Fernet) dans
`oauth_tokens` ; le refresh est automatique quand l'access token a expiré.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from urllib.parse import urlencode

import httpx

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
CAL_BASE = "https://www.googleapis.com/calendar/v3"

# Portée minimale : gestion des événements uniquement (pas de lecture du reste)
DEFAULT_SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


def build_authorize_url(client_id: str, redirect_uri: str, state: str,
                        scopes: list[str] | None = None) -> str:
    """URL de consentement Google OAuth2.

    access_type=offline + prompt=consent garantissent l'émission d'un
    refresh_token même si l'utilisateur a déjà consenti par le passé.
    """
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes or DEFAULT_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"

SESSION_LABELS = {
    "INTERVAL": "Fractionné",
    "TEMPO": "Tempo / Seuil",
    "ENDURANCE": "Endurance fondamentale",
    "RECOVERY": "Récupération active",
}

DEFAULT_START_HOUR = 18  # heure par défaut si aucune préférence


class GoogleCalendarClient:
    def __init__(self, client_id: str, client_secret: str,
                 http: httpx.Client | None = None):
        self._client_id = client_id
        self._client_secret = client_secret
        self._http = http or httpx.Client(timeout=15.0)

    # ------------------------------------------------------------------ OAuth
    def exchange_code(self, code: str, redirect_uri: str) -> dict:
        """Échange le code d'autorisation contre access + refresh tokens.

        Retourne {'access_token', 'refresh_token', 'expires_in', 'scope', ...}.
        """
        r = self._http.post(
            TOKEN_URL,
            data={
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        r.raise_for_status()
        return r.json()

    def refresh_access_token(self, refresh_token: str) -> dict:
        """Retourne {'access_token': ..., 'expires_in': ...}."""
        r = self._http.post(
            TOKEN_URL,
            data={
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        r.raise_for_status()
        return r.json()

    # ----------------------------------------------------------------- Events
    def _headers(self, access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}"}

    def create_event(self, access_token: str, event: dict,
                     calendar_id: str = "primary") -> dict:
        r = self._http.post(
            f"{CAL_BASE}/calendars/{calendar_id}/events",
            json=event,
            headers=self._headers(access_token),
        )
        r.raise_for_status()
        return r.json()

    def patch_event(self, access_token: str, event_id: str, fields: dict,
                    calendar_id: str = "primary") -> dict:
        r = self._http.patch(
            f"{CAL_BASE}/calendars/{calendar_id}/events/{event_id}",
            json=fields,
            headers=self._headers(access_token),
        )
        r.raise_for_status()
        return r.json()

    def delete_event(self, access_token: str, event_id: str,
                     calendar_id: str = "primary") -> None:
        r = self._http.delete(
            f"{CAL_BASE}/calendars/{calendar_id}/events/{event_id}",
            headers=self._headers(access_token),
        )
        if r.status_code not in (204, 404, 410):
            r.raise_for_status()

    def list_events(self, access_token: str, params: dict,
                    calendar_id: str = "primary") -> list[dict]:
        """Liste paginée des événements correspondant aux paramètres."""
        items: list[dict] = []
        page_token: str | None = None
        while True:
            p = {**params, "maxResults": 250, "singleEvents": "true"}
            if page_token:
                p["pageToken"] = page_token
            r = self._http.get(
                f"{CAL_BASE}/calendars/{calendar_id}/events",
                params=p, headers=self._headers(access_token),
            )
            r.raise_for_status()
            data = r.json()
            items.extend(data.get("items", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                return items

    def purge_trena_events(self, access_token: str, time_min: str,
                           time_max: str) -> int:
        """Supprime tous les événements créés par Trena dans la fenêtre.

        Deux passes : le marqueur extendedProperties (événements récents)
        et la recherche plein-texte (événements créés avant le marqueur).
        """
        window = {"timeMin": time_min, "timeMax": time_max}
        found: dict[str, dict] = {}
        for extra in (
            {"privateExtendedProperty": "trena=1"},
            {"q": "Adaptive Training System"},
            {"q": "Trena"},
        ):
            try:
                for ev in self.list_events(access_token, {**window, **extra}):
                    found[ev["id"]] = ev
            except httpx.HTTPStatusError:
                continue

        deleted = 0
        for ev_id, ev in found.items():
            marked = (ev.get("extendedProperties", {})
                      .get("private", {}).get("trena") == "1")
            text = f"{ev.get('summary', '')} {ev.get('description', '')}"
            if marked or "Adaptive Training System" in text or "Trena" in text:
                self.delete_event(access_token, ev_id)
                deleted += 1
        return deleted


def format_duration(minutes: int) -> str:
    """105 -> '1h45', 45 -> '45 min'."""
    if minutes >= 60:
        h, m = divmod(minutes, 60)
        return f"{h}h{m:02d}" if m else f"{h}h"
    return f"{minutes} min"


def session_to_event(
    session_type: str,
    duration_minutes: int,
    target_trimp: int,
    day: date,
    start_hour: int = DEFAULT_START_HOUR,
    tz: str = "Europe/Paris",
    start_time: time | None = None,
) -> dict:
    """Convertit une séance en événement Google Calendar."""
    start_dt = datetime.combine(day, start_time or time(hour=start_hour))
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    label = SESSION_LABELS.get(session_type, session_type)
    return {
        "summary": f"🏃 {label} · {format_duration(duration_minutes)}",
        "description": (
            f"Type : {label}\n"
            f"Durée : {format_duration(duration_minutes)}\n"
            f"Charge cible (TRIMP) : {target_trimp}\n"
            f"Généré par Trena"
        ),
        "start": {"dateTime": start_dt.isoformat(), "timeZone": tz},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": tz},
        "reminders": {"useDefault": True},
        "extendedProperties": {"private": {"trena": "1"}},
    }


def get_valid_access_token(repo, cipher, gcal: GoogleCalendarClient,
                           user_id: str) -> str | None:
    """Access token valide pour l'utilisateur, avec refresh + re-persistance."""
    row = repo.get_oauth_token(user_id, "google_calendar")
    if row is None:
        return None

    expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    if expires_at > datetime.now(timezone.utc) + timedelta(minutes=2):
        return cipher.decrypt(row["access_token_encrypted"])

    refresh_token = cipher.decrypt(row["refresh_token_encrypted"])
    fresh = gcal.refresh_access_token(refresh_token)
    new_expiry = datetime.now(timezone.utc) + timedelta(seconds=fresh.get("expires_in", 3600))
    repo.upsert_oauth_token({
        "user_id": user_id,
        "provider": "google_calendar",
        "access_token_encrypted": cipher.encrypt(fresh["access_token"]),
        "refresh_token_encrypted": row["refresh_token_encrypted"],
        "expires_at": new_expiry.isoformat(),
        "scopes": row.get("scopes", []),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return fresh["access_token"]
