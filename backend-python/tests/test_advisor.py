"""Conseiller IA : recherche, garde-fous, repli et sécurité (LLM mocké)."""
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.advisor import llm
from app.advisor.knowledge import GLOSSARY, get_retriever
from app.config import settings
from app.db.repo import get_repo
from app.engine import acwr, foster
from app.main import app
from app.routers import advisor as advisor_router

KEY = "test-internal-key"
HEADERS = {"X-Internal-Key": KEY}


@pytest.fixture(autouse=True)
def configure(monkeypatch):
    monkeypatch.setattr(settings, "internal_api_key", KEY)
    advisor_router._calls.clear()


@pytest.fixture
def repo():
    mock = MagicMock()
    mock.get_metrics_history.return_value = []
    mock.get_sessions_between.return_value = []
    app.dependency_overrides[get_repo] = lambda: mock
    yield mock
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def ask(client, question, user="u1"):
    return client.post("/advisor/ask", headers=HEADERS,
                       json={"user_id": user, "question": question})


# ------------------------------------------------------------ recherche
@pytest.mark.parametrize("question,expected", [
    ("C'est quoi le HRV ?", "hrv"),
    ("Que veut dire ACWR ?", "acwr"),
    ("Comment est calculée la monotonie ?", "foster"),
    ("Pourquoi mon z-score est négatif ?", "zscore"),
    ("C'est quoi le TRIMP ?", "trimp"),
])
def test_retriever_finds_the_right_entry(question, expected):
    top = get_retriever().search(question, k=1)
    assert top and top[0][0].key == expected


def test_retriever_returns_nothing_off_topic():
    assert get_retriever().search("recette de crêpes", k=3) == []


def test_glossary_thresholds_match_engine():
    text = {e.key: e.text for e in GLOSSARY}
    assert str(acwr.ACWR_CEILING).replace(".", ",") in text["acwr"]
    assert str(acwr.ACWR_DANGER).replace(".", ",") in text["acwr"]
    assert str(foster.MONOTONY_CAUTION).replace(".", ",") in text["foster"]
    assert str(int(foster.MONOTONY_HIGH)) in text["foster"]
    assert str(settings.sleep_deficit_minutes) in text["zscore"]
    assert str(settings.hrv_caution_z).replace("-", "-").replace(".0", "") in text["zscore"]


# ------------------------------------------------------------ sécurité
def test_requires_internal_key(client, repo):
    r = client.post("/advisor/ask", json={"user_id": "u1", "question": "hrv ?"},
                    headers={"X-Internal-Key": "wrong"})
    assert r.status_code == 401


def test_emergency_bypasses_llm(client, repo, monkeypatch):
    called = MagicMock()
    monkeypatch.setattr(llm, "chat", called)
    r = ask(client, "J'ai une douleur thoracique après ma séance")
    assert r.status_code == 200
    assert r.json()["mode"] == "safety"
    assert "15" in r.json()["answer"]
    called.assert_not_called()


def test_question_length_is_bounded(client, repo):
    assert ask(client, "x" * 501).status_code == 422


def test_rate_limit(client, repo, monkeypatch):
    async def fake_chat(system, user):
        return "ok"
    monkeypatch.setattr(llm, "chat", fake_chat)
    monkeypatch.setattr(settings, "advisor_max_per_hour", 2)
    assert ask(client, "hrv ?").status_code == 200
    assert ask(client, "hrv ?").status_code == 200
    assert ask(client, "hrv ?").status_code == 429
    assert ask(client, "hrv ?", user="u2").status_code == 200


# ------------------------------------------------------------ LLM / repli
def test_llm_answer_receives_context_and_extracts(client, repo, monkeypatch):
    seen = {}

    async def fake_chat(system, user):
        seen["system"], seen["user"] = system, user
        return "Ton HRV est dans ta norme."

    monkeypatch.setattr(llm, "chat", fake_chat)
    r = ask(client, "C'est quoi le HRV ?")
    body = r.json()
    assert body["mode"] == "llm"
    assert body["sources"][0]["key"] == "hrv"
    assert "<donnees>" in seen["user"] and "CONTEXTE" in seen["user"]
    assert "aucun diagnostic" in seen["system"]


def test_glossary_fallback_when_llm_down(client, repo, monkeypatch):
    async def down(system, user):
        raise llm.LLMUnavailable("connexion refusée")

    monkeypatch.setattr(llm, "chat", down)
    r = ask(client, "C'est quoi le HRV ?")
    assert r.status_code == 200
    assert r.json()["mode"] == "glossary"
    assert "rMSSD" in r.json()["answer"]


def test_503_when_llm_down_and_no_match(client, repo, monkeypatch):
    async def down(system, user):
        raise llm.LLMUnavailable("x")

    monkeypatch.setattr(llm, "chat", down)
    assert ask(client, "recette de crêpes").status_code == 503


def test_glossary_endpoint(client, repo):
    r = client.get("/advisor/glossary", headers=HEADERS)
    assert r.status_code == 200
    assert {e["key"] for e in r.json()} >= {"hrv", "acwr", "foster"}


# ------------------------------------------------------------ streaming
def _events(r):
    import json as _json
    return [_json.loads(line) for line in r.text.splitlines() if line]


def stream(client, question, user="u1"):
    return client.post("/advisor/ask/stream", headers=HEADERS,
                       json={"user_id": user, "question": question})


