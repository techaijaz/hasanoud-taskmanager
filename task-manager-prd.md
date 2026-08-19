# Product Requirements Document — Task Manager App

**Status:** Draft v2
**Prepared for:** Internal company tool (single business, multi-location operations)

---

## 1. Overview

### 1.1 Problem Statement
The business manages recurring and one-time operational checklists (shop opening, cleaning, stock checks, closing, etc.) across multiple locations (e.g. Lucknow Warehouse, Lucknow Shop, Mumbai Shop). There is no structured way to assign tasks with deadlines, verify completion with proof, get alerted on missed tasks, handle holidays, or track performance over time.

### 1.2 Goal
Build a task management system where Admins and Managers create, assign, and track one-time and recurring tasks across multiple locations, with photo-proof-based completion, deadline-based alerting, holiday handling, and performance reporting.

### 1.3 Non-Goals (Out of Scope for v1)
- Multi-tenant SaaS (single-company internal tool)
- Self-service signup (accounts created only by permission-holders)
- Manager/Admin approval or rejection of submitted proof (submission is final)
- Report export (Excel/PDF) — on-screen dashboard only
- Payroll, attendance, or shift-scheduling integration

---

## 2. User Roles & Permissions

Three-layer hierarchy: **Admin → Manager → User (Employee)**. No self-signup — accounts are created only by someone with the relevant permission.

