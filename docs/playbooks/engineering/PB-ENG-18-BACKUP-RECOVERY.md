# PB-ENG-18 — Backup and Recovery

**Playbook:** PB-ENG-18
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No backup mechanism exists.** There is no scheduled backup, no retention
> policy, no off-site copy, no restoration procedure, and no recovery test. **ERNS currently has no
> recoverable copy of anything.**
>
> **PP-14 is the direct origin of this playbook.** The interview reported that backups were made by
> copying files, with no evidence they had ever been restored. `NFR-BACKUP-004` and `NFR-BACKUP-006`
> exist specifically to close that gap.

**This is the engineering counterpart of `PB-17 Backup and Recovery`, which is the operational
playbook. They are different documents with different owners. See
[README.md](../README.md) section "The one exception".**

---

## Purpose

Define how the data of the Event Registration and Notification System is backed up, how backups are
verified, and how the system is restored.

This playbook exists because ERNS's value is trustworthy records, and **an unverified backup is a belief
rather than a control.** A backup that has never been restored is a hypothesis about what would be
available if it were needed.

---

## Scope

**Applies to:** all ERNS data, in the production environment.

**Does not apply to:** the repository, whose history is separately recoverable; the operational
procedure, in `PB-17 Backup and Recovery`; non-production data, which needs no backup per
`PB-ENG-15` section 4.

---

## Ownership

**Responsible:** the Developer implementing the mechanism.
**Accountable:** **Split, per `OQ-29`.** The default assumption is that IT owns infrastructure backups
and the Administrator owns verification.
**Consulted:** the Council Secretary, who is accountable to the organisation.

**`OQ-29` is BLOCKING and unanswered.** The split below is a default assumption, not a decision.

---

## 1. Current State

> **Nothing is backed up. Nothing can be restored.**

| Item | State |
|---|---|
| Backup mechanism | **Does not exist** |
| Backup schedule | **Undefined** |
| Retention period | **Undefined.** `OQ-26`, `OQ-27`, `OQ-28` |
| Off-site copy | **Does not exist** |
| Backup encryption | **Does not exist** |
| Restoration procedure | **Undefined** |
| **Restoration test** | **Never performed. None is possible** |
| Recovery point objective | **Undefined.** `NFR-BACKUP-007` |
| Recovery time objective | **Undefined.** `NFR-BACKUP-007` |
| Ownership | **Undecided.** `OQ-29` |

### 1.1 What this means today

**The participation record of every ERNS event, if ERNS existed, would exist in exactly one place.** A
storage failure, a mistaken migration, or a ransomware event would destroy it, and there would be no
way to recover a single registration.

**`TH-14` in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) has no preventive control at all.** It is
the only threat in the catalogue where the answer is "there is nothing in place".

---

## 2. What Requires Backup

**REQUIRED**, per `NFR-BACKUP-001`.

| Data | Sensitivity | Loss consequence | In scope |
|---|---|---|---|
| `Registration` | **Moderate to high** | Participation history, unreliable | **Yes** |
| `Attendance` | **Moderate to high** | Proof of presence. **Cannot be reconstructed from anything** | **Yes** |
| `Approval` and `ApprovalStep` | Low | Institutional record | **Yes** |
| `Notification` and `NotificationRecipient` | Low | Communication record | **Yes** |
| `EventEvaluation` | Moderate | Officer and student feedback | **Yes** |
| `AuditLog` | **High** | Accountability. **Loss destroys the evidence trail** | **Yes, longest retention** |
| `User`, `Role`, `UserRole` | **High** | Credentials and authority | **Yes** |
| `StudentProfile` | Moderate | Personal data | **Yes** |
| `Event`, `Announcement`, `EventAttachment` | Low to moderate | — | **Yes** |
| Non-production data | None | — | **No**, per `PB-ENG-15` section 4 |
| Repository history | Recoverable separately | — | Handled per `PB-ENG-03`, not here |

### 2.1 Attendance is the irreplaceable data

