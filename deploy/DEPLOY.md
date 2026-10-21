# Deploying Hasanoud Task Manager

Runs on the shared Hostinger VPS (`srv1915308`) with Docker Compose, next to the GEO (Signal AI) stacks.

## Layout on the server

```
/opt/hasanoud/
├── production/          git clone of this repo  → https://task.hasanoud.in  (127.0.0.1:8100)
│   ├── .env             secrets (chmod 600, not in git) — from .env.docker.example
│   └── data/
│       ├── mysql/       MySQL data files
│       ├── uploads/     proof photos (UPLOAD_PROVIDER=local)
│       └── logs/        app log (rotates at 10MB x 5)
├── staging/             same layout, own .env / data, next free port (planned)
└── backups/             database dumps
```

Containers (`docker compose ps` inside an environment folder):

| Service | What it does |
|---|---|
| `web` | nginx serving the React build; proxies `/api` and `/uploads` to `api`. Only service with a port (127.0.0.1). |
| `api` | Express API. Runs `prisma migrate deploy` on start. Exactly one instance (in-process rate limiter, cache and sync job). |
| `mysql` | MySQL 8.4, data in `./data/mysql`. Reachable only inside the compose network. |

The host nginx (`/etc/nginx/sites-available/task.hasanoud.in`, template in `deploy/host-nginx.conf`) terminates HTTPS and proxies to the web container.

## Everyday commands

Run inside `/opt/hasanoud/production`:

```bash
./deploy/deploy.sh                 # pull main, rebuild, restart, wait for health
docker compose ps                  # status
docker compose logs -f api         # API logs (startup errors appear here)
docker compose restart api
docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
```

## Backups

`deploy/backup.sh` runs daily from root's crontab (02:45, after GEO's 02:30 Mongo backup):

```
45 2 * * * /opt/hasanoud/production/deploy/backup.sh >> /var/log/hasanoud-backup.log 2>&1
```

It writes `mysql-<date>.sql.gz` and `uploads-<date>.tar.gz` to `/opt/hasanoud/backups/production/` and keeps the last 14 of each. A dump that does not end with mysqldump's "Dump completed" marker is discarded and the run fails.

These backups are on the same server. Copy `/opt/hasanoud/backups` off the server as well (Hostinger weekly snapshot, or rclone to Google Drive / S3).

```bash
./deploy/backup.sh                                   # backup now
./deploy/restore.sh --check <mysql-....sql.gz>       # load into a throwaway DB, compare row counts — safe
./deploy/restore.sh <mysql-....sql.gz> [uploads-....tar.gz]   # REPLACE live data (asks first, snapshots current state)
```

## Database migrations

Schema changes go through Prisma migrations (`prisma/migrations`), applied automatically when `api` starts.

- Make a change locally: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <change>` and commit the new migration folder.
- A local database created earlier with `prisma db push` needs a one-time baseline: `npx prisma migrate resolve --applied 0_init`.

## First-time setup of an environment

1. `git clone https://github.com/techaijaz/hasanoud-taskmanager.git /opt/hasanoud/<env>`
2. `cp .env.docker.example .env`, fill it in (`openssl rand -hex 48` for secrets), set `COMPOSE_PROJECT_NAME`, `DOMAIN`, `HTTP_PORT`.
3. `./deploy/deploy.sh`
4. Host nginx site from `deploy/host-nginx.conf` (adjust domain/port), `nginx -t && systemctl reload nginx`, `certbot --nginx -d <domain>`.
5. First admin user: `docker compose exec api node prisma/seed.js`, then change the password straight away.
