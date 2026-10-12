# Notification Workflow

**Document:** ERNS-NOTWF
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Specify Notification, the second of ERNS's two primary functions: how event information is
delivered to an addressable audience, what ERNS can and cannot record about delivery, how
notifications are targeted, and how participants are informed when an event changes.

This document is where ERNS is most careful about what it claims. A system whose value is
trustworthy records must not report a delivery state it cannot measure.

---

## Scope

**In scope:** the notification model, states, types, targeting, dispatch, the notification centre,
event-change notifications, and acknowledgement.

**Out of scope:** registration, in [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md); email
transport configuration, in `PB-ENG-15 Environment Management`.

---

## 1. Locked Decisions

**CONFIRMED.** The in-app notification centre is the source of truth.

**CONFIRMED.** In-app states: `CREATED`, `READ`, `ACKNOWLEDGED`.

**CONFIRMED.** Email states: `QUEUED`, `SENT`, `FAILED`, `BOUNCED`.

**CONFIRMED.** `Delivered` and `Opened` MUST NOT exist as notification states.

**CONFIRMED.** Acknowledgement is required only for `IMPORTANT` priority notifications.

**CONFIRMED.** Targeting may use programme, year level, organisation, club, registered-only, and
all students where justified.

**CONFIRMED.** Notification-triggering event changes: date/time, venue, mechanics, requirements,
materials, dress code, capacity.

**CONFIRMED.** Title-only and description-only changes do not trigger event-change notifications.

---

## 2. Why `Delivered` and `Opened` Are Excluded

This is the most important design decision in the module, so the reasoning is recorded.

**The interview problem.** The organisation reported that information is not always received or
read, and could not tell why. They need the system to make the difference visible.

**The temptation.** Model `Delivered` and `Opened` so that "sent" and "read" look like a complete
pipeline.

**Why it would be a false claim.**

| State | Why it is not measurable |
|---|---|
| `Delivered` | SMTP acceptance means the receiving server accepted the message. It does not mean it reached an inbox, passed a filter, or was seen. Calling that "delivered" is a redefinition in the system's favour |
| `Opened` | Open tracking relies on a tracking pixel or link rewriting. Most mail clients and many corporate and mobile clients block images and strip tracking parameters. A reported rate would be a systematic undercount, not a measurement |

**What ERNS records instead.**

| Layer | Meaning | Measurable |
|---|---|---|
| In-app `CREATED` | A notification record exists for this student | Yes. Certain |
| In-app `READ` | The student opened it in the system | Yes. Certain |
| In-app `ACKNOWLEDGED` | The student confirmed receipt of an important notice | Yes. Certain |
| Email `QUEUED` | A send was attempted | Yes |
| Email `SENT` | The transport accepted the message | Yes, and no more than that |
| Email `FAILED` | The attempt failed, with a recorded reason | Yes |
| Email `BOUNCED` | Repeated attempts failed; the address is presumed unusable | Yes |

**The honest framing.** In-app state is authoritative and complete. Email state describes only
that an attempt was made and what the transport reported. An ERNS report must never present email
send counts as evidence that students were informed.

**ASSUMPTION AS-03.** Email cannot reliably prove delivery or opening. Validate by observing
whether the school's mail environment strips tracking pixels; the expected outcome is that it
does.

> **OPEN QUESTION:** What notification mechanism is officially supported? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-13. **BLOCKING.**

---

## 3. Notification Model

### 3.1 Two entities

| Entity | Holds | Meaning |
|---|---|---|
| `Notification` | The authored message and the audience definition as issued | One message |
| `NotificationRecipient` | Per-student delivery state | One student's copy |

This separation is what makes the model work: the same authored notification has one definition
and many per-student states.

### 3.2 Two delivery layers

```
              ┌─────────────────────────────────────────┐
Authored ──►  │ Notification                             │
              │  type, title, body, priority,            │
              │  audience definition (as issued)         │
              └──────────────────┬──────────────────────┘
                                 │ dispatch
                                 ▼
              ┌─────────────────────────────────────────┐
              │ NotificationRecipient  (one per student) │
              │  in_app_state : CREATED → READ → ACK    │
              │  email_state : QUEUED → SENT            │
              │                 → FAILED → BOUNCED     │
              └─────────────────────────────────────────┘
```

