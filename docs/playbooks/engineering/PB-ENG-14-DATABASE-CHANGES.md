# PB-ENG-14 — Database Changes

**Playbook:** PB-ENG-14
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No schema exists.** No migration tool has been selected, no migration has
> been written, and no database has been created. The data store engine is unselected, **OQ-44**.
>
> **Per the master instruction, this task produces no SQL and no migration artefact.** This playbook
> specifies the *procedure*. The physical schema is designed when the engine is chosen and
> `DATA-MODEL.md` is implemented.

---

## Purpose

Define how schema changes are made to the Event Registration and Notification System, so that no change
to the participation record is unrecoverable.

This playbook exists because governance principle 9 requires database changes to be deliberate and
recoverable, and because the guarantees ERNS depends on — duplicate prevention, attendance binding,
audit immutability — **are implemented as constraints**. A constraint dropped carelessly is not a
refactoring; it is the removal of a correctness guarantee.

---

## Scope

**Applies to:** every schema change, every migration, and every seed-data change.

**Does not apply to:** the conceptual data model, in [DATA-MODEL.md](../../planning/DATA-MODEL.md); the
physical schema design, which happens at implementation; seed data semantics, in
`PB-01 Event Creation` and `PB-02 Event Approval`.

---

## Ownership

**Responsible:** the Developer making the change.
**Accountable:** the technical owner for the affected module.
**Consulted:** IT, for any production migration.

---

## 1. Current State

| Item | State | Blocking |
|---|---|---|
| Data store engine | **Not selected** | **OQ-44** |
| Migration tool | **Not selected** | OQ-44 |
| Schema | **Does not exist** | OQ-44 |
| Migration history | **Does not exist** | — |
| Seed data | **Does not exist** | — |
| Production migration procedure | **Undefined** | OQ-30, OQ-55 |
| Rollback procedure | **Undefined** | `PB-ENG-10` section 9 |

**`DATA-MODEL.md` is conceptual and storage-neutral**, so it does not constrain the engine. The engine
is constrained by C-01 to C-05 and C-11 in [TECH-STACK.md](../../architecture/TECH-STACK.md) — composite
uniqueness, transactional check-then-write, append-only audit access, constrained enumerations, and a
testable export path.

---

## 2. The Conceptual Model Is Not the Schema

**Recorded explicitly, because the distinction is easy to lose.**

| [DATA-MODEL.md](../../planning/DATA-MODEL.md) holds | This playbook holds |
|---|---|
| Fifteen locked entities and their meaning | The physical representation |
| Cardinality and relationships | Table, column, index definitions |
| Integrity intent | Constraints, unique indexes, foreign keys |
| Ownership | Migration procedure |
| **No SQL. Not a schema** | **Migrations** |

**Nothing in this playbook merges, splits, or renames an entity.** Per
[CONVENTIONS.md](../../planning/CONVENTIONS.md) section 5, entity names match `DATA-MODEL.md` exactly. A
storage convenience is not a reason to restructure the model; that is `PB-ENG-20 Change Management`.

---

## 3. Schema Change Procedure

**REQUIRED.** Every schema change follows these steps.

| # | Step | Requirement |
|---|---|---|
| 1 | The change is traced to a requirement or a defect | `PB-ENG-01` section 1 |
| 2 | The conceptual model is checked for impact | Section 2 |
| 3 | The migration is written, forward **and** backward | Section 8 |
| 4 | Backward compatibility is assessed | Section 4 |
| 5 | It is tested against a real storage layer | `PB-ENG-08` section 2.1 |
| 6 | Concurrency impact is assessed | Section 5 |
| 7 | It runs in E-2, and in E-3 if it exists | `PB-ENG-10` section 3 |
| 8 | A verified backup precedes a production application | Section 9 |
| 9 | It is documented in the same change | Section 6 |

### 3.1 The migration is one change with two directions

**A forward-only migration removes the rollback option**, which per `PB-ENG-10` section 9.2 means a
deployment with no rollback plan, which per gate 13 blocks the release.

