# User Roles

**Document:** ERNS-USR
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Define the roles that can authenticate to the Event Registration and Notification System, what
each may do, and what each may not do.

This document is the authority for role design. The approval workflow, notification targeting,
and security plan all resolve permissions back to this document.

---

## Scope

**In scope:** the five ERNS system roles, their purposes, responsibilities, permission matrix,
and the deliberate exclusion of Club Officer.

**Out of scope:** how identities are created (see `PB-ENG-03 User and Role Management` in the
system playbook set is not applicable; identity provisioning is covered in
[SECURITY-PLAN.md](SECURITY-PLAN.md)), and role assignment workflow, covered in
[APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) for approvers.

---

## 1. Locked Decision

**CONFIRMED.** ERNS has exactly five system roles:

1. Administrator
2. Event Officer
3. Approver
4. Student
5. Attendance Staff

**CONFIRMED.** Club Officer is NOT a system login role.

No sixth role may be added without a change request under `PB-ENG-20 Change Management`.

---

## 2. Why Club Officer Is Excluded

**CONFIRMED.** The interview identified dependence on club officers as a problem. Information
must pass Council to club president to members, which creates delay and incomplete
dissemination.

**PROPOSED.** Club Officer is retained as a *supplementary reinforcement channel* outside the
system, not as a permission-bearing role. Officers may be listed as recipients of an
informational announcement, but hold no login, no approval rights, and no data access.

**ASSUMPTION.** Officers do not require their own login because their function is reinforcement
after official notification, not primary dissemination. Validate by confirming with the
Council Secretary that officers need no read access to participant data.

> **OPEN QUESTION:** Should club officers receive a limited read-only login to see only their own
> club's published events? See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-23.

---

## 3. Role Definitions

### 3.1 Administrator

**Purpose:** Own the system configuration, accounts, and integrity of the audit trail.

**Responsibilities**
- Provision, suspend, and reactivate user accounts
- Assign and revoke roles, including granting and revoking Approver
- Configure system-level settings: registration windows, notification policy defaults, retention
- Configure per-event-type approval chains
- Access and export the audit trail
- Perform data subject requests: correction and deletion within retention limits
- Own backup verification and recovery execution

**Accessible information:** all events including drafts; all registrations; all attendance; all
audit records; all user accounts; system configuration.

**Restricted information:** none at system level. Administrative access to student data is
itself an auditable event, because it is privileged access.

**Registration capabilities:** may register for events as a Student where an account has a
Student role, but administrative override of registration records is restricted as defined in
section 5.

**Notification capabilities:** may send system-wide announcements. May not send a notification
that impersonates an approver decision.

**Event-management capabilities:** full read of all events including unsubmitted drafts, for
support purposes. May not create or approve events in a capacity other than the roles held.

**Attendance capabilities:** may correct attendance for any event, with a mandatory reason.

> **OPEN QUESTION:** Should the Administrator role be held by one person, or separated into a
> technical administrator and a business administrator? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-24.

---

### 3.2 Event Officer

**Purpose:** Create event information, drive events through approval, publish approved events,
and communicate with participants.

**Responsibilities**
- Create and edit event drafts
- Attach event documents and materials lists
- Submit events for approval
- Respond to revision requests and resubmit
- Publish approved events
- Compose and send notifications, including reminders and event-change notices
- Manage registrations within their authority: close registration, cancel a registration with
  reason, manually register a participant with reason
- Produce event reports and complete post-event records and evaluation
- Configure which changes require re-approval

**Accessible information:** events they created; published events; participant lists for events
they own; registrations and attendance for events they own; notification activity for events
they own.

**Restricted information:** drafts and pending submissions belonging to other officers;
approval records for offices other than their own; user account credentials; audit records
outside events they own; student data unrelated to their events.

**Registration capabilities:** manual registration of a named participant into an owned event,
with a mandatory reason recorded in the audit trail. Not permitted to alter a registration's
created timestamp or a cancellation performed by a student.

**Notification capabilities:** send to any audience defined in
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md). Cannot send notifications for an event
they do not own. Cannot send a notification marked IMPORTANT without acknowledgement enabled,
which is enforced by the system rather than by policy.

**Event-management capabilities:** create, edit, submit, publish, and archive events they own.

**Attendance capabilities:** read attendance for owned events. Correction requires Attendance
Staff or Administrator role.

---

### 3.3 Approver

**Purpose:** Provide a recorded approval decision on an event, as a designated office.

**Responsibilities**
- Review submitted events against a defined checklist
- Approve, reject with reason, or request revision with comments
- Record their decision with a timestamp
- Decline or delegate an approval assignment when unqualified

**Accessible information:** events assigned to them for decision, including all draft fields
and attachments required to assess the event. Read access to registrations is NOT granted by
this role.

**Restricted information:** other offices' decisions; unpublished events not assigned to them;
participant identity data; notification content for other officers' events.

**Registration capabilities:** none.

**Notification capabilities:** none by this role. An Approver may not publish events or send
participant notifications. Separation of duties is deliberate.

**Event-management capabilities:** read assigned submissions; decide. No edit rights to the
event content, so an approver cannot modify a proposal they are approving.

