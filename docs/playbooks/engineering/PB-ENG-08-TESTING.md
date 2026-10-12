# PB-ENG-08 — Testing

**Playbook:** PB-ENG-08
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No test exists. No test tooling has been selected, no framework is
> installed, and nothing is automated. Every scenario identifier cited in this document names a test
> that does not yet exist as code. See the status section.

---

## Purpose

Define how the Event Registration and Notification System is tested, which levels exist, what must pass
before a change is merged and before a release, and how failed tests are handled.

[TESTSING-STRATEGY.md](../../planning/TESTING-STRATEGY.md) states **what** is tested and which
requirement each scenario validates. This playbook states **how** testing is performed and what blocks
progression.

---

## Scope

**Applies to:** every test written for ERNS, and every change that affects existing tests.

**Does not apply to:** which scenarios exist, in `TESTING-STRATEGY.md`; pipeline automation, in
`PB-ENG-09 CI`; release gates beyond testing, in `PB-ENG-16 Release Management`.

---

## Ownership

**Responsible:** the Developer writing the change.
**Accountable:** the technical owner for the affected module.
**Consulted:** a reviewer, for the adequacy of the tests rather than their content.

---

## 1. The Governing Principle

**CONFIRMED.** Tests validate requirements, not coverage figures.

**A test suite that checks "the endpoint returns success" would pass while duplicate registrations were
possible and attendance was unverifiable.** ERNS's value is trustworthy records, so a suite that
cannot fail on the defects that matter provides no assurance at all.

### 1.1 The question every test must answer

**PROPOSED.** Before writing a test, state what would make it fail:

> If requirement FR-REG-014 were unimplemented, would this test fail?

If the answer is no, the test is not verifying the requirement. It is verifying the framework.

### 1.2 Coverage is not a target

**A coverage percentage is a measurement, not a goal.** Raising it can be achieved by testing
uninteresting code thoroughly while the authorisation logic remains untested.

**The measure that matters** is the scenario coverage in
[TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md) section 3, plus the meta-tests `TST-01` to
`TST-10`.

---

## 2. Test Levels

Seven levels, per `TESTING-STRATEGY.md` section 2.

| Level | Scope | Runs on | Gate |
|---|---|---|---|
| Unit | One rule or function in isolation | Every commit | **Blocks merge** |
| Integration | Multiple components against a real storage layer | Every push | **Blocks merge** |
| Service / API | Request and response contract, authorisation | Every push | **Blocks merge** |
| End-to-end | Complete user journeys through the interface | Pre-release | **Blocks release** |
| Security | Authorisation, injection, session handling | Pre-release and on change | **Blocks release** |
| Regression | Prior defect scenarios | Every release | **Blocks release** |
| Acceptance | Business scenario with stakeholders | Pre-release | **Blocks release** |

### 2.1 Integration is the most important level for ERNS

**PROPOSED.** This is specific to this system, not a general preference.

| Guarantee | Enforced by | Unit-testable? |
|---|---|---|
| No duplicate registration | A storage constraint, `NFR-INTEG-001` | **No** |
| Two simultaneous registrations for the last slot produce one success | A transaction boundary, `NFR-INTEG-007` | **No** |
| No duplicate attendance | A storage constraint, `NFR-INTEG-002` | **No** |
| Approval steps decided in sequence | A constraint, `NFR-INTEG-006` | Only by faking the constraint |

**A unit test can assert that the application issues a duplicate check. It cannot assert that a
duplicate is impossible.** Only an integration test against a real storage layer can.

`CON-01`, `CON-02`, `CON-03`, `CON-07`, and `TST-02`, `TST-09` therefore require a genuine storage
layer. A test that mocks it verifies the mock.

### 2.2 Unit level

**PROPOSED.** The domain layer is pure logic per
[SYSTEM-ARCHITECTURE.md](../../architecture/SYSTEM-ARCHITECTURE.md) SD-A, so registration validation
in the nine-step locked order is directly testable with no database.

