# PB-ENG-07 — Code Review

**Playbook:** PB-ENG-07
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Reviewer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No pull request has been reviewed. This playbook specifies the checklist
> and the standard, not a record of reviews performed.

---

## Purpose

Define what a reviewer of the Event Registration and Notification System examines, and what makes a
review complete.

This playbook exists because the review is the last point at which a defect can be caught cheaply, and
the only point at which a requirement can be checked against what was actually built.

---

## Scope

**Applies to:** every review of a change to ERNS.

**Does not apply to:** which checks must pass, in `PB-ENG-09 CI`; pull request content requirements, in
`PB-ENG-06 Pull Requests`.

---

## Ownership

**Responsible:** the reviewer.
**Accountable:** the technical owner for the affected module.
**Consulted:** the author, for clarification — never for permission.

---

## 1. What Review Is For

A code review answers four questions, in this order. **A review that answers only the first is
incomplete.**

| # | Question | Test |
|---|---|---|
| 1 | Is it correct? | Does it do what the requirement says, in all the specified cases? |
| 2 | Is it safe? | Can it be misused, bypassed, or broken by a dependency failing? |
| 3 | Is it maintainable? | Will the next person understand it, and can they change it safely? |
| 4 | Is it documented? | Will the next person know what it was for? |

### 1.1 Review is not a gate on style

**Formatting, naming conventions, and mechanical style are the tool's job, not the reviewer's.**

| Automated — do not review | Judgement — must be reviewed |
|---|---|
| Formatting | Whether the logic is correct |
| Import ordering | Whether the design is appropriate |
| Lint rules | Whether the abstraction is warranted |
| Naming conventions that a linter enforces | Whether the name matches the domain, per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 5 |
| Line length | Whether the complexity is justified |

**A reviewer who comments on formatting has substituted their preference for the project's configured
standard.** This is not harmless: it makes reviews slower, and it teaches authors that review is
arbitrary, which reduces the attention given to the comments that matter.

**The one exception** is a domain term that conflicts with [CONVENTIONS.md](../../planning/CONVENTIONS.md)
— using `Delivered` as a notification state, or `ATTENDED` as a registration status. That is a
correctness defect, because those terms are prohibited precisely because the underlying capability does
not exist.

---

## 2. The Checklist

Fourteen items. Each names what to look for and what a failure looks like.

### 2.1 Correctness

| Check | What to look for | Failure looks like |
|---|---|---|
| Requirement match | Does the change satisfy the cited requirement, in all its specified cases? | A requirement with only the happy path implemented |
| Edge cases | Boundary conditions from [TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md) section 3.4 | Capacity of one, two registrations attempted; deadline boundary |
| Error paths | What happens when a dependency fails? | Only the success path is handled |
| State transitions | Is every state change in the permitted transition set? | A new status, or a transition not in `T-01` to `T-20` |
| Off-by-one | Boundary arithmetic | `>=` where `>` was specified |
| Null and empty | Are they distinguished from absent? | An empty field treated as a value |

### 2.2 Requirements compliance

| Check | What to look for | Failure looks like |
|---|---|---|
| Traceability | Is every changed behaviour traceable to a requirement? | A change with no requirement reference |
| Scope | Does it strengthen Event Registration or Notification, or is justification recorded? | A feature serving neither, per `PB-ENG-01` section 1.1 |
| Scope creep | Does it do more than the requirement asks? | Unrequested refactoring in a feature pull request |
| Prohibited terminology | Does it use a locked term incorrectly? | `WAITLISTED`, `ATTENDED`, `ABSENT` as registration states |
| Out-of-scope features | Is anything from the excluded list present? | Payments, biometrics, GPS, recommendations |

### 2.3 Security

| Check | What to look for | Failure looks like |
|---|---|---|
| Authorisation | Is every operation authorised server-side? | A check in the interface only |
| New grants | Does a new operation have a grant, or is it correctly denied? | An operation nobody reasoned about |
| Request fields | Is every new field validated before it is trusted? | The 2.4 case below |
| Injection | Is data access parameterised? | String concatenation into a query |
| Output encoding | Is untrusted text encoded on output? | Raw rendering of event content or a name |
| Secrets | Is anything sensitive present? | A key, token, or `.env` value |
| Error detail | Does a failure disclose internals? | A stack trace or connection string in output |
| Logging | Is personal data absent from logs? | A full request body logged |

