# PB-ENG-05 — Commit Conventions

**Playbook:** PB-ENG-05
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No commit convention has been adopted, because no code has been written and
> no tool has been selected to enforce one. See the status section.

---

## Purpose

Define how commit messages are written in the Event Registration and Notification System, so that the
history is readable, traceable to requirements, and useful during an incident.

This playbook exists because a commit message is the only documentation that is guaranteed to survive.
Documentation in `docs/` can be skipped. `git log` cannot.

---

## Scope

**Applies to:** every commit in the ERNS repository, including squash commits.

**Does not apply to:** branch naming, in `PB-ENG-04 Branching`; pull request descriptions, in
`PB-ENG-06 Pull Requests`; release tags, in `PB-ENG-16 Release Management`.

---

## Ownership

**Responsible:** the Developer committing the change.
**Accountable:** the technical owner for the affected module.
**Consulted:** a reviewer, where the message does not match the change.

---

## 1. Format

**PROPOSED.** Conventional Commits structure. Chosen because it is machine-parseable, which lets
`git log` be filtered by type and scope, and because the subject line is the part a reader sees.

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Part | Rule |
|---|---|
| `type` | From the permitted list in section 2. Lowercase |
| `scope` | The module or requirement area. Omit for changes spanning the whole system |
| `subject` | Imperative mood, present tense, no trailing full stop, 72 characters or fewer |
| `body` | **Required** for any non-obvious change. Wrapped at 72 columns. Explains *why*, not *what* |
| `footer` | Requirement IDs, breaking changes, issue references |

### 1.1 Worked examples

**A requirement implementation:**

```
feat(registration): enforce capacity inside the registration transaction

The capacity check previously ran before the transaction opened, so two
concurrent registrations for the last slot could both succeed. Moving the
validation inside the transaction boundary satisfies NFR-INTEG-007.

FR-REG-013
```

**A defect fix:**

```
fix(attendance): reject duplicate scans on the same registration

Attendance Staff reported inflated counts after repeated scans at the door.
The storage constraint already forbids this; the scan handler was swallowing
the violation and reporting success. It now surfaces the existing registration.

RV-02, CON-03
```

**A documentation change:**

```
docs(PB-ENG-19): require requirement IDs in commit footers

Documentation governance principle 11 requires documentation to stay
synchronised with the system. Recording the requirement reference in the
commit footer makes the connection checkable with git log alone.
```

**A breaking change:**

```
refactor(registration)!: move validation out of the request handler

BREAKING CHANGE: the handler no longer accepts a raw payload. It now
requires a validated command object, which removes the possibility of an
unvalidated path to the registration write.

FR-REG-005
```

### 1.2 Why the body is required

**The subject says what changed. The body says why, and the body is the part that matters in six
months.**

A reader investigating an incident, or a maintainer deciding whether a behaviour can safely be
changed, needs the reasoning. Without it the only way to find out is to ask the author, who by then
has graduated. For a student organisation whose turnover is annual, **the commit body is often the
only surviving record of a decision.**

---

## 2. Permitted Types

**REQUIRED.** A closed list, so that history is filterable.

| Type | Use | Example |
|---|---|---|
| `feat` | New behaviour satisfying a requirement | `feat(registration): add capacity validation` |
| `fix` | A defect correction | `fix(attendance): reject duplicate scans` |
| `refactor` | Behaviour-preserving change | `refactor(registration): extract validation rules` |
| `perf` | Performance change with the same behaviour | `perf(notification): batch recipient creation` |
| `test` | Adding or correcting tests | `test(registration): add concurrency scenario CON-01` |
| `docs` | Documentation only | `docs(playbooks): update PB-17 backup procedure` |
| `build` | Build system, dependencies, tooling | `build(deps): update runtime to approved range` |
| `ci` | Pipeline configuration | `ci: add secret scanning to the required checks` |
| `chore` | Maintenance with no behaviour effect | `chore: extend gitignore for local database files` |
| `revert` | Reverting a previous commit | `revert(attendance): restore previous scan handler` |

