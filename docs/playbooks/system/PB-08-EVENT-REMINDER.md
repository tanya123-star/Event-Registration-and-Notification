# Playbook 08 — Event Reminder

**Playbook:** PB-08
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Remind participants about an upcoming event or a closing registration deadline, so that participants
arrive knowing the schedule, venue, requirements, and materials.

This playbook addresses Pain Point 11: participants arriving without knowing requirements,
responsibilities, materials, or schedule.

---

## Scope

**In scope:** event reminders, registration reminders, lead time, and reminder content.

**Out of scope:** general notification composition, `PB-06`; change notifications,
`PB-09 Event Update Notification`.

---

## Trigger

A published event approaches its date, or its registration deadline approaches.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Sends the reminder, or confirms an automatic one |
| Administrator | May send reminders for any event |
| System | **PROPOSED.** May dispatch automatically at the configured lead time |

---

## Preconditions

- The event is published
- The event has not been cancelled or completed
- For an event reminder, the event start time is approaching
- For a registration reminder, the registration deadline is approaching

---

## Lead Times

**PROPOSED**, pending **OQ-16**.

| Reminder | Default lead time | Rationale |
|---|---|---|
| Event reminder | 24 hours before start | Close enough to be relevant, early enough to act on |
| Event reminder where registration is required | 1 hour before start | A late reminder catches the last-minute attendee |
| Registration reminder | 48 hours before the deadline | Enough time to register without urgency |
| Final registration reminder | 6 hours before the deadline | For events where capacity is limited |

> **OPEN QUESTION:** What lead time should event reminders use? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-16.

**PROPOSED.** Lead time is configurable per event, defaulting to the values above. An officer
running a week-long event may want a different lead time.

---

## Main Workflow — Event Reminder

1. Officer opens the event
2. System displays the reminder status: sent or not sent, and when
3. Officer selects Send event reminder
4. Officer selects the audience, per `PB-07`
5. System resolves the audience and displays the count
6. System prefills the reminder body from the event record: title, date, time, venue, mechanics,
   programme flow, requirements, materials, dress code, contact person
7. Officer reviews and edits as needed
8. Officer dispatches
9. System creates recipient records and queues email
10. System records `AUD-17`

---

## Main Workflow — Registration Reminder

1. Officer selects Send registration reminder
2. System prefills the body with the event and the registration deadline
3. Officer reviews and dispatches
4. If capacity is limited, system includes remaining slots
5. System records `AUD-17`

---

## PROPOSED Automated Reminders

**ASSUMPTION AS-12.** Manual dispatch is acceptable in the MVP. Automated scheduling is a COULD
HAVE item per [MVP.md](../../planning/MVP.md).

When implemented, the system:

1. Evaluates published events at the configured lead times
2. Checks whether a reminder of that type has already been sent for the event
3. Creates the reminder using the event record content
4. Dispatches to the audience recommended for that type
5. Records the dispatch so it does not repeat

**Already-sent detection is what prevents duplicates.** A reminder sent manually must suppress the
automatic one for the same type.

---

## Reminder Content

**PROPOSED.** A reminder carries the full event detail, not a summary.

| Element | Purpose |
|---|---|
| Event title | Identification |
| Date and time, including start and end | The schedule |
| Venue | Where to go |
| Mechanics and programme flow | What will happen |
| Requirements | What they must do or bring as required |
| Materials needed | PP-11 directly |
| Dress code | PP-11 directly |
| Contact person | Where to ask |
| Registration state and reference, where relevant | Whether they are registered |
| What changed since publication, if anything | PP-10 |

**A reminder that says only "Event tomorrow" reproduces the original problem.** The participant
needed the requirements and materials, and a reminder is the last moment they will look.

---

## Reminder Frequency

**PROPOSED.** One event reminder and one registration reminder per event by default. Officers may
send more.

| Number | Assessment |
|---|---|
| One event reminder | Sufficient. Recommends 24 hours |
| Two event reminders | Acceptable where capacity is limited |
| Three or more | Discouraged. The channel loses value |

**Multiple reminders train students to ignore them.** ERNS's advantage over a group chat is that a
notification is deliberate. Sending three of everything removes that advantage.

**PROPOSED.** The system displays how many reminders of each type have been sent for an event, so an
officer can see whether they are over-sending.

---

## Alternative Paths

### The event requires no registration

Only the event reminder applies. The registration reminder is not offered.

### The event has passed

No reminder is offered. The event is `COMPLETED` or `CANCELLED`.

### The event was cancelled after the reminder was sent

The cancellation notification supersedes it. See `PB-09`. Students receive both records, which is
correct: they were reminded of an event that was then cancelled.

### An officer wants to remind only registrants

Permitted. Registered-only targeting, per `PB-07`. Sensible for a large event where only committed
attendees need the reminder.

### An officer sends a manual reminder and automated reminders exist

The automatic reminder of that type is suppressed for the event.

### A student never reads the reminder

