# Functional Requirements

**Document:** ERNS-FR
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

State every functional requirement of the Event Registration and Notification System in
testable form, grouped by module, with stable identifiers for traceability.

A requirement in this document is a commitment. Each one names an actor, states one behaviour,
and can be distinguished from its opposite by a test.

---

## Scope

**In scope:** functional behaviour. Not covered here: quality attributes, which are in
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md); process, which is in the
playbooks; architecture, which is in `docs/architecture/`.

---

## 1. Writing Rules

Per [CONVENTIONS.md](CONVENTIONS.md) section 7:

1. `shall` for mandatory behaviour
2. One behaviour per requirement
3. Actor named in each
4. Verifiable by a test
5. Negative requirements state the prohibited outcome

Identifiers are `FR-<MODULE>-<NNN>`. Modules: `EVT`, `APR`, `REG`, `NOT`, `ATT`, `POS`, `USR`,
`RPT`.

---

## 2. Status of This Requirement Set

**No requirement in this document is CONFIRMED as a stakeholder-agreed requirement.**

All requirements are **PROPOSED**, derived from:

- **CONFIRMED** interview findings, per [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md)
- **CONFIRMED** locked decisions in the governance prompt
- Architect recommendations where the interview was silent

Requirements depending on unresolved stakeholder decisions are marked `→ OQ-NN`.

---

## 3. User and Role Management (USR)

| ID | Requirement | Status |
|---|---|---|
| FR-USR-001 | The system shall require an authenticated identity before allowing any access to event information, registration, notification, or attendance functionality. | PROPOSED |
| FR-USR-002 | The system shall provide the five roles Administrator, Event Officer, Approver, Student, and Attendance Staff, and no others. | PROPOSED |
| FR-USR-003 | The system shall not provide a Club Officer login role. | PROPOSED |
| FR-USR-004 | The system shall allow an Administrator to provision, suspend, and reactivate user accounts. | PROPOSED |
| FR-USR-005 | The system shall not allow a user to create their own account. | PROPOSED |
| FR-USR-006 | The system shall allow an Administrator to assign and revoke roles. | PROPOSED |
| FR-USR-007 | The system shall not allow a non-Administrator user to grant or revoke the Administrator role. | PROPOSED |
| FR-USR-008 | The system shall maintain exactly one StudentProfile per user holding the Student role, and shall refuse to create a StudentProfile for a user without that role. | PROPOSED |
| FR-USR-009 | The system shall refuse all functional actions from a user whose account status is `SUSPENDED`, while preserving their historical records. | PROPOSED |
| FR-USR-010 | The system shall record every role grant and revocation in the audit trail with the granting Administrator's identity. | PROPOSED |
| FR-USR-011 | The system shall refuse to grant the Approver role to a user who holds the Event Officer role for the same event, enforcing segregation of duties. | PROPOSED |
| FR-USR-012 | The system shall time-bound the Attendance Staff role so that standing access to participant data expires. | PROPOSED |
| FR-USR-013 | The system shall notify a user whenever a role is granted to or revoked from them. | PROPOSED |
| FR-USR-014 | The system shall refuse a role revocation that would leave an approval assignment or open attendance window unassignable. | PROPOSED |

> **CORRECTION, 2026-10-09.** FR-USR-012 previously carried the gate `PROPOSED → OQ-24`. That gate
> was erroneous and has been removed. OQ-24 asks *"Should the Administrator role be held by one
> person, or separated into a technical administrator and a business administrator?"* — a role-model
> question that has no bearing on how long an Attendance Staff assignment lasts. Verified against the
> OQ-24 registry entry on 2026-10-09.
>
> **No replacement gate has been invented.** The time-bounding duration is a configuration parameter,
> not an unresolved policy question: [USER-ROLES.md](USER-ROLES.md) section 4 already specifies that
> Attendance Staff are assigned per event or per term rather than permanently. FR-USR-012 is
> implementable on that basis. Removed by Developer / Technical Owner as a documentation defect.

---

## 4. Event Information Management (EVT)

