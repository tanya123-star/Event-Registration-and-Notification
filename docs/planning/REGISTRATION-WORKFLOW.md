# Registration Workflow

**Document:** ERNS-REGWF
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Specify Event Registration, the first of ERNS's two primary functions: how an eligible student
binds themselves to an event, how that binding is validated and de-duplicated, how it is
confirmed, and how it is managed afterwards.

---

## Scope

**In scope:** registration prerequisites, the validation order, registration states, duplicate
prevention, confirmation, cancellation, manual registration, and registration monitoring.

**Out of scope:** who may register, which is in [USER-ROLES.md](USER-ROLES.md); attendance, which
is a separate function in [ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md); participant data
structure, in [DATA-MODEL.md](DATA-MODEL.md).

---

## 1. Locked Decisions

**CONFIRMED.** Registration states are `REGISTERED` and `CANCELLED` only.

**CONFIRMED.** `WAITLISTED`, `ATTENDED`, and `ABSENT` MUST NOT be used as registration states.
Attendance is a separate entity.

**CONFIRMED.** Participant capacity is a hard cap. There is no waitlist.

**CONFIRMED.** Uniqueness on `(user_id, event_id)` is the authoritative duplicate-registration
safeguard.

**CONFIRMED.** Validation order is: authenticated, account active, event published, registration
open, deadline, eligibility, capacity, duplicate, required fields.

---

## 2. Registration Prerequisites

**ASSUMPTION AS-01.** Registration requires an authenticated login. This is the only condition
under which the unique `(user_id, event_id)` constraint is authoritative, because identity must
be resolvable to one `user_id`.

> **OPEN QUESTION:** Must registration require login, or is student number plus institutional
> email sufficient? See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-07. **BLOCKING.**
> A proposed decision answering "login required" is recorded at that entry, prepared by the
> Developer / Technical Owner on 2026-10-09. **It is not approved.** OQ-07 names Council Secretary
> and IT as its answerer, so it remains open until they decide.

If OQ-07 were resolved against login, the duplicate safeguard would weaken materially: a student could
register twice under two accounts. That consequence must be accepted explicitly, not discovered
in production.

---

## 3. Registration Flow

```
Student
   ↓ authenticates
Browse Events           only events in the student's target audience
   ↓
View Event Details      full record including mechanics, requirements, materials
   ↓
Check Eligibility       eligibility flag and audience membership
   ↓
Register                selects Register
   ↓
Registration Validation 9 ordered checks
   ↓
Registration Confirmation reference issued, notification created
   ↓
Participant Record      registration bound to user and event with context snapshot
```

---

## 4. Validation Order

The order is **locked** and is not a preference. Each check is cheap relative to the next, and
the order places the most security-relevant and most commonly failing checks first.

| # | Check | Rule | Requirement | Failure message states |
|---|---|---|---|---|
| 1 | Authenticated | A valid session exists | FR-REG-006 | Sign in to register |
| 2 | Account active | `account_status` is `ACTIVE` | FR-REG-007 | Account suspended, contact the office |
| 3 | Event published | Event status permits visibility | FR-REG-008 | Event not available for registration |
| 4 | Registration open | Registration period open and flag set | FR-REG-009 | Registration has not opened yet |
| 5 | Deadline | Current time before the deadline | FR-REG-010 | Registration deadline has passed |
| 6 | Eligibility | Student in target audience and `is_eligible` | FR-REG-011, FR-REG-012 | Not eligible for this event |
| 7 | Capacity | Current registered count below capacity | FR-REG-013 | Event is full |
| 8 | Duplicate | No existing registration for `(user, event)` | FR-REG-014 | Already registered, with status shown |
| 9 | Required fields | All required registration fields present | FR-REG-015 | Field-specific |

**FR-REG-005** mandates this order.

### Why capacity precedes duplicate

Capacity is checked before duplicate because a full event is a more informative refusal for a
student who is already registered and retrying, and because checking duplicate last keeps the
expensive uniqueness probe off the path of the common "event is full" rejection during a burst.

### Why required fields come last

Field validation is cheap, and placing it last means a student blocked by a deadline is told about
the deadline rather than about a form field. Arguable, but it is the locked order and consistency
prevents confusing mixed messages.

