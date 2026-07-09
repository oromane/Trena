"""Tests du moteur d'allures personnalisées."""
from app.engine import paces


def test_parse_distance_keywords():
    assert paces.parse_distance_m("Marathon de Paris") == 42_195
    assert paces.parse_distance_m("Semi-marathon de Lyon") == 21_097
    assert paces.parse_distance_m("Mon 10 km au parc") == 10_000
    assert paces.parse_distance_m("Objectif 5K") == 5_000
    assert paces.parse_distance_m("Sortie tranquille") is None
    assert paces.parse_distance_m(None) is None


def test_parse_distance_explicit_numeric():
    assert paces.parse_distance_m("Course 21,1 km") == 21_100
    assert paces.parse_distance_m("Trail 42km") == 42_000
    assert paces.parse_distance_m("Objectif 42195 m") == 42_195
    # Hors garde-fou : trop court → ignoré
    assert paces.parse_distance_m("100 m sprint") is None


def test_race_distance_prefers_explicit():
    obj = {"title": "Marathon", "distance_m": 21_097}
    assert paces.race_distance_m(obj) == 21_097  # champ explicite prioritaire
    assert paces.race_distance_m({"title": "Marathon"}) == 42_195


def test_zone_paces_are_monotonic():
    # Marathon en 3h30 = 12600 s
    z = paces.zone_paces(12_600, 42_195)
    # Z1 (récup) la plus lente ... Z5 (VMA) la plus rapide
    assert z[1] > z[2] > z[3] > z[4] > z[5]


def test_race_pace_matches_input():
    # 10 km en 40:00 → 4:00/km
    payload = paces.training_paces({"title": "10 km", "target_time_seconds": 2_400})
    assert payload is not None
    assert payload["distance_m"] == 10_000
    assert payload["race"]["pace"] == "4:00/km"
    # 5 zones ordonnées, allures formatées
    zones = payload["zones"]
    assert [x["zone"] for x in zones] == [1, 2, 3, 4, 5]
    assert all("/km" in x["pace"] for x in zones)


def test_training_paces_none_without_time_or_distance():
    assert paces.training_paces(None) is None
    assert paces.training_paces({"title": "10 km"}) is None  # pas de temps
    assert paces.training_paces(
        {"title": "Sortie", "target_time_seconds": 3600}) is None  # pas de distance


def test_session_pace_hint():
    obj = {"title": "Marathon", "target_time_seconds": 12_600}
    hint = paces.session_pace_hint("INTERVAL", obj)
    assert hint and "/km" in hint and "Z5" in hint
    assert paces.session_pace_hint("ENDURANCE", obj).count("Z2") == 1
    assert paces.session_pace_hint("INTERVAL", None) is None


def test_format_pace():
    assert paces.format_pace(300) == "5:00/km"
    assert paces.format_pace(305) == "5:05/km"
    assert paces.format_pace(272.6) == "4:33/km"