### 2.1 The list is closed

**A commit type outside this list is a review failure.** An open list produces `update`, `fixes`,
`misc`, `wip`, and `stuff`, and a history that cannot be filtered.

### 2.2 Scopes

| Scope | Covers |
|---|---|
| `registration` | `FR-REG-*`, `PB-04`, `PB-05` |
| `notification` | `FR-NOT-*`, `PB-06` to `PB-09` |
| `attendance` | `FR-ATT-*`, `PB-10`, `PB-11` |
| `approval` | `FR-APR-*`, `PB-02` |
| `event` | `FR-EVT-*`, `PB-01`, `PB-03` |
| `users` | `FR-USR-*`, roles |
| `audit` | `FR-AUD-*`, `AUDIT-PLAN.md` |
| `post-event` | `FR-POS-*`, `PB-12` to `PB-14` |
| `reporting` | `FR-RPT-*`, `PB-15` |
| `security` | `NFR-SEC-*`, `PB-ENG-11` |
| `deps` | Dependency changes, `PB-ENG-13` |
| `db` | Migrations, `PB-ENG-14` |
| `infra` | Deployment and environments |
| `docs` | Documentation |
| `ci` | Pipeline |

**Scopes mirror the requirement modules**, which keeps `git log --grep` answering "which commits
touched registration?" — a question the Council will ask when it asks which requirements are
implemented.

---

## 3. Requirement Reference

**REQUIRED.** Every commit footer MUST reference at least one requirement ID, a test scenario ID, or a
change-management reference.

| Change type | Footer reference |
|---|---|
| New behaviour | `FR-NNN-NNN` |
| Quality attribute | `NFR-XXX-NNN` |
| Defect fix | The scenario that now passes and the one that would fail without the fix |
| Refactoring | The requirement whose behaviour is preserved |
| Documentation | The requirement, question, or playbook it addresses |
| Build or tooling | The `PB-ENG-*` playbook it serves |

**This is what makes `git log` alone connect code to requirement**, per `PB-ENG-01 Development`
section 2. It also means the traceability matrix can be partially reconstructed from history, which
matters when someone asks which requirements are actually implemented.

### 3.1 Breaking changes

**REQUIRED** notation, per section 1.1:

```
refactor(scope)!: summary

BREAKING CHANGE: what breaks and what a consumer must do.
```

The footer is mandatory and must describe the consequence, not just the fact. "BREAKING CHANGE:
changed the handler signature" is not actionable; "the handler no longer accepts a raw payload, it
requires a validated command object" is.

---

## 4. When to Commit

### 4.1 One logical change per commit

**A commit is the smallest change that leaves the codebase in a working state and is meaningful on its
own.**

| Do | Do not |
|---|---|
| One requirement per commit | Four unrelated fixes in one commit |
| Tests accompanying the behaviour they verify | Tests in a later commit |
| Documentation in the same commit as the change | Documentation as a follow-up |
| Refactoring separate from behaviour change | A refactor and a fix in one commit |

**Refactoring mixed with a behaviour change is the most damaging case.** If the change turns out to
be wrong, `git revert` restores the old behaviour but also restores the old structure, and the
refactoring work is lost. Separated, the refactor survives.

### 4.2 The working-state rule

**Every commit leaves the repository in a state where the checks pass.** A commit that leaves a test
failing converts a clear failure into an archaeology exercise for whoever bisects the problem.

**An exception exists for work in progress on a topic branch**, which is never merged while failing.
This is why topic branches exist at all.

### 4.3 Do not commit to make a build pass

**Governance principle 15 is absolute.** If a commit is needed to make a build pass, the correct
response is to fix the cause. The alternatives each defeat the purpose of the checks:

