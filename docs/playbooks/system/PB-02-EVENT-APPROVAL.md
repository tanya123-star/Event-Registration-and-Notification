# Playbook 02 — Event Approval

**Playbook:** PB-02
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Approver
**Supersedes:** None

---

## Purpose

Ensure every published event has been assessed by the offices that need to assess it, and that the
organisation can see where any pending event is waiting.

This playbook addresses Pain Point 5: manual, time-consuming approval, and specifically the
inability to know where an event has stalled.

---

## Scope

**In scope:** submission, sequential review, revision requests, rejection, delegation, and stalled
approval visibility.

**Out of scope:** authoring, `PB-01`; publication, `PB-03`; the approval mechanism specification,
in [APPROVAL-WORKFLOW.md](../../planning/APPROVAL-WORKFLOW.md).

---

## Trigger

An Event Officer submits a draft event for approval, or an Approver is assigned a pending
decision.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Submits, responds to revision, resubmits |
| Approver | Reviews, approves, requests revision, rejects, declines |
| Administrator | Delegates, reassigns, reconfigures chains |
| Council | Holds final authority, subject to OQ-01 |

---

## Preconditions

- The event is in `DRAFT`
- Every field required for the event type is complete
- An approval chain template exists for the event type
- An approver is assigned to each required step
- The officer is not also an approver for the same event, per SD-1

---

## Main Workflow — Officer

1. Officer opens the draft
2. Officer reviews the complete event
3. Officer selects Submit for approval
4. System validates every required field
5. System creates an approval chain from the event type template
6. System evaluates conditional steps and records skipped ones with their conditions
7. System assigns the first step
8. System notifies the assigned approver at `IMPORTANT` priority
9. Status becomes `SUBMITTED`

### Responding to a revision request

10. Officer opens the returned event
11. Officer reads the approver's comments
12. Officer makes the requested changes
13. Officer resubmits
14. System creates a new chain instance, retaining the prior decisions
15. Status becomes `SUBMITTED`

---

## Main Workflow — Approver

1. Approver opens their pending approvals list
2. Approver selects an event
3. System displays the complete event, attachments, and prior decisions
4. Approver begins review, and status becomes `UNDER_REVIEW`
5. Approver assesses the event against the office's criteria
6. Approver selects one of: approve, request revision, reject
7. If approving, the system advances the chain or marks the event `APPROVED`
8. If requesting revision, comments are mandatory
9. If rejecting, a reason is mandatory
10. System notifies the officer
11. System records the decision in the audit trail

---

## Alternative Paths

### A conditional step does not apply

The system records the step as `SKIPPED` with the condition that caused the skip, and advances
automatically. The skip is visible in the approval history.

### An approver is unavailable

The Administrator delegates or reassigns the step, recording the original approver. The delegate
decides, and the decision is attributed to the delegate.

### An approver declines an assignment

The step returns to unassigned. The Administrator assigns it to a qualified approver.

### An event is rejected

The event becomes `REJECTED`, which is terminal for that submission. To proceed, the officer
rewrites the event as a new draft. A rejected event cannot be revived, because an approved event
that shares an identifier with a rejected one would make the rejection meaningless.

### An officer disagrees with a revision request

The officer resubmits anyway. The approver may reject on the second pass. There is no mechanism to
override an approver.

### An approval step has been idle for too long

The system surfaces the event in the idle approvals report and notifies the approver and the
officer. **The system never advances the chain automatically.** See Failure Handling.

### A post-publication change requires re-approval

The event returns to `PENDING_APPROVAL` with an amendment step, and remains visible to registrants
while awaiting the decision. This is `PB-09 Event Update Notification`.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Required fields complete | FR-EVT-005 | List of missing fields |
| Approval chain exists | FR-APR-002 | No approval chain configured for this event type |
| Officer is not the approver | FR-USR-011 | You cannot approve your own event |
| No edit while a step is active | FR-APR-013 | The event is under review |
| Step order respected | FR-APR-004 | This step cannot be decided yet |
| Revision requires comments | FR-APR-006 | Comments are required |
| Rejection requires a reason | FR-APR-007 | A reason is required |
| Approver has no edit rights | Section 4.1 of the authorisation matrix | Approvers cannot modify the event |
| Approver cannot publish | FR-APR-012 | You approved this event and cannot publish it |

---

## Data Affected

