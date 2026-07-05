"""Ajustement dynamique quotidien de la séance (spec §5.2)."""
from dataclasses import dataclass, replace

from .hrv import Readiness

# Ordre de contrainte systémique décroissante
_DOWNGRADE = {
    "INTERVAL": "ENDURANCE",
    "TEMPO": "ENDURANCE",
    "ENDURANCE": "RECOVERY",
    "RECOVERY": "RECOVERY",
}

# Facteurs appliqués au TRIMP cible
_TRIMP_FACTOR = {
    Readiness.NORMAL: 1.0,
    Readiness.CAUTION: 0.8,
    Readiness.REDUCE: 0.5,
}


@dataclass(frozen=True)
class PlannedSession:
    session_type: str          # 'INTERVAL' | 'TEMPO' | 'ENDURANCE' | 'RECOVERY'
    duration_minutes: int
    target_trimp: int


@dataclass(frozen=True)
class AdjustmentResult:
    session: PlannedSession
    readiness: Readiness
    hrv_zscore: float
    tau2_adjusted: float
    modified: bool


def adjust_tau2(tau2_base: float, readiness: Readiness) -> float:
    """Allonge tau2 (temps de récupération) quand la disponibilité chute."""
    if readiness == Readiness.REDUCE:
        return tau2_base * 1.5
    if readiness == Readiness.CAUTION:
        return tau2_base * 1.2
    return tau2_base


def adjust_session(
    planned: PlannedSession,
    readiness: Readiness,
    hrv_z: float,
    tau2_base: float = 7.0,
) -> AdjustmentResult:
    """Recalcule la séance du jour selon le niveau de disponibilité."""
    tau2 = adjust_tau2(tau2_base, readiness)
    factor = _TRIMP_FACTOR[readiness]

    if readiness == Readiness.NORMAL:
        return AdjustmentResult(planned, readiness, hrv_z, tau2, modified=False)

    new_type = planned.session_type
    if readiness == Readiness.REDUCE:
        new_type = _DOWNGRADE.get(planned.session_type, "RECOVERY")

    adjusted = replace(
        planned,
        session_type=new_type,
        target_trimp=round(planned.target_trimp * factor),
    )
    return AdjustmentResult(adjusted, readiness, hrv_z, tau2, modified=True)
