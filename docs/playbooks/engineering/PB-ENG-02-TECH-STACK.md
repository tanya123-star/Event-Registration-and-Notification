# PB-ENG-02 — Tech Stack

**Playbook:** PB-ENG-02
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No technology has been selected. Every tool named in this playbook is a
> category awaiting a decision recorded in [TECH-STACK.md](../../architecture/TECH-STACK.md). This
> playbook specifies how the decision is made and how the decision is then obeyed. It does not
> specify a stack.

---

## Purpose

Define how the approved technology stack is chosen, recorded, used, and changed for the Event
Registration and Notification System.

This playbook exists because the most expensive technical debt in a small project is usually not a
bad framework choice. It is an undocumented one — a dependency that arrived without a decision, a
version nobody knows why was upgraded, and a component nobody can replace because nobody recorded
what it did.

---

## Scope

**Applies to:** every technology the ERNS codebase depends on, and every change to that set.

**Does not apply to:** the technology decision itself, which is a stakeholder decision recorded in
[TECH-STACK.md](../../architecture/TECH-STACK.md); dependency lifecycle after selection, in
`PB-ENG-13 Dependency Management`.

---

## Ownership

**Responsible:** the Developer.
**Accountable:** the Council Secretary for the decision; IT for hosting-affecting choices.
**Consulted:** the whole development team, since the decision will be maintained by whoever is
available in two years.

---

## 1. Current State

**No technology is selected.** All sixteen categories in [TECH-STACK.md](../../architecture/TECH-STACK.md)
section 3 are OPEN QUESTION, registered as OQ-41 through OQ-55.

| Category | Status | Registered |
|---|---|---|
| Frontend framework | Not selected | OQ-41 |
| Backend approach | Not selected | OQ-42 |
| Language and runtime | Not selected | OQ-43 |
| Data store engine | Not selected | OQ-44 |
| Authentication mechanism | Not selected | OQ-45 |
| Styling and UI approach | Not selected | OQ-46 |
| Test tooling | Not selected | OQ-47 |
| Build tooling | Not selected | OQ-48 |
| Deployment platform | Not selected | OQ-30 |
| Package manager | Not selected | OQ-49 |
| Email transport | Not selected | OQ-32, OQ-50 |
| Background job execution | Not selected | OQ-51 |
| Repository host | Not selected | OQ-52 |
| Observability tooling | Not selected | OQ-53 |
| Runtime and OS versions | Not selected | OQ-54 |
| Staging environment | Not selected | OQ-55 |

**Nothing in this playbook may be read as approving a tool.** Where a tool category is named, it is
named as a decision still to be made.

---

## 2. The Rule

### 2.1 Requirements constrain the stack, never the reverse

**No technology may be adopted because it is convenient, familiar, or preferred.** A category is
decided only after the constraints in [TECH-STACK.md](../../architecture/TECH-STACK.md) section 2 are
enumerated and satisfied.

The fifteen constraints most likely to eliminate a candidate outright:

| Constraint | Requirement | What it eliminates |
|---|---|---|
| C-01 | `NFR-INTEG-001`, `NFR-INTEG-002` | Any store without composite unique constraints |
| C-02 | `NFR-INTEG-007` | Any store without transactional check-then-write |
| C-03 | `NFR-AUD-005` | Any store without insert-and-read-only grants on the audit table |
| C-05 | `FR-REG-019`, `FR-NOT-002` | Any store without constrained enumerations |
| C-09 | `NFR-RESP-004` | Any frontend whose bundle cannot meet a low-end Android budget |
| C-10 | `NFR-A11Y-001` | Any frontend without semantic control of rendered output |

**C-01 through C-03 are the ones that bite.** They are why the data store is constrained regardless of
preference, and they are why the store's engine is a stakeholder decision with IT rather than a
developer preference.

### 2.2 The decision procedure

A category becomes `CONFIRMED` only when all seven steps in
[TECH-STACK.md](../../architecture/TECH-STACK.md) section 4 are complete and recorded. The two that
most often get skipped:

| Step | Why it is not optional |
|---|---|
| **Support lifetime stated** | A technology past end of support becomes the previous maintainer's unpaid problem. A student organisation's system outlives its developers |
| **At least two candidates considered** | Without this, "evaluating alternatives" is a formality conducted after the decision has been made |

### 2.3 The evaluation criteria

Applied in the order given in [TECH-STACK.md](../../architecture/TECH-STACK.md) section 5: constraint
satisfaction, operability, support lifetime, licence cost, host compatibility, security track record,
skill availability, exit cost, and requirement fit.

**Exit cost is weighted heavily and is the criterion most often ignored.** The most likely future event
in this project is a change of technology. A decision that makes replacement expensive is a decision
made once.

### 2.4 Recording the decision

**PROPOSED.** When a category is decided:

1. [TECH-STACK.md](../../architecture/TECH-STACK.md) is updated with the choice, the version or range,
   the support lifetime, the date, and the deciding parties
2. The `OQ-NNN` entry is marked RESOLVED **in the same change**, per
   [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 9 rule 4
3. This playbook's section 1 status table is updated
4. The chosen tool is reflected in `PB-ENG-09 CI`, `PB-ENG-08 Testing`, and `PB-ENG-13 Dependency
   Management` so the pipeline matches reality
5. Any `> OPEN QUESTION:` inline references in other documents are updated

**Step 2 is not administrative housekeeping.** An unresolved entry pointing at a decided question is
how a later reader concludes the decision was never made.

---

## 3. The Rule Once a Stack Is Approved

These apply after selection and are what most teams actually need.

### 3.1 The stack is recorded, not remembered

The approved stack is a table in [TECH-STACK.md](../../architecture/TECH-STACK.md) with a version
range, not a sentence in a chat thread. Every tool the project depends on appears there, including
indirect tooling.

| Recorded | Often forgotten |
|---|---|
| Language and runtime | Linter and formatter |
| Data store | Migration tool |
| Frontend framework | Build and bundler |
| Test tooling | Test data seeding approach |
| Package manager | Type definition sources |
| Deployment platform | Observability tooling |

### 3.2 No tool enters without a row

**A dependency added to a manifest without a row in the approved stack is a review failure**, per
`PB-ENG-13 Dependency Management` section 2. This closes the route by which an undocumented
architecture-changing decision happens through a single line in a manifest.

### 3.3 Version ranges are explicit

| Rule | Reason |
|---|---|
| Every tool has a stated version or range | "Latest" is not reproducible |
| Ranges are narrow enough to be meaningful | A range admitting any version is not a decision |
| The resolved version is pinned by a lockfile | Reproducibility, per `PB-ENG-13` |
| A range's upper bound reflects the next major version | So the range does not silently widen |

### 3.4 Support lifetime is a tracked property

Every approved tool carries an end-of-support date, reviewed at least annually. A tool within six
months of end of support has a replacement decision started, not a note filed.

**This is the rule most likely to be dropped, because nothing fails on the day it is dropped.** It
fails two years later, when a security fix cannot be obtained.

### 3.5 Substitution requires a decision, not a workaround

If a tool becomes unusable, the replacement follows `PB-ENG-20 Change Management`. No developer
substitutes a tool unilaterally and backfills the documentation afterwards. Governance principle 12.

---

## 4. What Is Prohibited

| Prohibited | Why | Governance principle |
|---|---|---|
| Adopting a technology not in the approved stack | Undocumented architecture decision | 12 |
| Adding a dependency without an approval row | Undocumented decision by another route | 12 |
| Replacing a tool without change management | Same defect, larger blast radius | 12, 10 |
| Choosing a tool because a tutorial used it | Convenience over constraints | 1 |
| Recording a decision in code rather than in documentation | Documentation drifts from reality | 11 |
| Treating silence as approval | The failure mode this playbook exists to prevent | 12 |

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| No technology approved without completing all seven decision steps | Section 2.2 |
| Constraints C-01 to C-15 satisfied before selection | Section 2.1 |
| Support lifetime recorded for every tool | Section 3.1, 3.4 |
| At least two candidates considered and rejections recorded | Section 2.2 |
| Decision recorded with date and deciding parties | Section 2.4 |
| `OQ` entry marked RESOLVED in the same change | Section 2.4 step 2 |
| No tool in the codebase absent from the approved stack | Section 3.2 |

## Required Evidence

- The updated table in [TECH-STACK.md](../../architecture/TECH-STACK.md)
- The RESOLVED `OQ` entry with its deciding parties
- The candidate comparison, retained with the decision
- The support lifetime for each tool

## What Blocks Progression

- A constraint cannot be satisfied by the candidate
- No candidate has a stated support lifetime
- Only one candidate was considered
- The decision has not been recorded in documentation
- IT has not agreed, where the choice affects hosting

## Exception Process

**PROPOSED.** A tool may be used experimentally on a branch, provided the branch is not merged and
the experiment is recorded as a draft pull request with its purpose. The exception does not extend to
`main`.

**No exception exists for a tool entering production that is absent from the approved stack.** There
is no version of that which is acceptable, because it is the same defect the rule prevents.

---

## Completion Criteria

- Every category in [TECH-STACK.md](../../architecture/TECH-STACK.md) section 3 decided or explicitly
  deferred with a reason
- Every approved tool recorded with version range and support lifetime
- Candidate comparisons retained
- All downstream engineering playbooks consistent with the approved stack

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| TS-01 | Happy path | Category decided and recorded | Tech-stack updated, OQ RESOLVED, playbooks aligned |
| TS-02 | Invalid | Tool added to manifest with no approval row | Blocked at review, `PB-ENG-13` |
| TS-03 | Unauthorized | Developer adopts a framework unilaterally | Blocked; change management required |
| TS-04 | Invalid | Candidate cannot satisfy C-01 | Rejected before selection |
| TS-05 | Invalid | Candidate cannot satisfy C-09 bundle budget | Rejected |
| TS-06 | Boundary | Candidate satisfies constraints but has no stated end-of-support date | Rejected at step 3 |
| TS-07 | Invalid | Only one candidate considered | Rejected at step 2 |
| TS-08 | Duplicate | Decision recorded twice with different versions | Rejected; `PB-ENG-20` |
| TS-09 | Failure | Approved tool reaches end of support | Replacement decision started, per 3.4 |
| TS-10 | Failure | Approved tool becomes unusable | Change management, not a workaround |
| TS-11 | Failure | Tool silently upgraded by a transitive dependency | Detected by lockfile review, `PB-ENG-13` |
| TS-12 | Invalid | "Latest" used as a version | Rejected; reproducibility required |
| TS-13 | Boundary | Range upper bound reaches the next major version | Range reviewed, not silently widened |
| TS-14 | Unauthorized | Experimental tool merged to `main` | Blocked by branch protection |
| TS-15 | Failure | Documentation not updated after a decision | Blocked; principle 11 |
| TS-16 | Invalid | Silence on a question treated as approval | Rejected; default is "none selected" |
| TS-17 | Failure | OQ entry left OPEN after the decision | Rejected in review, section 2.4 step 2 |
| TS-18 | Boundary | Hosting-affecting tool chosen without IT agreement | Blocked |
| TS-19 | Invalid | Licensing cost or obligation unrecorded | Rejected at step 4 |
| TS-20 | Failure | Tool with high exit cost adopted without justification | Rejected at step 2 |

---

## Exit Criteria

- All sixteen categories resolved or explicitly deferred with a reason
- Support lifetime review scheduled annually
- This playbook's status table reflects the approved stack
- The "not yet implemented" banner removed once a stack exists and is in use

---

**Related documents:** [PB-ENG-02 Tech Stack](PB-ENG-02-TECH-STACK.md) ·
[TECH-STACK.md](../../architecture/TECH-STACK.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md)