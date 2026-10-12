# Playbook 14 — Event Archiving

**Playbook:** PB-14
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Retain a completed event permanently as a read-only record, so that what happened is preserved for
future reference rather than copied into files whose location is forgotten.

This playbook addresses Pain Point 14: record backup and maintenance.

---

## Scope

**In scope:** archival, what is retained, read-only enforcement, and search of past events.

**Out of scope:** evaluation content, `PB-13`; technical backup mechanisms, `PB-17` and
`PB-ENG-18`.

---

## Trigger

An event is `COMPLETED` and has a submitted evaluation.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Archives events they own |
| Administrator | Archives any event, and manages retention policy |

---

## Preconditions

- The event status is `COMPLETED`
- Attendance is finalised
- **A submitted evaluation exists**
- The user owns the event or is an Administrator

---

## Why an Evaluation Is Required

**FR-POS-007.** Archival is refused without a submitted evaluation.

**This is the only enforcement that evaluation actually happens.** A deadline produces empty
evaluations; a hard precondition produces real ones. Without this rule, PP-15 is unaddressed because
the records would be written and never written at all.

---

## What Is Retained

**FR-POS-005.** Archival retains, permanently:

| Retained | Detail |
|---|---|
| Event information | As published, plus every change |
| Change history | What changed, when, and who changed it |
| Approved proposal and attachments | The documents that were assessed |
| Approval chain and decisions | Every office, decision, timestamp, and comment |
| Announcements and notifications | What participants were told, and when |
| Dispatch records | Audience, recipient count, read and acknowledgement state |
| Participant list | Names, registration status, timestamps, sources |
| Attendance records | Including corrections, with originals retained |
| Evaluation | The structured record |
| Audit trail | Every action taken on the event |

**Nothing is deleted during archival.** Archival is a read-only marking, not a purge.

**Cancellations are retained as `CANCELLED`.** The record of who intended to attend survives.

---

## What Archival Achieves

| Before | After |
|---|---|
| Files copied manually, unclear what exists | One queryable record per event |
| Pros and cons in someone's memory | Typed, retrievable fields |
| Unknown whether last term's QR failed | Technical problems field, searchable by category |
| Records scattered across drives | Retained centrally and permanently |
| Unknown who approved what | Full approval history |

**Archival is what makes PP-14 and PP-15 addressable.** Without it, evaluation is written and lost,
and participation records exist as files of uncertain provenance.

---

## Main Workflow

1. Officer opens the completed event
2. System confirms attendance is finalised and an evaluation exists
3. Officer reviews the event report
4. Officer selects Archive event
5. System displays what will be retained
6. Officer confirms
7. System sets status `ARCHIVED` and records `AUD-20`
8. The event becomes read-only
9. The event is now retrievable by any future officer searching past events

---

## Search and Retrieval

**FR-POS-009.** Completed and archived events are searchable by title, type, date range, and
organisation.

**PROPOSED.** Search additionally covers: problems recorded in past evaluations, recommendations, and
whether a past event used QR or staff-assisted attendance.

**Searching past problems by category is what makes the record usable.** An officer asking "has
anything ever gone wrong with QR here" needs to find events where the technical or attendance
problems field is non-empty, not a list of every event ever held.

---

## Read-Only Enforcement

**FR-POS-008.** An archived event is read-only.

| Element | Behaviour |
|---|---|
| Event fields | Read-only |
| Registrations | Read-only |
| Attendance | Read-only. Corrections require an Administrator data fix |
| Evaluation | Read-only. Amendment requires an Administrator with a reason |
| Audit trail | Read-only, never modified |
| Attachments | Read-only |

**PROPOSED.** Administrative correction of an archived event requires an Administrator, a reason, and
an audit entry, following `PB-ENG-14 Database Changes`.

**Why not absolutely immutable.** A record that cannot be corrected when a genuine error is
discovered will be abandoned in favour of an unofficial spreadsheet. A reasoned, attributed
Administrator correction is more honest than immutability nobody maintains.

---

## Retention

**PROPOSED.** Completed and archived events are retained permanently.

| Record | Retention |
|---|---|
| Archived events | Permanent |
| Their registrations, attendance, notifications, evaluations, and audit entries | Permanent |

**Audit entries are never deleted when their subject is deleted.** FR-AUD-006.

> **OPEN QUESTION:** What retention periods apply? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-26, OQ-27, OQ-28.
>
> **A school records-retention policy, if one exists, supersedes every figure here.** OQ-28 is
> open precisely because that policy may exist and has not been discovered.

**PROPOSED.** Deletion of registration or attendance records is not available to any role while the
retention question is unresolved. A system whose value is trustworthy records should not offer a
convenient erasure path that no policy currently authorises.

---

## Alternative Paths

### Archival is attempted without an evaluation

Refused, with a link to `PB-13`. This is the enforcement that makes PP-15 addressable.

### Archival is attempted before completion

Refused. An event must be `COMPLETED`.

### An officer discovers an error in an archived event after archival

The officer raises it with an Administrator. The Administrator corrects it with a reason, audited.
The officer may not correct it themselves.

### An officer has left the organisation

An Administrator archives. The audit trail records the Administrator as the actor.

### An event was cancelled and is never archived

`CANCELLED` is terminal and requires no archival. Its registrations and notifications are retained.
A cancelled event has no participation record to evaluate.

