import numpy as np
import pytest

from app.engine.acwr import (ACWR_CEILING, acwr_ewma, acwr_point, acwr_rolling,
                             acwr_series)


def test_steady_load_ratio_one():
    """Charge plate → ACWR rolling ≈ 1.0 (aigu == chronique)."""
    assert abs(acwr_rolling([60.0] * 40) - 1.0) < 1e-9


def test_ewma_converges_to_one_on_flat_load():
    """L'EWMA est biaisé au démarrage à froid (chronique τ=28 non convergée) ;
    sur un long horizon plat, aigu et chronique convergent → ratio ≈ 1.0."""
    long_flat = [60.0] * 200
    assert abs(acwr_ewma(long_flat) - 1.0) < 0.02
    # démarrage à froid : sur 40 jours, le ratio est gonflé (> plafond)
    assert acwr_ewma([60.0] * 40) > 1.0


def test_spike_raises_ratio():
    """Une montée brutale de charge pousse l'ACWR au-dessus du plafond."""
    loads = [30.0] * 28 + [120.0] * 7
    assert acwr_rolling(loads) > ACWR_CEILING


def test_taper_lowers_ratio():
    """Un affûtage (charge aiguë basse) fait passer l'ACWR sous 1.0."""
    loads = [80.0] * 28 + [20.0] * 7
    assert acwr_rolling(loads) < 1.0


def test_cold_start_returns_zero():
    """Historique plus court que la fenêtre aiguë → 0.0, pas d'exception."""
    assert acwr_rolling([50.0] * 3) == 0.0


def test_series_length_matches():
    loads = [50.0] * 35
    s = acwr_series(loads)
    assert len(s) == len(loads)
    assert s[-1] == pytest.approx(acwr_rolling(loads))


def test_verdict_zones():
    assert acwr_point([30.0] * 28 + [120.0] * 7).verdict == "danger"
    assert acwr_point([60.0] * 35).verdict == "optimal"
    assert acwr_point([80.0] * 28 + [20.0] * 7).verdict == "détraining"


def test_invalid_inputs():
    with pytest.raises(ValueError):
        acwr_rolling([-1.0] * 10)
    with pytest.raises(ValueError):
        acwr_rolling([50.0] * 10, acute_days=0)
    with pytest.raises(ValueError):
        acwr_rolling([50.0] * 10, acute_days=30, chronic_days=7)
