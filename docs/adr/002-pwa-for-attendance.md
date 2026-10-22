# ADR-002: Attendance through the installable web app (PWA), not a native app

**Status:** Accepted (October 2026)

## Context

Employees punch with a selfie and GPS from their phones (mostly Android). The main problem today is forgetting to punch, not faking location.

## Decision

Use the existing web app, installable on the phone (PWA): camera, GPS and Web Push notifications work in the browser on Android.

## Options considered

- **Native Android app:** can detect fake-GPS ("mock location") and run reliable background reminders, but it means a second codebase, Play Store releases, and roughly double the work.

## Consequences

- One codebase; updates reach everyone instantly.
- Fake-GPS apps cannot be detected from the browser. Accepted for now, because fake punching is not the current problem.
- The API is designed so a native app could use it later without changes.
- iPhone users get notifications only after adding the app to the home screen.