---

## 5. Duplicate Prevention

### 5.1 Three layers

| Layer | Mechanism | Purpose |
|---|---|---|
| Presentation | Register button replaced by existing status when a registration exists | Avoids a pointless attempt |
| Application | Explicit duplicate check at step 8 | Produces a clear, human-readable refusal |
| Storage | Unique constraint on `(user_id, event_id)` | The only guarantee under concurrency |

**FR-REG-016** requires the storage layer.

### 5.2 Why the storage constraint is the real control

Two registration requests for the last remaining slot can arrive simultaneously. Application-level
checks read a count, then write. Without a transactional boundary, both can read the same count
and both succeed, exceeding capacity.

**NFR-INTEG-007** requires that all validation rules execute inside the same transaction as the
write. **NFR-INTEG-001** requires the storage constraint. Together they make capacity and
duplication correct under concurrency rather than usually correct.

### 5.3 Required behaviour

- **FR-REG-014** — refuse a duplicate attempt
- **FR-REG-023** — on refusal, show the student's existing registration status rather than only an
  error
- **DATA-01, DATA-02** — the test scenarios that verify both layers

---

## 6. Registration Data Recorded

Per **FR-REG-017**, each registration records:

| Field | Purpose |
|---|---|
| `user_id` | Who registered |
| `event_id` | What they registered for |
| `registered_at` | When |
| `registration_source` | `SELF`, `OFFICER`, or `ADMINISTRATOR` |
| `confirmation_reference` | Student-facing identifier |
| `student_context` | Snapshot of programme, year level, and organisation |

**The snapshot matters.** A student who changes programme after registering must not retroactively
appear in a different cohort in a past event's reports. **NFR-INTEG-009** and **DATA-14** cover
this.

---

## 7. Confirmation

### 7.1 Mechanisms

| Mechanism | Status | Rationale |
|---|---|---|
| In-app confirmation notification | **CONFIRMED** | Source of truth per locked decision |
| Confirmation screen with reference | **PROPOSED** | Immediate, no delivery dependency |
| Reference number | **PROPOSED** | Lets attendance staff identify a participant verbally |
| Email confirmation | **PROPOSED** | Delivered by the email layer, per FR-NOT-003 |
| SMS confirmation | **NOT USED** | No confirmed availability. Would contradict the locked notification model |

**FR-REG-021** requires the confirmation notification. **FR-REG-022** requires the confirmation
screen. **FR-REG-020** requires the reference.

### 7.2 Confirmation content

- Event title, date, start time, venue
- Registration status `REGISTERED`
- Confirmation reference
- Registration timestamp
- Event mechanics, requirements, materials, and dress code
- Link to the event record for later re-reading

**The confirmation carries the event detail, not just an acknowledgement.** The interview reported
participants arriving without requirements or materials. Putting the same information in the
registration confirmation and the event record gives the student two chances to read it.

### 7.3 Failure handling

**Failure:** the registration is created but the confirmation notification cannot be dispatched.
**Handling:** the registration stands. The in-app record is authoritative, and the failure is
recorded as an email-layer failure. The student sees the registration in their centre regardless.

**Rule:** a notification failure MUST NOT roll back a successful registration. The registration is
the fact; the notification is the report of it.

---

## 8. Cancellation

### 8.1 Rules

| ID | Rule |
|---|---|
| FR-REG-024 | A student may cancel their own registration until registration closes |
| FR-REG-025 | Cancellation sets `CANCELLED` and records timestamp, reason, and actor |
| FR-REG-026 | The record is retained, never deleted |
| FR-REG-027 | Only the student, the owning Officer, or an Administrator may cancel |
| FR-REG-028 | Officer or Administrator cancellation requires a reason |
| FR-REG-029 | The original registration timestamp and source cannot be modified |

> **OPEN QUESTION:** Should students be able to cancel their own registration? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-12.

### 8.2 Whether cancellation frees a slot

**PROPOSED.** Cancellation releases the slot, permitting re-registration.

> **OPEN QUESTION:** Does a cancelled registration permanently consume a slot? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-10, assumption AS-09.