The in-app record shows `CREATED`, not `READ`. **ERNS records that the reminder was sent and not
that it was read, and cannot report otherwise.** The read count is visible to the officer, which is
the honest position: no information about how many participants will arrive.

### An officer wants to use a reminder for an announcement

Wrong playbook. That is an Important announcement, per `PB-06`.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Event is published | Lifecycle | This event is not published |
| Event is not cancelled or completed | Lifecycle | This event is {status} |
| Reminder body prefilled | NFR-USAB-003 | — |
| Audience resolves non-empty | FR-NOT-024 | This audience matches no students |
| Lead time respected | OQ-16 | Too early to send. The recommended time is {time} |
| Duplicate prevention | FR-NOT-014 | A {type} reminder was already sent at {time} |

**PROPOSED.** The lead-time check warns rather than blocks. An officer sending an additional
reminder early should be permitted, since officers know things the system does not.

---

## Data Affected

| Entity | Effect |
|---|---|
| Notification | Reminder created with type and prefilled body |
| NotificationRecipient | One per target student |
| Event | Reminder-sent state recorded |
| AuditLog | `AUD-17` |

---

## Notifications

| Reminder | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Event reminder | Registrants plus target audience | `HIGH` | No |
| Registration reminder | Target audience, minus registrants | `NORMAL` | No |

**Neither requires acknowledgement.** A reminder asks for action, and requiring a confirmation tap
adds friction without producing useful information. If a student does not read a reminder, the
officer can see the unread count, which is the honest signal.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Reminder dispatched | `AUD-17` | Officer, type, event, audience, count, timestamp |

---

## Failure Handling

**Failure:** the reminder is not sent because the officer forgot.
**Handling:** the reminder-sent status is visible on the event, so the omission is visible. Automated
reminders remove this failure entirely, which is why they are a COULD HAVE rather than a MUST.
**This is the weakest point in the MVP.**

**Failure:** the email fails but in-app succeeds.
**Handling:** the officer sees in-app read counts and email failure counts separately. **Neither is
presented as proof of receipt.** The separation is intentional.

**Failure:** too many reminders are sent.
**Handling:** the officer can see the count of reminders already sent. Reducing them is a matter of
practice, not system enforcement.

**Failure:** the event details changed after the reminder was prepared.
**Handling:** if a triggering field changed, `PB-09` sends an event update. The reminder is not
resent automatically, because that would duplicate the update.

**Failure:** the reminder is sent to the wrong audience.
**Handling:** the pre-dispatch count is the safeguard. If dispatched, a corrective notification is
issued.

---

## Completion Criteria

- A reminder notification exists for the event
- It carries the full event detail
- Recipients hold in-app records
- The officer can see whether a reminder was sent and how many

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBRM-01 | Happy path | Officer sends an event reminder | Created, prefilled from the event record |
| PBRM-02 | Happy path | Officer sends a registration reminder | Created, deadline and slots included |
| PBRM-03 | Happy path | Officer targets registrants only | Correct recipients |
| PBRM-04 | Invalid | Reminder for an unpublished event | Refused |
| PBRM-05 | Invalid | Reminder for a cancelled event | Refused |
| PBRM-06 | Invalid | Reminder for a completed event | Refused |
| PBRM-07 | Duplicate | Same reminder type sent twice | Permitted, count displayed; automated version suppressed |
| PBRM-08 | Boundary | Reminder exactly at the lead time | Permitted |
| PBRM-09 | Boundary | Reminder well before the lead time | Warning shown, dispatch permitted |
| PBRM-10 | Boundary | Event requiring no registration | Registration reminder not offered |
| PBRM-11 | Failure | Automated reminder follows a manual one | Suppressed |
| PBRM-12 | Failure | Officer never sends the reminder | Status visible as not sent |
| PBRM-13 | Failure | Email fails | In-app unaffected, counts shown separately |
| PBRM-14 | Unauthorized | Approver sends a reminder | Refused |
| PBRM-15 | Unauthorized | Officer sends a reminder for an unowned event | Refused |
| PBRM-16 | Failure | Event changed after the reminder | Event update sent instead, reminder not resent |
| PBRM-17 | Boundary | Three reminders sent for one event | Displayed count makes over-sending visible |
| PBRM-18 | Failure | Reminder dispatched to the wrong audience | Corrective notification issued |
| PBRM-19 | Boundary | Registered-only audience resolves to zero | Refused |
| PBRM-20 | Failure | Reminder sent after the event | Refused |

---

## Exit Criteria

- Participants hold the event detail in their notification centre before the event
- The officer can see whether reminders were sent
- `PB-10 QR Attendance` follows

---

**Related documents:** [PB-08 Event Reminder](PB-08-EVENT-REMINDER.md) ·
[PB-06 Notification Publishing](PB-06-NOTIFICATION-PUBLISHING.md) ·
[PB-09 Event Update Notification](PB-09-EVENT-UPDATE-NOTIFICATION.md) ·
[PB-10 QR Attendance](PB-10-QR-ATTENDANCE.md) ·
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) ·
[MVP.md](../../planning/MVP.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)