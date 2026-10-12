# Post-Event Workflow

**Document:** ERNS-POSWF
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Specify what happens to an ERNS event after it concludes: attendance finalisation, closure,
structured evaluation, archival, and how previous events become usable for future organisers.

This is the workflow that addresses Pain Point 15. The interview reported that the organisation
reviews pros and cons but that some problems recur. The cause is not a lack of review; it is that
review produces unstructured knowledge which cannot be found again.

---

## Scope

**In scope:** closure, evaluation structure, retention, archival, and retrieval of past problems.

**Out of scope:** backup operations, which are in `PB-17 Backup and Recovery` and
`PB-ENG-18 Backup and Recovery`.

---

## 1. Locked Decisions

**CONFIRMED.** No AI analytics. Structured, reliable records only.

**CONFIRMED.** The conceptual entities `EventEvaluation` and `AuditLog` are retained.

**CONFIRMED.** Attendance is a separate fact and survives post-event processing.

---

## 2. Why Structured Records Rather Than Analysis

**CONFIRMED.** ERNS must not generate automated analysis, inference, or recommendations from
evaluation content.

The temptation would be to mine evaluation text for recurring themes and surface them
automatically. Three reasons against:

1. **It would be unreliable.** Automatic theme extraction from short free-text fields produces
   confident-looking summaries of a handful of records. An officer acting on a wrong summary is
   worse than an officer reading the record.
2. **It would obscure provenance.** A Council member asking "why does this say we always have
   problems with QR" needs the original records, not an inference.
3. **It is not requested.** Nobody in the interview asked for analysis. The problem was that
   knowledge was not retained, not that it was not analysed.

**The design answer:** store problems in typed fields so they are findable by category, and surface
them at the moment an officer creates a new event. A person reads and decides. The system
organises, it does not conclude.

---

## 3. Post-Event Flow

```
Event ends
   ↓
Attendance window closes (time-driven)
   ↓
Attendance finalised                    FR-POS-001
   ↓
Event marked COMPLETED                  T-16
   ↓
Registration window already closed       T-13 or deadline
   ↓
Event report generated                   FR-RPT-004, FR-RPT-005
   ↓
Evaluation completed                    FR-POS-002, FR-POS-003
   ↓
Evaluation reviewed                     FR-POS-003
   ↓
Event archived (read-only)              T-20, FR-POS-007
   ↓
Available to future organisers           FR-POS-010
```

---

## 4. Step 1: Attendance Finalisation

### 4.1 Rule

**FR-POS-001.** Attendance must be finalised before an event may be marked completed.

### 4.2 What finalisation means

**PROPOSED.** Finalisation is an explicit act that:

1. Closes the attendance window for corrections by ordinary staff
2. Requires the Attendance Staff member to confirm counts
3. Records who finalised and when
4. Flags any discrepancy for review

**PROPOSED.** Where the present count exceeds registered count plus recorded walk-ins,
finalisation is blocked until the discrepancy is explained.

### 4.3 Why an explicit act rather than automatic

An explicit finalisation is a checkpoint. It is where someone confirms "these numbers are what
happened", which is the record the Council will later rely on. Automatic completion at the end of
the window would skip the confirmation that makes the number trustworthy.

---

## 5. Step 2: Event Report

**PROPOSED.** The event report is a generated view, not a separate record. It presents:

| Section | Source |
|---|---|
| Event information | Event record as published |
| Registration summary | Registered count, capacity, cancellations |
| Attendance summary | Present, absent, walk-ins, by window |
| Notification activity | Sent, read, acknowledged |
| Change history | Amendments and updates made |
| Approval history | Offices, decisions, timestamps |
| Evaluation | Structured fields |

**The report is assembled from existing records.** It introduces no new data and cannot disagree
with the underlying records.

---

## 6. Step 3: Structured Evaluation

### 6.1 Required fields

**FR-POS-003** requires separate fields for:

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

**Why the categories are separated.** A single free-text "problems" field cannot be queried. If the
Council wants to know whether attendance problems are recurring, they need attendance problems
recorded separately from communication problems.

**Why the categories match the pain points.** The nine interview pain points that could recur map
onto six of these fields. The categories were chosen from the interview, not invented.

### 6.2 Rules

| ID | Rule |
|---|---|
| FR-POS-002 | The owning Officer completes it |
| FR-POS-004 | Exactly one evaluation per event |
| FR-POS-011 | No automated analysis of content |

**PROPOSED.** Overall assessment uses a simple scale rather than free text, because a scale is
comparable across events and free text is not.

> **OPEN QUESTION:** How should post-event evaluation be completed, and by whom? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-36, and OQ-39 for whether a deadline applies.

### 6.3 Optionality

**PROPOSED.** An evaluation may be submitted with only the problems fields empty, but the overall
assessment and lessons-learned fields are prompted for.

**Rationale.** The fields most likely to be skipped are recommendations and lessons learned. Those
are the two that produce future value. Prompting for them explicitly is more effective than
requiring them, because a required field filled with filler is worse than an optional field left
empty.

---

## 7. Step 4: Archival

### 7.1 Rules

| ID | Rule |
|---|---|
| FR-POS-007 | Archive requires a submitted evaluation |
| FR-POS-008 | An archived event is read-only |

**Archiving without an evaluation is refused.** This is the only enforcement that evaluation
actually happens. A deadline would produce empty evaluations; a hard precondition produces real
ones.

### 7.2 What is retained

**FR-POS-005.** The system retains, permanently for a completed event:

- Event information as published, plus its change history
- Approved proposal and attachments
- Approval chain and full decision history
- Announcements, notifications, and dispatch records
- Participant list with registration status and timestamps
- Attendance records including corrections
- Structured evaluation
- Audit trail for the event

