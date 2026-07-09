"""Agrégat unique pour le cockpit : GET-like POST /dashboard/summary.

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


@router.post("/summary")
def summary(req: SummaryRequest,
            repo: SupabaseRepo = Depends(get_repo)) -> dict:
    today = req.date or date_type.today()

    # ------------------------------------------------------------- objectif
    objective = repo.get_active_objective(req.user_id)
    obj_block = None
    target_date = None
    if objective:
        target_date = date_type.fromisoformat(objective["target_date"])
        obj_block = {
            "title": objective["title"],
            "sport_type": objective["sport_type"],
            "target_date": objective["target_date"],
            "target_time_seconds": objective.get("target_time_seconds"),
            "days_remaining": (target_date - today).days,
        }

    # Allures d'entraînement personnalisées (temps cible + distance).
    paces_payload = paces.training_paces(objective)

    # ------------------------------------------------------------- métriques
    metrics = repo.get_metrics_history(req.user_id, days=28, until=today)
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

    # ------------------------------------------------------------- readiness
    readiness_level = "NORMAL"
    z: float | None = None
    readiness_detail = "Données HRV insuffisantes : planning maintenu."
    if today_row.get("hrv_ms") is not None and len(hrv_hist) >= 7:
        level, z_val = hrv.assess_readiness(
            hrv_hist, today_row["hrv_ms"],
            sleep_hist or [420.0], today_row.get("sleep_minutes") or 420.0,
            caution_z=settings.hrv_caution_z,
            critical_z=settings.hrv_critical_z,
            sleep_deficit_threshold=settings.sleep_deficit_minutes,
        )
        readiness_level, z = level.value, round(z_val, 2)
        readiness_detail = {
            "NORMAL": "HRV dans ta norme : séance prévue maintenue.",
            "CAUTION": "HRV sous ta norme : intensité plafonnée aujourd'hui.",
            "REDUCE": "HRV effondré + dette de sommeil : bascule en basse intensité.",
        }[readiness_level]

    # -------------------------------------------------------------- séances
    horizon_end = min(
        target_date or (today + timedelta(days=FUTURE_DAYS_CAP)),
        today + timedelta(days=FUTURE_DAYS_CAP),
    )
    sessions = repo.get_sessions_between(
        req.user_id, today - timedelta(days=PAST_DAYS), horizon_end
    )

    def s_date(s: dict) -> date_type:
        return date_type.fromisoformat(s["scheduled_date"])

    today_session = next(
        (s for s in sessions if s["scheduled_date"] == today.isoformat()), None
    )

    # Adhérence 28 jours : séances passées (dues) vs réalisées
    due = [s for s in sessions
           if today - timedelta(days=28) <= s_date(s) < today]
    n_due = len(due)
    n_completed = sum(1 for s in due if s["status"] == "COMPLETED")

    # ------------------------------------------------------------ trajectoire
    start = today - timedelta(days=PAST_DAYS)
    n_past = PAST_DAYS + 1
    n_future = max(0, (horizon_end - today).days)  # objectif passé : pas de projection
    loads = [0.0] * (n_past + n_future)
    for s in sessions:
        idx = (s_date(s) - start).days
        if not 0 <= idx < len(loads):
            continue
        if s["status"] == "COMPLETED" and s.get("trimp_actual"):
            loads[idx] = float(s["trimp_actual"])
        elif s_date(s) >= today:
            loads[idx] = float(s["intensity_target_trimp"])

    # Paramètres calibrés individuellement si disponibles (migration 004)
    params = calibration.params_from_profile(
        repo.get_profile(req.user_id),
        banister.BanisterParams(
            tau1=settings.default_tau1, tau2=settings.default_tau2,
            k1=settings.default_k1, k2=settings.default_k2,
        ),
    )
    state = banister.simulate(loads, params)
    form_now = float(state.form[n_past - 1])
    trajectory = {
        "start_date": start.isoformat(),
        "today_index": n_past - 1,
        "fitness": [round(float(x), 1) for x in state.fitness],
        "fatigue": [round(float(x), 1) for x in state.fatigue],
        "form": [round(float(x), 1) for x in state.form],
        "loads": loads,
    }

    # ------------------------------------------------------------ probabilité
    prob = insights.success_probability(
        n_due, n_completed, form_now, readiness_level
    )
    # Gain (points de %) si la séance du jour est réalisée — approximation
    # adhérence uniquement, la fraîcheur étant recalculée demain.
    gain_if_completed = 0.0
    if today_session and today_session["status"] in ("PLANNED", "MODIFIED"):
        prob_if = insights.success_probability(
            n_due + 1, n_completed + 1, form_now, readiness_level
        )
        gain_if_completed = max(0.0, round((prob_if.value - prob.value) * 100, 1))

    # ------------------------------------------------------------ charge hebdo
    weekly: dict[str, dict] = {}
    for s in sessions:
        week_start = (s_date(s) - timedelta(days=s_date(s).weekday())).isoformat()
        w = weekly.setdefault(week_start, {
            "week_start": week_start,
            "planned_trimp": 0, "actual_trimp": 0,
            "planned_minutes": 0, "actual_minutes": 0,
        })
        w["planned_trimp"] += s["intensity_target_trimp"]
        w["planned_minutes"] += s["duration_planned_minutes"]
        if s["status"] == "COMPLETED":
            w["actual_trimp"] += s.get("trimp_actual") or 0
            w["actual_minutes"] += s.get("duration_actual_minutes") or 0
    weekly_load = sorted(weekly.values(), key=lambda w: w["week_start"])

    # -------------------------------------------------------------- insights
    this_week_start = today - timedelta(days=today.weekday())
    this_week_planned = sum(
        s["intensity_target_trimp"] for s in sessions
        if this_week_start <= s_date(s) < this_week_start + timedelta(days=7)
    )
    last_week_actual = sum(
        (s.get("trimp_actual") or 0) for s in sessions
        if s["status"] == "COMPLETED"
        and this_week_start - timedelta(days=7) <= s_date(s) < this_week_start
    )
    # Monotonie / contrainte de Foster sur les 7 derniers jours réalisés
    foster_result = foster.foster_metrics(loads[n_past - 7:n_past])

    insight_list = insights.generate_insights(
        hrv_series=hrv_hist + ([today_row["hrv_ms"]]
                               if today_row.get("hrv_ms") is not None else []),
        sleep_series=sleep_hist + ([today_row["sleep_minutes"]]
                                   if today_row.get("sleep_minutes") is not None else []),
        week_planned_trimp=float(this_week_planned),
        last_week_actual_trimp=float(last_week_actual),
        readiness=readiness_level,
        hrv_zscore=z,
        adherence=prob.adherence,
        foster_level=foster_result.level,
        foster_monotony=foster_result.monotony,
    )

    # ------------------------------------------------------------- historique
    past_sessions = sorted(
        (s for s in sessions if s_date(s) <= today),
        key=lambda s: s["scheduled_date"], reverse=True,
    )[:10]
    # Comparaison prévu/réalisé enrichie (allure + FC) sur chaque séance passée.
    past_sessions = [
        {**s, "comparison": _session_comparison(s, paces_payload)}
        for s in past_sessions
    ]

    # -------------------------------------------------------------- semaine
    week_days = []
    for i in range(7):
        d = this_week_start + timedelta(days=i)
        ss = [s for s in sessions if s["scheduled_date"] == d.isoformat()]
        week_days.append({
            "date": d.isoformat(),
            "is_today": d == today,
            "sessions": [{
                "id": s["id"], "session_type": s["session_type"],
                "duration_minutes": s["duration_planned_minutes"],
                "target_trimp": s["intensity_target_trimp"],
                "status": s["status"],
            } for s in ss],
        })

    # Déroulé de la séance du jour + allures cibles injectées.
    workout_payload = None
    if today_session:
        workout_payload = dict(
            today_session.get("structure")
            or workout.describe_session(
                today_session["session_type"],
                today_session["duration_planned_minutes"],
            )
        )
        if paces_payload:
            hint = paces.session_pace_hint(
                today_session["session_type"], objective)
            if hint:
                workout_payload["pace_hint"] = hint
            workout_payload["paces"] = paces_payload

    return {
        "date": today.isoformat(),
        "objective": obj_block,
        "paces": paces_payload,
        "race_week": _race_week_block(obj_block, paces_payload),
        "readiness": {
            "level": readiness_level,
            "hrv_zscore": z,
            "detail": readiness_detail,
        },
        "today_session": today_session,
        "workout": workout_payload,
        "physio": physio,
        "probability": {
            "value": prob.value,
            "adherence": prob.adherence,
            "form_score": prob.form_score,
            "readiness_factor": prob.readiness_factor,
            "explanation": prob.explanation,
            "gain_if_completed_pct": gain_if_completed,
        },
        "trajectory": trajectory,
        "foster": {
            "monotony": foster_result.monotony,
            "strain": foster_result.strain,
            "weekly_load": foster_result.weekly_load,
            "level": foster_result.level,
        },
        "weekly_load": weekly_load,
        "week": week_days,
        "history": past_sessions,
        "insights": [
            {"kind": i.kind, "severity": i.severity, "text": i.text}
            for i in insight_list
        ],
    }
