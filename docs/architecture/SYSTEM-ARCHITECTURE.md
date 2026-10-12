# System Architecture

**Document:** ERNS-ARCH-SYS
**Area:** architecture
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** This document specifies a target state. No capability described here is
> currently in operation. ERNS has no application code, no schema, no interfaces, and no deployed
> environment. See the implementation status section.

---

## Purpose

Describe the structural shape of the Event Registration and Notification System: its layers, the
boundaries between them, the direction of dependency, and the structural decisions that follow from
the two primary functions.

**This document describes structure, not procedure.** How an event is approved is in
`PB-02 Event Approval`. How a deployment is promoted is in `PB-ENG-10 CD/Deployment`. Where both
touch the same ground, this document holds the structural decision and the playbook references it,
per [CONVENTIONS.md](../planning/CONVENTIONS.md) section 11.

---

## Scope

**In scope:** logical layers, component responsibilities, dependency direction, the separation of the
two primary functions, the concurrency and transaction boundaries, and the structural consequences of
the locked decisions.

**Out of scope:** technology selection, in [TECH-STACK.md](TECH-STACK.md); operational process, in the
system playbooks; engineering process, in the engineering playbooks; physical deployment, in
[ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md); external systems, in
[INTEGRATION-BOUNDARIES.md](INTEGRATION-BOUNDARIES.md).

---

## 1. What ERNS Is For

**CONFIRMED.** ERNS has exactly two primary functions.

| # | Primary function | Serves |
|---|---|---|
| 1 | **Event Registration** | Binding one student to one event |
| 2 | **Notification** | Communicating to students reliably, through an authoritative record |

Everything else in [SYSTEM-SCOPE.md](../planning/SYSTEM-SCOPE.md) — event information, approval,
roles, participants, attendance, post-event records, evaluation, audit, reporting, backup — exists to
support one or both of these. **A component that supports neither requires Council justification
before it enters scope**, per `PB-ENG-01 Development` section 1.1.

This is the single most important structural fact about ERNS, because it determines what may be
simplified. Attendance is not a peer of registration; it is the second half of the participation
record that registration begins. Notification is not a peer of email; it is the authoritative
channel that email happens to also use.

---

## 2. Layer Model

**PROPOSED.** Five layers. The dependency rule is one-directional and absolute: **a layer may depend
only on the layer beneath it.**

```
┌───────────────────────────────────────────────────────────────┐
│  L5  Presentation                                              │
│      Student views · Officer views · Attendance scanning view  │
│      No business rules. No data access. Renders state.         │
├───────────────────────────────────────────────────────────────┤
│  L4  Application                                               │
│      Use cases · validation ordering · authorisation checks   │
│      Orchestration. Owns no persistence syntax.               │
├───────────────────────────────────────────────────────────────┤
│  L3  Domain                                                    │
│      Registration rules · lifecycle transitions · notification  │
│      audience resolution · capacity · eligibility              │
│      Pure logic. No I/O. Independently testable.               │
├───────────────────────────────────────────────────────────────┤
│  L2  Persistence                                               │
│      Entities · constraints · transactions · audit writes      │
│      The storage-layer guarantees live here.                   │
├───────────────────────────────────────────────────────────────┤
│  L1  Infrastructure                                            │
│      Database · session store · queue · file storage · mail    │
│      Replaced by adapters so L2 and L3 do not depend on it.    │
└───────────────────────────────────────────────────────────────┘
```

### 2.1 What each layer is forbidden to do

| Layer | MUST NOT |
|---|---|
| L5 Presentation | Decide whether an action is permitted. Hold business rules. Write data. |
| L4 Application | Contain a validation rule that belongs to L3. Construct queries. |
| L3 Domain | Perform I/O. Know that a database exists. Read a session. |
| L2 Persistence | Decide authorisation. Interpret a lifecycle rule. |
| L1 Infrastructure | Contain ERNS business logic of any kind. |

**The L5 prohibition is the enforcement point for NFR-SEC-004.** An interface that hides a control
the server would still permit has produced a false impression of security. Per
[SECURITY-PLAN.md](../planning/SECURITY-PLAN.md) section 4, the authorisation matrix is enforced in
L4, and scenario NFRD-14 verifies it survives a direct request.

