# ADR-001: One platform as a modular monolith

**Status:** Accepted (October 2026)

## Context

Hasanoud needs many features (tasks, employees, attendance, stock, purchase, orders, shipping, expenses, MIS) that share users, permissions, locations and data. The task manager already exists (Express, Prisma, MySQL, React) and must be delivered. The team is small.

## Decision

Grow the existing codebase into one platform. Each feature is a **module** inside the same app (`modules/<name>`), with one database, one login and one deploy.

## Options considered

- **New repo from scratch (e.g. NestJS + TypeScript):** cleaner start, but the task manager would be rewritten and delivery delayed by weeks.
- **Separate services (microservices):** users, logins and data would have to be kept in sync across services; too much complexity for this team size.

## Consequences

- Fastest path; users, roles, locations, reporting hierarchy and holidays are reused.
- Existing code moves into the module layout gradually.
- Modules call each other's services, not each other's tables, so a module can later be split out if it ever must be.
- Single API instance until in-process state (rate limiter, cache, jobs) moves to Redis.
