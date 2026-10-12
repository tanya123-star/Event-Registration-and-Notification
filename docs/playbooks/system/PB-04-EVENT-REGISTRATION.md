# Playbook 04 — Event Registration

**Playbook:** PB-04
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Student
**Supersedes:** None

---

## Purpose

Allow an eligible student to register for an event through ERNS. This is **Primary Function 1** of
the Event Registration and Notification System.

The binding between a student and an event is the fact that everything else depends on. If it is
wrong, attendance is unreliable, notification targeting is wrong, and the participation record cannot
be trusted.

---

## Scope

**In scope:** discovery, eligibility checking, validation, registration, confirmation, and
cancellation by the student.

**Out of scope:** administrative registration actions, `PB-05 Registration Management`; attendance,
`PB-10 QR Attendance`.

---

## Trigger

A student opens an event and selects Register.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Student | Registers and cancels their own registration |
| System | Validates, records, confirms |

---

## Preconditions

- The student is authenticated, per assumption AS-01
- The student holds the Student role and has a StudentProfile
- The student's account is active
- The event is published and in the student's target audience
- Registration is open for this event
- The registration deadline has not passed

---

## Main Workflow

1. Student signs in
2. Student browses events open to their audience
3. Student opens an event
4. System displays the full event record: description, date, time, venue, mechanics, programme flow,
   requirements, materials, dress code, contact person
5. System displays the registration state: open, not yet open, closed, deadline passed, full, or not
   required
6. Student selects Register
7. **System validates in the locked order:**
   8. Authenticated
   9. Account active
   10. Event published
   11. Registration open
   12. Deadline
   13. Eligibility, including audience membership and the eligibility flag
   14. Capacity
   15. Duplicate
   16. Required fields
17. System creates the registration with status `REGISTERED`
18. System records the registering user, event, timestamp, source, a confirmation reference, and a
    snapshot of the student's programme, year level, and organisation
19. System creates a registration-confirmation notification
20. System displays a confirmation screen with the event, status, reference, and timestamp
21. System records the registration in the audit trail

---

## Alternative Paths

### The student is already registered

Validation step 8 refuses the attempt. The system displays the existing registration status,
reference, and timestamp rather than only an error message, per FR-REG-023. The Register control is
replaced by the current status where the system can determine it in advance.

### The event is full

Validation step 7 refuses the attempt. **There is no waitlist.** The message states that the event
is full and does not offer an alternative action, because offering a waitlist would imply a
capability that does not exist.

### The deadline has passed

Validation step 6 refuses the attempt. The message states the deadline that has passed.

### The student is not in the target audience

Validation step 6 refuses the attempt. The student cannot register, and in most cases cannot see the
event either, per FR-EVT-013.

### The student is marked ineligible

Validation step 6 refuses the attempt. The message states they are not eligible and names the
office to contact.

### Registration is not required for this event

The Register control is not shown. The student sees the event and may attend. No registration
exists, so attendance records them as a walk-in.

### Registration opens at a later time

The student sees "registration has not opened yet" with the opening time, per FR-REG-003.

### The student cancels their own registration

1. Student opens their registration
2. Student selects Cancel registration
3. Student confirms, and the consequence is stated
4. System sets status `CANCELLED` and records the timestamp, reason, and cancelling user
5. The record is retained, not deleted
6. The cancelled status remains visible to the student

### The student already holds a cancelled registration and wants to re-register

**Dependent on OQ-10.** Under the proposed assumption AS-09, cancellation releases the slot and the
student may register again. If the Council decides a cancellation permanently consumes the slot,
this path does not exist.

### Registration succeeds but the email fails

The registration stands. The in-app notification is created regardless. Email state becomes `FAILED`
and is retried. **A mail problem never invalidates a registration.**

---

## Validation Rules

Validation is ordered. The order is locked and is not a preference.

| # | Check | Requirement | Failure message |
|---|---|---|---|
| 1 | Authenticated | FR-REG-006 | Sign in to register |
| 2 | Account active | FR-REG-007 | This account is suspended. Contact the office |
| 3 | Event published | FR-REG-008 | This event is not available for registration |
| 4 | Registration open | FR-REG-009 | Registration has not opened yet. It opens on {date} |
| 5 | Deadline | FR-REG-010 | The registration deadline passed on {date} |
| 6 | Eligibility | FR-REG-011, FR-REG-012 | You are not eligible for this event |
| 7 | Capacity | FR-REG-013 | This event is full |
| 8 | Duplicate | FR-REG-014 | You are already registered. Reference {ref} |
| 9 | Required fields | FR-REG-015 | {field} is required |

### Storage-layer enforcement

| Rule | Requirement | Purpose |
|---|---|---|
| Unique on `(user_id, event_id)` | FR-REG-016 | The authoritative duplicate safeguard |
| Validation inside the registration transaction | NFR-INTEG-007 | Prevents a capacity check passing then being overtaken by a concurrent registration |

**The application check at step 8 is a courtesy that produces a readable message. The storage
constraint is the guarantee.** Two simultaneous attempts for the last slot must result in exactly one
success; that is scenario CON-01 in [TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md).

---

## Data Affected

| Entity | Effect |
|---|---|
| Registration | Created with status `REGISTERED`, or status changed to `CANCELLED` |
| Notification | Registration confirmation created |
| NotificationRecipient | One record for the student, in-app state `CREATED` |
| AuditLog | `AUD-12` registration created, `AUD-13` cancellation |

---

## Notifications

| Notification | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Registration confirmation | The registering student | `NORMAL` | No |
| Event cancellation, if the event is later cancelled | The student, as a registrant | `IMPORTANT` | Yes |
| Event update, if a triggering field changes | The student, as a registrant | `HIGH` | No |