**The L3 prohibition is what makes the domain testable.** Registration validation in the locked
order — authenticated, account active, event published, registration open, deadline, eligibility,
capacity, duplicate, required fields — is a pure function of its inputs. Testing it requires no
database, which is why `RV-03` can assert that reordering the steps fails the suite.

### 2.2 The dependency rule and its consequence

Nothing above L1 may reference a specific product. This is why [TECH-STACK.md](TECH-STACK.md) can
record sixteen undecided categories without this document changing: the structure does not depend on
the stack.

It also means a layer-1 failure is contained. If mail is unavailable, L1 raises an error, L2 records
`FAILED` on the email state, and L3 and above are unaffected — which is what `FR-NOT-005` and
scenario `FAIL-02` require.

---

## 3. The Two Primary Functions

### 3.1 Event Registration

**The participation record.** A student is bound to an event, and that binding is the fact
attendance later confirms.

```
Student ──► L5 browse ──► L4 register use case
                              │
                              ├─► L3 validate in the LOCKED ORDER
                              │      1 Authenticated
                              │      2 Account active
                              │      3 Event published
                              │      4 Registration open
                              │      5 Deadline
                              │      6 Eligibility
                              │      7 Capacity
                              │      8 Duplicate
                              │      9 Required fields
                              │
                              ├─► L2 create registration + context snapshot
                              │      inside ONE transaction   ◄── the guarantee
                              │
                              ├─► L2 write audit entry
                              └─► Notification confirmation ──► §3.2
```

**The guarantee lives in L2, not L4.** NFR-INTEG-001 makes `(user_id, event_id)` unique at the
storage layer; NFR-INTEG-007 puts the whole validation inside the registration transaction. The L4
duplicate check produces a readable message; it is not the safeguard. Scenarios `CON-01` and
`CON-02` verify the safeguard, because an application-level check alone fails both.

**Why this matters structurally.** A design that validated capacity in L4 and wrote in L2 could admit
two registrations for the last slot. The transaction boundary is not an optimisation here; it is the
difference between a record that can be trusted and one that cannot.

### 3.2 Notification

**The authoritative communication record.** Three components, in strict order of authority:

| Rank | Component | Authority |
|---|---|---|
| 1 | In-app notification centre | **Source of truth.** `FR-NOT-001` |
| 2 | `NotificationRecipient` in-app state | `CREATED`, `READ`, `ACKNOWLEDGED` — `FR-NOT-002` |
| 3 | Email state | `QUEUED`, `SENT`, `FAILED`, `BOUNCED` — delivery layer only |

```
Author (Officer) ──► L4 compose
                       │
                       ├─► L3 resolve audience ◄── FROZEN at dispatch
                       │      Programme · Year · Organisation · Club
                       │      Registered-only · All students (justified)
                       │      NFR-INTEG-012: materialise as rows
                       │
                       ├─► L2 create Notification + N recipient rows
                       │      ONE recipient per student  FR-NOT-014
                       │
                       └─► L1 queue email delivery
                              │
                              └─► L2 update email state ONLY
                                     in-app record untouched   FR-NOT-005
```

**Four structural consequences, all locked.**

| # | Consequence | Requirement |
|---|---|---|
| 1 | Email failure can never invalidate or downgrade the in-app record | `FR-NOT-005` |
| 2 | The audience is materialised at dispatch, never recomputed on read | `NFR-INTEG-012`, scenario `NOTIF-16` |
| 3 | No `Delivered` or `Opened` state exists, because neither is measurable | `FR-NOT-004`, scenario `NOTIF-17` |
| 4 | Acknowledgement exists only for `IMPORTANT` priority | `FR-NOT-006`, scenario `NOTIF-07` |

**`NOTIF-17` is verified by inspecting the schema.** The requirement is that the state does not
exist, so the test is that the field is absent. No interface behaviour can prove it.

### 3.3 The one direction of flow between them

Registration produces a notification; notifications target registrants. **No notification may create
a registration.** This is why `FR-REG-036` prohibits the Attendance Staff role and the Approver role
from creating any registration, enforced as segregation of duties SD-2.

A notification that mentions an event a student has not registered for is an announcement about an
event, or an announcement. Those are separate entities — `Announcement` and event-scoped
notification — per [DATA-MODEL.md](../planning/DATA-MODEL.md) section 2.

