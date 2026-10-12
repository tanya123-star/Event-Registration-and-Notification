# Playbook 06 — Notification Publishing

**Playbook:** PB-06
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Compose and dispatch a notification to an identified audience, so that event information reaches
participants through a recorded channel rather than through an officer relay.

This is **Primary Function 2** of the Event Registration and Notification System.

---

## Scope

**In scope:** notification types, priority, composition, audience selection, dispatch, and the
resulting records.

**Out of scope:** targeting mechanics in depth, `PB-07 Notification Targeting`; reminders,
`PB-08 Event Reminder`; event-change notifications, `PB-09`.

---

## Trigger

An Event Officer or Administrator has information that participants need, and composes a
notification.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Composes and dispatches for events they own |
| Administrator | Composes and dispatches for any event, plus system-wide announcements |
| Approver | **Not an actor**, per SD-1 |
| Attendance Staff | **Not an actor** |
| System | Resolves the audience, creates recipient records, attempts email delivery |

---

## Preconditions

- The user holds the Event Officer role for the event, or is an Administrator
- The user is authenticated
- The event exists and is published, where the notification is event-scoped

---

## Main Workflow

1. Officer selects Compose notification
2. Officer selects the notification type, from the ten defined types
3. Officer selects the audience, per `PB-07`
4. System resolves the audience and displays the recipient count
5. Officer reviews the count and adjusts the audience if it is wrong
6. Officer sets the priority: `NORMAL`, `HIGH`, or `IMPORTANT`
7. System indicates whether acknowledgement is required, based on priority
8. Officer writes or edits the title and body
9. For an event-scoped notification, the system offers to prefill from the event record
10. System validates that the body is non-empty
11. Officer previews the message as the recipient will see it
12. Officer selects Dispatch
13. System records the notification with its audience definition frozen as issued
14. System creates one recipient record per target student, in-app state `CREATED`
15. System queues an email attempt per student with a valid address
16. System returns dispatch progress, since fan-out is a background task
17. System records `AUD-17`

---

## Notification Types

Only these ten exist. A notification outside this list has no distinct meaning and must not be
invented.

| Type | Trigger | Priority | Acknowledgement |
|---|---|---|---|
| New Event | Event published | `IMPORTANT` | No |
| Registration open | Registration opened | `HIGH` | No |
| Registration reminder | Lead time before the deadline | `NORMAL` | No |
| Registration confirmation | Successful registration | `NORMAL` | No |
| Event reminder | Lead time before event start | `HIGH` | No |
| Event update | A triggering field changed | `HIGH` | No |
| Registration closing | Deadline approaching, or window closed | `NORMAL` | No |
| Event cancellation | Event cancelled | `IMPORTANT` | **Yes** |
| Important announcement | Officer or Administrator dispatch | `IMPORTANT` | **Yes** |
| Approval required | Event submitted or reaching a step | `IMPORTANT` | **Yes** |

### Types deliberately absent

| Not created | Why |
|---|---|
| Venue change | An event update whose body states the new venue |
| Schedule change | An event update |
| Mechanics update | An event update |
| Registration rejected | Feedback belongs in the registration response, not an asynchronous message |
| Waitlist offer | There is no waitlist |

**A separate type per change kind would multiply the menu without adding information.** The change
category appears in the notification body.

---

## Priority and Acknowledgement

| Priority | Meaning | Acknowledgement |
|---|---|---|
| `NORMAL` | Informational | No |
| `HIGH` | Time-sensitive, action may be needed | No |
| `IMPORTANT` | Material, receipt matters | **Required** |

**Acknowledgement is required only for `IMPORTANT`**, per the locked decision and FR-NOT-006.

**Reserve `IMPORTANT` deliberately.** If every notification is `IMPORTANT`, acknowledgement becomes
a form that is clicked without reading, which destroys the value of recording it. `New Event` is
`IMPORTANT` by priority but does not require acknowledgement, because nothing is lost if a student
does not confirm receipt.

---

## Alternative Paths

### The officer sends to all students

Permitted, but the recipient count is displayed prominently first. A broadcast is occasionally
correct, for a general assembly, and rarely correct otherwise.

### The resolved audience is empty

Dispatch is refused, per FR-NOT-024. An empty result almost always means a criterion was
misspelled, and dispatching nothing silently looks identical to a delivery failure.

### Email delivery fails for some recipients

The in-app records exist regardless. Email state becomes `FAILED`, is retried a bounded number of
times, then becomes `BOUNCED`. **The in-app record is never removed or downgraded**, per FR-NOT-005.

### The notification is dispatched and then found to be wrong

The officer edits it with a correction, recorded as `AUD-18`, and dispatches a corrective
notification. In-app records are not deleted, because an audit of what was said matters as much as
what was intended.

### The officer wants to recall a notification

Not possible. Records are retained. A corrective notification is the mechanism. This protects the
record of what participants were actually told.

### An Approver wants to notify students

Refused. Approvers decide; they do not publish participant communications. SD-1.

### An officer wants to notify another officer's event

Refused. Notifications are scoped to owned events, plus system-wide announcements which are
Administrator-only.

### The officer wants to send to a specific named student

**Not supported.** Targeting is by audience criteria: all students, programme, year level,
organisation, club, or registered-only. Arbitrary individual targeting is a privacy surface with no
requirement behind it.

### The officer wants to send more than `IMPORTANT`

Not possible. `IMPORTANT` is the highest priority.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| User holds permission for this event | FR-NOT-010 | You cannot send notifications for this event |
| Approver or Attendance Staff | FR-NOT-012 | You cannot send notifications |
| Body non-empty | FR-NOT-016 | The notification body is required |
| Type is one of the ten | FR-NOT-026 to FR-NOT-035 | Select a notification type |
| Priority is one of three | FR-NOT-003 | Invalid priority |
| Audience resolves to at least one student | FR-NOT-024 | This audience matches no students |
| Recipient uniqueness | FR-NOT-014 | No duplicate recipients |

