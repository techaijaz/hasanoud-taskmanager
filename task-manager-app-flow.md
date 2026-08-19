# App Flow Document — Task Manager App

**Status:** Draft v1
**Companion to:** Product Requirements Document (PRD v2)

---

## 1. Roles Covered

- **Admin** — company-wide control
- **Manager** — controls own team/users
- **User (Employee)** — completes assigned tasks

No self-signup exists for any role — every account is created by someone with permission (Admin creates Managers and Users; Manager creates Users within their team).

---

## 2. Login Flow

```
[App opens] -> [Login screen: phone/email + password]
        |
        |-- Invalid credentials --------> Error state: "Wrong phone/email or password. Try again."
        |-- Valid credentials -----------> Role check
                                                |
                                +---------------+----------------+
                                |               |                |
                             Admin          Manager             User
                                |               |                |
                        Admin Dashboard   Manager Dashboard   Task Board
                        (Task Board +     (Task Board +       (default landing)
                         Task List +       Task List +
                         Holiday Manager   Holiday Manager
                         + Users/Locations  + Users
                         + Reports)         + Reports)
```

- No "Forgot password" self-service flow — a User who forgets their password contacts their Manager (or Admin), who resets it manually from the User Management screen.
- No signup link is shown anywhere in the login screen — only "Login."
- On successful login, the app remembers the session (stay logged in) until explicit logout.

**Login screen states:**
| State | What's shown |
|---|---|
| Default | Phone/email field, password field, "Login" button |
| Loading | Button shows a spinner, fields disabled |
| Error | Red inline text below password field: "Wrong phone/email or password. Try again." |
| Success | Brief transition, redirect to role-based home screen |

---

## 3. All Pages / Screens

**Main navigation tabs: Task Board, Manage Tasks, Administrator/Settings, Report** (Task Board is common to all roles; the other three are scoped by permission and hidden entirely for Employees).

### Shared (all roles, scoped by permission)
1. **Login**
2. **Task Board** — complete/view tasks (Employee: own tasks; Manager/Admin: team/company monitor view)
3. **Notification Center** — missed-task alerts (own scope per role)

### Manager + Admin only
4. **Manage Tasks** — task template management (create/edit/delete)
5. **Task Creation Form** — new task template
6. **Administrator/Settings** — contains:
   - **Holiday Manager** — location-wise holiday dates
   - **Users** — create/manage Users, reset passwords (Manager: own team; Admin: all)
   - **Managers** (Admin only) — create/manage Managers
   - **Locations** (Admin only) — create/manage Locations
7. **Report** — performance dashboard, scoped by role

### Employee-specific
8. **Task Detail / Item Completion** — inline within Task Board (photo upload + note + mark done)
9. **My Performance** — accessible via Report tab, own history/report only

---

## 4. Navigation Flow

### Employee (User)
```
Login -> Task Board (default landing)
              |
              +-- Date nav (prev/next) --> Task Board (different date, read-only if past)
              |
              +-- Tap checklist card ----> Item list (within same page)
              |         |
              |         +-- Tap pending item --> Photo upload + note -> Mark Done -> back to item list (status updates)
              |         +-- Tap done item -----> View submitted photo(s) + note (read-only)
              |
              +-- Bell icon --------------> Notification Center (own missed tasks — Employee sees a log of their own overdue/missed items)
              |
              +-- Report tab --------------> My Performance
```

### Manager
```
Login -> Manager Dashboard (Task Board, team-scoped)
              |
              +-- Task Board tab ---------> Team's task status, filter by employee/location, date nav
              +-- Manage Tasks tab -------> Own team's task templates
              |         +-- "+" button ---> Task Creation Form -> Save -> back to Manage Tasks (new template appears)
              |         +-- Kebab menu ---> Edit / Delete / Skip-on-holiday toggle
              +-- Administrator/Settings -> Holiday Manager (own locations) + Users (own team, add/manage/reset password)
              +-- Report tab -------------> Own team performance charts
              +-- Bell icon --------------> Notification Center (own team's missed tasks)
```

### Admin
```
Login -> Admin Dashboard (Task Board, company-wide)
              |
              +-- Task Board tab ---------> All locations/employees, filter by location/manager/employee, date nav
              +-- Manage Tasks tab -------> All templates (any manager's) -> can create/edit/delete/assign directly to any user
              +-- Administrator/Settings -> Holiday Manager (any location) + Users (all, add/manage/reset password) + Managers (create/manage) + Locations (create/manage)
              +-- Report tab -------------> Company-wide performance charts
              +-- Bell icon --------------> Notification Center (all missed tasks company-wide)
```

---

## 5. User Journeys

### Journey A — Manager creates a recurring checklist and assigns it
1. Manager logs in -> lands on Dashboard.
2. Taps **Task List** tab.
3. Taps **"+ Naya task banao."**
4. Fills: heading ("Shop opening checklist"), location, assignee(s), type = Recurring (daily), due time.
5. Adds checklist items one by one, each with its own priority and time.
6. (Optional) Opens kebab menu on the template, confirms "Skip on holiday" is ON (default).
7. Taps **Save**.
8. **Success state:** template appears at top of Task List with a confirmation toast: "Task saved."
9. From 12:00 AM the next applicable day, instances auto-generate on the assigned employee's Task Board.

### Journey B — Employee completes a task
1. Employee logs in -> lands on Task Board (today, default).
2. Sees pinned checklist card: "Shop opening checklist · 2 of 4 items done."
3. Taps the card -> item list opens.
4. Taps a pending item ("Stock check").
5. Taps **"Photo upload karo"** -> selects 1–5 images from camera/gallery.
6. (Optional) Taps **"Note likho"** -> types a short note.
7. Taps **"Mark done."**
8. **Validation:** if no photo attached, inline error: "Kam se kam 1 photo upload karo." Submission blocked until resolved.
9. **Success state:** item card updates to green "Done" (or red "Done — Late" if past due time), progress count on the parent card updates ("3 of 4 items done").
10. Employee can tap the now-done item again to view the submitted photo(s) and note, read-only.

