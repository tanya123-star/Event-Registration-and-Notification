# Playbook 13 — Event Evaluation

**Playbook:** PB-13
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Capture what went wrong and what should change, in a structured form that a future organiser can
find and read.

This playbook addresses Pain Point 15: difficulty learning from previous events, and the observation
that problems recur. The cause is not a lack of review. It is that review produces unstructured
knowledge which cannot be found again.

---

## Scope

**In scope:** evaluation fields, submission, amendment, and surfacing past problems during event
creation.

**Out of scope:** archival, `PB-14`; automated analysis, which does not exist and will not.

---

## Trigger

An event reaches `COMPLETED` and its owner begins the evaluation.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Completes the evaluation for events they own |
| Administrator | Completes or amends on the officer's behalf |
| Future Event Officers | Read past problems when creating a new event |

---

## Preconditions

- The event is `COMPLETED`
- Attendance is finalised
- The event owner is known

---

## The Nine Fields

**FR-POS-003** requires separate fields. The categories come from the interview, not from
invention: they map onto the recurring problem types the organisation actually reported.

| Field | Addresses |
|---|---|
| Overall assessment | General satisfaction |
| Problems encountered | Anything not covered below |
| Communication problems | PP-01, PP-02, PP-03, PP-10 |
| Registration problems | PP-08, PP-12 |
| Attendance problems | PP-06, PP-07, PP-08 |
| Technical problems | PP-06, and system issues |
| Scheduling problems | PP-13, and event scheduling |
| Recommendations | What should change |
| Lessons learned | What should be remembered |

**Why separate fields rather than one.** A single free-text "problems" field cannot be queried. If
the Council wants to know whether attendance problems are recurring, they need attendance problems
recorded separately from communication problems.

**Why lessons learned and recommendations are prompted separately.** They produce different kinds of
knowledge. A lesson is a realisation; a recommendation is a proposal. Asking for both makes it more
likely that at least one substantive entry is written.

---

## Main Workflow

1. Officer opens the completed event
2. Officer selects Start evaluation
3. System displays the nine fields, with the event report available for reference alongside
4. Officer records an overall assessment
5. Officer reviews the event report for problems that may not be in memory
6. Officer records problems in the relevant categories
7. Officer records recommendations
8. Officer records lessons learned
9. Officer reviews the full evaluation
10. Officer submits
11. System records `AUD-24`
12. The event may now be archived, per `PB-14`

---

## Surfacing Past Problems

**FR-POS-010.** When an officer begins creating a new event and selects an event type, the system
displays the problems and recommendations from previous events of that type.

**PROPOSED.** During event creation, once the type is selected:

- Number of previous events of this type
- Recorded problems by category, most recent first
- Recommendations from previous events
- Attendance and registration statistics for comparable events

**This is a prompt, not a gate.** The officer may proceed without reading it.

**Why a prompt rather than a gate.** Requiring an officer to acknowledge previous problems invites
automatic acceptance without reading. A prompt placed at the moment of relevance is more likely to be
read. Refusing to create an event because last term had a problem with parking would be absurd.

**Why surfacing matters more than storing.** If a record is never shown to the person planning the
next event, the same problem recurs, which is precisely what the interview described. Storing
evaluations without surfacing them would not have addressed PP-15.

---

## No Automated Analysis

**FR-POS-011.** The system generates no automated analysis, inference, or recommendation from
evaluation content.

Three reasons, recorded because the temptation is real:

1. **Automatic theme extraction is unreliable.** Inferring patterns from a handful of short
   free-text fields produces confident-looking summaries. An officer acting on a wrong summary is
   worse than an officer reading the record.
2. **It obscures provenance.** A Council member asking "why does this say we always have problems
   with QR" needs the original records, not an inference.
3. **It was not requested.** The problem was that knowledge was not retained, not that it was not
   analysed.

**The design answer:** store problems in typed fields so they are findable by category, and surface
them at the moment an officer creates a new event. A person reads and decides. The system organises;
it does not conclude.

---

## Alternative Paths

### The officer submits with most fields empty

Accepted. A partial record with real content is more useful than a complete record of filler.
**Requiring all fields produces filler.**

### The officer cannot recall the problems

The event report is displayed alongside for reference: attendance counts, notification activity,
approval history, and changes made. The record was there to be consulted.

### The officer wants to amend a submitted evaluation

Permitted with a reason, recorded as `AUD-25`. The original is retained.

**Evaluations are correctable; attendance is not.** An evaluation is an account of what happened and
may be mistaken. Attendance is evidence of a specific fact, so overwriting it would destroy the
evidence that it was wrong.

### The event was cancelled before it occurred

There is no evaluation. A cancelled event has no participation record to evaluate.

### No previous events of this type exist

No prompt is shown. An empty prompt is noise.

### Another officer wants to read the evaluation

