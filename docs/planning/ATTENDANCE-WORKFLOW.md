# Attendance Workflow

**Document:** ERNS-ATTWF
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Attendance Staff
**Supersedes:** None

---

## Purpose

Specify attendance capture for ERNS. Attendance is a **supporting** function: it exists to bind a
verified person to an event at a point in time, which is what makes the participation record
trustworthy.

---

## Scope

**In scope:** attendance eligibility, QR capture, staff-assisted capture, attendance windows,
duplicate prevention, corrections, and summaries.

**Out of scope:** registration, in [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md); the
attendance entity structure, in [DATA-MODEL.md](DATA-MODEL.md).

---

## 1. Locked Decisions

**CONFIRMED.** Attendance is a separate entity, not a registration status.

**CONFIRMED.** Only registered participants may have attendance recorded, subject to documented
exceptions.

**CONFIRMED.** Staff-assisted attendance is a first-class path, not a contingency.

**CONFIRMED.** The system does not rely exclusively on QR technology.

**CONFIRMED.** Offline functionality is not assumed unless specifically planned and justified.

---

## 2. Why Attendance Is Supporting, Not Primary

ERNS's two primary functions are Event Registration and Notification. Attendance supports
registration integrity: it is the point at which a registration is proven to correspond to a
present person.

**Design consequence.** Attendance gets a designed fallback path and configurable windows, but it
does not get features that registration or notification lack. There is no attendance analytics, no
attendance prediction, and no attendance-based recommendation.

---

## 3. The Central Rule

**FR-ATT-001.** Attendance may be recorded only for a participant holding a registration with
status `REGISTERED` for that event.

**FR-ATT-002.** Uniqueness of attendance is enforced on the registration reference at the storage
layer.

**FR-ATT-003.** Attendance is refused for a `CANCELLED` registration.

**FR-ATT-004.** An attendance record that does not reference a registration is refused.

This is the rule that solves Pain Point 12. The handwritten process recorded a name on a sheet.
Someone could write their name twice, or be recorded as present when absent. Binding attendance to
a registration, with a uniqueness constraint and a recorder identity, makes both impossible.

### 3.1 Registered-only, and the exception

**PROPOSED.** A walk-in who has no registration is handled as a documented exception:

1. Attendance Staff records the attempt
2. The system records the reason, or a walk-in category
3. The record is attributed to the staff member
4. It appears separately in reporting as an unregistered walk-in, never merged into the registered
   count
5. It is audited

> **OPEN QUESTION:** May students who are not registered attend, and under what exception? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-21.

**The exception deliberately does not create a registration.** **FR-ATT-018** prohibits attendance
from producing a registration. Creating one retroactively would convert an admission decision into
a registration after the fact, and would make the registration record unrepresentative of what
actually happened.

---

## 4. Attendance Methods

| Method | Requirement | When used |
|---|---|---|
| QR scan | FR-ATT-008 | Large events, where the queue is the problem |
| Staff-assisted | FR-ATT-010 | Small events, QR failure, accessibility, walk-ins |
| Correction | FR-ATT-014 | Fixing an incorrect record |

### 4.1 Why both methods are mandatory

The interview reported three separate problems: QR technical problems, manual attendance for
small events, and long queues. A single method cannot solve all three.

| Problem | Solved by |
|---|---|
| QR technical problems | Staff-assisted always available |
| Manual attendance for small events | Staff-assisted as the normal method |
| Long queues | QR |

**A system with only QR would leave the interview's reported problems unsolved.** A system with only
staff-assisted would leave the queues.

### 4.2 Why the staff-assisted path is built first

**PROPOSED**, and recorded in [MVP.md](MVP.md). The staff-assisted path is the MVP; QR is a
post-MVP accelerator.

The reasoning is the interview's own: QR has failed before. Building QR first and calling
staff-assisted a fallback means the fallback is the least-tested path at the moment it is most
needed. Building it first means attendance works before QR is introduced, and QR becomes an
accelerator on top of a working process rather than a single point of failure.

---

## 5. QR Attendance

### 5.1 QR generation

| Attribute | Rule |
|---|---|
| Association | Each QR resolves to exactly one event and one registration reference |
| Lifetime | Bounded by the event's attendance window |
| Uniqueness | A QR cannot be reused once consumed |
| Exposure | A QR must not disclose student identity before the participant scans it |

**PROPOSED.** Each participant receives a QR encoding an opaque token, not their name or student
number. A QR visible in a photograph should not reveal who participated.

**ASSUMPTION AS-06.** Venue connectivity is adequate for QR validation during an event. Validate
by a venue walkthrough.

> **OPEN QUESTION:** Is offline scanning required? Not currently planned. If AS-06 is false,
> offline scanning with deferred synchronisation becomes justified and must be planned properly
> rather than improvised, per [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) section 5.