| Capability | Admin | Manager | User |
|---|---|---|---|
| Create Manager accounts | Yes | No | No |
| Create User accounts | Yes | Yes (own team only) | No |
| Create/assign tasks | Yes (to any user, directly) | Yes (own users only) | No |
| Set task priority | Yes | Yes | No |
| Edit/cancel any task | Yes (any) | Yes (own team's) | No |
| Manage holiday dates | Yes | Yes (own locations) | No |
| View all company tasks | Yes | No | No |
| View own team's tasks | Yes | Yes | No |
| View own assigned tasks | — | — | Yes |
| Mark task complete | No | No | Yes |
| Receive missed-deadline alerts | Yes (as senior, for all) | Yes (for own team) | No |
| View own performance report | Yes | Yes | Yes |
| View team/company performance report | Yes (company-wide) | Yes (own team) | No |

Admin can bypass the Manager layer and directly create/assign tasks to any User. A User's reporting Manager is fixed when the User account is created.

---

## 3. Core Entities

### 3.1 User
Name, phone/email, password, role (Admin/Manager/User), reporting relationship (User→Manager, Manager→Admin), linked Location(s).

### 3.2 Location
Name (e.g. "Lucknow Warehouse"), address. Created/managed by Admin. Users mapped to one or more Locations.

### 3.3 Task Template
- Title, Description, Location, Priority (High/Med/Low)
- Type: One-time (date+time) or Recurring (daily/weekly/custom days + daily due time)
- Assignee(s): one or more Users
- **Skip on holiday** toggle (default: ON)
- Created by (Admin/Manager), timestamps

### 3.4 Task Instance
Actual occurrence a User acts on:
- Linked template, assigned user(s), location, scheduled date, due date-time
- Status: `Pending` -> `Done (On-time)` / `Done (Late)` / `Overdue-Pending` / `Skipped (Holiday)`
- Completion data: completed_at, proof images (1-5), optional note
- Late flag (permanent once set)
- Holiday override flag (per-instance, settable from Task Board)

### 3.5 Holiday Entry
- Location, specific date (ad-hoc — no recurring weekly rule; e.g. Sunday is inherently a non-working day and does not need a separate entry, this list is for other/special closures)

### 3.6 Notification
- Recipients: whoever assigned the task **and** their direct senior (e.g. Manager assigns -> Manager + Admin both notified)
- Trigger: due time passed, task still pending
- Delivery: in-app + browser push
- Read/unread state

---

## 4. Functional Requirements

### 4.1 Task Creation (via "Task List" page)
- FR-1: Admin or Manager can create a Task Template: title, description, location, priority, type, due time, assignee(s).
- FR-2: Recurring tasks define a recurrence pattern (daily/weekly/custom weekdays) plus a daily due time.
- FR-3: A task can be assigned to a single User or multiple Users.
- FR-4: If assigned to multiple Users, the task is complete as soon as **any one** assignee marks it done.
- FR-5: Manager can only assign within their own team; Admin can assign to any User.
- FR-6: Each template has a "Skip on holiday" toggle (default ON), placed inside a 3-dot (kebab) menu on the task card rather than the main form.

### 4.2 Task List Page (management view)
- FR-7: Shows all Task Templates (not daily instances) — recurring and one-time, with location, priority, assignee, and recurrence type visible at a glance.
- FR-8: Each template supports edit, delete, and the holiday-skip toggle via a kebab menu.
- FR-9: Filterable by type (recurring/one-time), location.

### 4.3 Recurring Task Generation
- FR-10: Each day, a new Task Instance is auto-generated for every active recurring template scheduled for that day, per assigned User.
- FR-11: A new instance becomes visible in the employee's Task Board starting from 12:00 AM (start of day).
- FR-12: Recurring instances are **not** pre-generated in advance — future dates on the Task Board show no recurring task until that day actually arrives.
- FR-13: One-time tasks, since they carry a fixed date, appear on the Task Board only on (or become visible ahead of) their scheduled date.

### 4.4 Task Board Page (action/completion view)
- FR-14: Shows pinned checklist cards (task groups) with a progress summary (e.g. "2 of 4 items done"). Tapping a card opens its item list.
- FR-15: Supports date navigation (prev/next). Past dates show read-only history; future dates show only already-scheduled one-time tasks — never unrealized recurring instances.
- FR-16: Each item shows its status and, if pending, inline actions: photo upload and note entry, plus a "Mark done" action — no separate screen needed.
- FR-17: Marking done **requires** 1-5 photos as proof; a text note is optional.
- FR-18: Once submitted, completion is final — no approval/rejection step.
- FR-19: A User can still mark a task done after its deadline (late completion allowed, not blocked).
- FR-20: **Done** items remain viewable on the Task Board with their submitted photos and note shown read-only (not just at the moment of submission).

### 4.5 Task Status & Late Handling
- FR-21: Completed before/at due time -> **Done (On-time)**, shown green.
- FR-22: Completed after due time -> **Done (Late)**, shown red — this flag is permanent and persists in history.
- FR-23: Due time passes with task still pending -> status becomes **Overdue/Pending**, triggering a notification.

### 4.6 Notifications
- FR-24: When a task's due time passes while still pending, a notification is sent to whoever assigned it **and** their direct senior (Manager assigns -> Manager + Admin notified; Admin assigns -> Admin notified).
- FR-25: Delivered as in-app + browser push notifications.
- FR-26: At most one notification per recipient per missed task (no duplicate spam).

### 4.7 Task Editing & Cancellation
- FR-27: Admin/Manager (within permission scope) can edit or cancel a task at any time, including after assignment.
- FR-28: If a recurring task's pattern is changed mid-way, its existing pending instances are auto-marked "done" at the moment of the change.

### 4.8 Holiday Manager
- FR-29: A dedicated "Holiday Manager" page lets Admin/Manager record specific holiday dates per Location — a flat, ad-hoc date list (not a recurring weekly rule).
- FR-30: Sunday (or any day the business is inherently closed) does not need to be added — the list is meant for additional/special closures (festivals, one-off shutdowns).
- FR-31: On a date marked as holiday, any task instance whose "skip on holiday" toggle is ON shows status **Skipped (Holiday)** on the Task Board and is locked (no action possible).
- FR-32: Tasks with the toggle OFF are unaffected by holiday marking and remain active as normal.
- FR-33: The holiday-skip behavior can be overridden **per instance, per day** directly from the Task Board (e.g. shop unexpectedly opens on a marked holiday) — toggling it off there reactivates that specific day's checklist without touching the template.
- FR-34: Skipped (Holiday) instances are excluded from missed/late reporting.

### 4.9 Location Management
- FR-35: Admin can create and manage Locations.
- FR-36: Users are mapped to one or more Locations.
- FR-37: Tasks are associated with a Location and filterable by it on both Task List and Task Board.

### 4.10 Reporting
- FR-38: On-screen dashboard/chart-based reporting only (no export in v1).
- FR-39: Employee-level: on-time vs. late completion percentage, completion history.
- FR-40: Location-level: which locations have the highest rate of missed/late tasks.
- FR-41: Scoped by role — Admin: company-wide; Manager: own team; User: own performance only.

---

## 5. Task Status Lifecycle

```
[Instance created — visible from 12:00 AM]
            |
            v
   Is the date a marked holiday AND toggle ON?
      |                              |
     Yes                             No
      |                              |
      v                              v
Skipped (Holiday)                Pending ─────────► Done (On-time)  [green]
[locked, excluded                    |               (completed before/at due time)
 from reporting]              due time passes,
                               still pending
                                      |
                                      v
                            Overdue / Pending ──► Notification to assigner + their senior
                                      |
                              user later completes
                                      |
                                      v
                              Done (Late)  [red, permanent]
```

---

## 6. Pages (High-Level)

### Task List (management — Admin/Manager)
- All task templates, filterable by type/location
- Create new task template (title, location, priority, type, due time, assignees)
- Edit/delete/holiday-toggle via kebab menu per template

### Task Board (action — Employee, with Admin/Manager monitor view)
- Employee: pinned checklist cards for the selected date -> tap to open item list -> mark items done (photo + optional note) or view completed items' proof
- Date navigation: past (read-only history), today (active), future (one-time tasks only)
- Manager/Admin: same board concept but scoped to their team/company, with employee and location columns, for monitoring rather than completing

### Holiday Manager (Admin/Manager)
- Per-location flat list of holiday dates
- Add/remove dates

### Notification Center
- List of missed-task alerts, scoped to role

### Reports
- Employee-wise and location-wise on-time/late charts, scoped to role

---

## 7. Open Questions / Future Considerations
- Should there be a grace period before a task is flagged "late" (e.g. 5-minute buffer)?
- Should Users see who else a multi-assignee task is shared with?
- Offline-support need for employees with poor connectivity at warehouse/shop locations?

---

## 8. Success Criteria
- Managers/Admins can create and assign a task in under 1 minute.
- Employees can complete a task (with photo) in under 30 seconds of interaction time.
- Missed-deadline notifications delivered within 10 minutes of the deadline passing.
- Reporting accurately reflects on-time vs. late completion rates per employee and location.
