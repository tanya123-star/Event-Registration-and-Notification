# Playbook 11 — Attendance Backup

**Playbook:** PB-11
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Attendance Staff
**Supersedes:** None

---

## Purpose

Continue recording attendance when QR or the network fails, so that a technical problem never
prevents a participation record from existing.

This playbook addresses Pain Point 6: QR attendance technical problems, and Pain Point 8: queues
caused by a failing process.

The interview reported that QR occasionally fails and that "a backup method is sometimes prepared".
The word *sometimes* is the problem. A backup prepared ad hoc is not a backup.

---

## Scope

**In scope:** declaring QR failure, running staff-assisted attendance during a failure, the paper
contingency for a total outage, and reconciliation afterwards.

**Out of scope:** normal attendance capture, `PB-10 QR Attendance`.

---

## Trigger

QR fails, the network is unavailable, or staff judge the QR path too slow for the volume arriving.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Attendance Staff | Declare failure, run the fallback |
| Administrator | Reconcile paper records, authorise retrospective entries |
| Event Officer | Informed, not in control of attendance |
| Students | Admitted by staff judgement |

---

## Preconditions

- Staff-assisted attendance is implemented and available, per `PB-10`
- Attendance Staff are trained on this procedure **before** the event, not during it
- A decision-maker is reachable during the event
- **PROPOSED.** A numbered paper log exists as a final contingency

---

## Decision to Fall Back

**PROPOSED.** Staff fall back when **any** of these occur:

| Trigger | Action |
|---|---|
| QR validation returns an error for multiple consecutive scans | Declare failure, switch |
| Devices cannot reach the service | Declare failure, switch |
| Queue length exceeds what staff can process in a reasonable time | Switch, and report as a process issue rather than a technical one |
| A participant cannot use a device for a large share of arrivals | Switch to staff-assisted for that stream |
| Any staff member judges the QR path unsafe or unworkable | Switch. **No justification is required to switch** |

**The last point is deliberate.** Requiring proof of failure before permitting a fallback invites
staff to struggle with a broken system rather than work around it. Switching costs little; not
switching costs a queue.

---

## Tier 1 — Declare QR Failure

1. An Attendance Staff member identifies a failure condition
2. Staff selects Declare QR failure on the event
3. System records the declaration, the time, and the staff identity
4. **The declared method for the event becomes staff-assisted**
5. System displays that staff-assisted is now the active method
6. The declaration is audited

**FR-ATT-019.** The declaration is itself a record. It answers the question "why was attendance
recorded the way it was" six weeks later.

---

## Tier 2 — Staff-Assisted Attendance

1. Staff record attendance per `PB-10`
2. Each record carries method `STAFF_ASSISTED` and the staff identity
3. The live count continues to update
4. Walk-ins are recorded as documented exceptions with reasons
5. No QR token validation is attempted

**Staff-assisted is not degraded mode.** It is a complete, first-class attendance method with the
same guarantees: bound to registration, no duplicates, attributed to a recorder. The only difference
is speed.

---

## Tier 3 — Paper Contingency

**PROPOSED.** Use only when the ERNS service itself is unavailable. This is the highest-impact
failure ERNS can have, and it is why attendance must not depend on the notification or email
subsystems.

1. Staff switch to numbered paper sheets
2. Staff record name or participant reference, sequentially numbered
3. Sheets are retained and signed by the staff member on duty
4. Attendance continues. **Participants are admitted**
5. ERNS availability is escalated per `PB-ENG-17 Incident Response`
6. Once ERNS is available, reconciliation proceeds

### 3a. Reconciliation

1. An Administrator opens the event's attendance reconciliation view
2. The Administrator enters the paper records against the participant list
3. Each entry is matched to a registration where possible
4. Unmatched entries are recorded as walk-ins with a reason
5. Each entry is attributed to the staff member who signed the sheet
6. A reason is recorded for the whole reconciliation
7. System records `AUD-15` per entry and `AUD-16` for the reconciliation itself