This is not cosmetic. Under the locked decision, uniqueness on `(user_id, event_id)` means a
cancelled row occupies that pair. Permitting re-registration therefore requires either allowing
a new row, or making the constraint conditional on active status. Both are implementable; the
choice is the organisation's.

### 8.3 Student-visible cancellation

A cancelled registration remains visible to the student with status `CANCELLED`, including the
reason. Concealing it would leave the student believing they are still registered, which is the
exact failure mode of the current handwritten process.

---

## 9. Registration Management

### 9.1 Officer visibility

Per **FR-REG-030** and **FR-REG-031**, the owning Officer sees: total registered, capacity,
available slots, remaining capacity, the participant list with status and registration timestamp.

### 9.2 Actions and authority

| Action | Officer | Administrator | Attendance Staff | Approver | Student |
|---|---|---|---|---|---|
| View participant list | Own event | Any | Assigned event | No | Own only |
| Export participant list | Own event | Any | No | No | No |
| Close registration | Own event | Any | No | No | No |
| Reopen registration | Own event, with reason | Any, with reason | No | No | No |
| Cancel a participant's registration | Own event, with reason | Any, with reason | No | No | Own only |
| Manually register a participant | Own event, with reason | Any, with reason | **Prohibited** | No | No |
| Correct registration data | **Prohibited** | With reason | No | No | No |

**FR-REG-036** prohibits Attendance Staff from creating any registration. This is segregation of
duty SD-2: attendance must not become a back door into registration.

**FR-REG-029** prohibits altering the registration timestamp or source, so a record of who
registered cannot be rewritten.

### 9.3 Manual registration

**PROPOSED.** Manual registration exists for cases where a student cannot self-register, such as
assistance for a participant without device access on the day.

Mandatory: a named participant, a stated reason, and an audit entry with the officer's identity.

**It is not a way to reach capacity.** Capacity applies to manual registration identically.

### 9.4 Capacity reduction

**FR-REG-037** refuses reducing capacity below the current registered count, unless participants
are removed in the same operation. Reducing capacity silently invalidates existing registrations,
which is a data-integrity failure with a real-world consequence: students who registered on the
strength of a stated capacity.

### 9.5 Notification on administrative change

| Action | Recipients | Type |
|---|---|---|
| Registration cancelled by officer | Affected student | `IMPORTANT`, acknowledgement required |
| Registration manually created | Affected student | `NORMAL` |
| Registration reopened | Target audience | `HIGH` |
| Registration closed | Target audience, registrants | `NORMAL` |

An officer cancelling a student's registration without telling that student would reproduce the
core failure in [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md). Notification is mandatory, not
optional.

---

## 10. Registration States

| State | Meaning | Student-visible |
|---|---|---|
| `REGISTERED` | The student holds a confirmed place | Yes |
| `CANCELLED` | The registration was withdrawn and retained as a record | Yes, with reason |

**Prohibited as registration states:** `WAITLISTED`, `ATTENDED`, `ABSENT`.

**FR-REG-019** prohibits any other value.

### Distinguishing states from facts

| Concept | Where it lives | Why |
|---|---|---|
| Registered | `Registration.status` | The binding itself |
| Attended | `Attendance.present` | An observed fact with its own recorder |
| Absent | Absence of an `Attendance` record for a `REGISTERED` registration | Derived, not stored |
| Capacity remaining | Count of `REGISTERED` minus capacity | Derived |

Storing `ATTENDED` on the registration would mean the registration's identity changes at event day.
It would also make the attendance recorder's identity part of the registration record, and would
force a decision about what happens when an attendance record is corrected.

---

## 11. Reporting

Per [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md):

| Report | Requirement | Audience |
|---|---|---|
| My registrations | FR-RPT-001 | Student |
| Open registrations | FR-RPT-003 | Officer, Administrator |
| Registration summary per event | FR-RPT-004 | Owner, Administrator |
| Participant list | FR-REG-031, FR-REG-038 | Owner, Administrator |
| Registration status | FR-REG-003 | Student, per event |

**FR-RPT-011** prohibits trend analysis and dashboards.

---

