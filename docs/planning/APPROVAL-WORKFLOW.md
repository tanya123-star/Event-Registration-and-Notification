# Approval Workflow

**Document:** ERNS-APRWF
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Specify how an event obtains approval, which is a **supporting** function whose purpose is to
make publication trustworthy. Approval does not exist as a product in its own right.

---

## Scope

**In scope:** configurable approval chains, sequential steps, decisions, revision and rejection,
delegation, approval history, and the gate on publication.

**Out of scope:** event authoring, in [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md); the transition
matrix generally, which is in the same document.

---

## 1. Why This Is a Supporting Function

Approval exists so that a published event has been seen by the offices that need to see it. Once
that purpose is met, additional approval machinery is overhead.

The interview's approval pain point was not that approval was too permissive. It was that approval
was **opaque**: an event sat between offices and nobody could see where. So this module is designed
around visibility, not around adding more control.

**Design consequence.** There is no additional review stage, no second-level approval, and no
cross-checking step beyond what the configured chain requires.

---

## 2. Locked Decisions

**CONFIRMED.** Only `APPROVED` events are eligible for publication, unless a documented exception
exists.

**CONFIRMED.** Not every event requires every approval.

**CONFIRMED.** Approval requirements are configurable per event type.

---

## 3. Open Questions That Block This Module

**This module cannot be configured until these are answered.**

| ID | Question | Priority |
|---|---|---|
| OQ-01 | Who has final approval authority? | BLOCKING |
| OQ-02 | Which events require Dean approval? | BLOCKING |
| OQ-04 | When is Security approval required, and at what threshold? | BLOCKING |
| OQ-03 | Which events require Student Affairs approval? | HIGH |
| OQ-05 | Does an exception path exist for events that cannot obtain approval in time? | HIGH |
| OQ-06 | Is an Approver an office account or a personal account? | HIGH |

See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) section 3.

**The chain template cannot be defined without OQ-01 through OQ-04.** The module can be built with
a configurable mechanism and no templates, but it cannot be used until at least one template
exists.

---

## 4. Configurable Approval Chains

### 4.1 Model

**PROPOSED.** Each event type has an approval chain template defining an ordered list of steps.
Submitting an event creates an `ApprovalChain` instance from its type's template.

| Template attribute | Purpose |
|---|---|
| Event type | Which template applies |
| Sequence of offices | Which offices approve, in order |
| Per-office condition | Threshold or predicate determining whether that step applies |
| Whether parallel or sequential | Usually sequential |

### 4.2 Why per-event-type rather than a fixed chain

A fixed chain forces a Dean to approve a club practice. Officers then seek informal shortcuts,
which defeats the audit trail. Conditional steps mean an event engages only the offices actually
concerned with it.

### 4.3 Conditional steps

**PROPOSED.** A step may carry a condition, most plausibly a participant threshold for Security
clearance.

```
Event type: ORGANIZATION_ASSEMBLY
  Step 1  Council                       always
  Step 2  Student Affairs               always
  Step 3  Security                      if expected attendance > N
  Step 4  Dean                          if off-campus
```

**A conditional step that evaluates false is recorded as `SKIPPED` with the condition that caused
the skip.** Skipping must be visible, not invisible. An approver reviewing the history needs to
know the step was considered and deliberately not applied.

### 4.4 Why sequential rather than parallel

Sequential approval means an event cannot be simultaneously "with the Dean" and "with Security",
which is precisely the ambiguity the interview reported. The cost is elapsed time; the benefit is
that "where is this event?" always has one answer.

**PROPOSED.** An office that must not wait may be configured parallel, but parallel steps are
recorded individually so the history still shows both decisions.

---

## 5. Approval Flow

```
Draft  (Event Officer)
   ↓ submit
Submitted
   ↓ assigned approver opens
Under Review
   ↓
   ├── request revision ──► For Revision ──► (officer revises) ──► Submitted
   ├── reject ───────────► Rejected  (terminal for this submission)
   └── approve ───────────► Pending Approval (if steps remain)
                            ────────────► Approved  (final step)
                                                 ↓
                                          (officer or admin publishes)
                                              Published
```

Status definitions and the full transition matrix are in
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md).

---

## 6. Decision Rules

| Rule | Requirement | Rationale |
|---|---|---|
| A step cannot be decided before its predecessor is approved | FR-APR-004 | Keeps the decision order auditable |
| Revision requests require comments | FR-APR-006 | An unexplained revision request is unactionable |
| Rejection requires a reason | FR-APR-007 | Terminal decisions need justification |
| An approver may not edit the event they are assessing | FR-APR-013 | An approver must assess a stable document |
| Publication requires every required step approved | FR-APR-011 | The gate itself |
| Publication requires every required step approved **at the moment of publication** | FR-APR-011 | Status alone is not proof |
| The final approver may not publish | FR-APR-012 | Segregation of duty SD-1 |
| Chains never advance automatically on timeout | FR-APR-016 | Auto-approval defeats the gate |