**REQUIRED.** Every migration has a corresponding reversal. Where a reversal is genuinely impossible, it
is recorded as such and the release requires the alternative treatment in section 9.3.

### 3.2 Forward and backward in the same change

**PROPOSED.** Both directions are written together, because a reversal written afterwards is written
against a schema that has moved on and is often wrong.

### 3.3 Migrations are ordered and irreversible once applied

**REQUIRED.** The migration history is a strictly ordered sequence, and a migration already applied is
never edited.

| Action | Position |
|---|---|
| Edit an applied migration | **Prohibited** |
| Insert a migration before an applied one | **Prohibited** |
| Reorder applied migrations | **Prohibited** |
| Add a corrective migration | **Required approach** |
| Reverse an applied migration | Only via the migration's own reversal, deliberately |

**Editing an applied migration means two environments diverge silently** and the divergence is discovered
during an incident.

---

## 4. Backward Compatibility

**REQUIRED.** Per `PB-ENG-10` section 7.2, a migration must be compatible with both the previous and the
next application version for as long as a rollback is possible.

### 4.1 The compatibility table

| Migration type | Compatible with the old version? | Reversible? |
|---|---|---|
| Add a table | Yes | Yes |
| Add a nullable column | Yes | Yes |
| Add a column with a default | Yes | Yes |
| Add a non-null column **with no default to existing rows** | **No** | Partially |
| Remove a column the old version still writes | **No** | Yes, if data is not needed |
| Rename a column the old version reads | **No** | Yes |
| Change a type the old version depends on | **No** | Sometimes |
| Add a constraint the existing data violates | **No** | Yes |
| Drop a constraint | Yes | Yes, by re-adding |
| Add an index | Yes | Yes |

### 4.2 Removing a constraint is the most consequential migration available

**The constraints in this system are the correctness guarantees.** Dropping one is not a schema change;
it is removing a property the requirements demand.

| Constraint | Requirement | Scenario that detects its removal |
|---|---|---|
| Unique on `(user_id, event_id)` | `NFR-INTEG-001` | `RV-02`, `TST-02` |
| Unique on attendance registration reference | `NFR-INTEG-002` | `RV-21`, `CON-03` |
| Foreign keys preventing orphans | `NFR-INTEG-003` | `RV-20`, `RV-23` |
| Approval step ordering | `NFR-INTEG-006` | `NFRD-09` |
| Registration status domain | `FR-REG-019` | `RV-06` |
| Notification recipient uniqueness | `FR-NOT-014` | `RV-18` |
| Append-only audit access | `NFR-AUD-005` | `RV-34` |

**Removing any of these requires `PB-ENG-20 Change Management`, and each has a scenario that would fail.**

### 4.3 Adding a constraint to existing data

**Where existing data violates the new constraint, the migration must reconcile it before the constraint
is added.**

| Sequence | Why |
|---|---|
| 1. Migrate the data | Bring it into compliance |
| 2. Verify | Confirm no rows violate |
| 3. Add the constraint | Now it can be applied |

**Adding a constraint before the data is compliant fails at an unpredictable moment** — which on a
student body size is during a deployment.

### 4.4 Four-phase expansion

**PROPOSED**, for a change to a table with production data:

| Phase | Action | Compatible? |
|---|---|---|
| 1 | Add the new structure alongside the old | Yes |
| 2 | Write to both | Yes |
| 3 | Read from the new | Yes, if the new is complete |
| 4 | Stop writing the old, then remove it | Breaks the old version |

**Each phase is a separate release**, so a rollback between phases is always possible.

---

## 5. Concurrency Impact

**REQUIRED** to be assessed for every migration, because ERNS's guarantees are enforced by constraints
and transaction boundaries.

| Concern | Requirement |
|---|---|
| Does the migration lock a table? | If yes, against what data volume? |
| Does it take an exclusive lock that blocks registration? | `NFR-INTEG-007` |
| Does it block attendance validation? | **An attendance-window lock is prohibited**, `NFR-AVAIL-003` |
| Does it rebuild a table? | That takes an exclusive lock for the duration |
| Is it safe during an organisation-wide dispatch? | `NFR-PERF-004` |
| Is it safe during published event windows? | **Prohibited**, `NFR-AVAIL-002` |

