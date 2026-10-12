# Event Lifecycle

**Document:** ERNS-LIFE
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Define the formal lifecycle of an ERNS event, every legal transition between statuses, and the
actor, conditions, and audit event for each transition.

This document is the state authority. The approval workflow, registration workflow, and
notification workflow each operate on a subset of these transitions and reference this document
rather than restating it.

---

## Scope

**In scope:** the twelve event statuses, the transition matrix, guards on each transition, and
which transitions trigger participant notification.

**Out of scope:** the approval decision procedure itself, documented in
[APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md); the notification content rules, documented in
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md).

---

## 1. Locked Decision

**CONFIRMED.** ERNS events progress through the statuses defined in this document.

**CONFIRMED.** Only APPROVED events are eligible for official publication, unless a documented
exception exists.

**CONFIRMED.** `WAITLISTED` is not an ERNS event or registration status. Registration capacity
is a hard cap.

---

## 2. Statuses

### 2.1 Authoring statuses

| Status | Meaning | Visible to students |
|---|---|---|
| `DRAFT` | Being authored. Not submitted. | No |
| `SUBMITTED` | Submitted into an approval chain. Awaiting first decision. | No |
| `UNDER_REVIEW` | An approver has opened and is assessing the submission. | No |
| `FOR_REVISION` | Returned to the officer with comments. | No |
| `PENDING_APPROVAL` | Prior steps approved; awaiting a later step in the chain. | No |
| `APPROVED` | All required steps approved. Eligible for publication. | No |
| `REJECTED` | Terminated by an approver. Terminal for this submission. | No |
| `PUBLISHED` | Officially announced. Visible and, if applicable, registrable. | Yes |

### 2.2 Operational statuses

| State | Kind | Meaning | Visible to students |
|---|---|---|---|
| `REGISTRATION_OPEN` | **Boolean-backed conceptual state** | `registration_open = true`. Published and accepting registrations. | Yes |
| `REGISTRATION_CLOSED` | **Boolean-backed conceptual state** | `registration_open = false`. Published, registration not accepting. Registrants retained. | Yes |
| `ONGOING` | Lifecycle status | Event date has arrived. | Yes |
| `COMPLETED` | Lifecycle status | Event concluded; attendance finalised. | Yes |
| `CANCELLED` | Lifecycle status | Event called off. Terminal. | Yes, with notice |
| `ARCHIVED` | Lifecycle status | Retained read-only after retention period. | Read-only |

**Twelve lifecycle statuses are stored.** The two registration states above are carried by the
single `registration_open` Boolean attribute, per the note below and
[DATA-MODEL.md](DATA-MODEL.md) section 2.5. Section 3's *"Why Twelve and Not Fourteen"* refers to
the stored status domain, not to the conceptual state list. Transitions `T-11`, `T-12` and `T-13`
act on that Boolean, not on `status`.

**PROPOSED.** `REGISTRATION_OPEN` and `REGISTRATION_CLOSED` are stored as boolean attributes on
the event rather than as separate lifecycle statuses, because they are independently toggled and
a participant may register before `PUBLISHED` is left behind. This keeps the status graph
smaller and avoids illegal states such as a completed event that is somehow still open.
Recorded here so the storage decision is visible; the conceptual entity list in
[DATA-MODEL.md](DATA-MODEL.md) is unchanged.

**CONFIRMED.** `CANCELLED` and `ARCHIVED` are terminal. `REJECTED` is terminal for a submission
but a rejected event may be rewritten into a new `DRAFT` rather than revived, so the event
record keeps its history.

---

## 3. Why Twelve and Not Fourteen

The interview's linear approval gate could be modelled with four states. Twelve are retained
because the interview specifically reported that events stall between offices and are lost
between meetings.

Collapsing `SUBMITTED`, `UNDER_REVIEW`, and `PENDING_APPROVAL` into one `IN_APPROVAL` state
would make it impossible to answer "which office is this event sitting at?", which is precisely
the operational question the current process cannot answer.

---

## 4. Transition Matrix

