"""Tests du constructeur de séance libre (style Garmin)."""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.db.repo import get_repo
from app.engine.templates import build_custom_workout
from app.main import app

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}

STEPS = [
    {"kind": "step", "label": "Échauffement", "minutes": 15, "zone": 2},
    {"kind": "repeat", "times": 6, "steps": [
        {"kind": "step", "label": "Effort", "minutes": 3, "zone": 5},
        {"kind": "step", "label": "Récup", "minutes": 2, "zone": 1},
    ]},
    {"kind": "step", "label": "Retour au calme", "minutes": 10, "zone": 1},
]


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)


@pytest.fixture
def repo():
    mock = MagicMock()
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_custom_workout_computes_duration_and_trimp():
    built = build_custom_workout("Ma VMA", STEPS)
    # 15 + 6*(3+2) + 10 = 55 min
    assert built["duration_minutes"] == 55
    # 15*1.2 + 6*(3*3.0 + 2*0.8) + 10*0.8 = 18 + 63.6 + 8 = 89.6
    assert built["target_trimp"] == 90
    assert built["session_type"] == "INTERVAL"  # 18 min en Z5 sur 55
    assert built["title"] == "Ma VMA"
    labels = [b["label"] for b in built["structure"]["blocks"]]
    assert "6 × bloc" in labels


def test_custom_workout_endurance_detection():
    built = build_custom_workout("Footing", [
        {"kind": "step", "label": "Course", "minutes": 60, "zone": 2},
    ])
    assert built["session_type"] == "ENDURANCE"


def test_custom_workout_validations():
    with pytest.raises(ValueError):
        build_custom_workout("x", [])  # aucune étape
    with pytest.raises(ValueError):
        build_custom_workout("x", [
            {"kind": "step", "label": "trop court", "minutes": 5, "zone": 2},
        ])  # durée totale < 10 min
    with pytest.raises(ValueError):
        build_custom_workout("x", [
            {"kind": "repeat", "times": 1, "steps": [
                {"kind": "step", "minutes": 5, "zone": 2}]},
        ])  # répétitions < 2
    with pytest.raises(ValueError):
        build_custom_workout("x", [
            {"kind": "repeat", "times": 3, "steps": [
                {"kind": "repeat", "times": 2, "steps": []}]},
        ])  # imbrication interdite
    with pytest.raises(ValueError):
        build_custom_workout("x", [
            {"kind": "step", "label": "zone 9", "minutes": 30, "zone": 9},
        ])


def test_create_custom_endpoint(client, repo):
    repo.get_active_objective.return_value = {"id": "obj1"}
    repo.insert_sessions.return_value = [{"id": "new1"}]
    r = client.post("/sessions/create", headers=HEADERS, json={
        "user_id": "u1", "scheduled_date": "2026-07-09",
        "scheduled_time": "07:30",
        "custom": {"title": "Séance perso", "steps": STEPS},
    })
    assert r.status_code == 200
    row = repo.insert_sessions.call_args[0][0][0]
    assert row["title"] == "Séance perso"
    assert row["duration_planned_minutes"] == 55
    assert row["structure"]["blocks"]
    assert row["scheduled_time"] == "07:30:00"


def test_create_custom_invalid_returns_422(client, repo):
    r = client.post("/sessions/create", headers=HEADERS, json={
        "user_id": "u1", "scheduled_date": "2026-07-09",
        "custom": {"title": "vide", "steps": []},
    })
    assert r.status_code == 422
