# Audit Plan

**Document:** ERNS-AUD
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Define what the Event Registration and Notification System records about its own operation, what
each audit entry contains, who may read it, and how long it is kept.

ERNS exists to produce trustworthy records. The audit trail is what makes the system's own
assertions checkable rather than merely stated.

---

## Scope

**In scope:** the audit event catalogue, entry contents, actor attribution, read access,
retention, and integrity.

**Out of scope:** what is audited about the codebase, which is in `PB-ENG-07 Code Review` and
`PB-ENG-19 Documentation`.

---

## 1. What the Audit Trail Is For

| Purpose | Mechanism |
|---|---|
| Establishing who did what | Actor identity and timestamp on every entry |
| Reconstructing a state change | Previous and new values |
| Justifying a privileged action | Mandatory reason |
| Demonstrating that a gate was applied | Publication records the chain state verified at that moment |
| Detecting misuse | Queryable by actor, action, entity, and time |

**What it is not for.** The audit trail is not a surveillance record of student browsing. Reading
a notification is not a state change and is not audited. Auditing every read would make the trail
unusable and would record behaviour with no requirement behind it.

---

## 2. Audit Event Catalogue

| ID | Event | Trigger | Actor | Reason required |
|---|---|---|---|---|
| AUD-01 | Account provisioned or suspended | Administrator account action | Administrator | Suspension requires reason |
| AUD-02 | Role granted or revoked | Role assignment | Administrator | No |
| AUD-03 | Approval authority granted | Approver role assigned | Administrator | No |
| AUD-04 | Approval chain reconfigured | Chain template change | Administrator | Yes |
| AUD-05 | Event created or edited | Authoring action | Event Officer | No |
| AUD-06 | Event submitted for approval | Submission or resubmission | Event Officer | No |
| AUD-07 | Approval step decided | Step approved | Approver | No |
| AUD-08 | Revision requested | Approver returns the event | Approver | Yes, comments |
| AUD-09 | Event rejected | Terminal rejection | Approver | Yes |
| AUD-10 | Event published | Publication, including under exception | Event Officer or Administrator | Exception requires justification |
| AUD-11 | Registration window changed | Open, close, reopen | Event Officer or Administrator | Reopen requires reason |
| AUD-12 | Registration created | Self or manual registration | Student, Event Officer, Administrator | Manual requires reason |
| AUD-13 | Registration cancelled | Cancellation | Student, Event Officer, Administrator | Non-student cancellation requires reason |
| AUD-14 | Registration manually overridden | Administrative correction | Administrator | Yes, SD-4 |
| AUD-15 | Attendance recorded | QR or staff-assisted | None (QR) or Attendance Staff | Staff-assisted for an absent party requires reason |
| AUD-16 | Attendance corrected | Correction, including retrospective recording | Attendance Staff or Administrator | Yes |
| AUD-17 | Notification dispatched | Dispatch | Event Officer or Administrator | No |
| AUD-18 | Notification edited or recalled | Post-dispatch change | Event Officer or Administrator | Yes |
| AUD-19 | Notification acknowledged | Student acknowledgement | Student | No |
| AUD-20 | Event completed, cancelled, or archived | Terminal lifecycle action | Event Officer or Administrator | Cancellation requires reason |
| AUD-21 | Audit trail accessed or exported | Read or export | Administrator | Export requires reason |
| AUD-22 | Participant data exported | Participant list or registration export | Event Officer or Administrator | No |
| AUD-23 | Attendance finalised | Post-event confirmation of counts | Attendance Staff or Administrator | Discrepancy requires explanation |
| AUD-24 | Event evaluation submitted | Post-event evaluation | Event Officer | No |
| AUD-25 | Event evaluation amended | Evaluation edited after submission | Event Officer or Administrator | Yes |

**Twenty-five event classes.** Every privileged or state-changing action in ERNS maps to one of
them.

### 2.1 Actions deliberately not audited

| Action | Reason |
|---|---|
| A student reading an event | Not a state change. Would make the trail unusable |
| A student reading a notification | Not a state change |
| Browsing or filtering | Not a state change |
| A failed login | Security monitoring, not the audit trail. Logged, not audited |
| A rejected registration attempt | Not a state change. Logged for security, not audited |
| A report being viewed | Read access is governed by permission, not by audit. Exports are audited |

