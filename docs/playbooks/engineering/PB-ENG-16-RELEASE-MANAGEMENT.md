# PB-ENG-16 — Release Management

**Playbook:** PB-ENG-16
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No release has been made. No version has been tagged, no changelog exists,
> and there is nothing to release. Release readiness cannot currently be assessed because no system
> exists to assess. See the status section.

---

## Purpose

Define how a version of the Event Registration and Notification System is declared ready, approved,
tagged, and — if it goes wrong — withdrawn.

This playbook exists because a release is the moment the Council becomes accountable for what the
system does, and because a release with no defined readiness criteria is a release decided by whoever
is nearest the deadline.

---

## Scope

**Applies to:** declaring a release ready, approving it, versioning it, tagging it, and rolling it back.

**Does not apply to:** how changes reach `main`, in `PB-ENG-04 Branching`; what the pipeline runs, in
`PB-ENG-09 CI`; how a deployment is performed, in `PB-ENG-10 CD/Deployment`; incident handling, in
`PB-ENG-17 Incident Response`.

---

## Ownership

**Responsible:** the Developer preparing the release.
**Accountable:** the Council Secretary, as release approver.
**Consulted:** IT for infrastructure impact; the technical owner for the affected modules.

---

## 1. Release Model

**PROPOSED.** The decision is **not to number releases as software versions.**

| Option | Reasoning |
|---|---|
| Semantic version, `1.4.2` | Implies a feature cadence and backward-compatibility guarantees this system has no use for |
| Date-based, `2026-10-15` | **Selected.** Each deployment is a distinct, independently rollback-able state with a known date |
| No version at all | Rejected. Without an identifier, a deployed artefact cannot be named in an incident |

**Why date-based.** ERNS is deployed as a complete state and rolled back as a complete state. There is
no partial adoption, no library consumer whose compatibility matters, and no feature flag set that
makes a version number meaningful. What matters operationally is *which deployment is running*, and a
date answers that unambiguously.

**The version format is `v<YYYY-MM-DD>`, for example `v2026-10-15`, plus a sequence suffix where more
than one release occurs in a day.**

**PROPOSED, and this is a change from the convention implied by `PB-ENG-05`.** The commit convention's
scope list does not constrain version format, so there is no conflict — but this decision should be
confirmed by the team rather than assumed, since a team member may reasonably expect semantic versions.

### 1.1 Release frequency

**PROPOSED.** On demand, rather than on a schedule.

| Consideration | Position |
|---|---|
| A student organisation's needs arrive when they arrive | On demand |
| A fixed schedule would batch changes unnecessarily | On demand |
| Event deadlines create real urgency | On demand, expedited when required |

**This is a deliberate departure from the convention that releases are periodic.** A fixed cadence
forces either releasing unfinished work or batching changes that were ready.

---

## 2. Release Readiness

**REQUIRED.** Every gate below must pass before a release is proposed. **No gate is waivable.**

| # | Gate | Authority | Waivable |
|---|---|---|---|
| 1 | Every REQUIRED CI check passing on the release commit | `PB-ENG-09` | **No** |
| 2 | The artefact was built by the pipeline | `PB-ENG-10` section 3.1 | **No** |
| 3 | All merge-gate tests passing | `PB-ENG-08` section 4 | **No** |
| 4 | End-to-end tests passing | `PB-ENG-08` section 2.4 | **No** |
| 5 | Security tests passing, `SEC-01` to `SEC-13` | `PB-ENG-08` section 2.5 | **No** |
| 6 | Accessibility scan clean at AA | `NFR-A11Y-001`, `A11Y-07` | **No** |
| 7 | Concurrency tests `CON-01` to `CON-07` passing | `NFR-INTEG-007` | **No** |
| 8 | Meta-tests `TST-01` to `TST-10` passing | `PB-ENG-08` section 8 | **No** |
| 9 | No critical dependency vulnerability | `PB-ENG-13` section 6 | **No** |
| 10 | Secret scan of the artefact clean | `PB-ENG-12` | **No** |
| 11 | Documentation synchronised | `PB-ENG-19`, principle 11 | **No** |
| 12 | Migrations reversible and rehearsed | `PB-ENG-14`, `PB-ENG-10` section 7.2 | **No** |
| 13 | Rollback plan recorded | `PB-ENG-10` section 9.2 | **No** |
| 14 | Verified backup before a data change | `NFR-BACKUP-006` | **No** |
| 15 | No published event window in progress | `NFR-AVAIL-003` | **No** |
| 16 | Release notes written | Section 3 | **No** |
| 17 | Council Secretary approval | Section 5 | **No** |
| 18 | BLOCKING open questions for this release resolved | `OPEN-QUESTIONS.md` | **No** |

