# Test cases — People and Attendance

Status: **draft for review**. Covers [employee-management.md](../requirements/employee-management.md) (`R-…`) and [employee-attendance-lld.md](../lld/employee-attendance-lld.md).

**Type:** `U` unit test (code, no database) · `A` API test (code, test database) · `M` manual (on a real phone, on staging).

## Test setup (used by every case)

| Name | Details |
|---|---|
| **Warehouse (W)** | 10:00–19:00, late after 10:00, required work 480 min (8 h), radius 100 m |
| **Shop (S)** | 11:00–21:00, late after 11:00, required work 600 min (10 h), radius 100 m |
| **Admin** | role admin |
| **Riya** | HR manager: role manager + special permissions `people`, `peopleSensitive`, `attendanceManage` (all actions) |
| **Salman** | manager, reports to Admin, assigned W + S |
| **Ravi** | user, reports to Salman, assigned W |
| **Sana** | user, reports to Salman, assigned W + S |
| **Imran** | user, reports to Riya (not in Salman's team), assigned W |
| Dates | Mon 16 Nov 2026 is a working day; Sun 15 Nov is Sunday; Tue 17 Nov is a holiday for all locations |

---

## 1. Day calculation — `computeDay` (U)

| ID | Req | Input | Expected |
|---|---|---|---|
| DC-01 | A9 | W, Mon: in 10:00, out 13:00, in 14:00, out 19:00 | present, worked 480, late 0, short 0, extra 0 |
| DC-02 | A5, A9 | W, Mon: in 09:55, out 19:05 (no break punch) | present, worked 550, extra 70 |
| DC-03 | A9, A12 | W, Mon: in 10:00, out 13:00, in 14:30, out 19:00 | present, worked 450, **short 30** |
| DC-04 | A9 | W, Mon: in 10:00:59 | late 0 *(boundary — see LLD §8.1)* |
| DC-05 | A9 | W, Mon: in 10:01:00, out 19:00 | late 1 |
| DC-06 | A9 | W, Mon: in 10:20, out 19:00 | late 20, worked 520, extra 40 (late does not cancel extra time) |
| DC-07 | A10 | S, Mon: in 11:00, out 21:00 | present, worked 600, short 0 |
| DC-08 | A10 | S, Mon: in 11:30, out 21:00 | late 30, worked 570, short 30 |
| DC-09 | A16 | W, past day: in 10:00 only | **incomplete**, closed-pair worked 0 |
| DC-10 | A16 | W, past day: in 10:00, out 13:00, in 14:00 (last out missing) | incomplete, closed-pair worked 180 |
| DC-11 | A16 | W, today 15:00: in 10:00 (day not over) | present, worked counts closed pairs only; **not** incomplete before `dayEnd` |
| DC-12 | A11 | Sunday, no punches | weekly_off, required 0 |
| DC-13 | A11 | Holiday (all locations), no punches | holiday, required 0 |
| DC-14 | A11 | Holiday for **Shop only**; Ravi (W), no punches | absent (holiday does not apply to W) |
| DC-15 | A15 | Sunday: in 10:00, out 15:00 | holiday_work, worked 300, required 0 |
| DC-16 | A15 | Holiday: in 11:00, out 21:00 at S | holiday_work, worked 600 |
| DC-17 | — | Working day, no punches | absent, short = required |
| DC-18 | A13 | Mon worked 600 (W), Tue worked 420 (W) | Mon extra 120; Tue **short 60** (no carry-over) |
| DC-19 | A18 | Punches include one removed punch | removed punch ignored |
| DC-20 | — | Punches given out of order | sorted by time before pairing |

## 2. Punch (A / M)

| ID | Req | Steps | Expected |
|---|---|---|---|
| PU-01 | A1, A2 | Ravi, at W (30 m), selfie, no punch today → Punch | `in` saved, server time, distance 30, accuracy saved, selfie saved |
| PU-02 | A2 | Ravi, 340 m from W → Punch | refused: "You are 340 m away from Warehouse (limit 100 m)"; nothing saved |
| PU-03 | A2 | HR sets W radius 400 m; repeat PU-02 | accepted |
| PU-04 | A3 | Ravi, standing at S (assigned only W) → Punch | refused: "You can punch only at: Warehouse" |
| PU-05 | A4 | Sana, first punch of day at S, later tries at W | refused: "You already punched in at Shop today" |
| PU-06 | A4 | Sana punches at S | day uses S rules (late after 11:00, 600 min) |
| PU-07 | A5 | Ravi: in, out, in, out on one day | 4 punches; button alternates In/Out |
| PU-08 | — | Ravi already `in`; API call with `type=in` | refused (wrong order) |
| PU-09 | A6 | Phone clock set 2 hours ahead → Punch | stored time = server time |
| PU-10 | — | Same `clientPunchId` sent twice (network retry) | one punch; second call returns the first |
| PU-11 | — | Double tap the button | one punch |
| PU-12 | A1 | Request without selfie | refused; nothing saved |
| PU-13 | — | Location without coordinates | refused: "Location not set up for punching" |
| PU-14 | E24 | Inactive user → Punch | refused (401) |
| PU-15 | E21 | New employee, profile incomplete, joining date today → Punch | accepted |
| PU-16 | A7 | Phone offline → Punch | app shows "No internet", nothing queued |
| PU-17 | A1 (M) | Gallery picker | not offered; live front camera only |
| PU-18 | — (M) | Camera or GPS permission denied | no punch; app shows how to allow it |

## 3. Fix requests (A)

| ID | Req | Steps | Expected |
|---|---|---|---|
| CR-01 | A16 | Ravi asks: 12 Nov, missing out 19:05, reason | request `pending`; Salman notified |
| CR-02 | A17 | Salman approves CR-01 | punch added (`source=correction_request`); 12 Nov recomputed → present; audit entry |
| CR-03 | A17 | Salman rejects without a reason | refused (reason required) |
| CR-04 | A17 | Salman rejects with a reason | `rejected`; Ravi notified with the reason; no punch |
| CR-05 | A20 | Ravi asks for a date 8 days ago | refused (7-day limit) |
| CR-06 | A20 | Ravi asks for tomorrow | refused |
| CR-07 | A17 | Salman tries to approve Imran's request (not his team) | 403 |
| CR-08 | A17 | Riya (attendanceManage) approves Imran's request | allowed |
| CR-09 | A17 | Admin approves any request | allowed |
| CR-10 | — | Ravi tries to approve his own request | 403 |

## 4. Manager fixes (A)

| ID | Req | Steps | Expected |
|---|---|---|---|
| MF-01 | A18 | Salman adds an `out` 19:00 for Ravi with a reason | punch `source=manager_fix`; recomputed; audit with reason |
| MF-02 | A18 | Same without a reason | refused |
| MF-03 | A18, A19 | Salman edits Ravi's in 10:20 → 10:00 | old punch marked removed, new punch added; audit `before`/`after`; history shows both |
| MF-04 | A18 | Salman removes a punch | kept with `removedAt`; ignored in the calculation; audit |
| MF-05 | A18 | Salman fixes Imran (not his team) | 403 |
| MF-06 | A18 | Riya fixes anyone | allowed |
| MF-07 | A19 | Ravi calls the manual-punch API for himself | 403 |

## 5. Reminders and jobs (A, with a controlled clock)

| ID | Req | Setup | Expected |
|---|---|---|---|
| RM-01 | A21 | Mon 10:15, Ravi not punched in | one push to Ravi |
| RM-02 | A21 | Same, job runs again at 10:20 | no second push |
| RM-03 | A21 | Sunday / holiday 10:15 | no push |
| RM-04 | A21 | Sana assigned W+S, no punch: which late time? | push after the earliest assigned location's late time + 15 min *(confirm in review)* |
| RM-05 | A22 | Mon 19:30, Ravi's last punch is `in` | one push |
| RM-06 | A22 | Mon 19:30, Ravi punched out | no push |
| RM-07 | A23 | Tue 09:00; Mon: Ravi incomplete, Sana absent | Salman gets one summary (1 absent, 1 incomplete) + in-app list |
| RM-08 | — | Close-day job, Ravi no punches on a working day | absent row created, `isFinal` |
| RM-09 | A8 | Selfie 41 days old | file deleted, punch keeps time/GPS, `selfieFileId` null |
| RM-10 | A8 | Selfie 39 days old | kept |
| RM-11 | — | API restarts at 10:16 after a reminder at 10:15 | no repeat push |
| RM-12 | A21 | User has no push subscription | no error; job continues for others |

## 6. People — onboarding, profile, documents (A)

| ID | Req | Steps | Expected |
|---|---|---|---|
| PE-01 | E18, E7 | Riya creates an employee with basics | user + profile `HO-00n` + locations; invite email sent |
| PE-02 | U2 | Email `faiz@gmail.com` | refused (company email only) |
| PE-03 | U2 | Email `faiz@hasanoud.in`, then `faiz@hasanoud.com` | .in accepted; .com refused |
| PE-04 | E7 | Two employees created at the same time | different codes, no gap reuse |
| PE-05 | E7 | Next value 999 → 1000 | codes `HO-999` then `HO-1000` |
| PE-06 | E20 | Employee submits personal details | `pending`; appears in Riya's Approvals |
| PE-07 | E20 | Riya approves all parts | `profileState=complete` |
| PE-08 | E15 | Ravi requests address + emergency contact change | one request with both; profile unchanged until approval |
| PE-09 | E15 | Riya approves PE-08 | both applied; audit entry |
| PE-10 | E16 | Ravi requests a department / manager / location change via API | refused |
| PE-11 | E4 | Upload Aadhaar 6 MB | refused (5 MB) |
| PE-12 | E4 | Upload a `.exe` renamed `.jpg` | refused (content type check) |
| PE-13 | E4 | Upload a new PAN after one is approved | new one `pending`; old one kept as history |
| PE-14 | E17 | Ravi views his own Aadhaar | shows `XXXX-XXXX-4821` |
| PE-15 | E17 | Riya clicks Show | full number; audit `people.sensitive.reveal` |
| PE-16 | E8 | Riya adds a department; deactivates one in use | added; the deactivated one is hidden from new forms, existing employees keep it |
| PE-17 | — | DB row for Aadhaar | `numberEnc` is not the plain number |
| PE-18 | — | Start the API without `FIELD_ENCRYPTION_KEY` | API refuses to start |

## 7. Offboarding (A)

| ID | Req | Steps | Expected |
|---|---|---|---|
| OF-01 | E23 | Riya sets LWD 30 Nov for Ravi | status `notice`; Ravi can still log in |
| OF-02 | E23 | Job on 1 Dec 00:10 | Ravi `isActive=false`, sessions ended, status `inactive` |
| OF-03 | E23 | Ravi tries to log in on 1 Dec | refused |
| OF-04 | E25 | Ravi assigned to 3 active task templates | Ravi removed, Salman added on all 3 |
| OF-05 | E25 | Salman (manager of Ravi, Sana) offboarded | Ravi, Sana now report to Admin (Salman's manager); Salman's tasks → Admin |
| OF-06 | E25 | Offboarded person has no manager | team and tasks → first active admin |
| OF-07 | E24 | After offboarding | profile, punches, documents still readable by Riya |
| OF-08 | E24 | Delete-user API | no longer exists (404) |
| OF-09 | E26 | Riya rejoins Ravi | same record, same code `HO-001`, new joining date, new invite |
| OF-10 | E23 | Riya cancels offboarding before LWD | status back to `active`, nothing moved |

## 8. Permissions (A)

| ID | Req | Who / action | Expected |
|---|---|---|---|
| PM-01 | E12 | Salman: list people | only his team, basic fields only (no address/DOB/bank/documents) |
| PM-02 | E12 | Salman: open Imran | 403 |
| PM-03 | E12 | Salman: open Ravi's documents or bank | 403 |
| PM-04 | E13 | Ravi: open Sana's profile | 403 |
| PM-05 | E13 | Ravi: open his own profile | allowed, sensitive numbers masked |
| PM-06 | E11 | Riya: everything in People | allowed |
| PM-07 | E14 | Admin removes Riya's special permissions | Riya loses People access within the permission cache window |
| PM-08 | — | Ravi requests another user's selfie file `GET /files/:id` | 403 |
| PM-09 | — | Salman requests Ravi's selfie | allowed (team) |
| PM-10 | — | Not logged in → any `/files/:id` | 401 |
| PM-11 | — | Old public `/uploads/...` path for a selfie | not found (private files are not served there) |

## 9. On real phones — staging (M)

| ID | Steps | Expected |
|---|---|---|
| MP-01 | Install the app on 3 Android phones (different makes) | "Add to home screen" works; opens full screen |
| MP-02 | Punch inside the warehouse building (indoors) | succeeds; note the reported accuracy |
| MP-03 | Punch at the shop counter | succeeds |
| MP-04 | Punch from the street ~150 m away | refused with the distance |
| MP-05 | Allow notifications; wait for the punch-in reminder | notification arrives with the app closed |
| MP-06 | Weak network at the shop | punch completes or shows a clear retry message; never two punches |
| MP-07 | Pilot week: 3–5 employees, compare with SalaryBox daily | differences explained (or bugs filed) |
