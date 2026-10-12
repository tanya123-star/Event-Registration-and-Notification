# PB-ENG-17 — Incident Response

**Playbook:** PB-ENG-17
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer, Administrator
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No incident has occurred, because no system exists.** There is no monitoring,
> no alerting, no on-call arrangement, no runbook, and no communication procedure. **Detection currently
> depends entirely on a user telling someone**, which is the least reliable mechanism available.
>
> **OQ-53 records that observability tooling is unselected**, so the detection half of this playbook
> cannot be built. The response half can be specified now, and is.

---

## Purpose

Define what happens when the Event Registration and Notification System fails, is suspected of being
compromised, or loses data.

This playbook exists because the interview reported technical failure with no defined procedure, and
because ERNS holds real student participation records. An incident handled improvisationally produces a
second problem: a recovery that loses data, or a disclosure that was not assessed.

---

## Scope

**Applies to:** any failure or suspected compromise of ERNS, in any environment.

**Does not apply to:** operational staff procedures during an event, in `PB-10 QR Attendance` and
`PB-11 Attendance Backup`; routine corrections, in the system playbooks; disaster recovery of the data
itself, in `PB-ENG-18 Backup and Recovery`.

---

## Ownership

**Responsible:** the Developer diagnosing and fixing.
**Accountable:** the Council Secretary, as the person answerable to the organisation and to students.
**Consulted:** IT for infrastructure; the technical owner for the affected module.

**PROPOSED.** Any person who observes an incident may declare one. A declaration is never blocked on
identifying severity first.

---

## 1. Current State

| Capability | State | Blocking |
|---|---|---|
| Monitoring and alerting | **Not implemented** | **OQ-53** |
| Log aggregation | **Not implemented** | **OQ-53** |
| Error reporting | **Not implemented** | OQ-53 |
| On-call or duty arrangement | **Undefined** | — |
| Runbook | **Does not exist** | This document |
| Communication procedure | **Undefined** | — |
| Backups | **Do not exist** | **OQ-29** |
| Incident log | **Does not exist** | — |

### 1.1 The honest position on detection

**Today, an incident would be discovered by a student telling an officer that registration does not
work.** That is not a monitoring strategy, and it means the duration of an outage is measured in the
time it takes someone to give up and find a person.

**This is recorded as a gap rather than presented as adequate.** Per
[CONVENTIONS.md](../../planning/CONVENTIONS.md) section 6, a document must not imply a control is
operating when it is not.

---

## 2. Severity

**PROPOSED.** Severity determines the response pace, not whether the response is documented.

| Severity | Definition | Response pace | Examples |
|---|---|---|---|
| **SEV-1** | Students cannot register or attend; data is lost or exposed | Immediate, all hands | Attendance unavailable during an event; participation records lost; a secret exposed |
| **SEV-2** | A primary function is degraded but a workaround exists | Immediate | Email dispatch failing; notification centre unavailable |
| **SEV-3** | A supporting function is unavailable | Same working day | Reporting unavailable; archiving fails |
| **SEV-4** | A defect with no operational impact | Scheduled | A cosmetic defect; a documentation error |

### 2.1 Severity is reassessed, not fixed at declaration

**A SEV-3 becomes a SEV-1 when an event window opens.** An audit-trail failure is a SEV-3 until
`TH-12` makes it an accountability problem, and then it is a SEV-1.

---

## 3. The Eight Phases

Per the master instruction, every incident follows all eight. **Documentation is not conditional on
severity** — an unreviewed incident repeats.

### 3.1 Detection

**How it is noticed, and by whom.**

| Detection source | Currently available? |
|---|---|
| Automated alerting | **No**, OQ-53 |
| A student reports it | Yes |
| An officer reports it | Yes |
| A developer notices it | Yes |
| Scheduled pipeline failure | **No**, `PB-ENG-09` |
| A failed backup or verification | **No**, OQ-29 |

**Whoever notices declares the incident.** Not "whoever is on call", because there is no on-call
arrangement.

**Record:** time, source, what was observed, and the correlation identifier if one exists.

### 3.2 Triage

**Establish what is actually happening, within a bounded time.**