| # | Current | Action | Next | Actor | Conditions | Audit |
|---|---|---|---|---|---|---|
| T-01 | — | Create event | `DRAFT` | Event Officer | Officer holds `EVT` permission | `AUD-05` |
| T-02 | `DRAFT` | Edit draft | `DRAFT` | Owner Officer | No submitted approval active | `AUD-05` |
| T-03 | `DRAFT` | Submit for approval | `SUBMITTED` | Owner Officer | Required event fields complete; approval chain configured | `AUD-06` |
| T-04 | `SUBMITTED` | Begin review | `UNDER_REVIEW` | Assigned Approver | Approver assigned to current step | `AUD-07` |
| T-05 | `UNDER_REVIEW` | Request revision | `FOR_REVISION` | Assigned Approver | Comments provided | `AUD-08` |
| T-06 | `FOR_REVISION` | Resubmit | `SUBMITTED` | Owner Officer | Revision comments addressed | `AUD-06` |
| T-07 | `UNDER_REVIEW` | Reject | `REJECTED` | Assigned Approver | Reason provided | `AUD-09` |
| T-08 | `UNDER_REVIEW` | Approve step (intermediate) | `PENDING_APPROVAL` | Assigned Approver | No other blocking step | `AUD-07` |
| T-09 | `PENDING_APPROVAL` | Approve final step | `APPROVED` | Assigned Approver | All required steps approved | `AUD-07` |
| T-10 | `APPROVED` | Publish | `PUBLISHED` | Event Officer or Admin | Chain re-verified at publication; publisher is not the final approver | `AUD-10` |
| T-11 | `PUBLISHED` | Open registration | `REGISTRATION_OPEN` | Owner Officer | Registration required; capacity and deadline set | `AUD-11` |
| T-12 | `REGISTRATION_OPEN` | Close registration | `REGISTRATION_CLOSED` | Owner Officer | — | `AUD-11` |
| T-13 | `REGISTRATION_CLOSED` | Reopen registration | `REGISTRATION_OPEN` | Owner Officer | Before event start; reason provided | `AUD-11` |
| T-14 | `PUBLISHED` or `REGISTRATION_CLOSED` | Date arrives | `ONGOING` | System | Event start time reached | System-initiated, no entry |
| T-15 | `ONGOING` | Finalise attendance | `ONGOING` | Attendance Staff or Admin | Counts confirmed; discrepancy explained | `AUD-23` |
| T-16 | `ONGOING` | Conclude | `COMPLETED` | Owner Officer | Attendance finalised | `AUD-20` |
| T-17 | `ONGOING` | Cancel event | `CANCELLED` | Event Officer or Admin | Reason provided | `AUD-20` |
| T-18 | `PUBLISHED` | Cancel event | `CANCELLED` | Event Officer or Admin | Reason provided | `AUD-20` |
| T-19 | `REGISTRATION_OPEN` | Cancel event | `CANCELLED` | Event Officer or Admin | Reason provided; registrants notified | `AUD-20` |
| T-20 | `COMPLETED` | Archive event | `ARCHIVED` | Owner Officer or Admin | Evaluation submitted | `AUD-20` |

### Transition counts not permitted

- `APPROVED` to `FOR_REVISION` — an approved event changed after approval follows the
  change-control path in section 7, not a reverse approval transition
- `PUBLISHED` to `DRAFT` — no unpublishing; cancellation is the reversible-direction action
- `COMPLETED` to `ONGOING` — completed events do not re-open
- Any transition from `CANCELLED` or `ARCHIVED` — terminal
- `REJECTED` to `PENDING_APPROVAL` — rejected events restart as `DRAFT`

---

## 5. Guard Conditions by Transition

### T-03 Submit

**CONFIRMED.** The system encourages complete event information before publication. Submission
requires, at minimum:

- Title
- Description
- Event type
- Date, start time, end time
- Venue
- Organizer
- Target audience
- Registration required flag
- If registration required: registration start, registration deadline, capacity
- Contact person

**PROPOSED.** Mechanics, program flow, requirements, materials, and dress code are required
when event type is not `GENERAL_ASSEMBLY`. A general assembly carries no mechanics, so requiring
them would be noise.

See section 6 for the field-level edit rules.

### T-10 Publish

**CONFIRMED.** Publication requires an `APPROVED` record. The system MUST verify the approval
chain was complete at the moment of publication, not merely that a status field reads APPROVED.

**CONFIRMED.** The publisher MUST NOT be the user who granted the final approval, enforcing SD-1
in [USER-ROLES.md](USER-ROLES.md).

**PROPOSED.** An exception path exists for events where approval authority cannot be obtained
inside the event lead time. The exception requires Administrator role, a recorded justification,
an audit event, and a participant-facing notice that the event was published under exception.
This is a documented exception, not a bypass.

> **OPEN QUESTION:** Does the organisation accept any exception path at all, or are late events
> simply held? See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-05.

### T-13 Reopen registration

**PROPOSED.** Reopening after the event start time is prohibited. Reopening before start
requires a reason, which is audited, because it is the action most likely to be abused to
backfill attendance.