| ID | Requirement | Status |
|---|---|---|
| FR-EVT-001 | The system shall allow an Event Officer to create an event in `DRAFT` status. | PROPOSED |
| FR-EVT-002 | The system shall record, for every event: title, description, event type, date, start time, end time, venue, organizer, target audience, registration-required flag, contact person, and status. | PROPOSED |
| FR-EVT-003 | The system shall record registration start, registration deadline, and participant capacity for every event where registration is required. | PROPOSED |
| FR-EVT-004 | The system shall record structured event mechanics, programme flow, requirements, materials needed, and dress code for every event whose type is not a general assembly. | PROPOSED |
| FR-EVT-005 | The system shall refuse to submit an event for approval when any required field for its event type is absent. | PROPOSED |
| FR-EVT-006 | The system shall refuse an event whose end time is not later than its start time. | PROPOSED |
| FR-EVT-007 | The system shall refuse an event whose registration deadline is later than its event date. | PROPOSED |
| FR-EVT-008 | The system shall refuse an event whose registration start is later than its registration deadline. | PROPOSED |
| FR-EVT-009 | The system shall refuse a participant capacity that is not a positive integer. | PROPOSED |
| FR-EVT-010 | The system shall allow an Event Officer to attach supporting documents to an event they own. | PROPOSED |
| FR-EVT-011 | The system shall refuse attachment or removal of documents while the event is under review. | PROPOSED |
| FR-EVT-012 | The system shall validate the type and size of every uploaded attachment before storage. | PROPOSED → NFR-SEC-009 |
| FR-EVT-013 | The system shall show an event only to members of the target audience, plus Event Officers, Approvers assigned to it, Attendance Staff assigned to it, and Administrators. | PROPOSED |
| FR-EVT-014 | The system shall display to each student the events currently open for their target audience. | PROPOSED |
| FR-EVT-015 | The system shall refuse to show an unpublished event to a Student. | PROPOSED |
| FR-EVT-016 | The system shall record who last modified an event and when. | PROPOSED |

---

## 5. Event Approval (APR)

| ID | Requirement | Status |
|---|---|---|
| FR-APR-001 | The system shall allow the owning Event Officer to submit a draft event for approval. | PROPOSED |
| FR-APR-002 | The system shall require at least one approval step for every event type before publication is permitted. | PROPOSED |
| FR-APR-003 | The system shall allow an Administrator to configure the approval chain for each event type. | PROPOSED → OQ-01..04 |
| FR-APR-004 | The system shall evaluate approval steps strictly in configured sequence, and shall refuse a decision on a step whose predecessor is not approved. | PROPOSED |
| FR-APR-005 | The system shall record, for every approval step: the office, the assigned approver, the status, the deciding user, the decision timestamp, and any comments. | PROPOSED |
| FR-APR-006 | The system shall require comments when an approver requests revision. | PROPOSED |
| FR-APR-007 | The system shall require a reason when an approver rejects an event. | PROPOSED |
| FR-APR-008 | The system shall allow the owning Event Officer to resubmit an event returned for revision. | PROPOSED |
| FR-APR-009 | The system shall allow an Administrator to delegate or reassign a pending approval step, recording the delegation. | PROPOSED |
| FR-APR-010 | The system shall preserve the full decision history of every approval chain, including superseded steps. | PROPOSED |
| FR-APR-011 | The system shall refuse to publish an event unless every required approval step is approved. | PROPOSED |
| FR-APR-012 | The system shall refuse publication by the user who granted the final approval. | PROPOSED |
| FR-APR-013 | The system shall refuse edits to an event while an approval step is active. | PROPOSED |
| FR-APR-014 | The system shall return an event to `PENDING_APPROVAL` with a recorded amendment step when a post-publication change requires re-approval. | PROPOSED → OQ-19 |
| FR-APR-015 | The system shall notify the assigned approver when an event is submitted or when an event reaches their approval step. | PROPOSED |
| FR-APR-016 | The system shall not advance an approval chain automatically on timeout. | PROPOSED |
| FR-APR-017 | The system shall identify events whose approval step has been idle beyond a configured threshold. | PROPOSED |

---

## 6. Event Registration (REG) — PRIMARY FUNCTION 1

### 6.1 Access and discovery

