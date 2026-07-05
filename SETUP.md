# Guide de configuration — Adaptive Training System

Suis ces étapes dans l'ordre. Durée totale : ~20 minutes.

## 1. Supabase (~5 min, gratuit)

1. Va sur https://supabase.com → **New project** (choisis une région UE).
2. Une fois le projet créé : **SQL Editor** → colle le contenu de `sql/schema.sql` → **Run**.
3. **Project Settings → API** : copie ces 3 valeurs dans ton `.env` :
   `Project URL` → `SUPABASE_URL`, `anon public` → `SUPABASE_ANON_KEY`, `service_role` → `SUPABASE_SERVICE_ROLE_KEY`.
4. **Authentication → Providers → Email** : activé par défaut. Pour tester sans email de confirmation : **Authentication → Settings** → désactive "Confirm email" (à réactiver en production).

## 2. Clés de sécurité internes (~1 min)

```bash
cp .env.example .env

# INTERNAL_API_KEY :
openssl rand -hex 32

# TOKEN_ENCRYPTION_KEY :
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Colle les deux valeurs dans `.env`.

## 3. Google Calendar API (~10 min, optionnel au démarrage)

1. https://console.cloud.google.com → crée un projet.
2. **APIs & Services → Library** → active **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → External → renseigne le nom de l'app → ajoute le scope `https://www.googleapis.com/auth/calendar.events` → ajoute ton email en test user.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application** → Authorized redirect URI : `http://localhost:3000/api/google/callback` (et `https://app.domaine.com/api/google/callback` en production).
5. Copie `Client ID` et `Client secret` dans `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
6. Vérifie que `SITE_URL` dans `.env` correspond à l'URL du frontend (`http://localhost:3000` en dev) — elle sert à construire l'URI de redirection.

Tant que ces valeurs sont vides, l'app fonctionne — seule la sync calendrier est inactive.

## 3 bis. Garmin Connect (0 min de config serveur)

Aucune clé API nécessaire : la liaison se fait dans l'app, page **Métriques** →
« Lier mon compte Garmin » (email + mot de passe Garmin, code MFA si activé).
Le mot de passe n'est jamais stocké — seul un jeton de session chiffré est
conservé. La sync tourne ensuite automatiquement chaque matin avant
l'ajustement de séance, et manuellement via « Synchroniser 14 jours ».

## 4. Lancement

```bash
docker compose up -d --build
```

- Frontend : http://localhost:3000
- n8n : http://localhost:5678 → importe `n8n/workflows/morning-daily-adjust.json` et active-le.

## 5. Premier parcours utilisateur (test de la boucle complète)

1. Crée un compte sur http://localhost:3000/login (le profil est créé automatiquement au premier accès dashboard).
2. **Objectifs** → crée un objectif (ex : semi-marathon dans 12 semaines).
3. **Dashboard** → "(Re)générer le plan d'entraînement" → les séances sont créées.
4. **Métriques** → saisis 8+ jours de HRV/sommeil (nécessaire pour la baseline).
5. **Dashboard** → "Réévaluer selon HRV / sommeil" → la séance du jour est maintenue ou adaptée (NORMAL / CAUTION / REDUCE).
6. **Dashboard → Google Calendar** → "Lier mon calendrier Google" → consentement → retour avec "✓ Compte lié" → "Publier le plan dans mon calendrier" : chaque séance planifiée devient un événement (18h par défaut). L'ajustement matinal (n8n) mettra ensuite à jour les événements automatiquement.

## 6. Production (VPS + Cloudflare Tunnel)

1. Installe `cloudflared` sur le VPS, crée un tunnel :
   `app.domaine.com` → `http://localhost:3000`, `automation.domaine.com` → `http://localhost:5678`.
2. Bloque les ports entrants au pare-feu (seul le tunnel sort).
3. Mets à jour `N8N_HOST` dans `.env` et les redirect URIs Google.
