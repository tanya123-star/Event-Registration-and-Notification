# Playbook 07 — Notification Targeting

**Playbook:** PB-07
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Select the correct audience for a notification, so that information reaches the people who need it
without reaching everyone else.

Targeting is what makes the notification channel worth opening. The interview's problem was not that
information was unavailable; it was that information arrived through noisy channels and students
stopped paying attention. Sending an IT competition notice to the entire student body reproduces
exactly that failure.

---

## Scope

**In scope:** audience types, criteria combination, resolution, pre-dispatch verification, and
frozen audience definition.

**Out of scope:** message composition, `PB-06 Notification Publishing`; delivery states,
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md).

---

## Trigger

An authorised user is composing a notification and must decide who receives it.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Event Officer | Selects audiences for events they own |
| Administrator | Selects any audience, including system-wide |
| System | Resolves the audience against the student roster and freezes the result |

---

## Preconditions

- The user is composing a notification
- The student roster is populated with programme, year level, and organisation
- Students holding no matching criteria are excluded automatically

---

## Audience Types

| Type | Requirement | Selects |
|---|---|---|
| All students | FR-NOT-017 | Every active Student |
| Programme | FR-NOT-018 | Students whose programme matches |
| Year level | FR-NOT-019 | Students whose year level matches |
| Organisation | FR-NOT-020 | Members of an organisation |
| Club | FR-NOT-020 | Members of a club |
| Registered-only | FR-NOT-021 | Students holding a `REGISTERED` registration for the event |

**These six types are the complete targeting model.** No arbitrary individual targeting, no custom
rules, no saved segments.

### Why no saved segments

A saved segment looks useful and creates a maintenance surface. It also becomes stale in a way
nobody notices, and it obscures who actually received a notification. Six explicit criteria are
auditable and sufficient for a single student organisation.

---

## Main Workflow

1. Officer reaches the audience selection step
2. System offers the six audience types
3. Officer selects one, or combines several
4. For each criterion, officer selects the value or values
5. System resolves the audience against the roster
6. System displays the resolved recipient count
7. **PROPOSED.** For combined criteria, system displays a breakdown showing how many students each
   filter removed
8. Officer reviews the count
9. If the count is wrong, officer adjusts and re-resolves
10. Officer confirms the audience
11. System freezes the audience definition on the notification
12. Dispatch proceeds per `PB-06`

---

## Combining Criteria

**FR-NOT-022.** Criteria combine conjunctively, meaning all selected criteria must match.

### Worked examples

**IT Competition, targeting two programmes**

```
Criteria:  Programme ∈ {BSIT, BSCS}
Result:    Students in BSIT or BSCS
Count:     214
```

The interview gave this example directly. Both programmes are selected within a single criterion
rather than as two separate criteria, because the intent is a union of programmes, not an
intersection.

**Organisation general assembly, targeting one organisation**

```
Criteria:  Organisation = Student Council
Result:    Student Council members
Count:     38
```

**IT Competition, targeting third-year BSIT only**

```
Criteria:  Programme = BSIT
           Year level = 3
Result:    Third-year BSIT students
Count:     57
```

Both criteria must match. This is an intersection.

**Registration reminder, targeting non-registrants**

```
Criteria:  Event = IT Competition 2026
           Target audience = BSIT, BSCS
           Exclude = registered participants
Result:    BSIT and BSCS students who have not registered
```

**The exclusion mechanism is the one complication.** A reminder is useful only to students who have
not registered, but the six types have no exclusion operator.

**PROPOSED.** Registered-only is complemented by an implicit "target audience minus registrants"
mode for the Registration reminder type specifically. It is offered only where the notification type
makes it meaningful, not as a general targeting feature. If the Council prefers simplicity, the
reminder goes to the whole target audience and states the deadline.

---

## Audience Selection by Notification Type

**PROPOSED.** The system recommends an audience per type. The officer may override.

| Type | Recommended audience | Why |
|---|---|---|
| New Event | Target audience | Everyone who could attend |
| Registration open | Target audience | Everyone eligible |
| Registration reminder | Target audience, minus registrants | A registered student does not need reminding |
| Registration confirmation | The registering student only | Automatic, not officer-composed |
| Event reminder | Registrants plus target audience | Broad, because the event may interest non-registrants |
| Event update | Registrants and target audience | Those who committed, plus those who may attend |
| Registration closing | Target audience, registrants | Before the deadline |
| Event cancellation | Registrants plus target audience | Maximum reach, given the harm of arriving to a cancelled event |
| Important announcement | Officer-selected | Depends entirely on content |
| Approval required | The assigned approver only | Automatic |

**Recommended, not enforced.** An officer may target an event update at registered participants
only, which is often correct when a venue change affects only committed attendees.

---

## Registered-only as the Default for Changes

**PROPOSED.** Venue, schedule, and materials changes default to registrants and the target audience,
with an easy shift to registrants only.

A change matters to people who committed to attend. Targeting it at the whole audience adds noise
without adding relevance, and repeated noise is what teaches students to ignore event updates.

---

## Alternative Paths

### The audience resolves to zero students

