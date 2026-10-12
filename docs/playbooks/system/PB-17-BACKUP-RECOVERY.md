# Playbook 17 — Backup and Recovery

**Playbook:** PB-17
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Ensure ERNS's participation records survive loss, and that their restoration is a tested procedure
rather than an assumption.

The interview reported that the organisation keeps backups by copying files, to avoid losing
information. Copying files is not a backup strategy. It is the absence of one.

---

## Scope

**In scope:** what is backed up, how often, verification, restoration, and the roles responsible.

**Out of scope:** the engineering procedure, in `PB-ENG-18 Backup and Recovery`; retention policy,
which is unresolved; event archival, `PB-14 Event Archiving`.

---

> **NOT YET IMPLEMENTED.** No backup mechanism exists for ERNS. Everything in this document is
> target state. See [OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) OQ-29.

---

## Trigger

A scheduled backup runs, or a recovery is required after data loss or corruption.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| IT | Owns infrastructure backups. **PROPOSED**, pending OQ-29 |
| Administrator | Owns verification and restoration. Reads the results |
| Council Secretary | Informed of loss and of restoration |

---

## Preconditions for This Playbook Being Operational

- A hosting arrangement exists, per OQ-30
- A backup destination is defined
- A restoration procedure has been tested at least once
- Named roles understand their responsibility

**Until those are true, ERNS has no backup.** The absence must be recorded rather than glossed over.

---

## What Requires Backup

**NFR-BACKUP-001.** All data that cannot be reconstructed from another source.

| Data | Why it requires backup | Reconstructable |
|---|---|---|
| Registrations | The participation record | **No** |
| Attendance | Evidence of presence | **No** |
| Student profiles | Eligibility and targeting | Partially, from a roster re-import |
| Events and their change histories | The authoritative record | **No** |
| Approval chains and decisions | Accountability | **No** |
| Notifications and dispatch records | Proof of what participants were told | **No** |
| Notifications and recipient states | Proof of reach and acknowledgement | **No** |
| Event evaluations | PP-15, the whole point of the record | **No** |
| Audit trail | Accountability | **No** |
| User accounts and roles | Access control | Partially, but role history is not |
| Attachments | Proposals and materials | **No** |

**Attachments must be backed up.** A database backup without the file store restores records whose
proposals and materials are missing, which undermines the approval history that references them.

---

## Frequency

**PROPOSED**, pending **OQ-29**.

| Data category | Frequency | Rationale |
|---|---|---|
| Registrations, attendance, notifications, audit | Daily, and before any event | These change during events and are the irreplaceable records |
| Events, approvals, evaluations, attachments | Daily | Changes less often, but a lost evaluation is a lost lesson |
| Configuration | On every change | Small and needed to interpret the rest |
| Full copy | Weekly | Satisfies restoration testing against a known point |

**A backup taken before each event is deliberate.** During an event, ERNS is being written to
continuously by many users. Losing that morning's attendance is the worst outcome ERNS could suffer,
and a pre-event backup makes it recoverable.

> **OPEN QUESTION:** What backup frequency and retention can the hosting arrangement actually
> support? See OQ-29, OQ-30.

---

## Verification

**NFR-BACKUP-004.** Verify each backup by restoring it.
**NFR-BACKUP-006.** A backup is not treated as verified until a restoration test has succeeded.

### The distinction that matters

| Check | What it proves | What it does not |
|---|---|---|
| The backup file exists | A file was written | That it is restorable |
| The backup completed without error | The process ran | That the contents are usable |
| A restore succeeded and data is correct | **The backup works** | — |

**The interview's backup practice appears to have stopped at the first row.** A file that has never
been restored is an assumption. ERNS records attendance on the basis that it is recoverable, so
recovery must be demonstrated.

### Verification schedule

**PROPOSED.**

| Frequency | Test |
|---|---|
| Weekly | Automated integrity check of the backup contents |
| Monthly | Full restore to an isolated environment, with a data comparison |
| Quarterly | Documented human-led restoration drill, including this playbook |

---

## Restoration Procedure

**PROPOSED.**

1. Administrator confirms the loss and its scope
2. Administrator identifies the most recent backup that predates the loss
3. Administrator restores to an isolated environment first, not to production
4. Administrator verifies the restored data: record counts, integrity constraints intact, audit
   trail complete
5. Administrator compares restored counts against expectations
6. Administrator plans the production restoration, noting the window during which the system is
   unavailable
