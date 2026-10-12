# PB-ENG-10 — Continuous Delivery and Deployment

**Playbook:** PB-ENG-10
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No deployment infrastructure exists.** No platform has been selected, no
> environment has been provisioned, no pipeline deploys anything, and no artefact has been built or
> released. The hosting question is unanswered.
>
> **OQ-30 is BLOCKING for this entire playbook.** Everything below specifies a target state that
> cannot begin until a deployment platform is chosen. No platform is named, invented, or assumed
> anywhere in this document.

---

## Purpose

Define how the Event Registration and Notification System is promoted from a verified change to a
running production system, and what must be true at each step.

This playbook exists because governance principle 13 forbids direct production changes without an
approved process, and because an emergency manual deployment is how a controlled system loses its
controls permanently.

---

## Scope

**Applies to:** promotion of ERNS between environments, and any change to a running production
system.

**Does not apply to:** environment configuration, in `PB-ENG-15 Environment Management`; release
readiness and tagging, in `PB-ENG-16 Release Management`; incident response, in
`PB-ENG-17 Incident Response`; schema changes, in `PB-ENG-14 Database Changes`.

---

## Ownership

**Responsible:** the Developer performing the deployment.
**Accountable:** the Council Secretary as release approver, per `PB-ENG-16`.
**Consulted:** IT, for infrastructure changes.

---

## 1. Current State

**Nothing is deployed. Nothing can be deployed.**

| Item | State | Blocking |
|---|---|---|
| Deployment platform | **Not selected** | **OQ-30** |
| Hosting arrangement | **Unknown** | **OQ-31** |
| Staging environment | **Does not exist.** Existence undecided | **OQ-55** |
| Production environment | **Does not exist** | **OQ-30** |
| Deployment pipeline | **Does not exist** | OQ-30 |
| Build artefact | **Cannot be produced.** No application code | OQ-41, OQ-42, OQ-44 |
| Migration mechanism | **Not designed** | OQ-44 |
| Rollback mechanism | **Cannot be defined** | OQ-30 |
| Backup | **Does not exist** | OQ-29, `PB-ENG-18` |

### 1.1 Consequences of OQ-30 being unanswered

**This is the single most consequential blocker in the engineering documentation set.**

| Cannot be specified | Why |
|---|---|
| Where the application runs | No platform |
| Whether CI can deploy at all | Depends on the platform's access model |
| How migrations are applied in production | Depends on the platform's database access |
| How a rollback is performed | Depends on what is redeployable |
| Whether TLS, rate limiting, and least privilege are ours or the platform's | Depends on the platform's features |
| Whether a staging environment resembling production is possible | **OQ-55** |

**Per the master instruction: do not invent deployment infrastructure.** Every item above is recorded
as a question for IT rather than resolved by assumption.

---

## 2. Environments

**PROPOSED.** Four, per [ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md).

| # | Environment | Exists | Promotion to |
|---|---|---|---|
| E-1 | Local development | No | E-2 |
| E-2 | Test / CI | No | E-3, if it exists |
| E-3 | Staging | **Undecided, OQ-55** | E-4 |
| E-4 | Production | No | — |

### 2.1 What differs between them

Only configuration. Per `EA-4`, **the same artefact is promoted; configuration changes between
environments.** A separate build per environment means the artefact in production was never tested.

| Concern | E-2 | E-3 | E-4 |
|---|---|---|---|
| Data | Synthetic | Anonymised or synthetic | Real |
| Email | Captured, not sent | Internal recipients only | Real recipients |
| Error detail | Permitted | Minimal | **Prohibited**, `NFR-SEC-012` |
| Rate limits | Production values | Production values | Production values |
| Secrets | Automated, injected | Managed | Managed, rotated |

**Production values in the test environment are deliberate**, per
[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) section 2.2. A rate limit
tested at ten times production is not the limit that protects the system.

---

## 3. Promotion Process

**PROPOSED.** Three promotion stages, each gated.