| ID | Requirement | Status |
|---|---|---|
| FR-REG-001 | The system shall allow an authenticated Student to view the events currently open for registration for their audience. | PROPOSED |
| FR-REG-002 | The system shall allow a Student to view the full detail of any published event open to their audience. | PROPOSED |
| FR-REG-003 | The system shall display the registration state of an event to a Student: open, not yet open, closed, deadline passed, full, or not required. | PROPOSED |

### 6.2 Registration

| ID | Requirement | Status |
|---|---|---|
| FR-REG-004 | The system shall allow an eligible authenticated Student to register for an event. | PROPOSED → OQ-07 |
| FR-REG-005 | The system shall evaluate every registration attempt in the order: authenticated, account active, event published, registration open, deadline, eligibility, capacity, duplicate, required fields. | PROPOSED |
| FR-REG-006 | The system shall refuse a registration attempt from an unauthenticated user. | PROPOSED |
| FR-REG-007 | The system shall refuse a registration attempt from a user whose account is suspended. | PROPOSED |
| FR-REG-008 | The system shall refuse a registration attempt for an event that is not published. | PROPOSED |
| FR-REG-009 | The system shall refuse a registration attempt before the registration opening time. | PROPOSED |
| FR-REG-010 | The system shall refuse a registration attempt after the registration deadline. | PROPOSED |
| FR-REG-011 | The system shall refuse a registration attempt from a student outside the event's target audience. | PROPOSED |
| FR-REG-012 | The system shall refuse a registration attempt from a student marked ineligible. | PROPOSED |
| FR-REG-013 | The system shall refuse a registration attempt for an event that has reached participant capacity. | PROPOSED |
| FR-REG-014 | The system shall refuse a registration attempt from a student who already holds a registration for the same event. | PROPOSED |
| FR-REG-015 | The system shall refuse to create a registration that omits any required field. | PROPOSED |
| FR-REG-016 | The system shall enforce uniqueness of registration on the pair of user and event at the storage layer, independent of application logic. | PROPOSED |
| FR-REG-017 | The system shall record on each registration the registering user, the event, the registration timestamp, the registration source, a confirmation reference, and a snapshot of the student's programme, year level, and organisation at registration time. | PROPOSED |
| FR-REG-018 | The system shall set registration status to `REGISTERED` on successful creation. | PROPOSED |
| FR-REG-019 | The system shall not create a registration with any status other than `REGISTERED` or `CANCELLED`. | PROPOSED |
| FR-REG-020 | The system shall generate a confirmation reference unique to the registration and display it to the student. | PROPOSED |

### 6.3 Confirmation

| ID | Requirement | Status |
|---|---|---|
| FR-REG-021 | The system shall create a registration-confirmation notification for the registering student immediately on successful registration. | PROPOSED |
| FR-REG-022 | The system shall display a confirmation screen showing the event, the registration status, the reference number, and the registration timestamp. | PROPOSED |
| FR-REG-023 | The system shall show the student their existing registration status when they attempt to register again, rather than only a rejection message. | PROPOSED |

### 6.4 Cancellation

| ID | Requirement | Status |
|---|---|---|
| FR-REG-024 | The system shall allow a Student to cancel their own registration until registration closes. | PROPOSED → OQ-12 |
| FR-REG-025 | The system shall set registration status to `CANCELLED`, and record the cancellation timestamp, reason, and cancelling user, when a cancellation occurs. | PROPOSED |
| FR-REG-026 | The system shall retain a cancelled registration record rather than deleting it. | PROPOSED |
| FR-REG-027 | The system shall refuse cancellation by a user other than the registering student, an authorised Event Officer, or an Administrator. | PROPOSED |
| FR-REG-028 | The system shall require a reason for any cancellation by an Event Officer or Administrator. | PROPOSED |
| FR-REG-029 | The system shall not allow the original registration timestamp or the registering source of a cancelled registration to be modified. | PROPOSED |

### 6.5 Registration management

