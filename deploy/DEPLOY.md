# Déploiement production — VPS OVH + Cloudflare Tunnel

Objectif : `https://trena.nexolab.fr` en ligne 24/7, ajustement matinal n8n fiable,
aucun port public ouvert (hors SSH). Durée : ~30 min.

## 0. Sécurité préalable (OBLIGATOIRE — clés compromises)

Les clés Supabase ont été committées dans `.env.example` : considère-les compromises.

1. Supabase → **Project Settings → API** → **Reset** sur `service_role` (et `anon` si proposé).
2. Note les nouvelles valeurs : elles vont dans le `.env` du VPS (et de ton PC pour le dev).
3. Ne remets jamais de vraie clé dans `.env.example`.

## 1. Préparer le VPS (une seule fois)

```bash
ssh debian@IP_DU_VPS        # ou ubuntu@ / root@ selon l'image OVH

# Récupérer le dépôt (repo privé : utilise un token GitHub "repo:read")
git clone https://github.com/oromane/Trena.git ~/trena
cd ~/trena

sudo bash deploy/install-vps.sh
# Docker sans sudo (reconnecte-toi après) :
sudo usermod -aG docker $USER && exit
```

## 2. Configurer `.env` sur le VPS

```bash
ssh debian@IP_DU_VPS
cd ~/trena && cp .env.example .env && nano .env
```

À renseigner :

```
SUPABASE_URL=https://<projet>.supabase.co
SUPABASE_ANON_KEY=<nouvelle clé anon>
SUPABASE_SERVICE_ROLE_KEY=<nouvelle clé service_role>
INTERNAL_API_KEY=<openssl rand -hex 32>
TOKEN_ENCRYPTION_KEY=<clé Fernet — voir ci-dessous>
GOOGLE_CLIENT_ID=<idem qu'en local>
GOOGLE_CLIENT_SECRET=<idem>
SITE_URL=https://trena.nexolab.fr
N8N_HOST=automation.nexolab.fr
TUNNEL_TOKEN=<étape 3>
```

Générer les clés directement sur le VPS :

```bash
openssl rand -hex 32                                   # INTERNAL_API_KEY
docker run --rm python:3.12-slim python -c \
  "from cryptography.fernet import Fernet" 2>/dev/null || true
docker run --rm python:3.12-slim sh -c \
  "pip install -q cryptography && python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
```

Note : garde le même `TOKEN_ENCRYPTION_KEY` que ton PC si tu veux conserver les
liaisons Garmin/Google existantes en base ; sinon les utilisateurs relient leurs
comptes à nouveau (2 clics).

## 3. Tunnel Cloudflare (géré depuis le dashboard)

1. https://one.dash.cloudflare.com → **Networks → Tunnels → Create a tunnel** → type **Cloudflared** → nom : `trena-vps`.
2. Copie le **token** affiché (`eyJ...`) → colle-le dans `TUNNEL_TOKEN=` du `.env`. Ignore les instructions d'installation (le conteneur s'en charge).
3. Onglet **Public Hostname** du tunnel, ajoute :
   - `trena.nexolab.fr` → Service **HTTP** → URL `frontend:3000`
   - `automation.nexolab.fr` → Service **HTTP** → URL `n8n:5678` *(optionnel — voir §6)*
4. Supprime l'ancien enregistrement DNS : **nexolab.fr → DNS** → efface le CNAME `trena` qui pointe vers l'ancien tunnel (`febb31d0...cfargotunnel.com`). La création du hostname à l'étape 3 recrée le bon CNAME automatiquement.
5. (Recommandé) **Access → Applications → Add** : protège `automation.nexolab.fr` par une policy email (OTP) — l'interface n8n ne doit pas être publique sans ça.

## 4. Lancer la stack

```bash
cd ~/trena
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # tout doit être "running"
docker compose -f docker-compose.prod.yml logs -f cloudflared   # "Registered tunnel connection" = OK
```

Vérifie : https://trena.nexolab.fr

## 5. Google OAuth (redirection production)