```
   Change merged to main
            │
            ▼
   ┌─────────────────────┐
   │ E-2  Test / CI      │  All REQUIRED checks pass, PB-ENG-09
   │ Artefact built      │  Same configuration as E-4
   └──────────┬──────────┘
              │  artefact + its digest, plus the commit identifier
              ▼
   ┌─────────────────────┐
   │ E-3  Staging        │  IF IT EXISTS, OQ-55
   │ Migrations rehearsed│  PB-ENG-14 section 7
   │ Smoke tests         │
   └──────────┬──────────┘
              │  approval, PB-ENG-16
              ▼
   ┌─────────────────────┐
   │ E-4  Production     │  Migrations applied
   │                     │  Post-deployment verification, section 8
   └──────────┬──────────┘
              │
              ▼  on failure
        Rollback, section 9
```

### 3.1 The artefact identity rule

**PROPOSED.** Every promotion carries the artefact and its digest, plus the commit identifier.

**The same artefact is promoted through every stage.** It is never rebuilt between environments. This is
what makes `PB-ENG-09` section 2.8 meaningful: the checks that passed are checks on the artefact that
will actually run.

**A rebuild between staging and production invalidates the staging verification**, because the artefact
verified is not the artefact deployed.

### 3.2 What happens without staging

If `OQ-55` is answered "no staging environment", promotion is E-2 to E-4 directly, and the following
compensating controls become **mandatory**:

| Compensation | Why |
|---|---|
| Every migration must be reversible, verified in E-2 | No rehearsal is possible |
| Migrations applied before application start, never during | Minimises the window where versions disagree |
| Backups taken and verified immediately before migrating | `PB-ENG-18`, and `NFR-BACKUP-004` |
| Post-deployment verification is mandatory, not optional | There is no prior signal |
| A rollback plan is written before deployment, not after | Under pressure there is no time to design one |
| Maintenance window scheduled outside published events | `NFR-AVAIL-002`, `NFR-AVAIL-003` |

**Going without staging is a decision with costs, not a simplification.** The compensating controls are
the price, and they are not optional.

---

## 4. Deployment Prerequisites

**REQUIRED** before any promotion.

| Prerequisite | Authority |
|---|---|
| Every REQUIRED CI check passed on the commit | `PB-ENG-09`, principle 5 |
| The artefact was built by the pipeline, not locally | `PB-ENG-09` section 2.8 |
| Artefact digest recorded | Section 3.1 |
| Tests passed on this artefact | `PB-ENG-08` |
| Migrations identified, with a rollback plan | `PB-ENG-14` |
| Backup taken and **verified by restoration**, if migrating | `NFR-BACKUP-004`, `NFR-BACKUP-006` |
| Release approved | `PB-ENG-16` |
| No outstanding blocking open question for this feature | [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) |
| Maintenance window outside published events | `NFR-AVAIL-002` |

### 4.1 A backup that has not been restored is not a backup

**NFR-BACKUP-006 is explicit.** `PB-ENG-18 Backup and Recovery` records that the interview found
backups made by copying files with no evidence of restoration testing.

**A migration must not be applied on the strength of a backup whose restoration has never been
verified.** The verification is a prerequisite, not a follow-up.

> **NOT YET IMPLEMENTED.** No backup mechanism exists. Per `OQ-29` and `NFR-BACKUP-001` to
> `NFR-BACKUP-007`, no deployment involving a data change can currently be performed at all.

---

## 5. Required CI Status

**REQUIRED**, and enforced by branch protection per `PB-ENG-03` section 8.

| Check | Must pass before |
|---|---|
| Type checking | Any merge |
| Linting | Any merge |
| Unit tests | Any merge |
| Integration tests | Any merge |
| Service and API tests | Any merge |
| Dependency validation | Any merge |
| Secret scanning | Any merge |
| Build validation | Any deployment |
| Security checks | Any deployment |
| Artifact validation | Any deployment |
| End-to-end tests | Any production deployment |
| Accessibility scan | Any production deployment |
| Meta-tests `TST-01` to `TST-10` | Any production deployment |

**Per governance principle 14, a failed check blocks promotion.** There is no override.