| ID | Requirement | Status |
|---|---|---|
| FR-REG-030 | The system shall show the owning Event Officer the total registered count, available slots, and remaining capacity for an event they own. | PROPOSED |
| FR-REG-031 | The system shall show the owning Event Officer the participant list for an event they own, with registration status and registration timestamp per participant. | PROPOSED |
| FR-REG-032 | The system shall allow an owning Event Officer or Administrator to close registration for an event at any time before the event starts. | PROPOSED |
| FR-REG-033 | The system shall allow an owning Event Officer or Administrator to reopen registration for an event before the event starts, given a recorded reason. | PROPOSED |
| FR-REG-034 | The system shall refuse to reopen registration after the event start time. | PROPOSED |
| FR-REG-035 | The system shall allow an owning Event Officer or Administrator to register a named participant manually into an event they control, given a recorded reason. | PROPOSED → OQ-25 |
| FR-REG-036 | The system shall not allow an Attendance Staff user or an Approver user to create any registration. | PROPOSED |
| FR-REG-037 | The system shall refuse to reduce capacity below the count of existing registrations. | PROPOSED |
| FR-REG-038 | The system shall allow an owning Event Officer or Administrator to export the participant list for an event they control. | PROPOSED |
| FR-REG-039 | The system shall record in the audit trail every registration created, cancelled, or manually overridden, with actor, timestamp, and reason where applicable. | PROPOSED |
| FR-REG-040 | The system shall show a Student only their own registrations. | PROPOSED |

---

## 7. Notification (NOT) — PRIMARY FUNCTION 2

### 7.1 Model

| ID | Requirement | Status |
|---|---|---|
| FR-NOT-001 | The system shall treat the in-app notification centre as the authoritative record of notifications. | PROPOSED → OQ-13 |
| FR-NOT-002 | The system shall record the in-app state of a recipient record as one of `CREATED`, `READ`, or `ACKNOWLEDGED`. | PROPOSED |
| FR-NOT-003 | The system shall record the email state of a recipient record as one of `QUEUED`, `SENT`, `FAILED`, `BOUNCED`, or `NOT_REQUESTED`. | PROPOSED |
| FR-NOT-004 | The system shall not record a delivered state or an opened state for any notification. | PROPOSED |
| FR-NOT-005 | The system shall allow email delivery to fail without removing or downgrading the in-app notification record. | PROPOSED |
| FR-NOT-006 | The system shall require acknowledgement only for notifications of `IMPORTANT` priority. | PROPOSED → OQ-14 |
| FR-NOT-007 | The system shall record the acknowledging user, the notification, and the acknowledgement timestamp. | PROPOSED |
| FR-NOT-008 | The system shall refuse to record an acknowledgement for a notification that does not require one. | PROPOSED |
| FR-NOT-009 | The system shall refuse to record an acknowledgement before the notification has been read. | PROPOSED |

### 7.2 Composition and dispatch

| ID | Requirement | Status |
|---|---|---|
| FR-NOT-010 | The system shall allow an Event Officer to compose and dispatch notifications for an event they own. | PROPOSED |
| FR-NOT-011 | The system shall allow an Administrator to dispatch notifications for any event and system-wide announcements. | PROPOSED |
| FR-NOT-012 | The system shall not allow an Approver or Attendance Staff user to dispatch any notification. | PROPOSED |
| FR-NOT-013 | The system shall record the audience definition on the notification as issued, and shall not re-evaluate it afterwards. | PROPOSED |
| FR-NOT-014 | The system shall create one recipient record per target student and shall refuse to create a second recipient record for the same student and notification. | PROPOSED |
| FR-NOT-015 | The system shall record on each notification the type, title, body, priority, related event, originating announcement, creating user, and creation timestamp. | PROPOSED |
| FR-NOT-016 | The system shall refuse to dispatch a notification with an empty body. | PROPOSED |

### 7.3 Targeting

| ID | Requirement | Status |
|---|---|---|
| FR-NOT-017 | The system shall allow an authorised user to target all students. | PROPOSED |
| FR-NOT-018 | The system shall allow an authorised user to target students by programme. | PROPOSED |
| FR-NOT-019 | The system shall allow an authorised user to target students by year level. | PROPOSED |
| FR-NOT-020 | The system shall allow an authorised user to target members of an organisation or club. | PROPOSED |
| FR-NOT-021 | The system shall allow an authorised user to target only the registered participants of an event. | PROPOSED |
| FR-NOT-022 | The system shall allow a single notification to combine multiple audience criteria, evaluating them conjunctively. | PROPOSED |
| FR-NOT-023 | The system shall display the resolved recipient count before dispatch. | PROPOSED |
| FR-NOT-024 | The system shall refuse to dispatch a notification whose resolved audience contains no student. | PROPOSED |
| FR-NOT-025 | The system shall evaluate the audience against student programme, year level, and organisation held at dispatch time. | PROPOSED |

