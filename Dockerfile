# Task Manager API (Express + Prisma). Built and run by docker-compose.yml — see deploy/DEPLOY.md.
FROM node:22-bookworm-slim

# openssl: Prisma CLI (migrate deploy) needs it at runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Schema first: `postinstall` runs `prisma generate`, which needs it
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# `prepare` installs husky git hooks — a dev-only tool that is not in the production install
RUN npm pkg delete scripts.prepare \
    && npm ci --omit=dev \
    && npm cache clean --force

COPY src ./src
COPY public ./public

# uploads/ and logs/ are bind-mounted from ./data on the host (deploy.sh sets ownership to uid 1000)
RUN mkdir -p uploads/task-proofs logs && chown -R node:node uploads logs
USER node

ENV NODE_ENV=production
EXPOSE 8080

# Apply pending migrations, then hand PID 1 to node so `docker stop` reaches it directly
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node src/server.js"]
