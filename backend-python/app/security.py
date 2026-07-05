"""Contrôle d'accès des routes internes.

Le moteur n'est pas exposé publiquement (réseau Docker uniquement), mais on
applique une défense en profondeur : les routes touchant à la base exigent
un en-tête `X-Internal-Key` correspondant à INTERNAL_API_KEY.
Fail-closed : si la clé n'est pas configurée, les routes protégées refusent.
"""
from fastapi import Header, HTTPException

from .config import settings


def require_internal_key(x_internal_key: str = Header(default="")) -> None:
    if not settings.internal_api_key:
        raise HTTPException(
            status_code=503,
            detail="INTERNAL_API_KEY non configurée côté serveur",
        )
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(status_code=401, detail="Clé interne invalide")
