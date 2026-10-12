# PB-ENG-04 — Branching

**Playbook:** PB-ENG-04
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No branching model has been enacted. No remote repository exists, no
> branches beyond the initial one, and no branch protection. See the status section.

---

## Purpose

Define the branching model for the Event Registration and Notification System: which branches exist,
what each is for, how they are named, how they are merged, and how they are retired.

This playbook exists because a branching model chosen because it is conventional rather than because
it fits produces permanent friction. The model here is deliberately small, because ERNS is built by a
small team where every branch is overhead.

---

## Scope

**Applies to:** all branches in the ERNS repository.

**Does not apply to:** protection configuration, in `PB-ENG-03 Git and GitHub`; commit format, in
`PB-ENG-05 Commit Conventions`; review content, in `PB-ENG-07 Code Review`.

---

## Ownership

**Responsible:** the Developer.
**Accountable:** the technical owner for the affected module.
**Consulted:** a reviewer, per `PB-ENG-06 Pull Requests`.

---

## 1. Why Not a Conventional Branching Model

The widely-used models assume a release cadence and a team size this project does not have. Each was
considered and rejected for a stated reason, per governance principle 10.

| Model | Why rejected |
|---|---|
| Git Flow with `develop` | A permanent `develop` branch requires every hotfix to be merged twice, for a system with no customer-facing release train and no separate development phase |
| GitHub Flow, single `main` | **Rejected** because a change failing checks must never sit on `main` where it can block everyone. `main` must always be releasable |
| Release branches per version | **Rejected** for routine releases. **Retained** only for the case in section 6 |
| Environment branches (`develop`, `staging`, `production`) | **Rejected.** These are environments, not branches. Environments are configurations per [ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md), not divergent copies of the source |

**The chosen model is a two-branch model with short-lived topic branches.** `main` holds only
verified, releasable work. Everything else lives on a branch that is created for a requirement or a
defect and deleted when merged.

**Why two branches rather than one.** With a single `main` and no topic branches, a developer must
either commit failing work to `main` or shelve it. The first breaks principle 14; the second loses the
work. A topic branch costs little and solves both.

---

## 2. The Branches

### 2.1 `main`

| Property | Value |
|---|---|
| Purpose | Holds verified, releasable work |
| Direct commits | **Prohibited** |
| Merges from | Topic branches and hotfix branches, through reviewed pull requests |
| Protection | Full, per `PB-ENG-03` section 3 |
| Force-push | **Prohibited** |
| Deletion | **Prohibited** |
| May be untestable | **No. Ever** |

**`main` is always releasable.** This is the invariant the entire model exists to protect. If `main`
can be broken, then a release is an event rather than a state, and every release carries the risk of
the last change rather than the risk of the release process.

### 2.2 Topic branches

| Property | Value |
|---|---|
| Purpose | One requirement or one defect |
| Lifetime | Days, not weeks |
| Created from | `main` |
| Merged into | `main` |
| Deleted | On merge, and after a stale period if abandoned |
| Protection | None needed; the author needs full write access to their own branch |

**One requirement per branch.** A branch carrying three unrelated changes cannot be reviewed as a
unit, cannot be reverted as a unit, and — per governance principle 14 — cannot be partially rolled
back if one part causes a production problem.

### 2.3 Hotfix branches

| Property | Value |
|---|---|
| Purpose | A defect that cannot wait for the normal review cycle |
| Created from | `main` |
| Merged into | `main` directly, and into the next release branch |
| Review | Still required. **Expedited**, not waived |
| Protection | Same as `main` |

**A hotfix skips the queue, not the review.** Governance principles 4 and 15 apply during an
incident exactly as they do otherwise, and per `PB-ENG-17 Incident Response`, an incident is when
unreviewed changes do the most damage.

### 2.4 Release branches — conditional

**Created only when required by `PB-ENG-16 Release Management`.** See section 6.

---

## 3. Branch Naming

**REQUIRED.** A naming scheme exists so that a branch list is readable and so that a stale branch can
be identified at a glance.

**PROPOSED** format:

```
<type>/<requirement-or-ticket>-<short-description>
```

| Type | Use | Example |
|---|---|---|
| `feature` | New behaviour for a requirement | `feature/FR-REG-014-duplicate-guard` |
| `fix` | A defect | `fix/FR-ATT-016-officer-correction` |
| `hotfix` | An urgent production defect | `hotfix/registration-capacity-race` |
| `refactor` | No behaviour change | `refactor/registration-validation-split` |
| `docs` | Documentation only | `docs/pb-eng-19-conventions` |
| `chore` | Dependencies, tooling, configuration | `chore/dependency-updates` |

### 3.1 The rules