### 5.2 QR validation

| Check | Requirement | Refusal reason |
|---|---|---|
| Token exists | FR-ATT-008 | Unrecognised code |
| Token not expired | FR-ATT-009 | Attendance window closed |
| Token belongs to this event | FR-ATT-009 | Wrong event |
| Token not already used | FR-ATT-009 | Already recorded |
| Registration is `REGISTERED` | FR-ATT-001 | Registration cancelled |
| Inside an attendance window | FR-ATT-007 | Outside attendance window |

**FR-ATT-009** covers all three QR-specific refusals.

### 5.3 Duplicate scan

A participant scanning twice is refused with "already recorded". This is not an error the
participant can fix by trying again, so the message MUST state plainly that attendance is already
recorded. **NFR-USAB-002** applies.

### 5.4 Rate limiting

**NFR-SEC-011** requires rate limiting on QR validation, so a malicious or malfunctioning client
cannot enumerate valid tokens.

---

## 6. Staff-Assisted Attendance

### 6.1 Requirements

| ID | Rule |
|---|---|
| FR-ATT-010 | Available whenever attendance may be recorded |
| FR-ATT-011 | Requires an Attendance Staff identity for every record |
| FR-ATT-012 | Requires a reason when recording a participant not present at the scan point |

**FR-ATT-011** is what makes staff-assisted attendance accountable. The interview's handwritten
process had no recorder identity, which is why records were unreliable.

### 6.2 When to use it

- QR is failing, per `PB-11 Attendance Backup`
- The event is small
- The participant has no device or QR
- The participant needs an accessible route, per NFR-A11Y-001
- A walk-in arrives

### 6.3 Participant lookup

Staff search by name, registration reference, or student number. The result shows whether a
registration exists and whether attendance is already recorded.

Staff see only participants for the event they are assigned to, per
[USER-ROLES.md](USER-ROLES.md) section 4.

> **CORRECTION, 2026-10-09.** This line previously read *"**FR-USR-016** analogue: staff see only
> participants for the event they are assigned to"*. The identifier `FR-USR-016` does not exist;
> the `FR-USR-*` series runs `FR-USR-001` to `FR-USR-014`, verified 2026-10-09. No requirement in
> that series states this rule, so it could not be repointed to one without inventing a requirement.
> The rule's actual authority is the permission matrix in [USER-ROLES.md](USER-ROLES.md) section 4,
> where *"Read participant list for owned event"* grants Attendance Staff read access. That citation
> is preserved. The reference is recorded as an unresolved coverage gap for Council Secretary
> review: the behaviour is specified but no functional requirement carries it.

---

## 7. Attendance Windows

### 7.1 Why configurable

**CONFIRMED** from the interview: working students cannot attend fixed periods, and the
organisation sometimes keeps attendance open before and after the event.

**FR-ATT-006.** Windows are configured per event, with at least a pre-event window and an event
window.

| Window | Typical use |
|---|---|
| Pre-event | Early arrival |
| Event | Core attendance |
| Post-event | Late departure, especially for working students |

**FR-ATT-005** records which window each attendance record belongs to, so a report can distinguish
arrive-on-time from arrive-early.

### 7.2 Rules

| ID | Rule |
|---|---|
| FR-ATT-007 | Attendance outside a configured window is refused, except as a recorded correction or documented exception |
| FR-ATT-020 | Attendance records are retained after cancellation |

> **OPEN QUESTION:** How are working students accommodated? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-22. **PROPOSED** default: configurable windows per
> event.

### 7.3 Interaction with security

**An extended window means people on site outside core hours.** This is relevant to the Security
Office, whose clearance is based on expected attendance. Noted so OQ-22 and OQ-04 are considered
together.

---

## 8. Corrections

### 8.1 Rules

| ID | Rule |
|---|---|
| FR-ATT-014 | Attendance Staff or Administrator may correct, with a recorded reason |
| FR-ATT-015 | Original value, corrector, timestamp, and reason are retained |
| FR-ATT-016 | An Event Officer may **not** correct attendance |

**FR-ATT-016** is deliberate. Officers own the event and would benefit from a flattering count.
Attendance integrity is the one number that must not be owned by the person whose event it measures.

### 8.2 Why corrections are retained rather than overwritten

An attendance record is evidence. Overwriting a value destroys the evidence that it was wrong.
**FR-ATT-015** retains both.

**NFR-AUD-005** provides no path to modify an audit entry, and correction writes a new value plus
an audit entry, so the history is reconstructable.

### 8.3 Retrospective recording

**PROPOSED.** Attendance recorded after the window closes is permitted for Attendance Staff and
Administrators, with a reason, and is audited as `AUD-16`. Officers may not.

