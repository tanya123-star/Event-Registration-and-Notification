# Playbook 10 — QR Attendance

**Playbook:** PB-10
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Attendance Staff
**Supersedes:** None

---

## Purpose

Record event attendance quickly and reliably by binding each present participant to a verified
registration, removing the handwritten sheet and the queue it creates.

This is a **supporting** function. It exists so that a registration is proven to correspond to a
present person. It is not itself a primary function of ERNS.

---

## Scope

**In scope:** QR generation, QR validation, staff-assisted capture, attendance windows, live counts,
walk-ins, and corrections.

**Out of scope:** the fallback procedure when QR fails, `PB-11 Attendance Backup`; registration,
`PB-04`; post-event processing, `PB-12`.

---

## Trigger

An event reaches its start time, and attendance staff open the event.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Attendance Staff | Records attendance, both methods |
| Student | Scans their own QR where the QR method applies |
| Administrator | Records and corrects attendance |
| Event Officer | **Reads only.** Cannot correct attendance, per FR-ATT-016 |

---

## Preconditions

- The event is published and has reached its start time
- The event is not cancelled
- Attendance windows are configured
- Attendance Staff are assigned to the event and authenticated
- Registrations exist for the event

---

## The Central Rule

**Attendance may be recorded only for a participant holding a registration with status `REGISTERED`
for that event.**

**FR-ATT-001**, enforced by **FR-ATT-002** uniqueness on the registration reference at the storage
layer.

This is the rule that solves Pain Point 12. A handwritten sheet records a name, so a name can be
written twice or recorded for someone who did not attend. Binding attendance to a registration, with
a uniqueness constraint and a recorder identity, makes both impossible.

---

## Method Selection

| Method | When to use | Queue impact |
|---|---|---|
| **Staff-assisted** | Small events, QR unavailable, no device, accessibility needs, walk-ins | Serial. One per participant |
| **QR** | Large events, where queueing is the constraint | Minimal |

**Both methods are mandatory.** No single method solves the interview's three problems:

| Interview problem | Solved by |
|---|---|
| QR technical problems, PP-06 | Staff-assisted always available |
| Manual attendance for small events, PP-07 | Staff-assisted as the normal method |
| Long queues, PP-08 | QR |

> **Note on MVP ordering.** Per [MVP.md](../../planning/MVP.md), staff-assisted is built and shipped
> first, and QR follows. Building QR first would make the fallback the least-tested path at the
> moment it is most needed. This inverts current practice deliberately.

---

## Main Workflow — Staff-Assisted

1. Attendance Staff authenticate and open the assigned event
2. System displays the live count and a participant search
3. Staff searches by name, registration reference, or student number
4. System shows the participant's registration status and whether attendance is already recorded
5. Staff selects the participant
6. System records attendance with method `STAFF_ASSISTED` and the staff identity
7. System increments the live count
8. Repeated for each participant

---

## Main Workflow — QR

1. Each registered participant receives a QR encoding an opaque token
2. At the event, the participant presents the QR to a scanning device
3. The device submits the token for validation
4. System validates in order: token exists, not expired, belongs to this event, not already used,
   registration is `REGISTERED`, inside an attendance window
5. On success, attendance is recorded with method `QR` and **no user actor**
6. The participant is admitted
7. On failure, the device displays the specific reason

**PROPOSED.** The QR encodes an opaque token, not a name or student number. A QR visible in a
photograph must not reveal who participated.

---

## Attendance Windows

**FR-ATT-006.** Windows are configured per event, with at least a pre-event window and an event
window.

| Window | Typical use |
|---|---|
| Pre-event | Early arrival |
| Event | Core attendance |
| Post-event | Late departure |

**PROPOSED.** Each attendance record is attributed to the window it fell in, per FR-ATT-005, so a
report can distinguish arrive-early from arrive-on-time.

### Working students

**CONFIRMED** from the interview: working students cannot attend fixed periods, and attendance is
sometimes kept open before and after the event.

A configurable window is the mechanism. An event may admit participants before start and after end,
and a working student who can only arrive an hour late is not disadvantaged.

> **OPEN QUESTION:** How are working students accommodated in practice? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-22.

**Note for the Security Office.** An extended window means people on site outside core hours. OQ-22
and OQ-04 should be decided together, since security clearance is based on expected attendance.

---

## Walk-ins

**PROPOSED.** A participant with no registration is handled as a documented exception:

