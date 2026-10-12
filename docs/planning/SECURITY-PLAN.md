# Security Plan

**Document:** ERNS-SEC
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Define the security posture of the Event Registration and Notification System: the threats it
faces, the controls that address them, and the authoritative statement of who may perform which
action on which resource.

ERNS holds student identity, participation, and attendance data, and it can publish official
communications and alter participation records. A compromise is a real harm to real students.

---

## Scope

**In scope:** threat analysis, preventive controls, detection, recovery, authorisation matrix,
authentication, session management, and data protection.

**Out of scope:** secure development process, in `PB-ENG-11 Security`; secrets handling, in
`PB-ENG-12 Secrets and Configuration`; audit event catalogue, in [AUDIT-PLAN.md](AUDIT-PLAN.md).

---

## 1. Data Sensitivity

| Data | Sensitivity | Why |
|---|---|---|
| Student identity, programme, year level, organisation | **Moderate** | Personal data about an identifiable individual |
| Registration records | **Moderate** | Reveals activity and interests |
| Attendance records | **Moderate to high** | Reveals presence at an event, and absence. Absence may itself be sensitive, for example a medical or religious event a student did not attend |
| Approval records | Low | Institutional, not personal |
| Notification read state | Low | Behavioural, not personal |
| Email addresses | **Moderate** | Contact data |
| Audit records | **High** | Tampering with these defeats accountability |
| Officer credentials | **High** | Publication and correction authority |

**Note on attendance absence.** Absence is not always neutral. A system that records absences
indiscriminately can reveal information a student did not intend to disclose. Retention for
attendance is therefore an open question, **OQ-27**, and the default is the shortest defensible
period.

---

## 2. Threat Analysis

### TH-01 Unauthorized Event Publication

| Field | Value |
|---|---|
| Threat | An account with insufficient rights publishes an event, bypassing approval |
| Risk | Official endorsement of an unapproved event. Participants act on false authority |
| Preventive | FR-APR-011 verifies the chain at publication. FR-APR-012 forbids the final approver publishing. Server-side authorisation only. SD-1 |
| Detection | Audit trail records publication with actor identity. Periodic review of events published without a preceding approval |
| Recovery | Cancel the event, which notifies registrants. Remove any publication-based authority claim |

### TH-02 Unauthorized Registration Modification

| Field | Value |
|---|---|
| Threat | An officer or administrator alters or removes registrations to favour or penalise students |
| Risk | Unfair participation. Loss of trust in the record, which is ERNS's core value |
| Preventive | FR-REG-027 restricts who may cancel. FR-REG-028 requires a reason. FR-REG-029 protects the registration timestamp and source. SD-4 attributes administrator overrides |
| Detection | Audit trail with actor, reason, previous state, new state. Participant-visible status |
| Recovery | Restore from the audit history. Notify affected students |

### TH-03 Fake Attendance

| Field | Value |
|---|---|
| Threat | Attendance is recorded for someone who did not attend |
| Risk | Corrupted participation record. Defeats the purpose of the module |
| Preventive | FR-ATT-001 binds attendance to a registration. FR-ATT-011 requires a staff identity on every staff-assisted record. FR-ATT-012 requires a reason where the participant is not present |
| Detection | Live counts. Discrepancy blocking at finalisation. Post-event review against capacity |
| Recovery | Correct with reason, retaining the original per FR-ATT-015 |

### TH-04 Duplicate Attendance

| Field | Value |
|---|---|
| Threat | One participant is recorded multiple times, inflating counts |
| Risk | Inflated attendance. Directly reproduces PP-12 |
| Preventive | **NFR-INTEG-002** uniqueness on the registration reference at the storage layer. FR-ATT-002 |
| Detection | Uniqueness violation is itself the detection. Repeat-scan message shown to staff |
| Recovery | No recovery needed. The second record never exists |

### TH-05 Unauthorized Access to Student Information