---

## Data Affected

| Entity | Effect |
|---|---|
| Notification | Created with type, title, body, priority, audience definition, creator, timestamp |
| NotificationRecipient | One record per target student, in-app `CREATED`, email `QUEUED` |
| AuditLog | `AUD-17` |

**The audience definition is frozen on the notification, not re-evaluated later.** If it were
re-evaluated on read, a notification sent to a first-year cohort in October would appear to have
gone to whoever that cohort contained in March. Audit could not reconstruct what was actually
dispatched.

---

## Notifications

This playbook is itself the notification. The dispatch record is the output.

The dispatcher sees: recipient count, dispatch timestamp, in-app state counts, and email state
counts. **Email state counts must never be presented as evidence that students were informed.**
Per [NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) section 2, email `SENT`
means the transport accepted the message and nothing more.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Notification dispatched | `AUD-17` | Author, type, priority, audience definition, recipient count, timestamp |
| Notification edited after dispatch | `AUD-18` | Author, reason, previous and new body |
| Corrective notification dispatched | `AUD-17` | As for the original |

**The audience definition is part of the audit entry**, not only a field on the notification. Six
months later, "who was this for" is the first question anyone asks.

---

## Failure Handling

**Failure:** the email transport is unavailable.
**Handling:** in-app records are created regardless. Email attempts are queued and retried per
NFR-AVAIL-006. The officer is not told that dispatch failed, because it did not.

**Failure:** dispatch is interrupted partway through fan-out.
**Handling:** in-app records created so far remain. The retry creates only the missing ones,
enforced by uniqueness on `(notification_id, user_id)`. A partially dispatched notification is
therefore recoverable without creating duplicates.

**Failure:** the officer selects the wrong audience.
**Handling:** the resolved count displayed at step 4 exists to catch this. If dispatched, a
corrective notification is issued. The original is retained.

**Failure:** the recipient count is unexpectedly large.
**Handling:** the officer cancels before dispatching. Once dispatched, recall is not available, so
the pre-dispatch count is the last safe point.

**Failure:** the body is empty.
**Handling:** refused. An empty notification is a mistake or an attack, and neither should produce a
record of having informed students.

**Failure:** a notification is dispatched to the wrong audience and contains participant names.
**Handling:** edit with correction, issue a corrective notice, and assess whether the exposure
constitutes a data-protection incident. The exposure is created by the sender, not the system, but
the system records who sent it.

---

## Completion Criteria

- A notification exists with a type, priority, body, and frozen audience definition
- One recipient record exists per target student
- Email attempts are queued where addresses are valid
- Dispatch progress was returned to the officer
- `AUD-17` is recorded

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBN-01 | Happy path | Officer dispatches a Registration open notification | Created, recipients at `CREATED`, email queued |
| PBN-02 | Happy path | Administrator dispatches an Important announcement | Created, acknowledgement required |
| PBN-03 | Happy path | Officer prefills from the event record | Body populated from event fields |
| PBN-04 | Invalid | Empty body | Refused, FR-NOT-016 |
| PBN-05 | Invalid | No type selected | Refused |
| PBN-06 | Invalid | Invalid priority | Refused |
| PBN-07 | Duplicate | Student matches two audience criteria | One recipient record, not two |
| PBN-08 | Duplicate | Same notification dispatched twice concurrently | One recipient set |
| PBN-09 | Boundary | Audience resolves to exactly one student | Permitted |
| PBN-10 | Boundary | Audience resolves to zero students | Refused, FR-NOT-024 |
| PBN-11 | Boundary | Organisation-wide dispatch | Permitted, background task, progress returned |
| PBN-12 | Unauthorized | Approver dispatches | Refused, FR-NOT-012 |
| PBN-13 | Unauthorized | Attendance Staff dispatches | Refused |
| PBN-14 | Unauthorized | Officer dispatches for an unowned event | Refused |
| PBN-15 | Unauthorized | Officer attempts a system-wide announcement | Refused, Administrator only |
| PBN-16 | Failure | Email transport unavailable | In-app created, email queued |
| PBN-17 | Failure | Some addresses bounce | Those become `BOUNCED`, in-app unaffected |
| PBN-18 | Failure | Dispatch interrupted mid-fan-out | Retry creates only missing recipients |
| PBN-19 | Failure | Notification dispatched then found wrong | Corrective notification, `AUD-18` |
| PBN-20 | Failure | Recall attempted | No path exists |
| PBN-21 | Unauthorized | Target a specific named student | No such capability exists |
| PBN-22 | Failure | `IMPORTANT` notification with acknowledgement disabled | Refused, acknowledgement is derived from priority |
| PBN-23 | Boundary | Dispatch at the moment of publication | Permitted |
| PBN-24 | Failure | Officer has no Event Officer role | Refused |

---

## Exit Criteria

- The notification is dispatched and its audience is recorded
- Recipients hold in-app records
- The officer can see dispatch progress and read counts
- `PB-07 Notification Targeting` governs audience design for future dispatches

---

**Related documents:** [PB-06 Notification Publishing](PB-06-NOTIFICATION-PUBLISHING.md) ·
[PB-07 Notification Targeting](PB-07-NOTIFICATION-TARGETING.md) ·
[PB-08 Event Reminder](PB-08-EVENT-REMINDER.md) ·
[PB-09 Event Update Notification](PB-09-EVENT-UPDATE-NOTIFICATION.md) ·
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) ·
[USER-ROLES.md](../../planning/USER-ROLES.md)