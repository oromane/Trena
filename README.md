# Trena

Plan d'entraînement d'endurance individualisé, ajusté chaque matin selon les données physiologiques (HRV, sommeil, FC repos) et synchronisé avec Google Calendar. Spécification complète : voir `Claude.md`.

## Structure

```
├── backend-python/      # Moteur de décision (FastAPI)
│   ├── app/
│   │   ├── main.py      # Assemblage API
│   │   ├── engine/      # banister, trimp, hrv, planner, plan_generator
│   │   ├── routers/     # ingest, plan, daily, calendar
│   │   ├── services/    # calendar_sync (Google Calendar)
│   │   ├── db/repo.py   # Accès Supabase (PostgREST)
│   │   ├── crypto.py    # Chiffrement Fernet des tokens OAuth
│   │   └── security.py  # Auth interne X-Internal-Key
│   └── tests/           # 50 tests pytest
├── frontend/            # Next.js App Router + Tailwind + Supabase Auth
│   ├── app/             # login, dashboard, objectives, metrics
│   └── lib/             # clients Supabase (SSR) + client moteur
├── n8n/workflows/       # Cron 06:00 → ajustement quotidien par utilisateur
├── sql/schema.sql       # Schéma PostgreSQL (Supabase) + RLS
├── docker-compose.yml
├── SETUP.md             # Guide de configuration des clés (Supabase, Google)
└── .env.example
```

## Démarrage rapide

Suivre **SETUP.md** (Supabase, clés internes, Google Calendar — ~20 min), puis :

```bash
docker compose up -d --build
```

Frontend : http://localhost:3000 — n8n : http://localhost:5678.
Le moteur (`performance-engine`) n'est pas exposé publiquement : il est joignable uniquement depuis le réseau Docker interne (`http://performance-engine:8000`).

## Développement local (sans Docker)

Backend :

```bash
cd backend-python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
pytest                                  # tests du moteur
uvicorn app.main:app --reload           # API sur :8000
```

Frontend :

```bash
cd frontend
npm install
npm run dev
```

## API du moteur

`POST /daily-adjust` — décision matinale (spec §5.2) :

```json
{
  "hrv_history": [60, 62, 58, "..."],
  "hrv_today": 45,
  "sleep_history": [450, 460, "..."],
  "sleep_today": 350,
  "planned_session": { "session_type": "INTERVAL", "duration_minutes": 60, "target_trimp": 120 }
}
```

Réponse : niveau de disponibilité (`NORMAL` / `CAUTION` / `REDUCE`), z-score HRV, tau2 ajusté et séance recalculée.

`POST /simulate` — trajectoire fitness/fatigue/performance (Banister) sur une série de charges TRIMP.

`POST /plan/calibrate` — calibration individuelle des paramètres de Banister (tau1/tau2/k1/k2/p0) par régression sur l'historique réel (proxy VO2max Garmin). Garde-fous : ≥ 8 semaines de charges, ≥ 10 mesures VO2max, R² ≥ 0.2 — sinon les défauts du moteur restent en vigueur. Paramètres persistés dans `profiles` (voir `sql/migration-004.sql`) et utilisés par le cockpit et l'ajustement matinal.

`POST /trimp` — score TRIMP d'une séance (durée, FC moyenne/repos/max, sexe).

Routes internes (en-tête `X-Internal-Key` requis) : `POST /ingest/daily-metrics`, `POST /plan/generate`, `POST /daily-adjust/run`, `GET /users/active`, `POST /calendar/oauth/authorize-url`, `POST /calendar/oauth/exchange`, `GET /calendar/status`, `DELETE /calendar/tokens/{user_id}`, `POST /calendar/tokens`, `POST /calendar/publish`.

## État d'avancement

Fait (v0.5) : moteur complet (Banister, TRIMP, HRV, périodisation, séances/semaine paramétrable), import automatique des activités Garmin (TRIMP réel, matching des séances planifiées, activités hors plan), bien-être Garmin étendu (poids, pas, VO2max, Body Battery, calories) avec tendances 90 jours, bibliothèque de séances structurées paramétrables (30/30, intervalles piste, pyramide, fartlek, tempo progressif, sortie longue à blocs, côtes), calendrier multi-vues (1 jour / 3 jours / semaine / mois) avec édition complète, cockpit de performance, Google Calendar complet (OAuth, publish, purge, patch matinal), sync Garmin MFA 2 étapes, page Profil (identité, paramètres cardiaques, email, mot de passe, export JSON), thème clair/sombre, workflow n8n. Suite de tests : 97 pytest.

Fait (v0.7) : calibration individuelle de tau1/tau2 par régression sur l'historique (`POST /plan/calibrate`, migration-004), détection de monotonie/contrainte de Foster (bloc `foster` du dashboard + insights de prévention du surentraînement), CI GitHub Actions (pytest backend + tsc frontend à chaque push). Suite de tests : 126 pytest.

Reste : notifications matinales (n8n), allures personnalisées dans le déroulé des séances, mode course J-7.
