"""Accès données via l'API PostgREST de Supabase (service_role).

Client httpx injectable — testable avec httpx.MockTransport, aucune
dépendance au SDK Supabase.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import httpx

logger = logging.getLogger(__name__)


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
    def _raise(self, r: httpx.Response, path: str) -> None:
        """Lève une erreur INCLUANT le corps de la réponse PostgREST (le
        message d'erreur Supabase, ex. PGRST102), et le loggue."""
        if r.is_success:
            return
        body = r.text[:600]
        logger.error("supabase_error", extra={"method": r.request.method,
                                               "path": path, "status": r.status_code,
                                               "body": body})
        raise httpx.HTTPStatusError(
            f"Supabase {r.status_code} {path}: {body}",
            request=r.request, response=r,
        )

    def _get(self, path: str, params: dict[str, Any]) -> list[dict]:
        r = self._client.get(path, params=params)
        self._raise(r, path)
        return r.json()

    def _post(self, path: str, json: Any, headers: dict | None = None) -> list[dict]:
        h = {"Prefer": "return=representation"}
        if headers:
            h.update(headers)
        r = self._client.post(path, json=json, headers=h)
        self._raise(r, path)
        return r.json()

    def _patch(self, path: str, params: dict, json: dict) -> list[dict]:
        r = self._client.patch(
            path, params=params, json=json, headers={"Prefer": "return=representation"}
        )
        self._raise(r, path)
        return r.json()

    # --------------------------------------------------------------- profiles
    def get_profile(self, user_id: str) -> dict | None:
        rows = self._get("/profiles", {"id": f"eq.{user_id}", "select": "*"})
        return rows[0] if rows else None

    def update_profile(self, user_id: str, fields: dict) -> dict | None:
        rows = self._patch("/profiles", {"id": f"eq.{user_id}"}, fields)
        return rows[0] if rows else None

    def create_profile(self, user_id: str) -> dict | None:
        """Profil par défaut ; sans effet s'il existe déjà (idempotent)."""
        rows = self._post(
            "/profiles?on_conflict=id",
            {"id": user_id, "weekly_availability_mask": [60, 60, 60, 60, 60, 120, 120]},
            headers={"Prefer": "return=representation,resolution=ignore-duplicates"},
        )
        return rows[0] if rows else None

    EXPORT_PAGE = 1000   # = plafond max_rows par défaut de Supabase

    def export_table(self, table: str, user_id: str, order: str,
                     user_col: str = "user_id") -> list[dict]:
        """Toutes les lignes d'un utilisateur (export RGPD).

        Paginé : Supabase tronque silencieusement au-delà de max_rows (1 000
        par défaut), ce qui couperait l'historique sans erreur visible.
        """
        out: list[dict] = []
        offset = 0
        while True:
            page = self._get(f"/{table}", {user_col: f"eq.{user_id}", "select": "*",
                                           "order": f"{order},id.asc",
                                           "limit": str(self.EXPORT_PAGE),
                                           "offset": str(offset)})
            out.extend(page)
            if len(page) < self.EXPORT_PAGE:
                return out
            offset += self.EXPORT_PAGE

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

    # ----------------------------------------------------------- sync_runs
    def insert_sync_run(self, user_id: str, row: dict) -> None:
        """Enregistre le résultat d'une synchro (best-effort, mais loggué)."""
        try:
            self._post("/sync_runs", [{**row, "user_id": user_id}])
        except Exception:
            logger.exception("sync_run insert failed")

    def get_last_sync_run(self, user_id: str, provider: str = "garmin") -> dict | None:
        rows = self._get("/sync_runs", {
            "user_id": f"eq.{user_id}", "provider": f"eq.{provider}",
            "select": "*", "order": "created_at.desc", "limit": "1",
        })
        return rows[0] if rows else None

    def start_sync_run(self, user_id: str, provider: str = "garmin") -> str | None:
        """Ouvre un run en statut 'running' et retourne son id (best-effort)."""
        try:
            rows = self._post("/sync_runs", [{
                "user_id": user_id, "provider": provider, "status": "running",
            }])
            return rows[0]["id"] if rows else None
        except Exception:
            logger.exception("start_sync_run failed")
            return None

    def finish_sync_run(self, sync_run_id: str | None, fields: dict) -> None:
        """Clôture un run (statut + volumes + erreurs). Best-effort, loggué."""
        if not sync_run_id:
            return
        try:
            self._patch("/sync_runs", {"id": f"eq.{sync_run_id}"}, fields)
        except Exception:
            logger.exception("finish_sync_run failed")

    # ----------------------------------------------------------- daily_metrics
    def upsert_daily_metrics(self, user_id: str, metrics: list[dict]) -> list[dict]:
        if not metrics:
            return []
        # PostgREST exige des clés identiques sur toutes les lignes d'un upsert
        # groupé (PGRST102) : on complète les clés manquantes avec None.
        all_keys: set[str] = set()
        for m in metrics:
            all_keys.update(m.keys())
        base = {k: None for k in all_keys}
        payload = [{**base, **m, "user_id": user_id} for m in metrics]
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

    def list_sessions_by_discipline(self, user_id: str, discipline: str,
                                    since: date | None = None,
                                    limit: int = 50) -> list[dict]:
        """Séances d'une discipline, les plus récentes d'abord."""
        params: dict[str, Any] = {
            "user_id": f"eq.{user_id}",
            "discipline": f"eq.{discipline}",
            "select": "*",
            "order": "scheduled_date.desc",
            "limit": str(limit),
        }
        if since is not None:
            params["scheduled_date"] = f"gte.{since.isoformat()}"
        return self._get("/training_sessions", params)

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
        if not rows:
            return []
        # Clés identiques requises sur toutes les lignes (PGRST102).
        all_keys: set[str] = set()
        for r in rows:
            all_keys.update(r.keys())
        base = {k: None for k in all_keys}
        payload = [{**base, **r, "user_id": user_id} for r in rows]
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

    # ------------------------------------------------------- plan_revisions
    def next_revision_number(self, user_id: str) -> int:
        rows = self._get("/plan_revisions", {
            "user_id": f"eq.{user_id}", "select": "revision",
            "order": "revision.desc", "limit": "1",
        })
        return (rows[0]["revision"] + 1) if rows else 1

    def insert_plan_revision(self, user_id: str, revision: int, trigger: str,
                             rationale: str | None, metrics_snapshot: dict | None) -> dict | None:
        rows = self._post("/plan_revisions", [{
            "user_id": user_id, "revision": revision, "trigger": trigger,
            "rationale": rationale, "metrics_snapshot": metrics_snapshot,
        }])
        return rows[0] if rows else None

    def list_plan_revisions(self, user_id: str, limit: int = 20) -> list[dict]:
        return self._get("/plan_revisions", {
            "user_id": f"eq.{user_id}", "select": "*",
            "order": "revision.desc", "limit": str(limit),
        })

    # --------------------------------------------------- session_garmin_link
    def upsert_session_link(self, user_id: str, session_id: str,
                            garmin_workout_id: int, garmin_scheduled_id: int | None,
                            plan_revision: int) -> dict | None:
        rows = self._post(
            "/session_garmin_link?on_conflict=session_id",
            [{
                "session_id": session_id, "user_id": user_id,
                "garmin_workout_id": garmin_workout_id,
                "garmin_scheduled_id": garmin_scheduled_id,
                "plan_revision": plan_revision,
            }],
            headers={"Prefer": "return=representation,resolution=merge-duplicates"},
        )
        return rows[0] if rows else None

    def get_links_in_window(self, user_id: str, start: date, end: date) -> list[dict]:
        """Liens Garmin dont la séance tombe dans [start, end] — via embed PostgREST.

        Requiert une clé étrangère session_garmin_link.session_id ->
        training_sessions.id (posée par migration-011).
        """
        rows = self._get("/session_garmin_link", {
            "user_id": f"eq.{user_id}",
            "select": "*,training_sessions!inner(scheduled_date)",
            "training_sessions.scheduled_date": f"gte.{start.isoformat()}",
            "and": f"(training_sessions.scheduled_date.lte.{end.isoformat()})",
        })
        return rows

    def delete_session_link(self, session_id: str) -> None:
        r = self._client.delete(
            "/session_garmin_link", params={"session_id": f"eq.{session_id}"},
        )
        r.raise_for_status()

    # ---------------------------------------------------------------- advisor
    def list_users_with_recent_metrics(self, days: int = 3) -> list[str]:
        """Utilisateurs synchronisés récemment : cible de l'analyse du jour.

        Volontairement indépendant des objectifs : le site ne planifie plus,
        un utilisateur sans objectif doit quand même recevoir son analyse.
        """
        since = (date.today() - timedelta(days=days)).isoformat()
        rows = self._get("/daily_metrics",
                         {"recorded_date": f"gte.{since}", "select": "user_id"})
        return sorted({r["user_id"] for r in rows})

    def get_advisor_daily(self, user_id: str, day: date) -> dict | None:
        rows = self._get("/advisor_daily", {
            "user_id": f"eq.{user_id}", "day": f"eq.{day.isoformat()}",
            "select": "*", "limit": "1",
        })
        return rows[0] if rows else None

    def upsert_advisor_daily(self, user_id: str, day: date, text: str,
                             model: str) -> dict | None:
        rows = self._post(
            "/advisor_daily?on_conflict=user_id,day",
            {"user_id": user_id, "day": day.isoformat(), "text": text, "model": model},
            headers={"Prefer": "return=representation,resolution=merge-duplicates"},
        )
        return rows[0] if rows else None

    def get_activity_insights(self, user_id: str, session_ids: list[str]) -> dict[str, dict]:
        """Commentaires existants, indexés par session_id (une seule requête)."""
        if not session_ids:
            return {}
        rows = self._get("/activity_insights", {
            "user_id": f"eq.{user_id}",
            "session_id": f"in.({','.join(session_ids)})",
            "select": "session_id,text,generated_at",
        })
        return {r["session_id"]: r for r in rows}

    def upsert_activity_insight(self, session_id: str, user_id: str, text: str,
                                model: str) -> dict | None:
        rows = self._post(
            "/activity_insights?on_conflict=session_id",
            {"session_id": session_id, "user_id": user_id, "text": text, "model": model},
            headers={"Prefer": "return=representation,resolution=merge-duplicates"},
        )
        return rows[0] if rows else None

    # ----------------------------------------------------------------- social
    def get_profile_by_code(self, code: str) -> dict | None:
        rows = self._get("/profiles", {"friend_code": f"eq.{code}",
                                       "select": "id,full_name", "limit": "1"})
        return rows[0] if rows else None

    def get_profiles(self, ids: list[str]) -> dict[str, dict]:
        if not ids:
            return {}
        rows = self._get("/profiles", {
            "id": f"in.({','.join(ids)})",
            "select": "id,full_name,share_activities,share_physio",
        })
        return {r["id"]: r for r in rows}

    def list_friendships(self, user_id: str) -> list[dict]:
        return self._get("/friendships", {
            "or": f"(requester_id.eq.{user_id},addressee_id.eq.{user_id})",
            "select": "*", "order": "created_at.desc",
        })

    def insert_friendship(self, requester_id: str, addressee_id: str) -> dict | None:
        rows = self._post("/friendships", {"requester_id": requester_id,
                                           "addressee_id": addressee_id})
        return rows[0] if rows else None

    def update_friendship(self, friendship_id: str, fields: dict) -> dict | None:
        rows = self._patch("/friendships", {"id": f"eq.{friendship_id}"}, fields)
        return rows[0] if rows else None

    def delete_friendship(self, friendship_id: str) -> None:
        r = self._client.delete("/friendships", params={"id": f"eq.{friendship_id}"})
        self._raise(r, "/friendships")


# Singleton paresseux, remplaçable dans les tests via dependency_overrides
_repo: SupabaseRepo | None = None


def get_repo() -> SupabaseRepo:
    global _repo
    if _repo is None:
        from ..config import settings
        _repo = SupabaseRepo(settings.supabase_url, settings.supabase_service_role_key)
    return _repo