### 2.4 Authorisation — the specific check

**This deserves its own heading because it is the most likely real defect in ERNS.**

The authorisation matrix in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) section 4 states who may
do what. A reviewer checks three things:

| # | Question | Failure |
|---|---|---|
| 1 | Is every operation in the matrix present in the change, with the correct rule? | A row silently omitted |
| 2 | Is any operation present that is **not** in the matrix? | An unrecorded capability |
| 3 | Does the change alter any existing row? | A widened permission nobody decided on |

**The most common failure is a new request field that is trusted without validation.** The
authorisation check was written for the previous request shape. A new field arrives, is not in the
check, and is used. This is not an attack — it is an ordinary feature that quietly bypasses a control
someone wrote carefully.

**Reviewer action:** for any change touching authorisation, read the matrix first, then the diff, then
the matrix again. Scenario `NFRD-14` exists to catch what reading alone does not.

### 2.5 Validation

| Check | What to look for | Failure looks like |
|---|---|---|
| Boundary | Are limits enforced, not assumed? | A length limit documented but not enforced |
| Type | Are types enforced at the boundary? | A value cast and trusted |
| Validation order | Is order preserved where specified? | The nine-step registration order rearranged |
| Deny by default | Does anything fail open? | A missing grant returning allow |
| File type | Are uploads validated by content, not extension? | Extension checking only |

### 2.6 Error handling

| Check | What to look for | Failure looks like |
|---|---|---|
| Unavailable dependency | Is the failure a recorded state rather than an exception? | An exception escaping to the user |
| Partial write | Is the transaction boundary correct? | Records created without their dependents |
| Unaudited change | Does an audit failure refuse the change? | The change committed, the audit logged separately |
| Information | Does the user get something actionable? | "An error occurred", per `NFR-USAB-002` |
| Retry | Is a transient failure retried rather than lost? | A dropped notification, per `NFR-AVAIL-006` |

### 2.7 Data integrity

| Check | What to look for | Failure looks like |
|---|---|---|
| Constraints | Is uniqueness enforced at the storage layer? | An application check presented as the safeguard |
| Transactions | Is check-then-write inside one boundary? | Capacity checked before the transaction opens |
| Migration | Does a schema change have a reversible migration? | A migration with no rollback |
| Orphan prevention | Can a child exist without its parent? | No foreign key, per `NFR-INTEG-003` |
| Retention | Does a change preserve history? | A delete where a correction belongs |

### 2.8 Duplicate handling

**Reviewed explicitly because duplicate prevention is ERNS's core reliability guarantee.**

| Duplicate | Required behaviour | Scenario |
|---|---|---|
| Registration, same user and event | Second refused | `RV-01`, `RV-02`, `CON-02` |
| Registration for the last slot | Exactly one succeeds | `CON-01` |
| Attendance for one registration | Second refused | `RV-21`, `CON-03` |
| Notification recipient | One per student | `RV-18` |
| Approval decision on one step | One recorded | `CON-07` |
| Concurrent dispatch | One recipient set | `CON-06` |

**A reviewer asks: if two requests arrive simultaneously, what happens?** Application-level checks
answer correctly for one request and incorrectly for two.

### 2.9 Performance

| Check | What to look for | Failure looks like |
|---|---|---|
| Query shape | Does an index exist for the query's access pattern? | A scan on a growing table |
| N+1 | Repeated queries in a loop | A participant list issuing one query per row |
| Dispatch | Is organisation-wide fan-out outside the request path? | A synchronous loop over the student body |
| Pagination | Are large lists bounded? | The whole participant list in one response |
| Caching | Is anything cached that must not be? | An authenticated page cached |

### 2.10 Testing

| Check | What to look for | Failure looks like |
|---|---|---|
| Requirement coverage | Does a test fail if the requirement is unimplemented? | A test asserting the endpoint returns success |
| Concurrency | Is there a test for each uniqueness constraint? | Application checks only |
| Authorisation | Is there a test for each matrix row touched? | One happy-path authorisation test |
| Negative | Are invalid inputs tested? | Only valid inputs |
| Boundary | Are the boundaries from section 3.4 tested? | Capacity tested only below the limit |
| Test honesty | Would this test fail if the code were wrong? | A test asserting nothing meaningful |

