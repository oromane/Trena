"""Agrégats du dashboard.

- POST /dashboard/summary  : vue course détaillée (Banister, allures, calendrier).
- POST /dashboard/overview : vue d'accueil multi-disciplines (totaux, flux,
  tuiles par sport). Volontairement sans modèle de charge : c'est un hub de
  navigation et de suivi, pas un outil d'analyse.

Un seul appel serveur-à-serveur depuis Next.js — évite 6 allers-retours.
"""
from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..config import settings
from ..db.repo import SupabaseRepo, get_repo
from ..engine import banister, calibration, foster, hrv, insights, paces, workout
from ..security import require_internal_key

router = APIRouter(prefix="/dashboard", tags=["dashboard"],
                   dependencies=[Depends(require_internal_key)])

PAST_DAYS = 56          # fenêtre d'historique de la trajectoire
FUTURE_DAYS_CAP = 112   # projection max

class SummaryRequest(BaseModel):
    user_id: str
    date: date_type | None = None

class OverviewRequest(BaseModel):
    user_id: str
    date: date_type | None = None

# Disciplines connues. Les valeurs inconnues sont renvoyées telles quelles
# plutôt que masquées : mieux vaut un libellé brut qu'une séance invisible.
DISCIPLINES: dict[str, dict] = {
    "RUN": {"label": "Course à pied", "icon": "run", "accent": "green"},
    "STRENGTH": {"label": "Musculation", "icon": "strength", "accent": "violet"},
    "BIKE": {"label": "Vélo", "icon": "bike", "accent": "blue"},
    "SWIM": {"label": "Natation", "icon": "swim", "accent": "blue"},
    "TRIATHLON": {"label": "Triathlon", "icon": "triathlon", "accent": "orange"},
    "OTHER": {"label": "Autre", "icon": "other", "accent": "gray"},
}

OVERVIEW_HISTORY_DAYS = 120  # couvre le mois courant, les totaux et la série
RECENT_FEED_SIZE = 15

def _metric_block(today_val, series: list[float]) -> dict | None:
    if today_val is None and not series:
        return None
    baseline = sum(series) / len(series) if series else None
    delta_pct = (
        round((today_val - baseline) / baseline * 100, 1)
        if today_val is not None and baseline
        else None
    )
    return {
        "today": today_val,
        "baseline": round(baseline, 1) if baseline is not None else None,
        "delta_pct": delta_pct,
    }

def _physio_readiness(repo: SupabaseRepo, user_id: str,
                      today: date_type) -> dict:
    """Métriques physiologiques du jour + niveau de readiness.

    Partagé par /summary et /overview : les seuils HRV et le libellé associé
    doivent rester strictement identiques entre les deux vues, sinon
    l'accueil et le détail course peuvent afficher des états contradictoires.
    """
    metrics = repo.get_metrics_history(user_id, days=28, until=today)
    today_row = next(
        (m for m in metrics if m["recorded_date"] == today.isoformat()), {}
    )
    hist = [m for m in metrics if m["recorded_date"] != today.isoformat()]
    hrv_hist = [m["hrv_ms"] for m in hist if m.get("hrv_ms") is not None]
    sleep_hist = [m["sleep_minutes"] for m in hist
                  if m.get("sleep_minutes") is not None]
    rhr_hist = [m["resting_heart_rate"] for m in hist
                if m.get("resting_heart_rate") is not None]
    stress_hist = [m["stress_score"] for m in hist
                   if m.get("stress_score") is not None]

    physio = {
        "hrv": _metric_block(today_row.get("hrv_ms"), hrv_hist),
        "sleep": _metric_block(today_row.get("sleep_minutes"), sleep_hist),
        "resting_hr": _metric_block(today_row.get("resting_heart_rate"), rhr_hist),
        "stress": _metric_block(today_row.get("stress_score"), stress_hist),
    }

    level_str = "NORMAL"
    z: float | None = None
    detail = "Données HRV insuffisantes : planning maintenu."
    if today_row.get("hrv_ms") is not None and len(hrv_hist) >= 7:
        level, z_val = hrv.assess_readiness(
            hrv_hist, today_row["hrv_ms"],
            sleep_hist or [420.0], today_row.get("sleep_minutes") or 420.0,
            caution_z=settings.hrv_caution_z,
            critical_z=settings.hrv_critical_z,
            sleep_deficit_threshold=settings.sleep_deficit_minutes,
        )
        level_str, z = level.value, round(z_val, 2)
        detail = {
            "NORMAL": "HRV dans ta norme : séance prévue maintenue.",
            "CAUTION": "HRV sous ta norme : intensité plafonnée aujourd'hui.",
            "REDUCE": "HRV effondré + dette de sommeil : bascule en basse intensité.",
        }[level_str]

    return {
        "metrics": metrics,
        "today_row": today_row,
        "hrv_hist": hrv_hist,
        "sleep_hist": sleep_hist,
        "physio": physio,
        "readiness": {"level": level_str, "hrv_zscore": z, "detail": detail},
        "last_metric_date": max(
            (m["recorded_date"] for m in metrics), default=None
        ),
    }

