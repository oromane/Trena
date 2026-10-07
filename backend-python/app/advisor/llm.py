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
_THINK_END = "</think>"

# Émis par chat_stream quand un raisonnement déjà diffusé doit être effacé :
# certains modèles (variantes « thinking ») écrivent leur raisonnement sans
# balise ouvrante, et on ne le reconnaît qu'à la balise fermante.
RESET = "\x00reset"


class LLMUnavailable(Exception):
    """Modèle injoignable, absent ou trop lent."""


async def chat(system: str, user: str, *, timeout_s: float | None = None,
               max_tokens: int | None = None) -> str:
    payload = {
        "model": settings.llm_model,
        "stream": False,
        "think": False,  # modèles à raisonnement : pas de monologue interne
        "keep_alive": "10m",
        "options": {
            "temperature": 0.2,
            "num_ctx": 3072,
            "num_predict": max_tokens or settings.llm_max_tokens,
        },
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    try:
        async with _gate:
            async with httpx.AsyncClient(timeout=timeout_s or settings.llm_timeout_s) as client:
                r = await client.post(f"{settings.llm_base_url}/api/chat", json=payload)
        r.raise_for_status()
        content = r.json()["message"]["content"]
    except (httpx.HTTPError, KeyError, ValueError) as e:
        raise LLMUnavailable(str(e)) from e
    content = _THINK.sub("", content)
    # Raisonnement sans balise ouvrante : tout ce qui précède </think> part.
    content = content.split(_THINK_END)[-1].strip()
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
            "num_ctx": 3072,
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
                        out, in_think, reset = _strip_thinking(piece, in_think)
                        if reset:
                            yield RESET
                        if out:
                            yield out
                        if chunk.get("done"):
                            break
        except (httpx.HTTPError, ValueError) as e:
            raise LLMUnavailable(str(e)) from e


def _strip_thinking(piece: str, in_think: bool) -> tuple[str, bool, bool]:
    """Retire le raisonnement d'un morceau de flux.

    Returns:
        (texte à diffuser, état « dans un raisonnement », reset demandé)
    Un </think> rencontré hors raisonnement connu signifie que le texte déjà
    diffusé était un raisonnement sans balise ouvrante : reset.
    """
    out, reset, buf = "", False, piece
    while buf:
        if in_think:
            if _THINK_END not in buf:
                break
            buf = buf.split(_THINK_END, 1)[1]
            in_think = False
        elif "<think>" in buf:
            before, buf = buf.split("<think>", 1)
            out += before
            in_think = True
        elif _THINK_END in buf:
            out, reset = "", True
            buf = buf.split(_THINK_END, 1)[1].lstrip()
        else:
            out += buf
            buf = ""
    return out, in_think, reset


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