**The last row is the one that catches hollow tests.** A test that passes whether or not the feature
exists provides no assurance and costs maintenance.

### 2.11 Maintainability

| Check | What to look for | Failure looks like |
|---|---|---|
| Single purpose | Does each unit have one reason to change? | A unit doing validation, persistence, and formatting |
| Naming | Do names match the domain vocabulary? | `data`, `handler`, `manager` |
| Dead code | Is anything unreachable or commented out? | A disabled block nobody removed |
| Complexity | Is the abstraction earning its cost? | An interface with one implementation |
| Layering | Does the dependency rule hold? | Domain logic performing I/O |

**Unnecessary complexity is a real finding.** It is not a matter of taste: a reviewer who cannot
determine what a component does without reading it in full has evidence that the next person will not
manage it either.

### 2.12 Documentation

| Check | What to look for | Failure looks like |
|---|---|---|
| Synchronised | Did the affected document change in this pull request? | A behaviour change with no playbook update |
| Traceable | Is the commit footer referenceable? | No requirement ID |
| Honest | Does the documentation say what exists? | "Implemented" for something specified |
| Open questions | Is a new unresolved decision registered? | An inline `> OPEN QUESTION:` with no registry entry |

### 2.13 Secrets and sensitive data

| Check | What to look for |
|---|---|
| Credentials | Any key, token, password, or connection string |
| `.env` | Any file carrying values rather than keys |
| Personal data | Real student data in fixtures, examples, or test output |
| Generated files | Dependency directories, build output, database dumps |

Per `PB-ENG-12` section 6, **a secret in history requires rotation, not deletion.**

### 2.14 Dependencies

| Check | What to look for |
|---|---|
| Approved | Is it in the approved stack, per `PB-ENG-02` section 3.2? |
| Licence | Recorded, per [TECH-STACK.md](../../architecture/TECH-STACK.md) section 4 step 4 |
| Necessary | Is an existing capability being reimplemented? |
| Lockfile | Updated and committed |

---

## 3. Completing a Review

**PROPOSED.**

| Step | Requirement |
|---|---|
| 1 | Read the requirement cited in the pull request **before** the diff |
| 2 | Read the pull request description, including the security assessment |
| 3 | Work through section 2 in order |
| 4 | Run the checks locally if the change is security or persistence related |
| 5 | Mark each of the fourteen items as considered. Not necessarily passed — considered |
| 6 | Distinguish blocking comments from suggestions, visibly |
| 7 | Approve only when no blocking comment is outstanding |

### 3.1 Blocking versus suggestion

**Required, and visibly so.** An unmarked comment is an instruction, and an author cannot tell which
to act on.

| Blocking | Suggestion |
|---|---|
| Incorrect behaviour against a requirement | A naming improvement |
| A missing authorisation check | A structural preference |
| A missing test for a specified guarantee | A simplification opportunity |
| A secret or personal data | A comment about clarity |
| A prohibited term | A question about future intent |

**A reviewer who marks everything blocking trains authors to ignore the category**, which removes the
value of marking anything at all.

### 3.2 Approving

**PROPOSED.** A reviewer approves when:

1. Every requirement in the pull request is satisfied, or the gap is consciously accepted and recorded
2. Every blocking comment is resolved
3. The security assessment was answered, not skipped
4. The tests would fail if the change were wrong
5. The documentation is synchronised

**An approval is a statement that the change is correct**, not that the reviewer read it. Approving a
change with an unresolved blocking comment transfers responsibility for it to the author without
transferring the review.

### 3.3 Requesting changes versus commenting

**Requesting changes blocks the merge. Commenting does not.** When the change needs work, request
changes so the block is unambiguous. A comment that says "this must change" and does not block is a
comment that gets ignored exactly when it mattered.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| All fourteen checklist items considered | Section 2 |
| Requirement read before the diff | Section 3 step 1 |
| Authorisation matrix read for authorisation changes | Section 2.4 |
| Every matrix row touched has a test | Section 2.10 |
| Blocking comments distinguished from suggestions | Section 3.1 |
| No approval with an unresolved blocking comment | Section 3.2 |
| Style concerns deferred to the tooling | Section 1.1 |
| Secrets and personal data absent | Section 2.13 |
| Dependencies approved | Section 2.14 |

## Required Evidence

- Review comments on the pull request
- Each of the fourteen items marked considered
- Blocking comments resolved before approval
- An explicit approval, from someone other than the author

