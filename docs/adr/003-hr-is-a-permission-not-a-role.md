# ADR-003: HR is a department; HR powers are permissions, not a new role

**Status:** Accepted (October 2026)

## Context

Employee records need someone besides the admin to manage sensitive data and approvals. The business sees HR as a **department** whose manager does this work, not as a separate kind of user.

## Decision

No `hr` role. Add three permission modules: `people`, `peopleSensitive` and `attendanceManage`. The admin grants them to the HR manager through the existing per-user **special permissions**.

## Options considered

- **A new `hr` role:** simpler to read in the role list, but it does not match how the business works. A department manager would need two roles, and the role list grows with every department.

## Consequences

- When the HR manager changes, the admin moves the permissions to the new person.
- Default role permissions stay small: managers see only their team's basic details.