**PROPOSED.** Failed authentication and rejected authorisation attempts are recorded in application
logs for security monitoring. Mixing them into the audit trail would bury the state changes that
matter under a volume of noise.

---

## 3. Audit Entry Contents

Per **FR-AUD-002** through **FR-AUD-004**:

| Field | Present | Purpose |
|---|---|---|
| Actor identity | Always, except system-initiated | Who acted |
| Actor role at time of action | Always | What authority they held |
| Action code | Always | What they did |
| Entity type | Always | What kind of record |
| Entity identifier | Always | Which record |
| Timestamp | Always | When |
| Previous state or value | State changes | What it was |
| New state or value | State changes | What it became |
| Reason | Privileged actions | Justification |
| Request context | Always | Session and origin attribution |
| Correlation identifier | Always | Cross-reference to logs, per NFR-MAINT-005 |

### 3.1 Why the actor's role is recorded separately

A user's role can change. An audit entry recording only "user 42 cancelled a registration" cannot
answer whether that user was authorised to do so at the time. Recording the role alongside the
identity makes the authorisation question answerable after the fact.

### 3.2 Why previous and new state are both recorded

Either alone is insufficient. Previous state alone does not show what happened. New state alone
does not show what was displaced. The interview's difficulty tracing an event's history comes
from not having the before value.

### 3.3 Why the correlation identifier exists

**NFR-MAINT-005.** Without a shared identifier, an administrator investigating a failed
registration must reconcile a log entry with an audit entry with no reliable link. The correlation
identifier makes that a join rather than an inference.

---

## 4. Actor Attribution

| Case | Actor recorded |
|---|---|
| A user performs an action | Their identity and role |
| A scheduled transition executes | System. No user identity |
| A staff-assisted attendance record is created | The Attendance Staff member, never the student |
| A QR attendance record is created | **No user.** The method is recorded as `QR` |
| An Administrator overrides a record | Their identity and role, per SD-4 |

**FR-AUD-009** requires system-initiated transitions to be distinguishable from user-initiated
actions.

**The QR case is deliberate.** A self-scan records that the participant was present, verified by
their own credential. Attributing it to a user would suggest a staff member verified them, which
was not what happened. **FR-ATT-005** requires `recorded_by` to be null when the method is `QR`.

---

## 5. Read Access

Per [SECURITY-PLAN.md](SECURITY-PLAN.md) section 4.5:

| Actor | Access |
|---|---|
| Administrator | Full read, query, and export |
| Event Officer | Read only entries for events they own |
| Approver | Read only decisions they made |
| Student | **None** |
| Attendance Staff | **None** |

**FR-AUD-007** and **FR-AUD-008**.

**Why students have no audit access.** An audit entry for a student's own registration is
technically their data. Granting individual audit access would let a student query their history
and infer patterns, and would complicate retention. The student-facing equivalent is their
registration and notification history, which they already see. **This is a decision the Council
should confirm**, since it is a restriction on access to a student's own information.

**FR-AUD-010 / AUD-21** requires that reading or exporting the audit trail is itself audited. An
audit trail that cannot record who inspected it does not prove accountability.

---

## 6. Retention

**PROPOSED.** The audit trail is retained longer than the records it describes.

| Category | Retention |
|---|---|
| Audit entries referencing events | Same as the event, permanently |
| Audit entries referencing registrations and attendance | Same as those records |
| Audit entries referencing accounts and roles | Account lifetime plus the retention period |
| Audit entries referencing the audit trail itself | Same as the audit trail |

**NFR-AUD-006** requires the audit trail to outlive its subjects. An audit trail that expires with
the data it explains cannot explain it.

> **OPEN QUESTION:** What retention periods apply? See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)
> OQ-26, OQ-27, OQ-28. If a school policy exists, it supersedes every figure here.

**CONFIRMED.** Audit entries are never deleted when their subject record is deleted.
**FR-AUD-006**.

---

