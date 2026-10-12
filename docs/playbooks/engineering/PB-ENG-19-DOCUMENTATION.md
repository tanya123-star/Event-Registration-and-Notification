# PB-ENG-19 — Documentation

**Playbook:** PB-ENG-19
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

---

## Purpose

Define how the Event Registration and Notification System's documentation is owned, named, written,
kept synchronised with the system, and updated.

Governance principle 11 requires documentation to remain synchronised with the system. **This playbook
exists because that principle fails by default**: documentation is written when a feature is built and
never touched again, and within a year it describes a system that no longer exists.

---

## Scope

**Applies to:** every document in `docs/`, and every change that affects what a document describes.

**Does not apply to:** what the documents must contain, which is defined by
[CONVENTIONS.md](../../planning/CONVENTIONS.md); operational process, in the system playbooks.

---

## Ownership

**Responsible:** the Developer making the change.
**Accountable:** the documentation owner, per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 3.
**Consulted:** the Council Secretary, who is the organisational authority for process documents.

**Every document names a role as owner, never a person**, so a document survives staff turnover. For a
student organisation with annual turnover, this is the difference between a document that is maintained
and one that names someone who has graduated.

---

## 1. Structure

**The three areas, and why they are separate.** Per [README.md](../README.md).

| Area | Answers | Audience |
|---|---|---|
| `planning/` | Why and what | Anyone deciding whether ERNS is right |
| `playbooks/system/` | How ERNS is operated | Officers, approvers, attendance staff, students |
| `playbooks/engineering/` | How ERNS is built and maintained | Developers, reviewers, operators |
| `architecture/` | Technical structure and standards | Developers, whoever inherits the system |

**The separation is mandatory.** An officer should not read a document about pull requests to learn how
to publish an event. A developer should not read an operational document to learn how to deploy.

---

## 2. Naming

**REQUIRED**, per [CONVENTIONS.md](../../planning/CONVENTIONS.md).

| Area | Convention | Example |
|---|---|---|
| `planning/` | `UPPERCASE-HYPHENATED.md` | `FUNCTIONAL-REQUIREMENTS.md` |
| `playbooks/system/` | `PB-NN-TITLE.md` | `PB-04-EVENT-REGISTRATION.md` |
| `playbooks/engineering/` | `PB-ENG-NN-TITLE.md` | `PB-ENG-09-CI.md` |
| `architecture/` | `UPPERCASE-HYPHENATED.md` | `SECURITY-ARCHITECTURE.md` |

### 2.1 Titles name the subject, not the activity

`EVENT-LIFECYCLE.md` names what it describes. `EVENT-LIFECYCLE-UPDATE.md` would name a change to it,
which is a different thing.

### 2.2 Never rename to reorganise

**Renaming a document breaks every cross-reference to it.** The numbering in the playbook sets is
stable for the same reason requirement identifiers are: once issued, never reused or renumbered.

---

## 3. Document Header

**REQUIRED**, per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 3.

```markdown
# <Document Title>

**Document:** <SHORT-ID>
**Area:** planning | playbooks/system | playbooks/engineering | architecture
**Status:** Draft | Baseline | Approved | Superseded
**Last updated:** YYYY-MM-DD
**Owner:** <role, not individual name>
**Supersedes:** <document ID or None>
```

| Field | Rule |
|---|---|
| `Document` | Stable short identifier. **Never changed once issued** |
| `Area` | One of the four. Must match the directory |
| `Status` | Draft, Baseline, Approved, or Superseded |
| `Last updated` | The date of the last substantive change |
| `Owner` | **A role.** Never a person's name |
| `Supersedes` | The document ID this replaces, or None |

### 3.1 The status values mean something

| Status | Meaning |
|---|---|
| **Draft** | Under active development. Not relied upon |
| **Baseline** | Reviewed and agreed. **Changes require `PB-ENG-20`** |
| **Approved** | Approved by a named authority |
| **Superseded** | Replaced. **Never deleted.** See section 8 |

**A baselined document is not edited casually.** Changing it is a change-management item, because the
rest of the set references it.

---

## 4. Status Labels Within a Document

**REQUIRED**, per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 1.

| Label | Meaning |
|---|---|
| **CONFIRMED** | Supported by the interview or an explicit stakeholder instruction |
| **PROPOSED** | A recommended decision not yet ratified |
| **ASSUMPTION** | A working premise, pending confirmation |
| **OPEN QUESTION** | An unresolved decision |

### 4.1 The rule that matters