| Field | Value |
|---|---|
| Threat | An officer or staff member reads student data for events they are not involved in |
| Risk | Privacy violation. Data-protection exposure |
| Preventive | FR-EVT-013 limits event visibility. FR-REG-040 limits students to their own registrations. Role-scoped participant list access. FR-USR-012 time-bounds the Attendance Staff role |
| Detection | Audit trail records participant list access and export. Anomalous access pattern review |
| Recovery | Suspend the account. Assess what was accessed from the audit trail |

### TH-06 Unauthorized Announcement Publishing

| Field | Value |
|---|---|
| Threat | An account without publishing rights sends a notification impersonating an office |
| Risk | Students receive false official information. Reputational damage to the Council |
| Preventive | FR-NOT-010 and FR-NOT-011 restrict dispatch. FR-NOT-012 forbids Approver and Attendance Staff dispatch |
| Detection | Audit trail records every dispatch with actor identity |
| Recovery | Edit with correction, dispatch a corrective notification. Records are not deleted |

### TH-07 Manipulation of Event Information After Publication

| Field | Value |
|---|---|
| Threat | A venue or date is changed without notifying participants, or without authority |
| Risk | Students attend the wrong place at the wrong time. Directly reproduces PP-11 |
| Preventive | Class A changes require re-approval. All triggering changes notify. Change history is participant-visible. FR-EVT-016 records who changed what |
| Detection | Change history. Audit of every class A and B change |
| Recovery | Revert with a further change, which itself notifies. Cancel and reschedule |

### TH-08 Account Takeover

| Field | Value |
|---|---|
| Threat | A student or staff account is compromised |
| Risk | Registration data exposed. Events published under a legitimate identity |
| Preventive | NFR-SEC-002 stores credentials non-recoverably. NFR-SEC-003 session expiry. NFR-SEC-011 rate limits authentication. NFR-SEC-017 re-authentication for privileged operations |
| Detection | Failed authentication rate. Sign-in from an unexpected pattern |
| Recovery | Suspend the account. Audit the actions taken under it. Force credential reset |

### TH-09 Credential Disclosure

| Field | Value |
|---|---|
| Threat | Credentials or tokens are exposed through a repository, log, or error message |
| Risk | Account takeover at scale |
| Preventive | `PB-ENG-12 Secrets and Configuration`. NFR-SEC-013 no credentials in logs. NFR-SEC-012 no internal error disclosure |
| Detection | Automated secret scanning, specified in `PB-ENG-09 CI` |
| Recovery | Rotate the credential, invalidate sessions, review access. Procedure in `PB-ENG-17 Incident Response` |

### TH-10 Injection

| Field | Value |
|---|---|
| Threat | Crafted input executes or manipulates through query, script, or file handling |
| Risk | Data disclosure, data destruction, privilege escalation |
| Preventive | NFR-SEC-006 server-side input validation. NFR-SEC-007 output encoding. NFR-SEC-008 parameterised access. NFR-SEC-009 upload validation |
| Detection | Input monitoring. Review of suspicious validation failures |
| Recovery | Restore from backup. Patch the input path |

### TH-11 Notification Abuse

| Field | Value |
|---|---|
| Threat | A user dispatches large volumes of notifications, training students to ignore them |
| Risk | The channel loses value, which is the failure the interview already reports |
| Preventive | NFR-SEC-011 rate limits dispatch. Targeting requirement FR-NOT-017 to FR-NOT-022 constrains recipients |
| Detection | Dispatch volume monitoring |
| Recovery | Suspend the account. Issue a correction |

### TH-12 Audit Tampering

| Field | Value |
|---|---|
| Threat | An administrator modifies or deletes audit records to conceal an action |
| Risk | Accountability is destroyed. The audit trail becomes worthless |
| Preventive | **NFR-AUD-005** no modification or deletion path. Append-only storage. **FR-AUD-010** audits audit access |
| Detection | Integrity verification of the audit store. Periodic review of audit access |
| Recovery | Restore audit records from backup. Treat as a severe incident |

