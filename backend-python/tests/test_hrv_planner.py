import pytest

from app.engine.hrv import Readiness, assess_readiness, hrv_zscore, impute_missing
from app.engine.planner import PlannedSession, adjust_session, adjust_tau2

BASELINE_HRV = [60, 62, 58, 61, 59, 63, 60, 62, 61, 59, 60, 62, 58, 61,
                60, 62, 58, 61, 59, 63, 60, 62, 61, 59, 60, 62, 58, 61]
BASELINE_SLEEP = [450.0] * 28


def test_zscore_normal():
    z = hrv_zscore(BASELINE_HRV, 60.5)
    assert abs(z) < 1


def test_readiness_normal():
    r, _ = assess_readiness(BASELINE_HRV, 60.5, BASELINE_SLEEP, 450)
    assert r == Readiness.NORMAL


def test_readiness_reduce_requires_both_signals():
    # HRV effondré + sommeil normal -> CAUTION seulement (pas REDUCE)
    r, z = assess_readiness(BASELINE_HRV, 45, BASELINE_SLEEP, 450)
    assert z <= -1.5
    assert r == Readiness.CAUTION

    # HRV effondré + déficit de sommeil -> REDUCE
    r, _ = assess_readiness(BASELINE_HRV, 45, BASELINE_SLEEP, 350)
    assert r == Readiness.REDUCE


def test_insufficient_history():
    with pytest.raises(ValueError):
        hrv_zscore([60, 61, 62], 60)


def test_impute_missing():
    values = [60.0, None, 62.0, 61.0, None, 59.0, 60.0]
    result = impute_missing(values)
    assert all(v is not None for v in result)
    assert 55 < result[1] < 65


def test_adjust_session_normal_unchanged():
    planned = PlannedSession("INTERVAL", 60, 120)
    result = adjust_session(planned, Readiness.NORMAL, 0.2)
    assert not result.modified
    assert result.session == planned


def test_adjust_session_reduce_downgrades_interval():
    planned = PlannedSession("INTERVAL", 60, 120)
    result = adjust_session(planned, Readiness.REDUCE, -2.0, tau2_base=7.0)
    assert result.modified
    assert result.session.session_type == "ENDURANCE"
    assert result.session.target_trimp == 60  # 120 * 0.5
    assert result.tau2_adjusted == pytest.approx(10.5)  # 7 * 1.5


def test_adjust_tau2_levels():
    assert adjust_tau2(7.0, Readiness.NORMAL) == 7.0
    assert adjust_tau2(7.0, Readiness.CAUTION) == pytest.approx(8.4)
    assert adjust_tau2(7.0, Readiness.REDUCE) == pytest.approx(10.5)
