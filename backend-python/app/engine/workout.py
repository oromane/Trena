"""Structure détaillée d'une séance : échauffement / corps / retour au calme.

Les intensités sont exprimées en zones FC (Z1-Z5) et ressenti (RPE),
indépendantes de l'allure : robustes sans historique de course.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Block:
    label: str
    detail: str


def _fmt(minutes: int) -> str:
    if minutes >= 60:
        h, m = divmod(minutes, 60)
        return f"{h}h{m:02d}" if m else f"{h}h"
    return f"{minutes} min"


def describe_session(session_type: str, duration_minutes: int) -> dict:
    """Blocs d'exécution + focus de la séance."""
    d = max(duration_minutes, 20)
    blocks: list[Block]

    if session_type == "INTERVAL":
        warmup = min(15, d // 4)
        cooldown = min(10, d // 5)
        core = d - warmup - cooldown
        reps = max(2, core // 5)  # 3' effort + 2' récup
        blocks = [
            Block("Échauffement", f"{_fmt(warmup)} en Z1-Z2, finir par 3 lignes droites progressives"),
            Block("Corps de séance", f"{reps} × 3 min en Z4-Z5 (RPE 8-9), récupération 2 min en trottinant"),
            Block("Retour au calme", f"{_fmt(cooldown)} en Z1, relâché"),
        ]
        focus = "Courir les répétitions à intensité régulière : la dernière doit être aussi propre que la première."
    elif session_type == "TEMPO":
        warmup = min(15, d // 4)
        cooldown = min(10, d // 5)
        core = d - warmup - cooldown
        blocks = [
            Block("Échauffement", f"{_fmt(warmup)} en Z1-Z2"),
            Block("Corps de séance", f"{_fmt(core)} en continu en Z3-Z4 (RPE 6-7), allure « confortablement difficile »"),
            Block("Retour au calme", f"{_fmt(cooldown)} en Z1"),
        ]
        focus = "Tenir un rythme régulier au seuil : tu dois pouvoir parler par phrases courtes, pas discuter."
    elif session_type == "RECOVERY":
        blocks = [
            Block("Séance complète", f"{_fmt(d)} en Z1 strict (RPE 2-3), FC basse"),
        ]
        focus = "Plus lent que tu ne le penses nécessaire : ici on accélère la récupération, on ne construit rien."
    else:  # ENDURANCE
        blocks = [
            Block("Séance complète", f"{_fmt(d)} en Z2 continu (RPE 4-5), conversation possible"),
        ]
        focus = "Aisance respiratoire du début à la fin ; travaille une cadence fluide (~170-180 pas/min)."

    return {
        "blocks": [{"label": b.label, "detail": b.detail} for b in blocks],
        "focus": focus,
    }