## What Blocks Progression

- A blocking comment is unresolved
- The reviewer is the author
- A requirement is unsatisfied
- A matrix row is untested
- A secret or personal data is present
- Documentation is not synchronised
- The reviewer approved without reading the requirement

## Exception Process

**None.** A review is either complete or it is not. Where a reviewer genuinely cannot assess an area,
they say so explicitly in the review and the pull request waits for someone who can.

**This is deliberately the strictest playbook in the set.** The exception route exists for every other
engineering playbook because processes sometimes need to bend. It does not exist here, because a
review that can be waived is a review that can be skipped.

---

## Completion Criteria

- The fourteen items are in use
- Blocking and suggestion comments are distinguished
- Authorisation changes are reviewed against the matrix, not from memory
- Reviewers approve only after resolving blocking comments
- The team agrees that formatting is the tool's job

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| REV-01 | Happy path | Requirement implemented, tested, documented | Approved and merged |
| REV-02 | Invalid | Requirement with only the happy path | Blocking comment; changes requested |
| REV-03 | Failure | Authorisation check added to the interface only | Blocking comment; `NFR-SEC-004` |
| REV-04 | Failure | New request field trusted without validation | Blocking comment; section 2.4 |
| REV-05 | Failure | A matrix row omitted from the implementation | Blocking comment; section 2.4 question 1 |
| REV-06 | Failure | An operation present that is not in the matrix | Blocking comment; question 2 |
| REV-07 | Failure | An existing permission widened | Blocking comment; question 3 |
| REV-08 | Failure | Capacity checked outside the transaction | Blocking comment; `CON-01` would fail |
| REV-09 | Failure | Registration check presented as the uniqueness guarantee | Blocking comment; `NFR-INTEG-001` |
| REV-10 | Failure | Test that passes whether or not the feature exists | Blocking comment; section 2.10 |
| REV-11 | Failure | Audit failure logged while the change commits | Blocking comment; `FAIL-05` |
| REV-12 | Invalid | String concatenation into a query | Blocking comment; `NFR-SEC-008` |
| REV-13 | Invalid | Untrusted text rendered without encoding | Blocking comment; `NFR-SEC-007` |
| REV-14 | Invalid | Stack trace surfaced to a user | Blocking comment; `NFR-SEC-012` |
| REV-15 | Failure | Personal data logged | Blocking comment; `NFR-SEC-013` |
| REV-16 | Failure | Secret in the diff | **Blocked**; `PB-ENG-12` |
| REV-17 | Invalid | Dependency added with no approval row | Blocking comment; `PB-ENG-13` |
| REV-18 | Invalid | Migration with no rollback | Blocking comment; `PB-ENG-14` |
| REV-19 | Invalid | `WAITLISTED` used as a registration status | Blocking comment; prohibited term |
| REV-20 | Invalid | Comment on formatting that a linter enforces | Redirected to the tooling, section 1.1 |
| REV-21 | Invalid | Reviewer comments on own change as the only approver | **Blocked**, section 8.1 of `PB-ENG-06` |
| REV-22 | Failure | Approving with an unresolved blocking comment | **Blocked**, section 3.2 |
| REV-23 | Invalid | Every comment marked blocking | Rejected; section 3.1 |
| REV-24 | Invalid | "Must change" left as a non-blocking comment | Converted to changes requested |
| REV-25 | Failure | Documentation not synchronised | Blocking comment; principle 11 |
| REV-26 | Boundary | Authorisation row tested only in the happy direction | Blocking comment; section 2.10 |
| REV-27 | Failure | Reviewer cannot assess the area | Explicitly stated; pull request waits |
| REV-28 | Invalid | Behaviour change with no requirement reference | Blocking comment; principle 1 |
| REV-29 | Invalid | Unrelated refactoring in a feature pull request | Blocking comment; section 2.2 |
| REV-30 | Failure | Commented-out code retained | Blocking comment; section 2.11 |

---

## Exit Criteria

- The checklist is in regular use
- Reviewers apply the blocking and suggestion distinction
- Authorisation changes are reviewed against the matrix
- The team agrees that automated formatting is not a review concern
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-07 Code Review](PB-ENG-07-CODE-REVIEW.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-05 Commit Conventions](PB-ENG-05-COMMIT-CONVENTIONS.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md)