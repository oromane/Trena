"""Client Ollama (API /api/chat) : un seul appel à la fois, erreurs typées."""
from __future__ import annotations

import asyncio
import json
import re
from collections.abc import AsyncIterator

import httpx

from ..config import settings

# Sur CPU, deux générations en parallèle se ralentissent mutuellement et
# font monter la RAM : on sérialise.
_gate = asyncio.Semaphore(1)
_THINK = re.compile(r"<think>.*?</think>", re.DOTALL)


class LLMUnavailable(Exception):
    """Modèle injoignable, absent ou trop lent."""


async def chat(system: str, user: str) -> str:
    payload = {
        "model": settings.llm_model,
        "stream": False,
        "think": False,  # modèles à raisonnement : pas de monologue interne
        "keep_alive": "10m",
        "options": {
            "temperature": 0.2,
            "num_ctx": 4096,
            "num_predict": settings.llm_max_tokens,
        },
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    try:
        async with _gate:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_s) as client:
                r = await client.post(f"{settings.llm_base_url}/api/chat", json=payload)
        r.raise_for_status()
        content = r.json()["message"]["content"]
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise LLMUnavailable(str(e)) from e
    content = _THINK.sub("", content).strip()
    if not content:
        raise LLMUnavailable("réponse vide")
    return content


async def chat_stream(system: str, user: str) -> AsyncIterator[str]:
    """Génère la réponse morceau par morceau (NDJSON Ollama).

    Lève LLMUnavailable avant le premier morceau si le modèle est injoignable,
    pour que l'appelant puisse encore basculer sur le glossaire.
    """
    payload = {
        "model": settings.llm_model,
        "stream": True,
        "think": False,
        "keep_alive": "10m",
        "options": {
            "temperature": 0.2,
            "num_ctx": 4096,
            "num_predict": settings.llm_max_tokens,
        },
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    async with _gate:
        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_s) as client:
                async with client.stream(
                    "POST", f"{settings.llm_base_url}/api/chat", json=payload
                ) as r:
                    if r.status_code != 200:
                        raise LLMUnavailable(f"HTTP {r.status_code}")
                    in_think = False
                    async for line in r.aiter_lines():
                        if not line:
                            continue
                        chunk = json.loads(line)
                        piece = chunk.get("message", {}).get("content", "")
                        # Garde-fou si un modèle émet malgré tout son raisonnement.
                        if "<think>" in piece:
                            in_think = True
                        if not in_think and piece:
                            yield piece
                        if "</think>" in piece:
                            in_think = False
                        if chunk.get("done"):
                            break
        except (httpx.HTTPError, ValueError) as e:
            raise LLMUnavailable(str(e)) from e


async def is_up() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.llm_base_url}/api/tags")
        if r.status_code != 200:
            return False
        names = {m.get("name", "") for m in r.json().get("models", [])}
        return settings.llm_model in names
    except (httpx.HTTPError, ValueError):
        return False
