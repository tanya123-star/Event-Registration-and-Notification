# PB-ENG-06 — Pull Requests

**Playbook:** PB-ENG-06
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No repository exists, so no pull request has been opened, no template
> exists, and no reviewer requirement is enforced. See the status section.

---

## Purpose

Define what a pull request must contain and what must be true before it may be merged into
`main` in the Event Registration and Notification System.

This playbook exists because a pull request is the only point at which a change is examined by someone
other than its author. If the requirements are not enforced there, they are not enforced anywhere.

---

## Scope

**Applies to:** every pull request targeting `main` or a release branch.

**Does not apply to:** review substance, in `PB-ENG-07 Code Review`; branch naming, in
`PB-ENG-04 Branching`; required checks, in `PB-ENG-09 CI`.

---

## Ownership

**Responsible:** the Developer opening the pull request.
**Accountable:** the technical owner for the affected module.
**Consulted:** reviewers, per section 8.

---

## 1. Who May Open One

| Role | May open | May merge |
|---|---|---|
| Developer | Yes | Yes, after approval |
| Reviewer | Yes | Yes, after approval |
| Administrator (system role, not repository role) | **Not applicable** — see below | — |

**ERNS system roles and repository permissions are unrelated.** An Administrator in
[USER-ROLES.md](../../planning/USER-ROLES.md) is a person who administers ERNS; that person may or may
not be a developer. A repository Maintainer may hold no ERNS role at all.

**Conflating them is a governance failure, not a convenience.** It grants people with privileged
system access authority over what is built, and gives people who build no visibility into what they
can change.

---

## 2. Title

**REQUIRED** format, consistent with `PB-ENG-05 Commit Conventions`:

```
<type>(<scope>): <subject>
```

| Rule | Reason |
|---|---|
| Same convention as the commit | `git log` and the pull request list read the same way |
| Requirement ID in the title where one applies | Visible without opening the request |
| Under 72 characters | Truncation otherwise |
| No "Fixes #123" | ERNS has no external ticket system; use requirement IDs |

**Examples:**

```
feat(registration): enforce capacity inside the transaction
fix(attendance): reject duplicate scans on the same registration
docs(PB-ENG-19): require requirement IDs in commit footers
```

---

## 3. Description

**REQUIRED.** The description template has six sections. **A missing section is not removed from the
template; it is filled with "None" and a reason.**

### 3.1 The template

```markdown
## Requirements
<!-- Which requirement IDs does this satisfy or change? FR-NNN-NNN, NFR-XXX-NNN.
     "None — infrastructure only" is a valid answer. Blank is not. -->

## What changed
<!-- Three sentences or fewer. The reviewer should be able to predict the diff. -->

## Why
<!-- The reason, not the diff. Why now, why this way, what was rejected. -->

## Testing
<!-- What was run, and the result. Include the failing-before scenario for a fix.
     A claim of "tests pass" without evidence is not accepted. -->

## Security and authorisation
<!-- Does this change who can do what? Add a field to a request? Touch a role check?
     If no, state why. "N/A — no authorisation surface touched" is the answer
     when true; it is not the answer by default. -->

## Data and migrations
<!-- Does this change persistence? Which migration, and is it reversible?
     If no, state why. -->

## Documentation
<!-- Which documents changed, and in this pull request. If none, state why none were needed. -->
```

### 3.2 Why each section is mandatory

| Section | Rejected if omitted |
|---|---|
| Requirements | The change cannot be traced. Governance principle 1 |
| What changed | The reviewer reconstructs it from the diff, slowly |
| Why | The reasoning is lost, and it is the part that survives longest |
| Testing | The claim is unverifiable. `PB-ENG-08` section 4 requires evidence |
| Security and authorisation | **The section most often filled in wrongly.** A change adding a request field may bypass a check written for the previous shape |
| Data and migrations | A persistence change without a migration plan is a production incident |
| Documentation | Principle 11. Documentation deferred is documentation absent |

### 3.3 Test evidence

**REQUIRED** to be specific, per `PB-ENG-08` section 5:

| Adequate | Inadequate |
|---|---|
| "CON-01 and CON-02 added; both pass. CON-01 fails without this change." | "Tests pass." |
| "Full suite: 214 passing. New tests cover FR-REG-014." | "Added tests." |
| "No tests added; the change is documentation only." | Blank |
| "Accessibility scan run; no AA violations introduced." | "Should be fine." |

