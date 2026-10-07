"""Classification des activités Garmin en disciplines.

C'est ce qui alimente les totaux par sport et les tuiles du dashboard : une
activité mal classée disparaît du suivi, ou pire, est rejetée par la base.

Les couples (discipline, session_type) testés ici sont ceux que la contrainte
CHECK de `training_sessions` accepte réellement — relevés par sondage sur la
base. Toute autre combinaison est rejetée en 23514.
"""
import pytest

from app.services.garmin_sync import (
    DISCIPLINE_BY_TYPE,
    classify_activity,
)

# Couples autorisés par la contrainte CHECK, par discipline.
ALLOWED = {
    "RUN": {"ENDURANCE", "INTERVAL", "TEMPO", "RECOVERY", "LONG_RUN", "RACE"},
    "BIKE": {"ENDURANCE", "TEMPO", "INTERVAL", "RECOVERY"},
    "SWIM": {"ENDURANCE", "TEMPO", "INTERVAL", "RECOVERY"},
    "STRENGTH": {"FULL_BODY", "UPPER", "LOWER", "PUSH", "PULL", "CORE", "MOBILITY"},
    "TRIATHLON": {"BRICK"},
}


@pytest.mark.parametrize(
    "type_key,discipline",
    [
        ("running", "RUN"),
        ("trail_running", "RUN"),
        ("treadmill_running", "RUN"),
        ("cycling", "BIKE"),
        ("road_biking", "BIKE"),
        ("mountain_biking", "BIKE"),
        ("indoor_cycling", "BIKE"),
        ("virtual_ride", "BIKE"),
        ("lap_swimming", "SWIM"),
        ("open_water_swimming", "SWIM"),
        ("strength_training", "STRENGTH"),
        ("multi_sport", "TRIATHLON"),
    ],
)
def test_known_types_map_to_expected_discipline(type_key, discipline):
    result = classify_activity(type_key)
    assert result is not None, f"{type_key} devrait être classé"
    assert result[0] == discipline


def test_type_key_is_case_insensitive():
    assert classify_activity("ROAD_BIKING") == classify_activity("road_biking")


@pytest.mark.parametrize(
    "type_key", ["walking", "yoga", "resort_skiing", "hiking", "", "inconnu"]
)
def test_out_of_scope_activities_are_ignored(type_key):
    """Mieux vaut ignorer une activité que la ranger dans une discipline
    approximative : un yoga compté en musculation fausserait les totaux."""
    assert classify_activity(type_key) is None


def test_every_mapping_respects_the_database_constraint():
    """Garde-fou : aucune entrée de la table ne peut produire un couple
    refusé par la contrainte CHECK de training_sessions."""
    for type_key, (discipline, session_type) in DISCIPLINE_BY_TYPE.items():
        assert discipline in ALLOWED, f"{type_key} → discipline inconnue"
        assert session_type in ALLOWED[discipline], (
            f"{type_key} → ({discipline}, {session_type}) serait rejeté en base"
        )


def test_running_still_classified_after_extension():
    """L'extension au vélo et à la natation ne doit pas avoir fait régresser
    la course, seule discipline importée jusqu'ici."""
    assert classify_activity("running") == ("RUN", "ENDURANCE")
