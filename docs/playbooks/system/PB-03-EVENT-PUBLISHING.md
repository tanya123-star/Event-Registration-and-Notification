# Playbook 03 — Event Publishing

**Playbook:** PB-03
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Open the authoritative channel for an event. Publication is the moment ERNS becomes the channel of
record, replacing informal dissemination through Facebook pages, group chats, and officer relays.

This playbook addresses Pain Points 1, 3, and 4.

---

## Scope

**In scope:** verifying the approval gate, publishing, opening registration, and confirming the
notification dispatch.

**Out of scope:** authoring, `PB-01`; approval, `PB-02`; notification composition,
`PB-06 Notification Publishing`.

---

## Trigger

An event reaches `APPROVED` and its owner decides to publish it.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Publishes the event they own |
| Administrator | May publish any event, including under exception |
| Approver | **Not an actor.** Cannot publish, per SD-1 |
| System | Verifies the chain, dispatches notifications |

---

## Preconditions

- The event status is `APPROVED`
- Every required approval step is approved
- The publisher is not the user who granted the final approval
- The publisher holds the Event Officer role for this event, or is an Administrator
- The event passes all field validation

---

## Main Workflow

1. Officer opens the approved event
2. System displays the approval history, so the officer can see what was approved
3. Officer selects Publish
4. System re-verifies the approval chain at the moment of publication
5. System confirms the publisher is not the final approver
6. System re-validates every required field
7. System sets the event status to `PUBLISHED`
8. System records the publication timestamp
9. System creates the New Event notification for the target audience
10. System resolves the audience and displays the recipient count
11. System dispatches the notification
12. If registration is required and the registration window permits, the officer opens registration,
    or the system opens it automatically
13. System records the publication in the audit trail

---

## Alternative Paths

### The event requires no registration

Skip steps 9 to 12. Students see the event and may attend without registering. Attendance will
capture only walk-ins, which the officer should understand before publishing.

### Registration opens at a later date

The event is published but registration is not yet open. Students see the event and the state
"registration has not opened yet", per FR-REG-003. A Registration open notification is sent when
registration opens.

### The event cannot obtain approval in time

**Conditional on OQ-05.** The Administrator publishes under exception:

1. Administrator selects Publish under exception
2. Administrator provides a justification, which is mandatory
3. System records the justification and the fact that approval was bypassed
4. System publishes
5. A participant-facing notice states that the event was published under exception

This is a documented exception with an audit trail, not a silent bypass. If the Council rejects the
exception path, this branch does not exist and late events are held.

### The officer wants to publish a cancelled event

Refused. `CANCELLED` is terminal.

### The officer has left the organisation

An Administrator publishes. The audit trail records the Administrator as the actor, which is
intentional.

### The officer wants to withdraw a published event

There is no unpublishing. The officer cancels the event, which notifies every registrant. See
`PB-09`.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Status is `APPROVED` | FR-APR-011 | This event has not been approved |
| Chain complete at publication time | FR-APR-011 | The approval chain is not complete |
| Publisher is not the final approver | FR-APR-012 | You approved this event and cannot publish it |
| Publisher holds permission | Authorisation matrix | You cannot publish this event |
| Required fields still valid | FR-EVT-005 | This event is missing required information |
| Registration settings valid where required | FR-EVT-003, FR-EVT-007, FR-EVT-009 | Registration cannot open with these settings |
| Exception justification present where applicable | SD-4 | A justification is required |

**The chain is re-verified rather than trusting the status field.** A status of `APPROVED` is a
summary. If a step was revoked or the record was altered, the status may be stale. Publication must
check the underlying chain.

---

## Data Affected

| Entity | Effect |
|---|---|
| Event | Status `APPROVED` to `PUBLISHED`, `published_at` recorded |
| Event | Registration window opened, where applicable |
| Notification | New Event notification created |
| NotificationRecipient | One record per target student, in-app state `CREATED` |
| AuditLog | `AUD-10` publication, `AUD-11` if registration opened |

---

## Notifications

| Notification | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| New Event | Target audience | `IMPORTANT` | No |
| Registration open | Target audience | `HIGH` | No, sent when registration opens rather than at publication |

**New Event is `IMPORTANT` priority but does not require acknowledgement.** It is material enough
to prioritise, but nothing is lost if a student does not confirm receipt, so requiring acknowledgement
would add friction without value.

