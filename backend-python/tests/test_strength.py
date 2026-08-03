"""Tests du module Strength."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from uuid import uuid4

client = TestClient(app)

# Fixtures
VALID_USER_ID = "8acfeb20-af7f-4f96-99a5-63d65142486e"
VALID_EXERCISE_ID = "84156295-a11d-493d-9e46-fdfc2afbaf2c"


@pytest.mark.skip(reason="Requires Supabase connection")
def test_list_exercises():
    """GET /exercises retourne la liste des exercices."""
    response = client.get("/strength/exercises?muscle=chest&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "name" in data[0]


@pytest.mark.skip(reason="Requires Supabase connection")
def test_create_session():
    """POST /sessions crée une séance avec prescriptions."""
    payload = {
        "user_id": VALID_USER_ID,
        "session_date": "2026-08-03",
        "prescriptions": [
            {
                "exercise_id": VALID_EXERCISE_ID,
                "exercise_order": 1,
                "sets_planned": 3,
                "reps_min": 6,
                "reps_max": 10,
                "target_rir": 2,
                "load_planned_kg": 100,
                "rest_seconds": 120,
            }
        ],
    }
    response = client.post("/strength/sessions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["prescriptions_count"] == 1


@pytest.mark.skip(reason="Requires Supabase connection")
def test_get_session():
    """GET /sessions/{id} retourne une séance."""
    # Supposant qu'une séance existe
    session_id = "48cf7dd4-0275-4826-8493-8e06455d8c51"
    response = client.get(f"/strength/sessions/{session_id}?user_id={VALID_USER_ID}")
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert "prescriptions" in data


@pytest.mark.skip(reason="Requires Supabase connection")
def test_readiness():
    """GET /readiness retourne le statut de récupération."""
    response = client.get(f"/strength/readiness?user_id={VALID_USER_ID}")
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "recovery_status" in data
    assert data["recovery_status"] in ["green", "yellow", "red"]
