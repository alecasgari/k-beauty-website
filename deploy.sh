#!/bin/bash
# K-Beauty Academy — Server deploy script
# Run on server: bash deploy.sh

set -e

SITE_DIR="/opt/docker/kbeauty/html"
COMPOSE_DIR="/opt/docker/kbeauty"
CONTAINER="kbeauty_web"

echo "→ Pulling latest from GitHub..."
sudo git -C "$SITE_DIR" pull origin main

echo "→ Fixing file permissions..."
sudo chmod -R a+rX "$SITE_DIR"

echo "→ Restarting container..."
sudo docker compose -f "$COMPOSE_DIR/docker-compose.yml" restart "$CONTAINER"

echo "✓ Deploy complete — https://k-beauty.academy"
