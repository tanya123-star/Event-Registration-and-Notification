# Problem Analysis

**Document:** ERNS-PROB
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Analyse the current event process as reported in the interview, identify root causes beneath the
fifteen observed pain points, and state which of them the Event Registration and Notification
System can address and which it cannot.

This document is the upstream source for [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md). No
requirement exists in [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) without a trace
back to a `PP-NN` pain point or to an explicitly recorded non-pain-point driver.

---

## Scope

**In scope:** the fifteen interview pain points, root-cause analysis, the core problem
statement, and disposition of each pain point.

**Out of scope:** solutions, which are in [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) and the functional
requirements; verification, which is in [TESTING-STRATEGY.md](TESTING-STRATEGY.md).

---

## 1. Core Problem Statement

**CONFIRMED.** The organisation lacks a centralised system for communicating event information
and managing student registration.

The consequences of that absence are:

- Fragmented dissemination across multiple informal channels
- Announcements that are posted but not received, read, or understood
- Dependence on club officers as an uncontrolled intermediary
- Manual, error-prone registration and attendance procedures
- Inconsistent event information
- Difficulty maintaining reliable event participation records

### What the system is not for

**CONFIRMED.** ERNS is not an event calendar. A calendar would address visibility of dates and
would not address registration, notification delivery, or participation records.

**CONFIRMED.** ERNS is not a generic event-management platform. Its two primary functions are
Event Registration and Notification. Everything else supports those two.

---

## 2. Current Process

```
Council Meeting
      ↓
Written Proposal
      ↓
Approval / Revision
      ↓
Council Disseminates Information
      ↓
Club Officers
      ↓
Members / Students
      ↓
Event Day Registration / Attendance
      ↓
Large events → QR Code
Small events → Manual Sign-In
      ↓
Post-Event Record-Keeping
      ↓
Backup Files + Review of Pros/Cons
```

**CONFIRMED.** The workflow is linear and approval-gated. The problem is not the approval gate
itself; it is that communication and registration are distributed across multiple manual channels
alongside it.

