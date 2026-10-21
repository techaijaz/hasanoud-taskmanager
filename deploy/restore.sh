#!/usr/bin/env bash
# Restore a backup made by backup.sh into this environment.
#   deploy/restore.sh /opt/hasanoud/backups/production/mysql-2026-10-21-0245.sql.gz [uploads-....tar.gz]
#   deploy/restore.sh --check <mysql-....sql.gz>   load into a throwaway database and print row counts
#
# A real restore REPLACES the current database (and uploads, if given). The API is stopped meanwhile.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

mysql_root() {
    docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$@"' -- "$@"
}

counts() {
    mysql_root -N "$1" -e "SELECT CONCAT_WS(' ',
        'users=', (SELECT COUNT(*) FROM users),
        'locations=', (SELECT COUNT(*) FROM locations),
        'task_templates=', (SELECT COUNT(*) FROM task_templates),
        'task_instances=', (SELECT COUNT(*) FROM task_instances),
        'role_permissions=', (SELECT COUNT(*) FROM role_permissions))"
}

if [ "${1:-}" = "--check" ]; then
    db_file="${2:?usage: restore.sh --check <mysql-dump.sql.gz>}"
    mysql_root -e 'DROP DATABASE IF EXISTS restore_check; CREATE DATABASE restore_check'
    zcat "$db_file" | mysql_root restore_check
    echo "backup:  $(counts restore_check)"
    echo "live:    $(counts "$(docker compose exec -T mysql printenv MYSQL_DATABASE | tr -d '\r')")"
    mysql_root -e 'DROP DATABASE restore_check'
    echo "check OK: $(basename "$db_file") restores cleanly"
    exit 0
fi

db_file="${1:?usage: restore.sh <mysql-dump.sql.gz> [uploads.tar.gz]}"
uploads_file="${2:-}"
db_name="$(docker compose exec -T mysql printenv MYSQL_DATABASE | tr -d '\r')"

echo "This replaces database '$db_name' in $APP_DIR with $(basename "$db_file")${uploads_file:+ and uploads with $(basename "$uploads_file")}."
read -r -p "Type the database name to continue: " answer
[ "$answer" = "$db_name" ] || { echo "Aborted."; exit 1; }

# Safety net: snapshot of the current state before overwriting it
BACKUP_DIR="$(dirname "$APP_DIR")/backups/$(basename "$APP_DIR")" "$APP_DIR/deploy/backup.sh"

docker compose stop api
zcat "$db_file" | mysql_root "$db_name"
if [ -n "$uploads_file" ]; then
    rm -rf data/uploads
    tar -xzf "$uploads_file" -C data
    chown -R 1000:1000 data/uploads
fi
docker compose start api
echo "restored: $(counts "$db_name")"