| Entity | Effect |
|---|---|
| Event | Status changes between authoring statuses |
| ApprovalChain | Created on submission, one active instance per event |
| ApprovalStep | Assigned, decided, skipped, or delegated |
| Notification | Created for the assigned approver and for the officer on each decision |
| AuditLog | `AUD-06`, `AUD-07`, `AUD-08`, `AUD-09` |

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Event submitted | Assigned approver | `IMPORTANT` | Yes |
| Review started | Owning officer | `NORMAL` | No |
| Revision requested | Owning officer | `IMPORTANT` | Yes |
| Event rejected | Owning officer | `IMPORTANT` | Yes |
| Step approved, more remain | Owning officer | `NORMAL` | No |
| Event fully approved | Owning officer | `NORMAL` | No |
| Approval idle past threshold | Assigned approver, owning officer | `HIGH` | No |
| Step delegated | New delegate, owning officer | `NORMAL` | No |

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Submitted | `AUD-06` | Actor, chain instance, steps created |
| Review started | `AUD-07` | Approver, timestamp |
| Revision requested | `AUD-08` | Approver, comments |
| Step approved | `AUD-07` | Approver, step, timestamp |
| Rejected | `AUD-09` | Approver, reason |
| Delegated | `AUD-07` | Original approver, delegate, reason |
| Conditional step skipped | `AUD-07` | Condition that caused the skip |

**Every approval decision records the deciding user, not just the office.** An approval recorded
only against an office cannot be reconstructed when staff change.

---

## Failure Handling

**Failure:** an approver never acts.
**Handling:** idle detection surfaces the event in the pending approvals report and notifies both
the approver and the officer. **The chain does not advance.** Auto-approval would make the failure
invisible and would defeat the gate entirely.

**Failure:** the approving user leaves the organisation mid-chain.
**Handling:** the Administrator delegates or reassigns. The delegation is recorded, so an approval
given under delegation remains attributable.

**Failure:** an officer edits the event while it is under review.
**Handling:** refused, per FR-APR-013. An approver must assess a stable document.

**Failure:** publication is attempted while the chain is incomplete but the status reads `APPROVED`
due to an inconsistency.
**Handling:** publication re-verifies the chain and refuses. Status alone is not trusted.

**Failure:** a Class A amendment is still unapproved when the event starts.
**Handling:** the officer and Administrator are notified, and the event is flagged in reporting as
running with an unapproved amendment. The event proceeds, because stopping it would strand
registered students.

**Failure:** an approver approves an event they should not have.
**Handling:** the audit entry identifies the approver and the timestamp. Correction is a new audit
event. There is no path to edit or delete the original decision.

---

## Completion Criteria

- Every required approval step is decided
- Every decision records the deciding user and timestamp
- Comments are recorded for every revision request
- The event is either `APPROVED` or `REJECTED`
- Pending approvals are visible to every authorised approver

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBA-01 | Happy path | Complete draft submitted | `SUBMITTED`, chain created, approver notified |
| PBA-02 | Happy path | All steps approved in order | `APPROVED`, `AUD-07` per step |
| PBA-03 | Invalid input | Submitted with a required field missing | Refused, field list returned |
| PBA-04 | Invalid input | Revision requested without comments | Refused, FR-APR-006 |
| PBA-05 | Invalid input | Rejected without a reason | Refused, FR-APR-007 |
| PBA-06 | Unauthorized | Officer submits an event they do not own | Refused |
| PBA-07 | Unauthorized | Officer approves their own event | Refused, SD-1 |
| PBA-08 | Unauthorized | Approver edits the event under review | Refused |
| PBA-09 | Unauthorized | Approver publishes | Refused, FR-APR-012 |
| PBA-10 | Boundary | Step 2 approved before step 1 | Refused, FR-APR-004 |
| PBA-11 | Boundary | Conditional step evaluates false | `SKIPPED`, condition recorded |
| PBA-12 | Boundary | Every step skipped by condition | Refused, at least one step must apply |
| PBA-13 | Duplicate | Rejected event resubmitted | Refused, must restart as `DRAFT` |
| PBC-13 | Duplicate | Revision requested twice | Second request refused, step already decided |
| PBA-14 | Failure | Approver never acts | Idle report entry after threshold, no auto-advance |
| PBA-15 | Failure | Approver becomes unavailable | Administrator delegates, recorded |
| PBA-16 | Failure | Officer edits during review | Refused |
| PBA-17 | Failure | Chain inconsistent with status | Publication refused |
| PBA-18 | Failure | Class A amendment unapproved at event start | Officer and Administrator notified |
| PBA-19 | Failure | Attempt to edit a recorded decision | No path exists |
| PBA-20 | Security | Officer attempts approval through a direct request | Refused server-side |
| PBA-21 | Boundary | Approval recorded and then the approver's account suspended | Decision retained |

---

## Exit Criteria

- The event is `APPROVED`, or rejected and restarted as a draft
- The full approval history is retrievable
- `PB-03 Event Publishing` is ready, and the publisher is not the final approver

---

**Related documents:** [PB-02 Event Approval](PB-02-EVENT-APPROVAL.md) ·
[PB-01 Event Creation](PB-01-EVENT-CREATION.md) ·
[PB-03 Event Publishing](PB-03-EVENT-PUBLISHING.md) ·
[APPROVAL-WORKFLOW.md](../../planning/APPROVAL-WORKFLOW.md) ·
[EVENT-LIFECYCLE.md](../../planning/EVENT-LIFECYCLE.md) ·
[USER-ROLES.md](../../planning/USER-ROLES.md) ·
[AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)