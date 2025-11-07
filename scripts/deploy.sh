#!/usr/bin/env bash
set -euo pipefail

echo "[deploy] cleaning…"
docker compose down -v --remove-orphans || true
docker system prune -af || true

echo "[deploy] building images…"
docker compose build --no-cache

echo "[deploy] starting services…"
docker compose up -d

echo "[deploy] services:"
docker compose ps