### TH-13 Attendance Window Abuse

| Field | Value |
|---|---|
| Threat | Registration is reopened after an event to backfill attendance |
| Risk | Fabricated participation records |
| Preventive | FR-REG-034 forbids reopening after event start. FR-REG-033 requires a reason. FR-ATT-007 refuses out-of-window attendance |
| Detection | Audit of every reopen, each with a reason |
| Recovery | Audit the affected event. Correct the records |

### TH-14 Data Loss

| Field | Value |
|---|---|
| Threat | Participant records are lost through failure, error, or mishandling |
| Risk | Loss of the records the organisation depends on. Reproduces PP-14 |
| Preventive | NFR-BACKUP-001 to NFR-BACKUP-003. Administrative data-change paths rather than direct database edits, per NFR-MAINT-006 |
| Detection | Backup monitoring. Restore verification |
| Recovery | Restore from backup. `PB-ENG-18 Backup and Recovery` |

> **NOT YET IMPLEMENTED.** No backup mechanism exists. See OQ-29.

---

## 3. Controls Summary

| Control family | Requirements |
|---|---|
| Authentication | NFR-SEC-001, NFR-SEC-002, NFR-SEC-003, NFR-SEC-008, NFR-SEC-011 |
| Authorisation | NFR-SEC-004, NFR-SEC-005, NFR-SEC-016, NFR-SEC-017, NFR-SEC-018 |
| Input and output | NFR-SEC-006, NFR-SEC-007, NFR-SEC-008, NFR-SEC-009 |
| Session | NFR-SEC-003 |
| Data in transit | NFR-SEC-014 |
| Data at rest | NFR-SEC-015, PB-ENG-12 |
| Error handling | NFR-SEC-012, NFR-SEC-013 |
| Audit | NFR-AUD-001 to NFR-AUD-010 |
| Rate limiting | NFR-SEC-011 |
| Headers | NFR-SEC-010 |
| Least privilege | NFR-SEC-015, NFR-SEC-016 |

---

## 4. Authorisation Matrix

This is the authoritative statement of **who may perform what action on which resource**. Per
NFR-SEC-004 it MUST be enforced by the application, not only by the interface.

### 4.1 Event resource

| Action | Administrator | Event Officer (owner) | Event Officer (other) | Approver | Student | Attendance Staff |
|---|---|---|---|---|---|---|
| Create | Yes | Yes | No | No | No | No |
| Read draft | Yes | Own | No | Assigned | No | No |
| Read published | Yes | Yes | Yes | Yes | Audience | Assigned |
| Edit draft | Yes | Own | No | No | No | No |
| Edit published, class B | Yes | Own | No | No | No | No |
| Edit published, class A | Yes | Own, with re-approval | No | No | No | No |
| Submit for approval | Yes | Own | No | No | No | No |
| Decide approval | No | **Prohibited**, SD-1 | No | Assigned | No | No |
| Publish | Yes | Own, not final approver | No | **Prohibited**, SD-1 | No | No |
| Cancel | Yes | Own | No | No | No | No |
| Archive | Yes | Own | No | No | No | No |

### 4.2 Registration resource

| Action | Administrator | Event Officer (owner) | Approver | Student | Attendance Staff |
|---|---|---|---|---|---|
| Create own | Yes | Yes | **Prohibited**, SD-2 | Yes | **Prohibited**, SD-2 |
| Read own | Yes | Yes | No | Yes | No |
| Read list for owned event | Yes | Yes | No | No | Assigned |
| Read list for any event | Yes | No | No | No | No |
| Cancel own | Yes | Yes | No | Yes | No |
| Cancel another's, with reason | Yes | Own event | No | No | No |
| Manual registration | Yes | Own event | No | No | **Prohibited** |
| Export list | Yes | Own event | No | No | No |
| Close registration | Yes | Own event | No | No | No |
| Reopen, with reason | Yes | Own event | No | No | No |