def test_stream_yields_meta_deltas_done(client, repo, monkeypatch):
    async def fake_stream(system, user):
        for p in ("Ton HRV ", "est stable."):
            yield p

    monkeypatch.setattr(llm, "chat_stream", fake_stream)
    ev = _events(stream(client, "C'est quoi le HRV ?"))
    assert ev[0]["type"] == "meta" and ev[0]["mode"] == "llm"
    assert ev[0]["sources"][0]["key"] == "hrv"
    assert "".join(e["text"] for e in ev if e["type"] == "delta") == "Ton HRV est stable."
    assert ev[-1]["type"] == "done"


def test_stream_falls_back_to_glossary(client, repo, monkeypatch):
    async def down(system, user):
        raise llm.LLMUnavailable("refusé")
        yield  # pragma: no cover  (générateur)

    monkeypatch.setattr(llm, "chat_stream", down)
    ev = _events(stream(client, "C'est quoi le HRV ?"))
    assert ev[0]["mode"] == "glossary"
    assert "rMSSD" in ev[1]["text"]
    assert ev[-1]["type"] == "done"


def test_stream_error_when_down_and_off_topic(client, repo, monkeypatch):
    async def down(system, user):
        raise llm.LLMUnavailable("refusé")
        yield  # pragma: no cover

    monkeypatch.setattr(llm, "chat_stream", down)
    ev = _events(stream(client, "recette de crêpes"))
    assert ev == [{"type": "error", "message": "Conseiller momentanément indisponible."}]


def test_stream_safety_short_circuits(client, repo, monkeypatch):
    called = MagicMock()
    monkeypatch.setattr(llm, "chat_stream", called)
    ev = _events(stream(client, "j'ai fait un malaise en courant"))
    assert ev[0]["mode"] == "safety"
    called.assert_not_called()


def test_hrv_named_explicitly_ranks_first():
    top = get_retriever().search("Mon HRV est bas, je dois m'inquiéter ?", k=1)
    assert top[0][0].key == "hrv"


# ------------------------------------------------------------ client Ollama
def _mock_ollama(monkeypatch, handler):
    import httpx

    real = httpx.AsyncClient

    def factory(*a, **kw):
        kw["transport"] = httpx.MockTransport(handler)
        return real(*a, **kw)

    monkeypatch.setattr(llm.httpx, "AsyncClient", factory)


def test_chat_stream_parses_ndjson_and_hides_thinking(monkeypatch):
    import asyncio
    import json as _json

    import httpx

    lines = [{"message": {"content": "<think>calcul</think>"}},
             {"message": {"content": "Bonjour"}},
             {"message": {"content": " Romane"}, "done": True}]
    body = "\n".join(_json.dumps(x) for x in lines).encode()
    _mock_ollama(monkeypatch, lambda req: httpx.Response(200, content=body))

    async def collect():
        return [p async for p in llm.chat_stream("s", "u")]

    assert "".join(asyncio.run(collect())) == "Bonjour Romane"


def test_chat_stream_raises_on_http_error(monkeypatch):
    import asyncio

    import httpx

    _mock_ollama(monkeypatch, lambda req: httpx.Response(404, json={"error": "model not found"}))

    async def collect():
        return [p async for p in llm.chat_stream("s", "u")]

    with pytest.raises(llm.LLMUnavailable):
        asyncio.run(collect())


# ------------------------------------------------------------ fuite du raisonnement
@pytest.mark.parametrize("pieces,expected,resets", [
    # Variante « thinking » : raisonnement sans balise ouvrante
    (["Okay, let's tackle ", "this.</think>", "\n\nTon HRV est bas."], "Ton HRV est bas.", 1),
    # Balises complètes dans un seul morceau
    (["<think>calcul</think>Bonjour"], "Bonjour", 0),
    # Texte avant et après un raisonnement balisé
    (["Avant <think>x", "y</think> après"], "Avant  après", 0),
    # Aucun raisonnement
    (["Ton HRV ", "est stable."], "Ton HRV est stable.", 0),
])
def test_strip_thinking(pieces, expected, resets):
    out, in_think, n_reset = "", False, 0
    for p in pieces:
        text, in_think, reset = llm._strip_thinking(p, in_think)
        if reset:
            out, n_reset = "", n_reset + 1
        out += text
    # Les espaces de tête sont retirés par l'interface (premier delta).
    assert out.strip() == expected.strip()
    assert n_reset == resets


def test_chat_strips_untagged_reasoning(monkeypatch):
    import asyncio

    import httpx

    body = {"message": {"content": "Okay, let me think.</think>\n\nTon HRV est bas."}}
    _mock_ollama(monkeypatch, lambda req: httpx.Response(200, json=body))
    assert asyncio.run(llm.chat("s", "u")) == "Ton HRV est bas."


def test_stream_emits_reset_for_leaked_reasoning(client, repo, monkeypatch):
    import asyncio  # noqa: F401

    import httpx
    import json as _json

    lines = [{"message": {"content": "Okay, let's tackle this."}},
             {"message": {"content": "</think>Ton HRV est bas."}, "done": True}]
    body = "\n".join(_json.dumps(x) for x in lines).encode()
    _mock_ollama(monkeypatch, lambda req: httpx.Response(200, content=body))
    ev = _events(stream(client, "C'est quoi le HRV ?"))
    types = [e["type"] for e in ev]
    assert types == ["meta", "delta", "reset", "delta", "done"]
    assert ev[3]["text"] == "Ton HRV est bas."


def test_default_model_is_instruct_variant():
    # « qwen3:4b » seul pointe vers la variante thinking (lente, raisonnement visible).
    assert "instruct" in settings.llm_model