### 7.4 Notification types

| ID | Type | Trigger | Priority |
|---|---|---|---|
| FR-NOT-026 | New event | Event published | `IMPORTANT` |
| FR-NOT-027 | Registration open | Registration opened | `HIGH` |
| FR-NOT-028 | Registration reminder | Configurable lead time before the deadline | `NORMAL` |
| FR-NOT-029 | Registration confirmation | Successful registration | `NORMAL` |
| FR-NOT-030 | Event reminder | Lead time before event start | `HIGH` |
| FR-NOT-031 | Event update | Change to date, time, venue, mechanics, requirements, materials, dress code, or capacity | `HIGH` |
| FR-NOT-032 | Registration closing | Deadline approaching or registration closed | `NORMAL` |
| FR-NOT-033 | Event cancellation | Event cancelled | `IMPORTANT` |
| FR-NOT-034 | Important announcement | Administrator or Officer dispatches an announcement | `IMPORTANT` |
| FR-NOT-035 | Approval required | Event submitted or reaching an approval step | `IMPORTANT` |

**PROPOSED.** Ten types. Types not listed are deliberately absent because the lifecycle does not
produce them: there is no separate venue-change or schedule-change type, since a venue or date
change is an event update whose content identifies what changed.

### 7.5 Notification centre

| ID | Requirement | Status |
|---|---|---|
| FR-NOT-036 | The system shall show a Student the notifications addressed to them, most recent first. | PROPOSED |
| FR-NOT-037 | The system shall show the notification type, title, priority, related event, and dispatch timestamp per notification. | PROPOSED |
| FR-NOT-038 | The system shall show unread count per Student. | PROPOSED |
| FR-NOT-039 | The system shall allow a Student to open a notification and shall record the read timestamp. | PROPOSED |
| FR-NOT-040 | The system shall allow a Student to filter notifications by unread state and by related event. | PROPOSED |
| FR-NOT-041 | The system shall allow a Student to acknowledge a notification that requires acknowledgement. | PROPOSED |
| FR-NOT-042 | The system shall show a Student the notifications requiring acknowledgement that they have not yet acknowledged. | PROPOSED |
| FR-NOT-043 | The system shall not show a Student any notification addressed to another student. | PROPOSED |
| FR-NOT-044 | The system shall retain notification history for the configured retention period. | PROPOSED → OQ-15 |
| FR-NOT-045 | The system shall show an authorised Event Officer the dispatch state and read counts for notifications sent for an event they own. | PROPOSED |
| FR-NOT-046 | The system shall show an authorised Event Officer the acknowledgement state per recipient for notifications requiring acknowledgement. | PROPOSED |
| FR-NOT-047 | The system shall not expose individual email addresses or email failure detail to any user other than an Administrator. | PROPOSED |
| FR-NOT-048 | The system shall retry a failed email delivery a bounded number of times and shall mark it `BOUNCED` after exhaustion. | PROPOSED |

---

## 8. Attendance (ATT) — SUPPORTING FUNCTION