**Attendance cannot be reconstructed.** A registration record can be recreated from a list; attendance
cannot, because it is a fact about a moment that has passed. If a participant list exists on paper and
the attendance record is lost, the paper is a fallback; if only the database held it, it is gone.

**This is why `NFR-BACKUP-001` names attendance first in practice**, even though the requirement lists
several categories together.

### 2.2 The audit trail outlasts what it describes

`NFR-AUD-006` requires audit entries to be retained longer than the records they describe.

**Consequence for backup:** audit backups have a longer retention than the data they audit. Restoring a
database without its audit history produces exactly the situation `TH-12` describes — records with no
accountability.

---

## 3. Frequency

**PROPOSED**, and **no figure is asserted without a basis**, per
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) section 1.

| Data category | Loss tolerance | Frequency | Basis |
|---|---|---|---|
| `Attendance`, during an event | **Minutes.** Being recorded live | More frequent during event windows | **Event-window operation** |
| `Registration` | Hours | Daily | Events occur weekly |
| `Approval`, `Notification` | A day | Daily | Operational records |
| `AuditLog` | Days | Daily, longer retention | `NFR-AUD-006` |
| `User`, `Role` | A day | Daily | Revocation urgency |

### 3.1 Event windows drive the schedule

**During a published event window, attendance is being written continuously and loss tolerance is
minutes.** A daily backup taken at 02:00 loses an entire afternoon of attendance if the storage fails at
17:00.

**PROPOSED.** During event windows, the backup interval shortens. Whether that is technically achievable
depends on `OQ-30`, which is unanswered.

### 3.2 This is a decision, not an implementation detail

**`NFR-BACKUP-002` requires the frequency to be agreed before implementation, and `OQ-29` is blocking.**
The table above is a starting position for that conversation, not the answer.

---

## 4. Retention

**PROPOSED**, and unresolved. `OQ-26`, `OQ-27`, and `OQ-28` are all open, and `OQ-28` asks whether an
existing school records-retention policy applies — **which would supersede every assumption here.**

| Category | Retention | Authority |
|---|---|---|
| `Attendance` | **Shortest defensible.** Absence is sensitive | `SECURITY-PLAN.md` section 1 |
| `Registration` | Academic year plus one | `OQ-26` default |
| `AuditLog` | **Longer than the records it describes** | `NFR-AUD-006` |
| `User`, `Role` | Account lifetime plus the retention period | `AUDIT-PLAN.md` section 6 |
| Backups | **Longer than the data**, so a restoration does not reintroduce expired records | — |

### 4.1 Attendance retention is the shortest, deliberately

**A system that records absences indiscriminately discloses information a student never chose to share.**
Absence from a medical or religious event is itself sensitive, and `SECURITY-PLAN.md` section 1 states
this directly.

**The shortest defensible period is the default until a policy exists.** This is deliberately
conservative, and it is the correct trade for data whose sensitivity is uncertain.

---

## 5. Backup Verification

**This is the substance of the playbook, and the gap the interview identified.**

`NFR-BACKUP-004` requires each backup to be verified **by restoring it**, not by confirming that a file
exists.

`NFR-BACKUP-006` requires that a backup is **not treated as verified until a restoration test has
succeeded**.

### 5.1 What does not count as verification

| Method | Why it is not verification |
|---|---|
| The backup job reported success | It reports that a file was written |
| The backup file exists | It says nothing about whether it can be read |
| The file size looks right | A truncated file has a plausible size |
| The job log shows no error | An error may be logged at a level nobody reads |
| The file opens | It may be readable and structurally wrong |
| The backup is on a second disk | Two disks in one machine fail together |

**Every one of these has passed in organisations that later discovered they had no backup.**

### 5.2 What does count

**PROPOSED.** Two distinct verifications, at different frequencies.

| Verification | What it proves | Frequency |
|---|---|---|
| Automated integrity check | The file is structurally complete | Every backup |
| **Full restoration test** | The data is **usable**, including that constraints hold and the application runs against it | **Periodically, and before any risky migration** |

**The second is the one that matters and the one that is skipped.** A restored database can be readable
and still be wrong: a constraint absent, an index missing, an encoding changed.

