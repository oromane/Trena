"""Accès données via l'API PostgREST de Supabase (service_role).

Client httpx injectable — testable avec httpx.MockTransport, aucune
dépendance au SDK Supabase.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

import httpx


class SupabaseRepo:
    def __init__(self, url: str, service_role_key: str, client: httpx.Client | None = None):
        if client is not None:
            self._client = client
        else:
            if not url or not service_role_key:
                raise ValueError("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis")
            self._client = httpx.Client(
                base_url=f"{url}/rest/v1",
                headers={
                    "apikey": service_role_key,
                    "Authorization": f"Bearer {service_role_key}",
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )

    # ------------------------------------------------------------------ utils
    def _get(self, path: str, params: dict[str, Any]) -> list[dict]:
        r = self._client.get(path, params=params)
        r.raise_for_status()
        return r.json()

    def _post(self, path: str, json: Any, headers: dict | None = None) -> list[dict]:
        h = {"Prefer": "return=representation"}
        if headers:
            h.update(headers)
        r = self._client.post(path, json=json, headers=h)
        r.raise_for_status()
        return r.json()

    def _patch(self, path: str, params: dict, json: dict) -> list[dict]:
        r = self._client.patch(
            path, params=params, json=json, headers={"Prefer": "return=representation"}
        )
        r.raise_for_status()
        return r.json()

    # --------------------------------------------------------------- profiles
    def get_profile(self, user_id: str) -> dict | None:
        rows = self._get("/profiles", {"id": f"eq.{user_id}", "select": "*"})
        return rows[0] if rows else None

    def update_profile(self, user_id: str, fields: dict) -> dict | None:
        rows = self._patch("/profiles", {"id": f"eq.{user_id}"}, fields)
        return rows[0] if rows else None

    def list_active_user_ids(self) -> list[str]:
        rows = self._get(
            "/objectives", {"is_active": "eq.true", "select": "user_id"}
        )
        return sorted({r["user_id"] for r in rows})

    # ------------------------------------------------------------- objectives
    def get_active_objective(self, user_id: str) -> dict | None:
        """Prochaine course à venir (objectif actif le plus proche dans le futur).

        Bascule automatiquement sur la course suivante quand la précédente
        est passée : plus besoin de désactiver manuellement l'objectif.
        """
        rows = self._get(
            "/objectives",
            {
                "user_id": f"eq.{user_id}",
                "is_active": "eq.true",
                "target_date": f"gte.{date.today().isoformat()}",
                "select": "*",
                "order": "target_date.asc",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    def get_active_objectives(self, user_id: str) -> list[dict]:
        """Toutes les courses à venir (objectifs actifs), triées par date.

        Base du plan de saison enchaîné : un bloc périodisé par course.
        """
        return self._get(
            "/objectives",
            {
                "user_id": f"eq.{user_id}",
                "is_active": "eq.true",
                "target_date": f"gte.{date.today().isoformat()}",
                "select": "*",
                "order": "target_date.asc",
            },
        )

    # -------------------------------------------- bibliothèque de séances (test)
    def save_template(self, user_id: str, row: dict) -> dict | None:
        rows = self._post("/templates_seances",
                          [{**row, "user_id": user_id}],
                          headers={"Prefer": "return=representation"})
        return rows[0] if rows else None

    def list_library(self, user_id: str) -> list[dict]:
        return self._get(
            "/templates_seances",
            {"user_id": f"eq.{user_id}", "select": "*", "order": "created_at.desc"},
        )

    def get_template(self, user_id: str, template_id: str) -> dict | None:
        rows = self._get(
            "/templates_seances",
            {"user_id": f"eq.{user_id}", "id": f"eq.{template_id}", "select": "*"},
        )
        return rows[0] if rows else None

    def delete_template(self, user_id: str, template_id: str) -> None:
        r = self._client.delete(
            "/templates_seances",
            params={"id": f"eq.{template_id}", "user_id": f"eq.{user_id}"},
        )
        r.raise_for_status()

    # ----------------------------------------------------------- daily_metrics
    def upsert_daily_metrics(self, user_id: str, metrics: list[dict]) -> list[dict]:
        payload = [{**m, "user_id": user_id} for m in metrics]
        return self._post(
            "/daily_metrics?on_conflict=user_id,recorded_date",
            payload,
            headers={"Prefer": "return=representation,resolution=merge-duplicates"},
        )

    def get_metrics_history(self, user_id: str, days: int = 28,
                            until: date | None = None) -> list[dict]:
        until = until or date.today()
        since = until - timedelta(days=days)
        return self._get(
            "/daily_metrics",
            {
                "user_id": f"eq.{user_id}",
                "recorded_date": f"gte.{since.isoformat()}",
                "and": f"(recorded_date.lte.{until.isoformat()})",
                "select": "*",
                "order": "recorded_date.asc",
            },
        )

    # -------------------------------------------------------- training_sessions
    def insert_sessions(self, rows: list[dict]) -> list[dict]:
        return self._post("/training_sessions", rows)

    def get_session_for_date(self, user_id: str, day: date) -> dict | None:
        rows = self._get(
            "/training_sessions",
            {
                "user_id": f"eq.{user_id}",
                "scheduled_date": f"eq.{day.isoformat()}",
                "select": "*",
                "limit": "1",
            },
        )
        return rows[0] if rows else None

    def get_completed_loads(self, user_id: str, days: int = 90) -> list[dict]:
        since = (date.today() - timedelta(days=days)).isoformat()
        return self._get(
            "/training_sessions",
            {
                "user_id": f"eq.{user_id}",
                "status": "eq.COMPLETED",
                "scheduled_date": f"gte.{since}",
                "select": "scheduled_date,trimp_actual",
                "order": "scheduled_date.asc",
            },
        )

    def get_sessions_between(self, user_id: str, start: date, end: date) -> list[dict]:
        return self._get(
            "/training_sessions",
            {
                "user_id": f"eq.{user_id}",
                "scheduled_date": f"gte.{start.isoformat()}",
                "and": f"(scheduled_date.lte.{end.isoformat()})",
                "select": "*",
                "order": "scheduled_date.asc",
            },
        )

    def update_session(self, session_id: str, fields: dict) -> dict | None:
        rows = self._patch("/training_sessions", {"id": f"eq.{session_id}"}, fields)
        return rows[0] if rows else None

    def get_session(self, session_id: str, user_id: str) -> dict | None:
        rows = self._get(
            "/training_sessions",
            {"id": f"eq.{session_id}", "user_id": f"eq.{user_id}",
             "select": "*", "limit": "1"},
        )
        return rows[0] if rows else None

    def delete_session(self, session_id: str, user_id: str) -> None:
        r = self._client.delete(
            "/training_sessions",
            params={"id": f"eq.{session_id}", "user_id": f"eq.{user_id}"},
        )
        r.raise_for_status()

    def clear_calendar_event_ids(self, user_id: str) -> None:
        r = self._client.patch(
            "/training_sessions",
            params={"user_id": f"eq.{user_id}",
                    "calendar_event_id": "not.is.null"},
            json={"calendar_event_id": None},
        )
        r.raise_for_status()

    def delete_planned_sessions(self, user_id: str, from_date: date) -> None:
        r = self._client.delete(
            "/training_sessions",
            params={
                "user_id": f"eq.{user_id}",
                "status": "eq.PLANNED",
                "scheduled_date": f"gte.{from_date.isoformat()}",
            },
        )
        r.raise_for_status()

    def get_session_by_activity(self, user_id: str,
                                activity_id: str) -> dict | None:
        rows = self._get(
            "/training_sessions",
            {"user_id": f"eq.{user_id}",
             "garmin_activity_id": f"eq.{activity_id}",
             "select": "id", "limit": "1"},
        )
        return rows[0] if rows else None

    # ---------------------------------------------------------- garmin_wellness
    def upsert_wellness(self, user_id: str, rows: list[dict]) -> list[dict]:
        payload = [{**r, "user_id": user_id} for r in rows]
        return self._post(
            "/garmin_wellness?on_conflict=user_id,recorded_date",
            payload,
            headers={"Prefer": "return=representation,resolution=merge-duplicates"},
        )

    def get_wellness_history(self, user_id: str, days: int = 90) -> list[dict]:
        since = (date.today() - timedelta(days=days)).isoformat()
        return self._get(
            "/garmin_wellness",
            {"user_id": f"eq.{user_id}",
             "recorded_date": f"gte.{since}",
             "select": "*", "order": "recorded_date.asc"},
        )

    # ------------------------------------------------------------ oauth_tokens
    def get_oauth_token(self, user_id: str, provider: str) -> dict | None:
        rows = self._get(
            "/oauth_tokens",
            {"user_id": f"eq.{user_id}", "provider": f"eq.{provider}", "select": "*"},
        )
        return rows[0] if rows else None

    def upsert_oauth_token(self, row: dict) -> dict | None:
        rows = self._post(
            "/oauth_tokens?on_conflict=user_id,provider",
            [row],
            headers={"Prefer": "return=representation,resolution=merge-duplicates"},
        )
        return rows[0] if rows else None

    def delete_oauth_token(self, user_id: str, provider: str) -> None:
        r = self._client.delete(
            "/oauth_tokens",
            params={"user_id": f"eq.{user_id}", "provider": f"eq.{provider}"},
        )
        r.raise_for_status()


# Singleton paresseux, remplaçable dans les tests via dependency_overrides
_repo: SupabaseRepo | None = None


def get_repo() -> SupabaseRepo:
    global _repo
    if _repo is None:
        from ..config import settings
        _repo = SupabaseRepo(settings.supabase_url, settings.supabase_service_role_key)
    return _repo