**Reconciliation is done by an Administrator, not by the officer.** The officer owns the event and
would benefit from a flattering count, which is why FR-ATT-016 bars them from corrections.

### 3b. What reconciliation cannot fix

| Limitation | Consequence |
|---|---|
| Duplicate names on a sheet | Cannot be distinguished. Recorded as a limitation |
| A participant recorded twice by hand | Both entries rejected by the uniqueness constraint; the second is reported for manual review |
| A participant recorded who did not attend | Indistinguishable from a genuine record. **Paper attendance is evidence, not proof** |
| Timestamps | The scan time is the reconciliation time, not the arrival time |

**These limitations must be recorded, not hidden.** An attendance record reconciled from paper is
weaker evidence than one recorded live, and the record should say so.

---

## Alternative Paths

### QR fails for one device but not others

That device switches to staff-assisted. The declaration records which device. Others continue on QR.

### The network is available but slow

Staff-assisted, because slow is operationally equivalent to failed. Declaring failure is honest.

### Staff-assisted is too slow for the volume

Add staff. This is the queue answer, and it does not require the network to work.

### A participant disputes their attendance

The record shows the method and, for staff-assisted, the staff identity. The participant disputes
with that staff member or an Administrator. A correction follows `PB-10` with a reason if warranted.

### The event is cancelled during attendance

Attendance stops. The event is `CANCELLED`. Attendance recorded so far is retained.

### QR recovers mid-event

Staff may switch back. The declared method is recorded as changing. **PROPOSED.** Partial methods
within one event are permitted and recorded, because refusing to switch back would mean a recovered
service is not used.

### An Administrator is not reachable

Staff proceed with Tier 3 and reconcile later. **Attendance is never blocked pending
authorisation.**

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Declaring failure requires an Attendance Staff identity | FR-ATT-011 | Sign in to declare a failure |
| Staff-assisted still requires a valid registration | FR-ATT-001 | No active registration found |
| Duplicate attendance refused in all tiers | FR-ATT-002 | Attendance already recorded |
| Walk-in requires a reason | FR-ATT-012 | A reason is required |
| Paper reconciliation requires an Administrator | FR-ATT-014 | Only an Administrator may reconcile paper records |
| Reconciliation requires a reason | FR-ATT-014 | A reason is required |
| Unmatched paper entries recorded as walk-ins | OQ-21 | — |
| Officer cannot reconcile | FR-ATT-016 | You cannot correct attendance for this event |

---

## Data Affected

| Entity | Effect |
|---|---|
| Attendance | Recorded with method `STAFF_ASSISTED`, attributed to staff |
| Event | Declared method changed, recorded |
| AuditLog | `AUD-15` per record, `AUD-16` for reconciliation |

---

## Notifications

| Event | Recipients | Priority | Acknowledgement |
|---|---|---|---|
| QR failure declared | Event Officer, Administrator | `HIGH` | No |
| Tier 3 paper contingency begun | Event Officer, Administrator | `IMPORTANT` | **Yes** |
| Reconciliation completed | Event Officer | `NORMAL` | No |
| Reconciled attendance carries limitations | Event Officer | `HIGH` | No |

**Tier 3 requires acknowledgement** because it means the participation record is being built by a
process weaker than normal, and the officer needs to know before the event report is produced.

---

## Audit Requirements

| Action | Audit class | Contents |
|---|---|---|
| QR failure declared | `AUD-15` | Staff identity, time, condition observed |
| Staff-assisted record | `AUD-15` | Staff identity, registration, window, timestamp |
| Walk-in recorded | `AUD-15` | Staff identity, reason |
| Paper reconciliation | `AUD-16` | Administrator, reason, entry count, matched and unmatched |
| Reconciled entry limitations recorded | `AUD-16` | Administrator, which limitations apply |

**Reconciliation is audited per entry as well as per event.** An Administrator entering 200 names
from a sheet is the highest-volume manual action in ERNS and must be individually attributable.

---

## Failure Handling