| Question | Why it matters |
|---|---|
| Which function is affected? | Primary or supporting determines severity |
| Are students affected now? | Determines SEV-1 |
| Is data lost or corrupted? | Determines whether restoration is in scope |
| Is a security concern possible? | Determines whether containment is first |
| When did it start? | Correlates with the last deployment |
| What changed recently? | The changelog answers this |

**Time-boxed.** Triage is bounded so that it does not become the whole response. A SEV-1 gets minutes,
not an hour.

### 3.3 Containment

**Stop the harm, before finding the cause.**

| Situation | Containment |
|---|---|
| A dependency is failing | Degrade to a signposted state, `NFR-AVAIL-004` |
| QR validation is failing | Switch to the staff-assisted path, `PB-11` |
| A compromised account | **Suspend it immediately.** Session invalidated, `AUTH-12` |
| A secret is exposed | **Rotate it**, `PB-ENG-12` section 8 |
| An audit trail is compromised | **Stop writes.** Preserve the current state for examination |
| A bad deployment | Roll back, `PB-ENG-10` section 9 |
| Data corruption | **Stop writes.** Do not let more be written |

**Containment may precede diagnosis.** Rotating a suspected secret does not wait to be certain.

### 3.4 Investigation

**Find the cause, once the harm has stopped.**

| Step | Requirement |
|---|---|
| Correlate with the last deployment | The changelog, `PB-ENG-16` section 3 |
| Read the logs | `NFR-MAINT-004`, correlated by `NFR-MAINT-005` |
| Read the audit trail | `NFR-AUD-007` queryable by actor, action, entity, time |
| Identify the failing layer | `BR-2` in [INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md): is the dependency down, or is ERNS mishandling it? |
| Reconstruct the sequence | When it started, what changed |
| **Do not destroy evidence** | The audit store is append-only, `NFR-AUD-005` |

**Why `NFR-MAINT-005` is load-bearing here.** Without a correlation identifier spanning request, audit,
and log entries, the investigation becomes guesswork. This requirement exists for the incident, not for
convenience.

### 3.5 Recovery

**Restore service, then verify.**

| Situation | Action |
|---|---|
| Bad deployment | Roll back the previous artefact |
| Dependency failure | Wait, or degrade. **Do not change ERNS to work around an outage** |
| Data corruption | Restore, per `PB-ENG-18` |
| Compromised account | Password reset, sessions invalidated, access reviewed |
| Exposed secret | Rotated at containment. Verify the rotation took effect |

**Rollback is not restoration.** See `PB-ENG-10` section 9.1. Restoring discards everything written
since the backup.

### 3.6 Verification

**PROPOSED.** Confirm the fix before declaring the incident closed.

| Check | Requirement |
|---|---|
| The original symptom is gone | Not a different symptom |
| Post-deployment verification passes | `PB-ENG-10` section 8, checks 1 to 10 |
| A registration succeeds | **Primary Function 1** |
| A notification appears in the centre | **Primary Function 2** |
| An audit entry was written | `NFR-AUD-001` |
| No errors in the log | `NFR-MAINT-004` |
| No new alerts | Since monitoring exists |

**Verifying by exercising both primary functions is what distinguishes recovery from a change that merely
moved the symptom.**

### 3.7 Documentation

**REQUIRED, for every incident regardless of severity.**

| Record | Contains |
|---|---|
| Time | Detection, containment, recovery, verification |
| Impact | What students experienced, stated plainly |
| Cause | The root cause, not the symptom |
| Timeline | What happened when, with the changelog entry |
| Data affected | Records touched, whether data was lost |
| Resolution | What was done |
| Follow-up | Section 3.8 |

**A SEV-1 affecting student participation records is a matter for the Council, not only for developers.**
`NFR-AUD-010` means the audit trail records what happened; the incident record records what it meant.

### 3.8 Follow-up

**An incident without a follow-up action repeats.**

| Outcome | Requirement |
|---|---|
| A defect | An issue, prioritised |
| A missing test | A regression test, per `PB-ENG-08` section 2.6 |
| A missing control | A requirement, then implemented |
| An unresolved design question | Registered in `OPEN-QUESTIONS.md` |
| A process gap | This playbook updated |

**The follow-up is a pull request, not a note.** An action recorded in an incident report that never
becomes a change will not happen.

