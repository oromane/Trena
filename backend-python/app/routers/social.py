"""Amis et partage.

- GET  /social/me      : mon code ami, mes préférences, mes amis et demandes.
- POST /social/code    : (re)génère mon code ami (invalide l'ancien).
- POST /social/request : demande d'ami à partir d'un code.
- POST /social/respond : accepter / refuser une demande reçue.
- POST /social/remove  : retirer un ami ou annuler une demande.
- POST /social/prefs   : ce que je partage (séances, forme du jour).
- GET  /social/feed    : ce que mes amis partagent avec moi.

Contrôle d'accès (le cœur de ce module) : l'identité `user_id` vient de la
session côté Next.js. Une relation n'est modifiable que par l'un de ses deux
membres ; les données d'un ami ne sont lues que si l'amitié est ACCEPTÉE et
selon SES préférences. La physiologie partagée se limite au niveau de forme,
jamais aux valeurs brutes.
"""
from __future__ import annotations

import logging
import secrets
import time
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db.repo import SupabaseRepo, get_repo
from ..engine import activity_compare
from ..security import require_internal_key
from .dashboard import _discipline_meta, _physio_readiness

log = logging.getLogger(__name__)

router = APIRouter(prefix="/social", tags=["social"],
                   dependencies=[Depends(require_internal_key)])

# Sans 0/O, 1/I/L : se dicte et se recopie sans ambiguïté.
CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LEN = 8
MAX_REQUESTS_PER_HOUR = 10   # borne la recherche de codes par force brute
FEED_DAYS = 14
FEED_SIZE = 5

_requests: dict[str, deque] = defaultdict(deque)


def new_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LEN))


def normalize_code(code: str) -> str:
    return "".join(c for c in code.upper() if c.isalnum())


def _display_name(profile: dict | None) -> str:
    name = ((profile or {}).get("full_name") or "").strip()
    return name.split(" ")[0] if name else "Athlète"


def _other(f: dict, user_id: str) -> str:
    return f["addressee_id"] if f["requester_id"] == user_id else f["requester_id"]


def _own_friendship(repo: SupabaseRepo, user_id: str, friendship_id: str) -> dict:
    """La relation, seulement si l'utilisateur en est membre (sinon 404)."""
    for f in repo.list_friendships(user_id):
        if f["id"] == friendship_id:
            return f
    raise HTTPException(status_code=404, detail="Relation introuvable.")