| Tempting move | What it actually does |
|---|---|
| Delete a failing test | Removes the requirement it was verifying |
| Mark a test as expected failure | Same, with extra steps |
| Add a bypass flag | Makes the check optional going forward |
| Skip the check in CI | Makes it optional permanently |
| Force-push over the failing commit | Hides it from the next person |

`PB-ENG-08 Testing` section 7 states the same rule from the testing side. **A test is not deleted to
make a build pass without a recorded reason**, and even with a reason, the requirement it verified must
be assessed for whether it is still met.

---

## 5. What Must Not Be Committed

**PROHIBITED**, per `PB-ENG-12` and `PB-ENG-13`:

| Item | Reason | Threat |
|---|---|---|
| Secrets, tokens, keys, passwords | Not recoverable from history. Requires rotation, not deletion | `TH-09` |
| `.env` with real values | Same | `TH-09` |
| Real student data | Personal data outside the data store | `NFR-SEC-013` |
| Production database dumps | Same | |
| Dependency directories | Reproducible from the manifest | Supply chain |
| Build output | Reproducible from source | Supply chain |
| Editor and OS files | Noise | |
| IDE settings that are personal, not shared | Noise | |
| Commented-out code | Dead code that reads as a decision | Maintainability |
| Debug statements | Leaks internals, `NFR-SEC-012` | |
| Large binary files | Bloats history irrecoverably | |

**A secret in history is not removed by deleting the commit.** It is in every clone and every mirror.
`PB-ENG-12` section 6 requires rotation first, and the response sequence is not optional.

### 5.1 The lockfile is the exception

**The dependency lockfile MUST be committed**, per `PB-ENG-13`. It is generated, and excluding it
would make builds irreproducible. This is a deliberate exception to "no generated artefacts", recorded
here so it is not removed by someone applying that rule mechanically.

---

## 6. Message Quality

### 6.1 The subject line

| Rule | Bad | Good |
|---|---|---|
| Imperative mood | `Fixed the capacity check` | `fix(registration): enforce capacity in the transaction` |
| No trailing full stop | `fix(attendance): reject duplicates.` | `fix(attendance): reject duplicates` |
| Under 72 characters | Anything longer | Keep the first line scannable in `git log --oneline` |
| Describes the change, not the activity | `update files`, `work on registration` | `refactor(registration): extract validation rules` |

### 6.2 The body

| Rule | Reason |
|---|---|
| Explains **why**, not what | The diff already shows what. The reason is what is lost |
| Explains the requirement or the defect | Connects the change to `PB-ENG-01` section 1 |
| Notes alternatives rejected | Saves the next person redoing the analysis |
| Notes anything surprising | A reader who does not expect it will assume it is a mistake and change it back |
| Wrapped at 72 columns | Readable in a terminal without horizontal scrolling |

### 6.3 Required body content for specified change types

| Change type | The body must state |
|---|---|
| `fix` | The failure that was observed, and why this fixes it |
| `refactor` | What behaviour is preserved, and which requirement depends on it |
| `perf` | What was slow, how it was measured, what the result was |
| Any change touching authorisation | Which role is affected and which is now denied |
| Any change touching persistence | The migration, and whether it is reversible |
| Any change to a notification | Whether any recipient state is affected |

**The authorisation and persistence rows are the ones that get omitted and then cause an incident.**
A change that adds a field to a request body may bypass an authorisation check written for the
previous shape. `PB-ENG-07 Code Review` checks for both.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Message follows the format | Section 1 |
| Type is from the permitted list | Section 2 |
| Scope is from the permitted list | Section 2.2 |
| Footer references a requirement, scenario, or playbook | Section 3 |
| Breaking changes use the `!` and `BREAKING CHANGE:` notation | Section 3.1 |
| One logical change per commit | Section 4.1 |
| The repository passes its checks at every commit on a merged branch | Section 4.2 |
| No secret, personal data, or generated artefact committed | Section 5 |
| The lockfile is committed | Section 5.1 |
| Subject is imperative, under 72 characters, no full stop | Section 6.1 |
| Body explains why | Section 6.2 |
| Authorisation and persistence changes state their impact | Section 6.3 |