**An ASSUMPTION MUST NOT be restated as a CONFIRMED requirement in any downstream document.** Per
`CONVENTIONS.md` section 1 rule 1.

This is the single most important documentation rule, because the failure is invisible. A reader of a
later document sees `CONFIRMED` and reasonably acts on it, with no way to know an assumption was
upgraded somewhere in between.

### 4.2 Every assumption has a registry entry

**REQUIRED.** Every ASSUMPTION appears in the assumptions register in
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) section 4, with the entry that resolves it and
what happens if it is wrong.

---

## 5. Requirement Identifiers

**REQUIRED.** Per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 2.

| Scheme | Format |
|---|---|
| Functional | `FR-<MODULE>-<NNN>` |
| Non-functional | `NFR-<CATEGORY>-<NNN>` |
| Open question | `OQ-NN` |
| Playbook | `PB-NN`, `PB-ENG-NN` |
| Traceability row | `TR-NNN` |

### 5.1 Identifiers are stable and never reused

**Once issued, an identifier is never reused or renumbered.** A retired identifier is recorded as
retired in [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md), per `CONVENTIONS.md` section 7 rule 6.

**Reuse means a requirement that was deleted silently reappears the next time the number comes around,
and traceability points at the wrong thing.**

### 5.2 A dangling identifier is a defect

**Every identifier referenced MUST exist** in
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md) or
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md). Per
`CONVENTIONS.md` section 4, a dangling identifier is a documentation defect.

### 5.3 Referenced by identifier, never restated

**Playbooks cite `FR-REG-014`. They do not paraphrase it.** A restatement creates a second source that
drifts, and the drift is invisible because both look correct.

**This is what makes a playbook a playbook.** A playbook is a process; a requirement is an obligation.
Copying a requirement into a playbook produces a document that is neither.

---

## 6. Writing Standards

**PROPOSED.**

| Rule | Reason |
|---|---|
| Address the reader as "you" for procedures, and name the role for permissions | Consistency |
| Use the locked terminology exactly | Per `CONVENTIONS.md` section 5 |
| Use tables for anything with more than three items | Scannability |
| Use numbered steps for procedures | Ordering is part of the procedure |
| State the reason for a rule, not only the rule | A rule without a reason is deleted by the next person who does not understand it |
| No future tense for unimplemented capability | Use the `NOT YET IMPLEMENTED` banner |
| Line length under 100 characters in tables | Readability in a terminal |
| One topic per document section | Scannability |

### 6.1 State why, not only what

**A rule with no stated reason is deleted by the next person who does not understand it**, and the
omission is not noticed until the defect it prevented occurs.

The reasoning behind a constraint is also what distinguishes it from a preference, which matters when
someone wants to change it.

### 6.2 Markdown conventions

| Element | Convention |
|---|---|
| Headings | `#` through `###`. Never skip a level |
| Tables | Header row, then separators. **No empty cells** — use "None" or "Not applicable" |
| Code | Fenced blocks with a language where one applies |
| Emphasis | `**bold**` for status labels and requirement IDs. Not for whole paragraphs |
| Lists | `-` for unordered, `1.` for ordered procedures |
| Links | Relative, per `CONVENTIONS.md` section 4 |

**No empty table cells.** An empty cell reads as an oversight and cannot be distinguished from a
missing value.

---

## 7. Synchronisation

**REQUIRED.** Governance principle 11.

### 7.1 Documentation is in the same change

| Change | Documentation |
|---|---|
| New behaviour | Requirement cited; the playbook updated if it describes the process |
| Changed behaviour | **Requirement amended first**, then implemented |
| New configuration option | Documented in the relevant playbook |
| Changed process | The affected playbook updated in the same pull request |
| New technology | `PB-ENG-02` and [TECH-STACK.md](../../architecture/TECH-STACK.md) **before** merge |
| New open question | Registered in [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) |
| Operational implication | Noted in the pull request for the owner to action |

**Per `PB-ENG-06` section 6, a pull request that defers documentation is not ready.**

### 7.2 Documentation is versioned with the code

**Documentation lives in the repository**, not in a separate system. This is what makes it enforceable:
a change to behaviour and the change to the document describing it are reviewed together, in one place,
with one approval.

### 7.3 The synchronisation test

**Before a change is considered complete:** if a reader followed only the documentation, would they
arrive at the system's current behaviour? If not, the documentation is out of date, and the change is
incomplete.

### 7.4 Reviewing documentation as carefully as code