### T-17 to T-19 Cancel

**CONFIRMED.** Cancellation requires a reason. The system MUST notify every registrant, since
Pain Point 11 in [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) is participants arriving without
knowing an event changed.

Cancellation MUST NOT delete registrations. Registrations are retained as `CANCELLED` so the
record of who had intended to attend survives.

---

## 6. Field Edit Rules After Publication

### 6.1 Edit classes

| Class | Fields | Approval required | Notification |
|---|---|---|---|
| **A. Re-approval required** | Date, start time, end time, venue | Yes, for the approval chain that covered the original event | Yes, to registrants and target audience |
| **B. Notify only** | Mechanics, program flow, requirements, materials, dress code, capacity, registration deadline | No | Yes, to registrants and target audience |
| **C. Notify registrants only** | Description, contact person | No | Yes, to registrants only |
| **D. Silent** | Internal notes, attachment metadata | No | No |

**CONFIRMED.** Title-only or description-only changes do NOT automatically trigger
event-change notifications. Description changes notify registrants only, per class C.

**CONFIRMED.** The following changes trigger event-change notifications: date/time, venue,
mechanics, requirements, materials, dress code, capacity.

**PROPOSED.** Class A re-approval is limited to date/time and venue because these are the fields
with external consequences: date requires re-coordination with offices and attendees, and venue
change may require security re-clearance. Mechanics and materials changes do not re-clear, since
they do not alter the event's footprint or schedule.

> **OPEN QUESTION:** Which changes require a fresh approval rather than a notification? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-19.

### 6.2 Change record

**CONFIRMED.** Every post-publication change MUST record who made the change and when. Class A
changes additionally record the previous and new value.

**PROPOSED.** All Class A and B changes appear in an event history timeline visible to
registrants, so a participant can see what changed and when, which directly serves Pain Points 9
and 10 regarding incomplete understanding of event mechanics.

---

## 7. Post-Publication Change Procedure

1. Officer or Administrator edits a Class A or B field.
2. System computes the change class and determines recipients: registrants plus target audience
   for A and B, registrants only for C.
3. For Class A, the event returns to `PENDING_APPROVAL` with the amendment recorded as a
   separate step. The event remains visible to registrants while awaiting re-approval.
4. System records previous and new values in the change history.
5. On approval, system dispatches event-change notifications from
   [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md).
6. If the event start time passes while the amendment is unapproved, the system notifies the
   owner and the Administrator that the event is running with an unapproved amendment.

Step 6 is **PROPOSED**. It prevents a silent drift between what was approved and what is
happening.

---

## 8. Time-Driven Transitions

**PROPOSED.** Three transitions are system-driven rather than user-driven:

| Trigger | Transition |
|---|---|
| Registration deadline passes | Registration closes automatically, from `REGISTRATION_OPEN` to `REGISTRATION_CLOSED` |
| Event start time arrives | `PUBLISHED` or `REGISTRATION_CLOSED` to `ONGOING` |
| Attendance window closes | Attendance becomes read-only pending T-16 |

**ASSUMPTION.** A scheduled process can evaluate time-based transitions reliably.

> **OPEN QUESTION:** What lead time should the reminder notification use before an event? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-16.

---

## 9. Data Affected

| Entity | Effect |
|---|---|
| Event | Status, field values, registration-open flag |
| ApprovalChain, ApprovalStep | Chain instance, step decisions, amendment step |
| Registration | Retained on cancellation; never deleted by lifecycle action |
| Attendance | Becomes read-only when the window closes |
| EventAttachment | Added, replaced, or removed by owner |
| EventEvaluation | Created at T-20 |
| Notification | Dispatched per transition, see [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) |
| AuditLog | Written per matrix column 7 |

---

## 10. Notifications

| Transition | Recipients | Priority | Requires acknowledgement |
|---|---|---|---|
| T-03 Submit | Assigned Approver | `IMPORTANT` | Yes |
| T-05 Revision | Owner Officer | `IMPORTANT` | Yes |
| T-07 Reject | Owner Officer | `IMPORTANT` | Yes |
| T-09 Approve final | Owner Officer | `NORMAL` | No |
| T-10 Publish | Target audience | `IMPORTANT` | No |
| T-11 Registration open | Target audience | `HIGH` | No |
| T-12 Registration closed | Target audience, registrants | `NORMAL` | No |
| T-13 Registration reopened | Target audience | `HIGH` | No |
| T-17 to T-19 Cancel | Registrants, target audience | `IMPORTANT` | Yes |
| Class A or B change | Registrants, target audience | `HIGH` | No |
| Class C change | Registrants | `NORMAL` | No |