---

## 4. Incident-Specific Procedures

### 4.1 Production failure

Per phases 1 to 8. **Additional consideration:** is a published event in progress, and is an attendance
window open? If so, this is a SEV-1 regardless of apparent severity, and `PB-11 Attendance Backup` is
the operational fallback.

**Maintenance during an attendance window is prohibited**, `NFR-AVAIL-003`.

### 4.2 Authentication failure

| Step | Action |
|---|---|
| Contain | If the cause is unknown, **deny access rather than bypass** |
| Confirm | `FAIL-07` requires denial, not degradation |
| Assess | Whether accounts are affected or only the mechanism |
| Recover | Restore the mechanism, **not** by weakening it |
| Verify | A user can sign in; a suspended user still cannot |

**Never bypass authentication to restore service.** The failure mode of a bypass is an open system, and
`NFR-SEC-001` is absolute.

### 4.3 Suspected data integrity problem

| Step | Action |
|---|---|
| Contain | **Stop writes.** Do not let more be written |
| Preserve | The audit trail is append-only; **do not alter it** |
| Assess | `NFR-AUD-007` query what changed, by actor and time |
| Determine | Whether records were lost, altered, or both |
| Recover | Corrections, per `PB-ENG-20` where a requirement is involved. **Restoration only where records were lost** |
| Notify | Affected students, per `TH-02` recovery |

**Corrections are preferred to restoration** wherever the audit trail shows what the true value was.
Restoration discards everything since the backup, including registrations made after the corruption.

### 4.4 Security vulnerability discovered

| Step | Action |
|---|---|
| Contain | Limit exposure. Suspend accounts if accounts are involved |
| Assess | Is it exploited, or only present? The audit trail answers this |
| Escalate | **Council Secretary immediately.** `TH-12` severity |
| Preserve | Logs, audit entries, and state. **Do not clean up before examining** |
| Remediate | Through `PB-ENG-20` if it is a design issue |
| Verify | The vulnerability no longer applies |
| Notify | Whether disclosure is required. **This is a judgement for the Council Secretary, not a developer** |

**`TH-12` is treated as severe by definition.** An administrator altering records to conceal an action
destroys the accountability the audit trail exists to provide.

### 4.5 Secret exposure

**Per `PB-ENG-12` section 8. Rotate first.**

| # | Action |
|---|---|
| 1 | **Rotate the credential immediately** |
| 2 | Invalidate sessions if a signing key was exposed |
| 3 | Assess access from the audit trail |
| 4 | Remove from the current tree |
| 5 | Remove from history, or record why not |
| 6 | Review reuse of the same value elsewhere |
| 7 | Review how it was committed |
| 8 | Record the incident |
| 9 | Assess whether student data was exposed |

**Deleting the commit is not remediation.** By the time it is removed, the value may be in a clone, a
mirror, a cache, an artefact, and a backup.

### 4.6 Notification failure

| Scope | Consequence | Response |
|---|---|---|
| Email only | **None.** In-app is the source of truth | Record. Dispatch queues and retries, `NFR-AVAIL-006` |
| In-app only | **SEV-1.** Primary Function 2 is unavailable | Immediate |
| Both | **SEV-1** | Immediate |

**Email-only failure is deliberately low severity**, and this is the structural payoff of `FR-NOT-001`
and `FR-NOT-005`. The in-app centre is authoritative precisely so that an email outage is not an
outage.

**Registration must continue during an email outage.** The in-app record is created in the registration
transaction, so a dispatch failure does not affect registration. Scenario `INT-04` verifies it.

### 4.7 Database problems

| Problem | Response |
|---|---|
| Unavailable | Refuse writes. **Never report a registration not persisted**, `NFR-AVAIL-005` |
| Corruption | Containment per section 4.3 |
| Constraint violation in production | **Investigate, do not relax the constraint.** It is a correctness guarantee |
| Connection exhaustion | Restore, then assess whether it indicates a leak |
| Slow queries | Diagnose. **Do not add an index in production without `PB-ENG-14`** |
| Disk full | Restore capacity. Assess what stopped being written |

**A constraint violation appearing in production is a signal, not noise.** It means an application
check and a storage constraint disagreed — either a concurrency bug or an application defect. Removing
the constraint removes the guarantee rather than the symptom.