This covers the real case of a participant whose scan failed after the event ended.

---

## 9. Live Counts

**FR-ATT-013** shows Attendance Staff the live count for an event in progress.

**FR-ATT-017** shows the owning Officer the summary, distinguishing: registered, present, absent,
unregistered walk-ins.

**PROPOSED.** Keep the four counts visually distinct. Merging walk-ins into present would
overstate attendance and would hide the operational fact that unregistered people attended.

---

## 10. Failure Handling

**Failure:** QR service is unavailable.
**Handling:** Attendance Staff declares QR failure, per **FR-ATT-019**. The staff-assisted path
becomes the declared method, and the declaration is recorded. Attendance continues. `PB-11
Attendance Backup` is the procedure.

**Failure:** a student's device has no network at the venue.
**Handling:** staff-assisted. This is the designed path, not an emergency.

**Failure:** the attendance service is unavailable during an event.
**Handling:** the system degrades to a clearly signposted unavailable state per NFR-AVAIL-004.
**This is the highest-impact failure ERNS can have**, and the mitigation is procedural: staff keep
a numbered paper list, reconciled into ERNS afterwards under administrator supervision with
reasons recorded.

**AS-06 and this failure mode are the reason offline scanning is not claimed.** An offline mode
would be a significant design commitment. Inventing one without evidence would be worse than
naming the limitation.

**Failure:** a duplicate scan arrives.
**Handling:** refused with a clear "already recorded" message. Not retried.

**Failure:** a scan references a cancelled registration.
**Handling:** refused, citing cancellation. Staff may use the documented exception path with a
reason.

**Failure:** attendance exceeds expected count.
**Handling:** possible only through the walk-in exception path, since capacity is enforced at
registration. Investigate if it exceeds registered count plus recorded walk-ins.

---

## 11. Completion Criteria

- Attendance is bound to a registration and cannot duplicate
- Both methods work and neither is a contingency for the other
- Windows are configurable per event
- Corrections are reasoned, attributed, and reversible in the record
- Officers cannot correct attendance
- Walk-ins are recorded separately from registrants

---

## 12. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| ATT-01 | QR scan for a `REGISTERED` participant | Attendance recorded, method `QR`, no recorder |
| ATT-02 | Second scan for the same registration | Refused by uniqueness constraint, `AUD-15` written once |
| ATT-03 | QR for an event other than the one being attended | Refused |
| ATT-04 | Expired QR | Refused |
| ATT-05 | Unrecognised QR token | Refused, no detail disclosed |
| ATT-06 | Staff-assisted record without an Attendance Staff identity | Refused, FR-ATT-011 |
| ATT-07 | Attendance for a `CANCELLED` registration | Refused, FR-ATT-003 |
| ATT-08 | Attendance with no registration reference | Refused, FR-ATT-004 |
| ATT-09 | Attendance outside all configured windows | Refused, FR-ATT-007 |
| ATT-10 | Attendance in the pre-event window | Accepted, attributed to that window |
| ATT-11 | Attendance in the post-event window | Accepted, attributed to that window |
| ATT-12 | Attendance Staff records a walk-in | Accepted with reason, counted separately |
| ATT-13 | Walk-in counted in the registered total | Prohibited |
| ATT-14 | QR scan attempts to create a registration | No such path exists, FR-ATT-018 |
| ATT-15 | Event Officer attempts a correction | Refused, FR-ATT-016 |
| ATT-16 | Attendance Staff corrects with a reason | Accepted, original retained, `AUD-16` |
| ATT-17 | Attendance Staff corrects without a reason | Refused |
| ATT-18 | Retrospective attendance after window close | Permitted for staff and Administrator with reason, `AUD-16` |
| ATT-19 | Retrospective recording by an Officer | Refused |
| ATT-20 | Attendance for an unapproved or cancelled event | Refused |
| ATT-21 | Registration cancelled after attendance | Attendance retained, FR-ATT-020 |
| ATT-22 | QR failure declared | Staff-assisted becomes the declared method, recorded |
| ATT-23 | Staff attempts attendance on an event they are not assigned | Refused |
| ATT-24 | Live count during an event | Registered, present, absent, walk-ins distinct |
| ATT-25 | Rapid automated scan requests | Rate limited, NFR-SEC-011 |

---

## 13. Exit Criteria

- OQ-20, OQ-21, and OQ-22 resolved
- AS-06 validated by a venue connectivity check
- Council Secretary confirms the working-student accommodation satisfies PP-13
- Staff confirm the fallback path is usable during a real event

---

**Related documents:** [ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) ·
[DATA-MODEL.md](DATA-MODEL.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[MVP.md](MVP.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)