Acknowledgement applies only to `IMPORTANT` priority, per the locked decision in
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md).

---

## 11. Audit Requirements

Every transition in the matrix writes an audit event. Recording rules, retention, and the
`AUD-NN` catalogue are defined in [AUDIT-PLAN.md](AUDIT-PLAN.md).

Time-driven transitions write audit events without a user actor, recorded as system-initiated.
This is why column 7 of T-14 reads "System-initiated, no entry": the transition is observable from
timestamps, and a separate catalogue entry would add noise without adding traceability.

---

## 12. Failure Handling

**Failure:** an approver never acts, and the event is stuck between offices.
**Handling:** the system surfaces events idle beyond a configurable threshold in the pending
approvals report and notifies the owner and the Administrator. It MUST NOT auto-approve. Auto-
approval would defeat the approval gate entirely.

**Failure:** the officer edits the event while it is `UNDER_REVIEW`.
**Handling:** edits are blocked while any approval step is active. The officer must request
revision or withdrawal. Blocking is preferred because an approver must be assessing a stable
document.

**Failure:** publication is attempted on an event whose chain is incomplete but whose status
reads `APPROVED` due to a data inconsistency.
**Handling:** publication re-verifies the chain at the moment of publication and refuses. Status
alone is not trusted as proof of approval.

**Failure:** a Class A amendment is unapproved when the event starts.
**Handling:** per section 7 step 6, notify owner and Administrator; the event continues but is
flagged in reporting as running with an unapproved amendment.

---

## 13. Completion Criteria

- Every status has at least one entry transition and a defined exit
- Every transition names one actor, conditions, and an audit class
- Illegal transitions are explicitly enumerated
- Time-driven transitions are separated from user-driven
- Notification behaviour is defined per transition

---

## 14. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| LIFE-01 | Submit with required fields complete | Status becomes `SUBMITTED`, `AUD-06` written |
| LIFE-02 | Submit with required fields missing | Rejected, field list returned, no status change |
| LIFE-03 | Officer edits event while `UNDER_REVIEW` | Rejected |
| LIFE-04 | Approver requests revision with no comments | Rejected, comments mandatory |
| LIFE-05 | Approver rejects with reason | Status `REJECTED`, owner notified, `AUD-09` |
| LIFE-06 | Intermediate step approved | Status `PENDING_APPROVAL`, chain advances |
| LIFE-07 | Final step approved | Status `APPROVED`, `AUD-07` |
| LIFE-08 | Publish without a complete chain | Rejected |
| LIFE-09 | Publish where publisher is the final approver | Rejected, SD-1 |
| LIFE-10 | Publish under documented exception | Allowed for Administrator with justification, `AUD-10` |
| LIFE-11 | Registration deadline passes | Auto-closes registration |
| LIFE-12 | Event start time arrives | Status `ONGOING`, attendance opens |
| LIFE-13 | Class A change on published event | Returns to `PENDING_APPROVAL`, amendment step created |
| LIFE-14 | Class B change on published event | Applied immediately, registrants and audience notified |
| LIFE-15 | Title-only change | Applied, no event-change notification |
| LIFE-16 | Description change | Applied, registrants only notified |
| LIFE-17 | Capacity reduced below current registration count | Rejected unless registrants are removed in the same operation |
| LIFE-18 | Cancel event with registrants | `CANCELLED`, all registrants notified, registrations retained |
| LIFE-19 | Cancel without reason | Rejected |
| LIFE-20 | Transition from `CANCELLED` to anything | Rejected, terminal |
| LIFE-21 | Transition from `REJECTED` to `PENDING_APPROVAL` | Rejected, must restart as `DRAFT` |
| LIFE-22 | Archive before evaluation submitted | Rejected |
| LIFE-23 | Reopen registration after event start | Rejected |
| LIFE-24 | Reopen registration before event start without reason | Rejected |
| LIFE-25 | Time-driven transition executes | Audit written with system actor, no user |
| LIFE-26 | Unapproved Class A amendment at event start | Owner and Administrator notified |
| LIFE-27 | Conclude before attendance finalised | Rejected, FR-POS-001 |

---

## 15. Exit Criteria

- Council Secretary confirms the statuses reflect how events actually progress in practice
- OQ-05 and OQ-19 are resolved
- The approval exception path is accepted or removed
- Notification recipients per transition are confirmed by the Event Officer role

---

**Related documents:** [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) ·
[REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) ·
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)