### 2.1 Three gates that are gates because the failure is unrecoverable

| Gate | Why unrecoverable |
|---|---|
| **10 Secret scan** | A secret in an artefact is in every cache and mirror, and must be rotated |
| **12 Migrations reversible** | An irreversible migration removes the rollback option entirely |
| **14 Verified backup** | A backup never restored is not a backup. Data loss during an incident is permanent |

### 2.2 Two gates that are gates because students are affected

| Gate | Requirement |
|---|---|
| **6 Accessibility** | `NFR-A11Y-001`. A student who cannot register cannot attend |
| **15 No event window** | `NFR-AVAIL-003`. An outage during an attendance window is the highest-impact failure available |

### 2.3 A release with an unmet gate

**It is not released.** If a gate genuinely cannot be met — a check is broken, a scan is unavailable —
that is recorded as a pipeline or tooling defect with an owner and a resolution date, per
`PB-ENG-09` section 8. **The gate is not removed**, because the next release needs it and nobody will
remember.

---

## 3. Release Notes

**REQUIRED**, per governance principle 10.

### 3.1 Content

| Section | Contains |
|---|---|
| Version | The tag, `v<YYYY-MM-DD>` |
| Date and time | When it was deployed |
| Commit and artefact digest | Exactly what was deployed |
| Changes | What changed, by requirement |
| Migrations | Applied, and their reversibility |
| Known limitations | What this release does not do |
| Verification result | Checks 1 to 10 from `PB-ENG-10` section 8 |
| Rollback | The plan, and the time to decide |

### 3.2 Format

**PROPOSED.** A changelog file in the repository, one entry per release, newest first.

**What a release note is for.** When an incident occurs, the first question is "what changed recently?"
A dated changelog answers it. Git history answers it only for someone who knows to ask and has the
repository.

### 3.3 Requirement references

**REQUIRED.** Each change references its requirement ID.

**The Council will ask which requirements are implemented, and this is half the answer.** The other
half is the traceability matrix. Without both, the question cannot be answered.

---

## 4. Versioning

**PROPOSED.** Per section 1, `v<YYYY-MM-DD>`.

| Rule | Reason |
|---|---|
| Date-based identifier | Unambiguously names a deployment |
| Sequence suffix for same-day releases | Prevents a collision |
| Never reused | A tag identifies one artefact |
| Never moved | A moved tag makes a release unverifiable |
| Annotated, per `PB-ENG-03` section 6 | Carries author, date, and message |

### 4.1 The tag identifies the artefact

**A tag names a specific deployment. Moving it destroys that property**, which is why `PB-ENG-03`
section 3.3 protects tags.

If a tag must be corrected, the tag is deleted and recreated, and the correction is recorded in the
changelog. The incident record should show that a mistake occurred, not conceal it.

---

## 5. Approval

**REQUIRED.** Governance principle 4, applied to the deployment rather than the code.

| Approver | Approves | Why |
|---|---|---|
| Council Secretary | Production deployment | The Council, not the development team, is accountable to students |
| Technical owner | Changes to modules they own | Module-specific risk |
| IT | Anything touching infrastructure | They operate it |

### 5.1 Approval means

| Question | Answer |
|---|---|
| Have all gates passed? | Verified, section 2 |
| Is this the right set of changes? | The release notes, section 3 |
| Is the risk understood? | The migrations and the rollback plan |
| Is this the right time? | No event window in progress, gate 15 |
| Is someone accountable? | The named approver |

**Approval is not a formality and not a rubber stamp.** A Council Secretary who approves a release
without reading the release notes has provided no control, and per governance principle 12 the
undocumented assumption is the defect.

### 5.2 Who may not approve

| Situation | Reason |
|---|---|
| The author of every change in the release | No independent judgement |
| Anyone while an incident is open | `PB-ENG-17` governs |
| Anyone as a bulk approval of many releases | Each release is a distinct state |

---

## 6. Release Tagging

**REQUIRED**, per `PB-ENG-03` section 6.