### 5.1 Locking is the operational risk, not correctness

**A migration that is correct but takes an exclusive lock on a large table can stop students registering
for the whole duration.** That is `NFR-AVAIL-001` violated in practice: the system is technically
available and functionally unusable.

**The assessment is against the real data volume**, not a test fixture. The student body size per
`OQ-31` or `OQ-30` determines whether a table rebuild is acceptable at all.

### 5.2 Adding an index on a large table

**REQUIRED** to be assessed before, not discovered during.

| Concern | Approach |
|---|---|
| Lock duration | Does the engine support concurrent index creation? |
| Peak load | Schedule outside published events |
| Reversibility | Dropping the index reverses it |

---

## 6. Documentation

**REQUIRED** in the same change, per governance principle 11.

| Change | Documentation |
|---|---|
| Entity added, removed, or split | **`DATA-MODEL.md` updated first**, then the schema |
| Attribute added | `DATA-MODEL.md` |
| Constraint added or removed | `DATA-MODEL.md` section 4, and the requirement it serves |
| Relationship changed | `DATA-MODEL.md` section 3 |
| Migration procedure changed | This playbook, per `PB-ENG-20` |

**The conceptual model is updated before the schema.** If the schema is changed first, the model is
temporarily wrong, and someone reading it during that window designs against the wrong thing.

---

## 7. Seed Data

**PROPOSED.**

| Environment | Seed data | Authority |
|---|---|---|
| E-1 Local | Full | `PB-ENG-15` section 4 |
| E-2 Test | Full, reseeded per run | `PB-ENG-08` section 7 |
| E-3 Staging | Minimal | `PB-ENG-15` section 4 |
| **E-4 Production** | **None. Prohibited** | `PB-ENG-15` section 3.1 |

### 7.1 No synthetic data in production

**Fabricated participation records in the authoritative store are worse than missing ones**, because
they are indistinguishable from real ones. A report showing a student at an event they never attended is
indistinguishable from a correct record.

### 7.2 Test data is generated, not copied

**No production data is copied into a test environment**, per `PB-ENG-15` section 4. Data is generated
to the shape needed, including boundaries: capacity minus one, exactly at, one above.

### 7.3 Seed data is reseeded, not hand-edited

A hand-edited fixture is a defect waiting to be rediscovered. The seed procedure is idempotent: running
it twice produces the same state.

---

## 8. Rollback

**REQUIRED.** Per section 3.1.

| Property | Rule |
|---|---|
| Every migration has a reversal | Section 3.1 |
| The reversal is tested | Not merely written |
| The reversal is rehearsed | In E-3 if it exists; otherwise in E-2 |
| Irreversible migrations | Recorded, with the alternative treatment in section 9.3 |

### 8.1 The reversal of a data migration is not a data restoration

**These are different operations and the difference matters during an incident.**

| Operation | Effect |
|---|---|
| Reversing a migration | Returns the *schema* to its previous shape |
| Restoring a database | Returns *data* to a backup point, **discarding everything since** |

**Reversing a migration does not un-migrate the data.** If a migration transformed data irreversibly,
the reversal restores the structure, and the data remains in its new form. This is why section 9.3
exists.

### 8.2 Rollback versus restore

**Per `PB-ENG-10` section 9.1, and repeated here because the confusion is consequential.**

| Situation | Action |
|---|---|
| The schema change is wrong, the data is fine | Reverse the migration |
| The schema change is wrong, the data is corrupted | Reverse **and** restore |
| The schema is fine, the data is corrupted | Restore only |
| Data was destroyed by the migration | Restore only |

**Restoring discards every registration made since the backup.** During an active event period, that
could be the day's participants.

---

## 9. Production Migration Requirements

**REQUIRED.**

### 9.1 Before

