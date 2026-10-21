#!/usr/bin/env bash
# Daily backup of one environment: MySQL dump + uploads, keeping the last 14 of each.
# Run from cron (staggered after GEO's 02:30 Mongo backup):
#   45 2 * * * /opt/hasanoud/production/deploy/backup.sh >> /var/log/hasanoud-backup.log 2>&1
# Backups land in /opt/hasanoud/backups/<environment>/ — outside the app folder, so a fresh
# clone or `git clean` never touches them. Copy that folder off the server too.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_NAME="$(basename "$APP_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$APP_DIR")/backups/$ENV_NAME}"
KEEP="${KEEP:-14}"
cd "$APP_DIR"

umask 077
mkdir -p "$BACKUP_DIR"
stamp="$(date +%Y-%m-%d-%H%M)"
db_file="$BACKUP_DIR/mysql-$stamp.sql.gz"
uploads_file="$BACKUP_DIR/uploads-$stamp.tar.gz"

# Tables only (no CREATE DATABASE), so restore.sh can load it into any database name.
# MYSQL_PWD keeps the password off the command line; write to .tmp and rename only on success.
docker compose exec -T mysql sh -c \
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --no-tablespaces "$MYSQL_DATABASE"' \
    | gzip > "$db_file.tmp"
if ! zcat "$db_file.tmp" | tail -n 1 | grep -q 'Dump completed'; then
    rm -f "$db_file.tmp"
    echo "$(date -Is) [$ENV_NAME] ERROR: mysqldump output incomplete, backup discarded" >&2
    exit 1
fi
mv "$db_file.tmp" "$db_file"

tar -czf "$uploads_file.tmp" -C data uploads
mv "$uploads_file.tmp" "$uploads_file"

ls -1t "$BACKUP_DIR"/mysql-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --

echo "$(date -Is) [$ENV_NAME] backup written: $(basename "$db_file") ($(du -h "$db_file" | cut -f1)), $(basename "$uploads_file") ($(du -h "$uploads_file" | cut -f1))"