The notification content is assembled from the event record: title, date, time, venue, mechanics,
requirements, materials, dress code, and the registration state. It does not require the officer to
rewrite the event details in a message, because a duplicated detail set is a contradiction waiting
to happen.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Event published | `AUD-10` | Publisher, timestamp, chain state verified at publication |
| Published under exception | `AUD-10` | Administrator, justification, approval status at publication |
| Registration opened | `AUD-11` | Actor, timestamp |

---

## Failure Handling

**Failure:** the chain is incomplete but the status reads `APPROVED`.
**Handling:** publication is refused. This is the specific reason the chain is re-verified rather
than trusting the status field.

**Failure:** the publisher is the final approver.
**Handling:** refused, per SD-1. A different authorised user publishes, or the event waits.

**Failure:** notification dispatch fails after publication succeeds.
**Handling:** the event is published and the in-app records are created regardless. The email layer
fails independently and is retried. **Publication is never rolled back because a notification
failed.** The event's existence and its announcement are separate facts.

**Failure:** a required field was emptied between approval and publication.
**Handling:** refused, listing the field. The officer restores it and republishes. If the field is a
Class A field, re-approval is required.

**Failure:** publication succeeds and the officer immediately notices a wrong detail.
**Handling:** the officer edits it. Editing a Class A field returns the event to re-approval. A
Class B or C field applies immediately and notifies per `PB-09`.

**Failure:** the officer publishes and regrets it.
**Handling:** cancel the event. Every registrant is notified. This is why publication is a
deliberate act with confirmation, per NFR-USAB-009.

---

## Completion Criteria

- The event status is `PUBLISHED` with a publication timestamp
- Students in the target audience can see the event
- A New Event notification exists for every target student
- Registration is open, closed, or scheduled, as configured
- The publication is recorded in the audit trail with the chain state verified

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBP-01 | Happy path | Fully approved event published | `PUBLISHED`, notification dispatched |
| PBP-02 | Happy path | Event published with registration opening immediately | Registration open, second notification |
| PBP-03 | Happy path | Event published with registration opening later | Registration not yet open, state displayed |
| PBP-04 | Happy path | Non-registration event published | Published, no registration notification |
| PBP-05 | Invalid input | Publish attempted while `SUBMITTED` | Refused, not approved |
| PBP-06 | Invalid input | Publish attempted with a required field empty | Refused, field listed |
| PBP-07 | Unauthorized | Final approver publishes | Refused, SD-1 |
| PBP-08 | Unauthorized | Non-owner officer publishes | Refused |
| PBP-09 | Unauthorized | Approver publishes | Refused |
| PBP-10 | Unauthorized | Student publishes | Refused |
| PBP-11 | Failure | Chain incomplete but status reads `APPROVED` | Refused, chain re-verified |
| PBP-12 | Failure | Notification dispatch fails | Event remains published, email retried |
| PBP-13 | Boundary | Target audience resolves to zero students | Event published, notification refused with a count of zero |
| PBP-14 | Boundary | Publish at the exact approval completion moment | Permitted |
| PBP-15 | Failure | Administrator publishes under exception with justification | Permitted, audited |
| PBP-16 | Failure | Administrator publishes under exception without justification | Refused |
| PBP-17 | Duplicate | Publish attempted twice | Second refused, already published |
| PBP-18 | Failure | Publish attempted on a cancelled event | Refused, terminal |
| PBP-19 | Security | Direct request bypassing the interface | Refused server-side |
| PBP-20 | Failure | Immediate regret after publication | Cancel available, registrants notified |

---

## Exit Criteria

- The event is published and visible to its audience
- The New Event notification is dispatched
- `PB-07 Notification Targeting` governs the audience composition
- `PB-04 Event Registration` governs what students do next

---

**Related documents:** [PB-03 Event Publishing](PB-03-EVENT-PUBLISHING.md) ·
[PB-02 Event Approval](PB-02-EVENT-APPROVAL.md) ·
[PB-04 Event Registration](PB-04-EVENT-REGISTRATION.md) ·
[PB-06 Notification Publishing](PB-06-NOTIFICATION-PUBLISHING.md) ·
[EVENT-LIFECYCLE.md](../../planning/EVENT-LIFECYCLE.md) ·
[APPROVAL-WORKFLOW.md](../../planning/APPROVAL-WORKFLOW.md) ·
[USER-ROLES.md](../../planning/USER-ROLES.md)