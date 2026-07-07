"""Bibliothèque de séances structurées, paramétrables.

Chaque modèle expose des paramètres (répétitions, durées...) et construit
une séance complète : titre, type, durée, TRIMP estimé et structure
détaillée (blocs) affichée dans le cockpit et le calendrier.

Intensités exprimées en zones FC (Z1-Z5) ; le TRIMP estimé dérive du
temps passé par zone (facteurs alignés sur plan_generator.TRIMP_PER_MIN).
"""
from __future__ import annotations

# TRIMP par minute selon la zone
ZONE_TRIMP = {1: 0.8, 2: 1.2, 3: 2.0, 4: 2.5, 5: 3.0}


def _fmt(minutes: float) -> str:
    m = round(minutes)
    if m >= 60:
        h, r = divmod(m, 60)
        return f"{h}h{r:02d}" if r else f"{h}h"
    return f"{m} min"


class _Builder:
    """Accumule les blocs et calcule durée + TRIMP."""

    def __init__(self) -> None:
        self.blocks: list[dict] = []
        self.minutes = 0.0
        self.trimp = 0.0

    def add(self, label: str, detail: str, minutes: float, zone: float) -> None:
        self.blocks.append({"label": label, "detail": detail})
        self.minutes += minutes
        # zone fractionnaire (ex 4.5) : interpolation
        lo, hi = int(zone), min(int(zone) + 1, 5)
        frac = zone - int(zone)
        per_min = ZONE_TRIMP[lo] * (1 - frac) + ZONE_TRIMP[hi] * frac
        self.trimp += minutes * per_min


def _wu_cd(b: _Builder, wu: int = 15, cd: int = 10) -> None:
    b.add("Échauffement", f"{_fmt(wu)} en Z1-Z2, finir par 3 lignes droites", wu, 1.5)


def _cd(b: _Builder, cd: int = 10) -> None:
    b.add("Retour au calme", f"{_fmt(cd)} en Z1, relâché", cd, 1.0)


# --------------------------------------------------------------- modèles
def _thirty_thirty(p: dict) -> tuple[_Builder, str]:
    reps, sets = int(p["reps"]), int(p["sets"])
    b = _Builder()
    _wu_cd(b)
    for s in range(sets):
        b.add(f"Série {s + 1}",
              f"{reps} × (30 s en Z5 / 30 s trot en Z1)", reps, 3.0)
        if s < sets - 1:
            b.add("Récupération inter-série", "3 min marche/trot en Z1", 3, 1.0)
    _cd(b)
    return b, "Vitesse constante sur chaque 30 s : la dernière répétition doit ressembler à la première."


def _track_1000(p: dict) -> tuple[_Builder, str]:
    reps, rec = int(p["reps"]), float(p["recovery_min"])
    interval = float(p["interval_min"])
    b = _Builder()
    _wu_cd(b, wu=20)
    b.add("Corps de séance",
          f"{reps} × {_fmt(interval)} en Z4-Z5 (allure 5-10 km), "
          f"récupération {_fmt(rec)} en trottinant",
          reps * interval + (reps - 1) * rec, 3.8)
    _cd(b)
    return b, "La séance de piste type préparation marathon élite : régularité au mètre près, pas de départ trop rapide."


def _pyramid(p: dict) -> tuple[_Builder, str]:
    peak = int(p["peak_min"])
    steps = list(range(1, peak + 1)) + list(range(peak - 1, 0, -1))
    work = sum(steps)
    b = _Builder()
    _wu_cd(b)
    seq = " - ".join(str(s) for s in steps)
    b.add("Pyramide",
          f"{seq} min en Z4, récupération = moitié du temps d'effort en Z1",
          work * 1.5, 3.2)
    _cd(b)
    return b, "Gère l'effort en montée de pyramide pour tenir les paliers descendants à la même allure."


def _fartlek(p: dict) -> tuple[_Builder, str]:
    total, surges = int(p["total_min"]), int(p["surges"])
    b = _Builder()
    _wu_cd(b, wu=10)
    b.add("Fartlek",
          f"{_fmt(total)} en Z2 avec {surges} accélérations libres de 1 à 2 min en Z4-Z5, au ressenti",
          total, 2.2)
    _cd(b, cd=5)
    return b, "Jeu de course : accélère quand tu le sens (côte, ligne droite), sans regarder la montre."


def _progressive_tempo(p: dict) -> tuple[_Builder, str]:
    core = int(p["core_min"])
    third = core / 3
    b = _Builder()
    _wu_cd(b)
    b.add("Bloc 1", f"{_fmt(third)} en Z2, aisance totale", third, 2.0)
    b.add("Bloc 2", f"{_fmt(third)} en Z3, rythme soutenu", third, 2.0)
    b.add("Bloc 3", f"{_fmt(third)} en Z4, proche allure course", third, 2.5)
    _cd(b)
    return b, "Chaque tiers plus rapide que le précédent : finis plus vite que tu n'as commencé, jamais l'inverse."