**Per [CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, none of these may be listed as
satisfied until implemented.** Since no pipeline exists, the accurate current statement is that **no
check has run and nothing is verified.**

---

## 6. Approval Requirements

**PROPOSED.**

| Promotion | Approval | Countdown |
|---|---|---|
| E-2 to E-3 | Automatic on checks passing | None |
| E-3 to E-4 | **Council Secretary or designated release approver** | None |
| Migration with data change | Technical owner **and** Council Secretary | None |
| Emergency deployment | Same approver, expedited, reason recorded | None |
| Emergency deployment bypassing checks | **Prohibited.** See section 10 | — |

### 6.1 Why deployment approval is a governance control and not a formality

A deployment changes what students see. If an unreviewed change reaches E-4, the audit trail records
what happened but not who authorised it, and `TH-01` in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md)
becomes materially harder to detect.

**The Council Secretary approves deployments because the Council, not the development team, is
accountable to students for the records it holds.**

---

## 7. Migration Considerations

**PROPOSED.** Detailed procedure in `PB-ENG-14 Database Changes`. The deployment-relevant rules:

### 7.1 Order of operations

**Migrations are applied before the application starts, never during.**

| Order | Why |
|---|---|
| **Correct** | Migrate, then start. The application never runs against an older schema |
| **Incorrect** | Start, then migrate. The application runs against a schema it does not expect |

### 7.2 Compatibility

**Every migration must be compatible with both the previous and the next application version** for as
long as a rollback is possible.

| Migration type | Compatible? |
|---|---|
| Additive: a new nullable column | Yes |
| Additive: a new table | Yes |
| Removing a column still written by the old version | **No.** Blocks rollback |
| Renaming a column the old version reads | **No.** Blocks rollback |
| Changing a type the old version depends on | **No.** Blocks rollback |

**This is what makes rollback possible at all.** An incompatible migration removes the option, and
rollback becomes restoration instead.

### 7.3 Capacity and lock considerations

| Concern | Requirement |
|---|---|
| A migration that locks a large table | Must be assessed against the student body size |
| A migration during published event windows | **Prohibited**, `NFR-AVAIL-003` |
| A migration exceeding the maintenance window | Must be scheduled outside event windows, `NFR-AVAIL-002` |

**An outage during an attendance window is the highest-impact failure ERNS can have**, per
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) section 7. This is why
`PB-10` and `PB-11` have a staff-assisted path that does not depend on the notification or email
subsystems.

---

## 8. Post-Deployment Verification

**REQUIRED** after every deployment to E-4. Not optional, and not deferred to monitoring, because
monitoring tells you something is wrong and this tells you it is not.

**PROPOSED.** In order:

| # | Check | Requirement |
|---|---|---|
| 1 | The application started, and the process is running | — |
| 2 | Health endpoint responds | `NFR-AVAIL-004` |
| 3 | A user can sign in | `NFR-SEC-001` |
| 4 | A student can register for a published event | `NFR-AVAIL-005`, **Primary Function 1** |
| 5 | The registration appears in the participant list | `PB-05` |
| 6 | A notification appears in the recipient's centre | **Primary Function 2**, `FR-NOT-001` |
| 7 | The email state is recorded, whatever it is | `FR-NOT-003`, `OQ-56` |
| 8 | An audit entry was written for the test registration | `NFR-AUD-001` |
| 9 | Schema version matches the intended version | `PB-ENG-14` |
| 10 | No error appeared in the log during verification | `NFR-MAINT-004` |

### 8.1 Checks 4 to 8 exercise both primary functions

**A deployment that passes a health check and fails to register a student has failed.**

This is why verification is behavioural rather than structural. The health endpoint can return success
while the data store is unreachable, the audit write fails, or the notification queue is dead — all
of which would leave students unable to register for events.

### 8.2 When verification fails

**Rollback per section 9**, or forward-fix if the cause is understood and the fix is small. The decision
is recorded either way, with the reason.

**Verification failure is not an incident until users are affected.** Per `PB-ENG-17`, the two are
distinguished, because responding to a failed verification as though the system is down causes an
unnecessary rollback, which is itself a disruption.

---

## 9. Rollback