**The in-app record is created first and unconditionally. The email attempt is a separate,
optional layer.** Per **FR-NOT-005**, an email failure never removes or downgrades the in-app
record.

### 3.3 Why the audience definition is frozen

**FR-NOT-013** requires the audience definition to be stored as issued and never re-evaluated.

If the audience were re-evaluated on read, a notification sent to a first-year cohort in October
would appear to have been sent to whoever that cohort contained in March. Audit could not
reconstruct what was actually dispatched. **NFR-INTEG-012** and **DATA-19** cover this.

---

## 4. States

### 4.1 In-app states — the source of truth

| State | Set when | May advance to |
|---|---|---|
| `CREATED` | At dispatch | `READ` |
| `READ` | Student opens the notification | `ACKNOWLEDGED`, if required |
| `ACKNOWLEDGED` | Student acknowledges, only if `requires_acknowledgement` | Terminal |

**Rules.**

- **FR-NOT-008** — refuse acknowledgement where acknowledgement is not required
- **FR-NOT-009** — refuse acknowledgement before the notification has been read
- States never regress

**Why acknowledgement requires a prior read.** It makes the action a considered one rather than
an accidental tap, and it keeps the audit record unambiguous: a student who acknowledged
demonstrably opened the notification first.

### 4.2 Email states

| State | Meaning |
|---|---|
| `QUEUED` | Attempt scheduled or in progress |
| `SENT` | Transport accepted the message. **Not** proof of receipt |
| `FAILED` | Attempt failed. Reason recorded, address not marked unusable |
| `BOUNCED` | Repeated attempts failed. Address presumed unusable |
| `NOT_REQUESTED` | No email attempt was made for this recipient |

**FR-NOT-048** requires bounded retries before `BOUNCED`.

**No `DELIVERED`. No `OPENED`. No `CLICKED`.** See section 2.

### 4.3 Priority and acknowledgement

| Priority | Meaning | Acknowledgement |
|---|---|---|
| `NORMAL` | Informational | Not required |
| `HIGH` | Time-sensitive. Action may be needed | Not required |
| `IMPORTANT` | Material. Confirmation of receipt matters | **Required** |

**FR-NOT-006** requires acknowledgement only for `IMPORTANT`.

> **OPEN QUESTION:** Should important announcements require acknowledgement? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-14.

**PROPOSED.** `IMPORTANT` should be reserved for events published, events cancelled, approval
requests, and major announcements. If everything is `IMPORTANT`, acknowledgement becomes a form
that is clicked without reading, which destroys the value of recording it at all.

---

## 5. Notification Types

Ten types. Ten is not arbitrary; each corresponds to a distinct lifecycle transition or user
action that a participant needs to know about.

| # | Type | Trigger | Priority | Recipients | Ack |
|---|---|---|---|---|---|
| 1 | New event | Event published | `IMPORTANT` | Target audience | Yes |
| 2 | Registration open | Registration opened | `HIGH` | Target audience | No |
| 3 | Registration reminder | Lead time before deadline | `NORMAL` | Target audience, non-registrants | No |
| 4 | Registration confirmation | Successful registration | `NORMAL` | The registering student | No |
| 5 | Event reminder | Lead time before start | `HIGH` | Registrants, target audience | No |
| 6 | Event update | Notification-triggering change | `HIGH` | Registrants, target audience | No |
| 7 | Registration closing | Deadline approaching, or registration closed | `NORMAL` | Target audience, registrants | No |
| 8 | Event cancellation | Event cancelled | `IMPORTANT` | Registrants, target audience | Yes |
| 9 | Important announcement | Officer or Administrator dispatch | `IMPORTANT` | Selected audience | Yes |
| 10 | Approval required | Event submitted or reaching a step | `IMPORTANT` | Assigned approver | Yes |

### Types deliberately not created

| Not created | Why |
|---|---|
| Venue change | A venue change is an event update whose body states the new venue. A separate type would duplicate FR-NOT-031 |
| Schedule change | A date or time change is an event update. Same reasoning |
| Mechanics update | An event update. Same reasoning |
| Registration rejected | Feedback belongs in the registration response, not in an asynchronous notification |
| Waitlist offer | There is no waitlist |
| Password reset | Not an ERNS concern |