def _long_run_blocks(p: dict) -> tuple[_Builder, str]:
    total, blocks, block_min = int(p["total_min"]), int(p["blocks"]), int(p["block_min"])
    easy = total - blocks * block_min
    b = _Builder()
    b.add("Base", f"{_fmt(easy)} en Z2 répartis autour des blocs", easy, 1.2)
    b.add("Blocs allure",
          f"{blocks} × {_fmt(block_min)} en Z3 (allure objectif), intégrés dans la sortie",
          blocks * block_min, 2.0)
    return b, "La sortie longue qui apprend au corps à courir vite sur de la fatigue : blocs en seconde moitié de préférence."


def _hills(p: dict) -> tuple[_Builder, str]:
    reps = int(p["reps"])
    b = _Builder()
    _wu_cd(b)
    b.add("Côtes",
          f"{reps} × 45 s en côte (5-8 %) en Z5, descente en marchant/trottinant (~90 s)",
          reps * 2.25, 2.8)
    _cd(b)
    return b, "Force spécifique : buste droit, genoux hauts, pose d'appui dynamique. L'allure importe moins que l'engagement."


TEMPLATES: dict[str, dict] = {
    "thirty_thirty": {
        "name": "30/30 VMA",
        "session_type": "INTERVAL",
        "description": "Le classique du développement VMA : 30 s vite / 30 s trot, en séries.",
        "params": [
            {"key": "reps", "label": "Répétitions par série", "default": 10, "min": 6, "max": 20},
            {"key": "sets", "label": "Séries", "default": 2, "min": 1, "max": 4},
        ],
        "build": _thirty_thirty,
    },
    "track_1000": {
        "name": "Intervalles piste (type Kipchoge)",
        "session_type": "INTERVAL",
        "description": "Répétitions longues à allure contrôlée, récupération courte : la base des préparations élites.",
        "params": [
            {"key": "reps", "label": "Répétitions", "default": 8, "min": 4, "max": 15},
            {"key": "interval_min", "label": "Durée de l'effort (min)", "default": 4, "min": 2, "max": 6},
            {"key": "recovery_min", "label": "Récupération (min)", "default": 1.5, "min": 1, "max": 3},
        ],
        "build": _track_1000,
    },
    "pyramid": {
        "name": "Pyramide",
        "session_type": "INTERVAL",
        "description": "Efforts croissants puis décroissants (1-2-3-2-1...) en Z4.",
        "params": [
            {"key": "peak_min", "label": "Sommet (min)", "default": 3, "min": 2, "max": 5},
        ],
        "build": _pyramid,
    },
    "fartlek": {
        "name": "Fartlek",
        "session_type": "INTERVAL",
        "description": "Jeu d'allures libre en nature : accélérations au ressenti sur une base Z2.",
        "params": [
            {"key": "total_min", "label": "Durée du corps (min)", "default": 40, "min": 20, "max": 70},
            {"key": "surges", "label": "Accélérations", "default": 8, "min": 4, "max": 15},
        ],
        "build": _fartlek,
    },
    "progressive_tempo": {
        "name": "Tempo progressif",
        "session_type": "TEMPO",
        "description": "Trois tiers de plus en plus rapides : Z2 → Z3 → Z4.",
        "params": [
            {"key": "core_min", "label": "Durée du corps (min)", "default": 30, "min": 20, "max": 60},
        ],
        "build": _progressive_tempo,
    },
    "long_run_blocks": {
        "name": "Sortie longue à blocs",
        "session_type": "ENDURANCE",
        "description": "Sortie longue Z2 avec blocs à allure objectif intégrés.",
        "params": [
            {"key": "total_min", "label": "Durée totale (min)", "default": 105, "min": 60, "max": 180},
            {"key": "blocks", "label": "Blocs allure", "default": 2, "min": 1, "max": 4},
            {"key": "block_min", "label": "Durée d'un bloc (min)", "default": 10, "min": 5, "max": 20},
        ],
        "build": _long_run_blocks,
    },
    "hills": {
        "name": "Côtes",
        "session_type": "INTERVAL",
        "description": "Répétitions courtes en côte : force et économie de course.",
        "params": [
            {"key": "reps", "label": "Répétitions", "default": 10, "min": 6, "max": 16},
        ],
        "build": _hills,
    },
}


def list_templates() -> list[dict]:
    return [
        {"id": tid, "name": t["name"], "session_type": t["session_type"],
         "description": t["description"], "params": t["params"]}
        for tid, t in TEMPLATES.items()
    ]


def build_from_template(template_id: str, params: dict | None = None) -> dict:
    """Construit une séance complète depuis un modèle + paramètres.

    Raises:
        KeyError: modèle inconnu.
        ValueError: paramètre hors bornes.
    """
    t = TEMPLATES[template_id]
    values: dict = {}
    for spec in t["params"]:
        raw = (params or {}).get(spec["key"], spec["default"])
        try:
            val = float(raw)
        except (TypeError, ValueError):
            raise ValueError(f"paramètre {spec['key']} invalide")
        if not spec["min"] <= val <= spec["max"]:
            raise ValueError(
                f"{spec['label']} doit être entre {spec['min']} et {spec['max']}"
            )
        values[spec["key"]] = val

    builder, focus = t["build"](values)
    return {
        "title": t["name"],
        "session_type": t["session_type"],
        "duration_minutes": max(10, round(builder.minutes)),
        "target_trimp": round(builder.trimp),
        "structure": {"blocks": builder.blocks, "focus": focus},
    }


