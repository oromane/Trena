"""Base de connaissances du conseiller : glossaire Trena + recherche BM25.

Source unique pour deux usages :
  - réponse directe sans LLM (glossaire, ou repli si le modèle est indisponible) ;
  - extraits injectés dans le prompt du LLM (RAG), pour qu'il s'appuie sur
    les définitions et seuils réels du moteur plutôt que sur sa mémoire.

Les seuils cités ici doivent rester alignés avec `config.py`, `engine/acwr.py`
et `engine/foster.py` (un test vérifie les principaux).
"""
from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True)
class Entry:
    key: str
    term: str
    aliases: tuple[str, ...]
    text: str


GLOSSARY: tuple[Entry, ...] = (
    Entry(
        "hrv", "HRV (variabilité de la fréquence cardiaque)",
        ("hrv", "rmssd", "variabilité cardiaque", "variabilité"),
        "Le HRV mesure la variation du temps qui sépare deux battements du cœur. "
        "Trena utilise le rMSSD, en millisecondes, mesuré par ta montre pendant "
        "le sommeil. Un HRV élevé pour toi indique que ton système nerveux "
        "parasympathique est actif : tu récupères bien. Une baisse durable "
        "par rapport à ta norme peut venir de la fatigue, du stress, d'un "
        "mauvais sommeil, de l'alcool ou d'un début de maladie. Il est très "
        "individuel : compare-le à ta propre norme, jamais à celle d'une autre "
        "personne.",
    ),
    Entry(
        "zscore", "Norme sur 28 jours et z-score",
        ("z-score", "zscore", "norme", "ligne de base", "baseline", "écart type"),
        "Ta norme est la moyenne de tes 28 derniers jours. Le z-score dit de "
        "combien d'écarts-types la valeur du jour s'éloigne de cette moyenne. "
        "À partir de -1, Trena passe en vigilance. À -1,5 ou moins, associé à "
        "un déficit de sommeil d'au moins 60 minutes, la séance du jour est "
        "ramenée en basse intensité. Il faut au moins 7 jours de données HRV "
        "pour que le calcul soit possible.",
    ),
    Entry(
        "readiness", "Disponibilité du jour (NORMAL, CAUTION, REDUCE)",
        ("readiness", "disponibilité", "normal", "caution", "reduce", "vigilance",
         "prêt", "récupération du jour"),
        "Trena résume ton état du matin en trois niveaux. NORMAL : HRV dans ta "
        "norme, rien ne change. CAUTION : HRV sous ta norme, l'intensité est "
        "plafonnée mais le volume est conservé. REDUCE : HRV très bas et dette "
        "de sommeil, on bascule en basse intensité. Ce n'est pas un diagnostic : "
        "c'est une règle de prudence, et tu restes juge de tes sensations.",
    ),
    Entry(
        "sleep", "Sommeil",
        ("sommeil", "dormir", "dette de sommeil", "nuit"),
        "Trena compare ta durée de sommeil à ta moyenne sur 28 jours. Pour un "
        "adulte, 7 à 9 heures est un repère courant. En dessous de 6 heures on "
        "parle de dette de sommeil. Un déficit de sommeil combiné à un HRV bas "
        "déclenche le niveau REDUCE.",
    ),
    Entry(
        "rhr", "Fréquence cardiaque de repos",
        ("fc repos", "fréquence cardiaque de repos", "pouls", "rhr", "repos"),
        "C'est la fréquence cardiaque la plus basse relevée sur 24 heures. Une "
        "hausse de quelques battements par minute par rapport à ta norme est un "
        "signal précoce possible de fatigue accumulée ou de maladie. Elle se lit "
        "en tendance sur plusieurs jours, pas sur une seule valeur.",
    ),
    Entry(
        "stress", "Score de stress Garmin",
        ("stress", "score de stress"),
        "Score de 0 à 100 calculé par Garmin à partir de la variabilité "
        "cardiaque au repos, moyenné sur la journée. De 0 à 25 : repos. De 26 à "
        "50 : bas. De 51 à 75 : moyen. Au-dessus de 75 : élevé. Un stress "
        "chronique élevé ralentit la récupération entre les séances.",
    ),
    Entry(
        "trimp", "TRIMP (charge d'entraînement)",
        ("trimp", "charge", "impulsion", "training impulse"),
        "Le TRIMP quantifie la charge d'une séance en combinant sa durée et "
        "l'intensité cardiaque (méthode de Banister, basée sur la réserve de "
        "fréquence cardiaque). Il permet d'additionner des séances différentes "
        "(course, vélo, natation) sur une même échelle.",
    ),
    Entry(
        "banister", "Aptitude, fatigue et forme (modèle de Banister)",
        ("banister", "aptitude", "fitness", "fatigue", "forme", "fraîcheur",
         "fraicheur", "form"),
        "Le modèle de Banister suit deux effets de chaque séance : l'aptitude "
        "(ta condition physique, qui s'efface lentement, environ 42 jours par "
        "défaut) et la fatigue (qui s'efface vite, environ 7 jours par défaut). "
        "La forme est aptitude moins fatigue : positive, tu es frais ; négative, "
        "tu es chargé. Les constantes sont calibrées sur ton historique quand il "
        "est suffisant.",
    ),
    Entry(
        "acwr", "ACWR (ratio charge aiguë sur chronique)",
        ("acwr", "ratio", "charge aiguë", "charge chronique", "blessure", "risque"),
        "L'ACWR compare ta charge des 7 derniers jours à celle des 28 derniers. "
        "Entre 0,8 et 1,3 on est dans la zone d'équilibre. En dessous de 0,8, "
        "tu t'entraînes moins que d'habitude. Au-dessus de 1,3 tu montes vite, "
        "et au-delà de 1,5 c'est la zone rouge où le risque de blessure "
        "augmente. C'est un indicateur discuté dans la littérature : à lire "
        "comme un signal de prudence, pas comme une prédiction.",
    ),
    Entry(
        "foster", "Monotonie et strain (Foster)",
        ("monotonie", "foster", "strain", "contrainte", "surentraînement",
         "surentrainement"),
        "La monotonie mesure si ta charge est trop uniforme d'un jour à "
        "l'autre : charge moyenne divisée par écart-type sur 7 jours. Sous 1,5, "
        "la variété est saine. Entre 1,5 et 2, vigilance. À partir de 2, la "
        "charge est trop uniforme et le risque de surentraînement augmente : "
        "alterne jours durs et jours faciles.",
    ),
    Entry(
        "zones", "Zones d'intensité",
        ("zone", "zones", "intensité", "endurance fondamentale", "80 %", "facile"),
        "Les zones d'intensité découpent l'effort selon la fréquence cardiaque. "
        "Le repère le plus solide en endurance est qu'environ 80 % du volume "
        "se fasse en intensité facile, et le reste en intensité soutenue. Le "
        "guide de Trena détaille les zones et leurs sources.",
    ),
    Entry(
        "sync", "Données et synchronisation Garmin",
        ("garmin", "synchronisation", "synchroniser", "données", "montre"),
        "Toutes les données viennent de ta montre Garmin, synchronisées "
        "automatiquement, et manuellement depuis la page Profil. Trena ne "
        "planifie ni n'enregistre de séance : tout ce qui s'affiche vient de la "
        "montre.",
    ),
)