Google Cloud Console → **Credentials → ton OAuth client** → Authorized redirect URIs,
ajoute : `https://trena.nexolab.fr/api/google/callback`

## 6. n8n : cron matinal

1. Ouvre n8n : `https://automation.nexolab.fr` (derrière Cloudflare Access), ou sans exposition publique :
   `ssh -L 5678:localhost:5678 debian@IP_DU_VPS` puis http://localhost:5678
2. Importe `n8n/workflows/morning-daily-adjust.json`, renseigne la credential `X-Internal-Key` (= `INTERNAL_API_KEY`), **active** le workflow.
3. La timezone est déjà forcée à `Europe/Paris` dans le compose : le cron 06:00 est bien 6h heure française.
4. Test manuel : exécute le workflow une fois et vérifie la réponse du moteur.

## 6.1 Migrations SQL (à jouer sur Supabase)

Les migrations `sql/migration-0XX.sql` s'exécutent dans le **SQL Editor Supabase**
(base managée — pas sur le VPS), dans l'ordre. En particulier, avant d'utiliser
la fenêtre glissante :

- **`sql/migration-011.sql`** — crée `plan_revisions` + `session_garmin_link`
  (plan versionné + mapping idempotent séance → workout Garmin). Idempotente
  (`IF NOT EXISTS`). L'engine démarre sans, mais `POST /garmin/replan` échoue
  tant qu'elle n'est pas jouée.

## 6.2 n8n : replan (fenêtre glissante)

La route `POST /garmin/replan` réconcilie la fenêtre glissante Garmin (retract
puis re-push des 7-14 prochains jours ; idempotent). À déclencher par n8n comme
le cron matinal.