# ------------------------------------------------- constructeur libre
# Séance entièrement personnalisée, à la Garmin : liste d'étapes libres
# (durée + zone + libellé) et blocs répétés N fois.
#
# Format d'entrée :
#   {"title": "Ma séance", "steps": [
#       {"kind": "step", "label": "Échauffement", "minutes": 15, "zone": 2},
#       {"kind": "repeat", "times": 6, "steps": [
#           {"kind": "step", "label": "Effort", "minutes": 3, "zone": 5},
#           {"kind": "step", "label": "Récup", "minutes": 2, "zone": 1}]},
#       {"kind": "step", "label": "Retour au calme", "minutes": 10, "zone": 1}]}

MAX_STEPS = 30
ZONE_LABELS = {1: "Z1 très facile", 2: "Z2 endurance", 3: "Z3 soutenu",
               4: "Z4 seuil", 5: "Z5 maximal"}


def _validate_step(s: dict) -> tuple[str, float, int]:
    label = str(s.get("label") or "Étape").strip()[:60]
    try:
        minutes = float(s.get("minutes", 0))
        zone = int(s.get("zone", 2))
    except (TypeError, ValueError):
        raise ValueError("étape invalide : minutes/zone numériques requis")
    if not 0.5 <= minutes <= 180:
        raise ValueError("chaque étape doit durer entre 0,5 et 180 minutes")
    if zone not in ZONE_TRIMP:
        raise ValueError("zone doit être comprise entre 1 et 5")
    return label, minutes, zone


def _dominant_type(zone_minutes: dict[int, float]) -> str:
    """Type de séance déduit du temps passé en intensité."""
    hard = zone_minutes.get(4, 0) + zone_minutes.get(5, 0)
    tempo = zone_minutes.get(3, 0)
    total = sum(zone_minutes.values()) or 1
    if hard / total >= 0.15:
        return "INTERVAL"
    if tempo / total >= 0.25:
        return "TEMPO"
    if (zone_minutes.get(1, 0)) / total >= 0.8:
        return "RECOVERY"
    return "ENDURANCE"


def build_custom_workout(title: str, steps: list[dict]) -> dict:
    """Construit une séance depuis des étapes libres (style Garmin).

    Raises:
        ValueError: structure invalide (bornes, imbrication, nombre d'étapes).
    """
    if not steps:
        raise ValueError("au moins une étape est requise")
    title = (title or "Séance personnalisée").strip()[:100]

    b = _Builder()
    zone_minutes: dict[int, float] = {}
    n_steps = 0

    for item in steps:
        kind = item.get("kind", "step")
        if kind == "repeat":
            try:
                times = int(item.get("times", 0))
            except (TypeError, ValueError):
                raise ValueError("répétitions invalides")
            if not 2 <= times <= 30:
                raise ValueError("un bloc doit être répété entre 2 et 30 fois")
            inner = item.get("steps") or []
            if not inner:
                raise ValueError("un bloc répété doit contenir au moins une étape")
            parts, block_min = [], 0.0
            for s in inner:
                if s.get("kind") == "repeat":
                    raise ValueError("blocs répétés imbriqués non autorisés")
                label, minutes, zone = _validate_step(s)
                n_steps += 1
                parts.append(f"{_fmt(minutes)} {label} en {ZONE_LABELS[zone]}")
                block_min += minutes
                zone_minutes[zone] = zone_minutes.get(zone, 0) + minutes * times
            b.blocks.append({
                "label": f"{times} × bloc",
                "detail": " + ".join(parts),
            })
            # durée et TRIMP du bloc complet
            for s in inner:
                _, minutes, zone = _validate_step(s)
                b.minutes += minutes * times
                b.trimp += minutes * times * ZONE_TRIMP[zone]
        else:
            label, minutes, zone = _validate_step(item)
            n_steps += 1
            zone_minutes[zone] = zone_minutes.get(zone, 0) + minutes
            b.add(label, f"{_fmt(minutes)} en {ZONE_LABELS[zone]}", minutes, zone)

        if n_steps > MAX_STEPS:
            raise ValueError(f"maximum {MAX_STEPS} étapes")

    if b.minutes < 10 or b.minutes > 360:
        raise ValueError("durée totale entre 10 min et 6 h requise")

    return {
        "title": title,
        "session_type": _dominant_type(zone_minutes),
        "duration_minutes": round(b.minutes),
        "target_trimp": round(b.trimp),
        "structure": {
            "blocks": b.blocks,
            "focus": "Séance personnalisée : respecte les zones étape par étape, "
                     "la régularité prime sur l'intensité.",
        },
    }
