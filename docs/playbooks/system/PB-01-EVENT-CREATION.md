# Playbook 01 — Event Creation

**Playbook:** PB-01
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Ensure an event is created with complete, accurate information before it enters approval, so that
participants receive information they can act on and approvers assess a stable document.

This playbook addresses Pain Points 9 and 10: incomplete understanding of event mechanics, and
information dissemination errors.

---

## Scope

**In scope:** event authoring, field completion, validation, attachments, and draft management.

**Out of scope:** submission for approval, `PB-02`; publication, `PB-03`; post-publication
changes, `PB-09`.

---

## Trigger

An Event Officer decides to hold an event and opens event creation.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Creates and completes the event |
| Administrator | May create on the officer's behalf, or correct |

Club officers are not actors. They have no login, per the locked decision.

---

## Preconditions

- The user holds the Event Officer role
- The user is authenticated
- An approval chain exists for the intended event type, or the officer knows it does not
- Previous problems for this event type are available, per `FR-POS-010`

---

## Main Workflow

1. Officer opens event creation
2. System displays previous problems and recommendations for the selected event type, once the type
   is chosen
3. Officer selects the event type
4. System displays the fields required for that type, marking which are mandatory
5. Officer enters the title and description
6. Officer enters the date, start time, and end time
7. Officer enters the venue
8. Officer selects the owning organisation or club
9. Officer defines the target audience
10. Officer sets the registration-required flag
11. If registration is required, officer enters registration start, registration deadline, and
    participant capacity
12. Officer enters event mechanics, programme flow, requirements, materials needed, and dress code,
    where the event type requires them
13. Officer enters the contact person
14. Officer attaches the proposal document and any supporting materials
15. System validates every field
16. Officer reviews the complete event
17. Officer saves as draft, or proceeds to `PB-02` to submit

---

## Alternative Paths

### The event requires no registration

Skip steps 10 and 11. Set registration-required to false. The event is published and students may
attend without registering. Note that attendance will then only capture walk-ins, which the officer
should consider.

### The event is a general assembly

Mechanics, programme flow, requirements, materials, and dress code are not required. Skip step 12.
This exists so that the form does not demand information a general assembly does not have.

### The officer does not know the venue yet

Venue is a required field for submission, not for drafting. The officer may save a draft without it
and complete it before submission.

### Previous problems for this event type are relevant

The officer reads them and adjusts their plan. This is a prompt, not a gate. The officer may
proceed without acting on it.

### The officer needs to change an event that is not yet submitted

Ordinary draft editing. Return to step 5.

### The officer is unavailable and an Administrator must take over

Administrator creates or edits on the officer's behalf. The audit trail records the Administrator
as the actor, which is intentional per SD-4.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Title present | FR-EVT-002 | Title is required |
| Description present | FR-EVT-002 | Description is required |
| Event type selected | FR-EVT-002 | Event type is required |
| Date, start time, end time present | FR-EVT-002 | All three are required |
| End time later than start time | FR-EVT-006 | End time must be after the start time |
| Venue present | FR-EVT-002 | Venue is required |
| Organizer present | FR-EVT-002 | Organizer is required |
| Target audience present | FR-EVT-002 | Target audience is required |
| Registration start earlier than deadline | FR-EVT-008 | Registration cannot open after it closes |
| Deadline earlier than event date | FR-EVT-007 | Registration cannot close after the event starts |
| Capacity is a positive integer | FR-EVT-009 | Capacity must be a positive whole number |
| Mechanics and related fields present where required | FR-EVT-004 | Required for this event type |
| Contact person present | FR-EVT-002 | A contact person is required |
| Attachment type and size valid | FR-EVT-012 | File type or size not accepted |

**These rules apply at save and again at submission.** Saving a draft is permissive; submission is
strict. This lets an officer capture information incrementally without the form blocking progress,
while preventing an incomplete event from entering approval.

---

## Data Affected

| Entity | Effect |
|---|---|
| Event | Created in `DRAFT`, then updated as fields are completed |
| EventAttachment | Proposal and supporting documents attached |
| Organization/Club | Read to populate the owner selector |
| ApprovalChain | **Not created.** Created at submission |
| AuditLog | `AUD-05` on creation and each edit |