| Rule | Reason |
|---|---|
| Lowercase, hyphen-separated | Consistent and readable in any tool |
| Requirement ID in the name where one applies | `git branch` alone connects the branch to the requirement |
| No personal names | A branch is work, not a person |
| No ticket-system numbers from a system ERNS does not use | Avoids a dangling reference |
| Descriptive, not cryptic | `fix/registration-capacity-race`, not `fix/rc-3` |
| Under 60 characters | Avoids truncation in tools and terminals |

**The requirement ID in the branch name is the cheapest traceability available.** It connects the
branch to the requirement before the pull request is even opened, per `PB-ENG-01 Development` section 2.

### 3.2 Defects are named by symptom, not cause

`fix/registration-capacity-race` names what was observed. A branch named after the presumed cause —
`fix/remove-capacity-check` — is wrong the moment the cause turns out to be elsewhere, and it biases
the reviewer toward a solution before the investigation.

---

## 4. Branch Lifecycle

```
main
 │
 ├── feature/FR-REG-014-...   created from main
 │      │
 │      ├── commits, per PB-ENG-05
 │      ├── draft PR if blocked, per PB-ENG-01 section 1.2
 │      ├── review, per PB-ENG-07
 │      └── merged → deleted
 │
 ├── hotfix/...               created from main, expedited review
 │      │
 │      ├── merged to main
 │      └── if a release branch exists, merged to it too
 │
 └── release/x.y.z            created only per section 6
        │
        ├── bug fixes merged from hotfix branches
        └── tagged, per PB-ENG-16
```

### 4.1 Stale branches

**PROPOSED.** A topic branch open for more than **30 days** is reviewed:

| State | Action |
|---|---|
| Still wanted | Rebase onto current `main`, continue |
| Blocked | Convert to a draft pull request so the blocker is visible |
| Abandoned | Delete, and record the reasoning in an issue so the decision is not lost |
| Superseded | Delete, and note in the pull request that closed it |

**A branch that is neither progressing nor closed is the actual problem.** A repository with forty
open branches has no reviewable state, and the one branch that matters becomes invisible among them.

### 4.2 Branch deletion

**Delete on merge.** An unmerged branch is retained only while the work continues.

**Deleting a shared branch requires confirmation from anyone who has committed to it.** Per
`PB-ENG-03` section 4, deleting a branch whose commits are not merged anywhere discards work
silently.

---

## 5. Merge Rules

| Rule | Detail |
|---|---|
| Squash merge for topic branches | One commit per requirement on `main`, per `PB-ENG-03` section 5 |
| The squash message satisfies `PB-ENG-05` | A default message discards the branch's carefully written history |
| Branch is up to date with `main` before merge | Prevents a merge that passes and then fails |
| No merge with unresolved review comments | An unresolved comment is unfinished review |
| No merge with a failing required check | Governance principle 14 |
| No merge with a secret in the diff | `PB-ENG-12` |
| Squash message references the requirement | Traceability survives the squash |
| Rebase rather than merge to update a topic branch | Keeps the branch's history readable |

### 5.1 Rebasing a shared topic branch

**PROPOSED.** A topic branch has exactly one author, so rebasing it is safe. If a second person
contributes commits to it, they are co-authors and a rebase rewrites their work — in which case merge
`main` into the branch instead.

---

## 6. Release Branches

**Created only when `PB-ENG-16 Release Management` requires one.** The condition, not the model,
decides.

| Created when | Rationale |
|---|---|
| A release must be supported while a newer one is deployed | Two versions in production simultaneously |
| A migration cannot be reversed quickly | `PB-ENG-14` section 7 |
| A security fix must be delivered to a deployed version without redeploying the current one | Incident response |

| Property | Value |
|---|---|
| Created from | `main`, at a point where it is releasable |
| Accepts | Bug fixes only, from hotfix branches. **No new features** |
| Merged back to `main` | Only after the release is superseded |
| Tagged | Per `PB-ENG-16` |
| Deleted | Once superseded and no longer deployed |

**A release branch that accepts new features is no longer a release branch.** It becomes a second
`main`, and `main` stops being releasable. This is why the acceptance rule is narrow.

**Whether a release branch will be needed at all depends on OQ-30.** Without a defined hosting and
rollback mechanism, per `PB-ENG-10`, there is nothing to branch from.

---

## 7. Merge Rules by Branch Type

| From | Into | Allowed content | Review | Checks |
|---|---|---|---|---|
| Topic | `main` | One requirement or defect | 1 approval | All required |
| Hotfix | `main` | One defect | 1 approval, expedited | All required |
| Hotfix | Release | One defect | 1 approval, expedited | All required |
| Release | `main` | Already-merged fixes only | 1 approval | All required |
| Any | Any | — | — | **Never bypassed** |