**A defect fix must state the scenario that would have failed without it.** That is what
distinguishes a fix from a change that happens to make a test pass.

---

## 4. Security Considerations

**REQUIRED** to be assessed on every pull request. This is a structured question, not a reminder,
because the most likely security defect in this system is not an attack — it is a change that
silently widened an authorisation surface.

### 4.1 The assessment

| Question | If yes |
|---|---|
| Does this change which roles may perform an action? | The authorisation matrix in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) section 4 is updated **in this pull request** |
| Does this add a field to a request that is later trusted? | State the validation applied to it |
| Does this add a new endpoint or operation? | State its grant. **A new operation without a grant is denied to everyone**, per `NFR-SEC-005` |
| Does this read data not previously read? | State who may read it, and whether it is personal data |
| Does this write a log or error message? | Confirm no personal data, `NFR-SEC-013` |
| Does this add a dependency? | `PB-ENG-13` section 2, and the licence recorded |
| Does this touch an upload path? | `NFR-SEC-009` |
| Does this change a session or token behaviour? | `NFR-SEC-003`, and revocation on role change |

### 4.2 The most common real defect

**A change that adds a field to a request body which is then trusted.**

The authorisation check was written for the previous shape of the request. A new field arrives, is not
in the check, and is used. Nothing about this is an attack; it is an ordinary feature that quietly
bypasses a control someone wrote carefully.

**Scenario `NFRD-14` exists to catch it**, per `PB-ENG-07 Code Review`.

---

## 5. Screenshots

**REQUIRED** where the change has a user-visible effect. Not required otherwise.

| Change type | Screenshot |
|---|---|
| Interface behaviour | **Required**, before and after where the difference is the point |
| Visual styling | **Required** |
| Accessibility-affecting change | **Required**, plus the scan result |
| Error or empty state | **Required** — these are the states nobody screenshots |
| Error message wording | **Required**, since the wording is the requirement |
| Authorisation denial | **Required**, showing what the user sees when refused |
| Backend, migration, documentation | Not required |

**Authorisation denial screenshots matter most and are almost always omitted.** The refusal message is
part of `NFR-USAB-002`, which requires the system to name the failed rule in terms the user can act
on. A reviewer cannot assess that from the code alone.

---

## 6. Documentation Requirements

**REQUIRED** in the same pull request, per governance principle 11 and `PB-ENG-01` section 6.

| Change | Documentation |
|---|---|
| New behaviour | Requirement cited; the playbook updated if it describes the process |
| Changed behaviour | **Requirement amended first**, then implemented |
| New configuration option | Documented in the relevant playbook and the environment reference |
| Changed process | The affected playbook updated in the same pull request |
| New technology | `PB-ENG-02` and [TECH-STACK.md](../../architecture/TECH-STACK.md) updated **before** merge |
| New open question | Registered in [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) |
| Operational implication | Noted for the owner to action |

**A pull request that defers documentation is not ready.** This is stated in `PB-ENG-01` section 6 and
repeated here because it is the requirement most often treated as a follow-up task.

### 6.1 When the requirement itself is wrong

**Amend the requirement in the same pull request, or before it.** Per
`PB-ENG-20 Change Management`, a requirement change follows a documented decision. Implementing a
behaviour that no requirement authorises is how undocumented scope enters a system.

---

## 7. Size

**PROPOSED.** A pull request should be reviewable in one sitting.

| Guideline | Rationale |
|---|---|
| One requirement or one defect | Cannot be reviewed as a unit, nor reverted as a unit |
| Under roughly 400 changed lines | Beyond this, review quality falls sharply |
| A large mechanical change is separate | A rename is not reviewable alongside a logic change |
| If it must be large, it is split | Split by requirement, not by file |

**There is no enforcement, because a size limit that blocks a legitimately large requirement produces
worse behaviour than review the reviewer does not finish.** The guideline exists to prompt splitting,
not to obstruct it.

**A pull request too large to review is a pull request that will not be reviewed properly.** This is a
reliability observation about reviewers, not a judgement about the author.

---

## 8. Reviewers

**REQUIRED**, enforced by branch protection per `PB-ENG-03` section 3.1.