## Required Evidence

- The commit message itself, reviewed as part of the pull request
- The requirement or scenario ID in the footer
- For a squash merge, a conforming squash message, per `PB-ENG-03` section 5

## What Blocks Progression

- The type or scope is outside the permitted lists
- No requirement reference in the footer
- A secret is present in the diff or in history
- The commit would make the checks fail on a merged branch
- A failing test was deleted or marked expected without a recorded reason
- A breaking change lacks the required notation
- A squash merge discarded the branch's commit messages

## Exception Process

**PROPOSED.** A commit that genuinely references no requirement — a repository-hygiene change, for
instance — records `PB-ENG-20` or the relevant engineering playbook in the footer. The reference
field is never simply omitted.

**No exception exists for committing a secret, deleting a test to pass a build, or committing to a
merged branch with failing checks.** Governance principles 7 and 15 are absolute.

---

## Completion Criteria

- The convention is adopted and the format agreed
- A message template is available to developers
- Enforcement is in place where the selected tooling supports it, per OQ-48
- The permitted types and scopes are recorded in this document

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| CMT-01 | Happy path | Requirement implemented | `feat(scope):` subject, footer with `FR-NNN-NNN` |
| CMT-02 | Happy path | Defect fixed | `fix(scope):` subject, body states the observed failure |
| CMT-03 | Invalid | Type outside the permitted list | Rejected at review |
| CMT-04 | Invalid | Scope outside the permitted list | Rejected at review |
| CMT-05 | Invalid | No footer reference | Rejected at review |
| CMT-06 | Invalid | Subject in past tense | Rejected; imperative required |
| CMT-07 | Invalid | Subject over 72 characters | Rejected |
| CMT-08 | Invalid | Subject with a trailing full stop | Rejected |
| CMT-09 | Invalid | Body restates the diff rather than the reason | Rejected at review |
| CMT-10 | Boundary | Commit spans two modules legitimately | Both scopes named, or no scope |
| CMT-11 | Failure | Breaking change without `!` and `BREAKING CHANGE:` | Rejected |
| CMT-12 | Failure | Refactor and behaviour change in one commit | Rejected; separate them |
| CMT-13 | Failure | Tests committed in a later commit | Rejected; tests accompany the change |
| CMT-14 | Failure | Documentation deferred to a later commit | Rejected; principle 11 |
| CMT-15 | Failure | Test deleted to make a build pass | **Blocked**, `PB-ENG-08` section 7 |
| CMT-16 | Failure | Test marked expected failure without a reason | **Blocked** |
| CMT-17 | Unauthorized | Debug statement committed | Rejected; `NFR-SEC-012` |
| CMT-18 | Unauthorized | Commented-out code committed | Rejected at review |
| CMT-19 | Invalid | Secret committed | **Blocked**; `PB-ENG-12` section 6 |
| CMT-20 | Failure | Dependency directory committed | Rejected; reproducible from the manifest |
| CMT-21 | Boundary | Lockfile committed | **Permitted**, section 5.1 |
| CMT-22 | Failure | Real student data committed | **Blocked**; `NFR-SEC-013` |
| CMT-23 | Invalid | Squash merge with a default message | Rejected; `PB-ENG-03` section 5 |
| CMT-24 | Failure | Authorisation change without a statement of who is now denied | Rejected at review |
| CMT-25 | Failure | Persistence change with no migration note | Rejected; `PB-ENG-14` |

---

## Exit Criteria

- The convention is in use
- OQ-48 answered, so message validation can be automated where supported
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-05 Commit Conventions](PB-ENG-05-COMMIT-CONVENTIONS.md) ·
[PB-ENG-04 Branching](PB-ENG-04-BRANCHING.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-07 Code Review](PB-ENG-07-CODE-REVIEW.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-19 Documentation](PB-ENG-19-DOCUMENTATION.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)