**A separate type per change would multiply the notification menu without adding information.**
The change category appears in the notification body instead.

---

## 6. Targeting

### 6.1 Audience types

| Type | Requirement | Definition |
|---|---|---|
| All students | FR-NOT-017 | Every active Student |
| Programme | FR-NOT-018 | Students whose `programme` matches |
| Year level | FR-NOT-019 | Students whose `year_level` matches |
| Organisation | FR-NOT-020 | Students whose primary org matches |
| Club | FR-NOT-020 | Same mechanism as organisation |
| Registered-only | FR-NOT-021 | Students holding a `REGISTERED` registration for the event |

### 6.2 Combination

**FR-NOT-022** permits combining criteria, evaluated conjunctively. `Programme = BSIT` **and**
`Year level = 3` selects third-year BSIT students.

### 6.3 Evaluation

**FR-NOT-025** evaluates against `programme`, `year_level`, and `org_id` held at dispatch time.

**Why targeting is the answer to PP-01 and PP-04.** The interview's example was an IT competition
targeting BSIT and BSCS students. Sending that to the entire student body reproduces the noise
problem that caused students to stop reading. Targeting is the mechanism that makes the channel
worth opening.

### 6.4 Pre-dispatch verification

**FR-NOT-023** — display the resolved recipient count before dispatch.
**FR-NOT-024** — refuse to dispatch to an empty audience.

The count check is a practical safeguard. An empty result almost always means a criterion was
misspelled, and dispatching nothing silently looks identical to a delivery failure.

**PROPOSED.** Show a breakdown by criterion for multi-criteria targeting, so an officer can see
which filter removed most recipients.

> **OPEN QUESTION:** Confirm the exact audience criteria names, particularly whether programme
> naming matches the school's official designations.

### 6.5 Registered-only is the correct default for event-change notices

Venue, schedule, or materials changes matter to people who committed to attend. Targeting them at
the whole audience adds noise without adding relevance. Registered-only is used for event
updates and reminders; the full target audience is used for initial publication.

---

## 7. Dispatch

### 7.1 Steps

1. Author selects a notification type
2. Author selects the audience
3. System resolves the audience and displays the recipient count
4. Author sets priority; the system derives whether acknowledgement is required
5. Author writes the title and body
6. System validates that the body is non-empty
7. Author reviews the resolved content and recipients
8. Author dispatches
9. System creates the `Notification` with the frozen audience definition
10. System creates one `NotificationRecipient` per resolved student, in-app state `CREATED`
11. System queues email attempts where the address is valid
12. System records the dispatch in the audit trail
13. System returns dispatch progress, since fan-out is a background task

**FR-NOT-016** requires a non-empty body.
**NFR-PERF-004** and **NFR-PERF-005** require that fan-out does not block the author's session.

### 7.2 Authority

| Actor | May dispatch | Scope |
|---|---|---|
| Administrator | Yes | Any event, plus system-wide announcements |
| Event Officer | Yes | Events they own |
| Approver | **No** | — |
| Attendance Staff | **No** | — |
| Student | **No** | — |

**FR-NOT-012** enforces the prohibitions. Segregation of duty SD-1 means an approver does not
publish participant communications.

### 7.3 Duplicate recipient prevention

**FR-NOT-014** — one recipient record per student per notification, enforced by uniqueness on
`(notification_id, user_id)`.

A student matching both the programme criterion and the registered-only criterion must receive one
notification, not two. The audience resolution returns a distinct student set.

---

## 8. Event-Change Notifications

### 8.1 Triggering changes

**CONFIRMED.** These changes trigger an event-change notification:

- Date or time
- Venue
- Mechanics
- Requirements
- Materials
- Dress code
- Capacity

### 8.2 Non-triggering changes

**CONFIRMED.** Title-only and description-only changes do not trigger an event-change
notification.

Description changes notify registrants only, per class C in
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 6.

**Why description is non-triggering for the audience.** A rewording of the description does not
change what a participant must do. Notifying the whole audience about a reworded paragraph trains
students to ignore event updates, which would defeat the mechanism when a venue genuinely changes.

