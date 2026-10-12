# Playbook 09 — Event Update Notification

**Playbook:** PB-09
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Inform participants when published event information changes, and preserve a record of what
changed and who changed it.

This playbook addresses Pain Points 10 and 11: information dissemination errors, and participants
arriving without knowing a schedule, venue, requirement, or material had changed.

---

## Scope

**In scope:** which changes notify, which do not, the update workflow, and change history.

**Out of scope:** authoring, `PB-01`; re-approval mechanics, `PB-02 Event Approval`; cancellation,
which is in `PB-03 Event Publishing` failure handling.

---

## Trigger

An Event Officer or Administrator edits a field on a published event.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Makes the change and initiates the update notification |
| Administrator | Same, for any event |
| Approver | Re-approves Class A changes. Not a notifier |
| System | Classifies the change, records history, dispatches |

---

## Which Changes Notify

**CONFIRMED** by the locked decision.

### Triggering changes

| Field | Class | Recipients |
|---|---|---|
| Date | A | Registrants, target audience |
| Start time | A | Registrants, target audience |
| End time | A | Registrants, target audience |
| Venue | A | Registrants, target audience |
| Mechanics | B | Registrants, target audience |
| Programme flow | B | Registrants, target audience |
| Requirements | B | Registrants, target audience |
| Materials needed | B | Registrants, target audience |
| Dress code | B | Registrants, target audience |
| Capacity | B | Registrants, target audience |
| Registration deadline | B | Registrants, target audience |

### Non-triggering changes

| Field | Class | Recipients | Rationale |
|---|---|---|---|
| Title | D, silent | Nobody | A title change does not alter what a participant must do |
| Description | C | Registrants only | A rewording does not change behaviour |
| Contact person | C | Registrants only | A change of contact is useful to registrants |
| Internal notes | D, silent | Nobody | Never visible |

**CONFIRMED.** Title-only and description-only changes do not trigger event-change notifications to
the target audience.

**Why description notifies registrants only.** If a description rewording notified the whole
audience, students would be trained to ignore event updates, which would defeat the mechanism when a
venue genuinely changes. Registrants are already committed and benefit from knowing the content
moved.

---

## Change Classes

| Class | Approval required | Notification | Fields |
|---|---|---|---|
| **A** | Yes, full chain | Yes, registrants and audience | Date, start time, end time, venue |
| **B** | No | Yes, registrants and audience | Mechanics, programme flow, requirements, materials, dress code, capacity, deadline |
| **C** | No | Registrants only | Description, contact person |
| **D** | No | None | Title, internal notes, attachment metadata |

**Why Class A requires re-approval.** Date and venue have external consequences. A new date requires
re-coordination with every office that cleared the original. A new venue may require security
re-clearance. The other fields do not alter the event's footprint or schedule.

> **OPEN QUESTION:** Which changes require a fresh approval rather than a notification? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-19.

---

## Main Workflow — Class B Change

1. Officer opens the published event
2. Officer edits a Class B field
3. System applies the change immediately
4. System records the previous and new values in the change history
5. System identifies affected users: registrants plus the target audience
6. System creates an Event update notification
7. System prefills the body: what changed, previous value, new value, when
8. System displays the recipient count
9. Officer dispatches
10. System queues email and records `AUD-17`

---

## Main Workflow — Class A Change

1. Officer opens the published event
2. Officer edits a Class A field
3. System records the previous and new values
4. System returns the event to `PENDING_APPROVAL` with an amendment step
5. **The event remains visible to registrants while awaiting re-approval**
6. Assigned approvers are notified at `IMPORTANT` priority
7. Approvers decide per `PB-02`
8. On approval, the Event update notification is dispatched
9. System records `AUD-07` and `AUD-17`

---

## Change Notification Content

**PROPOSED.** Every update notification states:

| Element | Content |
|---|---|
| What changed | The field in organisational terms, not the field name |
| Previous value | Present |
| New value | Present |
| When changed | Timestamp |
| Event | Title, new date, new venue |
| Action required | Only if the change affects what the participant must do |
| Registration status | Whether the change affects their registration |

