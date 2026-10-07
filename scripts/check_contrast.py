#!/usr/bin/env python3
"""Contrôle du contraste des couleurs de TEXTE de Trena (WCAG 2.1, ticket P3-12).

Lit les variables `--ats-*` de frontend/app/globals.css (thèmes sombre et
clair) et vérifie chaque couleur de texte sur chaque surface. Échoue (code 1)
si une paire passe sous son seuil. Sans dépendance : lancé tel quel en CI.

Seuils : 4,5:1 (AA texte normal) sur fond et carte, 3:1 sur les cartes
imbriquées (card2), réservées aux titres et éléments d'interface.
"""
import re
import sys
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "frontend" / "app" / "globals.css"
TEXTS = ("text", "muted", "gray", "green-fg", "blue-fg", "orange-fg", "red-fg", "violet-fg")
SURFACES = {"bg": 4.5, "bg2": 4.5, "card": 4.5, "card2": 3.0}


def luminance(rgb):
    def chan(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def ratio(a, b):
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def block(css: str, selector: str) -> dict:
    m = re.search(re.escape(selector) + r"\s*\{(.*?)\}", css, re.S)
    if not m:
        sys.exit(f"Bloc {selector} introuvable dans {CSS}")
    return {k: tuple(int(x) for x in v.split())
            for k, v in re.findall(r"--ats-([\w-]+):\s*(\d+ \d+ \d+)\s*;", m.group(1))}


def main() -> int:
    css = CSS.read_text(encoding="utf-8")
    dark = block(css, ":root")
    themes = {"sombre": dark, "clair": {**dark, **block(css, "[data-theme='light']")}}
    failures = []
    for theme, tokens in themes.items():
        for t in TEXTS:
            if t not in tokens:
                failures.append(f"[{theme}] jeton --ats-{t} absent")
                continue
            for s, minimum in SURFACES.items():
                r = ratio(tokens[t], tokens[s])
                if r < minimum:
                    failures.append(f"[{theme}] {t} sur {s} : {r:.2f}:1 < {minimum}:1")
    if failures:
        print("Contraste insuffisant :\n  " + "\n  ".join(failures))
        return 1
    print(f"Contraste OK : {len(TEXTS)} couleurs de texte x {len(SURFACES)} surfaces x 2 thèmes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
