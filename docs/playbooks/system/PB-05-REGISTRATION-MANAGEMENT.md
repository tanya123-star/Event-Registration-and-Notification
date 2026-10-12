# Playbook 05 — Registration Management

**Playbook:** PB-05
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Let authorised personnel manage an event's registrations after they exist: view who is
registered, manage the registration window, correct errors, and handle participants who cannot
self-register.

Every action here changes participation records, so every action is authorised, reasoned where
required, and audited.

---

## Scope

**In scope:** participant lists, counts, capacity, closing and reopening registration, manual
registration, cancellation on a student's behalf, and export.

**Out of scope:** student self-registration, `PB-04`; attendance, `PB-10` and `PB-11`.

---

## Trigger

An event has published registrations and its owner needs to see or manage them.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Manages registrations for events they own |
| Administrator | Manages registrations for any event |
| Attendance Staff | **No registration authority**, per SD-2 |
| Approver | **No registration authority** |

---

## Preconditions

- The user holds the Event Officer role and owns the event, or is an Administrator
- The event is published
- Registrations exist

---

## Main Workflow — Viewing

1. Officer opens the event
2. System displays the registration summary: total registered, capacity, remaining slots,
   cancellations
3. System displays the participant list with each participant's name, registration status,
   registration timestamp, and source
4. Officer filters or searches the list as needed
5. Officer exports the list if required

---

## Main Workflow — Closing Registration

1. Officer opens the event
2. Officer selects Close registration
3. System displays the registered count and states the consequence
4. Officer confirms
5. System closes the registration window and records `AUD-11`
6. Students attempting to register are refused
7. Existing registrations are retained

---

## Main Workflow — Reopening Registration

1. Officer selects Reopen registration
2. Officer provides a reason, which is mandatory
3. System records the reason and `AUD-11`
4. System opens the window
5. A Registration open notification is dispatched to the target audience

**Reopening before the event start requires a reason; reopening after it is refused entirely.**
The reason is not administrative overhead. Reopening after an event is the most direct route to
backfilled attendance records, and requiring a reason makes it visible when it happens.

---

## Main Workflow — Manual Registration

1. Officer selects Register a participant
2. Officer identifies the student
3. System displays the student's eligibility and existing registrations
4. Officer provides a reason, which is mandatory
5. System runs the full validation sequence
6. System creates the registration with source `OFFICER`
7. System notifies the student
8. System records `AUD-12` with the reason

**Capacity applies identically.** A manual registration cannot exceed capacity.

---

## Main Workflow — Cancelling on a Student's Behalf

1. Officer locates the registration
2. Officer selects Cancel registration
3. Officer provides a reason, which is mandatory
4. System confirms, stating that the student will be notified
5. System sets status `CANCELLED`, retaining the record
6. System notifies the student at `IMPORTANT` priority
7. System records `AUD-13` with the reason

---

## Alternative Paths

### A student asks to be removed but cannot access the system

The officer cancels on their behalf, with a reason recording how the request was received. This is
the legitimate use of officer cancellation.

### A student registered twice due to a data import error

The storage constraint prevents a second registration, so this requires direct data correction.
Escalate to an Administrator, who performs a data fix with a reason and audit, per `PB-ENG-14
Database Changes`.

### An officer wants to edit a participant's details

**Not permitted.** The registration is a record of what happened. Only cancellation and
re-registration change status, and the registration timestamp and source are immutable, per
FR-REG-029.

### Capacity must be reduced

Permitted only if the new capacity remains at or above the registered count, per FR-REG-037. Reducing
below it is refused, because it invalidates registrations students made in reliance on the stated
capacity.

### A student's account is suspended after registering

The registration stands. Suspension stops future actions, not historical facts. If the
organisation's policy is that suspended students may not attend, the officer cancels with a reason,
which notifies them.

### An event is cancelled while registrations exist

Registrations are retained as `REGISTERED` and all registrants are notified at `IMPORTANT` priority
with acknowledgement required. They are not deleted, so the record of who intended to attend
survives.

### An officer wants to register a walk-in at the door

**Not this playbook.** That is attendance, per `PB-10` and `PB-11`. Attendance cannot create a
registration, per FR-ATT-018.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| User owns the event or is an Administrator | Authorisation matrix | You cannot manage registrations for this event |
| Attendance Staff role holder | FR-REG-036 | You cannot create registrations |
| Approver role holder | FR-REG-036 | You cannot create registrations |
| Reason present on manual registration | FR-REG-028 | A reason is required |
| Reason present on officer cancellation | FR-REG-028 | A reason is required |
| Reason present on reopen | FR-REG-033 | A reason is required |
| Reopen before event start | FR-REG-034 | Registration cannot be reopened after the event starts |
| Capacity not below registered count | FR-REG-037 | Capacity cannot be lower than the number registered |
| Full validation applies to manual registration | FR-REG-005 | Same refusals as a student registration |
| Registration timestamp immutable | FR-REG-029 | Cannot be changed |

---

## Data Affected

| Entity | Effect |
|---|---|
| Registration | Created with source `OFFICER`, or status changed to `CANCELLED` |
| Event | Registration window opened or closed, capacity possibly changed |
| Notification | Registration open, registration created, or cancellation notice |
| AuditLog | `AUD-11`, `AUD-12`, `AUD-13`, `AUD-22` on export |

---

## Notifications

