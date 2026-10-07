"""Calcul du score TRIMP (Training Impulse) de Banister.

TRIMP = durée (min) × HRr × y
avec HRr = (FC_moyenne - FC_repos) / (FC_max - FC_repos)
et  y = 0.64 × e^(1.92 × HRr)  (homme)
    y = 0.86 × e^(1.67 × HRr)  (femme)
"""
import math


def heart_rate_reserve_ratio(hr_avg: float, hr_rest: float, hr_max: float) -> float:
    if hr_max <= hr_rest:
        raise ValueError("hr_max doit être supérieur à hr_rest")
    ratio = (hr_avg - hr_rest) / (hr_max - hr_rest)
    return min(max(ratio, 0.0), 1.0)


def trimp(
    duration_minutes: float,
    hr_avg: float,
    hr_rest: float,
    hr_max: float,
    sex: str = "M",
) -> float:
    """Score TRIMP d'une séance."""
    if duration_minutes < 0:
        raise ValueError("duration_minutes doit être positif")
    hrr = heart_rate_reserve_ratio(hr_avg, hr_rest, hr_max)
    if sex.upper() == "F":
        y = 0.86 * math.exp(1.67 * hrr)
    else:
        y = 0.64 * math.exp(1.92 * hrr)
    return duration_minutes * hrr * y


# ------------------------------------------------------------- TRIMP zonal
# Milieu de chaque zone Garmin par défaut (% de la FC max) : Z1 50-60 %,
# Z2 60-70 %, Z3 70-80 %, Z4 80-90 %, Z5 90-100 %. Approximation assumée si
# l'utilisateur a personnalisé ses zones sur la montre.
ZONE_MID_PCT_HRMAX = (0.55, 0.65, 0.75, 0.85, 0.95)
BELOW_Z1_PCT_HRMAX = 0.45      # temps hors zones (échauffement, arrêts)
MIN_ZONE_COVERAGE = 0.5        # sous 50 % de la durée couverte : vecteur douteux
MAX_AVG_HR_GAP_BPM = 8.0       # zones incohérentes avec la FC moyenne mesurée


def zones_match_avg_hr(zone_seconds: list[float], hr_avg: float, hr_max: float) -> bool:
    """Les zones de la montre correspondent-elles aux bornes supposées ?

    On reconstitue une FC moyenne à partir du temps par zone (milieux de
    zone) et on la compare à la FC moyenne mesurée. Un gros écart signale des
    zones personnalisées (FC de réserve, seuil lactique) : le calcul zonal
    serait alors biaisé et on retombe sur la FC moyenne.
    """
    secs = [max(0.0, float(s or 0)) for s in zone_seconds]
    total = sum(secs)
    if total <= 0:
        return False
    implied = sum(s * pct * hr_max for s, pct in zip(secs, ZONE_MID_PCT_HRMAX)) / total
    return abs(implied - hr_avg) <= MAX_AVG_HR_GAP_BPM


def zonal_trimp(
    zone_seconds: list[float] | None,
    hr_rest: float,
    hr_max: float,
    sex: str = "M",
    duration_minutes: float | None = None,
) -> float | None:
    """TRIMP de Banister intégré zone par zone (ticket P2-7).

    Même formule et même échelle que `trimp`, appliquée au temps passé dans
    chaque zone plutôt qu'à la FC moyenne. La pondération étant exponentielle
    (convexe), la FC moyenne sous-estime les séances fractionnées : une
    minute en Z5 pèse bien plus que deux minutes en Z3 (inégalité de Jensen).

    Le temps de la séance non couvert par les zones (sous Z1) est compté à
    45 % de la FC max. Renvoie None si le vecteur est absent ou incohérent ;
    l'appelant retombe alors sur la FC moyenne.
    """
    if not zone_seconds or len(zone_seconds) != 5:
        return None
    secs = [max(0.0, float(s or 0)) for s in zone_seconds]
    zone_min = sum(secs) / 60
    if zone_min <= 0:
        return None
    if duration_minutes and zone_min < MIN_ZONE_COVERAGE * duration_minutes:
        return None
    total = sum(
        trimp(s / 60, pct * hr_max, hr_rest, hr_max, sex)
        for s, pct in zip(secs, ZONE_MID_PCT_HRMAX)
    )
    if duration_minutes and duration_minutes - zone_min > 0.5:
        total += trimp(duration_minutes - zone_min, BELOW_Z1_PCT_HRMAX * hr_max,
                       hr_rest, hr_max, sex)
    return total


def session_trimp(
    duration_minutes: float,
    hr_avg: float | None,
    zone_seconds: list[float] | None,
    hr_rest: float,
    hr_max: float,
    sex: str = "M",
    discipline: str | None = None,
) -> tuple[int, str]:
    """TRIMP d'une séance réalisée et méthode utilisée.

    Ordre de préférence : zonal (si vecteur fiable et cohérent avec la FC
    moyenne mesurée, hors musculation), FC moyenne, puis durée seule. La musculation garde la FC
    moyenne : la pondération cardio de Banister n'a pas de sens sur des
    séries entrecoupées de repos.
    """
    zones_ok = bool(zone_seconds) and len(zone_seconds or []) == 5 and (
        not hr_avg or zones_match_avg_hr(zone_seconds, hr_avg, hr_max))
    if zones_ok and (discipline or "").upper() != "STRENGTH" and hr_max > hr_rest:
        z = zonal_trimp(zone_seconds, hr_rest, hr_max, sex, duration_minutes)
        if z is not None:
            return round(z), "zonal"
    if hr_avg and hr_max > hr_rest:
        return round(trimp(duration_minutes, hr_avg, hr_rest, hr_max, sex)), "avg_hr"
    return round(duration_minutes * 1.2), "duration"