| Requirement | Authority |
|---|---|
| Migration tested against a real storage layer | `PB-ENG-08` section 2.1 |
| Reversal tested | Section 8 |
| **Backup taken and verified by restoration** | `NFR-BACKUP-004`, `NFR-BACKUP-006` |
| Locking impact assessed against real data volume | Section 5 |
| Scheduled outside published event windows | `NFR-AVAIL-002` |
| **Not during an attendance window** | **Absolute**, `NFR-AVAIL-003` |
| Rollback plan recorded | `PB-ENG-10` section 9.2 |
| Release approved | `PB-ENG-16` gate 17 |
| Staging rehearsal, if staging exists | Section 9.2 |

### 9.2 A backup that has not been restored is not a backup

**`NFR-BACKUP-006` is explicit.** Per `PB-ENG-18 Backup and Recovery`, the interview found backups made
by copying files with no evidence of restoration testing.

> **NOT YET IMPLEMENTED.** No backup mechanism exists. Per `OQ-29`, **no migration that changes data can
> currently be applied to production**, because no verified backup can be taken.

**If no staging environment exists** (`OQ-55`), the compensating controls in `PB-ENG-10` section 3.2
apply in full: reversible migrations, migrations before application start, a verified backup, and a
rollback plan written beforehand.

### 9.3 Irreversible migrations

Where a migration genuinely cannot be reversed, it requires **all** of:

| Condition | Requirement |
|---|---|
| Council Secretary approval | It removes the rollback option |
| The irreversibility is documented | What cannot be undone |
| A verified backup taken immediately before | `NFR-BACKUP-004` |
| The backup's location and retention stated | So a restoration is possible later |
| The data impact stated | What is transformed or lost |
| Scheduled outside event windows | `NFR-AVAIL-003` |

**An irreversible migration is permitted. An unnoticed irreversible migration is not.** The requirement
is that it be a recorded decision.

### 9.4 During

| Rule | Reason |
|---|---|
| Migrations applied **before** the application starts | The application never runs against an unexpected schema |
| One migration at a time | A partial failure is comprehensible |
| Each verified before the next | The failure point is known |
| Migration output recorded | For `PB-ENG-17` |

### 9.5 After

| Check | Requirement |
|---|---|
| Schema version matches the intended version | `PB-ENG-10` section 8 check 9 |
| A test registration succeeds | Check 4 |
| An audit entry was written | Check 8 |
| No error in the log | Check 10 |

**Post-migration verification that omits a write is not verification.** A migration can succeed and leave
the application unable to write, and the difference is only visible by writing.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| The change is traced to a requirement or defect | Section 3 step 1 |
| The conceptual model was checked for impact | Section 3 step 2 |
| The migration has a tested reversal | Sections 3.1, 8 |
| Backward compatibility assessed | Section 4 |
| Constraints were not removed without change management | Section 4.2 |
| Concurrency and locking impact assessed | Section 5 |
| Tested against a real storage layer | Section 3 step 5 |
| Documentation updated in the same change | Section 6 |
| **No synthetic seed data in production** | Section 7.1 |
| **No production data copied into a test environment** | Section 7.2 |
| **A verified backup precedes a production migration** | Section 9.2 |
| No migration during an attendance window | Section 9.1 |
| Irreversible migrations approved and documented | Section 9.3 |
| Post-migration verification includes a write | Section 9.5 |

## Required Evidence

- The forward migration and its reversal
- Test results against a real storage layer
- The concurrency assessment
- The data volume used for the locking assessment
- The backup verification result for a production migration
- The schema version before and after
- The post-migration verification result

## What Blocks Progression

- A migration has no reversal
- The reversal has not been tested
- An existing constraint would be dropped without change management
- A migration is incompatible with the previous application version
- No verified backup precedes a production migration
- A migration is scheduled during an attendance window
- Locking impact was not assessed against real data volume
- Seed data would be applied in production
- Production data would be copied into a test environment
- Documentation is deferred
- `OQ-30` or `OQ-29` is unanswered, so no production migration can proceed

## Exception Process

**PROPOSED.** An irreversible migration requires Council Secretary approval per section 9.3, with the
conditions recorded.

