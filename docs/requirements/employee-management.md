# Requirements — Employee management and attendance

Agreed with the business owner, October 2026. Each requirement has an ID used by the LLD and the test cases.

**Scope of employee management:** employee record (A), attendance (B), leave (C), salary (D).
**First release: A + B.** C and D come later; decisions that belong to them are recorded under *Later modules*.

## 1. Who uses it

| ID | Requirement |
|---|---|
| R-U1 | **Every employee has a login** and uses the app: own tasks, attendance, later salary slips. An employee *is* a platform user. |
| R-U2 | Login only with a **company email**: `@hasanoud.in` (all employee emails are on .in; the domain list is a setting, so .com can be added later). Phone login stays available. |
| R-U3 | Employees mostly use **Android** phones. The app is the existing web app, installable on the phone (PWA). |
| R-U4 | App language: **simple English**, everyday words. |

## 2. Attendance

### Punching

| ID | Requirement |
|---|---|
| R-A1 | Punch In / Punch Out from the phone with a **selfie** each time (live camera, not gallery). |
| R-A2 | GPS is checked: punch only within the location's radius. **Default radius 100 m**, editable per location by HR/admin. |
| R-A3 | An employee can punch only at **locations assigned to them**. |
| R-A4 | Some employees work at the warehouse on some days and at the shop on others (never both in one day). **The rules of the location where they punched apply that day.** All punches of a day are at the same location. |
| R-A5 | **Several In/Out pairs per day** are allowed (breaks). Worked time = sum of all In→Out intervals. |
| R-A6 | **Server time** is used, not the phone's clock. |
| R-A7 | Punching needs **internet**. No offline punches. |
| R-A8 | Selfie is **for the record only** (no face match). Selfies are kept **40 days**, then deleted automatically. The punch record (time, place, GPS) is kept forever. |

### Rules per location

| ID | Location | Day | Break | Required **work** time | Late after |
|---|---|---|---|---|---|
| R-A9 | Warehouse | 10:00 am – 7:00 pm | 1 hour, by punching out and in | **8 hours** | 10:00 am |
| R-A10 | Shop | 11:00 am – 9:00 pm | **No break** | **10 hours** | 11:00 am |

| ID | Requirement |
|---|---|
| R-A11 | Weekly off: **Sunday for everyone.** Holidays come from the existing holiday list (per location / all locations). |
| R-A12 | If required work time is not met, **money is deducted** (amount decided in the salary module). |
| R-A13 | **Each day counts on its own.** Extra time on one day does not make up for less time on another. |
| R-A14 | Extra time is **recorded** but not paid. |
| R-A15 | Work on **Sunday or a holiday** is recorded separately; it is **paid extra** (amount decided in the salary module). |

### Mistakes and corrections

| ID | Requirement |
|---|---|
| R-A16 | People forget to punch in and to punch out. The **employee can ask for a fix** (missing time + reason). |
| R-A17 | Fix requests are approved or rejected by the **reporting manager**, and also by the **HR manager** or **admin**. Reject needs a reason. |
| R-A18 | A manager / HR / admin can also **fix punches directly** (add, edit, remove) — a reason is required. |
| R-A19 | **Every change is recorded**: who, when, what it was before, what it became. |
| R-A20 | Fix requests can be made for the **last 7 days** only. |

### Reminders

| ID | Requirement |
|---|---|
| R-A21 | **App notification** to the employee: not punched in **15 minutes after the late time** (working days only). |
| R-A22 | **App notification** to the employee: still punched in **30 minutes after shift end**. |
| R-A23 | **Every morning**, the reporting manager gets a notification and an in-app list: who in the team was **absent** or **incomplete** yesterday. |

### Transition

| ID | Requirement |
|---|---|
| R-A24 | **SalaryBox** (today's attendance app: GPS + selfie) runs **in parallel** until the business decides to switch it off. No data connection between them; HR compares reports. |

## 3. Employee record

### Fields

| ID | Group | Fields |
|---|---|---|
| R-E1 | Already in the system | Name, email, phone, role, reporting manager, locations |
| R-E2 | Personal | Photo, date of birth, gender, home address, emergency contact (name, relation, phone), blood group |
| R-E3 | Job | Employee code, joining date, department, designation, employment type (permanent / probation / contract / part-time), exit date and reason |
| R-E4 | Documents (upload) | Aadhaar, PAN, bank passbook or cancelled cheque, offer/appointment letter, other |
| R-E5 | Bank | Account number, IFSC, account holder name |
| R-E6 | Not here | **Base salary lives in the salary module.** |

### Codes and lists

| ID | Requirement |
|---|---|
| R-E7 | Employee code is **automatic, next number, prefix `HO`**: `HO-001`, `HO-002`, … (after `HO-999` comes `HO-1000`). |
| R-E8 | **Departments and designations** are lists that HR / admin create and edit in the app. |
| R-E9 | A department is **not tied to a location**; HR decides. |

### Who sees and changes what

| ID | Who | Basic | Personal | Documents and bank |
|---|---|---|---|---|
| R-E10 | Admin / owner | view + edit | view + edit | view + edit |
| R-E11 | HR manager | view + edit | view + edit | view + edit |
| R-E12 | Manager (own team only) | view only | — | — |
| R-E13 | Employee (self) | view | view, ask to change | view (numbers half hidden), upload new |

| ID | Requirement |
|---|---|
| R-E14 | Records are managed by the **admin/owner and the HR manager**. **HR is a department, not a role:** the admin gives the HR manager the needed permissions. |
| R-E15 | An employee's change **applies only after HR approves** it. One request can change several fields. |
| R-E16 | **Department, designation, manager and location: only HR changes them.** The employee cannot request changes to these. |
| R-E17 | Aadhaar, PAN and bank numbers are **shown half hidden** everywhere, also to the employee. Seeing the full number is logged. |

### Joining (onboarding)

| ID | Requirement |
|---|---|
| R-E18 | HR / admin fills **basic details only** (name, company email, phone, joining date, department, designation, locations, reporting manager, employment type). |
| R-E19 | An **invite link** goes to the company email (valid 7 days) to set a password. |
| R-E20 | The employee fills personal details, emergency contact, bank and documents ("Complete your profile"); **HR approves** each part. |
| R-E21 | The employee can **punch from the joining date**, even before the profile is complete or approved. |
| R-E22 | Existing employees are entered the same way: HR fills basics, the employee completes the profile. |

### Leaving (offboarding)

| ID | Requirement |
|---|---|
| R-E23 | HR sets **last working day** and reason. Login works **until the last working day**, then stops automatically. |
| R-E24 | Employees are **never deleted**, only made inactive. All records stay forever. |
| R-E25 | The leaver's **open tasks and team** move to **their reporting manager**; if they were at the top, to the **admin**. The manager can then pass tasks to someone else. |
| R-E26 | A person who **rejoins** gets the **same record and the same code** back. |

## Later modules (decided now, built later)

- **Salary (D):** base salary; deduction when required hours are not met; commission for shop staff and office sales people (WhatsApp sales); extra pay for Sunday/holiday work; salary slips visible to employees.
- **Leave (C):** leave requests, approval, balance; whether festival holidays are paid.

## Size

- **15 employees** today (October 2026). With selfies kept 40 days: 15 × ~4 punches × 40 days × ~100 KB ≈ **240 MB** at most — no storage concern.
