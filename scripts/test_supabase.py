#!/usr/bin/env python3
"""Test de connexion Supabase."""
import os
from dotenv import load_dotenv
import httpx

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {url}")
print(f"Key exists: {bool(key)}")
print(f"Key length: {len(key) if key else 0}")

if not url or not key:
    print("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante")
    exit(1)

# Test 1: Ping Supabase
print("\n1️⃣ Test ping Supabase...")
try:
    r = httpx.get(url, timeout=5)
    print(f"✓ Supabase répond: {r.status_code}")
except Exception as e:
    print(f"❌ Erreur: {e}")
    exit(1)

# Test 2: Query table exercises
print("\n2️⃣ Test requête exercises...")
try:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    r = httpx.get(
        f"{url}/rest/v1/exercises?select=id&limit=1",
        headers=headers,
        timeout=5
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:200]}")

    if r.status_code == 200:
        print("✓ Table exercises accessible")
    elif r.status_code == 404:
        print("❌ Table exercises n'existe pas (migration SQL manquante?)")
    else:
        print(f"❌ Erreur: {r.status_code}")
except Exception as e:
    print(f"❌ Erreur: {e}")
    exit(1)

print("\n✅ Supabase OK!")
