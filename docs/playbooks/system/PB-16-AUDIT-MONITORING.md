# Playbook 16 — Audit and Monitoring

**Playbook:** PB-16
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Make ERNS's own operation accountable: record who did what, allow an administrator to review it, and
detect activity that suggests misuse.

ERNS's value rests on its records being trustworthy. The audit trail is what makes that claim
checkable rather than merely asserted.

---

## Scope

**In scope:** the audit trail, what is recorded, who reads it, and routine monitoring.

**Out of scope:** the catalogue itself, in [AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md); security
monitoring of failed authentication, in `PB-ENG-17 Incident Response`.

---

## Trigger

An audited action occurs, or an administrator reviews the trail.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| System | Writes audit entries for every audited action |
| Administrator | Reads, queries, and exports |
| Event Officer | Reads entries for events they own |
| Approver | Reads decisions they made |
| Student | **No access.** See section 5 |

---

## What Is Recorded

**Twenty-five audit event classes**, defined in [AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md).

| Group | Classes |
|---|---|
| Accounts and roles | `AUD-01` to `AUD-04` |
| Event authoring and lifecycle | `AUD-05`, `AUD-20` |
| Approval | `AUD-06` to `AUD-09` |
| Publication and registration window | `AUD-10`, `AUD-11` |
| Registration | `AUD-12` to `AUD-14` |
| Attendance | `AUD-15`, `AUD-16`, `AUD-23` |
| Notification | `AUD-17` to `AUD-19` |
| Evaluation | `AUD-24`, `AUD-25` |
| Data access | `AUD-21`, `AUD-22` |

---

## What Is Not Recorded

Recorded here because the exclusions are decisions.

| Not audited | Reason |
|---|---|
| A student reading an event | Not a state change. Would make the trail unusable |
| A student reading a notification | Not a state change |
| Browsing or filtering | Not a state change |
| A failed login | Security monitoring, not the audit trail |
| A rejected authorisation attempt | Security monitoring, not a state change |
| A refused duplicate registration | Not a state change |
| A report being viewed | Read access is governed by permission |
| A notification dispatch email failure | Already captured in `AUD-17` |

**Failed authentication and refused authorisation attempts are logged for security monitoring.** They
are deliberately not in the audit trail, because a burst of refusals would bury the state changes
that matter under noise.

---

## Entry Contents

| Field | Purpose |
|---|---|
| Actor identity | Who acted |
| Actor role at time of action | What authority they held |
| Action code | What they did |
| Entity type and identifier | Which record |
| Timestamp | When |
| Previous state or value | What it was |
| New state or value | What it became |
| Reason | Justification, where the action class requires one |
| Request context | Session and origin attribution |
| Correlation identifier | Join key to application logs |

**The actor's role is recorded separately from the identity** because roles change. An entry recording
only "user 42 cancelled a registration" cannot answer whether that user was authorised at the time.

---

## Read Access

| Actor | Access |
|---|---|
| Administrator | Full read, query, export |
| Event Officer | Read only entries for events they own |
| Approver | Read only decisions they made |
| Student | **None** |
| Attendance Staff | **None** |

**FR-AUD-007**, **FR-AUD-008**.

**Reading or exporting the audit trail is itself audited**, as `AUD-21`. A trail that cannot record
who inspected it does not prove accountability.

---

## Why Students Have No Audit Access

An audit entry about a student's own registration is technically their data. Granting individual
audit access would let a student query their history and infer patterns about other activity, and
would complicate retention.

The student-facing equivalent is their registration and notification history, which they already see.

> **This is a restriction on access to a student's own information and the Council should confirm it
> is acceptable.** Recorded rather than buried because it is the kind of decision that should be
> deliberate.

---

## Main Workflow — Routine Review

1. Administrator opens the audit trail
2. Administrator filters by actor, action, entity, or time range
3. Administrator reviews the entries
4. Administrator exports if a record is required
5. `AUD-21` records the export

### What an administrator looks for

**PROPOSED.** Six checks, chosen because each corresponds to an action that would undermine trust in
the records:

