# Playbook 12 — Post-Event Records

**Playbook:** PB-12
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Finalise an event's participation record and close the event, so that what happened is confirmed by
someone rather than inferred from timestamps.

Finalisation is the checkpoint where the numbers are confirmed as correct. Skipping it would mean
the participation record is whatever the system happened to capture.

---

## Scope

**In scope:** attendance finalisation, event completion, the generated event report, and the handoff
to evaluation.

**Out of scope:** evaluation content, `PB-13 Event Evaluation`; archival, `PB-14 Event
Archiving`; backup operations, `PB-17 Backup and Recovery`.

---

## Trigger

An event's end time passes, or staff close the attendance window after the event.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Attendance Staff | Finalise attendance, confirm counts |
| Event Officer | Complete the event, review the report |
| Administrator | Finalise or complete on the officer's behalf |

---

## Preconditions

- The event is `ONGOING`
- The event start and end times have passed
- Attendance recording is closed to ordinary corrections

---

## Main Workflow

1. An Attendance Staff member opens the event
2. System displays the attendance state: registered, present, absent, walk-ins
3. Staff compare the figures against what they observed
4. Staff select Finalise attendance
5. System checks for any discrepancy
6. **If present exceeds registered plus walk-ins, finalisation is blocked** until explained
7. Staff confirm the counts
8. System records who finalised and when, as `AUD-23`
9. Ordinary attendance corrections are now closed to staff
10. The event owner is notified that attendance is finalised

### Event completion

11. Officer opens the event
12. System confirms attendance is finalised
13. Officer reviews the event report
14. Officer selects Mark event complete
15. System sets status `COMPLETED` and records `AUD-20`
16. The registration window closes if still open
17. The event becomes read-only except for evaluation
18. `PB-13 Event Evaluation` becomes available

---

## Finalisation Rules

| Rule | Requirement | Behaviour |
|---|---|---|
| Attendance must be finalised before completion | FR-POS-001 | Completion refused otherwise |
| Finalisation records the finaliser and time | `AUD-23` | Attributable |
| Discrepancy blocks finalisation | Proposed | Present must not exceed registered plus walk-ins |
| Ordinary corrections close after finalisation | Proposed | Staff must use the retrospective path, audited |

**Why finalisation is explicit rather than automatic.** An automatic completion at the end of the
window would skip the confirmation that makes the count trustworthy. Finalisation is where someone
says "these numbers are what happened".

---

## The Event Report

**PROPOSED.** The report is a generated view assembled from existing records. It introduces no new
data and cannot disagree with the underlying records.

| Section | Source |
|---|---|
| Event information | Event record as published |
| Change history | Amendments and updates made |
| Approval history | Offices, decisions, timestamps |
| Registration summary | Registered count, capacity, cancellations |
| Attendance summary | Present, absent, walk-ins, by window |
| Notification activity | Sent, read, acknowledged, email state |
| Evaluation | Structured fields, once submitted |

**PROPOSED.** Notification activity is reported as in-app read counts and, separately, email
delivery state. **The two must never be combined into a figure implying reach.** Per
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) section 2, email `SENT` means
the transport accepted the message and nothing more.

---

## Alternative Paths

### Attendance was not finalised and the event date has passed

The system reports the event as awaiting finalisation and notifies the owner and Administrator. **It
does not complete the event automatically.** Finalisation is the confirmation that makes the count
worth something.

### Present exceeds registered plus walk-ins

Finalisation is blocked. Either a count is wrong or an unregistered attendee was recorded without
the exception path. Both need explaining before the record is closed.

### Some attendees were recorded from paper

The report shows the reconciliation and its limitations. **A reconciled count is weaker evidence
than a live one, and the report says so.**

### An officer wants to correct attendance after finalisation

Refused, per FR-ATT-016. The Administrator may perform a retrospective correction with a reason,
audited as `AUD-16`.

### The event was cancelled rather than held

There is no post-event workflow. A cancelled event is terminal. Registrations and any attendance
recorded before cancellation are retained.

### An officer is unavailable to complete the event

An Administrator completes it. The audit trail records the Administrator as the actor.

### The officer wants to complete the event without reviewing the report

Permitted. The report is available for reference, not a gate. Finalisation is the gate, because it
concerns the accuracy of the record rather than the officer's diligence.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Attendance finalised | FR-POS-001 | Finalise attendance before completing this event |
| No unexplained discrepancy | Proposed | Present count exceeds registered plus walk-ins |
| Finaliser is Attendance Staff or Administrator | FR-ATT-014 | You cannot finalise attendance |
| Officer cannot finalise | FR-ATT-016 | You cannot finalise attendance |
| Event is `ONGOING` | Lifecycle | This event is {status} |
| Evaluation not required for completion | FR-POS-002 | — |
| Evaluation required for archival | FR-POS-007 | Submit an evaluation before archiving |

