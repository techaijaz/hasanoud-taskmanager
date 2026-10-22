# Hasanoud Operations — design documents

The platform at **operations.hasanoud.in** runs Hasanoud's day-to-day operations. Every capability (tasks, employees, attendance, later stock, purchase, orders, shipping, expenses) is a **feature of one platform**, not a separate app.

## How we work

Nothing is built until it is discussed and approved in writing.

1. **Requirements** — the business explains how things work; open points stay open until decided. No assumptions.
2. **HLD** (high-level design) — the whole system: modules, data flow, external systems, infrastructure.
3. **LLD** (low-level design) — one module at a time: tables, flows, screens, permissions, errors.
4. **Test cases** — written with the LLD, before code.
5. **Review** — the business owner approves the documents.
6. **Build** — one module at a time, tested on staging, then production.

Important decisions get an **ADR** (Architecture Decision Record): what was decided, why, and what else was considered.

## Index

| Area | Document | Status |
|---|---|---|
| Business | [requirements/business-overview.md](requirements/business-overview.md) | Captured, partly open |
| Platform | [hld/platform-hld.md](hld/platform-hld.md) | Draft for review |
| Employees + Attendance | [requirements/employee-management.md](requirements/employee-management.md) | Agreed |
| Employees + Attendance | [lld/employee-attendance-lld.md](lld/employee-attendance-lld.md) | Draft for review |
| Employees + Attendance | [testing/employee-attendance-test-cases.md](testing/employee-attendance-test-cases.md) | Draft for review |
| Screens | [lld/mockups/](lld/mockups/) (open the `.html` files in a browser) | Agreed |
| Decisions | [adr/](adr/) | Accepted |

Deployment and operations: [../deploy/DEPLOY.md](../deploy/DEPLOY.md).