| Target | Scenario |
|---|---|
| The nine-step validation order | `RV-03`, `TST-03` |
| Capacity arithmetic | `RV-11` |
| Deadline boundary policy | `NEG-02`, `NEG-03`, `NEG-13` |
| Lifecycle transition validity | `NFRD-09`, `TST-10` |
| Audience resolution | `RV-17`, `NOTIF-01` to `NOTIF-05` |
| Status domain restrictions | `RV-06`, `RV-13` |

**These tests are fast and they are where a defect is cheapest to fix.** They do not, on their own,
establish any of ERNS's integrity guarantees.

### 2.3 Service and API level

**REQUIRED** for every operation in the authorisation matrix in
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) section 4.

| Property | Requirement |
|---|---|
| Every operation authorised server-side | `NFR-SEC-004` |
| Every role tested against every row it can touch | `AUTH-01` to `AUTH-15` |
| No operation reachable without a grant | `NFR-SEC-005` |
| Rejected requests return no data | `NFR-SEC-018` |

**A new operation added without a service-level authorisation test is not complete**, because nothing
else in the system will exercise its denial path.

### 2.4 End-to-end level

**PROPOSED.** Reserved for the complete journeys that carry ERNS's primary functions:

| Journey | Covers |
|---|---|
| Event creation to approval to publication to registration to notification | Primary Function 1 and 2 end to end |
| Registration to attendance scan to finalisation to evaluation to archive | The participation record's full life |
| Notification composition through targeting, dispatch, read, and acknowledgement | Primary Function 2 |
| Officer participant-list view and export | Personal data access, `FR-NOT-047` |
| Student cancellation and its effect on capacity | `PB-04`, `PB-05` |

**End-to-end tests are slow and brittle, which is why they are few.** Their role is to confirm the
layers work together, not to cover the conditions the lower levels already cover.

### 2.5 Security level

**REQUIRED** before release, and on any change touching authorisation, session, or input handling.
Scenario set `SEC-01` to `SEC-13` in `TESTING-STRATEGY.md` section 3.9, plus `NFRD-01` to `NFRD-18`.

**This is a blocking level, not an optional one.** It is separated from the merge gates because it is
expensive and runs on change rather than every commit.

### 2.6 Regression level

**REQUIRED** for every defect fixed. The failing scenario is added before the fix, per
`PB-ENG-01` section 1.

**Every defect fix MUST include a test that failed before it and passes after.** Without one, the same
defect returns, and nothing records that it was ever fixed.

| Defect class | Regression test |
|---|---|
| Duplicate registration | `CON-02` |
| Capacity race | `CON-01`, `TST-09` |
| Duplicate attendance | `CON-03` |
| Authorisation bypass | The relevant `AUTH-nn` |
| Validation order inversion | `RV-03` |
| Notification audience drift | `NOTIF-16`, `TST-08` |

### 2.7 Acceptance level

**REQUIRED** before release, with the Council Secretary participating.

Acceptance tests are business scenarios, not technical ones: can an officer create and publish an event
in the sequence the Council actually uses; can a student register and cancel; can attendance staff
record presence.

**This is the only level that validates against the organisation's real process** rather than against
the documentation of it. If the documentation is wrong, acceptance testing is what reveals it.

---

## 3. When Tests Are Required

| Change | Tests required |
|---|---|
| New requirement | At least one test that fails if the requirement is unimplemented |
| Defect fix | A regression test that failed before the fix |
| Refactoring | Existing tests unchanged and passing. **Changed tests mean behaviour changed** |
| Authorisation change | A service-level test for each affected matrix row, in both directions |
| Persistence change | A migration test, and a concurrency test where a constraint is involved |
| Notification change | An audience test, and an in-app-versus-email independence test |
| Documentation only | None |
| Configuration or tooling | Only where behaviour could change |

### 3.1 The refactoring rule

**A refactoring that changes a test is not a refactoring.**

