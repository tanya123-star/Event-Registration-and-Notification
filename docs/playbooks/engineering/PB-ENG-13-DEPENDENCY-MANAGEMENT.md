# PB-ENG-13 — Dependency Management

**Playbook:** PB-ENG-13
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No dependency manifest exists.** No package has been selected, installed,
> or approved. No vulnerability scan runs. This playbook specifies the rules that apply from the first
> dependency.

---

## Purpose

Define how the dependencies of the Event Registration and Notification System are selected, approved,
versioned, scanned, updated, and removed.

This playbook exists because governance principle 8 requires dependencies to be controlled, and because
an uncontrolled dependency set is how a small project acquires a large unmaintained surface without
anyone deciding to.

---

## Scope

**Applies to:** every direct and transitive dependency, and every change to the dependency set.

**Does not apply to:** the stack decision itself, in `PB-ENG-02 Tech Stack`; secret handling, in
`PB-ENG-12 Secrets and Configuration`; the manifest format, which follows the package manager decision
`OQ-49`.

---

## Ownership

**Responsible:** the Developer proposing the dependency.
**Accountable:** the technical owner for the affected module.
**Consulted:** IT, where a dependency affects hosting or licensing obligations.

---

## 1. Current State

**No dependencies exist.** There is no manifest, no lockfile, no installed package.

| Item | State | Blocking |
|---|---|---|
| Package manager | **Not selected** | **OQ-49** |
| Dependency manifest | **Does not exist** | OQ-49 |
| Lockfile | **Does not exist** | OQ-49 |
| Vulnerability scanning | **Not implemented** | `PB-ENG-09` |
| Licence review | **Not implemented** | — |
| Update cadence | **Undefined** | **OQ-59** |

**Everything in this document applies from the first `npm install`, `pip install`, or equivalent.**

---

## 2. Selection

### 2.1 Do not add a dependency to solve a small problem

**REQUIRED.** A dependency may be added only when all of the following hold:

| Condition | Test |
|---|---|
| The capability is needed by a requirement | Cite the requirement |
| It cannot reasonably be implemented directly | State why |
| It has no adequate equivalent already present | Name the equivalent |
| It is actively maintained | Last release, commit activity, issue responsiveness |
| Its licence is acceptable | `PB-ENG-02` step 4 |
| Its support lifetime is stated | `PB-ENG-02` step 3 |
| Its security posture is acceptable | Disclosure history, advisory handling |

### 2.2 "Reimplementing a small function" is not automatically wrong

**Recorded as a judgement, not a rule**, because the answer depends on what the small function actually
does.

| Implement directly | Take the dependency |
|---|---|
| A date-formatting helper | A database driver |
| A string utility | A cryptographic library |
| A validation predicate | An authentication framework |
| A parser for a simple format | A protocol implementation |
| — | Anything where correctness is security-relevant |

**Cryptography, authentication, and protocol implementations are the line.** Writing your own is how
ERNS ends up with an insecure session token that a reviewer cannot detect, because a correct
implementation looks identical to a plausible wrong one from the outside.

### 2.3 Approval

| Dependency type | Approval |
|---|---|
| A tool already in the approved stack | Not required |
| A new direct dependency | **Required**, recorded in [TECH-STACK.md](../../architecture/TECH-STACK.md) |
| A major-version upgrade | **Required**, per section 9 |
| A transitive dependency introduced by another | Not required directly; **recorded by the parent** |
| A dependency removed | Not required |

**A dependency in the manifest with no row in the approved stack is a review failure**, per
`PB-ENG-02` section 3.2. This closes the route by which an undocumented architecture decision happens
through one line of a manifest.

---

## 3. Version Policy

**REQUIRED.**

| Rule | Detail |
|---|---|
| Every dependency has a stated version or range | "Latest" is not reproducible |
| Ranges are narrow enough to be meaningful | A range admitting any version is not a decision |
| The lockfile pins resolved versions | Reproducibility |
| A range's upper bound reflects the next major version | So the range does not silently widen |
| Transitive versions are pinned by the lockfile | Not individually managed |
| No `latest`, `*`, or unbounded tags | Non-reproducible |

### 3.1 Narrow ranges and their cost

**A narrow range means consciously accepting a patch upgrade.** That is the correct trade: a patch
release cannot, by the ecosystem's own compatibility promise, break a caller.

