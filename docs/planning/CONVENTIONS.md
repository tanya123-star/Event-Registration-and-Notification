# Conventions

**Document:** ERNS-CONV
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01

---

## Purpose

This document defines the conventions every other ERNS document follows. It exists so that
status labels, requirement identifiers, and document structure stay consistent across the
planning, playbook, and architecture document sets.

Read this document before writing or reviewing any other ERNS documentation.

---

## Scope

**In scope:** status labels, identifier schemes, document header format, cross-reference
format, terminology, and how unresolved decisions are recorded.

**Out of scope:** system behaviour, which is documented in
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) and the playbook sets.

---

## 1. Document Status Labels

Every planning and architecture document MUST label each significant claim with one of four
statuses.

| Label | Meaning | Basis |
|---|---|---|
| **CONFIRMED** | Directly supported by the interview or an explicit stakeholder instruction. | Interview finding, or Section 9 of the governance prompt. |
| **PROPOSED** | A recommended design decision that has not yet been ratified. | Architect recommendation with stated rationale. |
| **ASSUMPTION** | A working premise adopted so work can proceed, pending confirmation. | Analyst inference. Carries a named validation method. |
| **OPEN QUESTION** | An unresolved decision that blocks or shapes downstream work. | Requires a named stakeholder answer. |

### Rules

1. An **ASSUMPTION** MUST NOT be restated as a **CONFIRMED** requirement in any downstream
   document.
2. Every **ASSUMPTION** MUST have a corresponding entry in
   [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) identifying who can resolve it.
3. Every **OPEN QUESTION** MUST be registered in
   [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md), which is the canonical registry. Inline
   `> OPEN QUESTION:` blockquotes are pointers to that registry, never the only record.
4. Promoting a status from PROPOSED or ASSUMPTION to CONFIRMED requires a documented decision
   from the named stakeholder.

### Inline format

```markdown
**CONFIRMED.** In-app notification centre is the source of truth for student notifications.

**PROPOSED.** Reminder notifications are dispatched 24 hours before event start.

> **OPEN QUESTION:** Should the reminder lead time be 24 or 48 hours? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-16.
```

Blockquote form for anything that blocks work:

```markdown
> **OPEN QUESTION:** Which offices have final approval authority? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-01.
```

---

## 2. Identifier Schemes

All identifiers are stable. Once issued, an identifier is never reused or renumbered.

### Functional requirements

Format `FR-<MODULE>-<NNN>`, uppercase, zero-padded to three digits.

| Module code | Area | Reference doc |
|---|---|---|
| `EVT` | Event information | [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) |
| `APR` | Approval | [APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) |
| `REG` | Registration | [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) |
| `NOT` | Notification | [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) |
| `ATT` | Attendance | [ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) |
| `POS` | Post-event records | [POST-EVENT-WORKFLOW.md](POST-EVENT-WORKFLOW.md) |
| `USR` | User and role management | [USER-ROLES.md](USER-ROLES.md) |
| `RPT` | Reporting | [TESTING-STRATEGY.md](TESTING-STRATEGY.md) |

### Non-functional requirements

Format `NFR-<CATEGORY>-<NNN>`.

| Category | Area |
|---|---|
| `SEC` | Security |
| `PERF` | Performance |
| `USAB` | Usability |
| `A11Y` | Accessibility |
| `AVAIL` | Availability |
| `MAINT` | Maintainability |
| `SCAL` | Scalability |
| `INTEG` | Data integrity |
| `AUDIT` | Auditability |
| `BACKUP` | Backup and recovery |

### Other identifiers

| Prefix | Meaning | Example |
|---|---|---|
| `OQ-NNN` | Open question registry entry | `OQ-01` |
| `PP-NN` | Interview pain point | `PP-06` |
| `PB-NN` | System playbook | `PB-04` |
| `PB-ENG-NN` | Engineering playbook | `PB-ENG-09` |
| `TR-NNN` | Traceability row | `TR-012` |
| `TH-NN` | Security threat | `TH-03` |
| `RK-NN` | Risk register entry | `RK-07` |
| `AUD-NN` | Audit event class | `AUD-04` |
| `AUDT-NN` | Audit test scenario | `AUDT-01` |
| `AS-NN` | Assumption | `AS-01` |

---

## 3. Document Header Format

Every document begins with a header block.

```markdown
# <Document Title>

**Document:** <SHORT-ID>
**Area:** planning | playbooks/system | playbooks/engineering | architecture
**Status:** Draft | Baseline | Approved | Superseded
**Last updated:** YYYY-MM-DD
**Owner:** <role, not individual name>
**Supersedes:** <document ID or None>
```

`Owner` names a role, never a person, so the document survives staff turnover.

---

## 4. Cross-References

- Reference documents by relative Markdown link.
- Reference requirements by identifier only: `FR-REG-003`. Never by prose restatement.
- Reference playbooks by identifier and title: `PB-04 Event Registration`.
- Every requirement identifier referenced MUST exist in
  [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) or
  [NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md). A dangling identifier is a
  documentation defect.

---

## 5. Terminology

### Locked terms

