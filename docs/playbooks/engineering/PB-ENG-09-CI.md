# PB-ENG-09 — Continuous Integration

**Playbook:** PB-ENG-09
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No pipeline exists.** No CI configuration has been written, no workflow
> is registered, no automated check runs on any event, and no status check is enforced on `main`. Every
> check listed in this document is a **target state**. Per
> [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, this document MUST NOT be read as
> describing a control that is operating.

---

## Purpose

Define the continuous-integration pipeline for the Event Registration and Notification System: the
steps, which are required, what each one catches, and what blocks a merge.

This playbook exists because governance principle 5 requires automated checks before merging, and
because the most dangerous CI failure mode is claiming a check exists when it does not. A green status
that means nothing is worse than no status, because it is relied upon.

---

## Scope

**Applies to:** the pipeline that runs on every push and every pull request.

**Does not apply to:** which tests exist, in `PB-ENG-08 Testing`; deployment, in
`PB-ENG-10 CD/Deployment`; required status check configuration, in `PB-ENG-03 Git and GitHub`.

---

## Ownership

**Responsible:** the Developer.
**Accountable:** the technical owner for the affected module.
**Consulted:** IT, where a step requires infrastructure the pipeline can reach.

---

## 1. Current State

**No pipeline exists.** There is no CI configuration in the repository, because there is no repository
and no application. `PB-ENG-03` section 8 already records that no status checks may be listed as
required until this playbook's steps are implemented.

| Status | Applies to |
|---|---|
| **IMPLEMENTED** | Nothing. Every step in this document is unbuilt |
| **RUNNING** | Nothing |
| **ENFORCED AS A REQUIRED CHECK** | Nothing |

**A reviewer is currently the only gate.** That is a manual control, and it is not equivalent: a manual
gate is applied to pull requests a reviewer remembers to check, while an automated gate is applied to
every one.

### 1.1 Implementation status table

Every step below carries its own status. **This table is not to be updated optimistically.**

| Step | Status | Blocking |
|---|---|---|
| Install dependencies | **Not implemented** | OQ-48, OQ-49 |
| Dependency validation | **Not implemented** | OQ-49, OQ-51 |
| Type checking | **Not implemented** | OQ-43 |
| Linting | **Not implemented** | OQ-48 |
| Unit tests | **Not implemented** | OQ-47 |
| Integration tests | **Not implemented** | OQ-47, OQ-44 |
| Service and API tests | **Not implemented** | OQ-47 |
| Build validation | **Not implemented** | OQ-48 |
| Security checks | **Not implemented** | OQ-42 |
| Secret scanning | **Not implemented** | OQ-52 |
| Artifact validation | **Not implemented** | OQ-48 |

---

## 2. The Steps

### 2.1 Install dependencies

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Restore the exact dependency versions the project expects |
| **Catches** | A missing or unresolvable dependency; a lockfile that does not match the manifest |
| **Failure blocks** | Merge |

**Must respect the lockfile.** Per `PB-ENG-13`, an install that resolves fresh versions rather than
the lockfile makes the build irreproducible, and a pipeline that passes with different versions than
production does not verify anything useful.

**Must fail on an unresolvable or mismatched lockfile** rather than proceeding. A pipeline that
tolerates a broken lockfile is training developers that the check is advisory.

### 2.2 Dependency validation

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Confirm the dependency set is consistent, current, and free of known critical vulnerabilities |
| **Catches** | A vulnerability, an abandoned package, a licence conflict, an unexpected version drift |
| **Failure blocks** | Merge, for critical severity; reported for lower severity |

Two distinct jobs, because they answer different questions:

| Job | Question | Authority |
|---|---|---|
| Vulnerability scan | Is a dependency known to be exploitable? | `PB-ENG-13` section 6 |
| Dependency review | Is the set minimal, consistent, and licensed acceptably? | `PB-ENG-13` section 2 |

**Severity handling.** A critical or high vulnerability with a known fix blocks. A moderate or low
finding is recorded and scheduled. **A finding with no fix available is escalated to
`PB-ENG-11 Security`**, because the options are then: replace the dependency, accept the risk with a
recorded justification, or remove the feature that needs it.

### 2.3 Type checking

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Verify types are consistent |
| **Catches** | A wrong type that a dynamic language or a loosely typed boundary would not surface until runtime |
| **Failure blocks** | Merge |

**`REQUIRED` rather than `RECOMMENDED` specifically because of `NFR-INTEG-007`.** The correctness
guarantees ERNS depends on concern identifiers — a user, an event, a registration reference. A type
error in that path is a correctness error, and type checking is the cheapest place to catch it.

**No suppression without a recorded reason.** A suppression is a claim that the code is correct where
the tooling cannot verify it, and the claim deserves the same scrutiny as the code.

### 2.4 Linting

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Enforce the mechanical standards the review should not, per `PB-ENG-07` section 1.1 |
| **Catches** | Formatting, unused code, shadowed names, unreachable branches |
| **Failure blocks** | Merge |

**Its value is that it removes review comments.** A reviewer who comments on formatting has substituted
preference for the project's configured standard, which makes reviews slower and teaches authors that
review is arbitrary.

**Existing warnings are resolved rather than suppressed at introduction.** A warning count that only
grows is a check that has been abandoned.

### 2.5 Unit tests

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Verify domain rules in isolation |
| **Catches** | A broken rule in the nine-step validation, lifecycle transitions, audience resolution |
| **Failure blocks** | Merge |

Fast, and therefore run on every commit. Per `PB-ENG-08` section 2.2, the domain layer is pure logic,
so these tests need no storage layer.

**Unit tests alone prove none of ERNS's integrity guarantees.** They are the cheapest tier, not the
most important one.

### 2.6 Integration tests

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Verify behaviour against a real storage layer |
| **Catches** | Everything the guarantees depend on |

**This is the most important step in the pipeline for ERNS specifically.** Per
`PB-ENG-08` section 2.1:

| Guarantee | Verified only here |
|---|---|
| Duplicate registration impossible | `NFR-INTEG-001`, `RV-02` |
| Two registrations for the last slot produce one success | `NFR-INTEG-007`, `CON-01`, `TST-09` |
| Duplicate attendance impossible | `NFR-INTEG-002`, `CON-03` |
| Approval steps decided in sequence | `NFR-INTEG-006`, `NFRD-09` |
| No orphan records | `NFR-INTEG-003` |
| Audit write failure refuses the change | `NFR-AUD-001`, `FAIL-05`, `TST-07` |

**Must run against a real storage engine, not a substitute.** A test that mocks the storage layer
verifies the mock, and every guarantee in the table above disappears.

**Must provision a fresh, isolated storage layer per run.** Shared state between runs produces
passes that depend on execution order, which is how a concurrency guarantee stops being verified.

### 2.7 Service and API tests

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Verify the request contract and, critically, the authorisation of every operation |
| **Catches** | A missing authorisation check, a widened permission, a data leak in a response |
| **Failure blocks** | Merge |

**Authorisation is the reason this step is required rather than optional.** Per `NFR-SEC-004` and
`NFR-SEC-005`, every operation must be authorised server-side and denied by default. Only a test that
issues an unauthorised request can verify that.

| Required coverage | Scenario |
|---|---|
| Every row in the authorisation matrix | `AUTH-01` to `AUTH-15` |
| Every role denied where the matrix says so | Includes SD-1, SD-2 |
| Interface restriction bypassed by a direct request | `NFRD-14` |
| Unauthenticated access to every protected resource | `AUTH-11` |
| Suspended account, and role revoked mid-session | `AUTH-12`, `AUTH-13` |
| No participant data in an unauthenticated response | `NFR-SEC-018` |

### 2.8 Build validation

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Confirm the application builds and produces the deployable artefact |
| **Catches** | A build that succeeds locally and fails in the pipeline, or the reverse |
| **Failure blocks** | Merge |

**Must use the same build configuration as the deployment path.** A build that differs from the
deployed one verifies something other than what is deployed, per
`PB-ENG-10 CD/Deployment` section 3.

**Must be clean with no warnings**, consistent with section 2.4.

### 2.9 Security checks

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Apply the static checks that catch the classes in `SECURITY-PLAN.md` section 2 |
| **Catches** | Injection patterns, unsafe deserialisation, missing validation, leaked credentials in source |
| **Failure blocks** | Merge |

| Threat | Check that catches it |
|---|---|
| `TH-10` Injection | `NFR-SEC-008` parameterised access |
| `TH-09` Credential disclosure | Source scanning |
| `TH-01` Unauthorised publication | Authorisation test coverage |
| `TH-05` Unauthorised access to student information | Service tests |
| `TH-12` Audit tampering | Append-only property verification |

**These are static checks, not penetration testing.** They reduce a class of defect; they do not
establish that the system is secure. `PB-ENG-11 Security` states what remains.

### 2.10 Secret scanning

| | |
|---|---|
| **Classification** | **REQUIRED. Non-negotiable.** |
| **Purpose** | Detect credentials in source and in history |
| **Catches** | `TH-09` credential disclosure |
| **Failure blocks** | Merge |

**This step has the highest ratio of consequence to cost in the pipeline, and the least excuse.**

A secret in history is not removed by deleting the commit. It is in every clone and every mirror, and
it must be rotated. Per `PB-ENG-12` section 6, the response sequence begins with rotation regardless of
how quickly the commit is removed.

**Must scan the full history, not only the current tree.** A secret removed in a later commit remains
in the history, and the commit that removed it is the visible evidence that it was once there.

**Must scan the diff separately from the tree.** A pull request introducing a secret must fail even if
a later commit in the same branch removed it.

### 2.11 Artifact validation

| | |
|---|---|
| **Classification** | **REQUIRED** |
| **Purpose** | Confirm the built artefact contains what it should and nothing it should not |
| **Catches** | Configuration baked in, development dependencies, source maps in the wrong place, secrets |
| **Failure blocks** | Release; blocks merge where it can run pre-merge |

| Check | Requirement |
|---|---|
| No secret in the artefact | `PB-ENG-12` |
| No development-only dependency | Supply chain |
| No configuration baked in | `EA-1` in [ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) |
| No real data or fixture committed as an asset | `NFR-SEC-013` |
| Source maps handled per [ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) section 2.3 | `NFR-SEC-010` |

**An artefact check catches what a source check cannot.** A configuration value can be present in a
build without appearing in a source file, and a development dependency can survive into a bundle
without appearing in the manifest.

---

## 3. Classification Summary

| Step | Classification | Blocks merge |
|---|---|---|
| Install dependencies | **REQUIRED** | Yes |
| Dependency validation | **REQUIRED** | Yes, for critical severity |
| Type checking | **REQUIRED** | Yes |
| Linting | **REQUIRED** | Yes |
| Unit tests | **REQUIRED** | Yes |
| Integration tests | **REQUIRED** | Yes |
| Service and API tests | **REQUIRED** | Yes |
| Build validation | **REQUIRED** | Yes |
| Security checks | **REQUIRED** | Yes |
| Secret scanning | **REQUIRED** | Yes |
| Artifact validation | **REQUIRED** | Yes, where it can run |

### 3.1 RECOMMENDED and OPTIONAL

| Step | Classification | Note |
|---|---|---|
| Coverage reporting | **RECOMMENDED** | Reported, not gated. See `PB-ENG-08` section 1.2 |
| Meta-tests `TST-01` to `TST-10` | **RECOMMENDED** per run, **REQUIRED** pre-release | They deliberately break guarantees, so they run separately |
| End-to-end tests | **OPTIONAL** per run, **REQUIRED** pre-release | Slow; per `PB-ENG-08` section 2.4 |
| Accessibility scan | **RECOMMENDED** per run, **REQUIRED** pre-release | `A11Y-07`, `NFR-A11Y-001` |
| Performance checks | **OPTIONAL** per run, **REQUIRED** pre-release | No target is set yet, per `OQ-30` |
| Licence report | **OPTIONAL** | Recorded, reviewed at release |
| Dependency update automation | **OPTIONAL** | Per `PB-ENG-13` section 7 |

**Nothing is OPTIONAL in a way that removes a control.** A step marked optional here still runs before
release. The distinction is about what blocks an ordinary merge.

---

## 4. When the Pipeline Runs

| Trigger | Runs |
|---|---|
| Push to a topic branch | Full merge-gate set |
| Pull request opened or updated | Full merge-gate set |
| Push to `main` | Full set, confirming the merge result |
| Scheduled | Dependency vulnerability scan, so a newly disclosed advisory is caught without a code change |
| Before release | Every level, including end-to-end, accessibility, security, and meta-tests |

**The scheduled dependency scan matters because a vulnerability is often disclosed after the code was
written.** Without it, a project that did nothing wrong still becomes vulnerable, and nothing in the
code changes to trigger a check.

### 4.1 Ordering

**PROPOSED.** Cheapest and most likely to fail first:

```
1. Install dependencies      Fails on a broken lockfile, seconds
2. Type checking             Fails on a type error, seconds
3. Linting                   Fails on a mechanical issue, seconds
4. Dependency validation     Fails on a vulnerability, seconds
5. Secret scanning           Fails on a credential, seconds
6. Unit tests                Fast
7. Service and API tests     Moderate
8. Integration tests         Slowest, and the most important
9. Build validation
10. Security checks
11. Artifact validation
```

**Secret scanning sits early because its consequences are the least recoverable.** A credential
exposed for forty minutes may be discovered and used; a duplicate-registration bug found forty minutes
later is fixed in the same afternoon.

---

## 5. Failure Handling

**A failed required check blocks the merge.** Governance principle 14. **PROPOSED** sequence:

1. The merge is blocked
2. The failure is triaged as a real defect, a wrong test, a wrong configuration, or a pipeline defect
3. A real defect is fixed
4. A pipeline defect is fixed in the pipeline, not worked around in the code
5. **The check is never disabled, made non-required, or re-run to obtain a pass**
6. The triage outcome is recorded

### 5.1 There is no override

**Governance principles 14 and 15 are absolute.** No maintainer override, no "merge anyway", no
administrator bypass.

| Tempting move | What it does |
|---|---|
| Mark the check non-required | Makes it optional from then on |
| Re-run to obtain a pass | Hides an intermittent real failure |
| Add a skip | Removes the check for everyone after |
| Merge and fix afterwards | The defect is in production, per `PB-ENG-01` section 7 |
| Push directly to `main` | Unreviewed and untested, per `PB-ENG-03` section 2.3 |

**If a check is wrong, the check is fixed.** If a check is too slow, it is optimised — but it is not
removed, because the next person to hit the same failure will find no check to fail.

### 5.2 A pipeline that fails intermittently is a pipeline defect

Treated as a defect per `PB-ENG-08` section 4.1, not as noise to be retried. **A pipeline whose
failures are not reproducible cannot be relied upon to block anything**, so an unreliable pipeline
provides less assurance than none at all, because it is trusted.

---

## 6. Enforcement

**REQUIRED** configuration, per `PB-ENG-03` section 8, and verified per `PB-ENG-03` section 3.2.

| Rule | Reason |
|---|---|
| Every REQUIRED step is a required status check | Otherwise it can be merged past |
| Required checks must be up to date before merging | Prevents a merge that passes then fails |
| Checks cannot be marked optional without `PB-ENG-20` | Governance principle 12 |
| Stale approvals dismissed on new commits | An approval of an earlier version is not an approval of this one |

**A status check may only be listed once its step is implemented and running.** Per
[CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, a check that is listed but not running
produces a green status that means nothing.

### 6.1 Verification before enforcement

**PROPOSED.** When the pipeline is first built:

1. Confirm each step runs and reports a status
2. Confirm a deliberately introduced failure blocks the merge, **for each required step**
3. Confirm the check cannot be bypassed by a maintainer
4. Only then mark it required

**Step 2 is the one that is skipped.** It is tedious, and it feels like testing the obvious. It is the
only way to know that a required check is a check rather than a badge.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Every step is implemented and running before it is listed as required | Sections 1, 6.1 |
| Install respects the lockfile | Section 2.1 |
| A critical dependency vulnerability blocks the merge | Section 2.2 |
| Type checking and linting are clean | Sections 2.3, 2.4 |
| All merge-gate tests pass | Sections 2.5 to 2.7 |
| Integration tests run against a real storage layer | Section 2.6 |
| Secret scanning covers history and diff | Section 2.10 |
| The build matches the deployment configuration | Section 2.8 |
| A failed required check blocks, with no override | Section 5 |
| An intermittent pipeline failure is fixed, not retried | Section 5.2 |

## Required Evidence

- The pipeline configuration in the repository
- The verification result from section 6.1, per required step
- Required status checks configured and confirmed by test
- Recorded triage for each failure encountered
- A scheduled dependency scan is running

## What Blocks Progression

- A required step is listed but not implemented
- A required check is failing
- A check is disabled, made non-required, or bypassed
- Integration tests run against a mocked storage layer
- Secret scanning covers only the current tree
- The build configuration differs from the deployment path
- A flaky pipeline is being retried

## Exception Process

**PROPOSED.** A step may be temporarily non-required only when it is **demonstrably broken for reasons
unrelated to the change** — an unavailable service, a defect in the tool. The exception is recorded
with the reason, an owner, and a resolution date. It does not extend to `main` being merged past a
failing check that is functioning.

**No exception exists for** disabling a check, re-running to obtain a pass, or pushing directly to
`main` to avoid the pipeline. Governance principles 3, 14, and 15 are absolute.

---

## Completion Criteria

- Every REQUIRED step is implemented, running, and verified per section 6.1
- Each is a required status check on `main`
- The scheduled dependency scan is running
- Failure handling is understood: a failed check blocks, with no override
- Section 1 updated to reflect reality, never optimistically

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| CI-01 | Happy path | Pull request with all checks passing | Merge permitted |
| CI-02 | Failure | Type checking fails | **Blocked** |
| CI-03 | Failure | Linting fails | **Blocked** |
| CI-04 | Failure | Unit test fails | **Blocked** |
| CI-05 | Failure | Integration test `CON-01` fails | **Blocked**; the guarantee is broken |
| CI-06 | Failure | Service authorisation test fails | **Blocked**; `NFR-SEC-004` |
| CI-07 | Failure | Critical dependency vulnerability found | **Blocked** |
| CI-08 | Failure | Secret detected in the diff | **Blocked**; `PB-ENG-12` |
| CI-09 | Failure | Secret detected only in history | **Blocked**; history is scanned |
| CI-10 | Failure | Lockfile does not match the manifest | **Blocked** at install |
| CI-11 | Invalid | Install resolves fresh versions, ignoring the lockfile | **Blocked**; irreproducible |
| CI-12 | Failure | Build succeeds locally, fails in the pipeline | Investigated as a defect, not a rerun |
| CI-13 | Failure | Artifact contains a baked-in secret | **Blocked** |
| CI-14 | Invalid | Status check listed but not running | Rejected; principle 5, CONVENTIONS section 6 |
| CI-15 | Unauthorized | Maintainer bypasses a required check | **Blocked**; principle 15 |
| CI-16 | Unauthorized | Direct push to `main` avoids the pipeline | **Blocked**; `PB-ENG-03` |
| CI-17 | Failure | Pipeline fails intermittently, re-run until green | **Blocked**; section 5.2 |
| CI-18 | Failure | Check disabled to unblock a release | **Blocked**; principle 14 |
| CI-19 | Boundary | Moderate vulnerability, no immediate fix | Recorded and scheduled, not blocked |
| CI-20 | Boundary | Vulnerability with no fix available | Escalated to `PB-ENG-11` |
| CI-21 | Invalid | Coverage increased while authorisation untested | Not accepted as evidence; `PB-ENG-08` |
| CI-22 | Failure | Meta-test `TST-01` does not fail | **Blocked** before release |
| CI-23 | Boundary | Coverage decreased without an explanation | Investigated |
| CI-24 | Failure | No scheduled vulnerability scan | Rejected; section 4 |
| CI-25 | Failure | New advisory disclosed, nothing in the code changed | Caught by the scheduled scan |
| CI-26 | Invalid | Step classified OPTIONAL in a way that removes a control | Rejected; section 3.1 |
| CI-27 | Failure | Required step unavailable, exception requested | Recorded with owner and date, section 8 |
| CI-28 | Failure | Verification in section 6.1 skipped for a new check | Rejected; section 6.1 |

---

## Exit Criteria

- Every REQUIRED step implemented, running, and verified
- All REQUIRED steps enforced as status checks on `main`
- The scheduled dependency scan running
- OQ-47, OQ-48, and OQ-49 answered, so the pipeline can be built
- Section 1 and section 1.1 removed, once it ceases to be true that nothing is implemented
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-03 Git and GitHub](PB-ENG-03-GIT-GITHUB.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-11 Security](PB-ENG-11-SECURITY.md) ·
[PB-ENG-16 Release Management](PB-ENG-16-RELEASE-MANAGEMENT.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)