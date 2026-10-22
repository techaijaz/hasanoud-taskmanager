# ADR-004: One app for employees and admins; each screen designed for who uses it

**Status:** Accepted (October 2026)

## Context

Employees use the platform mostly on Android phones (punch, my attendance, my tasks, profile). HR, managers and the admin also need wide screens for lists, approvals, reports and settings. The idea was raised to split this: an employee app at `app.hasanoud.com` (mobile) and the admin at `ops.hasanoud.in` (desktop).

## Decision

One app at **ops.hasanoud.in**, with one login. Each screen is designed for the people who use it:

- **Employee screens** (punch, my attendance, my tasks, profile) are **mobile-first**: big buttons, bottom tab bar.
- **HR / admin screens** (employee list, approvals, reports, settings) are **desktop-first**: tables, filters, sidebar. On a phone they stay usable for checking.
- After login, each user sees only the menu their permissions allow.

## Options considered

- **Two domains (`app.hasanoud.com` + `ops.hasanoud.in`):** clean separation, but:
  - a manager is also an employee (punches, and also fixes the team's attendance), so they would log in twice and switch between sites;
  - a login cookie cannot be shared between `.com` and `.in`, so two sessions plus cross-site security setup;
  - two frontends to build, deploy and test for a small team.
- **Two frontends on the same domain (`app.hasanoud.in` + `ops.hasanoud.in`):** login could be shared, but it is still double the frontend work. Kept as a later option; the API does not change.

## Consequences

- One codebase, one deploy, one installable app (PWA).
- Every new screen must state whether it is mobile-first or desktop-first.
- Menus are driven by permissions, so a shop staff member never sees admin screens.
