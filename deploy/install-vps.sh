#!/usr/bin/env bash
# Installation initiale d'un VPS Ubuntu/Debian pour Trena.
# Usage : sudo bash install-vps.sh
set -euo pipefail

echo "== 1/4 Mises à jour système"
apt-get update -y && apt-get upgrade -y

echo "== 2/4 Installation de Docker (repo officiel)"
apt-get install -y ca-certificates curl gnupg git
install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") \
$(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "== 3/4 Pare-feu : seul SSH entre, tout le reste passe par le tunnel"
apt-get install -y ufw
ufw allow OpenSSH
ufw --force enable

echo "== 4/4 Vérifications"
docker --version
docker compose version
ufw status

echo
echo "OK. Étape suivante : cloner le dépôt et suivre deploy/DEPLOY.md"
