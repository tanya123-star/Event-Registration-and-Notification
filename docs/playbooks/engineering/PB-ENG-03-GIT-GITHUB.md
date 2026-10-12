# PB-ENG-03 — Git and GitHub

**Playbook:** PB-ENG-03
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No remote repository exists. No GitHub organisation has been created. No
> branch protection rule, required status check, or repository setting has been configured. The
> repository has one commit from its initial creation and no history. See the status section.

---

## Purpose

Define how the Event Registration and Notification System's source is version-controlled and hosted:
repository structure, remote rules, branch protection, required checks, permissions, tagging, and the
force-push prohibition.

This playbook exists because governance principle 3 requires production branches to be protected, and
a protection rule that is configured but not enforced provides the appearance of a control without
the substance.

---

## Scope

**Applies to:** the ERNS repository, its remote, its branches, its tags, and repository settings.

**Does not apply to:** branch naming and lifecycle, in `PB-ENG-04 Branching`; commit message format,
in `PB-ENG-05 Commit Conventions`; pull request content, in `PB-ENG-06 Pull Requests`.

---

## Ownership

**Responsible:** the Developer.
**Accountable:** the Council Secretary as repository owner, per OQ-52.
**Consulted:** IT, where a setting affects hosting or access.

---

## 1. Repository Structure

**PROPOSED.** A single repository for the application, the documentation, and the automation.

```
/
├── docs/                      # This documentation set
│   ├── planning/
│   ├── playbooks/
│   │   ├── system/
│   │   └── engineering/
│   └── architecture/
├── <application root>         # To be determined, OQ-42
├── <tests>                    # Co-located or separate, per OQ-47
├── <migrations>               # Per PB-ENG-14
├── .env.example               # Keys only, never values, per PB-ENG-12
├── .gitignore
└── README.md
```

| Decision | Rule | Reason |
|---|---|---|
| One repository, not a monorepo | Single application, single team | A monorepo adds tooling nobody here needs |
| Documentation in the repository | Versioned with the code | Per governance principle 11, documentation cannot drift if it is not versioned alongside |
| No `main`-branch database dump | **Prohibited** | Real student records, `NFR-SEC-013` |
| No secrets anywhere | **Prohibited** | `PB-ENG-12` |
| No generated artefacts committed | **Prohibited** | Reproducible builds, per `PB-ENG-08` |

**Documentation travels with the code** so that a change to behaviour and the change to the document
describing it are the same commit, reviewed together. This is what makes governance principle 11
enforceable rather than aspirational.

### 1.1 `.gitignore` minimum

**REQUIRED** entries, per `PB-ENG-12` section 7:

| Pattern | Reason |
|---|---|
| `.env` and `.env.*` | Secrets, `PB-ENG-12` |
| `.env.example` **negated** | Must be committed |
| Dependency directories | Reproducible from the manifest |
| Build output | Reproducible from source |
| Editor and OS files | Noise |
| Test output and coverage reports | Noise |
| Local database files | Real or synthetic data on a developer machine |

---

## 2. Remote Repository

