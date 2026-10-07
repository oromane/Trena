"""Tests du catalogue d'exercices.

Le module musculation est en consultation seule : il ne reste que la lecture
du catalogue. Les anciens tests de création de séance, de logging RIR et de
readiness ont disparu avec leurs endpoints.
"""
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}


@pytest.fixture(autouse=True)
def configure_security(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)
    monkeypatch.setattr(settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_role_key", "test-key")


@pytest.fixture
def client():
    return TestClient(app)


def _mock_response(payload, status=200):
    r = MagicMock()
    r.status_code = status
    r.json.return_value = payload
    return r


def test_catalogue_requires_internal_key(client):
    r = client.get("/strength/exercises", headers={"X-Internal-Key": "wrong"})
    assert r.status_code == 401


@patch("app.routers.strength.httpx.AsyncClient")
def test_list_exercises_returns_catalogue(mock_client, client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")

    payload = [
        {
            "id": "e1",
            "name": "Dumbbell Biceps Curl",
            "slug": "dumbbell-biceps-curl",
            "muscle_primary": "arms",
            "muscles_secondary": ["forearms"],
            "equipment": ["dumbbell"],
            "image_url": "https://example.com/curl.jpg",
            "video_url": None,
            "instructions": "…",
            "instructions_steps": ["Dos droit", "Coudes fixes"],
        }
    ]
    instance = mock_client.return_value.__aenter__.return_value
    instance.get.return_value = _mock_response(payload)

    r = client.get("/strength/exercises?muscle=arms&limit=1", headers=HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["name"] == "Dumbbell Biceps Curl"
    # Les repères d'exécution alimentent la fiche dépliable du catalogue.
    assert body[0]["instructions_steps"] == ["Dos droit", "Coudes fixes"]


@patch("app.routers.strength.httpx.AsyncClient")
def test_muscle_filter_is_forwarded(mock_client, client, monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")

    instance = mock_client.return_value.__aenter__.return_value
    instance.get.return_value = _mock_response([])

    client.get("/strength/exercises?muscle=chest", headers=HEADERS)
    called_url = instance.get.call_args[0][0]
    assert "muscle_primary=eq.chest" in called_url
