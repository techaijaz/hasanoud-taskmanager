# LLD — People (employee record) and Attendance

Status: **draft for review**. Requirements: [employee-management.md](../requirements/employee-management.md) (IDs `R-…`). Test cases: [employee-attendance-test-cases.md](../testing/employee-attendance-test-cases.md). Screens: [mockups/](mockups/).

Built inside the existing codebase as two modules, `people` and `attendance` ([ADR-001](../adr/001-modular-monolith.md)), used through the installable web app ([ADR-002](../adr/002-pwa-for-attendance.md)).

---

## 1. Data model

Changes to existing tables, then new tables. All times are stored in UTC and interpreted in **IST**. `ymd` dates are `CHAR(10)` `YYYY-MM-DD` (IST), as in the task module.

### 1.1 Existing tables

**users** — add:

| Column | Type | Notes |
|---|---|---|
| `isActive` | bool, default true | False = cannot log in; set by offboarding. Replaces delete (R-E24). |

No new role. HR powers come from permissions ([ADR-003](../adr/003-hr-is-a-permission-not-a-role.md)). The current **delete user** API and button are removed.

**locations** — add:

| Column | Type | Notes |
|---|---|---|
| `latitude`, `longitude` | decimal(9,6), nullable | Punching is refused at a location without coordinates. |
| `radiusM` | int, default 100 | R-A2 |
| `dayStart`, `dayEnd` | `HH:mm` | Warehouse 10:00–19:00, shop 11:00–21:00 |
| `lateAfter` | `HH:mm` | Warehouse 10:00, shop 11:00 |
| `requiredWorkMinutes` | int | Warehouse 480, shop 600 (R-A9, R-A10) |

### 1.2 People

**departments**, **designations** — `id`, `name` (unique), `isActive`, timestamps. Managed by HR/admin (R-E8). No link to locations (R-E9).

**employee_profiles** — one row per user.

| Column | Type | Notes |
|---|---|---|
| `userId` | FK users, unique | |
| `employeeCode` | unique | `HO-001`… from `sequences` (R-E7) |
| `photoFileId` | FK files, nullable | |
| `dateOfBirth`, `gender`, `bloodGroup` | nullable | |
| `addressLine`, `city`, `state`, `pincode` | nullable | |
| `emergencyName`, `emergencyRelation`, `emergencyPhone` | nullable | |
| `joiningDate` | ymd | |
| `departmentId`, `designationId` | FK | |
| `employmentType` | enum `permanent, probation, contract, part_time` | |
| `status` | enum `active, notice, inactive` | |
| `lastWorkingDay` | ymd, nullable | |
| `exitReason` | enum `resigned, terminated, other`, nullable; `exitNote` text | |
| `profileState` | enum `incomplete, pending_review, complete` | Drives "Complete your profile" |

**employee_bank_details** — `userId` unique, `accountNumberEnc`, `accountLast4`, `ifsc`, `holderName`, `state` (`pending, approved, rejected`), reviewer fields.

**employee_documents** — `id`, `userId`, `type` enum `aadhaar, pan, bank_proof, offer_letter, other`, `numberEnc` (Aadhaar/PAN), `numberLast4`, `fileId`, `state` enum `pending, approved, rejected`, `rejectReason`, `uploadedById`, `reviewedById`, `reviewedAt`, `replacedById` (a newer upload; old ones kept, R-E4 history).

**profile_change_requests** — `id`, `userId`, `changes` JSON `{ field: { from, to } }` (personal fields only, R-E16), `state`, `reason` (on reject), `reviewedById`, `reviewedAt`.

**sequences** — `name` PK, `nextValue`. Row `employee_code`. Incremented inside the same transaction that creates the profile, so two parallel creates never get the same code.

### 1.3 Attendance