### Journey C — Deadline missed, notification fires
1. A task's due time passes while status is still Pending.
2. System flips status to **Overdue/Pending** and creates a Notification record for the assigner (Manager or Admin) and their direct senior.
3. Both recipients (assigner + their senior) see a red badge on the bell icon and an entry in Notification Center: "Stock check (Lucknow shop) missed its 11:00 AM deadline — assigned to Ramesh."
4. The Employee (Ramesh) also sees this same missed task logged in their own Notification Center.
5. Employee later opens the task and completes it late -> status becomes **Done (Late)**, shown red, permanently.
5. Notification is marked resolved once the task is completed (badge count decreases), but the historical entry remains in the Notification Center log.

### Journey D — Holiday handling
1. Admin/Manager opens **Holiday Manager**, selects a location, adds a date (e.g. a festival closure) via a date picker + "Add" button.
2. **Success state:** date appears in the list with a small toast: "Holiday added."
3. On that date, any task whose template has "Skip on holiday" ON shows on the Task Board as **"Skipped (Holiday)"** — grayed out, locked, no action available.
4. If the shop unexpectedly opens that day, Manager/Admin (or Employee, if permitted) taps the toggle on that specific instance's card on the Task Board -> instance becomes active -> checklist can now be completed normally, for that day only.

### Journey E — Admin creates a Manager and a Location
1. Admin opens **Managers** tab -> "+ Add manager" -> fills name, phone/email, assigns default password or invite -> Save.
2. **Success state:** new Manager appears in list; toast: "Manager added."
3. Admin opens **Locations** tab -> "+ Add location" -> fills name, address -> Save.
4. New location becomes selectable in all location dropdowns (task creation, holiday manager, user assignment) across the app.

---

## 6. Button Actions (Inventory)

| Button | Location | Action |
|---|---|---|
| Login | Login screen | Authenticates, routes to role-based home |
| + Naya task banao | Task List | Opens Task Creation Form |
| Save (task) | Task Creation Form | Validates required fields, creates template, returns to Task List |
| Item jodo | Task Creation Form | Adds a new checklist item row |
| Kebab (⋮) | Task List card | Opens menu: Edit / Delete / Skip-on-holiday toggle |
| Photo upload karo | Item detail | Opens camera/gallery picker, attaches 1–5 images |
| Note likho | Item detail | Opens text field for optional note |
| Mark done | Item detail | Validates photo present, submits completion, updates status |
| Date nav arrows | Task Board | Moves the board's active date back/forward |
| Add (holiday date) | Holiday Manager | Adds a new date entry to the location's holiday list |
| Skip toggle (per instance) | Task Board (holiday day) | Overrides holiday-skip for that one instance/day |
| + Add user / manager / location | Respective management tabs | Opens creation form scoped to that entity |
| Reset password | User Management (per user row) | Manager/Admin sets a new password for that User manually |
| Bell icon | Global header | Opens Notification Center |
| Logout | Profile/menu | Ends session, returns to Login |

---

## 7. Empty States

| Screen | Condition | What's shown |
|---|---|---|
| Task Board | No tasks scheduled for the selected date | Illustration/icon + "Aaj ke liye koi task nahi hai." |
| Task List | No templates created yet | "Abhi tak koi task nahi bana. Pehla task banayein" + shortcut to creation form |
| Holiday Manager | No holidays added for a location | "Koi holiday date add nahi ki gayi." + prompt to add one |
| Notification Center | No missed tasks | "Sab kaam samay par ho raha hai — koi alert nahi." |
| Reports | No completed tasks yet in range | "Is period ke liye abhi data nahi hai." |
| User Management | No users under this manager yet | "Abhi koi user nahi joda. Pehla user add karein" |

---

## 8. Error States

| Scenario | Error shown |
|---|---|
| Wrong login credentials | "Wrong phone/email or password. Try again." (inline, red) |
| Mark done without photo | "Kam se kam 1 photo upload karo." (inline, blocks submission) |
| More than 5 photos selected | "Zyada se zyada 5 photos allowed hain." |
| Required field missing in Task Creation (title/location/assignee) | Inline red text under the specific field: "Ye field zaroori hai." |
| Network/save failure | Toast: "Save nahi ho paya. Dobara try karein." — form data retained, not cleared |
| Duplicate holiday date | "Ye date already holiday list me hai." |
| Permission-denied action (e.g. Manager tries to edit another manager's task) | "Aapke paas is action ki permission nahi hai." |
| Session expired | Redirect to Login with message: "Session khatam ho gaya, dobara login karein." |

---

## 9. Success States

| Action | Confirmation |
|---|---|
| Task template saved | Toast: "Task saved." + appears in Task List |
| Item marked done | Card turns green/red, progress count updates on parent checklist card |
| Holiday date added | Toast: "Holiday added." + appears in list |
| Holiday override toggled | Card unlocks immediately, badge changes from "Skipped" to "Active" |
| User/Manager/Location created | Toast: "[Entity] added." + appears in respective list |
| Task edited | Toast: "Changes saved." |
| Task deleted | Toast: "Task deleted." + removed from list (with brief undo option, optional) |
| Notification resolved (task completed after being flagged) | Badge count on bell icon decreases; entry stays in log marked resolved |

---

## 10. Open Questions (carried over / new)
- Undo option after deleting a task template — needed or not?