This is the most reliable signal available: if a test needed changing during a refactor, either the
behaviour changed or the test was asserting an implementation detail rather than a requirement. Both
need investigating, and neither should be discovered by a reviewer.

---

## 4. What Must Pass Before Approval

**REQUIRED**, per governance principles 5 and 14.

| Gate | Requirement |
|---|---|
| All unit tests pass | Blocks merge |
| All integration tests pass | Blocks merge |
| All service and API tests pass | Blocks merge |
| Type checking clean | Blocks merge |
| Linting clean | Blocks merge |
| No new failing test | Blocks merge |
| Test evidence in the pull request | Blocks merge, per `PB-ENG-06` section 3.3 |
| Coverage did not decrease | Recommended |
| Meta-tests `TST-01` to `TST-10` pass | Recommended at this stage, **required before release** |

**Governance principle 14 is absolute.** A failed validation blocks promotion where the rule requires
it, with no override.

### 4.1 Flaky tests

A test that passes intermittently is worse than no test, because it trains everyone to re-run rather
than to investigate.

| Rule | Action |
|---|---|
| A flaky test is a defect | Fixed, not retried |
| Re-running to obtain a pass is prohibited | Governance principle 15 |
| A test quarantined without a fix and a reason | Not permitted as a permanent state |

**If a test is flaky because it asserts timing, it is asserting the wrong thing.** Tests that involve
concurrency must control the ordering deliberately, as `CON-01` to `CON-07` do.

---

## 5. Test Evidence

**REQUIRED** to be specific, per `PB-ENG-06` section 3.3.

| Adequate evidence | Inadequate |
|---|---|
| "CON-01 added. Fails without the transaction change, passes with it." | "Concurrency fixed." |
| "Full suite 214 passing, 0 failing. 6 tests added." | "Tests pass." |
| "Output pasted from the run, with the commit identifier." | "Ran locally, all good." |
| "Accessibility scan: no new violations at AA." | "Accessibility checked." |
| "Not applicable: documentation only." | Section omitted |

### 5.1 What counts as evidence

| Evidence | Adequate |
|---|---|
| The run output, with the commit | Yes |
| A screenshot of the pipeline result | Yes |
| "It passed on my machine" | **No** |
| A verbal assurance in review | **No** |
| "No tests were needed" | Only with a reason |

**Evidence exists so that a later reader can confirm the claim without running anything.** The Council
will ask which requirements are implemented, and this is the record that answers it.

---

## 6. Handling Failed Tests

**A failed test blocks.** Governance principle 14. **PROPOSED** sequence:

1. The merge is blocked
2. Triage: is this a real defect, a wrong test, or an environment failure?
3. A real defect is fixed, or the requirement is formally changed first, per `PB-ENG-20`
4. A wrong test is corrected in a **separate, visible change**
5. A test is not deleted to make a build pass without a recorded reason
6. A test is not marked as expected failure without a recorded reason
7. The triage outcome is recorded on the pull request or the issue

### 6.1 The five prohibited moves

**Each defeats the purpose of the test.**

| Move | What it does |
|---|---|
| Delete the test | Removes the requirement it verified |
| Mark it expected-failure | The same, with a mechanism that survives review |
| Add a skip | The same, and skips stay indefinitely |
| Add a bypass flag | Makes the check optional from then on |
| Change the assertion to match the behaviour | Ends the test's ability to detect the original defect |

**A skipped test is the easiest way to silently lose a requirement.** Each one requires a written
justification that survives review, and `TST-01` to `TST-10` check whether the suite can still fail on
the important defects.

### 6.2 When the requirement is wrong

**Amend the requirement first, then change the test.** `PB-ENG-20 Change Management`.

Changing a test because the requirement was misunderstood inverts the order, and produces a test that
now enshrines behaviour nobody approved.

---

## 7. Test Data

**PROPOSED**, per `TESTING-STRATEGY.md` section 6.