| Check | What it detects |
|---|---|
| Publication without a preceding complete approval | A bypassed gate |
| Registration window reopened near or after an event date | Backfilled attendance |
| Attendance corrected by an officer | A rule violation, since officers cannot correct |
| Registrations cancelled and recreated in quick succession | Record rewriting |
| Participant lists exported in bulk | Personal-data access |
| Out-of-hours administrative overrides | Activity outside normal operation |

**These are indicators, not allegations.** Each entry needs investigation rather than an assumption
of misconduct.

---

## Integrity

| Requirement | Rule |
|---|---|
| **NFR-AUD-005** | No means to modify or delete an audit entry |
| **FR-AUD-005** | No interface to modify or delete an audit entry |
| Append-only storage | The audit store accepts inserts and reads only |
| Separate from operational tables | A bug truncating a table cannot truncate the trail |

**PROPOSED.** Periodic integrity verification recording a digest chain, so that removal of an entry
is detectable even by someone with storage access. Recorded as a monitoring item in `PB-ENG-19`.

**Threat TH-12 covers tampering.** Preventive control: no modification path exists. Detection:
integrity verification. Recovery: restoration from backup, treated as a severe incident.

---

## Retention

**PROPOSED.** The audit trail outlives the records it describes.

| Entries referencing | Retention |
|---|---|
| Events | Same as the event, permanent |
| Registrations and attendance | Same as those records |
| Accounts and roles | Account lifetime plus the retention period |
| The audit trail itself | Same as the audit trail |

**FR-AUD-006.** Audit entries are never deleted when their subject is deleted.

> **OPEN QUESTION:** What retention applies? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-26 to OQ-28.

---

## Alternative Paths

### An officer requests audit entries for another officer's event

Refused. Scope is by ownership.

### A student requests audit entries about their own activity

Refused. See section 5. The student sees their registration and notification history instead.

### An administrator wants to correct an inaccurate audit entry

Not permitted. **There is no correction path.** If an entry records something wrong, a new entry
records the correction, and both are retained. An audit trail that can be edited is not an audit
trail.

### An administrator notices suspicious bulk export

The export is recorded as `AUD-22`. The administrator investigates per `PB-ENG-17 Incident
Response`.

### An event is deleted

Its audit entries are retained, per FR-AUD-006.

### The audit store is unavailable

**Audited state changes are refused.** Per `FAIL-05` in
[TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md), if a state change succeeds and its audit
entry fails, the system has produced an unaudited change. Refusing the change is correct.

**This is a deliberate availability sacrifice.** An ERNS outage caused by an audit-store failure is
preferable to ERNS operating without accountability for a period nobody can detect.

### An administrator exports the whole trail

Permitted, with a reason. `AUD-21` records it, including the reason and the entry count.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Audited actions always write an entry | FR-AUD-001 | — |
| Reason present where the class requires one | FR-AUD-004 | A reason is required |
| No modification path exists | FR-AUD-005 | — |
| Read scope matches role | FR-AUD-007, FR-AUD-008 | — |
| Export audited | `AUD-21` | — |
| System and user actors distinguishable | FR-AUD-009 | — |
| Correlation identifier present | NFR-MAINT-005 | — |

---

## Data Affected

| Entity | Effect |
|---|---|
| AuditLog | Appended to on every audited action |
| AuditLog | Read on review or export |

**AuditLog is never updated and never deleted.**

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Approval chain reconfigured | Administrator | `IMPORTANT` | **Yes** |
| Registration window reopened after the event date | Officer, Administrator | `IMPORTANT` | **Yes** |
| Officer attempted an attendance correction | Administrator | `HIGH` | No |
| Bulk participant export | Administrator | `HIGH` | No |
| Audit trail exported | Administrator | `NORMAL` | No |
| Account suspended | The affected user | `IMPORTANT` | **Yes** |

**These notifications are how routine monitoring becomes active.** Passive monitoring depends on
someone remembering to look. Notification on the specific patterns that indicate misuse does not.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Audit trail read | `AUD-21` | Administrator, filter used, entry count |
| Audit trail exported | `AUD-21` | Administrator, reason, entry count, timestamp |