**No exception exists for** applying a production migration without a verified backup, migrating during
an attendance window, dropping a correctness constraint, or applying seed data in production.
Governance principles 9 and 15 are absolute, and three of these risk irreversible loss of the
participation record.

---

## Completion Criteria

- OQ-44 answered, so an engine and migration tool are selected
- The physical schema designed from `DATA-MODEL.md`
- Every migration has a tested reversal
- Concurrency and locking assessed against real data volume
- OQ-29 answered, so backups exist and can be verified
- The production migration procedure rehearsed

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| DB-01 | Happy path | Additive migration, forward and reversal tested | Applied and reversible |
| DB-02 | Failure | Migration with no reversal | **Blocked**, section 3.1 |
| DB-03 | Failure | Reversal written but never tested | **Blocked**, section 8 |
| DB-04 | Invalid | Applied migration edited | **Prohibited**, section 3.3 |
| DB-05 | Invalid | Migration inserted before an applied one | **Prohibited** |
| DB-06 | Failure | Existing unique constraint dropped | **Blocked**; `TST-02` would fail |
| DB-07 | Failure | Attendance uniqueness constraint dropped | **Blocked**; `CON-03` would fail |
| DB-08 | Failure | Foreign keys dropped | **Blocked**; orphan rows possible |
| DB-09 | Failure | Constraint added before data is compliant | **Blocked**, section 4.3 |
| DB-10 | Failure | Column removed while the old version writes it | **Blocked**, section 4.1 |
| DB-11 | Boundary | Column added nullable, old version unaffected | Permitted |
| DB-12 | Failure | Non-null column added with no default | **Blocked**, section 4.1 |
| DB-13 | Failure | Table rebuild during published events | **Blocked**, section 5.1 |
| DB-14 | Failure | Exclusive lock during an attendance window | **Blocked**, `NFR-AVAIL-003` |
| DB-15 | Boundary | Index added outside event windows | Permitted |
| DB-16 | Failure | Locking assessed only against a small fixture | **Blocked**, section 5.1 |
| DB-17 | Failure | Production migration with no verified backup | **Blocked**, `NFR-BACKUP-006` |
| DB-18 | Failure | Backup exists but has never been restored | **Blocked**, section 9.2 |
| DB-19 | Failure | Irreversible migration without Council approval | **Blocked**, section 9.3 |
| DB-20 | Failure | Irreversible migration, no backup retention stated | **Blocked**, section 9.3 |
| DB-21 | Boundary | Rollback of the migration, data intact | Permitted; section 8.1 |
| DB-22 | Failure | Restoration used where reversal would suffice | **Blocked**; discards participation records |
| DB-23 | Failure | Seed data applied in production | **Blocked**, section 7.1 |
| DB-24 | Failure | Production data copied into a test environment | **Blocked**, section 7.2 |
| DB-25 | Invalid | Hand-edited fixture instead of reseeding | Rejected, section 7.3 |
| DB-26 | Failure | Schema changed, `DATA-MODEL.md` not updated | **Blocked**, section 6 |
| DB-27 | Failure | `DATA-MODEL.md` updated after the schema | Rejected; the model is updated first |
| DB-28 | Failure | Post-migration verification with no write | Rejected, section 9.5 |
| DB-29 | Failure | Entity merged or split for storage convenience | **Blocked**; `PB-ENG-20` |
| DB-30 | Boundary | Migration applied before the application starts | Permitted, section 9.4 |

---

## Exit Criteria

- OQ-29 and OQ-44 answered, so backups and an engine exist
- The physical schema designed and traced to `DATA-MODEL.md`
- Every constraint in `DATA-MODEL.md` section 4 implemented and verified by its scenario
- The production migration procedure rehearsed
- Section 1 removed, once it ceases to be true that no schema exists
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[DATA-MODEL.md](../../planning/DATA-MODEL.md) ·
[PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[PB-ENG-18 Backup and Recovery](PB-ENG-18-BACKUP-RECOVERY.md) ·
[PB-ENG-15 Environment Management](PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) ·
[PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)