### 8.3 Change notification workflow

1. Officer or Administrator edits a triggering field on a published event
2. System classifies the change by class, per [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 6
3. For class A, the event returns to `PENDING_APPROVAL` with an amendment step
4. System records previous and new values in the event change history
5. On approval, system creates an event-update notification
6. System resolves recipients: registrants plus target audience
7. System dispatches, priority `HIGH`
8. The change appears in the participant-visible event history

**FR-NOT-031** defines the notification.
**NFR-USAB-007** requires the visible change history.

### 8.4 Notification content for a change

| Element | Content |
|---|---|
| What changed | The field name in organisational terms, not the field identifier |
| Previous value | Present |
| New value | Present |
| When changed | Timestamp |
| Event | Title, date, venue |
| Action required | Only if the change affects what the participant must do |

**A change notification without the previous and new values is not useful.** The participant needs
to know what they must now do differently.

### 8.5 Venue change, worked example

```
Event Update: IT Competition 2026

Venue has changed.

  Previous: AVR 1
  New:      Auditorium

This change takes effect immediately. Your registration is unaffected.

Event: IT Competition 2026
Date:  14 March 2026, 09:00
```

The notification states what changed, both values, that the registration is unaffected, and where
to read more. It does not require acknowledgement, because no participant action is required.

---

## 9. Notification Centre

### 9.1 Student view

**CONFIRMED** requirements **FR-NOT-036** to **FR-NOT-044**:

- Notifications addressed to the student, most recent first
- Type, title, priority, related event, dispatch timestamp
- Unread count
- Read state transition on open
- Filter by unread state and by related event
- Acknowledgement where required
- A list of outstanding acknowledgements
- Retention per the configured period

**FR-NOT-043** — a student never sees another student's notification.

### 9.2 Officer view

**FR-NOT-045** — dispatch state and read counts for events they own.
**FR-NOT-046** — per-recipient acknowledgement state for notifications requiring
acknowledgement.

**FR-NOT-047** — email addresses and per-recipient email failure detail are restricted to
Administrators.

**Why this restriction exists.** A list of bounced email addresses is a list of student contact
information, and it is not operationally useful to an officer. Aggregate read counts answer the
operational question. Per-recipient email failure is a data-quality matter for the Administrator.

> **OPEN QUESTION:** Should officers see per-recipient email state, or aggregate read counts only?
> See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-40.

### 9.3 Empty states

**NFR-USAB-002** applies. When there are no notifications, the centre states that plainly rather
than rendering an unexplained blank area. When there are no outstanding acknowledgements, that
state is not shown at all, rather than shown empty.

---

## 10. Notification Reporting

Per **FR-NOT-045**, **FR-NOT-046**, and **FR-RPT-006**:

| Metric | Available to |
|---|---|
| Recipients resolved | Owner, Administrator |
| In-app `CREATED` count | Owner, Administrator |
| In-app `READ` count | Owner, Administrator |
| In-app `ACKNOWLEDGED` count | Owner, Administrator |
| Acknowledgement outstanding | Owner, Administrator |
| Email `SENT` count | Owner, Administrator |
| Email failure count, aggregate only | Owner, Administrator |
| Email addresses and failure detail | Administrator only |

**The last two rows are the guard.** An aggregate failure count tells an officer "some addresses
are broken, escalate to IT". A list of broken addresses tells them whose addresses are broken.
The first is operationally sufficient.

---

## 11. Audit Requirements

| Action | Audit class |
|---|---|
| Notification composed and dispatched | `AUD-17` |
| Audience definition recorded | Part of `AUD-17` |
| Notification edited after dispatch | `AUD-18` |
| Notification cancelled or recalled | `AUD-18`, with reason |
| Acknowledgement recorded | `AUD-19` |
| Notification centre read | Not audited. Reading is not a state change |

Catalogue in [AUDIT-PLAN.md](AUDIT-PLAN.md).

**Reading is deliberately not audited.** Auditing every read would make the audit trail unusable
and would record student browsing behaviour without a requirement behind it.

---

## 12. Failure Handling

**Failure:** the email transport is unavailable.
**Handling:** in-app records are created regardless. Email attempts are queued and retried per
**NFR-AVAIL-006**. Officers are not told that dispatch failed, because dispatch did not fail.

**Failure:** dispatch is interrupted partway through fan-out.
**Handling:** the operation is transactional at the notification level. The in-app records created
so far remain, and the retry creates only the missing ones, enforced by uniqueness on
`(notification_id, user_id)`. A partially dispatched notification is therefore recoverable.

**Failure:** a notification is dispatched and then found to be incorrect.
**Handling:** the notification is edited with a correction, recorded as `AUD-18`, and a
corrective notification is dispatched. In-app records are not deleted, because an audit of what
was said matters as much as what was intended. **FR-NOT-013** means the audience remains
reconstructable.

**Failure:** an acknowledgement is required but the recipient never opens the notification.
**Handling:** the outstanding acknowledgement is visible to officers. ERNS can show that someone
has not confirmed receipt. It cannot make them confirm.

---

## 13. Completion Criteria

- The in-app centre is the source of truth in both implementation and reporting
- No `Delivered`, `Opened`, or `Clicked` state exists anywhere
- Acknowledgement is enforced only for `IMPORTANT`
- Targeting supports the confirmed audience types and displays a resolved count
- Event-change notifications trigger on exactly the confirmed field list
- Title and description changes do not trigger audience notifications
- Email failure never invalidates an in-app record

---

## 14. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| NOT-01 | Officer dispatches to a programme | Only matching students receive it |
| NOT-02 | Officer dispatches registered-only | Only registrants receive it |
| NOT-03 | Multi-criteria targeting | Conjunctive, correct set |
| NOT-04 | A student matches two criteria | One recipient record, not two |
| NOT-05 | Dispatch to an audience resolving to zero students | Refused, FR-NOT-024 |
| NOT-06 | Recipients displayed before dispatch | Count shown |
| NOT-07 | Empty notification body | Refused, FR-NOT-016 |
| NOT-08 | Approver dispatches a notification | Refused, FR-NOT-012 |
| NOT-09 | Attendance Staff dispatches a notification | Refused |
| NOT-10 | Officer dispatches for an event they do not own | Refused |
| NOT-11 | `IMPORTANT` notification dispatched | Acknowledgement required |
| NOT-12 | Acknowledgement of a non-`IMPORTANT` notification | Refused, FR-NOT-008 |
| NOT-13 | Acknowledgement before reading | Refused, FR-NOT-009 |
| NOT-14 | Acknowledgement after reading | Accepted, timestamp recorded |
| NOT-15 | Student reads a notification | In-app state `READ`, timestamp recorded |
| NOT-16 | Email delivery fails | In-app unaffected, email state `FAILED` |
| NOT-17 | Repeated email failures | Retries bounded, then `BOUNCED` |
| NOT-18 | Officer views notification activity | Read and acknowledgement counts visible |
| NOT-19 | Officer attempts to view email addresses | Refused, FR-NOT-047 |
| NOT-20 | Student views another student's notification | Refused, FR-NOT-043 |
| NOT-21 | Venue changed on a published event | Event-update notification to registrants and audience |
| NOT-22 | Title changed | No event-change notification |
| NOT-23 | Description changed | Registrants notified, audience not |
| NOT-24 | Notification dispatched, then roster changed | Original audience definition used |
| NOT-25 | Class A change awaiting approval | Notification sent only after approval |
| NOT-26 | Event cancelled | `IMPORTANT` notification to registrants and audience |
| NOT-27 | Dispatch interrupted partway | Retry creates only missing recipients |
| NOT-28 | Student opens their notification centre with no notifications | Clear empty state, no blank area |
| NOT-29 | Any attempt to set an `OPENED` or `DELIVERED` state | No such field or path exists |
| NOT-30 | Reminder dispatched before event start | Correct recipients, correct lead time |

---

## 15. Exit Criteria

- OQ-13, OQ-14, OQ-15, OQ-16, and OQ-40 resolved
- Council Secretary confirms the ten notification types match what officers actually send
- Confirmation that no reporting view presents email send counts as proof of receipt

---

**Related documents:** [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) ·
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[DATA-MODEL.md](DATA-MODEL.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[Test scenarios](TESTING-STRATEGY.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)