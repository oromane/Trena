#!/usr/bin/env python3
"""Import exercices depuis hasaneyldrm/exercises-dataset -> Supabase.

Source : https://github.com/hasaneyldrm/exercises-dataset (data/exercises.json)
Media (image_url = vignette 180x180, video_url = GIF d'execution) : (c) Gym visual,
reutilises par ce depot avec permission. Reutilisation en dehors de ce depot
regie par les CGU de Gym visual (https://gymvisual.com/content/3-terms-and-conditions-of-use).
Decision produit actee : hotlink direct vers raw.githubusercontent.com (pas de
copie locale), risque IP assume au niveau produit -- voir doc Notion "Module
Musculation - Suivi technique", section catalogue d'exercices.
"""
import json
import logging
import httpx
import os
from dotenv import load_dotenv

# Config
DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json"
MEDIA_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/"
BATCH_SIZE = 100

# Categories du dataset source a exclure du module Musculation (hors perimetre strength)
EXCLUDED_CATEGORIES = {"cardio"}

# Le dataset source n'a pas de champ "type d'exercice" (force / etirement / mobilite),
# uniquement des categories par partie du corps. Heuristique sur le nom pour exclure
# les etirements et le travail de mobilite, hors perimetre du module RIR/tonnage/progression.
EXCLUDED_NAME_KEYWORDS = (
    "stretch",
    "mobility",
    "foam roll",
    "warm-up",
    "warm up",
    "warmup",
    "cool-down",
    "cooldown",
    "self-myofascial",
    "breathing",
)

# Mapping categorie source (body_part) -> taxonomie simplifiee utilisee par le frontend
CATEGORY_MAP = {
    "chest": "chest",
    "back": "back",
    "shoulders": "shoulders",
    "upper arms": "arms",
    "lower arms": "arms",
    "upper legs": "legs",
    "lower legs": "legs",
    "waist": "core",
    "neck": "neck",
}

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s")


def fetch_dataset() -> list[dict]:
    """Telecharge le dataset complet depuis GitHub (raw)."""
    logger.info(f"Telechargement depuis {DATASET_URL}...")
    r = httpx.get(DATASET_URL, timeout=30, follow_redirects=True)
    r.raise_for_status()
    data = r.json()
    logger.info(f"OK {len(data)} exercices telecharges")
    return data


def clean_exercise(ex: dict) -> dict | None:
    """Nettoie et mappe un exercice source vers le schema reel de la table `exercises`."""
    try:
        name = str(ex.get("name", "")).strip()
        if not name:
            return None

        category = str(ex.get("category", "")).strip().lower()
        if category in EXCLUDED_CATEGORIES:
            return None

        name_lower = name.lower()
        if any(kw in name_lower for kw in EXCLUDED_NAME_KEYWORDS):
            return None

        muscle_primary = CATEGORY_MAP.get(category, category or "autre")

        # Muscles secondaires : target (muscle precis) + muscle_group + secondary_muscles, dedupe
        muscles_secondary: list[str] = []
        target = str(ex.get("target", "")).strip().lower()
        if target:
            muscles_secondary.append(target)
        muscle_group = str(ex.get("muscle_group", "")).strip().lower()
        if muscle_group and muscle_group not in muscles_secondary:
            muscles_secondary.append(muscle_group)
        for m in ex.get("secondary_muscles", []) or []:
            m = str(m).strip().lower()
            if m and m not in muscles_secondary:
                muscles_secondary.append(m)

        equipment_str = str(ex.get("equipment", "")).strip().lower()
        equipment_str = equipment_str.replace("body weight", "bodyweight").replace(" ", "_")
        equipment_array = [equipment_str] if equipment_str else ["bodyweight"]

        instructions = ""
        instr_obj = ex.get("instructions") or {}
        if isinstance(instr_obj, dict):
            instructions = str(instr_obj.get("fr") or instr_obj.get("en") or "").strip()

        # Etapes structurees (pour affichage "reperes cles" en liste, pas un paragraphe)
        steps_obj = ex.get("instruction_steps") or {}
        steps_list: list[str] = []
        if isinstance(steps_obj, dict):
            raw_steps = steps_obj.get("fr") or steps_obj.get("en") or []
            if isinstance(raw_steps, list):
                steps_list = [str(s).strip() for s in raw_steps if str(s).strip()]

        image_path = str(ex.get("image", "")).strip()
        gif_path = str(ex.get("gif_url", "")).strip()

        return {
            "name": name,
            "slug": name.lower().replace(" ", "-").replace("/", "-"),
            "muscle_primary": muscle_primary,
            "muscles_secondary": muscles_secondary,
            "equipment": equipment_array,
            "instructions": instructions or None,
            "instructions_steps": steps_list,
            "loads_lower_body": muscle_primary == "legs",
            "image_url": (MEDIA_BASE + image_path) if image_path else None,
            "video_url": (MEDIA_BASE + gif_path) if gif_path else None,
        }
    except Exception as e:
        logger.warning(f"Erreur parsing exercice {ex.get('name')}: {e}")
        return None