7. Administrator restores to production
8. Administrator verifies production
9. Administrator notifies the Council Secretary
10. Administrator records the incident per `PB-ENG-17 Incident Response`

**Step 3 is not optional.** Restoring directly to production from a backup that has never been
validated risks replacing recoverable data with unusable data.

### What cannot be restored from a backup

**Stated plainly, because pretending otherwise would be misleading.**

| Lost | Consequence | Mitigation |
|---|---|---|
| Registrations after the last backup | Students are missing from the participant list | Reconcile from notification dispatch records where possible, and from paper where the fallback was used |
| Attendance after the last backup | Participants are not recorded present | Staff recollection plus paper records |
| Notifications sent but not yet dispatched | Students were not informed | Officers inform affected students directly |
| Configuration changed since the backup | Events may not behave as configured | Re-apply configuration changes from the audit trail |

**The audit trail makes partial reconstruction possible.** It records what was created, by whom, and
when, so a reconciliation has a reference even where the record itself is lost.

---

## Roles and Responsibilities

**PROPOSED**, pending **OQ-29**.

| Role | Responsibility |
|---|---|
| IT | Runs scheduled backups. Maintains the backup destination. Reports failures |
| Administrator | Verifies backups. Performs restorations. Maintains this playbook |
| Council Secretary | Informed of loss and of restoration. **PROPOSED**: approves any data deletion |
| Developers | **No operational responsibility.** Backup is not a developer task |

**A backup with no named verifier is not a backup.** The responsibility to verify must belong to
someone, or it will not happen.

> **OPEN QUESTION:** Who is responsible for backups and restoration? See OQ-29. **BLOCKING.**

---

## Alternative Paths

### A backup fails

IT investigates and re-runs. The Administrator is informed, because a missing backup widens the
recovery window. A repeated failure is escalated, since a backup process that fails quietly is worse
than none.

### A restoration produces incorrect data

The restore is abandoned in favour of an earlier backup. The production system is left in its current
state rather than being replaced with data known to be wrong.

### Data loss is discovered during an event

1. Attendance continues on the paper contingency, per `PB-11`
2. Recovery proceeds independently
3. Attendance is reconciled into the restored system afterwards

**Attendance is never blocked pending recovery.** The event proceeds and the records are reconciled,
which is slower but loses nothing.

### The backup destination is compromised

Backups from the compromised period are treated as untrusted. An Administrator data fix, or a
restore from a pre-compromise backup, may be required. Follow `PB-ENG-17 Incident Response`.

### A retention policy requires deleting old data

Handled as a controlled change with a migration and a retained audit trail, per `PB-14`. **Not** an
operational deletion action.

### An event's data is needed immediately after loss

Restore proceeds even if the monthly verification has not run, because the alternative is losing an
event's record. The urgency is recorded.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Backup completed | NFR-BACKUP-002 | Backup failed. Recovery window is now {n} days |
| Backup restored before production | Proposed | Verify the restore before proceeding |
| Counts verified after restoration | Proposed | Record counts do not match |
| Audit trail intact after restoration | NFR-AUD-006 | Audit trail incomplete after restore |
| Named verifier exists | Proposed | No backup verifier is assigned |
| Restoration procedure documented | NFR-BACKUP-005 | — |

---

## Data Affected

| Action | Effect |
|---|---|
| Backup | Reads all protected data. Writes to the backup destination only |
| Restoration | **Replaces** production data. Requires verification first |
| Verification test | Writes to an isolated environment only |

**A backup never writes to production. A restoration never runs without a prior isolated
verification.**

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| Backup failed | Administrator, IT | `HIGH` | No |
| Backup not verified within the expected interval | Administrator | `HIGH` | No |
| Data loss detected | Administrator, Council Secretary | `IMPORTANT` | **Yes** |
| Restoration completed | Council Secretary, officers | `IMPORTANT` | **Yes** |
| Restoration abandoned | Administrator, Council Secretary | `IMPORTANT` | **Yes** |
| Records lost after the last backup | Council Secretary, officers | `IMPORTANT` | **Yes** |
| Verification drill completed | Administrator | `NORMAL` | No |

---

## Audit Requirements

| Action | Audit class |
|---|---|
| Restoration performed | Recorded as an incident per `PB-ENG-17`, not as an application action |
| Verification completed | Recorded as an incident record |
| Data corrected during reconciliation | `AUD-12`, `AUD-14`, `AUD-15` per entry |

