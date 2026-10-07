"""Aiguillage des questions : seules les questions libres passent par le LLM.

Sur un VPS sans GPU, une génération prend 1 à 2 minutes. La plupart des
questions n'en ont pas besoin :
  - definition : « c'est quoi le HRV ? »          -> glossaire, instantané
  - today      : « comment je récupère ce matin ? » -> analyse du jour, instantané
  - open       : le reste                          -> LLM (lent)
"""
from __future__ import annotations

import re
import unicodedata

_DEFINITION = re.compile(
    r"\b(c ?est quoi|qu ?est ?ce|que (veut|veulent) dire|que signifie|signifie|"
    r"veut dire|definition|defini|explique|a quoi sert|comment (est|sont) calcule|"
    r"comment (ca|cela) marche|comment fonctionne|pourquoi)\b"
)
_PERSONAL = re.compile(
    r"\b(mon|ma|mes|je|j|me|moi|suis|dois|aujourd ?hui|ce matin|ce soir|"
    r"cette nuit|hier|demain)\b"
)
_STATE = re.compile(
    r"\b(hrv|variabilite|sommeil|dormi|nuit|recup\w*|forme|fatigue\w*|stress|"
    r"fc|frequence|repos|etat|pret|disponibilite|seance|entrainer|entrainement|"
    r"courir|intensite|z ?score|norme)\b"
)


def _clean(question: str) -> str:
    text = unicodedata.normalize("NFD", question.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Apostrophes et tirets -> espaces : « c'est » -> « c est », « suis-je » -> « suis je »
    return re.sub(r"[’'\-]", " ", text)


def classify(question: str, has_glossary_hit: bool) -> str:
    q = _clean(question)
    personal = bool(_PERSONAL.search(q))
    if _DEFINITION.search(q) and not personal and has_glossary_hit:
        return "definition"
    if personal and _STATE.search(q):
        return "today"
    return "open"