### 5.3 The restoration test checks usability, not just readability

| Check | What it proves |
|---|---|
| The schema version matches the expected version | The right state was captured |
| `Registration` count is plausible against `AuditLog` | Nothing was lost silently |
| The unique constraint on `(user_id, event_id)` **exists and is enforced** | `NFR-INTEG-001` survived |
| The attendance uniqueness constraint exists | `NFR-INTEG-002` survived |
| The audit table has insert-and-read grants only | `NFR-AUD-005` survived |
| The application starts against the restored copy | It is usable, not just readable |
| A registration can be written | The constraints permit correct writes |
| `AuditLog` is present for restored records | `NFR-AUD-006` is satisfied |

**Check 3 is the one that distinguishes a restoration from a copy.** A backup taken by an undocumented
process may restore cleanly and lack every constraint the system depends on.

### 5.4 Verification frequency

**PROPOSED.** Per backup, for the automated check. For the full restoration test:

| Frequency | Rationale |
|---|---|
| **Periodically** | Something changes between tests |
| **Before any production migration** | `NFR-BACKUP-004`, `PB-ENG-14` section 9.1 |
| **After any change to the backup process** | The process is what was tested |
| **After any storage or platform change** | `OQ-30`, `OQ-31` |
| **Annually, minimum** | The floor, not the target |

**No period is asserted for the full restoration test beyond the floor**, because the correct frequency
depends on how often the storage layout changes, which depends on `OQ-30`.

---

## 6. Restoration Procedure

**PROPOSED.** The order is deliberate.

| # | Step | Why this order |
|---|---|---|
| 1 | **Stop writes** | Restoring under live writes produces an inconsistent result |
| 2 | Identify which backup, and when it was taken | Know what you are getting before you start |
| 3 | Confirm the backup is verified | Per section 5. An unverified backup is not a backup |
| 4 | Restore to a **separate** location first | Never restore over the live copy as the first step |
| 5 | Verify the restored copy, per section 5.3 | Before it becomes the live copy |
| 6 | Swap to the restored copy | Only after verification |
| 7 | Verify the application against it | Section 5.3 |
| 8 | Resume writes | — |
| 9 | Reconstruct what was written after the backup point | See section 7 |
| 10 | Record the restoration | `PB-ENG-17`, and the changelog |

### 6.1 Restoring over the live copy is never the first step

**Restoring in place destroys the evidence of what was lost** and leaves no way to compare the restored
state against the damaged one.

**Restoring to a separate location first is what makes section 5.3 possible** — because the verification
steps need the restored copy to still be a copy.

### 6.2 Stop writes first

**Restoring under live writes produces a result nobody can reason about.** Some writes land in the
restored copy, some do not, and the inconsistency is discovered later rather than now.

---

## 7. What Cannot Be Recovered

**Recorded because honesty here is more useful than optimism.**

| Loss | Recoverable? |
|---|---|
| `Attendance` recorded after the last backup | **No.** Not reconstructable |
| A registration after the last backup | Only from a participant's own record, if they have it |
| An audit entry after the last backup | **No.** And this is the accountability gap |
| A notification read or acknowledged after the last backup | **No** |
| A role grant or revocation after the last backup | **No.** The person may retain access |
| A registration whose only copy was in memory | **No**, per `NFR-AVAIL-005` |

### 7.1 Recovery point objective is a stated loss, not an aspiration

`NFR-BACKUP-007` requires a defined and tested recovery point objective. **The RPO is the amount of data
that can be lost, and it should be stated as a number of hours or minutes, not as "minimal".**

**This is undefined.** It depends on the frequency in section 3, which depends on `OQ-29` and `OQ-30`.

### 7.2 Shortening the RPO means more frequent backups

**The relationship is direct and worth stating plainly:** a shorter RPO requires more frequent backups,
which requires a platform capable of them (`OQ-30`). **A demanding RPO cannot be promised on a platform
that does not exist.**

---

## 8. Encryption and Access

**PROPOSED.**

