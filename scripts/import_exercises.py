#!/usr/bin/env python3
"""Import exercices depuis hasaneyldrm/exercises-dataset → Supabase."""
import json
import logging
from pathlib import Path
from typing import Any
import httpx
from datetime import datetime
import os
from dotenv import load_dotenv

# Config
DATASET_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/exercises.json"
BATCH_SIZE = 100

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s - %(message)s")


def fetch_dataset() -> list[dict]:
    """Charge le dataset local."""
    local_path = Path(__file__).parent.parent / "data" / "exercises.json"
    logger.info(f"Charge dataset local depuis {local_path}...")
    try:
        with open(local_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        logger.info(f"✓ {len(data)} exercices chargés")
        return data
    except Exception as e:
        logger.error(f"✗ Échec chargement : {e}")
        raise


def clean_exercise(ex: dict) -> dict | None:
    """Nettoie et valide un exercice selon le schéma réel."""
    try:
        name = str(ex.get("name", "")).strip()
        if not name:
            return None

        # Transformer synergists en array
        synergists_str = str(ex.get("synergists", "")).strip()
        muscles_secondary = []
        if synergists_str:
            muscles_secondary = [m.strip().lower() for m in synergists_str.split(",")]

        # Transformer equipment en array
        equipment_str = str(ex.get("equipment", "")).strip()
        equipment_array = [equipment_str.lower()] if equipment_str else ["bodyweight"]

        return {
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "muscle_primary": str(ex.get("target", "")).lower().strip(),
            "muscles_secondary": muscles_secondary if muscles_secondary else [],  # Array vide au lieu de None
            "equipment": equipment_array,
            "instructions": str(ex.get("instructions", "")).strip() or None,
            "loads_lower_body": "leg" in str(ex.get("target", "")).lower(),
        }
    except Exception as e:
        logger.warning(f"Erreur parsing exercice {ex.get('name')}: {e}")
        return None


def deduplicate(exercises: list[dict]) -> list[dict]:
    """Déduplique par name + muscle_primary."""
    seen = set()
    unique = []
    for ex in exercises:
        key = (ex["name"].lower(), ex["muscle_primary"])
        if key not in seen:
            seen.add(key)
            unique.append(ex)
    return unique


def import_to_supabase(exercises: list[dict], supabase_url: str, service_role_key: str):
    """Insère dans Supabase (batch par 100)."""
    logger.info(f"Initialise Supabase : {supabase_url}")

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }

    # Vérifier table
    try:
        r = httpx.get(
            f"{supabase_url}/rest/v1/exercises?select=id&limit=1",
            headers=headers,
            timeout=10
        )
        if r.status_code == 200:
            logger.info("✓ Table 'exercises' détectée")
        else:
            logger.error(f"✗ Table 'exercises' manquante (status {r.status_code})")
            raise Exception(f"Table not found: {r.text}")
    except Exception as e:
        logger.error(f"✗ Erreur vérification table : {e}")
        raise

    # Import batch
    failed = []
    for i in range(0, len(exercises), BATCH_SIZE):
        batch = exercises[i:i+BATCH_SIZE]
        try:
            r = httpx.post(
                f"{supabase_url}/rest/v1/exercises",
                headers=headers,
                json=batch,
                timeout=10
            )
            if r.status_code in [200, 201]:
                logger.info(f"✓ Batch {i//BATCH_SIZE + 1} : {len(batch)} exercices importés")
            else:
                logger.error(f"✗ Batch {i//BATCH_SIZE + 1} failed (status {r.status_code})")
                logger.error(f"Response: {r.text}")
                if i == 0:  # Afficher le premier exercice envoyé
                    logger.error(f"First exercise: {batch[0]}")
                failed.extend(batch)
        except Exception as e:
            logger.error(f"✗ Batch {i//BATCH_SIZE + 1} failed : {e}")
            failed.extend(batch)

    if failed:
        logger.warning(f"⚠ {len(failed)} exercices non importés")
        return len(exercises) - len(failed)
    return len(exercises)


def main():
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        logger.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes dans .env")
        return 1

    raw = fetch_dataset()
    logger.info(f"Nettoie {len(raw)} exercices...")
    cleaned = [clean_exercise(ex) for ex in raw]
    cleaned = [ex for ex in cleaned if ex]
    logger.info(f"✓ {len(cleaned)} exercices valides")

    unique = deduplicate(cleaned)
    logger.info(f"✓ {len(unique)} exercices uniques")

    try:
        count = import_to_supabase(unique, supabase_url, service_role_key)
        logger.info(f"\n✅ {count} exercices importés avec succès !\n")
        return 0
    except Exception as e:
        logger.error(f"\n❌ Import échoué : {e}\n")
        return 1


if __name__ == "__main__":
    exit(main())