| Change type | Required approvals |
|---|---|
| Documentation only | 1 |
| Test only | 1 |
| Normal feature or defect | 1 |
| Touching authorisation | 1, from someone other than the author, **who has read the authorisation matrix** |
| Touching persistence | 1, plus the migration reviewed per `PB-ENG-14` |
| Security-sensitive | 1, plus a second reviewer where the team permits |
| Adding a dependency | 1, with the approval per `PB-ENG-13` |
| Release | 1, plus the release approver per `PB-ENG-16` |

### 8.1 The author may not be the only reviewer

**A change reviewed only by its author has not been reviewed.** This is enforced by branch protection
and is not negotiable, including for the repository owner.

**Who reviews authorisation changes.** Not "whoever reviews", but a reviewer who has actually read the
matrix in `SECURITY-PLAN.md` section 4. A reviewer who has not read it cannot recognise a missing row,
because they do not know what should be there.

### 8.2 Stale approvals

Approvals are dismissed when new commits are pushed, per `PB-ENG-03` section 3.1.

**An approval of an earlier version is not an approval of this one.** Reviewing a 40-line diff and
approving a 400-line diff that arrived afterwards is not review.

---

## 9. Required Checks

**REQUIRED** to pass before merge, per governance principle 5 and 14. Governance principle 14 is
explicit: **a failed validation blocks promotion where the rule requires it.**

| Check | Source |
|---|---|
| Type checking | `PB-ENG-09 CI` |
| Linting and formatting | `PB-ENG-09 CI` |
| Unit tests | `PB-ENG-08 Testing` |
| Integration tests | `PB-ENG-08 Testing` |
| Dependency validation | `PB-ENG-13` |
| Secret scanning | `PB-ENG-12`, threat `TH-09` |
| Security checks | `PB-ENG-11` |
| Build validation | `PB-ENG-09 CI` |

**Per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, none of these may be listed as
required until the pipeline implements them.** Until `PB-ENG-09 CI` exists, the accurate statement is
that no automated checks exist and a reviewer is the only gate.

### 9.1 There is no override

**No reviewer may approve a pull request with a failing required check.** Not as an exception, not
"just this once", not for a hotfix.

Governance principle 15 forbids bypassing security or CI controls to make a build pass. If a check is
wrong, the check is fixed. If a check is too slow, it is optimised — but it is not removed, because the
next person to hit the same failure will find no check to fail.

---

## 10. Merging

| Property | Rule | Source |
|---|---|---|
| Method | Squash for topic branches | `PB-ENG-04` section 5 |
| Squash message | Must satisfy `PB-ENG-05` | `PB-ENG-03` section 5 |
| Conversations resolved | **Required** | An unresolved comment is unfinished review |
| Branch up to date | **Required** | Prevents a merge that passes then fails |
| Deletion | On merge | `PB-ENG-04` section 4.2 |
| Merge window | None. A merge that passes review is merged promptly | Stale pull requests generate conflicts and lose context |

### 10.1 Merge promptly after approval

**Not a rule so much as a practice.** A pull request approved on Monday and merged on Friday has been
approved in a state that no longer exists. Merge while the review context is live, or state that the
review must be repeated.

---

## 11. Closing Without Merging

**PROPOSED.** A pull request may be closed without merging. Each reason requires a specific action, so
the decision is recorded rather than lost.

| Reason | Required |
|---|---|
| Superseded by another change | Note on the superseding pull request, and the branch deleted |
| Requirement withdrawn or changed | **The requirement change is recorded first**, per `PB-ENG-20` |
| Approach abandoned | **The reasoning recorded in the thread.** This is the valuable case |
| Work no longer needed | Reason recorded |
| Duplicate | Note the canonical pull request |
| Blocked indefinitely | **Not closed.** Convert to draft and record the blocker, per `PB-ENG-01` section 1.2 |

### 11.1 Closed work is not lost work

**An abandoned approach is a decision worth keeping.** The reasoning tells the next person not to try
it again, and often explains why the chosen approach is the awkward one it is.

`PB-ENG-01` section 1.2 requires the same for an abandoned branch: the branch is deleted **and** the
reasoning is recorded. Deleting the work without recording the decision loses both.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Title follows the commit convention | Section 2 |
| All six description sections present, "None" with a reason where applicable | Section 3 |
| Requirement IDs identified | Section 3.1 |
| Test evidence specific and verifiable | Section 3.3 |
| Security and authorisation assessed and answered | Section 4 |
| Screenshots present where user-visible | Section 5 |
| Documentation updated in the same pull request | Section 6 |
| Required approvals obtained, from someone other than the author | Section 8 |
| Required checks passing | Section 9 |
| Conversations resolved, branch up to date | Section 10 |
| Closing without merging records a reason | Section 11 |