**The confirmation carries the event detail, not only an acknowledgement.** It repeats the
requirements, materials, and dress code. This is deliberate: the interview reported participants
arriving without that information, and the confirmation is the moment a student is most motivated
to read it.

The confirmation reference is generated and displayed, per FR-REG-020. It lets a participant
identify their registration verbally at the attendance desk, which matters for students who cannot
use their phone at the venue.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Registration created | `AUD-12` | Student, event, timestamp, source `SELF`, new state |
| Registration cancelled by the student | `AUD-13` | Student, event, timestamp, previous and new state, reason |
| Duplicate attempt refused | No audit entry | Logged for security monitoring only. Not a state change |

---

## Failure Handling

**Failure:** the student submits the form twice by accident.
**Handling:** the second attempt is refused by the storage constraint, not merely by the application
check. The student sees their existing registration. **No duplicate record exists.**

**Failure:** two students compete for the last slot.
**Handling:** exactly one succeeds, enforced by the transaction boundary. The other is refused with
"this event is full". A uniqueness or constraint violation here is expected behaviour, not an
error condition.

**Failure:** storage is unavailable.
**Handling:** the registration is refused with a clear message. **The system never reports a
registration it did not persist**, per NFR-AVAIL-005. The student may retry.

**Failure:** the student believes they registered but see no record.
**Handling:** the student checks their registration list. If the reference number they were given
matches a record, the registration exists and the display is at fault. If no record exists, they
may register again.

**Failure:** the confirmation email is not received.
**Handling:** the registration is unaffected. The student sees the confirmation in their
notification centre. Email is a delivery layer, not the source of truth.

**Failure:** the student's eligibility flag is changed after registration.
**Handling:** the existing registration stands. Eligibility is checked at registration time, and the
registration is a record of what was true then. Cancelling a now-ineligible registration is an
officer action.

**Failure:** the student registered for the wrong event.
**Handling:** cancel and register again, provided capacity permits. The cancelled record is
retained.

---

## Completion Criteria

- A registration exists with status `REGISTERED`, bound to the correct user and event
- The registration records the context snapshot taken at registration time
- A confirmation reference exists and has been shown to the student
- A confirmation notification exists in the student's notification centre
- The registration is recorded in the audit trail

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBR-01 | Happy path | Eligible student registers for an open event | `REGISTERED`, confirmation issued |
| PBR-02 | Happy path | Student cancels their own registration | `CANCELLED`, retained, visible |
| PBR-03 | Duplicate | Same student registers twice | Second refused, existing status shown |
| PBR-04 | Duplicate | Two simultaneous registrations by the same student | Exactly one succeeds |
| PBR-05 | Duplicate | Two simultaneous registrations for the last slot | Exactly one succeeds |
| PBR-06 | Boundary | Registration at capacity minus one | Succeeds |
| PBR-07 | Boundary | Registration at exactly capacity | Refused, full |
| PBR-08 | Boundary | Registration one minute before the deadline | Succeeds |
| PBR-09 | Boundary | Registration at the deadline instant | Policy-consistent, tested per NEG-02 |
| PBR-10 | Boundary | Registration at the opening instant | Policy-consistent, tested per NEG-03 |
| PBR-11 | Invalid | Unauthenticated registration | Refused at step 1 |
| PBR-12 | Invalid | Suspended account | Refused at step 2 |
| PBR-13 | Invalid | Unpublished event | Refused at step 3 |
| PBR-14 | Invalid | Before registration opens | Refused at step 4 |
| PBR-15 | Invalid | After the deadline | Refused at step 5 |
| PBR-16 | Invalid | Outside the target audience | Refused at step 6 |
| PBR-17 | Invalid | Marked ineligible | Refused at step 6 |
| PBR-18 | Invalid | Required field missing | Refused at step 9 |
| PBR-19 | Unauthorized | Student registers on another's behalf | Refused |
| PBR-20 | Unauthorized | Attendance Staff registers | Refused, SD-2 |
| PBR-21 | Unauthorized | Approver registers | Refused |
| PBR-22 | Unauthorized | Student reads another's registration | Refused, FR-REG-040 |
| PBR-23 | Failure | Storage unavailable | Refused, no partial write |
| PBR-24 | Failure | Email dispatch fails | Registration stands, email `FAILED` |
| PBR-25 | Failure | Student reports success but sees no record | Reconciled by reference number |
| PBR-26 | Failure | Student changes programme after registering | Original snapshot retained |
| PBR-27 | Security | Crafted input in a registration field | Treated as data |
| PBR-28 | Security | Direct request bypassing the interface | Authorisation enforced server-side |
| PBR-29 | Failure | Event cancelled while a student is registering | Registration refused or succeeds with a cancellation notification, consistent with the transaction |
| PBR-30 | Boundary | Re-registration after cancellation | Depends on OQ-10 |

---

## Exit Criteria

- The registration is recorded and confirmed
- The student's notification centre shows the confirmation
- `PB-05 Registration Management` governs what the officer does with the resulting list

---

**Related documents:** [PB-04 Event Registration](PB-04-EVENT-REGISTRATION.md) ·
[PB-05 Registration Management](PB-05-REGISTRATION-MANAGEMENT.md) ·
[PB-03 Event Publishing](PB-03-EVENT-PUBLISHING.md) ·
[PB-10 QR Attendance](PB-10-QR-ATTENDANCE.md) ·
[REGISTRATION-WORKFLOW.md](../../planning/REGISTRATION-WORKFLOW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)