**Key observation.** The diagram has no feedback edge. Nothing in the current process lets a
future organiser discover what went wrong in a past event, which is why
[P15 — Difficulty Learning from Previous Events](#p15) recurs rather than being resolved.

---

## 3. Pain Point Analysis

### Distribution Channels

Pain points 1 through 4 all describe the same underlying failure: there is no authoritative
notification path from Council to Student.

| ID | Pain point | Root cause | Consequence |
|---|---|---|---|
| PP-01 | Difficulty disseminating event information | No single authoritative channel; officers and chats are the effective channel | Information exists but does not reliably reach intended participants |
| PP-02 | Information not always received or read | No delivery record, so nothing distinguishes "sent" from "seen" | No way to know whether students know about an event |
| PP-03 | Dependence on club officers | Officers are the only human relay for most students | Delay, omission, and no accountability |
| PP-04 | Multiple communication channels | No agreed channel of record | Inconsistent messages; no single version |

**Root cause RC-1: absence of an authoritative notification channel with an addressable audience.**

**Root cause RC-2: absence of a delivery record.** Because no system recorded what was sent to
whom, the organisation could not tell whether a failure to inform was a sending failure or a
reading failure. These have different fixes, and the current process cannot distinguish them.

### Approval

| ID | Pain point | Root cause | Consequence |
|---|---|---|---|
| PP-05 | Manual, time-consuming approval | No tracking of where an event sits between offices | Events stall; status is only known by asking |

**Root cause RC-3: no visible approval state.** The interview reports events moving between
Council, Dean, Student Affairs, and Security. Without a record of the current step, an event
that is idle at Dean's office is indistinguishable from one that was never submitted.

### Attendance

| ID | Pain point | Root cause | Consequence |
|---|---|---|---|
| PP-06 | QR attendance technical problems | Configuration and email issues in the QR tool | Attendance fails at the worst moment |
| PP-07 | Manual attendance for small events | Handwritten sheets | Slow, unstructured |
| PP-08 | Long queues | Serial manual processing | Attendance is a bottleneck at event start |
| PP-12 | Duplicate or inaccurate attendance records | Handwritten records are self-reported and unenforced | Attendance data cannot be trusted as evidence |

**Root cause RC-4: attendance is not bound to registration.** Handwritten sheets record a name,
not a verified person-event relationship. This is what makes duplicates possible and what makes
the record unreliable.

**Root cause RC-5: no fallback path is designed in.** The interview notes a backup method is
sometimes prepared, implying it is improvised rather than designed.

### Information Quality

| ID | Pain point | Root cause | Consequence |
|---|---|---|---|
| PP-09 | Incomplete understanding of event mechanics | Mechanics, programme flow, and requirements are held informally or verbally | Participants do the wrong thing |
| PP-10 | Information dissemination errors | No single source of truth for event detail | Contradictory information across channels |
| PP-11 | Missed announcements affect participation | No delivery record, so gaps are invisible | Participants arrive without requirements, materials, or schedule |

**Root cause RC-6: event information has no authoritative home and no required-field discipline.**

### Participant and Scheduling Constraints

| ID | Pain point | Root cause | Consequence |
|---|---|---|---|
| PP-13 | Working student attendance challenges | Fixed attendance period assumed | Working students cannot attend, so participation is unfairly limited |

**Root cause RC-7: attendance window is a fixed assumption rather than a configurable
parameter.**

### Records and Learning

| ID | Pain point | Root cause | Consequence |
|---|---|---|---|
| PP-14 | Record backup and maintenance | Records are files on a shared drive, copied manually | Loss risk; no verified backup |
| PP-15 | Difficulty learning from previous events | Post-event information is unstructured and not retained in a reviewable form | The same problems recur |

**Root cause RC-8: post-event knowledge is not structured or retained.**

---

## 4. Root Cause Summary

| ID | Root cause | Pain points | Addressed by |
|---|---|---|---|
| RC-1 | No authoritative notification channel with an addressable audience | PP-01, PP-03, PP-04 | Notification module |
| RC-2 | No delivery record | PP-02, PP-11 | In-app notification centre with read state |
| RC-3 | No visible approval state | PP-05 | Approval chain with visible current step |
| RC-4 | Attendance not bound to registration | PP-07, PP-12 | Attendance requires a Registration record |
| RC-5 | No designed attendance fallback | PP-06, PP-08 | Staff-assisted attendance as a first-class path |
| RC-6 | Event information has no authoritative home | PP-09, PP-10, PP-11 | Event record with required-field discipline |
| RC-7 | Fixed attendance window | PP-13 | Configurable attendance windows |
| RC-8 | Unstructured post-event knowledge | PP-15 | Structured EventEvaluation |

---

## 5. Disposition of Each Pain Point

| ID | Pain point | Disposition | Rationale |
|---|---|---|---|
| PP-01 | Difficulty disseminating information | Directly solved | Authoritative channel with addressable audience |
| PP-02 | Information not received or read | Partially supported | Read state measurable. Comprehension is not. Acknowledgement records receipt, not understanding |
| PP-03 | Dependence on club officers | Directly solved | Removes the relay from the critical path. Officers remain as reinforcement only |
| PP-04 | Multiple communication channels | Partially supported | The system becomes the channel of record. Informal channels cannot be prohibited |
| PP-05 | Manual, time-consuming approval | Partially supported | Visibility and auditability solved. The offices' own internal timelines remain outside ERNS |
| PP-06 | QR technical problems | Partially supported | A designed fallback removes the dependency. Root-cause configuration issues remain a vendor concern |
| PP-07 | Manual attendance | Directly solved | Small events use staff-assisted digital attendance |
| PP-08 | Long queues | Partially supported | QR reduces queueing substantially. Serial bottleneck shifts to devices rather than disappearing |
| PP-09 | Incomplete understanding of mechanics | Partially solved | Mechanics become required structured fields. Understanding still depends on the student reading them |
| PP-10 | Information dissemination errors | Directly solved | Single authoritative record with a change history |
| PP-11 | Missed announcements | Partially supported | Read state makes gaps visible. ERNS cannot force attention |
| PP-12 | Duplicate or inaccurate attendance | Directly solved | Unique constraint on the registration reference |
| PP-13 | Working student attendance | Directly solved | Configurable windows |
| PP-14 | Record backup and maintenance | Partially supported | Automated backup is proposed. Retention policy is unresolved, OQ-26 through OQ-28 |
| PP-15 | Difficulty learning from previous events | Partially supported | Structured evaluation is stored and retrievable. Nothing enforces that anyone reads it |

### Partial-solution reasoning

Six pain points are marked partially supported. In each case the system removes the *structural*
cause but not the *behavioural* one. ERNS cannot make a student read a notification, cannot make
an approver decide quickly, and cannot make an organiser review last year's evaluation. Claiming
otherwise would be a false promise in a system whose entire value is trustworthy records.

### Pain points NOT addressed by ERNS

| Concern | Why out of scope |
|---|---|
| Student attention span and habits | Not a software problem |
| Office turnaround time | Organisational, not technical |
| Whether students read long-form mechanics | Accessibility of the content is a writing problem |
| Budget for devices or connectivity | Infrastructure assumption, OQ-31 |
| Whether club officers relay messages | Outside system control |

---

## 6. Priority

Ordered by the root cause they address and by how many pain points each unblocks.

| Rank | Root cause | Rationale |
|---|---|---|
| 1 | RC-1 Notification channel | Addresses four pain points and is one of the two primary functions |
| 2 | RC-4 Attendance bound to registration | Enables trust in participation records and fixes the duplicate problem |
| 3 | RC-6 Authoritative event information | Prerequisite for meaningful registration and notification |
| 4 | RC-2 Delivery record | Turns an invisible failure into a measurable one |
| 5 | RC-3 Approval visibility | Removes event-stalling ambiguity |
| 6 | RC-5 Attendance fallback | Reliability improvement |
| 7 | RC-7 Configurable windows | Fairness improvement for working students |
| 8 | RC-8 Structured learning | Long-term value, no immediate operational effect |

---

## 7. Assumptions

| ID | Assumption | Validation |
|---|---|---|
| AS-06 | Event-day venue connectivity is adequate for QR | Confirm with a venue walkthrough. If false, offline scanning becomes justified |
| AS-07 | Students are primarily mobile | OQ-34 |

---

## 8. Open Questions

Pain points that cannot be fully analysed without stakeholder input:

| ID | Question | Blocks |
|---|---|---|
| OQ-01 through OQ-04 | Approval authority and thresholds | PP-05 root-cause detail. The pain point is confirmed; the remedy is not |
| OQ-07 | Registration identity strength | PP-12 remedy strength |
| OQ-13 | Notification mechanism | PP-01, PP-02, PP-11 remedy design |
| OQ-22 | Working student accommodation | PP-13 remedy design |

---

## 9. Test Scenarios

This is an analysis document, so its validation is documentary. These checks confirm the analysis
is complete and traceable.

| ID | Scenario | Expected |
|---|---|---|
| PROB-01 | All fifteen interview pain points appear in section 3 or 5 | Confirmed, no additions |
| PROB-02 | Every pain point has a root cause | Confirmed, RC-1 through RC-8 |
| PROB-03 | Every root cause maps to at least one pain point | Confirmed |
| PROB-04 | Every pain point has a disposition and rationale | Confirmed |
| PROB-05 | No pain point is claimed fully solved when only partially supported | Confirmed, six marked partial |
| PROB-06 | Every root cause appears in at least one functional requirement | Verified in TRACEABILITY-MATRIX.md |
| PROB-07 | The core problem statement does not describe an event calendar | Confirmed |

---

## 10. Completion Criteria

- All fifteen pain points analysed with root cause and disposition
- Root causes consolidated to eight, each with a named remedy
- Partial solutions are stated as partial
- Non-addressable concerns are explicitly excluded

---

## 11. Exit Criteria

- Council Secretary confirms the pain points reflect the current process accurately
- OQ-13 and OQ-22 answered, because they change the remedy design for two pain points
- No requirement exists in FUNCTIONAL-REQUIREMENTS.md without a trace to this document

---

**Related documents:** [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) ·
[TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) ·
[SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[STAKEHOLDERS.md](STAKEHOLDERS.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)