| Range | Position |
|---|---|
| Patch and minor only | **Preferred** |
| Minor only | Acceptable, higher risk |
| Major included | Requires justification per section 9 |
| Exact pin | Acceptable where the ecosystem guarantees nothing else |

**The cost of a narrow range is that a security patch must be applied deliberately.** That is the
point: the deliberate application is what verifies it does not break anything.

### 3.2 The lockfile is committed

**REQUIRED.** Per [PB-ENG-12](PB-ENG-12-SECRETS-CONFIGURATION.md) section 10.1,
this is the deliberate exception to the rule against generated artefacts.

**Without a committed lockfile, two developers on the same day have different dependencies**, and the
build that passed in continuous integration is not the build that was tested locally.

---

## 4. Lockfile Policy

**REQUIRED.**

| Rule | Reason |
|---|---|
| Committed | Reproducibility |
| Installs respect it | `PB-ENG-09` section 2.1 |
| A manifest change without a lockfile change is a failure | Drift |
| Never regenerated casually | A regeneration updates everything at once, which makes review impossible |
| Never hand-edited | Corrupts integrity data |
| Updated only alongside the manifest it belongs to | Consistency |

### 4.1 Regenerating a lockfile is a large change

**A casual lockfile regeneration produces a diff touching every package**, which no reviewer can read
and which may introduce an unreviewed update to every transitive dependency.

**PROPOSED.** Update the lockfile deliberately, for a stated reason:

| Reason | Acceptable |
|---|---|
| Adding a dependency | Yes |
| Removing a dependency | Yes |
| A security patch within the pinned range | Yes |
| A deliberate upgrade | Yes, with the upgrade recorded |
| "It was out of date" | **No** |

---

## 5. Vulnerability Scanning

**REQUIRED**, per governance principle 8 and `PB-ENG-09` section 2.2.

| Job | Question | Runs |
|---|---|---|
| Vulnerability scan | Is a dependency known to be exploitable? | Every push, and **on a schedule** |
| Dependency review | Is the set minimal, consistent, licensed acceptably? | Every push |

### 5.1 The scheduled scan is not optional

**A vulnerability is frequently disclosed after the code was written.** Without a scheduled scan, a
project that did nothing wrong becomes vulnerable, and nothing in the code changes to trigger a check.

### 5.2 Severity handling

| Severity | Action |
|---|---|
| Critical | **Blocks merge.** Fix, or escalate immediately |
| High | **Blocks merge.** Fix, or escalate with a recorded justification |
| Moderate | Recorded and scheduled. Not blocking |
| Low | Recorded. Reviewed at release |
| **No fix available** | **Escalate to `PB-ENG-11 Security`** |

### 5.3 A vulnerability with no fix is a decision, not a dead end

When no fix exists, the options are:

| Option | Consequence |
|---|---|
| Replace the dependency | `PB-ENG-20`, because this is an architecture decision |
| Remove the feature that needs it | `PB-ENG-20`, because it removes a requirement's implementation |
| Accept the risk | **Recorded with a justification, an owner, and a review date** |
| Do nothing | **Not available.** Silence is not a decision |

**Accepting the risk is legitimate. Accepting it silently is not.** A recorded acceptance is a
deliberate choice that a later reader can revisit; silence leaves nobody knowing whether the risk was
considered.

### 5.4 An alert nobody acts on

**PROPOSED.** An alert that is acknowledged and deferred without a resolution date stops being an alert
and becomes background noise. A finding is either fixed, recorded as accepted with a review date, or
removed as a false positive.

---

## 6. Update Frequency

**PROPOSED.** No figure is asserted without a basis, per
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) section 1.

| Category | Frequency | Basis |
|---|---|---|
| Security patches, critical | **As soon as a fix exists** | Consequence |
| Security patches, high | Within the agreed window, after `OQ-59` | — |
| Minor version updates | Reviewed **monthly** | — |
| Major version updates | Reviewed **quarterly**, adopted deliberately | Section 9 |
| Dependency review report | **Monthly** | — |
| Support lifetime check | **Annually**, per `PB-ENG-02` section 3.4 | — |

**A monthly review is a review, not an obligation to update.** The value is noticing a package that
stopped being maintained, which `TH-` analysis in
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) treats as a threat.

---

## 7. Automated Updates

**OPTIONAL, and deliberately conservative.** An automated update that merges itself defeats
`PB-ENG-06 Pull Requests` for dependencies specifically.