**Attendance capabilities:** none.

> **OPEN QUESTION:** Which offices hold Approver authority, and is a single person designated
> per office or an entire office account? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-01, OQ-03, OQ-06.

---

### 3.4 Student

**Purpose:** Consume event information, register for events, and act on notifications.

**Responsibilities**
- Read published event information
- Register and cancel their own registration
- Read their own notifications and event history
- Acknowledge notifications requiring acknowledgement
- Confirm their attendance through QR or staff-assisted fallback

**Accessible information:** published events; their own registrations; their own notifications;
their own attendance record.

**Restricted information:** other students' registrations and personal data; unpublished or
under-review events; approval records; audit logs; any administrative or configuration data.

**Registration capabilities:** create and cancel their own registration. May not register on
another's behalf, may not modify a registration after cancellation, may not see a waitlist,
because capacity is a hard cap.

**Notification capabilities:** receive notifications. May not send, forward, or suppress
notifications.

**Event-management capabilities:** none.

**Attendance capabilities:** self-attend an event they are registered for, during the attendance
window, using their own credential or QR token.

> **OPEN QUESTION:** Must registration require login, or is a student ID plus institutional email
> sufficient? This materially changes duplicate prevention. See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-07.

---

### 3.5 Attendance Staff

**Purpose:** Record and correct attendance on event day, including when QR fails.

**Responsibilities**
- Operate QR scanning stations
- Record attendance via staff-assisted fallback
- Correct an incorrect attendance record with a mandatory reason
- Report QR technical failure to trigger the documented backup procedure
- Confirm attendance counts after the window closes

**Accessible information:** events currently in an attendance-enabled state; the participant
name and registration reference for those events; live attendance counts.

**Restricted information:** unapproved or cancelled events; participant contact details;
approval records; audit logs; other events' attendance.

**Registration capabilities:** none. Attendance Staff may not create registrations under any
circumstance, including when a walk-in asks to attend. This separation prevents attendance from
becoming a back door into registration.

**Notification capabilities:** none.

**Event-management capabilities:** none.

**Attendance capabilities:** full record and correction authority within the attendance window;
correction authority with reason after the window closes, subject to Administrator override for
after-the-fact bulk correction.

> **OPEN QUESTION:** May students who are not registered attend, and if so under what exception?
> See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-21.

---

## 4. Permission Matrix

`CR` create · `R` read · `U` update · `D` delete/archive · `—` no access

| Capability | Administrator | Event Officer | Approver | Student | Attendance Staff |
|---|---|---|---|---|---|
| Create event draft | U | CR | — | — | — |
| Edit own event draft | U | U | — | — | — |
| Edit any event draft | U | — | — | — | — |
| Read published events | R | R | R | R | R |
| Read own pending submissions | R | R | R | R | — |
| Read other officers' drafts | R | — | — | — | — |
| Submit for approval | U | U | — | — | — |
| Approve / reject / request revision | — | — | U | — | — |
| Publish approved event | U | U | — | — | — |
| Cancel event | U | U | — | — | — |
| Archive event | U | U | — | — | — |
| Close / reopen registration | U | U | — | — | — |
| Create own registration | U | U | — | U | — |
| Cancel own registration | U | U | — | U | — |
| Read own registrations | R | R | — | R | — |
| Read participant list for owned event | R | R | — | — | R |
| Read participant list for any event | R | — | — | — | — |
| Cancel another participant's registration | U | U | — | — | — |
| Manually register a participant | U | U | — | — | — |
| Export participant list | U | R (owned) | — | — | — |
| Send notification for owned event | U | U | — | — | — |
| Send system-wide announcement | U | — | — | — | — |
| Read notification activity | R | R (owned) | — | R (own) | — |
| Acknowledge notification | R | R | R | U | — |
| Record attendance via QR | U | R | — | U (own) | U |
| Record attendance via fallback | U | — | — | — | U |
| Correct attendance | U | — | — | — | U |
| Complete event evaluation | R | U | — | — | — |
| Configure approval chains | U | — | — | — | — |
| Manage user accounts and roles | U | — | — | — | — |
| Read audit trail | R | R (owned) | R (own) | — | — |
| Export audit trail | U | — | — | — | — |
| View system reports | R | R (owned) | R (pending) | R (own) | R (attendance) |
| Manage backups and recovery | U | — | — | — | — |
| Configure retention and retention holds | U | — | — | — | — |

---

## 5. Segregation of Duties

Four separations are deliberate and MUST be enforced in application logic, not only in the
interface.

**SD-1. Approver cannot publish.** An Approver may not hold Event Officer on the same event.
Otherwise the approval step becomes a formality.
Enforcement: publication requires an APPROVED record produced by a different user from the
publisher.

**SD-2. Attendance Staff cannot register.** Prevents attendance from becoming an unauthorised
registration path.
Enforcement: registration endpoints reject Attendance Staff and Approver role holders.

**SD-3. Event Officer cannot approve own event.** Enforced by SD-1.