1. Nouveau workflow n8n : **Schedule Trigger** (ex. dimanche 18:00 — la timezone
   `Europe/Paris` est déjà forcée dans le compose) + node **HTTP Request** :
   - Method : `POST`
   - URL : `http://performance-engine:8000/garmin/replan` *(réseau interne — pas
     d'exposition publique)*
   - Header : `X-Internal-Key` = `={{ $env.INTERNAL_API_KEY }}`
   - Body (JSON) : `{ "user_id": "<uuid>", "trigger": "WEEKLY", "window_days": 14 }`
2. **Active** le workflow.
3. Test manuel : exécute une fois, la réponse doit contenir `revision`, `pushed`,
   `retracted`. Prérequis : compte Garmin lié (`/garmin/link`) et migration-011 jouée.

## 6.3 Conseiller IA local (Ollama)

Le service `llm` (Ollama) tourne sur le réseau Docker interne, sans port publié :
seul `performance-engine` l'interroge, et le frontend passe par `/api/advisor`
(session Supabase obligatoire). Aucune donnée ne quitte le VPS.

- Modèle par défaut : `qwen3:4b-instruct-2507-q4_K_M` (licence Apache 2.0, ~2,6 Go sur disque,
  ~3 Go en RAM). Plafonné à 4 Go et 3 cœurs dans le compose.
- Premier démarrage : `llm-init` télécharge le modèle puis s'arrête. Suivi :
  `docker compose -f docker-compose.prod.yml logs -f llm-init`
- Vérifier : `docker compose -f docker-compose.prod.yml exec llm ollama list`
- Latence attendue sur CPU : premiers mots en quelques secondes (modèle chargé),
  réponse complète en 20 à 40 s. Le premier appel après 10 min d'inactivité
  recharge le modèle (+5 à 10 s).
- Si le modèle est absent ou lent, le conseiller bascule sur le glossaire
  intégré : l'interface affiche « Définition de référence (IA indisponible) ».
- Changer de modèle : `LLM_MODEL=...` dans `.env`, puis
  `docker compose -f docker-compose.prod.yml up -d llm-init performance-engine`.
- Mesurer le débit réel :
  `docker compose -f docker-compose.prod.yml exec llm ollama run qwen3:4b-instruct-2507-q4_K_M --verbose "Explique le HRV en 3 phrases."`
  (ligne `eval rate` en tokens/s).
- N'utiliser que des variantes `instruct`. Le tag `qwen3:4b` seul pointe vers la
  variante `thinking`, qui raisonne à voix haute avant de répondre : 5 à 10 fois
  plus lente, et le raisonnement s'affichait dans le conseiller.
- Libérer l'ancien modèle : `docker compose -f docker-compose.prod.yml exec llm ollama rm qwen3:4b`
- En local, le service est optionnel : `docker compose --profile ai up`.

### 6.4 Conseiller hybride : réponses instantanées + analyse du jour

Sur ce VPS (4 vCPU partagés, sans GPU), le modèle met 1 à 2 minutes par
réponse. Le conseiller n'y fait donc appel que pour les questions libres :

| Question | Réponse | Délai |
| --- | --- | --- |
| Définition (« c'est quoi le HRV ? ») | Glossaire Trena | instantané |
| État du jour (« comment je récupère ? ») | Analyse rédigée à 6h30, sinon synthèse chiffrée | instantané |
| Question libre | IA locale, en streaming | 1 à 2 min |

Mise en place (une fois) :

1. **Supabase** : exécuter `sql/migration-013.sql` (table `advisor_daily`).
   Sans elle, tout fonctionne mais seule la synthèse chiffrée s'affiche.
2. **n8n** : importer `n8n/workflows/morning-advisor-daily.json`, puis l'activer
   (cron 06:30, après la synchro Garmin de 6h). Il appelle
   `POST /advisor/daily/run`, qui rend la main tout de suite et génère les
   analyses en tâche de fond, un utilisateur après l'autre.
3. **Test immédiat** (sans attendre 6h30), depuis le VPS :
   ```bash
   docker compose -f docker-compose.prod.yml exec performance-engine \
     python -c "import httpx,os;print(httpx.post('http://localhost:8000/advisor/daily/run',json={},headers={'X-Internal-Key':os.environ['INTERNAL_API_KEY']}).json())"
   ```
   Réponse attendue : `{'queued': N}`. Compter 1 à 2 min par utilisateur, puis
   recharger le dashboard : la carte « Le point de Perlo » passe de
   « Synthèse du jour » à « Analyse du jour ».

### 6.5 Analyse des séances (type Strava)

Chaque séance du flux « Activités récentes » affiche :
- une **analyse chiffrée instantanée** (records sur 90 jours, allure et FC
  comparées à ta séance type, zones cardiaques, charge), calculée à la volée ;
- un **commentaire de Perlo**, rédigé par l'IA locale en tâche de fond juste
  après chaque synchro Garmin (et rattrapé au run de 6h30). Au plus 5 séances
  par passage, sur les 3 derniers jours.

Mise en place (une fois) : exécuter `sql/migration-014.sql` dans l'éditeur SQL
Supabase (table `activity_insights`). Sans elle, l'analyse chiffrée s'affiche
quand même ; seuls les commentaires manquent.

## 7. Éteindre l'ancien hébergement PC

- Ne lance plus `Trena-tunnel.bat` (l'ancien tunnel local est remplacé).
- `Trena.bat` reste utilisable pour le dev local (localhost:3000 uniquement).

## 8. Mise à jour de l'app (déploiements suivants)

```bash
ssh debian@IP_DU_VPS
cd ~/trena && git pull && docker compose -f docker-compose.prod.yml up -d --build
```

## Dépannage

- `cloudflared` boucle sur des erreurs → token invalide ou hostname mal configuré (URL du service = `frontend:3000`, pas `localhost:3000`).
- 502 sur trena.nexolab.fr → le frontend n'est pas up : `docker compose -f docker-compose.prod.yml logs frontend`.
- Le cron 6h ne tourne pas → workflow non activé, ou credential `X-Internal-Key` absente, ou conteneur n8n redémarré sans volume (le volume `n8n_data` doit persister).
- Build frontend qui échoue par manque de RAM (VPS 2 Go) → ajoute du swap :
  `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
