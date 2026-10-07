"""Analyse chiffrée d'une séance : comparaison à tes habitudes (type Strava).

Instantanée et déterministe : aucune IA, uniquement des faits calculés sur
l'historique de la MÊME discipline (90 jours avant la séance). Sert :
  - à l'affichage immédiat dans le flux d'activités ;
  - de matière au commentaire rédigé par Perlo (LLM, en tâche de fond).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from statistics import median

HISTORY_DAYS = 90
MIN_HISTORY = 3          # en dessous : pas de comparaison à la médiane
PACE_SIG_S = 8           # écart d'allure significatif (s/km)
HR_SIG_BPM = 4           # écart de FC significatif
PCT_SIG = 0.15           # écart relatif significatif (distance, charge)
PACE_RECORD_MIN_M = 3000  # pas de « record d'allure » sur 800 m


@dataclass
class Analysis:
    headline: str
    facts: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)   # record, efficiency, easy, hard
    history_n: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


# ------------------------------------------------------------------ helpers
def _m(s: dict) -> dict:
    m = s.get("activity_metrics")
    return m if isinstance(m, dict) else {}


def _pace(s: dict) -> float | None:
    return _m(s).get("avg_pace_s_per_km")


def _dist(s: dict) -> float | None:
    return s.get("distance_m") or _m(s).get("distance_m")


def _minutes(s: dict) -> float | None:
    return s.get("duration_actual_minutes")


def _hr(s: dict) -> float | None:
    return s.get("avg_hr") or _m(s).get("avg_hr")


def _elev(s: dict) -> float | None:
    return _m(s).get("elevation_gain_m")


def _fmt_pace(sec: float) -> str:
    sec = round(sec)
    return f"{sec // 60}:{sec % 60:02d}/km"


def _fmt_km(m: float) -> str:
    return f"{m / 1000:.1f}".replace(".", ",") + " km"


def _pct(a: float, b: float) -> float:
    return (a - b) / b if b else 0.0


def _vals(sessions: list[dict], getter) -> list[float]:
    return [v for v in (getter(s) for s in sessions) if isinstance(v, (int, float)) and v > 0]


def history_for(session: dict, all_sessions: list[dict]) -> list[dict]:
    """Séances réalisées de la même discipline, 90 jours AVANT celle-ci."""
    d = date.fromisoformat(session["scheduled_date"])
    start = d - timedelta(days=HISTORY_DAYS)
    disc = (session.get("discipline") or "OTHER").upper()
    out = []
    for s in all_sessions:
        if s.get("id") == session.get("id") or s.get("status") != "COMPLETED":
            continue
        if (s.get("discipline") or "OTHER").upper() != disc:
            continue
        sd = date.fromisoformat(s["scheduled_date"])
        if start <= sd <= d and (sd < d or str(s.get("id")) < str(session.get("id"))):
            out.append(s)
    return out


# ------------------------------------------------------------------ analyse
def analyze(session: dict, history: list[dict]) -> Analysis:
    disc = (session.get("discipline") or "OTHER").upper()
    facts: list[str] = []
    tags: list[str] = []
    headline: str | None = None
    n = len(history)

    dist, pace, hr, elev = _dist(session), _pace(session), _hr(session), _elev(session)
    trimp = session.get("trimp_actual")

    # ---- records sur 90 jours (prioritaires pour le titre)
    if n >= MIN_HISTORY:
        dists = _vals(history, _dist)
        if dist and dists and dist > max(dists):
            facts.append(f"Plus longue sortie depuis {HISTORY_DAYS} jours ({_fmt_km(dist)}).")
            tags.append("record")
            headline = headline or f"Record de distance sur {HISTORY_DAYS} jours"
        elevs = _vals(history, _elev)
        if elev and elev >= 100 and elevs and elev > max(elevs):
            facts.append(f"Plus gros dénivelé depuis {HISTORY_DAYS} jours (+{round(elev)} m).")
            tags.append("record")
            headline = headline or "Record de dénivelé"
        if disc == "RUN" and pace and dist and dist >= PACE_RECORD_MIN_M:
            paces = [_pace(s) for s in history
                     if _pace(s) and (_dist(s) or 0) >= PACE_RECORD_MIN_M]
            if paces and pace < min(paces):
                facts.append(f"Allure moyenne la plus rapide depuis {HISTORY_DAYS} jours "
                             f"sur plus de 3 km ({_fmt_pace(pace)}).")
                tags.append("record")
                headline = headline or "Meilleure allure sur 90 jours"

    # ---- comparaison à la séance type (médiane)
    if n >= MIN_HISTORY:
        dists = _vals(history, _dist)
        if dist and dists:
            p = _pct(dist, median(dists))
            if abs(p) >= PCT_SIG:
                facts.append(f"Distance {'+' if p > 0 else ''}{p:.0%} par rapport à ta "
                             f"sortie type ({_fmt_km(median(dists))}).".replace("%", " %"))
        paces = _vals(history, _pace) if disc == "RUN" else []
        hrs = _vals(history, _hr)
        dp = (pace - median(paces)) if pace and paces else None
        dh = (hr - median(hrs)) if hr and hrs else None
        if dp is not None and abs(dp) >= PACE_SIG_S:
            facts.append(f"Allure {_fmt_pace(pace)}, {abs(round(dp))} s/km "
                         f"{'plus rapide' if dp < 0 else 'plus lente'} que d'habitude.")
        if dh is not None and abs(dh) >= HR_SIG_BPM:
            facts.append(f"FC moyenne {round(hr)} bpm, {abs(round(dh))} bpm "
                         f"{'plus basse' if dh < 0 else 'plus haute'} que d'habitude.")
        # Efficacité aérobie : plus vite pour un cœur plus calme
        if dp is not None and dh is not None and dp <= -PACE_SIG_S / 2 and dh <= -HR_SIG_BPM / 2:
            facts.append("Plus rapide avec un cœur plus calme : signe d'amélioration "
                         "de ton endurance.")
            tags.append("efficiency")
            headline = headline or "Plus rapide, cœur plus calme"
        trimps = _vals(history, lambda s: s.get("trimp_actual"))
        if trimp and trimps:
            p = _pct(trimp, median(trimps))
            if p >= 0.4:
                facts.append(f"Charge (TRIMP {round(trimp)}) nettement au-dessus de ta "
                             f"séance type : prévois une récupération.")
                tags.append("hard")

    # ---- intensité (zones cardiaques)
    zones = _m(session).get("hr_time_in_zone_s")
    if isinstance(zones, list) and len(zones) == 5 and sum(z or 0 for z in zones) > 0:
        total = sum(z or 0 for z in zones)
        easy = ((zones[0] or 0) + (zones[1] or 0)) / total
        hard = ((zones[3] or 0) + (zones[4] or 0)) / total
        if easy >= 0.8:
            facts.append(f"Séance facile : {easy:.0%} du temps en zones 1-2.".replace("%", " %"))
            tags.append("easy")
            headline = headline or "Sortie en endurance fondamentale"
        elif hard >= 0.25:
            facts.append(f"Séance intense : {hard:.0%} du temps en zones 4-5.".replace("%", " %"))
            tags.append("hard")
            headline = headline or "Séance intense"

    te = _m(session).get("training_effect_aerobic")
    if isinstance(te, (int, float)) and te >= 4:
        facts.append(f"Effet d'entraînement aérobie élevé ({str(te).replace('.', ',')}/5).")

    if n < MIN_HISTORY:
        facts.append("Pas encore assez de séances de cette discipline pour comparer "
                     "à tes habitudes.")
    if headline is None:
        headline = "Dans tes habitudes" if n >= MIN_HISTORY else "Séance enregistrée"

    return Analysis(headline=headline, facts=facts, tags=sorted(set(tags)), history_n=n)