---

## 8. Branch Protection Summary

Cross-referenced from `PB-ENG-03` section 3. Not duplicated deliberately.

| Branch | Protection |
|---|---|
| `main` | Full: review, checks, no force-push, no deletion |
| Release | Full, as `main` |
| Hotfix | Full, as `main`, at the target |
| Topic | None; the author requires write access to push |

**A topic branch needs no protection because nothing else depends on it.** Protecting every branch
would mean protecting branches the author must be able to force-push, which defeats the purpose.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| `main` holds only verified, releasable work | Section 2.1 |
| Every change to `main` arrives through a reviewed pull request | Sections 2.1, 7 |
| One requirement or defect per topic branch | Section 2.2 |
| Branch names follow the scheme and carry the requirement ID | Section 3 |
| Topic branches are deleted on merge | Section 4.2 |
| Stale branches are reviewed at 30 days | Section 4.1 |
| Hotfixes are reviewed, never waived | Section 2.3 |
| Release branches accept bug fixes only | Section 6 |
| No merge bypasses a required check | Section 7 |

## Required Evidence

- Branch name in the pull request, and the requirement ID it references
- Reviewer approval recorded on the pull request
- Required checks passing, shown on the pull request
- Stale branch review recorded when it happens
- Release branch existence justified per section 6

## What Blocks Progression

- `main` is not releasable
- A branch carries multiple unrelated requirements
- A branch name does not follow the scheme
- A required check is failing or unresolved
- Review is outstanding
- A hotfix is proposed without review
- A release branch is being used for new features

## Exception Process

**PROPOSED.** A hotfix follows section 2.3: expedited review, same controls, recorded reason.

**No exception exists for committing directly to `main`, for skipping review on a hotfix, or for
merging with a failing required check.** Governance principles 3, 4, 14, and 15 are absolute. If the
normal process is too slow, that is a finding about the process and belongs in a retrospective, not in
a bypass.

---

## Completion Criteria

- The model is enacted: `main` protected, topic branches used and deleted on merge
- Names follow the scheme
- Stale branches are reviewed
- Hotfix procedure is understood and has been exercised at least once
- Release branch condition is defined, even if no branch is needed yet

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| BRN-01 | Happy path | Feature branch merged after approval | Squash commit on `main`, branch deleted |
| BRN-02 | Invalid | Direct commit to `main` | **Blocked**, `PB-ENG-03` section 2.3 |
| BRN-03 | Invalid | Branch carrying three requirements | Rejected at review |
| BRN-04 | Invalid | Branch name without the requirement ID | Rejected at review |
| BRN-05 | Failure | Protection settings changed but not verified | Rejected; the section 3.2 test pull request is required |
| BRN-06 | Failure | Branch open beyond 30 days | Reviewed: continue, mark blocked, delete, or supersede |
| BRN-07 | Invalid | Branch deleted while a collaborator's commits are unmerged | **Blocked**; confirmation required |
| BRN-08 | Happy path | Hotfix merged to `main` | Reviewed, expedited, recorded reason |
| BRN-09 | Unauthorized | Hotfix merged without review | **Blocked** |
| BRN-10 | Boundary | Rebase of a single-author topic branch before merge | Permitted |
| BRN-11 | Boundary | Rebase of a co-authored topic branch | Merge `main` in instead |
| BRN-12 | Invalid | Release branch accepts a new feature | Rejected; bug fixes only |
| BRN-13 | Failure | `main` becomes untestable | **Blocked**; this is the invariant |
| BRN-14 | Invalid | Merge with unresolved review comments | **Blocked** |
| BRN-15 | Failure | Branch merged without being up to date | **Blocked** |
| BRN-16 | Invalid | Squash merge with a default message | Rejected; message must satisfy `PB-ENG-05` |
| BRN-17 | Failure | Branch name based on presumed cause | Rejected; name the symptom |
| BRN-18 | Boundary | Branch deleted after its work was superseded | Permitted, with a note on the closing pull request |
| BRN-19 | Failure | `main` diverges from a clone | Force-push prohibited; resolve by merge |
| BRN-20 | Invalid | Environment branches created | Rejected; environments are configuration |

---

## Exit Criteria

- The model is in use and demonstrably keeping `main` releasable
- Stale branches are being reviewed
- OQ-30 answered, so the release branch condition in section 6 can be evaluated
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-04 Branching](PB-ENG-04-BRANCHING.md) ·
[PB-ENG-03 Git and GitHub](PB-ENG-03-GIT-GITHUB.md) ·
[PB-ENG-05 Commit Conventions](PB-ENG-05-COMMIT-CONVENTIONS.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-16 Release Management](PB-ENG-16-RELEASE-MANAGEMENT.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)