## 12. Audit Requirements

| Action | Audit class |
|---|---|
| Registration created by student | `AUD-12` |
| Registration cancelled by student | `AUD-13` |
| Registration cancelled by officer or Administrator | `AUD-13`, with reason |
| Registration manually created | `AUD-12`, with reason |
| Registration window closed or reopened | `AUD-11`, reason on reopen |
| Participant list exported | `AUD-22` |
| Capacity changed | `AUD-05` |

Catalogue in [AUDIT-PLAN.md](AUDIT-PLAN.md).

---

## 13. Failure Handling

**Failure:** storage is unavailable during a registration attempt.
**Handling:** refuse with a clear message. Do not accept a registration that cannot be persisted.
**NFR-AVAIL-005** requires that a registration reported as successful is never lost.

**Failure:** the email layer fails after registration succeeds.
**Handling:** the registration stands. Email state becomes `FAILED`. The in-app record is
unaffected, per **FR-NOT-005**.

**Failure:** the capacity check passes but the storage constraint rejects.
**Handling:** a concurrent registration took the last slot. Refuse with "event is full" and log
the concurrency event. This is expected behaviour, not an error.

**Failure:** a student reports registering successfully but sees no registration.
**Handling:** check the audit trail and the confirmation reference before re-attempting. The
registration either exists, in which case the display is at fault, or it does not, in which case
the student may retry.

---

## 14. Completion Criteria

- Validation order is fixed and implemented as specified
- Duplicate prevention operates at three layers
- Registration state is limited to `REGISTERED` and `CANCELLED`
- Every administrative change is authorised and audited
- Notification failure cannot invalidate a successful registration

---

## 15. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| REG-01 | Eligible student registers for an open event | `REGISTERED`, confirmation issued, notification created |
| REG-02 | Unauthenticated registration attempt | Refused at step 1 |
| REG-03 | Suspended account registration attempt | Refused at step 2 |
| REG-04 | Registration for an unpublished event | Refused at step 3 |
| REG-05 | Registration before the opening time | Refused at step 4 |
| REG-06 | Registration after the deadline | Refused at step 5 |
| REG-07 | Registration by a student outside the audience | Refused at step 6 |
| REG-08 | Registration by an ineligible student | Refused at step 6 |
| REG-09 | Registration when capacity is reached | Refused at step 7 |
| REG-10 | Registration at exactly capacity minus one | Succeeds, capacity now reached |
| REG-11 | Second registration by the same student | Refused at step 8, existing status shown |
| REG-12 | Registration missing a required field | Refused at step 9 |
| REG-13 | Two simultaneous registrations for the last slot | Exactly one succeeds |
| REG-14 | Two simultaneous registrations by the same student | Exactly one succeeds |
| REG-15 | Officer cancels a registration without a reason | Refused |
| REG-16 | Officer cancels a registration with a reason | Allowed, student notified, audited |
| REG-17 | Administrator cancels without a reason | Refused, SD-4 |
| REG-18 | Attendance Staff attempts manual registration | Refused, SD-2 |
| REG-19 | Approver attempts to register | Refused |
| REG-20 | Capacity reduced below registered count | Refused |
| REG-21 | Registration after cancellation by the same student | Depends on OQ-10 |
| REG-22 | Student changes programme after registering | Original snapshot retained |
| REG-23 | Email dispatch fails after successful registration | Registration stands, email state `FAILED` |
| REG-24 | Student attempts to read another student's registration | Refused |
| REG-25 | Student cancels their own registration | `CANCELLED`, retained, visible to the student |
| REG-26 | Reopen registration after event start | Refused, FR-REG-034 |
| REG-27 | Storage unavailable during registration | Refused, no partial write |
| REG-28 | Export a participant list for an unowned event | Refused |

---

## 16. Exit Criteria

- OQ-07, OQ-10, OQ-12, and OQ-25 resolved
- Council Secretary confirms the registration flow matches their process
- The duplicate-prevention design is reviewed as concurrency-safe

---

**Related documents:** [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) ·
[ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[DATA-MODEL.md](DATA-MODEL.md) ·
[Test scenarios](TESTING-STRATEGY.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)