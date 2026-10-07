import math

import pytest

from app.engine.trimp import heart_rate_reserve_ratio, trimp


def test_hrr_bounds():
    assert heart_rate_reserve_ratio(50, 50, 190) == 0.0
    assert heart_rate_reserve_ratio(190, 50, 190) == 1.0
    assert heart_rate_reserve_ratio(200, 50, 190) == 1.0  # clampé


def test_trimp_reference_value():
    # HRr = (150-50)/(190-50) ≈ 0.714
    hrr = (150 - 50) / (190 - 50)
    expected = 60 * hrr * 0.64 * math.exp(1.92 * hrr)
    assert trimp(60, 150, 50, 190, "M") == pytest.approx(expected)


def test_trimp_female_coefficients():
    hrr = (150 - 50) / (190 - 50)
    expected = 60 * hrr * 0.86 * math.exp(1.67 * hrr)
    assert trimp(60, 150, 50, 190, "F") == pytest.approx(expected)


def test_trimp_monotonic_in_intensity():
    low = trimp(60, 120, 50, 190)
    high = trimp(60, 170, 50, 190)
    assert high > low


def test_invalid_inputs():
    with pytest.raises(ValueError):
        trimp(60, 150, 190, 190)  # hr_max <= hr_rest
    with pytest.raises(ValueError):
        trimp(-10, 150, 50, 190)


# ------------------------------------------------------------- TRIMP zonal
from app.engine.trimp import session_trimp, zonal_trimp  # noqa: E402

REST, MAX = 50, 190


def test_zonal_matches_avg_for_steady_effort():
    # 60 min entièrement en Z2 ≈ 60 min à la FC du milieu de Z2
    z = zonal_trimp([0, 3600, 0, 0, 0], REST, MAX, duration_minutes=60)
    assert z == pytest.approx(trimp(60, 0.65 * MAX, REST, MAX))


def test_zonal_exceeds_avg_for_intervals():
    # Fractionné : 30 min Z1 + 30 min Z5 ; FC moyenne = milieu Z3.
    # Pondération convexe : le zonal doit être nettement supérieur (Jensen).
    zones = [1800, 0, 0, 0, 1800]
    z = zonal_trimp(zones, REST, MAX, duration_minutes=60)
    avg = trimp(60, 0.75 * MAX, REST, MAX)
    assert z > avg * 1.08


def test_zonal_counts_time_below_zone1():
    with_gap = zonal_trimp([0, 2400, 0, 0, 0], REST, MAX, duration_minutes=60)
    without = zonal_trimp([0, 2400, 0, 0, 0], REST, MAX)
    assert with_gap > without


@pytest.mark.parametrize("zones,duration", [
    (None, 60), ([], 60), ([1, 2, 3], 60), ([0, 0, 0, 0, 0], 60),
    ([0, 600, 0, 0, 0], 60),   # 10 min couvertes sur 60 : vecteur douteux
])
def test_zonal_returns_none_when_unreliable(zones, duration):
    assert zonal_trimp(zones, REST, MAX, duration_minutes=duration) is None


def test_session_trimp_method_cascade():
    zones = [600, 1800, 600, 0, 0]          # FC implicite ≈ 123,5 bpm
    assert session_trimp(50, 125, zones, REST, MAX, discipline="RUN")[1] == "zonal"
    # Zones personnalisées sur la montre : FC mesurée trop éloignée -> FC moyenne
    assert session_trimp(50, 145, zones, REST, MAX, discipline="RUN")[1] == "avg_hr"
    assert session_trimp(50, 140, None, REST, MAX, discipline="RUN")[1] == "avg_hr"
    assert session_trimp(50, None, None, REST, MAX)[1] == "duration"
    assert session_trimp(50, None, None, REST, MAX)[0] == 60
    # Musculation : jamais zonal
    assert session_trimp(50, 120, zones, REST, MAX, discipline="STRENGTH")[1] == "avg_hr"
    # Sans FC moyenne, le vecteur de zones est pris tel quel
    assert session_trimp(50, None, zones, REST, MAX, discipline="BIKE")[1] == "zonal"