---

## 5. Communication

**PROPOSED.** Who is told, and when.

| Audience | When | Content |
|---|---|---|
| Technical team | On declaration | Severity, what is affected |
| Council Secretary | Immediately for SEV-1 and SEV-2, and for any data or security concern | Impact stated plainly |
| Officers | When it affects their work | What they should do instead |
| **Students** | When their participation is affected | What happened and what to do |
| Institutional IT | When infrastructure or a security issue is involved | — |

### 5.1 Students are told when their participation records are affected

**Per `TH-02` recovery and `TH-03` recovery**, an affected student is notified. A student who attended
an event and finds their record corrected, or absent, has been harmed by the system's failure and is
entitled to know.

**This is not a legal determination.** Whether an external disclosure obligation applies is a question
for the Council Secretary and the school, recorded here as a matter to assess rather than a decision.

### 5.2 What is not communicated

| Not communicated | Reason |
|---|---|
| Stack traces or internal detail | `NFR-SEC-012` |
| Which vulnerability was found, before remediation | Would assist exploitation |
| Which student data was accessed, beyond necessity | Privacy |
| Speculation about cause before it is established | Produces a correction later |

---

## 6. Escalation

| Trigger | Escalate to | When |
|---|---|---|
| SEV-1 | Council Secretary | Immediately |
| Any security concern | Council Secretary and IT | Immediately |
| Data loss | Council Secretary | Immediately |
| Student data exposure | Council Secretary | Immediately. **Assessment is theirs, not a developer's** |
| Infrastructure cause | IT | On triage |
| Repeated incident of the same cause | Technical owner | On closure |
| Second incident in one week | Council Secretary | On declaration |

**Escalation is not a request for permission.** It is notification. The person escalating does not wait
for approval to continue.

---

## 7. Post-Incident

| Action | Owner | Timing |
|---|---|---|
| Incident record completed | Developer | Before closure |
| Root cause identified | Developer | Before closure |
| Follow-up actions created as issues | Developer | Before closure |
| Regression test added, if a defect | Developer | Before closure |
| Requirement added, if a control was missing | Developer | Before closure |
| Playbook updated, if a process gap | Developer | Before closure |
| Control gap assessed | Technical owner | Within a week |
| **Council review for SEV-1 or data loss** | Council Secretary | Within a week |
| **Removal of any temporary workaround** | Developer | Tracked to closure |

### 7.1 Temporary workarounds are time-boxed

**A workaround applied during an incident becomes permanent unless it is actively tracked to
removal.** This is the most common way a system accumulates unaudited behaviour: a bypass added under
pressure, nobody scheduled its removal, and a year later it is the only path through.

**Every temporary measure carries an owner and a removal date.**

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Any person may declare an incident | Section 3.1 |
| All eight phases followed | Section 3 |
| Containment may precede diagnosis | Section 3.3 |
| Containment before cause-finding, for a secret or account | Sections 4.4, 4.5 |
| Evidence is not destroyed | Sections 3.4, 4.4 |
| Recovery verified by exercising both primary functions | Section 3.6 |
| Documentation produced for every incident regardless of severity | Section 3.7 |
| Follow-up actions created as changes, not notes | Section 3.8 |
| Authentication is never bypassed to restore service | Section 4.2 |
| Constraints are investigated, not relaxed | Section 4.7 |
| Affected students notified | Section 5.1 |
| Temporary workarounds carry an owner and a removal date | Section 7.1 |

## Required Evidence

- The incident record, with all eight phases
- The correlation identifiers used during investigation
- The audit trail queries performed
- The verification result from section 3.6
- Follow-up issues, each linked to the incident
- The changelog entry, if a deployment occurred

## What Blocks Progression

- An incident is closed without verification
- An incident is closed without documentation
- Authentication is bypassed to restore service
- A constraint is relaxed rather than investigated
- Evidence is destroyed before examination
- A secret is rotated after the commit is removed rather than before
- A temporary workaround is left untracked
- Data loss is not reported to the Council Secretary

## Exception Process

**PROPOSED.** During a SEV-1, a temporary measure may be applied that would not be acceptable normally,
provided it carries an owner, a removal date, and a recorded reason.