1. Staff records the attempt
2. The system records a reason or a walk-in category
3. The record is attributed to the staff member
4. It appears in reporting as an unregistered walk-in, **separate from the registered count**
5. It is audited

> **OPEN QUESTION:** May students who are not registered attend? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-21.

**The exception does not create a registration.** FR-ATT-018 prohibits attendance from producing a
registration. Creating one retroactively would convert an admission decision into a registration
after the fact, making the registration record unrepresentative of what happened.

**Walk-ins are never merged into the present count of registered participants.** Doing so would
overstate attendance and hide the operational fact that unregistered people attended.

---

## Corrections

| ID | Rule |
|---|---|
| FR-ATT-014 | Attendance Staff or Administrator may correct, with a recorded reason |
| FR-ATT-015 | Original value, corrector, timestamp, and reason are retained |
| FR-ATT-016 | An Event Officer may **not** correct attendance |

**FR-ATT-016 is deliberate.** Officers own the event and would benefit from a flattering count.
Attendance integrity is the one number that must not be owned by the person whose event it measures.

**Corrections are retained rather than overwritten.** An attendance record is evidence. Overwriting
a value destroys the evidence that it was wrong.

**PROPOSED.** Attendance recorded after the window closes is permitted for Attendance Staff and
Administrators with a reason, audited as `AUD-16`. Officers may not. This covers the real case of a
participant whose scan failed after the event ended.

> **OPEN QUESTION:** Who can correct attendance after the event? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-20.

---

## Live Counts

**FR-ATT-013.** Attendance Staff see the live count during the event.
**FR-ATT-017.** The owning Officer sees the summary, with registered, present, absent, and
unregistered walk-ins kept distinct.

**PROPOSED.** Keep the four counts visually separate throughout. Merging them would make the summary
unusable for its purpose, which is confirming that the numbers match reality.

---

## Alternative Paths

### The participant has already scanned

The scan is refused with "attendance already recorded". The message is explicit, because a
participant who sees "already recorded" understands they are admitted, while one who sees an error
may try again and hold the queue.

### The QR belongs to a different event

Refused, stating the wrong event. This is a common and harmless mistake when a participant attends
the wrong session.

### The QR is expired

Refused. The participant uses staff-assisted. Their registration is valid; only the token is not.

### The participant's registration was cancelled

Refused, citing cancellation. Staff may use the documented exception with a reason.

### The participant cannot use a device

Staff-assisted. This is the designed accessible route, and it is why QR is never the sole method.
**NFR-A11Y-001** applies.

### QR service is unavailable

Follow `PB-11 Attendance Backup`. The staff declare QR failure and continue with staff-assisted.

### Staff cannot find a participant by search

The search matches on name, reference, and student number. If all fail, the participant uses
staff-assisted with a manual identification check, recorded as a walk-in with a reason.

### A scanning device fails

Move staff to staff-assisted. Multiple devices are optional; more staff is the reliable
substitute.

---

## Validation Rules

### QR validation, in order

| # | Check | Requirement | Refusal reason shown |
|---|---|---|---|
| 1 | Token exists | FR-ATT-008 | Unrecognised code |
| 2 | Not expired | FR-ATT-009 | This code has expired |
| 3 | Belongs to this event | FR-ATT-009 | This code is for a different event |
| 4 | Not already used | FR-ATT-009 | Attendance already recorded |
| 5 | Registration is `REGISTERED` | FR-ATT-001 | Your registration was cancelled |
| 6 | Inside an attendance window | FR-ATT-007 | Attendance is not open at this time |

### Staff-assisted validation

| Rule | Requirement | Refusal reason shown |
|---|---|---|
| Attendance Staff identity present | FR-ATT-011 | Sign in to record attendance |
| Registration exists and is `REGISTERED` | FR-ATT-001 | No active registration found |
| Not already recorded | FR-ATT-002 | Attendance already recorded |
| Inside an attendance window, or a documented exception | FR-ATT-007 | Outside the attendance window |
| Reason present where the participant is not at the scan point | FR-ATT-012 | A reason is required |

**Rate limiting.** NFR-SEC-011 applies to QR validation, so a malfunctioning or malicious client
cannot enumerate valid tokens.

---

## Data Affected

| Entity | Effect |
|---|---|
| Attendance | Created with method, recorder, window, timestamp |
| Attendance | Corrected with the original value retained |
| Event | Live counts derived |
| AuditLog | `AUD-15` attendance recorded, `AUD-16` corrected |

---

