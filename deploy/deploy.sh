#!/usr/bin/env bash
# ============================================================
#  Trena - Deploiement VPS (idempotent, one-shot)
#  A executer SUR le VPS :  bash deploy/deploy.sh
#  Prerequis : depot clone dans ~/trena, .env renseigne,
#  docker + docker compose installes (voir deploy/install-vps.sh).
# ============================================================
set -euo pipefail

REPO_DIR="${TRENA_DIR:-$HOME/trena}"
COMPOSE_FILE="docker-compose.prod.yml"
BRANCH="${TRENA_BRANCH:-main}"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[deploy][ERREUR]\033[0m %s\n' "$*" >&2; }

cd "$REPO_DIR" || { err "Depot introuvable: $REPO_DIR"; exit 1; }

if [ ! -f .env ]; then
  err ".env absent dans $REPO_DIR - copie .env.example puis renseigne les cles."
  exit 1
fi

log "1/5 Recuperation du code (branche $BRANCH)..."
git fetch --quiet origin "$BRANCH"
BEFORE=$(git rev-parse HEAD)
git reset --hard "origin/$BRANCH"
AFTER=$(git rev-parse HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
  log "Deja a jour ($AFTER) - rebuild quand meme pour garantir l'etat."
else
  log "Mise a jour: ${BEFORE:0:7} -> ${AFTER:0:7}"
fi

log "2/5 Build + (re)demarrage des conteneurs..."
docker compose -f "$COMPOSE_FILE" up -d --build

log "3/5 Attente du demarrage (15s)..."
sleep 15

log "4/5 Etat des services :"
docker compose -f "$COMPOSE_FILE" ps

log "5/5 Nettoyage des images orphelines..."
docker image prune -f >/dev/null 2>&1 || true

log "Deploiement termine sur $(git rev-parse --short HEAD)."
log "Verifie : https://trena.nexolab.fr"