| Element | Reviewed for |
|---|---|
| Factual accuracy | Does it describe what exists? |
| Completeness | Does it cover what it claims to? |
| Consistency | Do identifiers and labels follow `CONVENTIONS.md`? |
| Traceability | Does every requirement reference resolve? |
| Honesty | Does it claim a control that does not exist? |

**A document that claims an unimplemented control is in operation is worse than one that is missing**,
because it is relied upon.

---

## 8. Lifecycle

**PROPOSED.**

| Stage | Action |
|---|---|
| Created | Header, status `Draft` |
| Reviewed | Status `Baseline` |
| Changed | `PB-ENG-20` if the change is significant |
| Superseded | Status `Superseded`, `Supersedes` field set on the replacement |
| **Never deleted** | See below |

### 8.1 Documents are never deleted

**A superseded document is retained** with its status set to `Superseded`.

**The history of decisions is the documentation's value.** A system that has been through three approval
approaches has a record of what was tried and rejected, and that record is why nobody repeats the third
attempt. Deleting it means the reasoning is lost with the file.

### 8.2 OPEN-QUESTIONS.md is never deleted

**It is the project's decision history**, per `CONVENTIONS.md` section 9 rule 5. Entries are marked
RESOLVED with a date and a deciding party, never removed.

---

## 9. Open-Question Management

**REQUIRED**, per `CONVENTIONS.md` section 9.

| Rule | Detail |
|---|---|
| `OPEN-QUESTIONS.md` is the single registry | Every unresolved decision is registered there |
| Each entry records | The question, why it matters, who can answer, what is blocked, a default assumption, the date |
| Inline references point to the registry | An inline reference without an entry is a defect |
| Resolving an entry | Marked RESOLVED, and **every document carrying the inline reference is updated in the same change** |
| Load-bearing assumptions | Marked BLOCKING when a safe default does not exist |

### 9.1 Resolving one is a multi-document change

**Marking an entry RESOLVED in one document while another still says `> OPEN QUESTION:` produces a
contradiction**, and the reader cannot tell which is current.

**The registry entry and every inline reference are updated together**, per `CONVENTIONS.md` section 9
rule 4.

### 9.2 Blockers are distinguished

| Priority | Meaning |
|---|---|
| BLOCKING | Implementation cannot begin without an answer |
| HIGH | A safe default exists, but it may need rework |
| MEDIUM | Affects quality or effort, not correctness |
| LOW | Documentation clarity |

**A BLOCKING question means the affected module must not start.** Recording a blocker and then
proceeding anyway leaves the register accurate and the work invalid.

---

## 10. Architecture Documentation

**REQUIRED.** Architecture documents describe structure; playbooks describe procedure. Where both cover
the same ground, **the architecture document holds the decision and the playbook references it**, per
`CONVENTIONS.md` section 11.

### 10.1 No duplication between areas

| Duplication | Consequence |
|---|---|
| A playbook restating an architecture decision | Two sources of truth that drift apart |
| An architecture document restating a playbook | The same, in reverse |
| The same requirement in three documents | Three places to update, one that will be missed |

**This is why architecture documents cross-reference playbooks rather than containing them.**

### 10.2 Architecture documents state decisions, not history

An architecture document states the current structure and why it is what it is. The history is in the
change records and the git log.

---

## 11. Ownership Review

**PROPOSED.** A documentation review checks:

| Check | Why |
|---|---|
| Every `Owner` is still a role someone holds | A departed owner means an unmaintained document |
| Every document is current | Per section 7.3 |
| Every open question is still open | A resolved question still marked open is misleading |
| Every requirement is still required | Requirements are retired, not left behind |
| Every cross-reference resolves | A broken link means an unreachable document |
| No document claims an unimplemented control | Per `CONVENTIONS.md` section 6 |

**Annually, and after any departure.** For a student organisation, the departure is the more likely
trigger.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Header block on every document | Section 3 |
| `Owner` is a role, never a person | Section 3 |
| Status labels used consistently | Section 4 |
| No ASSUMPTION restated as CONFIRMED | Section 4.1 |
| Every assumption registered | Section 4.2 |
| Identifiers stable and never reused | Section 5.1 |
| No dangling identifier | Section 5.2 |
| Referenced by identifier, never restated | Section 5.3 |
| No empty table cells | Section 6.2 |
| Documentation updated in the same change | Section 7.1 |
| Documentation versioned with the code | Section 7.2 |
| No duplication between areas | Section 10.1 |
| Superseded documents retained | Section 8.1 |
| `OPEN-QUESTIONS.md` never deleted | Section 8.2 |
| Every inline reference resolves to a registry entry | Section 9 |
| No claim of an unimplemented control | `CONVENTIONS.md` section 6 |