**Nothing is deleted during archival.** Archival is a read-only marking, not a purge.

### 7.3 What archival achieves

| Before | After |
|---|---|
| Files copied manually, unclear what exists | One queryable record per event |
| Pros and cons in someone's memory | Typed, retrievable fields |
| Unknown whether last term's QR failed | Technical problems field, searchable |
| Records scattered across drives | Retained centrally per [DATA-MODEL.md](DATA-MODEL.md) |

**Archival is what makes PP-15 addressable.** Without it, evaluation is written and lost.

---

## 8. Retrieval for Future Organisers

### 8.1 The requirement

**FR-POS-010.** When an officer creates an event of a given type, the system displays the problems
and recommendations from previous events of that type.

**This is the mechanism that addresses PP-15.** Storing evaluations is not enough. If a record is
never surfaced to the person planning the next event, the same problem recurs, which is exactly
what the interview described.

### 8.2 Design

**PROPOSED.** During event creation, once the event type is selected, the system shows:

- Number of previous events of this type
- Recorded problems by category, most recent first
- Recommendations from previous events
- Attendance and registration statistics for comparable past events

**PROPOSED.** This is a read-only prompt, not a gate. The officer may proceed without reading it.

### 8.3 Why a prompt rather than a gate

Requiring an officer to acknowledge previous problems invites automatic acceptance without
reading. A prompt placed at the moment of relevance is more likely to be read, and refusing to
create an event because last term had a problem with parking would be absurd.

### 8.4 Search

**FR-POS-009.** Completed and archived events are searchable by title, type, date range, and
organisation.

---

## 9. Reporting

| Report | Requirement | Purpose |
|---|---|---|
| Event history | FR-RPT-009 | Find a past event |
| Post-event evaluation | `PB-13` | Review what happened |
| Problems and recommendations | FR-RPT-010 | See recurrence across events |
| Evaluation view at creation | FR-POS-010 | Surface relevant past problems |

**FR-RPT-011** prohibits trend analysis and dashboards. The problems report lists records; it does
not chart them.

---

## 10. Audit Requirements

| Action | Audit class |
|---|---|
| Attendance finalised | `AUD-23` |
| Event marked completed | `AUD-20` |
| Evaluation submitted | `AUD-24` |
| Evaluation edited after submission | `AUD-25`, with reason |
| Event archived | `AUD-20` |

Catalogue in [AUDIT-PLAN.md](AUDIT-PLAN.md).

---

## 11. Failure Handling

**Failure:** attendance is not finalised and the event date has passed.
**Handling:** the system reports the event as awaiting finalisation. Officers and Administrators are
notified. Automatic completion is **not** performed, because the finalisation is the confirmation
that makes the count trustworthy.

**Failure:** an evaluation is submitted with most fields empty.
**Handling:** accepted. A partial record with real content is more useful than a complete record of
filler, and requiring all fields produces filler.

**Failure:** an officer wants to amend a submitted evaluation.
**Handling:** permitted with a reason, recorded as `AUD-25`. The original value is retained.
Evaluations are historical statements about what happened and should be correctable, unlike
attendance, which is evidence of a specific fact.

**Failure:** an event is archived without an evaluation.
**Handling:** refused, per **FR-POS-007**.

**Failure:** an event is cancelled before it occurs.
**Handling:** there is no post-event workflow. A cancelled event is terminal per
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md). Registrations are retained and registrants are notified.

---

## 12. Completion Criteria

- Attendance finalisation is explicit and gated before completion
- Evaluation categories match recurring problem types
- No automated analysis is generated
- Archival requires an evaluation
- Previous problems are surfaced at the point of event creation

---

## 13. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| POS-01 | Mark an event complete with attendance not finalised | Refused, FR-POS-001 |
| POS-02 | Finalise attendance, then complete | Allowed |
| POS-03 | Finalise with present count exceeding registered plus walk-ins | Blocked until explained |
| POS-04 | Finalise attendance | Window closed for ordinary correction, finaliser recorded |
| POS-05 | Submit a complete evaluation | Accepted |
| POS-06 | Submit a second evaluation for the same event | Refused, FR-POS-004 |
| POS-07 | Submit an evaluation with most fields empty | Accepted |
| POS-08 | Submit with lessons learned empty | Prompted, accepted if skipped |
| POS-09 | Request automated analysis of evaluation content | No such capability exists, FR-POS-011 |
| POS-10 | Request a trends dashboard | No such capability exists, FR-RPT-011 |
| POS-11 | Archive without a submitted evaluation | Refused, FR-POS-007 |
| POS-12 | Archive with an evaluation | Allowed, read-only |
| POS-13 | Attempt to edit an archived event | Refused, FR-POS-008 |
| POS-14 | Edit a submitted evaluation with a reason | Accepted, original retained, `AUD-25` |
| POS-15 | Search events by type and date range | Correct results |
| POS-16 | Create an event of a type with previous problems | Previous problems displayed |
| POS-17 | Create an event of a type with no history | No prompt shown |
| POS-18 | Proceed without reviewing previous problems | Permitted |
| POS-19 | Generate the event report | Assembled from existing records |
| POS-20 | Cancel an event before it occurs | No post-event workflow, registrants notified |
| POS-21 | Retrieve a cancelled event's registrations | Retained and visible |
| POS-22 | Attendance record for an archived event | Retained, read-only |

---

## 14. Exit Criteria

- OQ-36 and OQ-39 resolved
- Council Secretary confirms the evaluation categories cover the problems they actually encounter
- OQ-26 through OQ-28 resolved, since retention is the substance of PP-14 and PP-15

---

**Related documents:** [POST-EVENT-WORKFLOW.md](POST-EVENT-WORKFLOW.md) ·
[ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) ·
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[DATA-MODEL.md](DATA-MODEL.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)