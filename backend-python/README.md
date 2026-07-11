# Trena — moteur de performance (backend-python)

FastAPI + Supabase (PostgREST via httpx). Le moteur est interne (réseau Docker
uniquement), protégé en défense-en-profondeur par l'en-tête `X-Internal-Key`
(= `INTERNAL_API_KEY`). Il est le **seul writer** vers Garmin.

## Modules moteur (`app/engine/`)

Base historique : `banister` (fitness/fatigue/forme), `trimp`, `paces`,
`planner`, `plan_generator`, `hrv`, `foster`, `calibration`, `workout`.

Ajouts récents :

- **`acwr.py`** — Acute:Chronic Workload Ratio sur les charges TRIMP réalisées.
  Contrainte dure de blessure, complémentaire à Banister (qui mesure l'état, là
  où l'ACWR mesure la *dynamique* de charge). `acwr_rolling` (moyennes glissantes
  7:28, robuste), `acwr_ewma` (couplé au noyau de Banister), `acwr_point` (valeur
  + verdict : optimal / prudence / danger, plafond 1,30). Fonctions pures.
- **`gap.py`** — Grade-Adjusted Pace (courbe de Minetti). `grade_adjust_factor`
  (exact par échantillon si flux disponible), `gap_from_summary` (estimation
  depuis D+ net / distance). Branché dans `garmin_sync.extract_activity_metrics`
  → chaque activité porte désormais `gap_pace_s_per_km`.
- **`garmin_workout.py`** — builder de séance **structurée** Garmin (workout-service).
  Comble le trou de `garminconnect` : encode TIME + **zones FC** (le modèle Trena,
  robuste sans historique d'allure), et en option distance + zones d'allure (m/s).
  `from_session(type, durée)` traduit une séance planifiée en séance Garmin —
  miroir de `engine.workout.describe_session`.

## Push de séances Garmin (`services/garmin_sync.py`)

`GarminClient` expose maintenant les quatre verbes du calendrier Garmin, via
`garth.connectapi` (un seul writer) :

    create_workout(payload) -> workout_id
    schedule_workout(workout_id, day) -> schedule_id
    unschedule_workout(schedule_id)
    delete_workout(workout_id)

Ce sont le cœur du replan : la fenêtre glissante retract (unschedule + delete)
puis re-push, sans polluer la montre.

## Fenêtre glissante + plan versionné (`services/plan_sync.py`)

Le différenciateur (spec Notion §4). Le plan complet vit dans `training_sessions`
(visible dans l'app) ; **seuls les 7-14 prochains jours sont matérialisés sur la
montre**.

- `reconcile_window(repo, client, user_id, revision, window_days, today)` —
  retract les liens existants dans la fenêtre, push les séances planifiées,
  enregistre `session_garmin_link`. **Idempotent** : rejoué, même état, zéro
  décharge. La réconciliation clé sur la **date** (un replan crée une nouvelle
  révision = de nouvelles séances).
- `run_replan(...)` — ouvre une `plan_revision` (trigger + rationale +
  metrics_snapshot) puis réconcilie.

Tables ajoutées par `sql/migration-011.sql` : `plan_revisions` (journal des
révisions, se lit comme un changeset) et `session_garmin_link` (mapping
idempotent séance → workout Garmin). RLS cohérente avec le reste du schéma.

## Endpoints (router `/garmin`, tous `X-Internal-Key`)

Historique : `/garmin/link`, `/garmin/link/mfa`, `/garmin/status`,
`/garmin/sync`, `/garmin/import-activities`.

Ajout :

### `POST /garmin/replan`

Réconcilie la fenêtre glissante (idempotent). Ouvre une révision avec un snapshot
ACWR calculé depuis les charges TRIMP réelles, retract la fenêtre existante puis
push les séances planifiées.

Body :

```json
{ "user_id": "<uuid>", "trigger": "WEEKLY", "window_days": 14 }
```

Réponse :

```json
{ "revision": 3, "trigger": "WEEKLY", "pushed": 10, "retracted": 8,
  "window": ["2026-07-13", "2026-07-27"] }
```

`window_days` ∈ [1, 21]. Fail-fast 404 si le compte Garmin n'est pas lié.
À déclencher par n8n (cron) — voir `deploy/DEPLOY.md` §6.1.

## Tests

```bash
pip install -r requirements.txt
python -m pytest -q      # 183 tests
```

Nouveaux : `test_acwr.py`, `test_gap.py`, `test_garmin_workout.py`
(builder + push mocké), `test_plan_sync.py` (idempotence fenêtre glissante),
`test_replan_route.py` (route). Aucun accès réseau : client Garmin et repo
Supabase mockés.
