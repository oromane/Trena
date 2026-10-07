"""Conseiller IA local : questions-réponses sur les métriques et le sport.

- POST /advisor/ask       : question libre. Contexte + glossaire -> LLM local.
                            Repli sur le glossaire si le modèle est indisponible.
- POST /advisor/ask/stream: idem, réponse progressive (NDJSON) pour l'interface.
- GET  /advisor/glossary  : définitions Trena (sans LLM).
- GET  /advisor/status    : état du service LLM.
"""
from __future__ import annotations

import json
import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..advisor import llm
from ..advisor.context import SYSTEM_RULES, build_context
from ..advisor.knowledge import GLOSSARY, get_retriever
from ..config import settings
from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key

log = logging.getLogger(__name__)

router = APIRouter(prefix="/advisor", tags=["advisor"],
                   dependencies=[Depends(require_internal_key)])

EMERGENCY_MARKERS = (
    "douleur thoracique", "douleur poitrine", "douleur dans la poitrine",
    "malaise", "évanoui", "evanoui", "syncope", "palpitations",
    "essoufflement anormal", "perte de connaissance",
)
EMERGENCY_REPLY = (
    "Ce que tu décris peut relever d'un problème de santé qui ne doit pas "
    "attendre : arrête l'effort et contacte un médecin, ou le 15 (SAMU) / "
    "le 112 en cas d'urgence. Je ne peux pas évaluer cela à ta place."
)

_calls: dict[str, deque] = defaultdict(deque)


def _rate_limit(user_id: str) -> None:
    now = time.monotonic()
    q = _calls[user_id]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= settings.advisor_max_per_hour:
        raise HTTPException(status_code=429, detail="Trop de questions, réessaie plus tard.")
    q.append(now)


class AskRequest(BaseModel):
    user_id: str
    question: str = Field(min_length=2, max_length=500)


class Source(BaseModel):
    key: str
    term: str


class AskResponse(BaseModel):
    answer: str
    mode: str  # 'llm' | 'glossary' | 'safety'
    sources: list[Source]


@router.get("/glossary")
def glossary() -> list[dict]:
    return [{"key": e.key, "term": e.term, "text": e.text} for e in GLOSSARY]


@router.get("/status")
async def status() -> dict:
    return {"model": settings.llm_model, "available": await llm.is_up()}


def _fallback(hits) -> tuple[str, list[Source]] | None:
    if not hits:
        return None
    best = hits[0][0]
    return (
        f"{best.text}\n\n(Le conseiller IA est momentanément indisponible : "
        "voici la définition de référence.)",
        [Source(key=best.key, term=best.term)],
    )


def _prepare(req: AskRequest, repo: SupabaseRepo):
    """Garde-fous + recherche + contexte, communs à /ask et /ask/stream.

    Renvoie une AskResponse finale (cas sécurité) ou le tuple
    (hits, sources, message utilisateur) à envoyer au LLM.
    """
    q = req.question.strip()
    low = q.lower()
    if any(m in low for m in EMERGENCY_MARKERS):
        return AskResponse(answer=EMERGENCY_REPLY, mode="safety", sources=[])

    _rate_limit(req.user_id)

    hits = get_retriever().search(q, k=3)
    sources = [Source(key=e.key, term=e.term) for e, _ in hits]
    extracts = "\n".join(f"- {e.term} : {e.text}" for e, _ in hits) or "(aucun extrait)"

    try:
        context = build_context(repo, req.user_id)
    except Exception:
        log.exception("advisor: contexte indisponible")
        context = {}

    user_msg = (
        f"<donnees>\nCONTEXTE : {json.dumps(context, ensure_ascii=False)}\n"
        f"EXTRAITS :\n{extracts}\n</donnees>\n\nQUESTION : {q}"
    )
    return hits, sources, user_msg


@router.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest, repo: SupabaseRepo = Depends(get_repo)) -> AskResponse:
    prepared = _prepare(req, repo)
    if isinstance(prepared, AskResponse):
        return prepared
    hits, sources, user_msg = prepared
    try:
        answer = await llm.chat(SYSTEM_RULES, user_msg)
        return AskResponse(answer=answer, mode="llm", sources=sources)
    except llm.LLMUnavailable as e:
        log.warning("advisor: LLM indisponible (%s), repli glossaire", e)
        fb = _fallback(hits)
        if fb:
            return AskResponse(answer=fb[0], mode="glossary", sources=fb[1])
        raise HTTPException(status_code=503,
                            detail="Conseiller momentanément indisponible.")


def _event(**kw) -> str:
    return json.dumps(kw, ensure_ascii=False) + "\n"


@router.post("/ask/stream")
async def ask_stream(req: AskRequest,
                     repo: SupabaseRepo = Depends(get_repo)) -> StreamingResponse:
    """Même logique que /ask, réponse en NDJSON progressif.

    Événements : meta {mode, sources} -> delta {text}* -> done | error.
    Sur CPU la génération prend 20 à 40 s : le streaming affiche les premiers
    mots en quelques secondes au lieu d'un écran figé.
    """
    prepared = _prepare(req, repo)

    async def events():
        if isinstance(prepared, AskResponse):
            yield _event(type="meta", mode=prepared.mode, sources=[])
            yield _event(type="delta", text=prepared.answer)
            yield _event(type="done")
            return
        hits, sources, user_msg = prepared
        src = [s.model_dump() for s in sources]
        gen = llm.chat_stream(SYSTEM_RULES, user_msg)
        try:
            first = await gen.__anext__()
        except (llm.LLMUnavailable, StopAsyncIteration) as e:
            log.warning("advisor: LLM indisponible (%s), repli glossaire", e)
            fb = _fallback(hits)
            if fb:
                yield _event(type="meta", mode="glossary",
                             sources=[s.model_dump() for s in fb[1]])
                yield _event(type="delta", text=fb[0])
                yield _event(type="done")
            else:
                yield _event(type="error",
                             message="Conseiller momentanément indisponible.")
            return
        yield _event(type="meta", mode="llm", sources=src)
        yield _event(type="delta", text=first)
        try:
            async for piece in gen:
                yield _event(type="delta", text=piece)
            yield _event(type="done")
        except llm.LLMUnavailable as e:
            log.warning("advisor: génération interrompue (%s)", e)
            yield _event(type="error", message="Réponse interrompue, réessaie.")

    return StreamingResponse(events(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-store",
                                      "X-Accel-Buffering": "no"})
