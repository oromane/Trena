# Adaptive Training System

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

`POST /trimp` — score TRIMP d'une séance (durée, FC moyenne/repos/max, sexe).

Routes internes (en-tête `X-Internal-Key` requis) : `POST /ingest/daily-metrics`, `POST /plan/generate`, `POST /daily-adjust/run`, `GET /users/active`, `POST /calendar/oauth/authorize-url`, `POST /calendar/oauth/exchange`, `GET /calendar/status`, `DELETE /calendar/tokens/{user_id}`, `POST /calendar/tokens`, `POST /calendar/publish`.

## État d'avancement

Fait : moteur complet (Banister, TRIMP, HRV, périodisation), API interne sécurisée, persistance Supabase, cockpit de performance (probabilité de réussite, trajectoire projetée, insights), workflow n8n, module Google Calendar complet (OAuth, publish, patch matinal), sync Garmin Connect automatique (HRV/sommeil/FC repos/stress, jeton chiffré, auto-sync avant l'ajustement quotidien), chiffrement des tokens.

Reste : calibration individuelle de tau1/tau2 par régression sur l'historique, import des activités réalisées (TRIMP auto depuis Garmin), déploiement VPS.