**A change notification without both values is not useful.** The participant's question is "do I
need to do anything differently", and that cannot be answered without knowing what the value
changed from.

### Worked example: venue change

```
Event Update: IT Competition 2026

The venue has changed.

  Previous: AVR 1
  New:      Main Auditorium, 2nd Floor

Take the north stairs from the main entrance.

Your registration is unaffected.

Event:   IT Competition 2026
Date:    14 March 2026, 09:00 - 17:00
Venue:   Main Auditorium, 2nd Floor
```

It states what changed, both values, practical guidance, that the registration is unaffected, and
where to read more. It does not require acknowledgement, because no participant action is needed.

### Worked example: dress code change

```
Event Update: Org General Assembly

The dress code has changed.

  Previous: Formal attire
  New:      Business casual

No other details have changed.

Event: Org General Assembly
Date:  20 March 2026, 08:00 - 12:00
```

This one **does** require participants to change what they wear, so the action-required line is
present.

---

## Alternative Paths

### The officer changes the title only

Applied silently. No notification. The change appears in the event history for anyone who looks.

### The officer changes the description

Applied immediately. Registrants are notified. The target audience is not.

### The officer changes the venue and then reverts it

Two notifications are sent. The record shows both. **There is no way to retract a notification once
dispatched**, because students may already have acted on the first one.

### A Class A change is unapproved when the event starts

The officer and Administrator are notified, and the event is flagged in reporting as running with an
unapproved amendment. **The event proceeds.** Stopping it would strand registered students for a
change they did not make.

### The event has already started

Class A changes are refused after the event start. Class B and C changes are refused too, because
notifying participants of an event in progress is noise.

### An officer wants to change several fields at once

Permitted. Each field is classified independently, so a change touching both a Class A and a Class B
field requires re-approval **and** sends one notification listing all changes. **One notification per
edit operation, not per field**, because several simultaneous messages about one change would
confuse.

### An approver wants to change event content

Refused. Approvers have no edit rights, per the authorisation matrix.

### The change history needs reviewing

The history is participant-visible, so registrants can see what changed and when. This serves
NFR-USAB-007.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| User owns the event or is an Administrator | Authorisation matrix | You cannot change this event |
| Class A changes not permitted after event start | Lifecycle | This event has started |
| Class A changes create an amendment step | FR-APR-014 | Re-approval required |
| Capacity not reduced below registered count | FR-REG-037 | Capacity cannot be lower than the number registered |
| Notification body names the change | NFR-USAB-002 | The change must be described |
| Approvers cannot edit | Authorisation matrix | Approvers cannot modify the event |

---

## Data Affected

| Entity | Effect |
|---|---|
| Event | Field updated, status returned to `PENDING_APPROVAL` for Class A |
| ApprovalChain | Amendment step created for Class A |
| Notification | Event update created on approval |
| NotificationRecipient | One per affected student |
| AuditLog | `AUD-05` for the change, `AUD-07` for the amendment decision, `AUD-17` for dispatch |

---

## Notifications

| Change class | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| A, on approval | Registrants, target audience | `HIGH` | No |
| B | Registrants, target audience | `HIGH` | No |
| C | Registrants | `NORMAL` | No |
| D | None | — | — |
| A amendment requested | Assigned approvers | `IMPORTANT` | **Yes** |
| Class A unapproved at event start | Officer, Administrator | `HIGH` | No |

**No event update requires acknowledgement.** A venue or dress code change is important but requires
no confirmation from the recipient; requiring one would train students to click through. The
read count is the honest signal of reach.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Field changed | `AUD-05` | Actor, field, previous value, new value, timestamp |
| Amendment step created | `AUD-07` | Officer, step, affected fields |
| Update dispatched | `AUD-17` | Officer, event, fields changed, audience, count |

**The change history is the durable record of what participants were told and when.** It is
participant-visible and permanently retained.

---

## Failure Handling