**attendance_punches**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `clientPunchId` | uuid, unique | Sent by the app; a retry of the same tap returns the first result (no duplicate). |
| `userId`, `locationId` | FK | |
| `ymd` | ymd (IST) | |
| `type` | enum `in, out` | |
| `punchedAt` | datetime (server time) | R-A6 |
| `lat`, `lng`, `accuracyM`, `distanceM` | nullable for corrections | |
| `selfieFileId` | FK files, nullable | Set to null when the selfie is purged (R-A8) |
| `source` | enum `self, correction_request, manager_fix` | |
| `correctionRequestId` | FK, nullable | |
| `removedAt`, `removedById`, `removeReason` | nullable | Removed punches are kept, not deleted |

**attendance_days** — one row per user per day; recomputed from punches; read by the salary module.

| Column | Notes |
|---|---|
| `userId`, `ymd` (unique together), `locationId` | Location of the first punch (R-A4) |
| `firstIn`, `lastOut` | |
| `workedMinutes`, `requiredMinutes`, `lateMinutes`, `extraMinutes`, `shortMinutes` | |
| `status` | `present, incomplete, absent, weekly_off, holiday, holiday_work` |
| `isFinal` | Set by the nightly job; recomputed if a punch on that day changes later |

**attendance_correction_requests** — `id`, `userId`, `ymd`, `items` JSON `[{ type: in|out, time: "HH:mm" }]`, `reason`, `state` (`pending, approved, rejected`), `reviewedById`, `reviewedAt`, `rejectReason`.

**push_subscriptions** — `id`, `userId`, `endpoint` unique, `p256dh`, `auth`, `userAgent`, `lastUsedAt`.

### 1.4 Shared

**audit_logs** — `id`, `actorId`, `action` (e.g. `attendance.punch.add`, `people.document.approve`, `people.sensitive.reveal`), `entityType`, `entityId`, `before` JSON, `after` JSON, `reason`, `createdAt`. Append only.

**files** — `id`, `storageKey`, `mimeType`, `sizeBytes`, `kind` (`selfie, document, photo`), `ownerUserId`, `createdAt`, `deletedAt`. Files live under `data/uploads/private/` and are served only through `GET /api/v1/files/:id` after a permission check (the current public `/uploads` route is not used for these).

### 1.5 Encryption of sensitive numbers

Aadhaar, PAN and bank account numbers are encrypted with **AES-256-GCM** in the application. The key comes from `FIELD_ENCRYPTION_KEY` in `.env`; **the API refuses to start without it** (or with a wrong length). `…Last4` columns hold the visible part for masked display (`XXXX-XXXX-4821`). Revealing the full number requires the sensitive permission and writes `people.sensitive.reveal` to the audit log (R-E17).

---

## 2. Day calculation (pure function)

`computeDay({ punches, location, ymd, holidaysForLocation }) → attendance_days row`. It does no I/O, so it can be fully unit tested.

1. Ignore removed punches. Sort the rest by `punchedAt`.
2. Pair them up: `in → next out`. Worked minutes = sum of the paired intervals (R-A5).
3. Off day = Sunday, or a holiday for that location or for all locations (R-A11).
4. Status:
   - no punches: `weekly_off` (Sunday), `holiday` (holiday), else `absent`
   - last punch is `in` and the day is over (after `dayEnd`, or a past date): `incomplete`. Worked minutes for an incomplete day count only closed pairs and are flagged, so salary can treat it as unresolved.
   - otherwise: `holiday_work` on an off day, else `present`
5. `lateMinutes` = max(0, firstIn − `lateAfter`), in whole minutes. Exactly `lateAfter` (e.g. 10:00:59) is **not** late; late starts from 10:01:00. *(Boundary to confirm in review.)*
6. `requiredMinutes` = location `requiredWorkMinutes` on working days, 0 on off days. `shortMinutes` = max(0, required − worked). `extraMinutes` = max(0, worked − required). Each day stands alone (R-A13).

When it runs: after every punch, after a correction is approved or a manager fix is saved, and in the nightly job (which also marks `isFinal` and creates `absent`, `weekly_off` and `holiday` rows for people with no punches).

---

## 3. Flows

### 3.1 Punch (R-A1…A8)