---

## 4. Component Responsibilities

Each component has one purpose and is testable without the others.

| Component | Responsibility | Does NOT |
|---|---|---|
| Identity | Authenticate, hold roles, suspend accounts | Decide event permissions |
| Authorisation | Answer "may this actor do this to this resource" | Render controls |
| Event | Hold event information, enforce lifecycle transitions | Approve or publish |
| Approval | Sequence approver decisions, never auto-advance | Decide publication |
| Registration | The participation record, validation in locked order | Record attendance |
| Attendance | Record presence as a separate fact | Alter registration status |
| Notification | Compose, target, dispatch, track in-app state | Modify event content |
| Audit | Append-only record of every state change | Be modified or deleted |
| Reporting | Read models over the above | Write to any of them |
| Scheduling | Time-driven lifecycle transitions | Decide a business rule |

**Reporting is read-only by construction.** NFR-MAINT-006 forbids manual database intervention to
correct a record the application lets an operator change, so every correction path must exist in the
application. Reporting has no write path at all.

**Audit is append-only by construction.** `NFR-AUD-005` requires that no means of modifying or
deleting an audit entry exists. Scenario `RV-34` verifies this by confirming no such endpoint or
method exists — a control that is hard to write as a positive test.

---

## 5. Structural Decisions

### SD-A Validation order is a domain concern

The nine-step order is enforced in L3, not expressed as a sequence of interface checks.

**Why it cannot be otherwise.** If order were a presentation concern, a direct request could arrive
at step 7 having skipped steps 1 to 6, and a student who is both ineligible and already registered
would receive whichever message the interface happened to produce first. `FR-REG-005` and scenario
`RV-03` require the order to be observable and tested.

### SD-B Lifecycle transitions are a closed set

The twenty transitions `T-01` to `T-20` in [EVENT-LIFECYCLE.md](../planning/EVENT-LIFECYCLE.md) are
the only permitted state changes. `NFR-INTEG-010` requires every invalid transition to be rejected.

**Why a closed set.** An open-ended status field permits an event to become `PUBLISHED` without
approval, which is threat `TH-01` in [SECURITY-PLAN.md](../planning/SECURITY-PLAN.md). The set is
closed precisely so that `FR-APR-011` can verify the chain at publication rather than trusting that
nothing skipped it.

### SD-C Attendance is a fact, not a registration status

Attendance references a registration. It never alters one.

**Why.** `FR-ATT-018` requires attendance to create no registration side effect, and scenario `RV-25`
verifies it. Were attendance a registration status, a walk-in would either require inventing a
registration or corrupt the participation record. `PB-11 Attendance Backup` records a walk-in as a
separate count with a reason, which is the structural consequence.

### SD-D Student context is snapshotted at registration

`NFR-INTEG-009` preserves programme, year level, and organisation as captured at registration time. A
later profile change does not rewrite history.

**Why.** A registration list read six months later must show who the student was when they
registered. Without the snapshot, a programme change silently rewrites who attended what, and the
participation record stops being evidence.

### SD-E Audit write failure refuses the state change

Scenario `FAIL-05`: if the audit write fails, the state change is refused.

**Why this is the strict option.** The alternative — committing the change and logging the audit
failure — produces an unaudited state change, which defeats the audit trail's entire purpose. A
registration that cannot be audited is a registration nobody can trust, and ERNS's value is
trustworthy records. Strictness is the correct trade here.

### SD-F Segregation of duties is enforced structurally

| Rule | Requirement | Consequence |
|---|---|---|
| SD-1 | The final approver of an event cannot publish it | `FR-APR-012`, scenario `RV-27` |
| SD-2 | Attendance Staff and Approver cannot create registrations | `FR-REG-036`, scenario `AUTH-05` |
| SD-3 | An Approver cannot be Event Officer for the same event | `FR-USR-011`, scenario `RV-35` |
| SD-4 | Administrator overrides are permitted but attributed and reasoned | `NFR-AUD-004`, `AUD-14` |

**These are not interface restrictions.** SD-2 in particular is the rule most likely to be assumed
rather than enforced, because an Attendance Staff member has a legitimate reason to be looking at a
participant list and creating a registration looks like a natural extension of that. Scenario
`AUTH-05` exists to catch exactly that assumption.