| Proposal | Position |
|---|---|
| Automated version bumps opening a pull request | **Acceptable.** The PR is reviewed like any other |
| Automated updates merged without review | **Prohibited** |
| Automated major-version upgrades | **Prohibited.** Per section 9 |
| Automated vulnerability fix pull requests | **Acceptable**, same review requirement |

**An automated pull request is still a pull request.** It gets reviewed, it runs the pipeline, and it
requires an approval.

---

## 8. Removing Dependencies

**PROPOSED.** An unused dependency is attack surface that nobody maintains and nobody tests.

| Trigger | Action |
|---|---|
| Identified as unused | Remove, in its own change |
| A dependency's functionality is now in the standard library | Assess, then remove |
| A dependency has an unrecoverable vulnerability | Remove or replace |
| A dependency's last release was years ago and it works | **Assess, do not remove blindly.** It may still be load-bearing |

### 8.1 The removal is a change like any other

| Property | Rule |
|---|---|
| Its own pull request | Not bundled with a feature |
| Its own tests | Demonstrating the capability is unaffected |
| Lockfile updated | — |
| Documentation updated | If it was in the approved stack, remove the row |
| **Verified, not assumed** | "Unused" determined by search is not proof |

**Removing a dependency that is in fact used produces a runtime failure** — and if it is only used on
one path, that failure appears in production rather than in a test.

---

## 9. Major-Version Upgrades

**REQUIRED** to follow `PB-ENG-20 Change Management`. **A major version is not a routine update.**

| Step | Requirement |
|---|---|
| 1 | Recorded as a change-management item |
| 2 | Breaking changes read and recorded |
| 3 | Migration effort assessed |
| 4 | Security impact assessed: is the current version still supported? |
| 5 | Test coverage for the affected area confirmed |
| 6 | Done as its own branch and pull request |
| 7 | Full test suite passing, not only the affected area |
| 8 | Documented in the same change |

### 9.1 A major upgrade is an architecture decision

**It changes what the project depends on and how.** A new major version may change the licensing, the
support commitment, the API surface, or the behaviour the project relies on. That is a decision, and
per governance principle 12 no architecture-changing decision is undocumented.

### 9.2 Security support is the driver

**A major upgrade is sometimes not optional.** If the current major version has passed end of support,
upgrading is a security requirement rather than a choice, and the timeline is set by the disclosure rate
rather than by project convenience.

---

## 10. Abandoned Packages

**PROPOSED.**

| Signal | Meaning |
|---|---|
| No release in over a year | Concern, not conclusive |
| Unresolved security issue on the tracker | Serious |
| Unresponsive maintainer | Concern |
| Single maintainer with no organisation | Concern |
| No issue tracker activity at all | Concern |

**Two signals together mean act.** One signal means review.

| Action | Purpose |
|---|---|
| Assess whether it is load-bearing | Per section 8.1 |
| Consider forking or replacing | `PB-ENG-20` |
| Record the decision and its reason | Whether or not it is acted on |
| **Set a review date** | So the decision is revisited rather than forgotten |

**An abandoned dependency carrying no security issue is a maintenance risk, not an incident.** The
decision is a judgement about whether the package is worth carrying, and it should be recorded whether
the answer is act or accept.

---

## 11. Licence Obligations

**REQUIRED** to be recorded per `PB-ENG-02` step 4.

| Licence class | Position |
|---|---|
| Permissive, no requirement | Acceptable |
| Permissive, attribution required | Acceptable, attribution recorded |
| Weak copyleft, file or library level | Assess with the Council Secretary |
| Strong copyleft | **Requires Council Secretary approval** |
| Non-commercial restriction | Assess against the organisation's use |
| Unlicensed, or unclear | **Not acceptable** |
| Source-available, not open | Assess |

**A licence with obligations ERNS cannot meet is a licence that cannot be used**, regardless of how good
the software is. Copyleft obligations in particular can propagate in ways that are not obvious to a
developer, and the question is best asked by someone whose responsibility it is.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| A dependency has a row in the approved stack | Section 2.3 |
| Every dependency has a stated version or range | Section 3 |
| The lockfile is committed and respected | Sections 3.2, 4 |
| Critical and high vulnerabilities block the merge | Section 5.2 |
| A vulnerability with no fix is escalated or recorded as accepted | Section 5.3 |
| A scheduled vulnerability scan is running | Section 5.1 |
| The dependency review is minimal and licensed acceptably | Section 2.1, section 11 |
| Unused dependencies removed | Section 8 |
| Major upgrades go through change management | Section 9 |
| Support lifetime reviewed annually | `PB-ENG-02` section 3.4 |