# --------------------------------------------------------------------- BM25
_STOP = frozenset(
    "le la les un une des du de d l au aux et ou a à en est ce c qui que quoi "
    "quel quelle quels quelles dans pour par sur avec mon ma mes ton ta tes "
    "son sa ses je tu il elle on nous vous ils elles se s y ne pas plus ça "
    "cest ca comment pourquoi faut dois peux estce".split()
)


def _norm(text: str) -> str:
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # « z-score » doit rester un seul terme, sinon « score » renvoie au stress.
    return re.sub(r"(?<=[a-z0-9])-(?=[a-z0-9])", "", text)


def tokenize(text: str) -> list[str]:
    out = []
    for tok in re.findall(r"[a-z0-9]+", _norm(text)):
        if len(tok) < 2 or tok in _STOP:
            continue
        if len(tok) > 3 and tok[-1] in "sx":
            tok = tok[:-1]
        out.append(tok)
    return out


class Retriever:
    """BM25 minimal sur les entrées du glossaire (corpus minuscule)."""

    def __init__(self, entries: tuple[Entry, ...] = GLOSSARY,
                 k1: float = 1.5, b: float = 0.75):
        self.entries = entries
        self.k1, self.b = k1, b
        # Les alias comptent double : un terme exact doit dominer.
        self.docs = [
            Counter(tokenize(e.term + " " + " ".join(e.aliases) * 2 + " " + e.text))
            for e in entries
        ]
        self.alias_tokens = [
            set(tokenize(" ".join(e.aliases))) | {e.key} for e in entries
        ]
        self.lens = [sum(d.values()) for d in self.docs]
        self.avg = sum(self.lens) / len(self.lens)
        n = len(self.docs)
        df: Counter = Counter()
        for d in self.docs:
            df.update(d.keys())
        self.idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def search(self, query: str, k: int = 3) -> list[tuple[Entry, float]]:
        q = tokenize(query)
        scored = []
        for entry, doc, ln, aliases in zip(self.entries, self.docs, self.lens,
                                           self.alias_tokens):
            # Un terme nommé explicitement (« HRV ») prime sur les entrées
            # qui le mentionnent seulement dans leur texte.
            s = 3.0 * len(set(q) & aliases)
            for t in q:
                f = doc.get(t, 0)
                if not f:
                    continue
                s += self.idf.get(t, 0.0) * f * (self.k1 + 1) / (
                    f + self.k1 * (1 - self.b + self.b * ln / self.avg)
                )
            if s > 0:
                scored.append((entry, s))
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:k]


_retriever: Retriever | None = None


def get_retriever() -> Retriever:
    global _retriever
    if _retriever is None:
        _retriever = Retriever()
    return _retriever