**FR-APR-013 is why an event cannot be edited during review.** An approver who is assessing a
proposal must be assessing the version that will be published, not a moving target.

---

## 7. Revision Cycle

1. Approver selects request revision
2. Approver writes comments identifying what must change
3. Status becomes `FOR_REVISION`, and the officer is notified at `IMPORTANT` priority
4. Officer revises the draft and resubmits
5. A new chain instance is created, or the existing chain resumes, per configuration
6. Prior decisions are retained

**PROPOSED.** Revision comments stay visible on the event while the event is live, not only while
in review. The Council benefits from seeing what an office objected to.

**FR-APR-010** requires the full history including superseded steps. A revised event must not
erase the record of what was previously approved, because that determines what was actually
reviewed.

---

## 8. Rejection

**Rejection is terminal for the submission.** The event becomes `REJECTED`, and the owner is
notified.

**PROPOSED.** A rejected event is not revived. To proceed, the officer creates a new draft or
rewrites the existing one as a new `DRAFT`, preserving the rejection in history. A rejected
proposal that reappears as an approved one under the same identifier would make the rejection
meaningless.

**Rejected events may not transition to `PENDING_APPROVAL`** — see the disallowed transitions in
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md).

---

## 9. Delegation and Absence

### 9.1 Rules

| Rule | Requirement |
|---|---|
| An Administrator may delegate or reassign a pending step | FR-APR-009 |
| The delegation is recorded, retaining the original approver | FR-APR-009 |
| An Approver may decline an assignment they are unqualified for | PROPOSED |

### 9.2 Why delegation is recorded

An approval recorded under a delegate is not the same as an approval recorded by the office's
designated approver. Both are legitimate; only one can be reconstructed if the delegation is not
recorded. `ApprovalStep.assigned_to` and `delegated_from` exist for this.

> **OPEN QUESTION:** Is an Approver an office account or a personal account? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-06. If personal, delegation becomes mandatory rather
> than exceptional, because staff change hands.

---

## 10. Stalled Approvals

**The interview's central approval complaint is addressed here.**

### 10.1 Idle detection

**FR-APR-017** requires the system to identify events idle beyond a configured threshold.

**PROPOSED.** The pending approvals report, per **FR-RPT-007**, shows every event awaiting a
decision with:

- Current office
- Days since submission or since the last step completed
- Officer
- Event date, so urgency is visible

### 10.2 Idle notification

**PROPOSED.** After the threshold, the system notifies the assigned approver and the event owner.

### 10.3 What the system does not do

**FR-APR-016** prohibits automatic advancement. A system that auto-approves a stalled event after N
days has not solved the problem; it has made the failure silent and invisible in the audit trail.

**The system makes the stall visible. It does not resolve it.** Resolving it requires the
organisation to change how its offices respond, which is outside ERNS.

---

## 11. Approval History

**FR-APR-010** requires the full decision history.

Each `ApprovalStep` records: office, assigned approver, status, deciding user, timestamp,
comments, and any delegation.

**PROPOSED.** An officer reviewing a past event can see, per office, who decided what and when. This
is what makes an approval defensible months later, and it is the practical benefit of the module.

---

## 12. Post-Publication Change and Re-Approval

**Class A changes require re-approval.** Class A is date, start time, end time, and venue.

Workflow per [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 7:

1. Officer or Administrator edits a Class A field
2. System returns the event to `PENDING_APPROVAL` with an amendment step
3. The event remains visible to registrants while awaiting approval
4. Prior and new values are recorded in the change history
5. On approval, an event-update notification is dispatched
6. If the event start passes while the amendment is unapproved, owner and Administrator are notified

> **OPEN QUESTION:** Which changes require a fresh approval rather than a notification? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-19.

**Why the event stays visible during re-approval.** Hiding it would strand students who already
registered for an event that has not been cancelled. That would be worse than an unapproved
amendment.

---

## 13. The Publication Gate

### 13.1 Gate conditions

Publication, transition `T-10`, requires:

1. Event status is `APPROVED`
2. Every required approval step is approved, verified at publication time
3. Publisher is not the final approver
4. All required fields remain valid

**FR-APR-011** and **FR-APR-012**.

### 13.2 Why verification happens at publication

**A status field is a summary, not proof.** If the status reads `APPROVED` but a step was revoked,
reassigned without decision, or corrupted, publication on the strength of the status field would
publish an unapproved event.

The system therefore re-evaluates the chain at publication. This is `LIFE-08` and `LIFE-09` in
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md).

### 13.3 The exception path

**PROPOSED**, and conditional on **OQ-05**.

If late events must be publishable, the path is:

- Administrator only
- A recorded justification
- An audit event
- A participant-facing notice that the event was published under exception

**This is a documented exception, not a bypass.** It is visible in the audit trail and to
participants. If the Council rejects the exception path, `T-10` has no exception branch and late
events are simply held.

---

## 14. Reporting