### 4.3 Attendance resource

| Action | Administrator | Event Officer | Approver | Student | Attendance Staff |
|---|---|---|---|---|---|
| Record via QR | Yes | Read only | No | Own event | Yes |
| Record staff-assisted | Yes | No | No | No | Yes |
| Correct, with reason | Yes | **Prohibited**, FR-ATT-016 | No | No | Yes |
| Read summary | Yes | Own event | No | Own only | Assigned |
| Read live count | Yes | Own event | No | No | Assigned |

### 4.4 Notification resource

| Action | Administrator | Event Officer (owner) | Approver | Student | Attendance Staff |
|---|---|---|---|---|---|
| Compose and dispatch | Yes | Own event | **Prohibited**, SD-1 | No | **Prohibited** |
| Dispatch system-wide | Yes | **No** | No | No | No |
| Read activity | Yes | Own event | No | Own only | No |
| Read activity, per-recipient email detail | Yes | **Prohibited**, FR-NOT-047 | No | No | No |
| Read | n/a | n/a | n/a | Own | n/a |
| Acknowledge | n/a | n/a | n/a | Own, where required | n/a |
| Edit after dispatch, with reason | Yes | Own event | No | No | No |

### 4.5 User and role resource

| Action | Administrator | Others |
|---|---|---|
| Provision or suspend account | Yes | No |
| Assign or revoke role | Yes | No |
| Grant or revoke Administrator | Yes | No |
| Grant Approver | Yes | No |
| Configure approval chains | Yes | No |
| Read audit trail | Yes | Officer: own events. Approver: own decisions |
| Export audit trail | Yes | No |
| Manage backups | Yes | No |

---

## 5. Authentication

**PROPOSED.** Institutional email as the username, with a password.

**ASSUMPTION.** Login is required for registration, per **OQ-07**.

| Rule | Requirement |
|---|---|
| Passwords stored non-recoverably | NFR-SEC-002 |
| Session ends on logout | NFR-SEC-003 |
| Session ends after inactivity | NFR-SEC-003 |
| Re-authentication for privileged operations | NFR-SEC-017 |
| Rate limiting on attempts | NFR-SEC-011 |

> **OPEN QUESTION:** Is a student information system or Google Workspace sign-on available? See
> OQ-33 for a student information system, and OQ-45 for institutional single sign-on. If
> single sign-on is available, local credential handling reduces.

**No self-service account creation.** **FR-USR-005.** An open registration system for a student
organisation invites junk accounts and weakens every guarantee that depends on identity.

---

## 6. Session Management

**PROPOSED.**

| Property | Value |
|---|---|
| Transport | Encrypted, per NFR-SEC-014 |
| Storage | Server-side, referenced by an opaque identifier |
| Lifetime | Bounded, extended on activity |
| Idle timeout | Bounded. **PROPOSED** 30 minutes for officers, longer for students |
| Privilege change | A role change invalidates existing sessions, so a revoked role takes effect immediately |
| Termination | Logout, idle timeout, suspension, administrative revocation |

**Role changes MUST invalidate sessions.** Otherwise revoking a role has no effect until the user's
session expires, which is a window during which a suspended user's privileges still function.

---

## 7. Data Protection

| Rule | Requirement |
|---|---|
| Transport encryption for all traffic | NFR-SEC-014 |
| Database access at minimum privilege | NFR-SEC-015 |
| No personal data in logs | NFR-SEC-013 |
| No internal error detail to users | NFR-SEC-012 |
| Response headers preventing caching and framing | NFR-SEC-010 |
| Uploads validated and stored outside the executable path | NFR-SEC-009 |
| Student context snapshotted at registration | NFR-INTEG-009 |

### 7.1 Access to personal data