| Step | Requirement |
|---|---|
| 1 | The release is approved |
| 2 | The deployment completes |
| 3 | Post-deployment verification passes, `PB-ENG-10` section 8 |
| 4 | The tag is created on the deployed commit |
| 5 | The tag is annotated with the version, date, commit, digest |
| 6 | The changelog is updated |
| 7 | The tag is protected |

### 6.1 The tag follows verification, not the deployment

**A tag is a statement that a verified deployment exists.** Creating it before verification records a
deployment that may not have worked.

**Where verification fails, the deployment is rolled back or forward-fixed, and the tag is either not
created or moved — which is prohibited.** The changelog records what happened.

---

## 7. Rollback and Withdrawal

**REQUIRED**, per `PB-ENG-10` section 9.

| Property | Rule |
|---|---|
| Trigger | Verification failure, or a production defect per `PB-ENG-17` |
| Time to decide | **Defined before the first release**, per gate 13 |
| Decision owner | Council Secretary, or the technical owner for a defect without data impact |
| Method | Redeploy the previous artefact |
| Data | Restore only if a migration was applied and the data is wrong |
| Evidence | Artefact digest, time, reason, verification result |

### 7.1 Rollback is not restoration

**Repeating this because it is the most consequential confusion possible during an incident.**

| Operation | Discards | Data written since |
|---|---|---|
| Rollback | The application version | **Nothing** |
| Restoration | The application version | **Everything since the backup** |

Restoring a database to recover from a bad application deploy discards every registration made since
the backup. During an active event period, that could be the day's participants.

**Decide which is needed before the incident, not during it.**

### 7.2 Withdrawal

| Situation | Action |
|---|---|
| Verification failed, nothing reached users | Roll back; no tag created |
| A defect found shortly after release | Roll back; the tag is deleted and recreated only with a recorded reason |
| A defect found that cannot be rolled back | `PB-ENG-17`; the changelog records it permanently |

**A withdrawn release is not erased from the changelog.** The record of what was deployed and when is
part of what makes the system auditable, `NFR-AUD-006`.

---

## 8. Release Cadence and Maintenance Windows

**PROPOSED.** Per `NFR-AVAIL-002` and `NFR-AVAIL-003`:

| Rule | Requirement |
|---|---|
| Maintenance windows published in advance | `NFR-AVAIL-002` |
| No maintenance during a published event window | `NFR-AVAIL-003` |
| No maintenance during an attendance window | **Absolute.** `PB-10` has a staff-assisted fallback; a maintenance outage does not |
| Windows announced to officers in advance | Operational communication |

**The attendance window rule is absolute because it is the one failure ERNS cannot absorb.** An
attendance-window outage means students queue at a door with staff who cannot record their presence,
during an event. `PB-11 Attendance Backup` exists for the QR case; it does not exist for a maintenance
window.

---

## 9. Current Release Status

> **NOT YET IMPLEMENTED.** No release has occurred.

| Item | State |
|---|---|
| Releases made | **0** |
| Versions tagged | **0** |
| Changelog | **Does not exist** |
| Release readiness assessable | **No.** No system exists |
| Rollback rehearsed | **No.** Nothing to roll back |
| Council Secretary approval process | **Defined here, not enacted** |
| Time to decide on rollback | **Undefined.** Gate 13 cannot be met |

### 9.1 Gate 13 cannot currently be met

**The time to decide on a rollback is undefined**, because there is no hosting platform, no deployment
mechanism, and therefore no basis for the figure.

**OQ-30 blocks this.** Until the platform is known, no rollback duration can be estimated, and a figure
asserted without it would be invented — the same discipline
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) section 1 applies to
performance numbers.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| All eighteen gates pass before a release is proposed | Section 2 |
| The artefact was built by the pipeline | Gate 2 |
| Migrations reversible and rehearsed | Gate 12 |
| Rollback plan recorded | Gate 13 |
| Verified backup before a data change | Gate 14 |
| Release notes written with requirement references | Section 3 |
| Council Secretary approval obtained | Section 5 |
| Tag annotated, immutable, following verification | Section 6 |
| No maintenance window during an attendance window | Section 8 |
| Time to decide on rollback defined before the first release | Section 9.1 |

## Required Evidence