| Report | Requirement | Contents |
|---|---|---|
| Pending approvals | FR-RPT-007 | Events awaiting this approver, with idle days |
| Approval history | FR-RPT-008 | Decisions this approver made |
| Idle approvals | FR-APR-017 | Events beyond the idle threshold |

**PROPOSED.** The idle report is the report that most directly addresses the interview's complaint.

---

## 15. Audit Requirements

| Action | Audit class |
|---|---|
| Event submitted for approval | `AUD-06` |
| Review started | `AUD-07` |
| Revision requested | `AUD-08`, with comments |
| Step approved | `AUD-07` |
| Event rejected | `AUD-09`, with reason |
| Delegation or reassignment | `AUD-07`, with reason |
| Amendment step created | `AUD-07` |
| Event published under exception | `AUD-10`, with justification |

Catalogue in [AUDIT-PLAN.md](AUDIT-PLAN.md).

---

## 16. Failure Handling

**Failure:** an approver never acts.
**Handling:** idle detection surfaces it in the pending approvals report and notifies the owner and
approver. **No automatic advancement**, per **FR-APR-016**.

**Failure:** the approving user is unavailable on event day.
**Handling:** Administrator delegates or reassigns. The delegation is recorded.

**Failure:** an officer tries to edit an event under review.
**Handling:** refused, per **FR-APR-013**.

**Failure:** an approval is recorded and then found to have been given without authority.
**Handling:** the audit entry identifies the user. Correction is a new audit event, never an edit
to the existing one, per **NFR-AUD-005**.

**Failure:** publication is attempted on an event whose status reads `APPROVED` but whose chain is
incomplete.
**Handling:** refused. Chain re-verification catches it, `LIFE-22`.

---

## 17. Completion Criteria

- Chain requirements are configurable per event type
- Steps evaluate in sequence and cannot be skipped
- Revision, rejection, and delegation are recorded with their justification
- Publication verifies the chain at publication time
- Stalled events are visible

---

## 18. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| APR-01 | Submit a complete draft | `SUBMITTED`, chain instance created, approver notified |
| APR-02 | Submit with a required field missing | Refused, field list returned |
| APR-03 | Approver opens the submission | Status `UNDER_REVIEW` |
| APR-04 | Intermediate step approved | Status `PENDING_APPROVAL`, next step assigned |
| APR-05 | Final step approved | Status `APPROVED` |
| APR-06 | Approve step 2 before step 1 | Refused, FR-APR-004 |
| APR-07 | Request revision without comments | Refused, FR-APR-006 |
| APR-08 | Request revision with comments | `FOR_REVISION`, officer notified |
| APR-09 | Reject without a reason | Refused, FR-APR-007 |
| APR-10 | Reject with a reason | `REJECTED`, owner notified, `AUD-09` |
| APR-11 | Resubmit after revision | `SUBMITTED`, prior decisions retained |
| APR-12 | Rejected event transitions to `PENDING_APPROVAL` | Refused, terminal |
| APR-13 | Officer edits an event under review | Refused, FR-APR-013 |
| APR-14 | Attachment added while under review | Refused, FR-EVT-011 |
| APR-15 | Conditional step evaluates false | Recorded `SKIPPED` with the condition |
| APR-16 | Approver delegates a pending step | Permitted, delegation recorded |
| APR-17 | Delegated approver decides | Decision attributed to the delegate, original retained |
| APR-18 | Approval step idle beyond threshold | Appears in the idle report, notifications sent |
| APR-19 | Approval idle past a long threshold | **No automatic advancement**, FR-APR-016 |
| APR-20 | Publish a fully approved event | Allowed |
| APR-21 | Publish with a step pending | Refused, FR-APR-011 |
| APR-22 | Publish where status reads `APPROVED` but a step is incomplete | Refused, chain re-verified |
| APR-23 | Final approver publishes | Refused, FR-APR-012 |
| APR-24 | Administrator publishes under exception with justification | Allowed, audited, `AUD-10` |
| APR-25 | Administrator publishes under exception without justification | Refused |
| APR-26 | Class A change on a published event | Returns to `PENDING_APPROVAL`, amendment step created |
| APR-27 | Class B change | Applied immediately, no approval step |
| APR-28 | Amendment unapproved when event start arrives | Owner and Administrator notified |
| APR-29 | Approver attempts to publish | Refused, SD-1 |
| APR-30 | Approval decision edited after recording | No path exists |
| APR-31 | User holding both Approver and Event Officer for one event | Role grant refused, FR-USR-011 |
| APR-32 | Approver granted a role revocation that orphans a pending step | Refused, FR-USR-014 |

---

## 19. Exit Criteria

- OQ-01, OQ-02, OQ-04, OQ-05, and OQ-06 resolved
- At least one approval chain template defined per event type
- Council Secretary confirms the approval process reflects how offices actually work
- The idle threshold is set and agreed

---

**Related documents:** [APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) ·
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)