## Notifications

**None during attendance recording.** A student is admitted or refused, which is direct feedback.

After the event, if a registrant was never marked present, **PROPOSED**: the owner receives a summary
naming registrants not marked present, so they can be followed up. This is an `NORMAL` notification
with no acknowledgement requirement.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Attendance recorded by QR | `AUD-15` | **No user actor**, method `QR`, registration, window, timestamp |
| Attendance recorded staff-assisted | `AUD-15` | Staff identity, registration, window, timestamp |
| Walk-in recorded | `AUD-15` | Staff identity, reason, event |
| Attendance corrected | `AUD-16` | Staff identity, previous value, new value, reason |
| Retrospective recording | `AUD-16` | Staff identity, reason, timestamp |

**The QR case records no user identity.** A self-scan establishes that the participant was present,
verified by their own credential. Attributing it to a user would suggest a staff member verified
them, which did not happen.

---

## Completion Criteria

- Attendance is recorded for every present participant
- No duplicate attendance record exists
- Every record is attributed to a registration, a method, and a recorder or self-scan
- Live counts match the recorded records
- Walk-ins are recorded separately

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBQ-01 | Happy path | QR scan for a registered participant | Recorded, method `QR`, no user actor |
| PBQ-02 | Happy path | Staff-assisted record | Recorded, staff identity attributed |
| PBQ-03 | Happy path | Pre-event window attendance | Accepted, attributed to that window |
| PBQ-04 | Happy path | Post-event window attendance | Accepted, attributed to that window |
| PBQ-05 | Happy path | Walk-in recorded | Accepted with reason, counted separately |
| PBQ-06 | Duplicate | Same QR scanned twice | Second refused, message clear |
| PBQ-07 | Duplicate | Staff-assisted for an already-recorded participant | Refused |
| PBQ-08 | Boundary | Attendance exactly at a window boundary | Policy-consistent, tested |
| PBQ-09 | Boundary | Capacity of one, two attendances attempted | Second refused |
| PBQ-10 | Invalid | QR for another event | Refused |
| PBQ-11 | Invalid | Expired QR | Refused |
| PBQ-12 | Invalid | Malformed or tampered token | Refused, no detail disclosed |
| PBQ-13 | Invalid | Attendance for a cancelled registration | Refused |
| PBQ-14 | Invalid | Attendance with no registration | Refused, FR-ATT-004 |
| PBQ-15 | Invalid | Attendance outside all windows | Refused, FR-ATT-007 |
| PBQ-16 | Invalid | Staff-assisted without an identity | Refused |
| PBQ-17 | Unauthorized | Officer corrects attendance | Refused, FR-ATT-016 |
| PBQ-18 | Unauthorized | Student records attendance for another student | Refused |
| PBQ-19 | Unauthorized | Attendance Staff records attendance on an unassigned event | Refused |
| PBQ-20 | Failure | Attendance service unavailable | Clear unavailable state, `PB-11` |
| PBQ-21 | Failure | QR service unavailable | Staff declare failure, continue |
| PBQ-22 | Failure | Staff correction with a reason | Accepted, original retained |
| PBQ-23 | Failure | Staff correction without a reason | Refused |
| PBQ-24 | Failure | Retrospective recording by staff | Permitted with reason |
| PBQ-25 | Failure | Retrospective recording by an officer | Refused |
| PBQ-26 | Failure | Registration cancelled after attendance | Attendance retained, FR-ATT-020 |
| PBQ-27 | Security | Automated rapid scanning | Rate limited |
| PBQ-28 | Failure | QR attempted to create a registration | No such path exists |
| PBQ-29 | Failure | Live count exceeds registered plus walk-ins | Blocked at finalisation |
| PBQ-30 | Boundary | Working student attends in the post-event window | Accepted |

---

## Exit Criteria

- Attendance is recorded reliably, with or without QR
- No duplicate or unattributable record exists
- `PB-11 Attendance Backup` is understood by all staff before the event
- `PB-12 Post-Event Records` follows

---

**Related documents:** [PB-10 QR Attendance](PB-10-QR-ATTENDANCE.md) ·
[PB-11 Attendance Backup](PB-11-ATTENDANCE-BACKUP.md) ·
[PB-04 Event Registration](PB-04-EVENT-REGISTRATION.md) ·
[ATTENDANCE-WORKFLOW.md](../../planning/ATTENDANCE-WORKFLOW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md) ·
[MVP.md](../../planning/MVP.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)