1. The app reads the user's state for today. The button shows **Punch In** if there are no punches or the last one is `out`, otherwise **Punch Out**.
2. Live selfie → GPS (high accuracy, 15 s timeout) → `POST /api/v1/attendance/punches` (multipart: selfie, `lat`, `lng`, `accuracyM`, `clientPunchId`).
3. Server checks, in order:
   1. user is active and has an employee profile
   2. `clientPunchId` is new; if not, return the existing punch
   3. the nearest assigned location with coordinates is within `radiusM` (Haversine distance)
   4. if the user already punched today, the location must be the same as that day's first punch
   5. the type follows the last punch (`in` after `out`)
4. Save the selfie file, then the punch, in one transaction; recompute the day; return the punch and the day summary.
5. Refusal messages: "You are 340 m away from Warehouse (limit 100 m)", "You can punch only at: Warehouse", "You already punched in at Shop today".

### 3.2 Fix request (R-A16, R-A17, R-A20)

Employee: `POST /attendance/corrections` with `ymd` (at most 7 days back, not in the future), the missing items and a reason. Notify the reporting manager. Approver (reporting manager, or a holder of *Attendance manage*): approve → create punches with `source = correction_request`, recompute, audit; reject → reason required, notify the employee.

### 3.3 Manager fix (R-A18, R-A19)

Add / edit / remove a punch with a required reason. Edit = remove the old punch + add a new one, so the history stays. Audit `before`/`after`. Allowed for: reporting manager (own team, via the reporting hierarchy), *Attendance manage* holders (everyone).

### 3.4 Onboarding (R-E18…E22)

HR `POST /people`: create the user (no usable password, `isActive = true`) + profile (next code) + locations, all in one transaction. The email domain must be in `ALLOWED_EMAIL_DOMAINS` (`hasanoud.com,hasanoud.in`). Send the invite (the existing password-reset link, 7 days). The employee completes their profile; each part moves to `pending`; HR reviews in **Approvals**. `profileState` becomes `complete` when every required part is approved. Attendance works from `joiningDate` regardless of `profileState`.

### 3.5 Change request (R-E15, R-E16)

Only personal fields (address, emergency contact, DOB, gender, blood group, photo) can be requested. Approve applies all fields in one transaction and writes the audit log. Bank details and documents use their own upload → review flow.

### 3.6 Offboarding (R-E23…E26)

HR sets `lastWorkingDay` + reason → `status = notice`. The nightly job for the day after `lastWorkingDay`, in one transaction:

- `users.isActive = false`, refresh token cleared (all sessions end)
- **Team:** users with `reportsToId = leaver` → the leaver's `reportsToId`, or the first active admin if the leaver had none
- **Tasks:** active task templates where the leaver is an assignee → leaver removed, the same receiver added
- `status = inactive`; audit entry listing what moved

Rejoin: HR reactivates the same record (same code), sets a new joining date, and a fresh invite is sent.

---

## 4. Scheduled jobs (inside the API process, IST)

| Job | When | Does |
|---|---|---|
| Punch-in reminder | Every 5 min, working days | Not punched in by `lateAfter + 15 min` → push, once per day (R-A21) |
| Punch-out reminder | Every 5 min | Last punch is `in` at `dayEnd + 30 min` → push, once per day (R-A22) |
| Close the day | 23:55 | Recompute and finalise every active employee's day; create `absent` / `weekly_off` / `holiday` rows |
| Manager summary | 09:00 | Per manager: yesterday's absent and incomplete team members → push + in-app list (R-A23) |
| Offboarding | 00:10 | Deactivate the people whose last working day was yesterday (§3.6) |
| Selfie purge | 03:00 | Delete selfie files older than 40 days; null the punch's `selfieFileId` (R-A8) |

Each job records its last successful run, so a restart does not send reminders twice.

---

## 5. API (summary)

All routes are under `/api/v1`, need a login, and the permission check runs on the server.