| Concern | Rule | Requirement |
|---|---|---|
| Backups contain all participant data | Same sensitivity as the live data | Section 2 |
| Backup storage encrypted at rest | **Required** | `NFR-SEC-014` extended |
| Backup access least-privilege | Only those who can restore | `NFR-SEC-015` |
| Access recorded | Who can restore is a meaningful list | `PB-ENG-03` section 7.2 |
| Backups not in the executable path | They are not an attack target | `NFR-SEC-009` |
| **No backup is a source of a secret** | If the live data needs a key, so does the backup | `PB-ENG-12` |

### 8.1 A backup inherits the sensitivity of what it holds

**A backup of ERNS contains every registration, every attendance record, and every audit entry.** It is
therefore as sensitive as the live database and as valuable to an attacker, because it contains
everything at once without the access controls of the live system.

**Off-site storage is therefore a deliberate decision, not a convenience**, and it requires the same
access controls as the primary.

---

## 9. Off-Site Copy

**PROPOSED.** A backup stored only on the same machine or in the same room is not a backup.

| Rule | Reason |
|---|---|
| At least one copy is stored separately | Fire, flood, theft, and ransomware all take the primary |
| The off-site copy is encrypted | Section 8 |
| Access is controlled | Section 8 |
| The off-site copy is itself verified | Otherwise the same gap recurs |

**`TH-14` explicitly includes mishandling.** The interview's file-copying backup was in the same place as
the data it protected.

**Whether an off-site copy is achievable depends on `OQ-30` and `OQ-31`.** It is a real cost, and it is
a requirement rather than an aspiration.

---

## 10. Verification Approach

| Property | How it is checked |
|---|---|
| A backup exists | The scheduled job completed |
| The backup is structurally complete | Automated integrity check |
| **The backup can be restored** | **Full restoration test**, section 5.2 |
| **The restored copy is usable** | Section 5.3 checks |
| Constraints survived | Section 5.3, checks 3 and 4 |
| Audit history is present | Section 5.3, check 8 |
| The off-site copy is verified | Section 9 |
| Access is controlled | Section 8 |

**Four of these eight cannot be established without performing a restoration**, which is why
`NFR-BACKUP-006` exists and why the interview's finding was that backups were made without it.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| All `NFR-BACKUP-001` data is backed up | Section 2 |
| **Each backup is verified by restoring it** | Section 5.2, `NFR-BACKUP-004` |
| **No backup is treated as verified without a successful restoration test** | Section 5, `NFR-BACKUP-006` |
| A full restoration test precedes any risky migration | Section 5.4 |
| Frequency defined with the organisation | Section 3, `NFR-BACKUP-002` |
| Retention defined, with `AuditLog` longest | Section 4, `NFR-BACKUP-003` |
| Audit retention exceeds data retention | Section 2.2, `NFR-AUD-006` |
| Writes are stopped before a restoration | Section 6 |
| Restoration is verified to a separate location first | Section 6.1 |
| Restored copy is verified for usability, not readability | Section 5.3 |
| At least one copy is stored off-site | Section 9 |
| Backup storage is encrypted and access-controlled | Section 8 |
| RPO and RTO defined and tested | Section 7, `NFR-BACKUP-007` |
| Responsibilities assigned | Ownership section, `OQ-29` |

## Required Evidence

- The backup schedule, with the agreed frequency
- The retention configuration, per category
- **Each restoration test record**, with the section 5.3 results
- The restoration procedure, documented
- The RPO and RTO, agreed and tested
- The list of who can restore, reviewed periodically
- The off-site location and its verification record

## What Blocks Progression

- **No backup mechanism exists**, so no production migration can proceed, per `PB-ENG-14` section 9.2
- A backup is treated as verified without a restoration test
- Only the automated integrity check is performed, with no full restoration
- Frequency or retention is asserted without agreement
- `AuditLog` retention is not longer than data retention
- No off-site copy
- Backup storage unencrypted or access-uncontrolled
- RPO and RTO undefined
- `OQ-29` unanswered, so no one owns the procedure

## Exception Process