---

## Notifications

**None during drafting.** A draft is invisible to students, so notifying anyone would leak an
unapproved event.

An Officer who is granted assistance on an event receives a notification.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Event created | `AUD-05` | Actor, role, timestamp, new state `DRAFT` |
| Event field edited | `AUD-05` | Actor, timestamp, changed field |
| Attachment added | `AUD-05` | Actor, filename, event |

**Draft edits are audited but not verbose.** Recording every keystroke would produce an audit trail
too large to be useful. What matters is who authored the event and what was changed, which is
covered by the change history on the event record itself.

---

## Failure Handling

**Failure:** the officer enters an end time before the start time.
**Handling:** refused with a field-specific message per NFR-A11Y-008. The draft is preserved, so
the officer's other input is not lost, per NFR-USAB-010.

**Failure:** the attachment upload fails.
**Handling:** the upload is rejected with a reason. The event draft is unaffected. The officer
uploads again.

**Failure:** the officer loses connectivity mid-draft.
**Handling:** local input is retained in the browser where feasible. If the save fails, the officer
is told the save did not occur. **The system never reports a successful save it did not perform.**

**Failure:** the officer discovers a mistake after submission.
**Handling:** the event is now under review. Edits are refused, per FR-APR-013. The officer must
wait for the decision or request withdrawal.

---

## Completion Criteria

- An event exists in `DRAFT` with every field required for its type
- The event passes all field validation rules
- The proposal document is attached
- The draft is visible only to its owner, the Administrator, and assigned approvers

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBC-01 | Happy path | Officer creates an event with all required fields | Draft saved, `AUD-05` |
| PBC-02 | Happy path | Officer attaches the proposal document | Attachment stored, validated |
| PBC-03 | Invalid input | Title omitted | Refused, field identified |
| PBC-04 | Invalid input | End time before start time | Refused, FR-EVT-006 |
| PBC-05 | Invalid input | Deadline after event date | Refused, FR-EVT-007 |
| PBC-06 | Invalid input | Registration start after deadline | Refused, FR-EVT-008 |
| PBC-07 | Invalid input | Capacity of zero or negative | Refused, FR-EVT-009 |
| PBC-08 | Boundary | End time exactly equal to start time | Refused |
| PBC-09 | Boundary | Capacity of one | Accepted |
| PBC-10 | Boundary | Deadline exactly on the event date | Refused, FR-EVT-007 |
| PBC-11 | Invalid input | Non-assembly event missing mechanics | Refused at submission, accepted as draft |
| PBC-12 | General assembly | No mechanics supplied | Accepted, not required |
| PBC-13 | Unauthorized | Student attempts to create an event | Refused |
| PBC-14 | Unauthorized | Officer creates on another officer's behalf without role | Refused |
| PBC-15 | Failure | Upload of a disallowed file type | Refused before storage |
| PBC-16 | Failure | Upload exceeding size limit | Refused |
| PBC-17 | Failure | Save attempted with no connectivity | Failure reported, no false success |
| PBC-18 | Security | Filename containing a path traversal sequence | Rejected, sanitised |
| PBC-19 | Security | Script fragment in the description | Stored as text, not executed |
| PBC-20 | Duplicate | Two officers create events with the same title | **Permitted.** Titles are not unique. Flag as a possible duplicate for review |
| PBC-21 | Visibility | Student lists events | Drafts not shown, FR-EVT-015 |
| PBC-22 | Visibility | Non-owner officer lists drafts | Not shown |

---

## Exit Criteria

- The event draft is complete and validated
- The officer understands that submission freezes edits
- `PB-02 Event Approval` is ready to begin

---

**Related documents:** [PB-01 Event Creation](PB-01-EVENT-CREATION.md) ·
[PB-02 Event Approval](PB-02-EVENT-APPROVAL.md) ·
[PB-03 Event Publishing](PB-03-EVENT-PUBLISHING.md) ·
[EVENT-LIFECYCLE.md](../../planning/EVENT-LIFECYCLE.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md) ·
[USER-ROLES.md](../../planning/USER-ROLES.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md)