---

## 6. Concurrency and Transaction Boundaries

`NFR-INTEG-004` requires a transaction boundary around any operation that creates a record together
with its dependents. This document defines where those boundaries sit.

| Operation | Boundary | Prevents | Scenario |
|---|---|---|---|
| Registration | Validation and write in one transaction | Two registrations for the last slot | `CON-01` |
| Registration | Unique `(user_id, event_id)` | Duplicate registration | `CON-02`, `RV-02` |
| Attendance | Unique on registration reference | Duplicate attendance | `CON-03` |
| Capacity change | Refuse below registered count | Registered count exceeding capacity | `CON-04` |
| Notification dispatch | Notification and recipients created together | Orphan recipient rows | `NFR-INTEG-011` |
| Approval decision | Step locked while being decided | Two decisions on one step | `CON-07` |
| Any state change | Audit entry written with the change | Unaudited state change | `FAIL-05` |

**`CON-01` and `CON-03` are the tests that justify this section.** Application-level checks pass
both when the requests are serialised and fail both when they are not. Only a real storage layer
against concurrent clients demonstrates the guarantee.

**Isolation level is an open technical decision,** constrained by C-02 in
[TECH-STACK.md](TECH-STACK.md) and recorded there as part of OQ-44. This document states that a
serialisable or repeatable-read boundary is required; it does not name a mechanism.

---

## 7. Data Structure Boundary

[DATA-MODEL.md](../planning/DATA-MODEL.md) is a conceptual model of fifteen locked entities. This
section states only what the architecture adds.

| Concern | Owner | Notes |
|---|---|---|
| Entity meaning, cardinality, integrity intent | `DATA-MODEL.md` | Conceptual, no SQL |
| Physical schema, indexes, partitioning | `PB-ENG-14 Database Changes` | Not yet designed |
| Transaction boundaries | This document, section 6 | |
| Retention periods | `OQ-26`, `OQ-27`, `OQ-28` | **Unresolved.** No policy exists |
| Backup and restoration | `PB-ENG-18 Backup and Recovery` | **Not implemented** |

**Nothing in this document merges, splits, or renames any of the fifteen entities.** Per
[CONVENTIONS.md](../planning/CONVENTIONS.md) section 5, entity names in prose match
`DATA-MODEL.md` exactly. An architectural convenience is not a reason to restructure the model; that
is a change under `PB-ENG-20 Change Management`.

---

## 8. Deployment Shape

**NOT DECIDED.** Whether ERNS runs as a single process or as separated services depends on OQ-30 and
OQ-31, and this document does not assume either.

**PROPOSED.** The layer model above is compatible with both, which is why it is stated structurally:

| If | Then |
|---|---|
| A single process | L1 through L5 are one deployable; the layer boundaries remain internal contracts |
| Separated services | L3 is shared, L4 splits by use case, and the boundaries become network contracts requiring their own failure handling |

**Either way, the layer-1 adapter boundary is required**, so that replacing a component does not
require rewriting the domain.

Physical layout, environments, and promotion are in [ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md).

---

## 9. Implementation Status

> **NOT YET IMPLEMENTED.** No layer described here exists. The table records what would exist.

| Layer or decision | State |
|---|---|
| L5 Presentation | Not implemented — no framework selected, OQ-41 |
| L4 Application | Not implemented — no backend approach selected, OQ-42 |
| L3 Domain | Not implemented. Rules are specified in the workflow documents only |
| L2 Persistence | Not implemented — no engine selected, OQ-44. No schema exists |
| L1 Infrastructure | Not implemented — nothing provisioned, OQ-30 |
| SD-A to SD-F | Specified, not enforced. Scenario identifiers exist; the tests do not |
| Transaction boundaries | Specified in section 6, not implemented |
| Audit append-only property | Specified, not implemented. **No protection exists today** |

**Every scenario identifier cited in this document — `CON-01`, `NOTIF-16`, `FAIL-05`, `RV-34`,
`AUTH-05` and the rest — names a scenario that does not yet exist as executable code.** They are
specified in [TESTING-STRATEGY.md](../planning/TESTING-STRATEGY.md) and will be implemented.