**PROPOSED.** A backup may be skipped only during an incident affecting the backup infrastructure
itself, recorded with the reason and a replacement schedule.

**No exception exists for** treating an unverified backup as a backup, omitting a required verification,
or proceeding with a production migration without a verified backup. `NFR-BACKUP-006` and
`PB-ENG-14` section 9.2 make the latter blocking, because the alternative is risking irreversible loss of
the participation record.

---

## Completion Criteria

- OQ-26, OQ-27, and OQ-28 answered, so retention is defined
- OQ-29 answered, so responsibilities are assigned
- OQ-30 answered, so the mechanism is achievable
- Frequency agreed with the organisation
- A backup mechanism exists
- **A full restoration test has succeeded at least once**
- RPO and RTO defined and tested
- Off-site copy verified

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| BRP-01 | Happy path | Backup taken and restored | Usable copy, section 5.3 checks pass |
| BRP-02 | Failure | Backup file exists, never restored | **Not treated as verified**, `NFR-BACKUP-006` |
| BRP-03 | Failure | Job reported success, file truncated | **Detected** by the restoration test |
| BRP-04 | Failure | Job reported success, data corrupt | **Detected** by the restoration test |
| BRP-05 | Failure | Restored copy lacks the registration uniqueness constraint | **Detected**, section 5.3 check 3 |
| BRP-06 | Failure | Restored copy lacks the attendance uniqueness constraint | **Detected**, section 5.3 check 4 |
| BRP-07 | Failure | Restored copy has audit grants permitting update | **Detected**, section 5.3 check 4 |
| BRP-08 | Failure | Restored copy has no audit history | **Detected**, section 5.3 check 8 |
| BRP-09 | Failure | Application cannot start against the restored copy | **Detected**, section 5.3 check 7 |
| BRP-10 | Failure | Writes resumed during a restoration | **Blocked**, section 6.2 |
| BRP-11 | Failure | Restoration performed directly over the live copy | **Blocked**, section 6.1 |
| BRP-12 | Failure | Restored copy swapped in before verification | **Blocked**, section 6.1 |
| BRP-13 | Failure | Production migration with no verified backup | **Blocked**, `PB-ENG-14` section 9.2 |
| BRP-14 | Boundary | Restoration test before a risky migration | **Permitted**, section 5.4 |
| BRP-15 | Failure | Storage layout changed, no restoration test | Rejected, section 5.4 |
| BRP-16 | Failure | No off-site copy | Rejected, section 9 |
| BRP-17 | Invalid | Backup storage unencrypted | Rejected, section 8 |
| BRP-18 | Invalid | Who can restore not recorded | Rejected, section 8 |
| BRP-19 | Failure | Backup on the same machine only | Rejected, section 9 |
| BRP-20 | Boundary | Backup skipped during a backup-infrastructure incident | Permitted with a recorded reason |
| BRP-21 | Failure | `AuditLog` retention shorter than data retention | Rejected, `NFR-AUD-006` |
| BRP-22 | Failure | Frequency asserted without agreement | Rejected, section 3 |
| BRP-23 | Failure | RPO stated as "minimal" rather than a figure | Rejected, `NFR-BACKUP-007` |
| BRP-24 | Failure | Attendance lost with no recoverable copy | Recognised as unrecoverable, section 7 |
| BRP-25 | Boundary | Backup of non-production data not taken | **Permitted**, `PB-ENG-15` section 4 |

---

## Exit Criteria

- OQ-26, OQ-27, OQ-28, OQ-29, and OQ-30 answered
- A backup mechanism exists, with an agreed frequency and retention
- **A full restoration test has succeeded**, per section 5.3
- RPO and RTO agreed and tested
- An off-site copy exists and is verified
- The restoration procedure has been rehearsed end to end
- `PB-17 Backup and Recovery` and this playbook aligned
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-18 Backup and Recovery](PB-ENG-18-BACKUP-RECOVERY.md) ·
[PB-17 Backup and Recovery](../system/PB-17-BACKUP-RECOVERY.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[README.md](../README.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)