**Failure:** a Class A change is made and the officer forgets it needs re-approval.
**Handling:** the system applies the re-approval requirement automatically as part of the change. The
officer does not need to remember.

**Failure:** a venue change is dispatched and the officer notices a typo in the new value.
**Handling:** edit with a correction and issue a second notification. The first is retained. Students
may have already travelled, so a silent correction is not an option.

**Failure:** a change notification is sent but the email fails.
**Handling:** in-app records exist. Students who use the system see it. The officer sees the email
failure count and the in-app read count separately.

**Failure:** a Class A amendment stalls in approval.
**Handling:** idle detection surfaces it, per `PB-02`. The event continues, flagged as running with
an unapproved amendment.

**Failure:** capacity is reduced and existing registrants now exceed capacity.
**Handling:** refused by FR-REG-037. The officer must raise the capacity or cancel participants in
the same operation, so no registration is invalidated without a deliberate act.

**Failure:** an officer changes a field intending it to be silent, but the change is Class B.
**Handling:** the notification is dispatched automatically or offered; the officer is told it will
notify. There is no suppression, because suppression would reintroduce the possibility of an
undisclosed change.

---

## Completion Criteria

- The change is applied or awaiting re-approval, per class
- Previous and new values are recorded in the change history
- Affected students have been notified where the class requires it
- Approvers have decided where the class requires it

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBU-01 | Happy path | Venue changed on a published event | Re-approval required, amendment step created |
| PBU-02 | Happy path | Venue change approved | Update notification to registrants and audience |
| PBU-03 | Happy path | Dress code changed | Applied, notification with action-required line |
| PBU-04 | Happy path | Materials changed | Applied, notification sent |
| PBU-05 | Happy path | Description changed | Applied, registrants notified only |
| PBU-06 | Invalid | Title changed | Applied, no notification |
| PBU-07 | Boundary | Capacity increased | Applied, notification sent |
| PBU-08 | Invalid | Capacity reduced below the registered count | Refused, FR-REG-037 |
| PBU-09 | Unauthorized | Approver edits the event | Refused |
| PBU-10 | Unauthorized | Officer edits an unowned event | Refused |
| PBU-11 | Invalid | Class A change after the event starts | Refused |
| PBU-12 | Failure | Class A amendment unapproved at event start | Officer and Administrator notified, event proceeds |
| PBU-13 | Duplicate | Venue changed then reverted | Two notifications, both retained |
| PBU-14 | Boundary | Multiple fields changed in one operation | One notification listing all changes |
| PBU-15 | Failure | Notification dispatched then found wrong | Corrective notification issued |
| PBU-16 | Failure | Notification email fails | In-app unaffected |
| PBU-17 | Failure | Amendment stalls in approval | Idle report entry, no auto-advance |
| PBU-18 | Boundary | Event with no registrants, Class B change | Notification to target audience only |
| PBU-19 | Failure | Notification dispatched with an empty body | Refused |
| PBU-20 | Boundary | Deadline changed to later | Applied, notification sent |
| PBU-21 | Boundary | Deadline changed to earlier, still future | Applied, notification sent |
| PBU-22 | Invalid | Deadline changed to before the event date | Refused, FR-EVT-007 |
| PBU-23 | Failure | Change made with no notification content | Refused |
| PBU-24 | Boundary | Class B change on an event in progress | Refused |

---

## Exit Criteria

- Participants hold the current event information
- The change history is complete and visible
- `PB-10 QR Attendance` follows for the event

---

**Related documents:** [PB-09 Event Update Notification](PB-09-EVENT-UPDATE-NOTIFICATION.md) ·
[PB-03 Event Publishing](PB-03-EVENT-PUBLISHING.md) ·
[PB-02 Event Approval](PB-02-EVENT-APPROVAL.md) ·
[PB-06 Notification Publishing](PB-06-NOTIFICATION-PUBLISHING.md) ·
[EVENT-LIFECYCLE.md](../../planning/EVENT-LIFECYCLE.md) ·
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)