| Method | Path | Who |
|---|---|---|
| GET | `/attendance/me/today`, `/attendance/me?month=` | Self |
| POST | `/attendance/punches` | Self |
| POST | `/attendance/corrections` | Self |
| GET | `/attendance/team/today`, `/attendance/team?month=` | Manager (team), Attendance manage (all) |
| GET/POST | `/attendance/corrections/pending`, `/:id/approve`, `/:id/reject` | Manager (team), Attendance manage |
| POST/PATCH/DELETE | `/attendance/punches/manual…` | Manager (team), Attendance manage — reason required |
| POST/DELETE | `/notifications/push-subscriptions` | Self |
| GET | `/people`, `/people/:id` | People view (managers: team, basic fields only) |
| POST | `/people` | People create |
| PATCH | `/people/:id` (basic), `/people/:id/offboard`, `/people/:id/rejoin` | People edit |
| GET/PATCH | `/people/me`, `/people/me/change-requests`, `/people/me/documents`, `/people/me/bank` | Self |
| GET/POST | `/people/approvals`, `…/:id/approve`, `…/:id/reject` | People sensitive |
| POST | `/people/:id/reveal` (`field`) | People sensitive — audited |
| CRUD | `/people/departments`, `/people/designations` | People edit |
| GET | `/files/:id` | Owner of the file, or a role allowed to see that record |

---

## 6. Permissions

New RBAC modules: **`people`**, **`peopleSensitive`**, **`attendanceManage`**.

| Role (default) | people | peopleSensitive | attendanceManage |
|---|---|---|---|
| admin | all | all | all |
| manager | view (team, basic fields only) | — | — |
| user | — | — | — |

- The **HR manager** gets all three through **special permissions** set by the admin.
- Own profile and own attendance need no permission.
- The team scope comes from the reporting hierarchy (the existing descendant lookup).

---

## 7. Errors

| Case | Behaviour |
|---|---|
| GPS / camera permission denied | No punch; show how to allow it |
| GPS gives no fix in 15 s | "Location not found. Go near a window and try again." |
| Network drops after the tap | Retry with the same `clientPunchId` → same result, no duplicate |
| Double tap | Button disabled while sending; the server dedupes too |
| Selfie upload fails | Punch not saved |
| Location has no coordinates | "Location not set up for punching. Contact HR." |
| `FIELD_ENCRYPTION_KEY` missing or invalid | API does not start |
| Document > 5 MB or not an image/PDF | Refused before upload |
| Invite to a non-company email | Refused |

## 8. Points to confirm in review

These are design details I filled in. They were not discussed; please confirm or change.

1. **Late boundary:** 10:00:59 is on time, 10:01:00 is late (minute precision).
2. **Manager summary time:** 9:00 am.
3. **Address fields:** split into address line, city, state, pincode.
4. **Exit reasons:** resigned, terminated, other (+ a note).
5. **Tasks on offboarding:** the leaver is removed from task templates and the receiver is added in their place.
6. **Encryption key:** kept in the server `.env` and in one safe place outside the server (e.g. a password manager).
7. **Punch-in reminder for someone assigned to both W and S** who has not punched yet: use the **earliest** late time among their locations (10:00 + 15 min). Otherwise we cannot know where they will work that day.
8. **Today before `dayEnd`:** an open In shows as present (in progress), and worked time counts only closed pairs. It becomes incomplete only after `dayEnd`.

## 9. Screens

Approved mockups (open in a browser): `employee-home` (layout **B**), `employee-attendance`, `manager-team`, `hr-screens`, `employee-profile`. Labels in the final app are in **simple English** (the first two mockups still show older Hinglish labels).

## 10. Rollout

1. Build on a branch → **staging** (`/opt/hasanoud/staging`, own subdomain, HTTPS).
2. Test on 2–3 real Android phones at the warehouse and the shop.
3. Before launch: admin email moved to `@hasanoud`, GPS coordinates for the warehouse and the shop, departments and designations created, `FIELD_ENCRYPTION_KEY` set and backed up safely **outside** the server (lost key = encrypted numbers lost).
4. **Pilot:** 3–5 employees for 1 week alongside SalaryBox; compare the daily results.
5. All 15 employees. SalaryBox keeps running until the business switches it off.