> **OPEN QUESTION:** Where does the repository live, and who owns the organisation account? See
> [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-52.

### 2.1 The ownership requirement

**PROPOSED.** The repository MUST be owned by an **organisation account, not an individual account.**

**This is the single most important rule in this playbook.** A repository owned by an individual
becomes unavailable when that individual leaves the Council. With it go the branch protection rules,
the required reviewers, the audit log of who approved what, and the entire history. The system becomes
unmaintainable and ungovernable in one departure.

| Owner type | Consequence of departure | Verdict |
|---|---|---|
| Organisation account | Repository persists, settings persist, permissions reassignable | **Required** |
| Individual account | Repository, settings, and history become inaccessible | Prohibited |

### 2.2 Remote rules

| Rule | Detail |
|---|---|
| `origin` is the organisation's remote | Never an individual's fork as the canonical remote |
| The remote is not the only copy | `PB-ENG-18 Backup and Recovery` covers repository data |
| No secrets in remote settings | Values belong in a secret store, per `PB-ENG-12` |
| Default branch is `main` | Per `PB-ENG-04` |
| Remote URL recorded in documentation | So a new contributor finds the right one |
| Repository description states what ERNS is | Reduces the chance of a stranger's fork being mistaken for the original |

### 2.3 No direct commits by any contributor

**Every change to `main` arrives through a reviewed pull request.** There is no configuration under
which a direct push to `main` is acceptable, including for the repository owner.

**Why the owner is included.** An owner who can push directly will, at some point, push directly to
fix something urgent. If that path exists, it is used, and the urgent fix is unreviewed. Per
`PB-ENG-17 Incident Response`, an urgent change is handled by a hotfix branch with an expedited
review — not by an unreviewed push.

---

## 3. Protected Branches

**REQUIRED.** Governance principle 3.

### 3.1 `main` protection settings

| Setting | Value | Reason |
|---|---|---|
| Require a pull request before merging | **On** | Governance principles 1, 4 |
| Require approval | **On**, minimum 1 | Governance principle 4 |
| Dismiss stale approvals on new commits | **On** | An approval of an earlier version is not an approval of this one |
| Require review from a specific person or group | **On** where the team permits | Governance principle 4 |
| Require conversation resolution before merging | **On** | Unresolved review comments are unfinished review |
| Require status checks to pass | **On** | Governance principle 5 |
| Require branches to be up to date before merging | **On** | Prevents a merge that passes CI and then fails immediately |
| Require signed commits | Recommended, subject to OQ-52 | Attribution, `NFR-AUD-002` |
| Allow force pushes | **Off** | Section 4 |
| Allow deletions | **Off** | Branch deletion is a decision, per `PB-ENG-04` |
| Restrict who can push | **Contributors only, through pull requests** | Section 2.3 |
| Linear history | **On**, if supported | Readable history, per `PB-ENG-05` |

### 3.2 A protection rule that is not verified is not in place

**PROPOSED.** When protection settings are changed, verification is mandatory:

1. A test pull request is opened from a branch
2. Merging is attempted without an approval → **must fail**
3. Merging is attempted with a failing status check → **must fail**
4. Merging is attempted with an unresolved conversation → **must fail**
5. Only then is merging attempted correctly → **must succeed**

**Settings are configuration, and misconfiguration is invisible until it matters.** Per
[CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, a control that is not verified must not be
reported as in place. `BRN-05` in the test scenarios records this.

### 3.3 Release tags are protected

Per `PB-ENG-16 Release Management`, release tags MUST be protected so that a published version cannot
be moved. A moved tag makes a release unverifiable, because the tag no longer identifies what was
deployed.

---

## 4. Force-Push Policy

**PROHIBITED** on `main`, on any release branch, and on any tag. Without exception.

| Situation | Permitted action | Rationale |
|---|---|---|
| Personal branch with a bad history | Force-push permitted to that branch | No one else depends on it |
| Feature branch after a rebase | Force-push permitted to that branch | Rewriting an unmerged branch is normal |
| `main` after a bad merge | **Prohibited.** Revert instead | Rewriting `main` discards history that others have already pulled |
| A shared branch | **Prohibited** | Discards a colleague's work silently |
| Any tag | **Prohibited, always** | Breaks the identity of a release |

**Why revert rather than force-push on `main`.** A force-push to `main` does not merely remove a bad
commit. It removes every commit after it, silently discarding other people's work, and leaves anyone
with an older clone in a divergent state that produces confusing merges later. A revert is visible,
attributed, and reversible.

**If a force-push to `main` has already happened**, treat it as an incident per
`PB-ENG-17 Incident Response`: notify everyone, assess what was lost, and record it. Recovering the
lost commits from other clones is possible and urgent.

---

## 5. Merging

**PROPOSED.** Squash merge for feature branches, merge commit for release branches.

| Branch type | Strategy | Reason |
|---|---|---|
| Feature | Squash | One commit per requirement on `main`; the branch's intermediate history is not meaningful to a reader of `main` |
| Bug fix | Squash | Same |
| Hotfix | Merge commit | The fix's provenance stays visible in history |
| Release | Merge commit | Records the release boundary |

**Whichever is used, the squash commit message MUST satisfy `PB-ENG-05 Commit Conventions`.** A
squash merge with a default message discards the carefully written commit messages the branch
already has.

---

## 6. Tagging

**PROPOSED.** Tags follow `PB-ENG-16 Release Management` for when and how they are created. The
repository rules here are:

| Rule | Detail |
|---|---|
| Annotated tags only | A lightweight tag carries no author, date, or message |
| Tag format | Defined in `PB-ENG-16`, consistent with `PB-ENG-05` |
| Tags are immutable | Protected; a wrong tag is deleted and recreated, never moved |
| Tags point to `main` commits | Never to an unreleased branch |
| Tag message states what the release contains | Per governance principle 10 |

---

## 7. Permissions

**PROPOSED.** Least privilege, per `NFR-SEC-015` applied to the repository.

| Role | Repository permission | May merge | May change settings |
|---|---|---|---|
| Owner | Administrative | Yes | Yes |
| Maintainer | Administrative, no ownership transfer | Yes | Yes |
| Developer | Write | Yes, after approval | No |
| Reviewer | Read, plus review | Yes, after approval | No |
| Reader | Read | No | No |
| Outside contributor | Read | No | No |

### 7.1 Two-person rule for the highest privileges

**PROPOSED.** Granting or removing **Owner** requires two people. Granting or removing **Maintainer**
requires the Owner and one other.

**Why.** `TH-12` in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) is an administrator altering
records to conceal an action. A repository whose ownership can be changed unilaterally has the same
weakness: one compromised account can remove the evidence of the compromise by transferring ownership.

### 7.2 Access review

| When | What |
|---|---|
| On a role change | Reassess repository access, per `FR-USR-012` |
| On a departure | Remove access the same day. Confirm branch protection still has the required reviewers |
| Annually | Full review of everyone with write access or above |
| On a role being vacated | Confirm at least two Owners remain |

**The second row matters most for a student organisation.** Officers change every academic year, and
the person who set up the repository last year has usually graduated.

---

## 8. Required Status Checks

**REQUIRED** on `main`, subject to what `PB-ENG-09 CI` implements. Governance principle 5.

| Check | Blocks merge | Source |
|---|---|---|
| Type checking | Yes | `PB-ENG-09 CI` |
| Linting | Yes | `PB-ENG-09 CI` |
| Unit tests | Yes | `PB-ENG-08 Testing` |
| Integration tests | Yes | `PB-ENG-08 Testing` |
| Dependency validation | Yes | `PB-ENG-13` |
| Secret scanning | **Yes** | `PB-ENG-12`, threat `TH-09` |
| Security checks | Yes | `PB-ENG-11` |
| Build validation | Yes | `PB-ENG-09 CI` |

**Per governance principle 14, a failed required check blocks the merge.** There is no override, no
"merge anyway", and no administrator bypass.

**Per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, none of these checks may be listed as
required until the pipeline actually implements them.** Listing a check that does not run produces a
green status that means nothing. Until `PB-ENG-09 CI` is implemented, the honest statement is that no
status checks exist and `main` has whatever protection the platform applies by default.

### 8.1 Secret scanning is non-negotiable

`TH-09` is credential disclosure through a repository. It is the one check whose absence is
unrecoverable, because a committed secret is in the history permanently and must be rotated, not
merely deleted. Per `PB-ENG-12` section 6, exposure response begins with rotation regardless of how
quickly the commit is removed.

---

## 9. Repository Settings

| Setting | Value | Reason |
|---|---|---|
| Default branch | `main` | `PB-ENG-04` |
| Merge commits | Per section 5 | |
| Squash merges | Per section 5 | |
| Force pushes | Disabled | Section 4 |
| Branch deletion | Protected branches cannot be deleted | |
| Issues | Enabled | `PB-ENG-01` section 1.2 requires issues for unfinished work |
| Wiki | Disabled | Documentation lives in `docs/` |
| Projects | Optional | Not a source of truth |
| Archive on inactivity | **Off** | An archived repository is a dead repository |
| Automated access requests | Off | Access is granted deliberately, per 7.1 |
| Deletion | **Off**, and Owner-only | Prevents accidental or malicious repository deletion |

**"Archive on inactivity" is disabled deliberately.** For a student organisation, a quiet term is
normal. Automatic archiving of an inactive repository is how a system becomes unmaintainable without
anyone deciding to stop maintaining it.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Repository owned by an organisation account | Section 2.1 |
| Every change to `main` through a reviewed pull request | Section 2.3 |
| `main` protection enabled | Section 3.1 |
| Protection verified by test pull request after any change | Section 3.2 |
| No force-push to `main`, shared branches, or tags | Section 4 |
| Tags annotated and immutable | Section 6 |
| Access reviewed on role change, departure, and annually | Section 7.2 |
| Required checks enforced and actually implemented | Section 8 |
| Repository deletion disabled | Section 9 |

## Required Evidence

- Repository owner recorded as an organisation
- Branch protection settings, with the verification result of section 3.2
- Required status checks listed, each matched to an implemented pipeline step
- Access review record, dated
- The remote URL recorded in the README

## What Blocks Progression

- A direct push to `main` is possible
- Protection settings are configured but unverified
- A required check is listed but not implemented
- A force-push has occurred to `main` or a tag
- Repository ownership rests with an individual
- More than one Owner does not remain after an access review
- A secret is found in history

## Exception Process

**PROPOSED.** Emergency changes follow `PB-ENG-04` hotfix policy: a branch, an expedited review, and a
recorded reason. The protection rule is not disabled.

**No exception exists for disabling branch protection, permitting force-push to `main`, or bypassing a
failing required check.** Governance principles 3, 14, and 15 are absolute on those. If a required
check is wrong, the check is fixed. A build that can only pass by removing its own validation is a
build that should not ship.

---

## Completion Criteria

- Organisation owns the repository
- `main` is protected and the protection has been verified by test
- Required status checks correspond to implemented pipeline steps
- Force-push is disabled on `main` and tags are protected
- Permissions follow least privilege with a two-person rule for Owner
- An access review has been performed and recorded

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| GIT-01 | Happy path | Feature branch merged after approval | Squash commit on `main` with a conforming message |
| GIT-02 | Unauthorized | Direct push to `main` | **Blocked** |
| GIT-03 | Unauthorized | Contributor merges without approval | **Blocked** |
| GIT-04 | Failure | Required check failing at merge | **Blocked**, principle 14 |
| GIT-05 | Failure | Protection settings changed without verification | Rejected; `BRN-05` requires the test |
| GIT-06 | Invalid | Force-push attempted to `main` | **Blocked** |
| GIT-07 | Invalid | Force-push attempted to a tag | **Blocked**; tag is immutable |
| GIT-08 | Boundary | Feature branch rebased, force-pushed to itself | Permitted |
| GIT-09 | Invalid | Force-push to a shared branch | **Blocked**; a colleague's work would be lost |
| GIT-10 | Failure | Force-push to `main` already occurred | Incident per `PB-ENG-17`; recover and notify |
| GIT-11 | Invalid | Squash merge with a default message | Rejected at review, `PB-ENG-05` |
| GIT-12 | Failure | Required check listed but not implemented | Rejected; principle 5 and CONVENTIONS section 6 |
| GIT-13 | Unauthorized | Sole Owner grants themselves Maintainer | **Blocked**, two-person rule |
| GIT-14 | Failure | Owner's access removed on departure | Flagged by section 7.2 review |
| GIT-15 | Boundary | One Owner remains after a departure | Flagged; a second Owner required |
| GIT-16 | Failure | Secret committed to history | `PB-ENG-12` section 6; rotate first |
| GIT-17 | Invalid | Lightweight tag created for a release | Rejected; annotated only |
| GIT-18 | Failure | Repository archived by inactivity | Prevented; setting disabled |
| GIT-19 | Invalid | Database dump committed | Rejected; `.gitignore` plus review |
| GIT-20 | Failure | Repository ownership held by one individual | Rejected at onboarding; OQ-52 |

---

## Exit Criteria

- OQ-52 answered and the organisation account established
- Branch protection verified by the section 3.2 procedure
- `PB-ENG-09 CI` implemented, with status checks matched to real pipeline steps
- Two or more Owners exist
- The "not yet implemented" banner removed once protection is verified

---

**Related documents:** [PB-ENG-03 Git and GitHub](PB-ENG-03-GIT-GITHUB.md) ·
[PB-ENG-04 Branching](PB-ENG-04-BRANCHING.md) ·
[PB-ENG-05 Commit Conventions](PB-ENG-05-COMMIT-CONVENTIONS.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)