# ------------------------------------------------------------------- moi
@router.get("/me")
def me(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    profile = repo.get_profile(user_id) or {}
    code = profile.get("friend_code")
    if not code:
        code = _set_new_code(repo, user_id)
    friendships = repo.list_friendships(user_id)
    others = repo.get_profiles([_other(f, user_id) for f in friendships])
    friends, incoming, outgoing = [], [], []
    for f in friendships:
        item = {"friendship_id": f["id"],
                "name": _display_name(others.get(_other(f, user_id)))}
        if f["status"] == "accepted":
            friends.append(item)
        elif f["addressee_id"] == user_id:
            incoming.append(item)
        else:
            outgoing.append(item)
    return {
        "friend_code": code,
        "prefs": {"share_activities": profile.get("share_activities", True),
                  "share_physio": profile.get("share_physio", False)},
        "friends": friends, "incoming": incoming, "outgoing": outgoing,
    }


def _set_new_code(repo: SupabaseRepo, user_id: str) -> str:
    for _ in range(5):   # collision improbable (31^8), on réessaie quand même
        code = new_code()
        try:
            repo.update_profile(user_id, {"friend_code": code})
            return code
        except httpx.HTTPStatusError as e:
            if e.response is not None and e.response.status_code == 409:
                continue
            raise
    raise HTTPException(status_code=500, detail="Génération du code impossible.")


class UserOnly(BaseModel):
    user_id: str


@router.post("/code")
def regenerate_code(req: UserOnly, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    return {"friend_code": _set_new_code(repo, req.user_id)}


class PrefsRequest(BaseModel):
    user_id: str
    share_activities: bool
    share_physio: bool


@router.post("/prefs")
def set_prefs(req: PrefsRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    repo.update_profile(req.user_id, {"share_activities": req.share_activities,
                                      "share_physio": req.share_physio})
    return {"share_activities": req.share_activities, "share_physio": req.share_physio}


# ------------------------------------------------------------- demandes
class FriendRequest(BaseModel):
    user_id: str
    code: str = Field(min_length=4, max_length=20)


def _rate_limit(user_id: str) -> None:
    now = time.monotonic()
    q = _requests[user_id]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= MAX_REQUESTS_PER_HOUR:
        raise HTTPException(status_code=429, detail="Trop d'essais, réessaie dans une heure.")
    q.append(now)


@router.post("/request")
def send_request(req: FriendRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    _rate_limit(req.user_id)
    target = repo.get_profile_by_code(normalize_code(req.code))
    if not target:
        raise HTTPException(status_code=404, detail="Aucun compte avec ce code.")
    if target["id"] == req.user_id:
        raise HTTPException(status_code=400, detail="C'est ton propre code.")
    for f in repo.list_friendships(req.user_id):
        if _other(f, req.user_id) != target["id"]:
            continue
        if f["status"] == "accepted":
            return {"status": "accepted", "name": _display_name(target)}
        if f["addressee_id"] == req.user_id:
            # Il m'avait déjà invité : saisir son code vaut acceptation.
            repo.update_friendship(f["id"], {"status": "accepted",
                                             "responded_at": _now()})
            return {"status": "accepted", "name": _display_name(target)}
        return {"status": "pending", "name": _display_name(target)}
    repo.insert_friendship(req.user_id, target["id"])
    return {"status": "pending", "name": _display_name(target)}


class RespondRequest(BaseModel):
    user_id: str
    friendship_id: str
    accept: bool


@router.post("/respond")
def respond(req: RespondRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    f = _own_friendship(repo, req.user_id, req.friendship_id)
    # Seul le destinataire d'une demande en attente peut l'accepter.
    if f["status"] != "pending" or f["addressee_id"] != req.user_id:
        raise HTTPException(status_code=403, detail="Demande non modifiable.")
    if req.accept:
        repo.update_friendship(f["id"], {"status": "accepted", "responded_at": _now()})
        return {"status": "accepted"}
    repo.delete_friendship(f["id"])
    return {"status": "declined"}


class RemoveRequest(BaseModel):
    user_id: str
    friendship_id: str


@router.post("/remove")
def remove(req: RemoveRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    f = _own_friendship(repo, req.user_id, req.friendship_id)
    repo.delete_friendship(f["id"])
    return {"status": "removed"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----------------------------------------------------------------- flux
@router.get("/feed")
def feed(user_id: str, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    """Ce que mes amis ACCEPTÉS partagent avec moi, selon LEURS préférences."""
    today = date.today()
    accepted = [f for f in repo.list_friendships(user_id) if f["status"] == "accepted"]
    profiles = repo.get_profiles([_other(f, user_id) for f in accepted])
    loaders = {_other(f, user_id): (
        lambda fid=_other(f, user_id): _friend_sessions(repo, fid, today),
        lambda fid=_other(f, user_id): repo.get_metrics_history(fid, days=28, until=today),
    ) for f in accepted}
    return {"friends": build_feed(user_id, accepted, profiles, loaders, today)}


def _friend_sessions(repo: SupabaseRepo, friend_id: str, today: date) -> list[dict]:
    return repo.get_sessions_between(
        friend_id, today - timedelta(days=activity_compare.HISTORY_DAYS + FEED_DAYS), today)


def build_feed(user_id: str, accepted: list[dict], profiles: dict,
               loaders: dict, today: date) -> list[dict]:
    """Flux des amis. `loaders[fid]` = (séances(), métriques()) : fonctions
    appelées seulement si l'ami partage la catégorie correspondante, ou
    valeurs déjà chargées (listes)."""
    def get(v):
        return v() if callable(v) else v

    out = []
    for f in accepted:
        fid = _other(f, user_id)
        p = profiles.get(fid) or {}
        load_sessions, load_metrics = loaders.get(fid, (list, list))
        item = {"friendship_id": f["id"], "name": _display_name(p),
                "shares_activities": bool(p.get("share_activities", True)),
                "shares_physio": bool(p.get("share_physio", False)),
                "week": None, "recent": [], "readiness": None}
        if item["shares_activities"]:
            try:
                item.update(_activity_block(get(load_sessions), today))
            except Exception:
                log.exception("social_feed: séances indisponibles")
        if item["shares_physio"]:
            try:
                # Niveau uniquement : jamais HRV, sommeil ou FC bruts.
                item["readiness"] = _physio_readiness(
                    None, fid, today, metrics=get(load_metrics))["readiness"]["level"]
            except Exception:
                log.exception("social_feed: forme indisponible")
        out.append(item)
    return out


def _activity_block(sessions: list[dict], today: date) -> dict:
    done = [s for s in sessions if s.get("status") == "COMPLETED"]
    week_start = today - timedelta(days=today.weekday())
    week = {"sessions": 0, "minutes": 0, "distance_m": 0}
    for s in done:
        if s["scheduled_date"] >= week_start.isoformat():
            week["sessions"] += 1
            week["minutes"] += s.get("duration_actual_minutes") or 0
            week["distance_m"] += s.get("distance_m") or 0
    recent_src = sorted(
        (s for s in done if s["scheduled_date"] >= (today - timedelta(days=FEED_DAYS)).isoformat()),
        key=lambda s: s["scheduled_date"], reverse=True)[:FEED_SIZE]
    recent = []
    for s in recent_src:
        meta = _discipline_meta(s.get("discipline"))
        a = activity_compare.analyze(s, activity_compare.history_for(s, done))
        # Champs choisis : ni FC, ni TRIMP, ni métriques détaillées.
        recent.append({
            "date": s["scheduled_date"], "discipline": meta["discipline"],
            "discipline_label": meta["label"], "icon": meta["icon"],
            "accent": meta["accent"], "title": s.get("title"),
            "duration_minutes": s.get("duration_actual_minutes"),
            "distance_m": s.get("distance_m"),
            "headline": a.headline, "tags": a.tags,
        })
    return {"week": week, "recent": recent}
