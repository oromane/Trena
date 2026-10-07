"""Accueil en un seul appel (ticket P1-4, reciblé).

Avant : le dashboard appelait 4 routes (overview, analyse du jour, amis,
profil) qui relisaient chacune métriques et séances, avec jusqu'à 4
allers-retours Supabase enchaînés côté amis.

Ici : chaque donnée est lue UNE fois, en deux vagues de requêtes parallèles,
puis réutilisée par tous les blocs :
  vague 1 : mes métriques 28 j, mes séances 120 j, mon profil, l'analyse du
            jour stockée, mes amitiés ;
  vague 2 : commentaires des séances récentes, profils des amis, séances et
            métriques des amis acceptés.
La vague 2 lit les données des amis avant de connaître leurs préférences
(gain d'un aller-retour) : elles ne sortent du moteur que si l'ami les
partage, le filtrage reste celui de social.build_feed.
"""
from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..advisor import daily
from ..advisor.context import build_context
from ..db.repo import SupabaseRepo, get_repo
from ..security import require_internal_key
from . import dashboard, social

log = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"],
                   dependencies=[Depends(require_internal_key)])

# Le client httpx du repo est partagé et sûr entre threads.
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="home")


class HomeRequest(BaseModel):
    user_id: str
    date: date_type | None = None


def _safe(fn, default, label: str):
    def run():
        try:
            return fn()
        except Exception:
            log.warning("home: %s indisponible", label, exc_info=True)
            return default
    return run


@router.post("/home")
def home(req: HomeRequest, repo: SupabaseRepo = Depends(get_repo)) -> dict:
    t0 = time.perf_counter()
    uid = req.user_id
    today = req.date or date_type.today()

    # ------------------------------------------------------------ vague 1
    f_metrics = _pool.submit(repo.get_metrics_history, uid, 28, today)
    f_sessions = _pool.submit(repo.get_sessions_between, uid,
                              today - timedelta(days=dashboard.OVERVIEW_HISTORY_DAYS), today)
    f_profile = _pool.submit(_safe(lambda: repo.get_profile(uid), None, "profil"))
    f_daily = _pool.submit(_safe(lambda: repo.get_advisor_daily(uid, today), None,
                                 "analyse du jour"))
    f_friends = _pool.submit(_safe(lambda: repo.list_friendships(uid), [], "amitiés"))

    metrics, sessions = f_metrics.result(), f_sessions.result()
    friendships = f_friends.result()
    accepted = [f for f in friendships if f.get("status") == "accepted"]
    friend_ids = [social._other(f, uid) for f in accepted]

    # ------------------------------------------------------------ vague 2
    recent = dashboard.recent_completed(sessions, today)
    f_comments = _pool.submit(dashboard._load_comments, repo, uid, [s["id"] for s in recent])
    f_profiles = _pool.submit(_safe(lambda: repo.get_profiles(friend_ids), {}, "profils amis"))
    f_friend_data = {
        fid: (_pool.submit(_safe(lambda fid=fid: social._friend_sessions(repo, fid, today),
                                 [], "séances ami")),
              _pool.submit(_safe(lambda fid=fid: repo.get_metrics_history(fid, 28, today),
                                 [], "métriques ami")))
        for fid in friend_ids
    }

    # ------------------------------------------------------------ calculs
    pr = dashboard._physio_readiness(None, uid, today, metrics=metrics)
    overview = dashboard.build_overview(today, pr, sessions, f_comments.result())
    advisor_daily = daily.resolve(
        today, f_daily.result(),
        lambda: build_context(None, uid, today, metrics=metrics, sessions=sessions))
    loaders = {fid: (fs.result(), fm.result()) for fid, (fs, fm) in f_friend_data.items()}
    friends = social.build_feed(uid, accepted, f_profiles.result(), loaders, today)
    profile = f_profile.result() or {}

    log.info("home: %.0f ms", (time.perf_counter() - t0) * 1000)
    return {
        "overview": overview,
        "daily": advisor_daily,
        "friends": friends,
        "profile": {"full_name": profile.get("full_name")},
    }