- CI status showing all gates passing
- The changelog entry
- The release approval, with approver, date, and time
- The tag, annotated, with commit and digest
- Post-deployment verification result
- The rollback plan and the time to decide
- The migration set and its reversibility

## What Blocks Progression

- Any gate in section 2 is unmet
- A secret is present in the artefact
- A migration is irreversible
- No verified backup before a data change
- Documentation is not synchronised
- No Council Secretary approval
- Release notes absent
- A tag created before verification
- A published event window is in progress
- A BLOCKING open question is unresolved for the release
- `OQ-30` unanswered, so no rollback duration can be defined

## Exception Process

**PROPOSED.** An expedited release for a time-critical need follows the same eighteen gates with a
compressed timeline and a recorded reason.

**No exception exists for** skipping a gate, releasing without approval, releasing with an irreversible
migration, releasing during an event window, or creating a tag before verification. Governance
principles 4, 13, 14, and 15 are absolute, and three of these gates protect against unrecoverable
outcomes.

---

## Completion Criteria

- All eighteen gates defined and enacted
- Council Secretary approval process established
- Time to decide on rollback defined, which requires OQ-30 answered
- Changelog created on the first release
- Rollback rehearsed at least once
- The version format confirmed by the team

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| REL-01 | Happy path | All gates pass, approved, deployed, verified | Tagged, changelog updated, evidence recorded |
| REL-02 | Failure | Any gate unmet | **Not released** |
| REL-03 | Failure | Secret in the artefact | **Blocked**, gate 10 |
| REL-04 | Failure | Irreversible migration | **Blocked**, gate 12 |
| REL-05 | Failure | No verified backup before a data change | **Blocked**, gate 14 |
| REL-06 | Failure | Accessibility scan reporting AA violations | **Blocked**, gate 6 |
| REL-07 | Failure | Concurrency test `CON-01` failing | **Blocked**, gate 7 |
| REL-08 | Failure | Meta-test `TST-01` not failing | **Blocked**, gate 8 |
| REL-09 | Unauthorized | Released without Council Secretary approval | **Blocked**, principle 4 |
| REL-10 | Unauthorized | Author approves their own release | **Blocked**, section 5.2 |
| REL-11 | Failure | Documentation not synchronised | **Blocked**, gate 11 |
| REL-12 | Failure | Tag created before post-deployment verification | **Blocked**, section 6.1 |
| REL-13 | Failure | Tag moved to correct an error | **Blocked**; delete and recreate with a reason |
| REL-14 | Failure | Lightweight tag used | Rejected; annotated only |
| REL-15 | Failure | Release during a published event window | **Blocked**, gate 15 |
| REL-16 | Failure | Maintenance during an attendance window | **Blocked**, section 8 |
| REL-17 | Failure | Rollback and restoration confused, data discarded | **Blocked**; section 7.1 |
| REL-18 | Boundary | Rollback of the artefact only, migration compatible | Permitted |
| REL-19 | Failure | Withdrawn release erased from the changelog | Rejected; section 7.2 |
| REL-20 | Invalid | Release approved as a bulk of many | Rejected; section 5.2 |
| REL-21 | Failure | Release proposed while an incident is open | **Blocked** |
| REL-22 | Boundary | Expedited release, all gates met | Permitted with a recorded reason |
| REL-23 | Failure | Expedited release skipping a gate | **Blocked** |
| REL-24 | Failure | No rollback duration defined at the first release | **Blocked**, gate 13 |
| REL-25 | Invalid | Changelog entry without requirement references | Rejected; section 3.3 |
| REL-26 | Failure | Verification failed, release tagged anyway | **Blocked** |
| REL-27 | Boundary | Two releases on one date | Sequence suffix applied |
| REL-28 | Failure | Release note claiming a control that does not exist | Rejected; `CONVENTIONS.md` section 6 |

---

## Exit Criteria

- OQ-30 answered, so the rollback duration can be defined
- All eighteen gates enacted
- Council Secretary approval established
- The first release completed with evidence recorded
- Rollback rehearsed successfully
- The version format confirmed by the team
- Section 9 removed, once it ceases to be true that no release has occurred
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-16 Release Management](PB-ENG-16-RELEASE-MANAGEMENT.md) ·
[PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[PB-ENG-03 Git and GitHub](PB-ENG-03-GIT-GITHUB.md) ·
[TRACEABILITY-MATRIX.md](../../planning/TRACEABILITY-MATRIX.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)