| Action | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Registration closed | Target audience, registrants | `NORMAL` | No |
| Registration reopened | Target audience | `HIGH` | No |
| Participant manually registered | That student | `NORMAL` | No |
| Participant's registration cancelled by an officer | That student | `IMPORTANT` | **Yes** |
| Event cancelled | All registrants | `IMPORTANT` | **Yes** |

**An officer cancelling a student's registration without telling them would reproduce the core
failure in the interview.** Notification is mandatory, not a courtesy. The student must be able to
see that their registration is cancelled and why, otherwise they may travel to an event they are no
longer registered for.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Registration window closed | `AUD-11` | Actor, timestamp |
| Registration window reopened | `AUD-11` | Actor, reason, timestamp |
| Registration manually created | `AUD-12` | Officer, participant, event, reason, source `OFFICER` |
| Registration cancelled by officer | `AUD-13` | Officer, participant, previous and new state, reason |
| Capacity changed | `AUD-05` | Actor, previous and new value |
| Participant list exported | `AUD-22` | Actor, event, timestamp, recipient count |

**Export is audited because the exported list contains personal data.** A participant list is names,
programmes, and organisations for students who registered for an event. Recording who exported it
and when is what makes that export accountable.

---

## Failure Handling

**Failure:** an officer tries to cancel a registration without entering a reason.
**Handling:** refused. There is no way to submit the action without one.

**Failure:** capacity is reduced below the registered count.
**Handling:** refused. The officer must either raise the capacity or cancel participants in the same
operation, so no registration is invalidated without a deliberate act.

**Failure:** an officer bulk-cancels registrations by mistake.
**Handling:** the audit trail records each cancellation with the officer's identity, timestamp, and
reason. Restoration is an Administrator data fix with its own reason and audit. There is no
un-cancel shortcut, because that would permit silent rewriting of participation records.

**Failure:** the officer is no longer the event owner, for example after a handover.
**Handling:** an Administrator reassigns the event, or the new officer is granted the role. The
handover is audited.

**Failure:** export fails partway.
**Handling:** no partial export is delivered. The officer retries. Export is not recorded as
successful unless it completed.

**Failure:** a notification to a cancelled participant fails.
**Handling:** the cancellation stands. The student may see a cancelled status in their
registration list even if the notification did not arrive, which is why the status change is
visible to the student regardless of notification delivery.

---

## Completion Criteria

- The officer can see the complete participant list and counts
- The registration window is in the intended state
- Every administrative change carries a reason and an audit entry
- Affected students have been notified
- Exports are recorded

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBM-01 | Happy path | Officer views the participant list | List with status, timestamps, sources |
| PBM-02 | Happy path | Officer closes registration | Window closed, `AUD-11` |
| PBM-03 | Happy path | Officer reopens with a reason | Window open, notification dispatched |
| PBM-04 | Happy path | Officer manually registers a participant with a reason | Created with source `OFFICER`, student notified |
| PBM-05 | Happy path | Officer cancels a registration with a reason | `CANCELLED`, student notified, `AUD-13` |
| PBM-06 | Happy path | Officer exports the participant list | Export produced, `AUD-22` |
| PBM-07 | Invalid | Manual registration without a reason | Refused |
| PBM-08 | Invalid | Cancellation without a reason | Refused |
| PBM-09 | Invalid | Reopen without a reason | Refused |
| PBM-10 | Invalid | Capacity reduced below the registered count | Refused, FR-REG-037 |
| PBM-11 | Unauthorized | Officer manages an event they do not own | Refused |
| PBM-12 | Unauthorized | Attendance Staff creates a registration | Refused, SD-2 |
| PBM-13 | Unauthorized | Approver creates a registration | Refused |
| PBM-14 | Unauthorized | Officer attempts to edit a registration timestamp | Refused, FR-REG-029 |
| PBM-15 | Boundary | Reopen exactly at the event start time | Refused |
| PBM-16 | Boundary | Manual registration when the last slot remains | Succeeds |
| PBM-17 | Boundary | Manual registration when full | Refused, capacity applies |
| PBM-18 | Duplicate | Manual registration of an already-registered student | Refused |
| PBM-19 | Failure | Reopen after the event starts | Refused |
| PBM-20 | Failure | Bulk cancellation by mistake | Each entry audited; restoration via Administrator data fix |
| PBM-21 | Failure | Notification to a cancelled participant fails | Cancellation stands and is visible to the student |
| PBM-22 | Failure | Export fails partway | No partial export, no success record |
| PBM-23 | Failure | Officer loses event ownership mid-list | Access refused on the next request |
| PBM-24 | Failure | Registration created manually for an ineligible student | Refused by full validation |
| PBM-25 | Security | Direct request for an unowned participant list | Refused server-side |
| PBRG-26 | Boundary | Officer attempts to register a walk-in at the door | No path. That is attendance, not registration |

---

## Exit Criteria

- Registrations are visible, correct, and attributable
- Administrative actions are all reasoned and audited
- Students affected by administrative action have been notified
- Attendance may proceed, per `PB-10 QR Attendance`

---

**Related documents:** [PB-05 Registration Management](PB-05-REGISTRATION-MANAGEMENT.md) ·
[PB-04 Event Registration](PB-04-EVENT-REGISTRATION.md) ·
[PB-10 QR Attendance](PB-10-QR-ATTENDANCE.md) ·
[REGISTRATION-WORKFLOW.md](../../planning/REGISTRATION-WORKFLOW.md) ·
[USER-ROLES.md](../../planning/USER-ROLES.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md)