| ID | Requirement | Status |
|---|---|---|
| FR-ATT-001 | The system shall record attendance only for a participant who holds a registration with status `REGISTERED` for that event. | PROPOSED → OQ-21 |
| FR-ATT-002 | The system shall enforce uniqueness of attendance on the registration reference at the storage layer. | PROPOSED |
| FR-ATT-003 | The system shall refuse an attendance record for a registration with status `CANCELLED`. | PROPOSED |
| FR-ATT-004 | The system shall refuse an attendance record that does not reference a registration. | PROPOSED |
| FR-ATT-005 | The system shall record for each attendance entry: the registration, the user, the event, the presence indicator, the method, the recorder, the attendance window, and the timestamp. | PROPOSED |
| FR-ATT-006 | The system shall support attendance windows configured per event, with at least a pre-event window and an event window. | PROPOSED → OQ-22 |
| FR-ATT-007 | The system shall refuse attendance recorded outside a configured attendance window, except as a recorded correction or documented exception. | PROPOSED |
| FR-ATT-008 | The system shall provide a QR-based attendance method in which each QR resolves to one event and one registration reference. | PROPOSED |
| FR-ATT-009 | The system shall refuse a QR that is expired, belongs to a different event, or has already been used. | PROPOSED |
| FR-ATT-010 | The system shall provide a staff-assisted attendance method available at all times during which attendance may be recorded. | PROPOSED |
| FR-ATT-011 | The system shall require an Attendance Staff identity for every staff-assisted attendance record. | PROPOSED |
| FR-ATT-012 | The system shall require a reason for every staff-assisted attendance record of a participant not present at the scan point. | PROPOSED |
| FR-ATT-013 | The system shall show Attendance Staff the live attendance count for an event in progress. | PROPOSED |
| FR-ATT-014 | The system shall allow an Attendance Staff user or Administrator to correct an attendance record with a recorded reason. | PROPOSED → OQ-20 |
| FR-ATT-015 | The system shall retain the original value, corrector identity, timestamp, and reason for every attendance correction. | PROPOSED |
| FR-ATT-016 | The system shall not allow an Event Officer to correct attendance. | PROPOSED |
| FR-ATT-017 | The system shall show the owning Event Officer the attendance summary for an event they own, distinguishing registered, present, absent, and unregistered walk-ins. | PROPOSED |
| FR-ATT-018 | The system shall not create a registration as a consequence of an attendance scan. | PROPOSED |
| FR-ATT-019 | The system shall allow an Attendance Staff user to declare QR failure for an event, which makes the staff-assisted path the declared method and records the declaration. | PROPOSED |
| FR-ATT-020 | The system shall retain attendance records after a registration is cancelled or an event is cancelled. | PROPOSED |

---

## 9. Post-Event Records (POS)

| ID | Requirement | Status |
|---|---|---|
| FR-POS-001 | The system shall require attendance to be finalised before an event may be marked completed. | PROPOSED |
| FR-POS-002 | The system shall allow the owning Event Officer to complete a structured evaluation for an event they own. | PROPOSED |
| FR-POS-003 | The system shall record evaluation content in separate fields for: problems encountered, communication problems, registration problems, attendance problems, technical problems, scheduling problems, recommendations, and lessons learned. | PROPOSED |
| FR-POS-004 | The system shall permit exactly one evaluation per event. | PROPOSED |
| FR-POS-005 | The system shall retain the event record, participant list, attendance records, announcements, notifications, and change history permanently for a completed event. | PROPOSED → OQ-26..28 |
| FR-POS-006 | The system shall make a completed event read-only except for evaluation submission. | PROPOSED |
| FR-POS-007 | The system shall allow the owning Event Officer or Administrator to archive a completed event that has a submitted evaluation. | PROPOSED |
| FR-POS-008 | The system shall make an archived event read-only. | PROPOSED |
| FR-POS-009 | The system shall allow a user to search completed and archived events by title, type, date range, and organisation. | PROPOSED |
| FR-POS-010 | The system shall display the problems and recommendations from previous events to officers creating a new event of the same type. | PROPOSED |
| FR-POS-011 | The system shall not generate automated analysis, inference, or recommendations from evaluation content. | PROPOSED |

---

## 10. Reporting (RPT)

| ID | Requirement | Status |
|---|---|---|
| FR-RPT-001 | The system shall provide a Student with a report of their own registrations, including status and timestamps. | PROPOSED |
| FR-RPT-002 | The system shall provide any authorised user with a list of upcoming published events. | PROPOSED |
| FR-RPT-003 | The system shall provide an Event Officer or Administrator with a list of events currently open for registration. | PROPOSED |
| FR-RPT-004 | The system shall provide an owning Event Officer or Administrator with a registration summary per event: registered count, capacity, remaining slots, and cancellations. | PROPOSED |
| FR-RPT-005 | The system shall provide an owning Event Officer or Administrator with an attendance summary per event. | PROPOSED |
| FR-RPT-006 | The system shall provide an owning Event Officer or Administrator with a notification activity report per event: sent, read, acknowledged, email sent, email failed. | PROPOSED |
| FR-RPT-007 | The system shall provide an Approver with a list of events awaiting their decision. | PROPOSED |
| FR-RPT-008 | The system shall provide an Approver with the full decision history of chains they decided. | PROPOSED |
| FR-RPT-009 | The system shall provide an Event Officer or Administrator with a searchable event history. | PROPOSED |
| FR-RPT-010 | The system shall provide an Event Officer or Administrator with a report of recorded problems and recommendations across events. | PROPOSED |
| FR-RPT-011 | The system shall not provide trend analysis, dashboards, or predictive reporting. | PROPOSED |

