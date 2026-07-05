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