**REQUIRED** to be possible, and **REQUIRED** to have been considered before deployment.

| Property | Rule |
|---|---|
| Trigger | Verification fails, or a production defect appears per `PB-ENG-17` |
| Method | Redeploy the previous artefact. **Restore data only if the migration was applied** |
| Decision owner | Council Secretary, or the technical owner for a defect without data impact |
| Time to decide | Defined per `PB-ENG-16`, before the first release |
| Evidence | Artefact digest, time, reason, verification result |

### 9.1 Rollback versus restore

| Situation | Action |
|---|---|
| The application version is wrong | Roll back the artefact |
| A migration was applied and the data is wrong | Restore the database **and** roll back the artefact |
| A migration was applied and the data is correct | Roll back the artefact only, if compatible |
| The data is damaged independently of the deployment | Restore per `PB-ENG-18`, not per this section |

**A rollback and a restore are different operations with different consequences.** Rolling back an
artefact discards no participation records; restoring a database from a backup discards everything
written since the backup was taken. **A restore is not a rollback.**

### 9.2 Why a rollback plan must exist before deployment

**Under pressure nobody designs one.** The decision to restore or roll forward requires knowing which
artefact was deployed, what migrations it expects, and whether the data can survive the rollback. That
information is gathered before the deployment or not at all.

**PROPOSED.** A deployment with no recorded rollback plan is refused, except in an incident where
`PB-ENG-17` governs.

---

## 10. Prohibited Practices

**PROHIBITED.** Governance principles 13, 14, and 15.

| Practice | Why |
|---|---|
| Direct changes to production | Principle 13 |
| Manual edits to the production database | `NFR-MAINT-006`, and no audit trail |
| Deploying from a local machine | The artefact was never verified by the pipeline |
| Deploying without a passing CI status | Principle 5 |
| Merging to `main` to bypass a failing check | Principles 14, 15 |
| Disabling a check to deploy | Principle 15 |
| Promoting to E-3 a build not made by the pipeline | Section 3.1 |
| Applying a migration without a verified backup | `NFR-BACKUP-006`, section 4.1 |
| Deploying during a published event window | `NFR-AVAIL-003` |
| Deploying to production while an incident is open | `PB-ENG-17` |
| Changing production configuration outside the process | Principle 13 |

### 10.1 Emergency deployments follow the same process

**Faster, not different.**

An emergency deployment uses a hotfix branch, an expedited review, a recorded reason, and every check
that is functioning. Per `PB-ENG-04` section 2.3, a hotfix skips the queue, not the review.

**If a check is genuinely broken during an incident**, that is recorded as a pipeline defect per
`PB-ENG-09` section 5, with an owner and a resolution date. **The check is not disabled**, because the
next deployment needs it and nobody will remember.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Same artefact promoted through every stage | Section 3.1 |
| Digest and commit recorded for every promotion | Section 3.1 |
| Every REQUIRED CI check passing | Section 5 |
| Release approved before E-3 to E-4 | Section 6 |
| Migrations compatible with the previous version | Section 7.2 |
| Migrations applied before the application starts | Section 7.1 |
| Verified backup before a data-changing migration | Section 4.1 |
| Rollback plan recorded before deployment | Section 9.2 |
| Post-deployment verification performed | Section 8 |
| No deployment during a published event window | `NFR-AVAIL-003` |
| No direct production change | Principle 13 |

## Required Evidence

- The artefact digest and commit identifier for each promotion
- CI status showing every REQUIRED check passing
- The release approval, with approver and date
- The migration set applied, and the rollback plan
- The backup verification result, where a migration was applied
- The post-deployment verification result, checks 1 to 10
- The rollback outcome, where one occurred

## What Blocks Progression

- Any REQUIRED check is failing
- No release approval
- A migration has no rollback plan
- No verified backup before a data-changing migration
- No rollback plan recorded
- The artefact was not built by the pipeline
- The artefact was rebuilt between environments
- A published event window is in progress
- A blocking open question is unresolved for the feature
- `OQ-30` is unanswered, so there is no platform to deploy to

## Exception Process