---

## 11. Audit (AUD) — cross-cutting

| ID | Requirement | Status |
|---|---|---|
| FR-AUD-001 | The system shall record an audit entry for every action listed in the audit catalogue in [AUDIT-PLAN.md](AUDIT-PLAN.md). | PROPOSED |
| FR-AUD-002 | The system shall record for every audit entry the actor, action, entity type, entity identifier, and timestamp. | PROPOSED |
| FR-AUD-003 | The system shall record the previous value or state and the new value or state where a record changes state. | PROPOSED |
| FR-AUD-004 | The system shall record a reason for every privileged action that the system classifies as requiring one. | PROPOSED |
| FR-AUD-005 | The system shall provide no interface to modify or delete an audit entry. | PROPOSED |
| FR-AUD-006 | The system shall not delete an audited record when the record it references is deleted. | PROPOSED |
| FR-AUD-007 | The system shall allow only an Administrator to read and export the audit trail. | PROPOSED |
| FR-AUD-008 | The system shall allow an Event Officer to read only the audit entries for events they own. | PROPOSED |
| FR-AUD-009 | The system shall record system-initiated transitions with a system actor and no user identity. | PROPOSED |
| FR-AUD-010 | The system shall record an audit entry when an audit entry is read or exported. | PROPOSED |

---

## 12. Requirements Summary

| Module | Count | Primary |
|---|---|---|
| USR | 14 | No |
| EVT | 16 | No |
| APR | 17 | No |
| REG | 40 | **Yes — Function 1** |
| NOT | 48 | **Yes — Function 2** |
| ATT | 20 | No |
| POS | 11 | No |
| RPT | 11 | No |
| AUD | 10 | No |
| **Total** | **187** | |

Two modules carry 88 requirements, which is intentional. They are the two primary functions.

---

## 13. Test Scenarios

Functional verification is specified per requirement in
[TESTING-STRATEGY.md](TESTING-STRATEGY.md). Document-level validation checks:

| ID | Scenario | Expected |
|---|---|---|
| FRD-01 | Every requirement names an actor | Confirmed |
| FRD-02 | Every requirement uses `shall` | Confirmed |
| FRD-03 | Every identifier is unique | Confirmed |
| FRD-04 | Every requirement traces to a pain point or explicit driver | Verified in TRACEABILITY-MATRIX.md |
| FRD-05 | Every requirement is referenced by at least one test scenario | Verified in TESTING-STRATEGY.md |
| FRD-06 | No requirement introduces an out-of-scope capability | Confirmed |
| FRD-07 | No requirement uses `WAITLISTED`, or `ATTENDED`/`ABSENT` as a registration status | Confirmed |
| FRD-08 | No requirement claims a delivered or opened notification state | Confirmed |
| FRD-09 | Duplicate registration is prevented at both application and storage layer | FR-REG-014, FR-REG-016 |
| FRD-10 | Every assumption-dependent requirement is marked with its `OQ-NN` | Confirmed |

---

## 14. Completion Criteria

- All nine modules covered
- Every requirement testable and traceable
- Primary functions carry the requirement weight
- Locked decisions are encoded as requirements, not merely stated as prose

---

## 15. Exit Criteria

- OQ-07, OQ-11, OQ-12, and OQ-25 resolved, since each changes a REG requirement
- OQ-13 and OQ-14 resolved, since each changes a NOT requirement
- Council Secretary confirms no requirement reflects a capability the organisation will not use
- Requirements baselined and thereafter changed only through `PB-ENG-20 Change Management`

---

**Related documents:** [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) ·
[TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) ·
[TESTING-STRATEGY.md](TESTING-STRATEGY.md) ·
[CONVENTIONS.md](CONVENTIONS.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)