def _session_comparison(s: dict, paces_payload: dict | None) -> dict | None:
    """Écart prévu/réalisé enrichi : allure et FC, pas seulement le TRIMP."""
    if s.get("status") != "COMPLETED":
        return None
    dist = s.get("distance_m")
    dur = s.get("duration_actual_minutes")
    comp: dict = {}

    # Allure réelle vs allure cible de la zone dominante de la séance.
    if dist and dur and dist > 0:
        actual_pace = (dur * 60.0) / (dist / 1000.0)
        comp["actual_pace_s_per_km"] = round(actual_pace, 1)
        comp["actual_pace"] = paces.format_pace(actual_pace)
        if paces_payload:
            z = paces.session_zone(s["session_type"])
            target = next((p["pace_s_per_km"] for p in paces_payload["zones"]
                           if p["zone"] == z), None)
            if target:
                comp["target_pace_s_per_km"] = target
                comp["target_pace"] = paces.format_pace(target)
                comp["pace_delta_s"] = round(actual_pace - target, 1)

    # TRIMP prévu/réalisé.
    if s.get("trimp_actual") is not None and s.get("intensity_target_trimp"):
        comp["target_trimp"] = s["intensity_target_trimp"]
        comp["actual_trimp"] = s["trimp_actual"]
        comp["trimp_delta"] = s["trimp_actual"] - s["intensity_target_trimp"]

    # FC moyenne réelle.
    if s.get("avg_hr"):
        comp["avg_hr"] = s["avg_hr"]

    return comp or None

# Checklist d'affûtage de la semaine de course (J-7 → J-0).
_RACE_WEEK_CHECKLIST = [
    {"days_before": 7, "label": "Réduire le volume de 40-50 %, garder un peu d'intensité courte pour rester affûté."},
    {"days_before": 4, "label": "Dernière séance qualité légère (quelques accélérations à l'allure course)."},
    {"days_before": 3, "label": "Augmenter progressivement les glucides (recharge), soigner l'hydratation."},
    {"days_before": 2, "label": "Repos ou footing très court. Préparer dossard, chaussures, tenue, ravitaillement."},
    {"days_before": 1, "label": "Repos complet ou 15-20 min relâché. Repas connu, coucher tôt, réveil calé."},
    {"days_before": 0, "label": "Petit-déjeuner testé 3h avant, échauffement progressif, partir à l'allure cible — pas plus vite."},
]

def _race_week_block(obj_block: dict | None, paces_payload: dict | None) -> dict | None:
    """Bloc « mode course » activé dans les 7 derniers jours avant l'objectif."""
    if not obj_block:
        return None
    dr = obj_block.get("days_remaining")
    if dr is None or not 0 <= dr <= 7:
        return None
    return {
        "days_remaining": dr,
        "title": obj_block["title"],
        "target_date": obj_block["target_date"],
        "race_pace": (paces_payload or {}).get("race"),
        "checklist": [
            {**item, "done_window": item["days_before"] >= dr}
            for item in _RACE_WEEK_CHECKLIST
        ],
        "reminders": {
            "nutrition": "Recharge glucidique J-3 → J-1, rien de nouveau le jour J.",
            "sommeil": "Le sommeil J-2 compte plus que celui de la veille : couche-toi tôt dès J-3.",
            "hydratation": "Bois régulièrement, urines claires. Électrolytes si chaleur.",
        },
    }

@router.post("/overview")
def overview(req: OverviewRequest,
             repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Accueil multi-disciplines : état du jour, totaux, tuiles, flux.

    Toutes les activités proviennent de la synchronisation Garmin : rien
    n'est saisi à la main et aucun plan n'est généré. La fenêtre s'arrête
    donc à aujourd'hui, il n'y a pas de séance future à remonter.
    """
    today = req.date or date_type.today()

    pr = _physio_readiness(repo, req.user_id, today)

    sessions = repo.get_sessions_between(
        req.user_id,
        today - timedelta(days=OVERVIEW_HISTORY_DAYS),
        today,
    )

    def s_date(s: dict) -> date_type:
        return date_type.fromisoformat(s["scheduled_date"])

    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    week_totals, month_totals = _empty_totals(), _empty_totals()
    by_discipline: dict[str, dict] = {}
    completed_dates: set[date_type] = set()

    for s in sessions:
        if s.get("status") != "COMPLETED":
            continue
        d = s_date(s)
        if d > today:
            continue
        completed_dates.add(d)

        if d >= month_start:
            _accumulate(month_totals, s)
            meta = _discipline_meta(s.get("discipline"))
            bucket = by_discipline.setdefault(
                meta["discipline"], {**meta, **_empty_totals()}
            )
            _accumulate(bucket, s)
        if d >= week_start:
            _accumulate(week_totals, s)

    # Flux : les dernières séances réalisées, toutes disciplines confondues.
    recent = sorted(
        (s for s in sessions
         if s.get("status") == "COMPLETED" and s_date(s) <= today),
        key=lambda s: s["scheduled_date"], reverse=True,
    )[:RECENT_FEED_SIZE]

    week_days = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        day_sessions = [s for s in sessions if s["scheduled_date"] == d.isoformat()]
        week_days.append({
            "date": d.isoformat(),
            "is_today": d == today,
            "is_past": d < today,
            "planned": len(day_sessions),
            "completed": sum(1 for s in day_sessions if s["status"] == "COMPLETED"),
            "disciplines": sorted({
                _discipline_meta(s.get("discipline"))["discipline"]
                for s in day_sessions
            }),
        })

    tiles = sorted(
        by_discipline.values(),
        key=lambda t: (t["minutes"], t["sessions"]), reverse=True,
    )
    for t in tiles:
        t["tonnage_kg"] = round(t["tonnage_kg"], 1)
    month_totals["tonnage_kg"] = round(month_totals["tonnage_kg"], 1)
    week_totals["tonnage_kg"] = round(week_totals["tonnage_kg"], 1)

    return {
        "date": today.isoformat(),
        "readiness": pr["readiness"],
        "physio": pr["physio"],
        "last_metric_date": pr["last_metric_date"],
        "totals": {"week": week_totals, "month": month_totals},
        "by_discipline": tiles,
        "week": week_days,
        "recent": [_feed_entry(s) for s in recent],
        "streak_weeks": _week_streak(completed_dates, today),
        "active_days_28": len({d for d in completed_dates
                               if d > today - timedelta(days=28)}),
    }
