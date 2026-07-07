"""Tests de la détection de monotonie/contrainte (Foster)."""
from app.engine.foster import (
    MIN_WEEKLY_LOAD,
    MONOTONY_CAUTION,
    MONOTONY_HIGH,
    foster_metrics,
)
from app.engine.insights import generate_insights


def test_varied_week_is_ok():
    """Semaine polarisée classique : 3 séances variées + repos."""
    r = foster_metrics([0, 120, 0, 60, 0, 200, 0])
    assert r.level == "ok"
    assert r.monotony is not None and r.monotony < MONOTONY_CAUTION
    assert r.strain is not None
    assert r.weekly_load == 380.0


def test_uniform_week_is_high():
    """Même charge tous les jours : monotonie maximale."""
    r = foster_metrics([80.0] * 7)
    assert r.level == "high"
    assert r.monotony is None  # écart-type nul


def test_quasi_uniform_week_is_flagged():
    r = foster_metrics([80, 75, 82, 78, 80, 76, 81])
    assert r.level == "high"
    assert r.monotony >= MONOTONY_HIGH
    # strain est calculé avant arrondi de la monotonie : tolérance large
    assert abs(r.strain - r.weekly_load * r.monotony) < r.weekly_load * 0.01


def test_low_volume_is_insufficient():
    r = foster_metrics([0, 10, 0, 10, 0, 10, 0])
    assert r.weekly_load < MIN_WEEKLY_LOAD
    assert r.level == "insufficient"
    assert r.monotony is None and r.strain is None


def test_short_window_is_insufficient():
    assert foster_metrics([100, 100, 100]).level == "insufficient"


def _base_insight_kwargs() -> dict:
    return dict(
        hrv_series=[], sleep_series=[],
        week_planned_trimp=0.0, last_week_actual_trimp=0.0,
        readiness="NORMAL", hrv_zscore=None, adherence=0.9,
    )


def test_insight_emitted_on_high_monotony():
    out = generate_insights(**_base_insight_kwargs(),
                            foster_level="high", foster_monotony=2.4)
    foster_warnings = [i for i in out
                       if i.kind == "load" and i.severity == "warning"]
    assert len(foster_warnings) == 1
    assert "monotonie 2.4" in foster_warnings[0].text


def test_insight_info_on_caution():
    out = generate_insights(**_base_insight_kwargs(),
                            foster_level="caution", foster_monotony=1.7)
    assert any(i.kind == "load" and i.severity == "info" for i in out)


def test_no_insight_when_ok_or_absent():
    for level in ("ok", "insufficient", None):
        out = generate_insights(**_base_insight_kwargs(),
                                foster_level=level, foster_monotony=1.0)
        assert not any(i.kind == "load" for i in out)