**Failure:** QR fails and staff do not know the fallback exists.
**Handling:** this is a training failure, not a system failure. It is why this playbook must be
covered in staff training before any event, and why `PB-10` states that staff-assisted is a
first-class method rather than a contingency.

**Failure:** the service is unavailable and no paper sheets are available.
**Handling:** staff improvise a written record and reconcile later, or accept that attendance is
deferred. **Participants are admitted.** Refusing entry because a system is down would reproduce the
organisational failure the system was meant to fix.

**Failure:** reconciliation is attempted and a paper record names someone with no registration.
**Handling:** recorded as a walk-in with a reason. Not converted to a registration.

**Failure:** reconciliation produces more entries than registrations plus walk-ins expected.
**Handling:** the uniqueness constraint prevents genuine duplicates. Excess entries are reported for
manual review rather than silently accepted.

**Failure:** an Administrator reconciles to inflate attendance.
**Handling:** the reconciliation is attributed, reasoned, and audited per entry. This is why SD-4
exists and why reconciliation is not available to the officer.

**Failure:** staff continue using QR after declaring failure because switching back is convenient.
**Handling:** the declared method is displayed. Declaring a failure and then using QR anyway
produces a misleading method record, so the system displays the active method prominently.

---

## Completion Criteria

- Attendance was recorded for every present participant, in whichever tier was used
- The method used is recorded for the event and, where it differed, for individual records
- Paper records, if any, are reconciled and attributed
- Limitations of reconciled records are recorded
- The event officer knows which method was used

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBF-01 | Happy path | QR fails, staff declare failure | Declared method becomes staff-assisted, audited |
| PBF-02 | Happy path | Staff-assisted records continue | Bound to registration, attributed |
| PBF-03 | Happy path | QR recovers mid-event | Switch back permitted, change recorded |
| PBF-04 | Boundary | One device fails, others do not | That device switches, declaration names it |
| PBF-05 | Boundary | Network slow but working | Staff-assisted, declared as failure |
| PBF-06 | Failure | Service unavailable | Tier 3 paper, participants admitted |
| PBF-07 | Failure | Paper reconciliation by an Administrator | Recorded per entry, `AUD-15` and `AUD-16` |
| PBF-08 | Failure | Paper reconciliation by an officer | Refused |
| PBF-09 | Unauthorized | Reconciliation without a reason | Refused |
| PBF-10 | Failure | Paper record with no matching registration | Walk-in with a reason, not a registration |
| PBF-11 | Failure | Paper record duplicated by hand | Second entry rejected, reported for review |
| PBF-12 | Failure | Paper reconciliation exceeds expected counts | Reported, not silently accepted |
| PBF-13 | Invalid | Duplicate attendance in the fallback path | Refused |
| PBF-14 | Failure | Staff switch without declaring | Declared method displayed as system state |
| PBF-15 | Unauthorized | Attendance Staff reconcile paper | Refused |
| PBF-16 | Failure | Administrator unavailable during the event | Staff proceed, reconcile later |
| PBF-17 | Failure | No paper sheets available | Staff improvise or defer; entry is not refused |
| PBF-18 | Boundary | Event cancelled during attendance | Attendance stops, retained |
| PBF-19 | Failure | QR returns errors intermittently | Declared failure, switched |
| PBF-20 | Failure | Fallback used but never declared | Report shows method per record, discrepancy visible |

---

## Exit Criteria

- Attendance is complete and every record is attributable
- The method used is known and recorded
- Any reconciled records carry their limitations
- Staff have confirmed the procedure is usable in a real event

---

**Related documents:** [PB-11 Attendance Backup](PB-11-ATTENDANCE-BACKUP.md) ·
[PB-10 QR Attendance](PB-10-QR-ATTENDANCE.md) ·
[PB-12 Post-Event Records](PB-12-POST-EVENT-RECORDS.md) ·
[ATTENDANCE-WORKFLOW.md](../../planning/ATTENDANCE-WORKFLOW.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[PB-ENG-17 Incident Response](../engineering/PB-ENG-17-INCIDENT-RESPONSE.md) ·
[MVP.md](../../planning/MVP.md)