## Required Evidence

- The row added to [TECH-STACK.md](../../architecture/TECH-STACK.md), with version range, licence, and
  support lifetime
- Vulnerability scan passing, or a recorded acceptance
- The monthly dependency review record
- The annual support lifetime review
- The lockfile diff accompanying any manifest change

## What Blocks Progression

- A dependency is in the manifest with no approved row
- A critical or high vulnerability is unresolved and unaccepted
- A dependency has no stated version
- The lockfile is not committed
- The lockfile was regenerated casually
- A major upgrade proceeds without change management
- A licence obligation is unassessed
- A `latest` or unbounded version is used
- An automated update merged without review

## Exception Process

**PROPOSED.** A critical vulnerability with no available fix may be accepted temporarily, recorded with a
justification, an owner, and a review date, and escalated to `PB-ENG-11 Security`.

**No exception exists for** committing a dependency without an approved row, merging an automatic major
upgrade, or leaving a critical finding unrecorded. Governance principles 8 and 12 are absolute.

---

## Completion Criteria

- OQ-49 answered, so the package manager is selected
- Every dependency has a row in [TECH-STACK.md](../../architecture/TECH-STACK.md)
- Vulnerability scanning running on push and on a schedule
- The dependency review running monthly
- Licence obligations recorded for every direct dependency
- Support lifetime review scheduled annually

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| DEP-01 | Happy path | Dependency needed, approved, recorded, added | Manifest and lockfile updated |
| DEP-02 | Invalid | Dependency added with no approved row | **Blocked**, section 2.3 |
| DEP-03 | Invalid | `latest` as a version | Rejected; section 3 |
| DEP-04 | Invalid | Lockfile not committed | **Blocked**, section 3.2 |
| DEP-05 | Failure | Install ignores the lockfile | **Blocked** in the pipeline |
| DEP-06 | Failure | Manifest changed, lockfile not | **Blocked**; drift |
| DEP-07 | Failure | Lockfile regenerated casually, large diff | Rejected at review, section 4.1 |
| DEP-08 | Failure | Critical vulnerability with a fix available | **Blocked**, section 5.2 |
| DEP-09 | Failure | High vulnerability with no fix | Escalated or recorded as accepted |
| DEP-10 | Failure | No scheduled vulnerability scan | Rejected; section 5.1 |
| DEP-11 | Failure | New advisory, no code change | Caught by the scheduled scan |
| DEP-12 | Invalid | Finding deferred without a resolution date | Rejected; section 5.4 |
| DEP-13 | Failure | Major upgrade without change management | **Blocked**, section 9 |
| DEP-14 | Boundary | Automated version bump opening a pull request | Reviewed like any other |
| DEP-15 | Unauthorized | Automated update merged without review | **Blocked**, section 7 |
| DEP-16 | Failure | Cryptography implemented in-house | Rejected; section 2.2 |
| DEP-17 | Boundary | A date helper implemented directly | Acceptable; section 2.2 |
| DEP-18 | Failure | Unused dependency identified | Removed in its own change |
| DEP-19 | Failure | "Unused" by search only, actually used on one path | Rejected; section 8.1 |
| DEP-20 | Failure | Abandoned package with an unresolved security issue | Assessed and recorded, section 10 |
| DEP-21 | Invalid | Strong copyleft dependency without Council approval | **Blocked**, section 11 |
| DEP-22 | Invalid | Unclear licence | **Not acceptable**, section 11 |
| DEP-23 | Failure | Current major version past end of support | Upgrade treated as a security requirement |
| DEP-24 | Boundary | Existing capability reimplemented rather than duplicated | Accepted; section 2.1 |
| DEP-25 | Failure | Dependency removed in a pull request with a feature | Rejected; section 8 |

---

## Exit Criteria

- OQ-49 answered
- Every dependency has an approved row, version range, licence, and support lifetime
- Vulnerability scanning running on push and on a schedule
- Monthly dependency review and annual lifetime review established
- OQ-59 answered, so update windows are defined
- No unaccepted critical or high finding
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-02 Tech Stack](PB-ENG-02-TECH-STACK.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-11 Security](PB-ENG-11-SECURITY.md) ·
[PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[TECH-STACK.md](../../architecture/TECH-STACK.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)