## Required Evidence

- Documentation changes in the same pull request as the change they describe
- The synchronisation test result for any behavioural change
- The ownership review record
- The resolved open-question entry with every inline reference updated

## What Blocks Progression

- Documentation is deferred to a follow-up
- An ASSUMPTION is restated as CONFIRMED
- A dangling requirement identifier
- A requirement is restated rather than cited
- A document claims a control that does not exist
- A new open question is not registered
- A baselined document is changed without `PB-ENG-20`
- A superseded document is deleted rather than retained
- An `Owner` names a person rather than a role

## Exception Process

**PROPOSED.** A pull request may proceed with documentation deferred **only** where the change is
documentation-independent — a comment fix, a dependency patch within the pinned range — and the
deferral is recorded as an issue with an owner.

**No exception exists for** deferring documentation of a behavioural change, changing a baselined
document without change management, or shipping a change that contradicts the documentation.

---

## Completion Criteria

- Every document has a correct header, a role owner, and a status
- No dangling identifier or cross-reference
- Every assumption registered
- The synchronisation test applied to every change
- An ownership review performed and recorded
- No duplication between areas
- The "not yet implemented" banners accurate

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| DOC-01 | Happy path | Behaviour change with documentation in the same pull request | Merged |
| DOC-02 | Failure | Behaviour change, documentation deferred | **Blocked**, section 7.1 |
| DOC-03 | Failure | ASSUMPTION restated as CONFIRMED downstream | **Blocked**, section 4.1 |
| DOC-04 | Invalid | ASSUMPTION used without a registry entry | Rejected, section 4.2 |
| DOC-05 | Invalid | Requirement identifier referenced that does not exist | **Blocked**, section 5.2 |
| DOC-06 | Invalid | Requirement restated rather than cited | Rejected, section 5.3 |
| DOC-07 | Failure | Requirement identifier reused after retirement | **Blocked**, section 5.1 |
| DOC-08 | Invalid | Empty table cell | Rejected, section 6.2 |
| DOC-09 | Failure | Document claims a control that does not exist | **Blocked**, `CONVENTIONS.md` section 6 |
| DOC-10 | Failure | New open question raised but not registered | Rejected, section 9 |
| DOC-11 | Failure | Open question marked RESOLVED, inline reference left | **Blocked**, section 9.1 |
| DOC-12 | Failure | BLOCKING question recorded, work started anyway | **Blocked**, section 9.2 |
| DOC-13 | Invalid | Document `Owner` names a person | Rejected, section 3 |
| DOC-14 | Failure | Owner has departed, document unmaintained | Rejected at ownership review, section 11 |
| DOC-15 | Invalid | Superseded document deleted | **Blocked**, section 8.1 |
| DOC-16 | Failure | `OPEN-QUESTIONS.md` deleted | **Blocked**, section 8.2 |
| DOC-17 | Invalid | Baselined document changed without `PB-ENG-20` | **Blocked**, section 3.1 |
| DOC-18 | Failure | Playbook duplicates an architecture decision | Rejected, section 10.1 |
| DOC-19 | Failure | Architecture document restates a playbook | Rejected, section 10.1 |
| DOC-20 | Invalid | Document renamed, breaking cross-references | **Blocked**, section 2.2 |
| DOC-21 | Boundary | Dependency patch within the pinned range, documentation deferred | Permitted with a recorded issue |
| DOC-22 | Failure | Cross-reference resolves to nothing | Rejected at ownership review |
| DOC-23 | Failure | Header missing or incomplete | Rejected, section 3 |
| DOC-24 | Failure | Rule stated without a reason | Rejected at review, section 6.1 |
| DOC-25 | Failure | Reader following only the documentation reaches the wrong behaviour | **Blocked**, section 7.3 |

---

## Exit Criteria

- Every document has a correct header and a role owner
- No dangling identifier or cross-reference
- An annual and post-departure ownership review established
- The synchronisation test applied consistently
- No duplication between areas
- The "not yet implemented" banners accurate as the system comes into existence

---

**Related documents:** [PB-ENG-19 Documentation](PB-ENG-19-DOCUMENTATION.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) ·
[README.md](../README.md) ·
[PB-ENG-01 Development](PB-ENG-01-DEVELOPMENT.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[TRACEABILITY-MATRIX.md](../../planning/TRACEABILITY-MATRIX.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md)