They must own the event, or be an Administrator. Evaluations can name people and situations, so
access is scoped.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Event is `COMPLETED` | Lifecycle | This event is {status} |
| Exactly one evaluation per event | FR-POS-004 | An evaluation already exists |
| User owns the event or is an Administrator | Authorisation matrix | You cannot evaluate this event |
| Overall assessment present | Proposed | An overall assessment is required |
| Field length within limit | — | This entry exceeds the maximum length |
| No automated analysis requested | FR-POS-011 | No such capability exists |
| Amendment requires a reason | `AUD-25` | A reason is required |

---

## Data Affected

| Entity | Effect |
|---|---|
| EventEvaluation | Created with nine fields, submitter, timestamp |
| Event | Evaluation-completion state recorded |
| AuditLog | `AUD-24` submitted, `AUD-25` amended |

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Evaluation submitted | Officer | `NORMAL` | No |
| Evaluation submitted, Administrator review expected | Administrator | `NORMAL` | No |
| Event awaiting evaluation | Officer, on a schedule | `NORMAL` | No |

**No acknowledgement requirement.** An evaluation is a record, not an instruction. There is nothing
for a recipient to confirm.

> **OPEN QUESTION:** Should evaluation submission have a deadline? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-39. The proposed answer is no hard
> deadline, because a deadline nobody meets produces no useful record.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Evaluation submitted | `AUD-24` | Officer, event, timestamp |
| Evaluation amended | `AUD-25` | Actor, reason, previous and new values |

**Evaluation content is not duplicated into the audit entry.** The audit entry records that the
evaluation changed and who changed it. Copying free text into an append-only audit store would
double the storage of the most sensitive narrative content in ERNS, since evaluations may name
people and describe disputes.

---

## Failure Handling

**Failure:** the officer never submits an evaluation.
**Handling:** the event remains un-archivable, because archival requires an evaluation. It appears in
reporting as awaiting evaluation. **This is the only enforcement that evaluation actually happens**,
and it works because it is a precondition rather than a reminder.

**Failure:** evaluations are submitted empty.
**Handling:** accepted. An empty evaluation is still a record that the officer reviewed the event, and
it surfaces the fact that a deadline or reminder was not effective.

**Failure:** a submission is made and immediately found to be wrong.
**Handling:** amend with a reason. The original is retained.

**Failure:** two officers both believe they own the event.
**Handling:** only one may submit, per FR-POS-004. The second is refused and shown the existing
evaluation.

**Failure:** an evaluation names a student in a way that harms them.
**Handling:** this is an organisational and conduct matter, not a system one. The evaluation is a
historical statement about what happened and is correctable with a reason.

---

## Completion Criteria

- A single evaluation exists for the event
- Each category has been considered, whether or not it received an entry
- Recommendations and lessons learned have been prompted
- The evaluation is retrievable when a future officer creates an event of the same type
- `PB-14 Event Archiving` is ready

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBE-01 | Happy path | Officer submits a complete evaluation | `AUD-24`, archival unblocked |
| PBE-02 | Happy path | Officer submits with some fields empty | Accepted |
| PBE-03 | Happy path | Officer amends with a reason | Accepted, original retained, `AUD-25` |
| PBE-04 | Happy path | Officer creates a new event of a type with history | Previous problems displayed |
| PBE-05 | Invalid | Second evaluation for the same event | Refused, FR-POS-004 |
| PBE-06 | Invalid | Evaluation on an event that is not `COMPLETED` | Refused |
| PBE-07 | Unauthorized | Officer evaluates an unowned event | Refused |
| PBE-08 | Unauthorized | Student evaluates | Refused |
| PBE-09 | Invalid | Amendment without a reason | Refused |
| PBE-10 | Boundary | Evaluation on a cancelled event | No path, terminal |
| PBE-11 | Boundary | New event type with no history | No prompt shown |
| PBE-12 | Duplicate | Two officers both submit | Second refused, existing shown |
| PBE-13 | Failure | Evaluation never submitted | Event blocks archival, appears in reporting |
| PBE-14 | Failure | Evaluation submitted empty | Accepted |
| PBE-15 | Failure | Officer cannot recall problems | Event report available for reference |
| PBE-16 | Failure | Automated analysis requested | No such capability exists, FR-POS-011 |
| PBE-17 | Invalid | Field exceeds the length limit | Refused |
| PBE-18 | Boundary | Overall assessment omitted | Refused, proposed requirement |
| PBE-19 | Failure | Evaluation content excluded from the audit entry | Confirmed, entry holds metadata only |
| PBE-20 | Failure | Administrator amends an officer's evaluation | Permitted with a reason |

---

## Exit Criteria

- An evaluation exists and is retrievable
- Past problems surface during event creation
- `PB-14 Event Archiving` may proceed

---

**Related documents:** [PB-13 Event Evaluation](PB-13-EVENT-EVALUATION.md) ·
[PB-12 Post-Event Records](PB-12-POST-EVENT-RECORDS.md) ·
[PB-14 Event Archiving](PB-14-EVENT-ARCHIVING.md) ·
[POST-EVENT-WORKFLOW.md](../../planning/POST-EVENT-WORKFLOW.md) ·
[MVP.md](../../planning/MVP.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)