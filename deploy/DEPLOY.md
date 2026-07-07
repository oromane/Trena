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
