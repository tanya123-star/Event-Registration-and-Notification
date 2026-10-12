# PB-ENG-01 — Development

**Playbook:** PB-ENG-01
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** This playbook specifies a target state. No capability described here is
> currently in operation. ERNS has no application code, no pipeline, and no deployment. See the
> implementation status note in [README.md](../README.md).

---

## Purpose

Define how work on the Event Registration and Notification System begins, how requirements are
referenced, how work is validated, and what happens to unfinished work.

This playbook exists because the most common failure in a project of this size is not a technical
error. It is work that proceeds without anyone confirming it addresses a requirement.

---

## Scope

**Applies to:** all developers working on ERNS, all changes to the ERNS codebase.

**Does not apply to:** operational actions, which are covered by the system playbooks; incident
response, covered by `PB-ENG-17 Incident Response`.

---

## Ownership

**Responsible:** the developer making the change.
**Accountable:** the technical owner for the affected module.
**Consulted:** a reviewer per `PB-ENG-07 Code Review`.

---

## 1. How Work Begins

**No work begins without a requirement reference.**

1. Work is traced to at least one requirement ID from
   [FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md) or
   [NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md), or to a
   registered bug
2. For a new feature, the requirement exists before implementation
3. For a defect, the failing scenario is recorded, or constructed as a failing test first
4. The developer confirms the requirement is baselined, per
   [CONVENTIONS.md](../../planning/CONVENTIONS.md)

**If a change cannot be traced to a requirement or a bug, it does not begin.** It is either
unnecessary, in which case it is declined, or it identifies a missing requirement, in which case the
requirement is added first through `PB-ENG-20 Change Management`.

### 1.1 The two primary functions

**A change must strengthen Event Registration or Notification, or explicitly justify why it does
not.**

Per [SYSTEM-SCOPE.md](../../planning/SYSTEM-SCOPE.md), ERNS has exactly two primary functions.
Features that strengthen neither require Council justification before entering scope. This test is
applied at review, not only at design.

### 1.2 Unfinished work

| Situation | Handling |
|---|---|
| Work in progress | Not committed to `main`. Lives on a branch per `PB-ENG-04 Branching` |
| Blocked work | A draft pull request marked as work in progress, so the blocker is visible |
| Abandoned work | The branch is deleted and the reasoning recorded in an issue, so the decision is not silently lost |
| Known defects | An issue, never a `TODO` comment in code |

**`TODO` comments are not a work-tracking mechanism.** A `TODO` in code is invisible to everyone
except whoever opens that file, and it survives indefinitely without anyone deciding whether it still
matters.

---

## 2. Requirements Referencing

**PROPOSED.** Every pull request description names the requirement IDs it satisfies or the bug it
fixes.

| Change type | Reference |
|---|---|
| New behaviour | One or more `FR-NNN-NNN` identifiers |
| Quality attribute | One or more `NFR-XXX-NNN` identifiers |
| Defect fix | The bug identifier, plus the test that now fails without the fix |
| Refactoring | The requirement whose behaviour must be preserved |
| Documentation | The requirement or question the document resolves |

**PROPOSED.** Commits in the same change reference the same requirement, so `git log` alone
connects code to requirement.

### 2.1 Why this matters for ERNS specifically

The requirements are numbered, and the numbering is stable. That makes it possible to answer, for any
line of behaviour, "which requirement required this?" It also makes it possible to answer the
question the Council will ask: "which requirements are actually implemented?"

Neither answer is available without the reference.

---

## 3. Working Locally

**PROPOSED.**

1. Clone the repository
2. Create a branch per `PB-ENG-04 Branching`
3. Install dependencies with the lockfile respected
4. Obtain local configuration from `.env.example`, never from a shared file containing real values
5. Run the test suite before making changes, to confirm a clean baseline
6. Make the change
7. Run validation per section 4
8. Commit per `PB-ENG-05 Commit Conventions`
9. Open a pull request per `PB-ENG-06 Pull Requests`

### 3.1 Confirm the baseline first

**Step 5 is not optional.** A developer who begins with a failing test suite cannot tell whether a
later failure was caused by their change. Confirming a green baseline takes minutes and saves
argument later.

---

## 4. Validation Before Committing

**PROPOSED.** Before committing:

| Check | Requirement |
|---|---|
| Code compiles or type-checks | `PB-ENG-08 Testing` |
| Linting passes | `PB-ENG-09 CI` |
| New tests pass | `PB-ENG-08 Testing` |
| Existing tests still pass | `PB-ENG-08 Testing` |
| No secret, credential, or token in the diff | `PB-ENG-12 Secrets and Configuration` |
| No debug statement or commented-out code left | `PB-ENG-07 Code Review` |
| Requirement reference present | Section 2 |

**Automated pre-commit hooks are `PROPOSED` where they can run quickly.** They catch the mechanical
errors before review time. Hooks do not replace the pre-merge checks in
`PB-ENG-09 CI`, because hooks can be bypassed and CI cannot.

---

## 5. Validation Before Opening a Pull Request

**PROPOSED.** Before requesting review:

| Check | Blocking |
|---|---|
| All tests pass locally | Yes |
| Linting and type checking clean | Yes |
| Authorisation implications identified | Yes, if the change touches permissions |
| Database change identified, if any | Yes, if the change touches persistence |
| Requirement reference in the description | Yes |
| Documentation impact identified | Yes |
| Test evidence captured | Yes |

**The authorisation and database questions are the ones most often skipped.** A change that adds a
field to a request body may bypass authorisation checks that were written for the previous shape of
the request. A change that alters a query may affect a uniqueness constraint.

---

## 6. Documentation of Changes

**PROPOSED.** A change is documented in the same pull request that makes it:

| Change | Documentation |
|---|---|
| New behaviour | Requirement implemented, cited in the description |
| Changed behaviour | Requirement amended first, then implemented |
| New configuration option | Documented in the relevant playbook and the environment reference |
| Changed process | The affected playbook updated in the same pull request |
| Operational implication | Noted in the pull request for the owner to action |

**Documentation is not a follow-up task.** Per governance principle 11, documentation must remain
synchronised. Per governance principle 15, a build that cannot pass without deferred documentation is
a build that should not proceed.

---

## 7. Definition of Done

A change is done when:

1. All six pre-commit checks pass
2. All six pre-review checks pass
3. At least one reviewer has approved, per `PB-ENG-07 Code Review`
4. All required CI checks pass, per `PB-ENG-09 CI`
5. The change is merged to `main`
6. Documentation is synchronised
7. The linked requirement is updated if the implementation revealed a change in understanding

**Not done when the code works but the documentation, tests, or requirement record do not follow.**

---

## 8. Technical Debt

**PROPOSED.**

| Kind | Handling |
|---|---|
| Known defect | Issue, prioritised |
| Acknowledged shortcoming | Issue with a reason and a condition for addressing it |
| Deferred improvement | Issue, explicitly deferred |
| Undocumented shortcoming | **Not acceptable.** Record it |

**Per governance principle 12, no undocumented architecture-changing decision is acceptable.** A
developer noticing that a design will not scale does not resolve it by proceeding quietly. Either the
change is made through `PB-ENG-20 Change Management`, or the limitation is recorded and accepted.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| No work begins without a requirement or bug reference | Section 1 |
| Pre-commit checks pass | Section 4 |
| Pre-review checks pass | Section 5 |
| Documentation synchronised in the same change | Section 6 |
| Unfinished work is tracked outside code | Section 1.2 |

## Required Evidence

- Requirement IDs in the pull request description
- Test results in the pull request
- Documentation changes in the same pull request

## What Blocks Progression

- A failing test
- An unresolved lint or type error
- A change touching authorisation without review attention to it
- A change touching persistence without a migration plan, per `PB-ENG-14 Database Changes`
- Missing documentation

## Exception Process

**PROPOSED.** A developer who must proceed without meeting a requirement states why in an issue and
obtains the technical owner's agreement. The exception is recorded with a condition for resolution.

**No exception exists for a failing test or a missing authorisation check.** Governance principles 14
and 15 are absolute on those.

---

## Completion Criteria

- The change is merged and meets the definition of done
- The requirement reference is recorded
- Documentation is synchronised

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| DEV-01 | Happy path | Developer implements a requirement | PR references the requirement, tests pass, merged |
| DEV-02 | Happy path | Developer fixes a bug | Failing test added first, then the fix |
| DEV-03 | Invalid | Change with no requirement reference | Blocked at review |
| DEV-04 | Invalid | Test suite failing before changes begin | Baseline not confirmed; developer resolves before proceeding |
| DEV-05 | Unauthorized | Change adding a field to a request with no authorisation review | Blocked |
| DEV-06 | Invalid | Change altering persistence with no migration plan | Blocked |
| DEV-07 | Failure | Work abandoned mid-implementation | Branch deleted, reasoning recorded |
| DEV-08 | Failure | Work blocked on an external dependency | Draft PR marked, blocker visible |
| DEV-09 | Invalid | `TODO` comment added instead of an issue | Refused at review |
| DEV-10 | Boundary | Refactoring with no behaviour change | Cites the requirement whose behaviour is preserved |
| DEV-11 | Failure | Documentation update deferred to a later change | Blocked |
| DEV-12 | Unauthorized | Developer bypasses CI to merge | Blocked; branch protection enforced |
| DEV-13 | Failure | Requirement changed during implementation | Requirement amended first, then implemented |
| DEV-14 | Failure | Technical debt discovered and not recorded | Refused |
| DEV-15 | Failure | Developer cannot meet a check and needs an exception | Recorded with the technical owner's agreement |

---

## Exit Criteria

- The change meets the definition of done
- No undocumented decision was introduced
- The requirement and documentation records are accurate

---

**Related documents:** [PB-ENG-01 Development](PB-ENG-01-DEVELOPMENT.md) ·
[PB-ENG-04 Branching](PB-ENG-04-BRANCHING.md) ·
[PB-ENG-05 Commit Conventions](PB-ENG-05-COMMIT-CONVENTIONS.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-07 Code Review](PB-ENG-07-CODE-REVIEW.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md)