Dispatch is refused, per FR-NOT-024. The officer checks for a misspelled programme name or a year
level that does not exist. An empty audience is nearly always an input error.

### The audience resolves to a suspiciously large count

The officer investigates the breakdown before dispatching. This is the last point at which
preventing an over-broad notification is simple.

### A student matches several criteria

They receive **one** notification, per FR-NOT-014. The resolution returns a distinct student set.

### The roster changes after dispatch

The frozen audience definition is used. A student who joins the organisation afterwards does not
retroactively receive the notification, and a student who leaves does not have the record altered.

### No student matches because programme naming differs

**Assumption AS-11.** Programme names in ERNS match the school's official designations. If they do
not, every criterion returns zero or wrong results. This must be validated against the real roster
before the first targeted notification, and is the most likely silent failure in this playbook.

### A student is suspended

Excluded from resolution. The registration and notification history is retained regardless, per
FR-USR-009.

### An officer wants to notify only one person

Not supported. There is no individual targeting.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| At least one criterion selected | FR-NOT-016 | Select an audience |
| Criterion values selected | — | Select at least one value |
| Resolved audience non-empty | FR-NOT-024 | This audience matches no students |
| One recipient per student | FR-NOT-014 | No duplicates |
| Evaluation at dispatch time | FR-NOT-025 | Audience uses current roster data |
| Definition frozen after dispatch | FR-NOT-013 | Audience cannot be re-evaluated |

---

## Data Affected

| Entity | Effect |
|---|---|
| Notification | Audience definition stored, frozen |
| NotificationRecipient | Created per resolved student at dispatch |
| StudentProfile | Read for resolution |

**No targeting data is written at selection time.** Resolution happens at dispatch, and the result is
recorded on the notification.

---

## Notifications

None. Targeting is a step within composing a notification, not an action that notifies anyone.

An officer may be notified if a targeted dispatch they initiated fails.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| Notification dispatched to a targeted audience | `AUD-17` | Full audience definition, criteria used, resolved count |

The audience definition recorded is the criteria as issued, plus the resolved count. Storing only
the count would not allow an audit to answer "was this correct" months later.

---

## Failure Handling

**Failure:** criteria resolve to zero students.
**Handling:** dispatch is refused. The officer checks programme naming against the roster first,
since AS-11 predicts that as the most likely cause.

**Failure:** the officer selects an over-broad audience.
**Handling:** prevented by the pre-dispatch count. If dispatched anyway, a corrective notification
is issued and the original is retained.

**Failure:** the audience definition is wrong because the roster is wrong.
**Handling:** the audit entry records what was selected and how many resolved, which shows whether
the fault was selection or data. Correcting the roster does not alter past dispatch records.

**Failure:** a student's programme data is wrong, excluding them from a notification.
**Handling:** the student may be missed. This is a data-quality problem, not a targeting problem,
and is why the roster requires maintenance responsibility.

**Failure:** the roster is large and resolution is slow.
**Handling:** resolution is bounded by population size, not history. Slow resolution indicates a
query problem, not a volume problem.

---

## Completion Criteria

- An audience is selected from the six defined types
- The resolved count was displayed and accepted by the officer
- The definition is frozen on the notification
- One recipient record exists per resolved student

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBT-01 | Happy path | Programme targeting | Correct recipients resolved |
| PBT-02 | Happy path | Multiple programmes in one criterion | Union of both programmes |
| PBT-03 | Happy path | Programme and year level combined | Intersection |
| PBT-04 | Happy path | Registered-only targeting | Only registrants |
| PBT-05 | Happy path | Organisation targeting | Only organisation members |
| PBT-06 | Happy path | All students | Entire active population |
| PBT-07 | Duplicate | Student matches two criteria | One recipient record |
| PBT-08 | Duplicate | Same student registered and in the target programme | One notification |
| PBT-09 | Boundary | Exactly one student resolved | Permitted |
| PBT-10 | Boundary | Zero students resolved | Refused, FR-NOT-024 |
| PBT-11 | Boundary | Entire student body | Permitted |
| PBT-12 | Invalid | No criterion selected | Refused |
| PBT-13 | Invalid | Criterion with no values | Refused |
| PBT-14 | Failure | Programme name does not match the roster | Zero resolved, prompt shown |
| PBT-15 | Failure | Roster changes after dispatch | Frozen definition used |
| PBT-16 | Failure | Suspended student | Excluded from resolution |
| PBT-17 | Unauthorized | Individual targeting attempted | No such capability exists |
| PBT-18 | Boundary | Registration reminder excluding registrants | Only non-registrants, where enabled |
| PBT-19 | Failure | Over-broad audience detected at the count | Officer adjusts before dispatch |
| PBT-20 | Unauthorized | Student composes a notification | Refused |

---

## Exit Criteria

- The audience is correct and was verified before dispatch
- The definition is auditable
- Dispatch proceeds per `PB-06 Notification Publishing`

---

**Related documents:** [PB-07 Notification Targeting](PB-07-NOTIFICATION-TARGETING.md) ·
[PB-06 Notification Publishing](PB-06-NOTIFICATION-PUBLISHING.md) ·
[PB-08 Event Reminder](PB-08-EVENT-REMINDER.md) ·
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md)