---

## 10. Validation Approach

A structural defect shows up as a specific test failure. Each decision in section 5 names the
scenario that detects it.

| Structural decision | Detected by |
|---|---|
| SD-A validation order | `RV-03`, `TST-03` |
| SD-B closed transition set | `NFRD-09`, `TST-10` |
| SD-C attendance as a fact | `RV-20`, `RV-22`, `RV-23`, `RV-25` |
| SD-D context snapshot | `RV-05`, `NFRD-13` |
| SD-E audit failure refuses the change | `FAIL-05`, `TST-07` |
| SD-F segregation of duties | `RV-27`, `RV-35`, `AUTH-05`, `TST-05` |
| Transaction boundaries | `CON-01` to `CON-07`, `TST-02`, `TST-09` |
| In-app authoritative | `RV-16`, `NOTIF-09` |
| No `Delivered` or `Opened` | `NOTIF-17`, `TST-04` |
| Audience frozen at dispatch | `RV-17`, `NOTIF-16`, `TST-08` |
| Server-side authorisation | `AUTH-01` to `AUTH-15`, `NFRD-14` |

**`TST-01` to `TST-10` in [TESTING-STRATEGY.md](../planning/TESTING-STRATEGY.md) are meta-tests.**
They verify that the suite would actually fail if each structural decision were reversed. A suite
that cannot fail on `TST-03` is not providing assurance that validation order is enforced.

---

## 11. Open Questions

| Question | Structural impact | Who can answer |
|---|---|---|
| [OQ-42](../planning/OPEN-QUESTIONS.md) Backend approach | Whether layers 4 and 5 are one process or separate services | Council Secretary, IT |
| [OQ-44](../planning/OPEN-QUESTIONS.md) Data store engine | Whether the layer 2 guarantees in section 6 are achievable | IT |
| [OQ-30](../planning/OPEN-QUESTIONS.md) Deployment platform | Section 8 shape | IT |
| [OQ-55](../planning/OPEN-QUESTIONS.md) Staging environment | Whether section 6 boundaries can be rehearsed before production | IT |
| [OQ-01](../planning/OPEN-QUESTIONS.md) Approval authority | Whether SD-B needs additional transitions for a multi-office chain | Council Secretary, Dean, Student Affairs |
| [OQ-10](../planning/OPEN-QUESTIONS.md) Cancellation and slot release | Whether the uniqueness constraint in §3.1 stays whole or becomes partial | Council Secretary |
| [OQ-56](../planning/OPEN-QUESTIONS.md) Email-state domain | The `email_state` enumeration in layer 2 | Council Secretary |

**OQ-01 is the one with the widest structural reach.** If approval requires several offices, the
transition set in SD-B needs a parallel-branch structure it does not currently have. The twenty
transitions assume a linear chain.

---

## 12. Completion Criteria

This document is BASELINE when:

- The layer model and its dependency rule are recorded
- Each layer's prohibitions are explicit
- Both primary functions are traced from author to durable record
- Every structural decision names the scenario that detects its violation
- Transaction boundaries are stated per operation
- No technology is named and no deployment shape is assumed
- Implementation status distinguishes specified from existing

---

## 13. Exit Criteria

- OQ-30, OQ-42, and OQ-44 answered
- OQ-01 answered, and the transition set in SD-B confirmed adequate
- OQ-10 answered, and the uniqueness constraint in §3.1 confirmed
- Layers implemented and the scenarios in section 10 executing
- Section 9 removed, once it ceases to be true that nothing is implemented

---

**Related documents:** [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) ·
[TECH-STACK.md](TECH-STACK.md) ·
[SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md) ·
[ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md) ·
[INTEGRATION-BOUNDARIES.md](INTEGRATION-BOUNDARIES.md) ·
[DATA-MODEL.md](../planning/DATA-MODEL.md) ·
[EVENT-LIFECYCLE.md](../planning/EVENT-LIFECYCLE.md) ·
[REGISTRATION-WORKFLOW.md](../planning/REGISTRATION-WORKFLOW.md) ·
[NOTIFICATION-WORKFLOW.md](../planning/NOTIFICATION-WORKFLOW.md) ·
[CONVENTIONS.md](../planning/CONVENTIONS.md) ·
[OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md)