| Rule | Reason |
|---|---|
| **Synthetic data only.** No production data in any environment | Real student records where controls are weakest |
| Generated to the shape needed | A 400-student dispatch needs 400 synthetic students, not a copy |
| Volume sufficient for boundaries | Capacity minus one, exactly at capacity, one above |
| At least two parallel clients for `CON` scenarios | Concurrency scenarios are meaningless with one |
| Fixed, deterministic dates and times | Time-driven transitions must be testable |
| Reseeded, not manually edited | A hand-edited fixture is a defect waiting to be rediscovered |
| Personal data absent from output | `NFR-SEC-013` extends to test output |

### 7.1 Boundary volume is the requirement

**`NEG-01` through `NEG-06` exist because boundaries are where requirements actually get violated.**
Test data sized for the happy path cannot exercise them.

| Boundary | Data needed |
|---|---|
| Capacity | Capacity minus one, exactly at, one above |
| Deadline | Before, exactly at, after |
| Attendance window | Before, inside, after |
| Notification audience | Empty, one recipient, the whole student body |

### 7.2 `NEG-02` and `NEG-03` require a documented policy

**Whether a deadline is inclusive or exclusive is a decision, not an implementation detail.**
`NEG-02` and `NEG-03` cannot be written until the policy is stated. Per
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) section 1, no
arbitrary figure is asserted; the policy is recorded and then tested.

**This is a small unanswered question that currently blocks two scenarios.** It needs a decision.

---

## 8. Meta-Tests

**REQUIRED** before release. `TST-01` to `TST-10` verify that the suite would actually catch each
structural defect that matters.

| ID | Verifies that this fails |
|---|---|
| `TST-01` | A duplicate registration defect exists |
| `TST-02` | The storage uniqueness constraint is removed |
| `TST-03` | The validation order is reordered |
| `TST-04` | A `Delivered` state is added to the schema |
| `TST-05` | An officer is granted attendance correction |
| `TST-06` | Role revocation stops invalidating sessions |
| `TST-07` | An audit write fails and the state change proceeds |
| `TST-08` | The notification audience is re-evaluated on read |
| `TST-09` | The capacity check moves outside the transaction |
| `TST-10` | The approval chain auto-advances on timeout |

**These are the tests that verify the test suite.** A suite that cannot fail on `TST-03` is not
providing evidence that validation order is enforced, however many tests it contains.

**How they work.** Each temporarily breaks a structural guarantee and confirms the corresponding
scenario fails. They run as a separate suite, not as part of the normal run, because each one
deliberately breaks something.

**`TST-04` is verified by schema inspection, not by a request**, because the requirement is that the
state does not exist.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Every test would fail if its requirement were unimplemented | Section 1.1 |
| A defect fix includes a regression test that failed before it | Section 2.6 |
| Authorisation changes test each affected matrix row in both directions | Section 2.3 |
| Concurrency constraints tested against a real storage layer | Section 2.1 |
| Refactoring leaves existing tests unchanged | Section 3.1 |
| All merge-gate tests pass | Section 4 |
| Test evidence is specific | Section 5 |
| No test deleted, skipped, or marked expected without a recorded reason | Section 6.1 |
| Synthetic data only, no production data | Section 7 |
| Meta-tests pass before release | Section 8 |

## Required Evidence

- Test output with the commit identifier
- The scenario that fails without the change, for a defect fix
- Triage outcome for any failure
- A recorded reason for any skip, deletion, or expected-failure marker
- Meta-test results before release

## What Blocks Progression

- Any test is failing
- A test was deleted, skipped, or marked expected without a reason
- A defect fix has no regression test
- No test evidence in the pull request
- Production data is present in a test environment
- A flaky test is being re-run to obtain a pass
- Coverage is used as the justification for a change

## Exception Process

**PROPOSED.** A test may be marked as expected failure **only** when the requirement is knowingly
unimplemented and the gap is recorded as an issue with a condition for resolution. Each such marker is
reviewed individually and carries an owner.