def deduplicate(exercises: list[dict]) -> list[dict]:
    """Deduplique par name + muscle_primary."""
    seen = set()
    unique = []
    for ex in exercises:
        key = (ex["name"].lower(), ex["muscle_primary"])
        if key not in seen:
            seen.add(key)
            unique.append(ex)
    return unique


def import_to_supabase(exercises: list[dict], supabase_url: str, service_role_key: str) -> int:
    """Insere dans Supabase (batch par 100)."""
    logger.info(f"Initialise Supabase : {supabase_url}")

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    r = httpx.get(
        f"{supabase_url}/rest/v1/exercises?select=id&limit=1",
        headers=headers,
        timeout=10,
    )
    if r.status_code != 200:
        raise Exception(f"Table 'exercises' inaccessible (status {r.status_code}): {r.text}")
    logger.info("OK Table 'exercises' detectee")

    failed = []
    for i in range(0, len(exercises), BATCH_SIZE):
        batch = exercises[i : i + BATCH_SIZE]
        try:
            r = httpx.post(
                f"{supabase_url}/rest/v1/exercises",
                headers=headers,
                json=batch,
                timeout=20,
            )
            if r.status_code in (200, 201, 204):
                logger.info(f"OK Batch {i // BATCH_SIZE + 1} : {len(batch)} exercices importes")
            else:
                logger.error(f"ECHEC Batch {i // BATCH_SIZE + 1} (status {r.status_code})")
                logger.error(f"Response: {r.text[:500]}")
                if i == 0:
                    logger.error(f"Premier exercice envoye: {batch[0]}")
                failed.extend(batch)
        except Exception as e:
            logger.error(f"ECHEC Batch {i // BATCH_SIZE + 1} : {e}")
            failed.extend(batch)

    if failed:
        logger.warning(f"ATTENTION {len(failed)} exercices non importes")
    return len(exercises) - len(failed)


def main():
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        logger.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes dans .env")
        return 1

    raw = fetch_dataset()
    logger.info(f"Nettoie {len(raw)} exercices (exclusion categories: {EXCLUDED_CATEGORIES})...")
    cleaned = [clean_exercise(ex) for ex in raw]
    cleaned = [ex for ex in cleaned if ex]
    logger.info(f"OK {len(cleaned)} exercices valides apres filtrage")

    unique = deduplicate(cleaned)
    logger.info(f"OK {len(unique)} exercices uniques")

    try:
        count = import_to_supabase(unique, supabase_url, service_role_key)
        logger.info(f"\n{count} exercices importes avec succes !\n")
        return 0
    except Exception as e:
        logger.error(f"\nImport echoue : {e}\n")
        return 1


if __name__ == "__main__":
    exit(main())