**Backup runs are not audit entries.** They are operational events. The audit trail records
application state changes, not infrastructure activity.

**Reconciliation after a loss IS audit-recorded, per entry.** An Administrator entering 200 names
during recovery is the highest-volume manual action in ERNS and must be individually attributable.

---

## Failure Handling

**Failure:** backups have never been restored.
**Handling:** this is the current state. It is recorded as an unmitigated risk rather than described
as protected. A restoration drill is scheduled before go-live per [ROADMAP.md](../../planning/ROADMAP.md)
Phase 8.

**Failure:** the backup destination is unavailable.
**Handling:** backups fail visibly and are reported. **Silent backup failure is worse than no
backup**, because it produces false confidence.

**Failure:** a restore succeeds but counts do not match.
**Handling:** the restore is abandoned for an earlier point. Production is left untouched until a
verified restore is available.

**Failure:** the last backup predates a significant event.
**Handling:** the loss is stated plainly to the Council. Notification dispatch records and the audit
trail support partial reconciliation. Paper records from the attendance fallback support attendance
reconciliation.

**Failure:** both production and the backup destination are affected.
**Handling:** a severe incident per `PB-ENG-17`. This is the scenario the offline and local
considerations in `PB-ENG-15 Environment Management` must address.

**Failure:** a restoration is needed but no named person is available.
**Handling:** escalation to IT and the Council Secretary. The absence of a verified, named
restoration path is a go-live blocker.

---

## Completion Criteria

- A backup destination exists
- A named role verifies backups
- A restoration has been performed successfully at least once
- The recovery point and recovery time objectives are defined and tested
- Both roles, IT and Administrator, understand their responsibilities

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBBK-01 | Happy path | Scheduled backup completes | Reported, next interval scheduled |
| PBBK-02 | Happy path | Weekly integrity check | Contents verified |
| PBBK-03 | Happy path | Monthly full restore to isolation | Data compared, counts verified |
| PBBK-04 | Happy path | Restoration to production after verification | Verified, Council notified |
| PBBK-05 | Invalid | Restore attempted directly to production | Refused, isolation required first |
| PBBK-06 | Failure | Backup fails | Reported to Administrator and IT |
| PBBK-07 | Failure | Backup silently stops | Detected by the missing-report check |
| PBBK-08 | Failure | Restore produces incorrect counts | Abandoned for an earlier point |
| PBBK-09 | Failure | Data loss during an event | Paper contingency, reconciliation afterwards |
| PBBK-10 | Failure | Backup predates a significant event | Loss stated plainly, partial reconciliation |
| PBBK-11 | Failure | No named verifier exists | Flagged as a go-live blocker |
| PBBK-12 | Failure | Backup destination compromised | Treated as untrusted, incident response |
| PBBK-13 | Failure | Production and destination both affected | Severe incident per `PB-ENG-17` |
| PBBK-14 | Boundary | Event data needed urgently | Restore proceeds, urgency recorded |
| PBBK-15 | Boundary | Zero events since the last backup | Restored data matches expectations |
| PBBK-16 | Failure | Audit trail incomplete after restore | Restore rejected |
| PBBK-17 | Failure | Reconciliation enters many records | Each entry audited and attributed |
| PBBK-18 | Failure | Restoration needed with no available person | Escalated; named path required before go-live |
| PBBK-19 | Failure | Retention policy requires deletion | Controlled change, not an operational action |
| PBBK-20 | Failure | Quarterly drill performed | Procedure confirmed or corrected |

---

## Exit Criteria

- Backups exist, run, and are verified by restoration
- Recovery objectives are defined and tested
- OQ-29 is answered, with named roles for both running and verifying
- `PB-ENG-18 Backup and Recovery` is implemented rather than specified

---

**Related documents:** [PB-17 Backup and Recovery](PB-17-BACKUP-RECOVERY.md) ·
[PB-16 Audit and Monitoring](PB-16-AUDIT-MONITORING.md) ·
[PB-11 Attendance Backup](PB-11-ATTENDANCE-BACKUP.md) ·
[PB-14 Event Archiving](PB-14-EVENT-ARCHIVING.md) ·
[PB-ENG-18 Backup and Recovery](../engineering/PB-ENG-18-BACKUP-RECOVERY.md) ·
[PB-ENG-17 Incident Response](../engineering/PB-ENG-17-INCIDENT-RESPONSE.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)