"""Tests de l'extraction des métriques riches d'activité Garmin."""
from app.services.garmin_sync import extract_activity_metrics


def test_extract_full_activity():
    a = {
        "distance": 10230.5, "duration": 3012.0, "movingDuration": 2980.0,
        "averageSpeed": 3.4, "maxSpeed": 4.8,
        "elevationGain": 142.3, "elevationLoss": 138.0, "calories": 712,
        "averageHR": 158.4, "maxHR": 181,
        "hrTimeInZone_1": 120, "hrTimeInZone_2": 900, "hrTimeInZone_3": 1200,
        "hrTimeInZone_4": 600, "hrTimeInZone_5": 180,
        "averageRunningCadenceInStepsPerMinute": 176.2,
        "aerobicTrainingEffect": 3.4, "anaerobicTrainingEffect": 1.2,
        "vO2MaxValue": 54.1,
    }
    m = extract_activity_metrics(a)
    assert m["distance_m"] == 10230
    assert m["avg_pace_s_per_km"] == round(1000 / 3.4)     # ≈ 294 s/km
    assert m["best_pace_s_per_km"] == round(1000 / 4.8)
    assert m["elevation_gain_m"] == 142
    assert m["avg_hr"] == 158 and m["max_hr"] == 181
    assert m["hr_time_in_zone_s"] == [120, 900, 1200, 600, 180]
    assert m["avg_cadence_spm"] == 176
    assert m["training_effect_aerobic"] == 3.4
    assert m["vo2max"] == 54.1


def test_extract_drops_missing():
    assert extract_activity_metrics({}) == {}
    m = extract_activity_metrics({"distance": 5000, "averageSpeed": None})
    assert m == {"distance_m": 5000}
    assert "avg_pace_s_per_km" not in m


def test_extract_no_hr_zones():
    m = extract_activity_metrics({"distance": 5000, "averageHR": 150})
    assert "hr_time_in_zone_s" not in m
