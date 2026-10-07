"""Analyse du jour : pré-générée à 6h, servie instantanément.

- summarize(ctx) : synthèse déterministe, instantanée, toujours disponible.
  Elle ne contient que des chiffres calculés par le moteur.
- generate(...)  : rédaction par le LLM (1 à 2 min sur CPU), lancée en tâche
  de fond par n8n à 6h puis stockée dans `advisor_daily`.
- get_or_summary : analyse LLM du jour si elle existe, sinon la synthèse.
"""
from __future__ import annotations

import json
import logging
from datetime import date

from ..config import settings
from ..db.repo import SupabaseRepo
from . import activity, llm
from .context import SYSTEM_RULES, build_context

log = logging.getLogger(__name__)

# Mêmes libellés que le bandeau d'accueil (HomeHero) : un seul vocabulaire.
LEVEL_LABEL = {"NORMAL": "Excellent", "CAUTION": "Vigilance", "REDUCE": "Récupération"}
LEVEL_ADVICE = {
    "NORMAL": "Tes signaux sont dans ta norme : la séance prévue peut être faite telle quelle.",
    "CAUTION": "Garde le volume mais plafonne l'intensité aujourd'hui : pas de fractionné dur.",
    "REDUCE": "Privilégie une séance facile en endurance fondamentale, ou du repos.",
}

DAILY_PROMPT = (
    "Rédige l'analyse du jour de l'utilisateur en 3 phrases courtes : "
    "1) son état de récupération avec les valeurs exactes du contexte, "
    "2) ce qui l'explique probablement, 3) un conseil concret pour aujourd'hui."
)


def _num(v: float | None, nd: int = 0) -> str:
    if v is None:
        return "?"
    s = f"{v:.{nd}f}"
    return s.replace(".", ",")


def _pct(v: float | None) -> str:
    if v is None:
        return ""
    return f"{'+' if v > 0 else ''}{_num(v)} %"


def summarize(ctx: dict) -> str:
    """Synthèse chiffrée, sans LLM. Chaque ligne est omise si la donnée manque."""
    lines: list[str] = []
    hrv = ctx.get("hrv_ms") or {}
    if hrv.get("aujourd_hui") is not None:
        line = f"HRV : {_num(hrv['aujourd_hui'])} ms"
        if hrv.get("norme_28j") is not None:
            line += f" pour une norme de {_num(hrv['norme_28j'])} ms ({_pct(hrv.get('ecart_pct'))})"
        z = (ctx.get("disponibilite") or {}).get("z_score_hrv")
        if z is not None:
            line += f", z-score {_num(z, 2)}"
        lines.append(line + ".")

    sleep = ctx.get("sommeil_heures") or {}
    if sleep.get("aujourd_hui") is not None:
        line = f"Sommeil : {_num(sleep['aujourd_hui'], 1)} h"
        if sleep.get("norme_28j") is not None:
            line += f" (norme {_num(sleep['norme_28j'], 1)} h)"
        lines.append(line + ".")

    rhr = ctx.get("fc_repos_bpm") or {}
    if rhr.get("aujourd_hui") is not None:
        line = f"FC de repos : {_num(rhr['aujourd_hui'])} bpm"
        if rhr.get("norme_28j") is not None:
            line += f" (norme {_num(rhr['norme_28j'])} bpm)"
        lines.append(line + ".")

    dispo = ctx.get("disponibilite") or {}
    level = dispo.get("niveau")
    if not lines:
        return ("Pas encore de données physiologiques pour aujourd'hui : "
                "synchronise ta montre depuis la page Profil.")
    out = "\n".join(f"- {l}" for l in lines)
    if level:
        out += f"\n\n**{LEVEL_LABEL.get(level, level)}** : {LEVEL_ADVICE.get(level, '')}".rstrip()
    return out


async def generate(repo: SupabaseRepo, user_id: str, day: date | None = None) -> dict:
    """Rédige et stocke l'analyse du jour. Lent : à appeler en tâche de fond."""
    day = day or date.today()
    ctx = build_context(repo, user_id, day)
    user_msg = (f"<donnees>\nCONTEXTE : {json.dumps(ctx, ensure_ascii=False)}\n</donnees>"
                f"\n\n{DAILY_PROMPT}")
    text = await llm.chat(SYSTEM_RULES, user_msg, timeout_s=600.0, max_tokens=220)
    row = repo.upsert_advisor_daily(user_id, day, text, settings.llm_model)
    return row or {"text": text}


async def run_all(repo: SupabaseRepo, day: date | None = None) -> dict:
    """Génère l'analyse pour chaque utilisateur actif, un par un (CPU partagé)."""
    day = day or date.today()
    done, failed = 0, 0
    commented = 0
    for uid in repo.list_users_with_recent_metrics():
        try:
            await generate(repo, uid, day)
            done += 1
        except Exception:
            failed += 1
            log.exception("advisor_daily: échec pour %s", uid)
        # Rattrapage : séances synchronisées sans passer par /garmin/sync.
        commented += (await activity.run_pending(repo, uid, day))["generated"]
    log.info("advisor_daily: %s générées, %s échecs, %s séances commentées",
             done, failed, commented)
    return {"generated": done, "failed": failed, "activities_commented": commented}


def get_or_summary(repo: SupabaseRepo, user_id: str, day: date | None = None) -> dict:
    """Analyse du jour pour l'affichage : LLM si prête, sinon synthèse."""
    day = day or date.today()
    try:
        row = repo.get_advisor_daily(user_id, day)
    except Exception:
        # Table absente (migration 013 non jouée) : on ne bloque pas l'affichage.
        log.warning("advisor_daily: lecture impossible", exc_info=True)
        row = None
    if row and row.get("text"):
        return {"date": day.isoformat(), "text": row["text"], "source": "llm",
                "generated_at": row.get("generated_at")}
    ctx = build_context(repo, user_id, day)
    return {"date": day.isoformat(), "text": summarize(ctx), "source": "summary",
            "generated_at": None}