---

## Data Affected

| Entity | Effect |
|---|---|
| Attendance | Correction path narrowed, `AUD-23` written |
| Event | Status `COMPLETED`, `completed_at` recorded |
| Event | Registration window closed if open |
| AuditLog | `AUD-23`, `AUD-20` |

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Attendance finalised | Event Officer | `NORMAL` | No |
| Event awaiting finalisation past the end time | Officer, Administrator | `HIGH` | No |
| Event completed | Officer, Attendance Staff involved | `NORMAL` | No |
| Finalisation blocked by a discrepancy | Staff member, Officer, Administrator | `IMPORTANT` | **Yes** |

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Attendance finalised | `AUD-23` | Staff identity, counts at finalisation, timestamp |
| Discrepancy blocking finalisation | `AUD-23` | Blocking condition, explanation, or absence of one |
| Event completed | `AUD-20` | Officer, timestamp |
| Retrospective correction after finalisation | `AUD-16` | Administrator, reason, previous and new value |

**Counts at finalisation are recorded.** If the record is later disputed, the figures confirmed at
that moment are the reference, not the figures currently displayed.

---

## Failure Handling

**Failure:** the event passes its end time with attendance un-finalised.
**Handling:** the event is reported as awaiting finalisation. Officers and Administrators are
notified. **Automatic completion does not occur.**

**Failure:** finalisation produces a discrepancy.
**Handling:** finalisation is blocked. Staff either correct the record or explain the discrepancy,
and the explanation is recorded.

**Failure:** staff finalise with wrong counts without noticing.
**Handling:** the counts at finalisation are recorded, so a later dispute can be compared against
what was confirmed. This is the strongest available control short of independent verification.

**Failure:** the officer never completes the event.
**Handling:** the event remains `ONGOING` and appears in reporting as incomplete. It blocks
archival, which blocks the evaluation from being lost.

**Failure:** a participant disputes the attendance record.
**Handling:** the record shows method, time, and recorder. Disputes are resolved by the recorder or
an Administrator, with a correction if warranted.

**Failure:** the report disagrees with what staff remember.
**Handling:** the report is assembled from records, so a disagreement means a record was wrong. The
records are corrected, not the memory. This is the intended behaviour.

---

## Completion Criteria

- Attendance is finalised, with the finaliser and time recorded
- The event is `COMPLETED`
- The event report is available and consistent with the underlying records
- `PB-13 Event Evaluation` is available

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBPE-01 | Happy path | Staff finalise attendance | `AUD-23`, corrections closed to staff |
| PBPE-02 | Happy path | Officer completes the event | `COMPLETED`, `AUD-20`, report available |
| PBPE-03 | Invalid | Officer attempts to complete with attendance un-finalised | Refused, FR-POS-001 |
| PBPE-04 | Unauthorized | Officer attempts to finalise | Refused, FR-ATT-016 |
| PBPE-05 | Failure | Present exceeds registered plus walk-ins | Finalisation blocked |
| PBPE-06 | Failure | Event end time passes with no finalisation | Reported as awaiting finalisation, no auto-completion |
| PBPE-07 | Failure | Officer never completes | Event remains `ONGOING`, blocks archival |
| PBPE-08 | Failure | Retrospective correction after finalisation | Administrator with reason, `AUD-16` |
| PBPE-09 | Unauthorized | Retrospective correction by an officer | Refused |
| PBPE-10 | Boundary | Counts exactly equal to registered plus walk-ins | Finalisation permitted |
| PBPE-11 | Boundary | Zero registrations, walk-ins only | Finalisation permitted |
| PBPE-12 | Failure | Paper-reconciled attendance | Report shows reconciliation and limitations |
| PBPE-13 | Failure | Event cancelled during attendance | No post-event workflow, records retained |
| PBPE-14 | Unauthorized | Completion attempted on an already-completed event | Refused |
| PBPE-15 | Boundary | Registration still open at completion | Window closed |
| PBPE-16 | Failure | Report read confirms notification reach | Report shows read and email state separately, never combined |
| PBPE-17 | Failure | Dispute about an attendance record | Compared against finalisation counts |
| PBPE-18 | Boundary | Finalisation with zero discrepancies | Permitted |

---

## Exit Criteria

- The participation record is finalised and confirmed
- The event is closed and read-only
- `PB-13 Event Evaluation` follows, which must complete before archival

---

**Related documents:** [PB-12 Post-Event Records](PB-12-POST-EVENT-RECORDS.md) ·
[PB-13 Event Evaluation](PB-13-EVENT-EVALUATION.md) ·
[PB-14 Event Archiving](PB-14-EVENT-ARCHIVING.md) ·
[PB-10 QR Attendance](PB-10-QR-ATTENDANCE.md) ·
[POST-EVENT-WORKFLOW.md](../../planning/POST-EVENT-WORKFLOW.md)