## Required Evidence

- The completed description
- Reviewer approval on the pull request
- Required checks passing, visible on the pull request
- Screenshots where user-visible
- Documentation changes, in the same pull request
- The squash commit message, conforming to `PB-ENG-05`

## What Blocks Progression

- Any description section is blank
- No requirement reference
- A required check is failing
- No approval, or only the author's
- Review is outstanding on an authorisation change
- Documentation is deferred to a follow-up
- A test was deleted or marked expected without a recorded reason
- A secret appears in the diff
- A merge is proposed with unresolved conversations

## Exception Process

**PROPOSED.** A hotfix follows the expedited review in `PB-ENG-04` section 2.3: same template, same
checks, same approval requirement, faster turnaround. Only the queue position changes.

**No exception exists for** skipping the template, omitting the authorisation assessment, merging with
a failing required check, or self-approving. Governance principles 4, 5, 14, and 15 are absolute on
those.

---

## Completion Criteria

- A description template exists and is used
- Branch protection enforces approvals and checks, verified per `PB-ENG-03` section 3.2
- The template's seven sections are all in use
- The size guideline is understood
- Closing without merging consistently records a reason

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PR-01 | Happy path | Feature implemented, template completed, approved, checks pass | Squash merged, branch deleted |
| PR-02 | Invalid | Description section left blank | Rejected at review |
| PR-03 | Invalid | No requirement reference | Rejected, `PB-ENG-01` |
| PR-04 | Invalid | "Tests pass" with no evidence | Rejected; section 3.3 |
| PR-05 | Happy path | Defect fix citing the failing-before scenario | Accepted |
| PR-06 | Invalid | Defect fix with no failing-before scenario | Rejected |
| PR-07 | Invalid | Security section answered "N/A" without a reason | Rejected |
| PR-08 | Unauthorized | New request field trusted without validation | **Blocked**; section 4.2 |
| PR-09 | Failure | New endpoint added with no grant | Denied to everyone; deliberate |
| PR-10 | Unauthorized | Author is the only approver | **Blocked**, section 8.1 |
| PR-11 | Invalid | Approval given, then commits pushed | Approval dismissed; re-review required |
| PR-12 | Failure | Required check failing | **Blocked**, principle 14 |
| PR-13 | Unauthorized | Reviewer approves to unblock a hotfix | **Blocked**; principles 14, 15 |
| PR-14 | Failure | Documentation deferred | Rejected; principle 11 |
| PR-15 | Failure | Requirement wrong, implementation proceeds | Rejected; amend first, `PB-ENG-20` |
| PR-16 | Happy path | Interface change with before and after screenshots | Accepted |
| PR-17 | Invalid | Visual change with no screenshot | Rejected |
| PR-18 | Failure | Authorisation denial message not shown to reviewer | Rejected; section 5 |
| PR-19 | Invalid | Squash merge with a default message | Rejected, `PB-ENG-05` |
| PR-20 | Invalid | Merge with unresolved conversations | **Blocked** |
| PR-21 | Failure | Branch not up to date at merge | **Blocked** |
| PR-22 | Boundary | Large pull request split by requirement | Accepted; each part reviewed |
| PR-23 | Invalid | Four unrelated fixes in one pull request | Rejected at review |
| PR-24 | Failure | Closed without merging, no reason recorded | Rejected; section 11 |
| PR-25 | Failure | Approved Monday, merged Friday with new commits | Re-review required; section 10.1 |
| PR-26 | Failure | Dependency added without `PB-ENG-13` approval | Rejected |
| PR-27 | Failure | Migration added with no rollback plan | Rejected, `PB-ENG-14` |
| PR-28 | Invalid | Draft pull request closed instead of marked blocked | Rejected; section 11 |

---

## Exit Criteria

- The template is in use
- Branch protection enforces approvals and required checks, verified
- `PB-ENG-09 CI` implemented, so the required checks correspond to real pipeline steps
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-07 Code Review](PB-ENG-07-CODE-REVIEW.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-04 Branching](PB-ENG-04-BRANCHING.md) ·
[PB-ENG-05 Commit Conventions](PB-ENG-05-COMMIT-CONVENTIONS.md) ·
[PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)