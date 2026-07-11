"""Fenêtre glissante + plan versionné — le différenciateur (spec Notion §4).

Le plan complet vit dans `training_sessions` (visible dans l'app). Seuls les
7-14 prochains jours sont MATÉRIALISÉS sur la montre. Un replan :

    1. ouvre une `plan_revision` (trigger + rationale + metrics_snapshot),
    2. réconcilie la fenêtre : retract Garmin des liens existants dans la
       fenêtre, puis push des séances planifiées, en enregistrant
       `session_garmin_link` (idempotent — rejouable sans décharge).

Un seul writer vers Garmin : le `GarminClient` injecté. Testable hors ligne
avec un repo et un client factices.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

logger = logging.getLogger(__name__)

# Statuts de séance encore matérialisables (pas déjà faites/manquées).
_PUSHABLE = {"PLANNED", "MODIFIED"}


def _swallow(fn) -> None:
    """Teardown best-effort : un 404 Garmin (déjà supprimé) ne doit pas crasher."""
    try:
        fn()
    except Exception:
        logger.warning("garmin teardown best-effort a échoué", exc_info=True)


def reconcile_window(repo, client, user_id: str, revision: int,
                     window_days: int = 14, today: date | None = None) -> dict:
    """Retract la fenêtre existante puis push les séances planifiées.

    Idempotent : rejoué, il retombe sur le même état (pas de doublons).
    """
    from ..engine.garmin_workout import from_session

    today = today or date.today()
    end = today + timedelta(days=window_days)

    # 1. retract de tout ce qui est déjà sur la montre dans la fenêtre.
    retracted = 0
    for link in repo.get_links_in_window(user_id, today, end):
        sid = link.get("garmin_scheduled_id")
        wid = link.get("garmin_workout_id")
        if sid is not None:
            _swallow(lambda sid=sid: client.unschedule_workout(sid))
        if wid is not None:
            _swallow(lambda wid=wid: client.delete_workout(wid))
        repo.delete_session_link(link["session_id"])
        retracted += 1

    # 2. push des séances planifiées de la fenêtre.
    pushed = 0
    for s in repo.get_sessions_between(user_id, today, end):
        if s.get("status") not in _PUSHABLE:
            continue
        payload = from_session(
            s.get("session_type", "ENDURANCE"),
            s.get("duration_planned_minutes") or 40,
            name=s.get("title"),
        )
        workout_id = client.create_workout(payload)
        scheduled_id = client.schedule_workout(
            workout_id, date.fromisoformat(s["scheduled_date"]))
        repo.upsert_session_link(user_id, s["id"], workout_id, scheduled_id, revision)
        pushed += 1

    return {"retracted": retracted, "pushed": pushed,
            "window": [today.isoformat(), end.isoformat()]}


def run_replan(repo, client, user_id: str, *, trigger: str = "WEEKLY",
               rationale: str | None = None, metrics_snapshot: dict | None = None,
               window_days: int = 14, today: date | None = None) -> dict:
    """Ouvre une révision puis réconcilie la fenêtre glissante."""
    revision = repo.next_revision_number(user_id)
    if rationale is None:
        rationale = _default_rationale(trigger, metrics_snapshot or {})
    repo.insert_plan_revision(user_id, revision, trigger, rationale, metrics_snapshot)
    result = reconcile_window(repo, client, user_id, revision, window_days, today)
    result.update({"revision": revision, "trigger": trigger})
    logger.info("replan user=%s rev=%d +%d/-%d",
                user_id, revision, result["pushed"], result["retracted"])
    return result


def _default_rationale(trigger: str, snapshot: dict) -> str:
    """Placeholder déterministe. La couche LLM (plus tard) le remplace par de la
    prose ; le trigger + le snapshot restent la vérité machine."""
    bits = [f"Replan ({trigger})."]
    if snapshot.get("acwr") is not None:
        bits.append(f"ACWR={snapshot['acwr']}")
    if snapshot.get("tsb") is not None:
        bits.append(f"TSB={snapshot['tsb']}")
    return " ".join(bits)