---

## Failure Handling

**Failure:** an administrator modifies or deletes an entry.
**Handling:** no path exists, so this is either a direct storage action or a defect.
Integrity verification detects it. The trail is restored from backup and the incident is treated as
severe per `PB-ENG-17 Incident Response`.

**Failure:** the audit store is unavailable.
**Handling:** audited state changes are refused. Unaudited changes are never accepted as a
convenience.

**Failure:** an administrator becomes unavailable.
**Handling:** a second administrator is required before go-live, per RK-16 in
[ROADMAP.md](../../planning/ROADMAP.md). The Administrator role is a single point of failure and this
is the mitigation.

**Failure:** the audit trail grows too large to query.
**Handling:** queries are scoped by time range and filters. Indexing strategy is a
`PB-ENG-14 Database Changes` concern. Entries are never pruned, since pruning is deletion.

**Failure:** an administrator notices an entry that looks wrong.
**Handling:** investigate. If the action was wrong but legitimate, record a correcting entry. If it
was improper, follow `PB-ENG-17 Incident Response`. **Either way, the original entry remains.**

**Failure:** bulk activity by one user looks anomalous.
**Handling:** treat as an indicator, not a conclusion. Cross-reference against the correlation
identifier and application logs before acting.

---

## Completion Criteria

- Every audited action writes an entry
- Read access matches the role matrix
- No modification or deletion path exists
- Integrity verification is in place
- The six routine checks are available as filters

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBAU-01 | Happy path | Student registers | `AUD-12` with actor, role, timestamp |
| PBAU-02 | Happy path | Officer cancels a registration with a reason | `AUD-13` with previous and new state |
| PBAU-03 | Happy path | Event published | `AUD-10` with the chain state verified |
| PBAU-04 | Happy path | Administrator reviews by filter | Results returned for actor, action, entity, time |
| PBAU-05 | Happy path | Administrator exports the trail | Permitted, `AUD-21` written |
| PBAU-06 | Unauthorized | Officer reads another officer's entries | Refused |
| PBAU-07 | Unauthorized | Student reads the trail | Refused |
| PBAU-08 | Unauthorized | Attendance Staff reads the trail | Refused |
| PBAU-09 | Invalid | Attempt to modify an entry | No path exists |
| PBAU-10 | Invalid | Attempt to delete an entry | No path exists |
| PBAU-11 | Invalid | Override without a reason | Refused, FR-AUD-004 |
| PBAU-12 | Failure | Subject record deleted | Audit entries retained |
| PBAU-13 | Failure | Audit store unavailable | Audited state changes refused |
| PBAU-14 | Boundary | QR attendance recorded | `AUD-15` with no user actor |
| PBAU-15 | Boundary | Time-driven transition | Entry with system actor |
| PBAU-16 | Failure | Officer attempts an attendance correction | Refused, notification to Administrator |
| PBAU-17 | Failure | Registration reopened after the event date | Refused, notification issued |
| PBAU-18 | Failure | Bulk participant export | Recorded and notified |
| PBAU-19 | Failure | Approval chain reconfigured | Notification to Administrator |
| PBAU-20 | Boundary | Trail queried across five years | Returned with scoped query |
| PBAU-21 | Failure | Single administrator unavailable | Flagged as a risk; a second is required before go-live |
| PBAU-22 | Failure | Correlation identifier absent | Refused by validation |

---

## Exit Criteria

- The trail is complete for every audited action
- Access is correctly scoped
- Integrity verification operates
- `PB-17 Backup and Recovery` can restore the trail if the store is lost

---

**Related documents:** [PB-16 Audit and Monitoring](PB-16-AUDIT-MONITORING.md) ·
[PB-17 Backup and Recovery](PB-17-BACKUP-RECOVERY.md) ·
[AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[PB-ENG-17 Incident Response](../engineering/PB-ENG-17-INCIDENT-RESPONSE.md) ·
[PB-ENG-18 Backup and Recovery](../engineering/PB-ENG-18-BACKUP-RECOVERY.md)