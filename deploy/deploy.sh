#!/usr/bin/env bash
# Deploy this environment (run from anywhere):
#   /opt/hasanoud/staging/deploy/deploy.sh                    # staging: latest main
#   /opt/hasanoud/production/deploy/deploy.sh --from-staging  # production: exactly what staging runs
#   /opt/hasanoud/production/deploy/deploy.sh                 # production: latest main (skips staging)
# Production takes a database + uploads backup first (backups/production/pre-deploy, last 10).
# Then: rebuild images, apply DB migrations (on api start) and wait for health.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_NAME="$(basename "$APP_DIR")"
cd "$APP_DIR"

if [ ! -f .env ]; then
    echo "Missing $APP_DIR/.env — copy .env.docker.example and fill it in" >&2
    exit 1
fi

echo "==> Fetching code"
git fetch --quiet origin
if [ "${1:-}" = "--from-staging" ]; then
    target="$(git -C "$(dirname "$APP_DIR")/staging" rev-parse HEAD)"
    echo "==> Deploying the commit staging runs: $(git log -1 --format='%h %s' "$target")"
else
    target="origin/main"
fi
# Fast-forward only: the server never carries its own commits
git merge --ff-only --quiet "$target"

if [ "$ENV_NAME" = "production" ] && [ -n "$(docker compose ps -q mysql 2>/dev/null)" ]; then
    echo "==> Backup before deploy"
    BACKUP_DIR="$(dirname "$APP_DIR")/backups/$ENV_NAME/pre-deploy" KEEP=10 "$APP_DIR/deploy/backup.sh"
fi

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
        echo "==> [$ENV_NAME] api is healthy — deployed $(git log -1 --format='%h %s')"
        docker image prune -f >/dev/null
        exit 0
    fi
    sleep 5
done

echo "api did not become healthy in time — recent logs:" >&2
docker compose logs --tail 50 api >&2
exit 1
