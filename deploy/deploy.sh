#!/usr/bin/env bash
# Deploy the latest main to this environment (run from anywhere):
#   /opt/hasanoud/production/deploy/deploy.sh
# Pulls the code, rebuilds images, applies DB migrations (on api start) and waits for health.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

if [ ! -f .env ]; then
    echo "Missing $APP_DIR/.env — copy .env.docker.example and fill it in" >&2
    exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Preparing data folders"
mkdir -p data/mysql data/uploads/task-proofs data/logs
# The api container runs as the image's `node` user (uid 1000)
chown -R 1000:1000 data/uploads data/logs
chmod 600 .env

echo "==> Building and starting containers"
docker compose up -d --build --remove-orphans

echo "==> Waiting for the api to become healthy"
for _ in $(seq 1 30); do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q api)" 2>/dev/null || echo starting)"
    if [ "$status" = "healthy" ]; then
        echo "==> api is healthy — deployed $(git log -1 --format='%h %s')"
        docker image prune -f >/dev/null
        exit 0
    fi
    sleep 5
done

echo "api did not become healthy in time — recent logs:" >&2
docker compose logs --tail 50 api >&2
exit 1