**No exception exists for** bypassing authentication, removing a correctness constraint, deleting an audit
entry, or leaving a workaround permanent. Governance principles 15 and the append-only property in
`NFR-AUD-005` are absolute.

---

## Completion Criteria

- OQ-53 answered, so detection exists
- OQ-29 answered, so restoration is possible
- The incident log established
- The Council Secretary and the team have walked through this playbook once
- A declared severity model agreed
- Section 1 updated to reflect reality

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| INC-01 | Happy path | Dependency fails, detected, contained, recovered | Verified by exercising both primary functions |
| INC-02 | Failure | Email transport down | SEV-2. In-app unaffected, registration continues |
| INC-03 | Failure | In-app notification centre down | **SEV-1.** Immediate |
| INC-04 | Failure | Registration fails, storage unavailable | Refused, no partial write, `NFR-AVAIL-005` |
| INC-05 | Failure | Authentication mechanism down | Denied, **not bypassed**, `FAIL-07` |
| INC-06 | Failure | Bypass proposed to restore authentication | **Blocked**, section 4.2 |
| INC-07 | Failure | Data corruption suspected | Writes stopped, evidence preserved, audit read |
| INC-08 | Failure | Records lost | Restore per `PB-ENG-18`, Council informed |
| INC-09 | Failure | Suspected account takeover | Suspended immediately, sessions invalidated |
| INC-10 | Failure | Secret exposed | **Rotated first**, per `PB-ENG-12` |
| INC-11 | Failure | Secret committed, commit deleted, value not rotated | **Blocked**, section 4.5 |
| INC-12 | Failure | Audit trail suspected tampered | Writes stopped, treated as severe, `TH-12` |
| INC-13 | Failure | Attempt to modify an audit entry during an incident | **Blocked**, `NFR-AUD-005` |
| INC-14 | Failure | Constraint violation in production | Investigated, **constraint not relaxed** |
| INC-15 | Failure | Index added directly in production to fix slowness | **Blocked**, `PB-ENG-14` |
| INC-16 | Failure | Bad deployment identified | Rolled back, `PB-ENG-10` section 9 |
| INC-17 | Failure | Rollback considered where restoration would suffice | **Blocked**; discards participation records |
| INC-18 | Failure | Incident closed without verification | **Blocked**, section 3.7 |
| INC-19 | Failure | Incident closed without documentation | **Blocked**, section 3.7 |
| INC-20 | Failure | Incident closed without follow-up actions | **Blocked**, section 3.8 |
| INC-21 | Invalid | Workaround applied, untracked | Rejected; section 7.1 |
| INC-22 | Boundary | Containment precedes diagnosis for a suspected secret | Permitted, section 3.3 |
| INC-23 | Failure | SEV-3 becomes SEV-1 as an event window opens | Reassessed, section 2.1 |
| INC-24 | Failure | Data loss not reported to the Council Secretary | **Blocked**, section 6 |
| INC-25 | Failure | Affected students not notified | **Blocked**, section 5.1 |
| INC-26 | Unauthorized | Disclosure obligation determined by a developer | **Blocked**, section 5.1 |
| INC-27 | Failure | Internal detail communicated externally | Rejected, `NFR-SEC-012` |
| INC-28 | Failure | Speculation about cause communicated before it is established | Rejected, section 5.2 |
| INC-29 | Boundary | SEV-2 escalated, Council informed immediately | Permitted |
| INC-30 | Failure | Second incident in one week, not escalated | Rejected, section 6 |

---

## Exit Criteria

- OQ-29 and OQ-53 answered, so restoration and detection are possible
- The incident log established
- A duty or on-call arrangement defined, or its absence recorded deliberately
- The Council Secretary has walked through this playbook
- A rehearsed incident, not merely a written one
- Section 1 removed, once it ceases to be true that nothing exists
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[PB-ENG-18 Backup and Recovery](PB-ENG-18-BACKUP-RECOVERY.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-11 Security](PB-ENG-11-SECURITY.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[PB-10 QR Attendance](../system/PB-10-QR-ATTENDANCE.md) ·
[PB-11 Attendance Backup](../system/PB-11-ATTENDANCE-BACKUP.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)