**PROPOSED.** An emergency deployment proceeds with the same controls and an expedited timeline. The
reason is recorded, and the approval is obtained from the same approver.

**No exception exists for** deploying without a passing CI status, applying a migration without a
rollback plan or a verified backup, changing the production database directly, or deploying during a
published event window. Governance principles 13, 14, and 15 are absolute.

---

## Completion Criteria

- OQ-30 and OQ-31 answered, so a platform exists
- OQ-55 answered, so the staging question is settled
- The pipeline deploys, rather than a person doing it
- Every promotion carries an artefact digest and commit
- Rollback has been rehearsed, not merely documented
- Post-deployment verification is automated
- Section 1 updated to reflect reality

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| CD-01 | Happy path | All checks pass, artefact promoted to production | Verification passes, evidence recorded |
| CD-02 | Failure | A REQUIRED check failing at promotion | **Blocked**, principle 14 |
| CD-03 | Unauthorized | Deployment attempted without release approval | **Blocked** |
| CD-04 | Unauthorized | Direct change to production | **Blocked**, principle 13 |
| CD-05 | Failure | Deployed from a local machine | **Blocked**; artefact unverified |
| CD-06 | Failure | Artefact rebuilt between staging and production | **Blocked**; staging verification void |
| CD-07 | Failure | Digest or commit not recorded | **Blocked**; section 3.1 |
| CD-08 | Failure | Migration applied with no rollback plan | **Blocked** |
| CD-09 | Failure | Migration applied with no verified backup | **Blocked**, `NFR-BACKUP-006` |
| CD-10 | Failure | Migration incompatible with the previous version | **Blocked**, section 7.2 |
| CD-11 | Failure | Application started before migration applied | **Blocked**; section 7.1 |
| CD-12 | Boundary | Migration applied during no published event window | Permitted |
| CD-13 | Failure | Deployment during a published event window | **Blocked**, `NFR-AVAIL-003` |
| CD-14 | Failure | Verification check 4 fails, student cannot register | Deployment failed; rollback per section 9 |
| CD-15 | Failure | Health check passes, registration fails | **Detected** by checks 4 to 8 |
| CD-16 | Failure | Audit entry absent after a test registration | **Detected** by check 8 |
| CD-17 | Failure | Verification failed, forward fix applied | Decision recorded with reason |
| CD-18 | Boundary | Rollback of the artefact, migration still applied | Permitted if compatible |
| CD-19 | Failure | Migration applied, data wrong, restore required | Restore per `PB-ENG-18`, **not** a rollback |
| CD-20 | Failure | No rollback plan recorded before deployment | **Blocked**, section 9.2 |
| CD-21 | Failure | Emergency deployment | Same controls, expedited, reason recorded |
| CD-22 | Unauthorized | Emergency deployment bypassing a working check | **Blocked**, principle 15 |
| CD-23 | Failure | A check broken during an incident, disabled to deploy | **Blocked**; recorded as a pipeline defect |
| CD-24 | Failure | No staging environment | Compensating controls in section 3.2 mandatory |
| CD-25 | Failure | Deployment while an incident is open | **Blocked** |
| CD-26 | Failure | Production database edited manually | **Blocked**, `NFR-MAINT-006` |
| CD-27 | Boundary | Production configuration changed through the process | Permitted |
| CD-28 | Failure | Production configuration changed outside the process | **Blocked**, principle 13 |

---

## Exit Criteria

- OQ-30, OQ-31, and OQ-55 answered
- A deployment pipeline exists and no manual production deployment is possible
- Rollback rehearsed successfully at least once
- Post-deployment verification automated and covering both primary functions
- `PB-ENG-09 CI` implemented, so the required statuses correspond to real checks
- Section 1 removed, once it ceases to be true that nothing is deployed
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[PB-ENG-15 Environment Management](PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) ·
[PB-ENG-16 Release Management](PB-ENG-16-RELEASE-MANAGEMENT.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[PB-ENG-18 Backup and Recovery](PB-ENG-18-BACKUP-RECOVERY.md) ·
[PB-ENG-03 Git and GitHub](PB-ENG-03-GIT-GITHUB.md) ·
[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)