### An archived event needs to be reopened

**No path exists.** `ARCHIVED` is terminal. A repeated event is a new event. Reopening would
undermine the guarantee that an archived record is final.

### Retention policy later requires deletion

Handled under `PB-ENG-20 Change Management` with an explicit policy decision, a migration, and a
retained audit trail of what was deleted and under what authority. **Not** available as an
operational action.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Event is `COMPLETED` | Lifecycle | This event is {status} |
| Evaluation submitted | FR-POS-007 | Submit an evaluation before archiving |
| Attendance finalised | FR-POS-001 | Finalise attendance before archiving |
| User owns the event or is an Administrator | Authorisation matrix | You cannot archive this event |
| Archived event is read-only | FR-POS-008 | This event is archived |
| Reopening refused | Lifecycle | An archived event cannot be reopened |
| Correcting an archived event requires an Administrator | Proposed | Ask an administrator |

---

## Data Affected

| Entity | Effect |
|---|---|
| Event | Status `ARCHIVED` |
| All other entities | Retained, unchanged, read-only |
| AuditLog | `AUD-20` archival |

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Event archived | Officer | `NORMAL` | No |
| Retention policy changed | Administrator | `IMPORTANT` | **Yes** |
| Records deleted under a retention policy | Administrator, Council | `IMPORTANT` | **Yes** |

**Deletion notifications are required** because deletion is the one action that permanently removes
evidence. Whoever must know about it, should know at the time it happens, not from its absence
later.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Event archived | `AUD-20` | Actor, event, timestamp, confirmation that an evaluation exists |
| Archived event corrected | `AUD-14`, `AUD-16`, or `AUD-25` | Administrator, reason, previous and new value |
| Records deleted under a policy | New audit entry, `AUD-20` adjacent | Actor, policy authority, count, scope |

**Archival is audited even though it changes nothing but a status field.** It marks the moment the
record became final, which is the fact a later reader needs.

---

## Failure Handling

**Failure:** an event is never archived.
**Handling:** it remains `COMPLETED` and appears in reporting as un-archived. Because its evaluation
may be missing, it also appears as awaiting evaluation. Un-archived events are visible, not lost.

**Failure:** an error is discovered in an archived record.
**Handling:** Administrator correction with a reason, audited. **The record is never deleted and
recreated**, because that would destroy the original.

**Failure:** a retention policy later requires deletion.
**Handling:** handled as a controlled change with a migration and a retained audit trail, not as an
operational action. Deletion notifications are issued at the time.

**Failure:** an officer attempts to modify an archived event.
**Handling:** refused. The refusal names who may correct it.

**Failure:** archival is attempted on a cancelled event.
**Handling:** refused. `CANCELLED` is terminal and needs no archival.

---

## Completion Criteria

- The event is `ARCHIVED` and read-only
- Every listed record is retained
- The event is retrievable through search
- Past problems from it will surface during future event creation

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBA-01 | Happy path | Officer archives a completed event with an evaluation | `ARCHIVED`, `AUD-20`, read-only |
| PBA-02 | Happy path | Past event found by search | Results returned by title, type, date, organisation |
| PBA-03 | Happy path | Past problems found by category | Events with non-empty technical or attendance problems |
| PBA-04 | Invalid | Archive without an evaluation | Refused, FR-POS-007 |
| PBA-05 | Invalid | Archive before completion | Refused |
| PBA-06 | Invalid | Archive before attendance finalisation | Refused, FR-POS-001 |
| PBA-07 | Unauthorized | Officer archives an unowned event | Refused |
| PBA-08 | Unauthorized | Student archives | Refused |
| PBA-09 | Invalid | Edit an archived event | Refused, FR-POS-008 |
| PBA-10 | Invalid | Amend an archived evaluation | Refused for officers |
| PBA-11 | Failure | Administrator corrects an archived record | Permitted with reason, audited |
| PBA-12 | Invalid | Reopen an archived event | Refused, terminal |
| PBA-13 | Invalid | Archive a cancelled event | Refused |
| PBA-14 | Boundary | Archived event with zero registrations | Archival permitted |
| PBA-15 | Failure | Officer leaves before archival | Administrator archives, actor recorded |
| PBA-16 | Failure | Error found after archival | Corrected with reason, original retained |
| PBA-17 | Invalid | Delete an archived record | No such path exists |
| PBA-18 | Failure | Retention policy requires deletion | Controlled change, notifications issued, audit retained |
| PBA-19 | Boundary | Search across five years of events | Results returned |
| PBA-20 | Failure | Archived event needs reopening | Refused; a repeated event is a new event |

---

## Exit Criteria

- The event record is retained permanently and read-only
- The record is retrievable, and its problems surface for future organisers
- `PB-15 Reporting` can aggregate across archived events

---

**Related documents:** [PB-14 Event Archiving](PB-14-EVENT-ARCHIVING.md) ·
[PB-13 Event Evaluation](PB-13-EVENT-EVALUATION.md) ·
[PB-12 Post-Event Records](PB-12-POST-EVENT-RECORDS.md) ·
[PB-15 Reporting](PB-15-REPORTING.md) ·
[POST-EVENT-WORKFLOW.md](../../planning/POST-EVENT-WORKFLOW.md) ·
[DATA-MODEL.md](../../planning/DATA-MODEL.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)