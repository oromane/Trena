"""Commentaire de Perlo sur chaque séance (type Strava), généré en tâche de fond.

Le LLM met 30 s à 1 min par séance sur le CPU du VPS : on ne le fait jamais
à l'affichage. Il est lancé après chaque synchro Garmin et dans le run de
6h30, uniquement pour les séances récentes qui n'ont pas encore de
commentaire. L'affichage, lui, montre toujours l'analyse chiffrée
instantanée (engine/activity_compare.py), complétée par le commentaire
quand il existe.
"""
from __future__ import annotations

import json
import logging
from datetime import date, timedelta

from ..config import settings
from ..db.repo import SupabaseRepo
from ..engine.activity_compare import HISTORY_DAYS, analyze, history_for
from . import llm
from .context import SYSTEM_RULES

log = logging.getLogger(__name__)

PENDING_DAYS = 3        # séances des 3 derniers jours seulement
MAX_PER_RUN = 5         # borne le temps CPU d'un run (≈ 5 min max)

PROMPT = (
    "Commente cette séance comme un coach, en 2 phrases courtes : ce qui "
    "ressort (appuie-toi sur les FAITS, valeurs exactes), puis un conseil "
    "pour la prochaine séance. Pas de liste, pas de titre."
)

_KEEP_METRICS = ("avg_pace_s_per_km", "gap_pace_s_per_km", "elevation_gain_m",
                 "max_hr", "hr_time_in_zone_s", "training_effect_aerobic",
                 "training_effect_anaerobic", "avg_cadence_spm")


def _session_payload(s: dict) -> dict:
    m = s.get("activity_metrics") if isinstance(s.get("activity_metrics"), dict) else {}
    return {
        "date": s.get("scheduled_date"),
        "discipline": s.get("discipline"),
        "titre": s.get("title"),
        "duree_min": s.get("duration_actual_minutes"),
        "distance_m": s.get("distance_m"),
        "fc_moyenne": s.get("avg_hr"),
        "trimp": s.get("trimp_actual"),
        **{k: m[k] for k in _KEEP_METRICS if k in m},
    }


async def comment(session: dict, history: list[dict]) -> str:
    a = analyze(session, history)
    data = {"seance": _session_payload(session), "analyse": a.headline, "faits": a.facts}
    user_msg = (f"<donnees>\n{json.dumps(data, ensure_ascii=False)}\n</donnees>\n\n{PROMPT}")
    return await llm.chat(SYSTEM_RULES, user_msg, timeout_s=300.0, max_tokens=140)


async def run_pending(repo: SupabaseRepo, user_id: str,
                      today: date | None = None) -> dict:
    """Commente les séances récentes sans commentaire. Idempotent."""
    today = today or date.today()
    try:
        sessions = repo.get_sessions_between(
            user_id, today - timedelta(days=HISTORY_DAYS + PENDING_DAYS), today)
        recent = [s for s in sessions
                  if s.get("status") == "COMPLETED"
                  and s["scheduled_date"] >= (today - timedelta(days=PENDING_DAYS)).isoformat()]
        if not recent:
            return {"generated": 0, "failed": 0}
        existing = repo.get_activity_insights(user_id, [s["id"] for s in recent])
    except Exception:
        # Table absente (migration 014 non jouée) ou base indisponible.
        log.warning("activity_insights: lecture impossible", exc_info=True)
        return {"generated": 0, "failed": 0}

    todo = [s for s in sorted(recent, key=lambda s: s["scheduled_date"], reverse=True)
            if s["id"] not in existing][:MAX_PER_RUN]
    done = failed = 0
    for s in todo:
        try:
            text = await comment(s, history_for(s, sessions))
            repo.upsert_activity_insight(s["id"], user_id, text, settings.llm_model)
            done += 1
        except Exception:
            failed += 1
            log.exception("activity_insights: échec pour la séance %s", s.get("id"))
    if done or failed:
        log.info("activity_insights: %s commentées, %s échecs", done, failed)
    return {"generated": done, "failed": failed}