These terms have fixed meanings. Substituting a synonym is a defect.

| Term | Meaning | Must not be used for |
|---|---|---|
| **Event Registration** | A record binding one student to one event for attendance purposes. | Signing up loosely, any interest signal. |
| **Notification** | A message delivered to a student through the in-app centre, optionally by email. | Announcements in the general sense, email alone. |
| **Announcement** | A communication authored independently of a specific event. | A general event notice, which is event-scoped. |
| **Approval** | A recorded decision on an event by a named approver. | Informal agreement, verbal clearance. |
| **Attendance** | A recorded fact that a registered participant was present. | A registration status. |
| **Acknowledgement** | A student-confirmed read of an IMPORTANT notification. | Delivery, read receipt, open tracking. |

### Prohibited terminology

The following terms MUST NOT appear as ERNS system states, because the underlying capability
does not exist or cannot be measured:

- `WAITLISTED`
- `ATTENDED` or `ABSENT` used as a registration status
- `Delivered` or `Opened` used as a notification state

See [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) for the rationale on notification
delivery states.

### Entity names

Entity names in prose match
[DATA-MODEL.md](DATA-MODEL.md) exactly. Do not merge or split entities for convenience.

---

## 6. Architecture Status Banners

Engineering and architecture documents describing capabilities that do not yet exist MUST carry
a banner at the top of the document.

```markdown
> **NOT YET IMPLEMENTED.** This document specifies a target state. No capability described
> here is currently in operation. See the implementation status table in this document.
```

This applies to continuous integration, continuous delivery, backup automation, and any
monitoring. A document MUST NOT state or imply that a control is currently running when it is
not.

---

## 7. Requirement Writing Rules

1. Each requirement states one behaviour. A requirement containing "and" describing two
   independent behaviours MUST be split.
2. Use `shall` for mandatory behaviour.
3. A requirement MUST be verifiable. If no test could distinguish satisfied from unsatisfied,
   it is not a requirement.
4. A requirement MUST identify its actor.
5. Negative requirements state the prohibited outcome explicitly, because "prevent" and "ensure"
   without a stated outcome are not testable.
6. Requirements are numbered sequentially per module. Gaps are permitted only when an
   identifier is permanently retired, and the retirement MUST be noted in
   [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).

Example of a non-compliant requirement:

```markdown
FR-REG-003  The system shall handle registrations properly.
```

Example of a compliant requirement:

```markdown
FR-REG-003  The system shall reject a registration request from a student who already holds a
REGISTERED registration for the same event.
```

---

## 8. Traceability Rule

Every requirement identifier MUST appear in at least one of:

- [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md)
- a playbook's Test Scenarios section
- [TESTING-STRATEGY.md](TESTING-STRATEGY.md)

A requirement with no validation reference is unverified and MUST be labelled as such until a
test reference is added.

---

## 9. Open Question Management

1. [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) is the single registry. All open questions are
   registered there with an `OQ-NNN` identifier.
2. Each entry records: the question, why it matters, who can answer, what is blocked by it, a
   default assumption if none answers, and the date raised.
3. Inline `> OPEN QUESTION:` references point to the registry entry.
4. When answered, the entry is marked RESOLVED with the date and the deciding party, and every
   document carrying the inline reference is updated in the same change.
5. `OPEN-QUESTIONS.md` is never deleted. It is the project's decision history.

---

## 10. Anti-Patterns

These are documentation defects and must be corrected on review.

| Anti-pattern | Why it is wrong | Correct approach |
|---|---|---|
| Silently choosing a technology | Creates an undocumented decision | Mark PROPOSED and register an OPEN QUESTION |
| Marking an assumption CONFIRMED | Destroys traceability to the interview | Use the correct label |
| Requirement copied into a playbook | A playbook is not a requirement list; it is a process | Reference the requirement ID |
| Playbook content duplicated into architecture | Two sources of truth drift apart | Cross-reference the playbook |
| "CI passed" for a pipeline that does not exist | False claim about a control | Use the Section 6 banner |
| Duplicate `FR-REG-001` identifiers | Breaks traceability | Verify uniqueness before merging |
| Requirement with no test reference | Unverifiable | Add a test scenario or label it unverified |
| Feature added because it is technically possible | Scope creep away from the two primary functions | Reject, or register as a change request |

---

## 11. Document Relationships

| Area | Answers | Relationship |
|---|---|---|
| `planning/` | Why and what | Defines requirements the other areas reference |
| `playbooks/system/` | How ERNS is operated | Traces to planning requirements |
| `playbooks/engineering/` | How ERNS is built and maintained | Governs the implementation of planning requirements |
| `architecture/` | Technical structure and standards | Constrains engineering playbooks |

Architecture documents describe structure. Playbooks describe procedure. When both cover the
same ground, the architecture document holds the decision and the playbook references it.

---

## Exit Criteria

This document is BASELINE when:

- All four status labels are defined and applied consistently
- All identifier schemes are defined
- Locked and prohibited terminology is recorded
- The not-yet-implemented banner convention exists for engineering documents

---

**Related documents:** [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md)