## 7. Integrity

| Requirement | Rule |
|---|---|
| **NFR-AUD-005** | No means to modify or delete an audit entry |
| **FR-AUD-005** | No interface to modify or delete an audit entry |
| Append-only storage | The audit store accepts inserts and reads only |

**PROPOSED.** The audit store is separate from operational tables and writable only by the audit
mechanism. An application bug that truncates a table cannot truncate the audit trail.

**PROPOSED.** Periodic integrity verification, recording a digest chain so that removal of an entry
is detectable. `PB-ENG-19` records this as a monitoring item.

**Threat TH-12** covers tampering. The preventive control is the absence of any modification path;
detection is integrity verification; recovery is restoration from backup.

---

## 8. Requirements Coverage

| Requirement | Catalogue classes |
|---|---|
| FR-AUD-001 | All of AUD-01 through AUD-25 |
| FR-AUD-002 | Every entry |
| FR-AUD-003 | AUD-05 through AUD-20, AUD-22, AUD-24, AUD-25 |
| FR-AUD-004 | AUD-01, AUD-04, AUD-08, AUD-09, AUD-10, AUD-11, AUD-12, AUD-13, AUD-14, AUD-16, AUD-18, AUD-21, AUD-23, AUD-25 |
| FR-AUD-005 | Integrity |
| FR-AUD-006 | Retention |
| FR-AUD-007 | Read access |
| FR-AUD-008 | Officer scoping |
| FR-AUD-009 | Actor attribution |
| FR-AUD-010 | AUD-21 |

---

## 9. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| AUDT-01 | Student registers | AUD-12 with actor, role, timestamp, new state |
| AUDT-02 | Officer cancels a registration with a reason | AUD-13 with previous state, new state, reason |
| AUDT-03 | Administrator overrides without a reason | Refused, SD-4 |
| AUDT-04 | Attendance corrected | AUD-16 with previous value, new value, reason, corrector |
| AUDT-05 | QR attendance recorded | AUD-15 with no user actor, method `QR` |
| AUDT-06 | Staff-assisted attendance | AUD-15 with the staff identity as actor |
| AUDT-07 | Scheduled transition to `ONGOING` | AUD entry with system actor, no user |
| AUDT-08 | Attempt to modify an audit entry | No path exists |
| AUDT-09 | Attempt to delete an audit entry | No path exists |
| AUDT-10 | Subject record deleted | Audit entry retained |
| AUDT-11 | Officer reads the audit trail | Only entries for owned events |
| AUDT-12 | Student reads the audit trail | Refused |
| AUDT-13 | Administrator exports the audit trail | Permitted, AUD-21 written |
| AUDT-14 | Officer exports the audit trail | Refused |
| AUDT-15 | Event published | AUD-10 with the chain state verified |
| AUDT-16 | Event published under exception | AUD-10 with justification |
| AUDT-17 | Approval rejected without a reason | Refused |
| AUDT-18 | Approval rejected with a reason | AUD-07 with reason |
| AUDT-19 | Registration window reopened | AUD-11 with reason |
| AUDT-20 | Student reads a notification | No audit entry |
| AUDT-21 | Student views a report | No audit entry |
| AUDT-22 | Failed login attempt | Application log only, no audit entry |
| AUDT-23 | Correlation identifier present on every entry | Confirmed |
| AUDT-24 | Actor role recorded on every user-initiated entry | Confirmed |
| AUDT-25 | Query the audit trail by actor, action, entity, time | All four filters function |

---

## 10. Completion Criteria

- Every state-changing action maps to a catalogue entry
- Every catalogue entry states its actor and whether a reason is required
- Read access is defined per role
- Actions deliberately excluded from audit are listed with reasons
- Integrity is specified without claiming implementation

---

## 11. Exit Criteria

- Council Secretary confirms audit scope, particularly the absence of student audit access
- OQ-26 through OQ-28 resolved, since retention follows from those
- Audit storage design approved under `PB-ENG-14 Database Changes`
- AUD-21 implemented so audit inspection is itself accountable

---

**Related documents:** [AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) ·
[DATA-MODEL.md](DATA-MODEL.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)