A participant list contains names, programmes, and organisations for students who registered for
an event. It is available to the owning Officer and to assigned Attendance Staff, and to no one
else.

In the notification context, **FR-NOT-047** restricts officers to aggregate counts, never email
addresses or per-recipient failure detail. The same principle applies to participant lists: access
is scoped to the event, and export is audited as `AUD-22`.

### 7.2 Deletion

**CONFIRMED.** Retention is governed by an unresolved policy. **OQ-26, OQ-27, OQ-28**.

**PROPOSED.** Until a policy exists:

- Deletion of registration or attendance records is **not** available to any role
- Corrections are preferred to deletion, and are themselves audited
- Audit records are never deleted

This is deliberately conservative. A system whose value is trustworthy records should not offer a
convenient erasure path, and no retention policy currently authorises one.

---

## 8. Logging

**PROPOSED.** What must be logged:

| Logged | Not logged |
|---|---|
| Authentication success and failure | Passwords |
| Authorisation denials | Session tokens |
| Registration attempt and outcome | Full registration field values |
| Notification dispatch and outcome | Notification body content |
| Attendance validation outcome | QR token values |
| State transitions with correlation identifier | Stack traces in user-facing output |

**NFR-MAINT-005** requires a correlation identifier across the request, its audit entries, and its
log entries. Without it, diagnosing a failed registration from logs alone is guesswork.

---

## 9. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| SEC-01 | Unauthenticated access to any protected resource | Rejected |
| SEC-02 | Student accessing another student's registrations | Rejected |
| SEC-03 | Student accessing an unpublished event | Rejected |
| SEC-04 | Approver editing an event under review | Rejected |
| SEC-05 | Final approver publishing | Rejected, SD-1 |
| SEC-06 | Attendance Staff creating a registration | Rejected, SD-2 |
| SEC-07 | Event Officer correcting attendance | Rejected, FR-ATT-016 |
| SEC-08 | Officer exporting a participant list for an unowned event | Rejected |
| SEC-09 | Officer viewing email addresses or per-recipient failure detail | Rejected, FR-NOT-047 |
| SEC-10 | Publishing an event with an incomplete chain | Rejected |
| SEC-11 | Reopening registration after event start | Rejected |
| SEC-12 | Cancelling a registration without a reason | Rejected |
| SEC-13 | Attempting to modify an audit entry | No path exists |
| SEC-14 | Sustained failed authentication attempts | Rate limited |
| SEC-15 | Crafted input in a registration field | Treated as data |
| SEC-16 | Script fragment in event content | Encoded, not executed |
| SEC-17 | Unauthorised file type upload | Rejected before storage |
| SEC-18 | Error condition producing a stack trace in output | No internal detail disclosed |
| SEC-19 | Suspended user with an active session | Session invalidated, access refused |
| SEC-20 | Role revoked while a session is active | Session invalidated |
| SEC-21 | Attendance recorded for an unapproved event | Rejected |
| SEC-22 | Attendance with no registration reference | Rejected |
| SEC-23 | Notification dispatched to a non-authorised event | Rejected |
| SEC-24 | High-volume notification dispatch | Rate limited |
| SEC-25 | Automated QR enumeration | Rate limited |
| SEC-26 | Credential visible in logs | Not present |

---

## 10. Completion Criteria

- Every threat has a preventive control, a detection means, and a recovery route
- The authorisation matrix states who may act on which resource
- Every prohibition has an enforcement point in application logic
- No security control is claimed as implemented

---

## 11. Exit Criteria

- OQ-07 and OQ-33 resolved, since both affect authentication
- OQ-28 resolved, since retention policy affects data protection
- A security review confirms the authorisation matrix is enforced server-side
- Backup controls are implemented, since NFR-BACKUP is currently specified only

---

**Related documents:** [SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[SECURITY-ARCHITECTURE.md](../architecture/SECURITY-ARCHITECTURE.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)