**No exception exists for** deleting a test to make a build pass, re-running to obtain a pass, or
modifying an assertion to match incorrect behaviour. Governance principles 14 and 15 are absolute.

---

## Completion Criteria

- The seven levels are in use
- Every requirement has a test that would fail without it, or is labelled unverified
- Every uniqueness constraint has a concurrency test
- Every authorisation matrix row has a test in both directions
- Meta-tests `TST-01` to `TST-10` pass
- Test evidence is in the pull request
- `NEG-02` and `NEG-03` policies are documented and tested

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| TST-01 | Happy path | Requirement implemented with a test that fails without it | Merged |
| TST-02 | Happy path | Defect fix with a failing-before regression test | Merged |
| TST-03 | Invalid | Requirement with no test | Rejected at review |
| TST-04 | Invalid | Test that passes without the feature | Rejected; section 1.1 |
| TST-05 | Failure | Test deleted to make a build pass | **Blocked**, section 6.1 |
| TST-06 | Failure | Test marked expected failure with no reason | **Blocked** |
| TST-07 | Failure | Test skipped permanently | **Blocked**, section 6.1 |
| TST-08 | Unauthorized | Flaky test re-run to obtain a pass | **Blocked**, section 4.1 |
| TST-09 | Failure | Coverage increased while authorisation untested | Rejected; section 1.2 |
| TST-10 | Invalid | Concurrency test with a mocked storage layer | Rejected; section 2.1 |
| TST-11 | Failure | Refactoring that required changing a test | Investigated as a behaviour change |
| TST-12 | Failure | Authorisation change with no denial test | Rejected; section 2.3 |
| TST-13 | Invalid | New operation with no service-level test | Rejected |
| TST-14 | Boundary | Capacity tested only below the limit | Rejected; section 7.1 |
| TST-15 | Invalid | `NEG-02` written before the deadline policy is stated | Rejected; section 7.2 |
| TST-16 | Failure | Production data used as a fixture | **Blocked**; section 7 |
| TST-17 | Invalid | Personal data in test output | Rejected; `NFR-SEC-013` |
| TST-18 | Failure | Hand-edited fixture instead of reseeding | Rejected; section 7 |
| TST-19 | Failure | Requirement changed to match the test | Rejected; amend the requirement first |
| TST-20 | Failure | Assertion changed to match incorrect behaviour | **Blocked**, section 6.1 |
| TST-21 | Failure | Meta-test `TST-01` does not fail | Rejected; the suite cannot detect duplicates |
| TST-22 | Failure | Meta-test `TST-03` does not fail | Rejected; validation order unverified |
| TST-23 | Boundary | `TST-04` verified by schema inspection | Accepted; the state must not exist |
| TST-24 | Invalid | "It passed on my machine" as evidence | Rejected; section 5.1 |
| TST-25 | Failure | Evidence omitted for a documentation-only change | Rejected; state "not applicable" with a reason |
| TST-26 | Happy path | Acceptance test with the Council Secretary | Accepted as business validation |
| TST-27 | Failure | Requirement gap in section 4.2 of the strategy | Labelled unverified, not hidden |
| TST-28 | Invalid | End-to-end test duplicating lower-level coverage | Rejected; section 2.4 |

---

## Exit Criteria

- All seven levels in use
- Scenario coverage in `TESTING-STRATEGY.md` section 3 complete or gaps closed
- Meta-tests passing
- OQ and the deadline boundary policy resolved so `NEG-02` and `NEG-03` can be written
- Council Secretary participating in acceptance testing
- `PB-ENG-09 CI` implemented, so these gates run automatically
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-07 Code Review](PB-ENG-07-CODE-REVIEW.md) ·
[PB-ENG-16 Release Management](PB-ENG-16-RELEASE-MANAGEMENT.md) ·
[TRACEABILITY-MATRIX.md](../../planning/TRACEABILITY-MATRIX.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md)