**SD-4. Administrator corrections are attributable.** Administrative override of any
registration or attendance record requires a reason and is audited with the administrator's
identity. Administrator access is not anonymous.
Enforcement: override paths require a reason parameter and write an `AUD-14` audit event.

> **OPEN QUESTION:** Should the Administrator be technically barred from editing registrations and
> attendance entirely, with corrections routed through a data-fix request? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-25.

---

## 6. Role Assignment Rules

**PROPOSED.**

1. A user may hold multiple roles, except that SD-1 forbids holding both Approver and Event
   Officer for the same event.
2. Student is granted by default on account provisioning for student accounts.
3. Attendance Staff is granted per event or per term, not permanently, to limit standing
   access to participant data.
4. Approver is granted per office and may be time-bound, since approval authority may be
   personal rather than institutional.
5. Only an Administrator may grant or revoke Administrator.
6. Role changes are audited as `AUD-02`, and Approver grants additionally as `AUD-03`.

> **OPEN QUESTION:** Is Approver an office account (e.g. `dean@`) or a personal account? This
> affects whether approvals remain valid when staff change. See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-06.

---

## 7. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| ROLE-01 | Student authenticates and reads a published event | Allowed |
| ROLE-02 | Student reads an event in DRAFT | Denied, not found |
| ROLE-03 | Student reads another student's registration | Denied |
| ROLE-04 | Approver edits a submitted event | Denied, read-only |
| ROLE-05 | Approver publishes an approved event they approved | Denied, SD-1 |
| ROLE-06 | Event Officer approves own event | Denied, SD-1 |
| ROLE-07 | Attendance Staff creates a registration | Denied, SD-2 |
| ROLE-08 | Attendance Staff records attendance without any Approver or Officer role | Allowed |
| ROLE-09 | Event Officer cancels a participant registration without a reason | Denied, reason mandatory |
| ROLE-10 | Administrator cancels a registration without a reason | Denied, SD-4 |
| ROLE-11 | Administrator cancels with a reason | Allowed, `AUD-13` written |
| ROLE-12 | Student acknowledges a notification that does not require acknowledgement | Rejected, no acknowledgement recorded |
| ROLE-13 | Event Officer exports a participant list for an event they do not own | Denied |
| ROLE-14 | Event Officer exports for an owned event | Allowed |
| ROLE-15 | Deactivated student attempts to register | Denied, account inactive |
| ROLE-16 | Any role reads the audit trail outside its scope | Denied |
| ROLE-17 | Attendance Staff records attendance on an unapproved event | Denied |
| ROLE-18 | Student holds no administrative role and requests `/admin` | Denied, 403 |

---

## 8. Data Affected

| Entity | Effect |
|---|---|
| User | Read for authentication context |
| Role, UserRole | Read to build the permission set |
| StudentProfile | Read for eligibility and audience evaluation |
| Event | Read and updated per permission |
| Registration | Created, cancelled, overridden with audit |
| Attendance | Recorded and corrected with audit |
| AuditLog | Written for every override, role change, and export |

---

## 9. Audit Requirements

| Action | Audit class |
|---|---|
| Account provisioned or suspended | `AUD-01` |
| Role granted or revoked | `AUD-02` |
| Role granted to Approver | `AUD-03` |
| Registration manually created by non-Student | `AUD-12`, with reason |
| Registration cancelled by non-owner | `AUD-13`, with reason |
| Attendance corrected | `AUD-16`, with reason |
| Participant list exported | `AUD-22` |
| Audit trail accessed or exported | `AUD-21` |
| Retrospective attendance recorded after window close | `AUD-16`, with reason |

See [AUDIT-PLAN.md](AUDIT-PLAN.md).

---

## 10. Notifications

Role changes notify:

- The affected user, so a grant or revocation is never silent
- The Administrator, as the granting party of record
- For an Approver revocation, every event currently awaiting that office's decision, because the
  approval chain may now be blocked

---

## 11. Failure Handling

**Failure:** a user's only role is revoked while they hold in-flight obligations, such as an
assigned pending approval or an open attendance window.
**Handling:** the system MUST refuse the revocation and report the blocking obligations, or
require an explicit reassignment in the same operation. Accounts MUST NOT be left with
unassignable pending work.

**Failure:** an Approver becomes unavailable during an active approval chain.
**Handling:** the Administrator reassigns or delegates the pending step. The original
delegation is recorded as an audit event, and the chain does not silently advance.

**Failure:** a role assignment would violate SD-1.
**Handling:** the assignment is rejected at save time with a message naming the conflicting
event, rather than at publication time.

---

## 12. Completion Criteria

- Every role has a defined purpose, responsibility set, and permission set
- The permission matrix has no ambiguous cell
- Segregation-of-duty rules are stated with their enforcement point
- Role-specific test scenarios exist
- Every role maps to at least one functional requirement in
  [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md)

---

## 13. Exit Criteria

- Council Secretary confirms the five roles match the organisation's actual structure
- OQ-01, OQ-02, OQ-07, OQ-18, OQ-22, and OQ-23 are resolved or accepted as risk
- Security review confirms no role can publish without approval, and no role can register on
  another's behalf

---

**Related documents:** [USER-ROLES.md](USER-ROLES.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)