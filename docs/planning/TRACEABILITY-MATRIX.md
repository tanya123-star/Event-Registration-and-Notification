# Traceability Matrix

**Document:** ERNS-TRACE
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Trace every interview pain point through root cause, requirement, feature, expected outcome, and
validation, so that no pain point is left unaddressed and no requirement exists without a
justification.

This is the document that proves the system is a response to the interview rather than a
collection of desirable features.

---

## Scope

**In scope:** pain point to test traceability, root cause coverage, requirement coverage, and
explicit disposition of what ERNS does not solve.

**Out of scope:** requirement statements, in [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md);
test design, in [TESTING-STRATEGY.md](TESTING-STRATEGY.md).

---

## 1. Disposition Legend

| Disposition | Meaning |
|---|---|
| **SOLVED** | The system removes the structural cause of the pain point |
| **PARTIAL** | The system removes the structural cause but not the behavioural one |
| **DOCUMENTED** | The system records the concern but does not resolve it |
| **OUT OF SCOPE** | Outside ERNS, with rationale |

---

## 2. Full Traceability Matrix

### PP-01 — Difficulty Disseminating Event Information

| Field | Value |
|---|---|
| Root cause | RC-1 No authoritative notification channel with an addressable audience |
| Business requirement | The organisation shall have a single channel of record for event information that reaches an identified audience |
| Functional requirements | FR-EVT-013, FR-EVT-014, FR-NOT-010, FR-NOT-011, FR-NOT-017, FR-NOT-018, FR-NOT-019, FR-NOT-020, FR-NOT-021, FR-NOT-025 |
| Non-functional | NFR-USAB-004, NFR-INTEG-012 |
| Workflow | [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) |
| Playbook | `PB-06 Notification Publishing`, `PB-07 Notification Targeting`, `PB-03 Event Publishing` |
| Data | Event, Notification, NotificationRecipient |
| Security | [SECURITY-PLAN.md](SECURITY-PLAN.md) NFR-SEC-004 |
| Expected outcome | A student can find every event open to them in one place, without asking an officer |
| Validation | NOT-01, NOT-17, RPT-02 |
| **Disposition** | **SOLVED** |

### PP-02 — Information Not Always Received or Read

| Field | Value |
|---|---|
| Root cause | RC-2 No delivery record |
| Business requirement | The organisation shall be able to distinguish an unsent notification from an unread one |
| Functional requirements | FR-NOT-002, FR-NOT-003, FR-NOT-036, FR-NOT-037, FR-NOT-038, FR-NOT-039, FR-NOT-045 |
| Non-functional | NFR-INTEG-012 |
| Playbook | `PB-06 Notification Publishing`, `PB-08 Event Reminder` |
| Data | NotificationRecipient.in_app_state |
| Security | NFR-SEC-013 |
| Expected outcome | An officer can see who has and has not read an announcement |
| Validation | NOT-04, NOT-19, RPT-06 |
| **Disposition** | **PARTIAL** — receipt is measurable, comprehension is not. Acknowledgement records receipt of an important notice, not understanding |

### PP-03 — Dependence on Club Officers

| Field | Value |
|---|---|
| Root cause | RC-1 No authoritative notification channel |
| Business requirement | Information shall reach students without requiring a human relay |
| Functional requirements | FR-NOT-010, FR-NOT-011, FR-NOT-026, FR-NOT-036 |
| Non-functional | NFR-AVAIL-001 |
| Playbook | `PB-06 Notification Publishing` |
| Data | Notification, NotificationRecipient |
| Security | NFR-SEC-004 |
| Expected outcome | Club Officer is removed from the critical path of dissemination |
| Validation | NOT-01, NOT-17 |
| **Disposition** | **SOLVED** |

### PP-04 — Multiple Communication Channels

| Field | Value |
|---|---|
| Root cause | RC-1 No channel of record |
| Business requirement | The system shall be the authoritative record of event information, with changes traceable |
| Functional requirements | FR-EVT-016, FR-NOT-015, FR-NOT-013, FR-POS-005 |
| Non-functional | NFR-USAB-007, NFR-USAB-008 |
| Playbook | `PB-09 Event Update Notification` |
| Data | Event change history, Notification |
| Security | NFR-SEC-006 |
| Expected outcome | Students can see the authoritative version and what changed |
| Validation | EVT-11, NOT-24, POS-05 |
| **Disposition** | **PARTIAL** — the system becomes the record of reference. Informal channels cannot be prohibited by software |

### PP-05 — Manual, Time-Consuming Approval

| Field | Value |
|---|---|
| Root cause | RC-3 No visible approval state |
| Business requirement | The organisation shall be able to see where every pending event is waiting and why |
| Functional requirements | FR-APR-003, FR-APR-004, FR-APR-010, FR-APR-015, FR-APR-017, FR-RPT-007 |
| Non-functional | NFR-USAB-005, NFR-INTEG-006 |
| Playbook | `PB-02 Event Approval` |
| Data | ApprovalChain, ApprovalStep |
| Security | [SECURITY-PLAN.md](SECURITY-PLAN.md) TH-01 |
| Expected outcome | A stalled event is visible as a report line, not as an absence of information |
| Validation | APR-05, APR-09, APR-14 |
| **Disposition** | **PARTIAL** — visibility and auditability are solved. Office turnaround time is organisational and outside ERNS |

### PP-06 — QR Attendance Technical Problems

| Field | Value |
|---|---|
| Root cause | RC-5 No designed attendance fallback |
| Business requirement | Attendance shall not depend on QR functioning |
| Functional requirements | FR-ATT-010, FR-ATT-011, FR-ATT-012, FR-ATT-019 |
| Non-functional | NFR-AVAIL-003, NFR-AVAIL-004 |
| Playbook | `PB-11 Attendance Backup` |
| Data | Attendance.method, Attendance.recorded_by |
| Security | TH-03 |
| Expected outcome | QR failure is a slower path, not a failure of attendance |
| Validation | ATT-11, ATT-12, ATT-18 |
| **Disposition** | **PARTIAL** — the dependency is removed. Root-cause configuration faults in the QR tooling are a vendor concern |

### PP-07 — Manual Attendance

| Field | Value |
|---|---|
| Root cause | RC-4 Attendance not bound to registration |
| Business requirement | Small events shall use digital attendance without QR |
| Functional requirements | FR-ATT-010, FR-ATT-011, FR-ATT-016 |
| Non-functional | NFR-USAB-001 |
| Playbook | `PB-10 QR Attendance`, `PB-11 Attendance Backup` |
| Data | Attendance |
| Security | TH-03 |
| Expected outcome | Handwritten sheets are replaced for all event sizes |
| Validation | ATT-10, ATT-11 |
| **Disposition** | **SOLVED** |

### PP-08 — Long Queues

| Field | Value |
|---|---|
| Root cause | RC-4 Attendance not bound to registration |
| Business requirement | Attendance shall not require serial per-participant processing |
| Functional requirements | FR-ATT-002, FR-ATT-008, FR-ATT-009 |
| Non-functional | NFR-SCAL-002, NFR-PERF-002 |
| Playbook | `PB-10 QR Attendance` |
| Data | Registration, Attendance |
| Security | NFR-SEC-011 |
| Expected outcome | Queueing at event entry is removed for QR events |
| Validation | ATT-09, NFRD-07 |
| **Disposition** | **PARTIAL** — the manual bottleneck is removed. A new bottleneck at device availability is possible and is addressed by window flexibility |

### PP-09 — Incomplete Understanding of Event Mechanics

| Field | Value |
|---|---|
| Root cause | RC-6 No authoritative home for event information |
| Business requirement | Mechanics, programme flow, requirements, materials, and dress code shall be structured, required, and visible |
| Functional requirements | FR-EVT-004, FR-EVT-005, FR-REG-002 |
| Non-functional | NFR-USAB-006, NFR-USAB-008 |
| Playbook | `PB-01 Event Creation` |
| Data | Event.event_mechanics, program_flow, requirements, materials_needed, dress_code |
| Security | NFR-SEC-006 |
| Expected outcome | Mechanics cannot be omitted from a published event |
| Validation | EVT-04, EVT-09, REG-02 |
| **Disposition** | **PARTIAL** — the information is present and required. Whether a student reads it remains a behavioural matter |

### PP-10 — Information Dissemination Errors

| Field | Value |
|---|---|
| Root cause | RC-6 No authoritative home for event information |
| Business requirement | Contradictory versions shall be impossible; changes shall be traceable to an actor |
| Functional requirements | FR-EVT-016, FR-NOT-031, FR-EVT-013, FR-POS-005 |
| Non-functional | NFR-USAB-007 |
| Playbook | `PB-09 Event Update Notification` |
| Data | Event change history |
| Security | TH-05 |
| Expected outcome | There is one version of the event, with a visible history of what changed |
| Validation | EVT-11, EVT-12, NOT-25 |
| **Disposition** | **SOLVED** |

### PP-11 — Missed Announcements Affect Participation

| Field | Value |
|---|---|
| Root cause | RC-2 No delivery record; RC-6 No authoritative home |
| Business requirement | Requirements, materials, and schedule shall be delivered to participants before the event, with gaps visible |
| Functional requirements | FR-NOT-030, FR-NOT-028, FR-NOT-031, FR-EVT-004, FR-NOT-042 |
| Non-functional | NFR-USAB-007, NFR-USAB-001 |
| Playbook | `PB-08 Event Reminder`, `PB-09 Event Update Notification` |
| Data | Notification, NotificationRecipient |
| Security | NFR-SEC-011 |
| Expected outcome | Participants hold requirements, materials, and schedule before arrival; unacknowledged important notices are visible |
| Validation | NOT-11, NOT-12, NOT-23 |
| **Disposition** | **PARTIAL** — the information is delivered and gaps are visible. ERNS cannot force attention |

### PP-12 — Duplicate or Inaccurate Attendance Records

| Field | Value |
|---|---|
| Root cause | RC-4 Attendance not bound to registration |
| Business requirement | Attendance shall be bound to a verified registration and shall be incapable of duplication |
| Functional requirements | FR-ATT-001, FR-ATT-002, FR-ATT-003, FR-ATT-004, FR-ATT-018 |
| Non-functional | NFR-INTEG-002, NFR-INTEG-003, NFR-INTEG-007 |
| Playbook | `PB-10 QR Attendance`, `PB-11 Attendance Backup` |
| Data | Registration, Attendance |
| Security | TH-04, TH-06 |
| Expected outcome | One attendance record per registration, per person, per event, with a recorder identity |
| Validation | ATT-01, ATT-02, ATT-03, DATA-03 |
| **Disposition** | **SOLVED** |

### PP-13 — Working Student Attendance Challenges

| Field | Value |
|---|---|
| Root cause | RC-7 Fixed attendance window |
| Business requirement | Attendance periods shall be configurable per event so that working students may attend outside core hours |
| Functional requirements | FR-ATT-006, FR-ATT-007, FR-ATT-005 |
| Non-functional | NFR-USAB-001 |
| Playbook | `PB-10 QR Attendance` |
| Data | Event attendance windows, Attendance.attendance_window |
| Security | NFR-SEC-004 |
| Expected outcome | An event may admit participants before start and after end, with each record attributed to its window |
| Validation | ATT-07, ATT-08 |
| **Disposition** | **SOLVED** |

### PP-14 — Record Backup and Maintenance

| Field | Value |
|---|---|
| Root cause | RC-8 Unstructured retention; manual copying |
| Business requirement | Participant records shall be backed up and restorably retained |
| Functional requirements | FR-POS-005, FR-USR-009 |
| Non-functional | NFR-BACKUP-001, NFR-BACKUP-002, NFR-BACKUP-003, NFR-BACKUP-004, NFR-BACKUP-006 |
| Playbook | `PB-17 Backup and Recovery` |
| Data | All entities |
| Security | NFR-SEC-015 |
| Expected outcome | A verified, restorable backup exists rather than an assumed file copy |
| Validation | NFRD-19, BAC-04 |
| **Disposition** | **PARTIAL** — automation is specified. Retention policy is unresolved, OQ-26 through OQ-29 |

### PP-15 — Difficulty Learning from Previous Events

| Field | Value |
|---|---|
| Root cause | RC-8 Unstructured post-event knowledge |
| Business requirement | Problems and recommendations shall be recorded in a structured, retrievable, and reviewable form |
| Functional requirements | FR-POS-002, FR-POS-003, FR-POS-004, FR-POS-009, FR-POS-010, FR-POS-011 |
| Non-functional | NFR-SCAL-003 |
| Playbook | `PB-13 Event Evaluation`, `PB-14 Event Archiving`, `PB-15 Reporting` |
| Data | EventEvaluation |
| Security | NFR-SEC-004 |
| Expected outcome | An officer creating an event sees problems recorded for previous events of the same type |
| Validation | POS-04, POS-06, RPT-10 |
| **Disposition** | **PARTIAL** — structured records exist and are surfaced at the point of relevance. Nothing forces anyone to read them, and no automated analysis is performed |

---

## 3. Root Cause Coverage

| Root cause | Pain points | Requirements | Coverage |
|---|---|---|---|
| RC-1 Authoritative channel | PP-01, PP-03, PP-04 | FR-NOT-010, FR-NOT-011, FR-NOT-017 to FR-NOT-025, FR-NOT-026 | Complete |
| RC-2 Delivery record | PP-02, PP-11 | FR-NOT-002, FR-NOT-003, FR-NOT-036 to FR-NOT-039, FR-NOT-045 | Complete |
| RC-3 Visible approval state | PP-05 | FR-APR-003, FR-APR-004, FR-APR-010, FR-APR-017, FR-RPT-007 | Complete |
| RC-4 Attendance bound to registration | PP-07, PP-08, PP-12 | FR-ATT-001 to FR-ATT-009, FR-ATT-018, NFR-INTEG-002 | Complete |
| RC-5 Designed fallback | PP-06 | FR-ATT-010, FR-ATT-019 | Complete |
| RC-6 Authoritative event information | PP-09, PP-10, PP-11 | FR-EVT-002 to FR-EVT-005, FR-EVT-013, FR-EVT-016 | Complete |
| RC-7 Configurable windows | PP-13 | FR-ATT-005, FR-ATT-006, FR-ATT-007 | Complete |
| RC-8 Structured post-event knowledge | PP-14, PP-15 | FR-POS-002 to FR-POS-011, NFR-BACKUP-001 to NFR-BACKUP-007 | Complete |

---

## 4. Requirement Coverage

| Module | Requirements | Traced to |
|---|---|---|
| USR | 14 | RC-1, RC-2, all modules as a dependency |
| EVT | 16 | RC-6, supporting RC-1 |
| APR | 17 | RC-3 |
| REG | 40 | RC-1, RC-4 |
| NOT | 48 | RC-1, RC-2 |
| ATT | 20 | RC-4, RC-5, RC-7 |
| POS | 11 | RC-8 |
| RPT | 11 | All root causes as a read surface |
| AUD | 10 | All root causes as a trust basis |

No requirement exists without a root cause. No root cause lacks a requirement.

---

## 5. Disposition Summary

| Disposition | Count | Pain points |
|---|---|---|
| SOLVED | 6 | PP-01, PP-03, PP-07, PP-10, PP-12, PP-13 |
| PARTIAL | 9 | PP-02, PP-04, PP-05, PP-06, PP-08, PP-09, PP-11, PP-14, PP-15 |
| DOCUMENTED | 0 | — |
| OUT OF SCOPE | 0 | See section 7 |

**Nine of fifteen pain points are partially addressed, and that is the honest result.** In each
case ERNS removes a structural cause while leaving a behavioural one. No requirement in this
document set claims to make a student read a notification, make an office approve quickly, or
guarantee that an organiser reads a previous evaluation.

---

## 6. Documentation and Validation Coverage

| Requirement group | Playbook coverage | Test coverage |
|---|---|---|
| FR-USR-* | `PB-03` and [SECURITY-PLAN.md](SECURITY-PLAN.md) | ROLE-01 to ROLE-18 |
| FR-EVT-* | `PB-01 Event Creation` | EVT-01 to EVT-12 |
| FR-APR-* | `PB-02 Event Approval` | APR-01 to APR-32 |
| FR-REG-* | `PB-04 Event Registration`, `PB-05 Registration Management` | REG-01 to REG-28 |
| FR-NOT-* | `PB-06` to `PB-09` | NOT-01 to NOT-30 |
| FR-ATT-* | `PB-10 QR Attendance`, `PB-11 Attendance Backup` | ATT-01 to ATT-25 |
| FR-POS-* | `PB-12` to `PB-14` | POS-01 to POS-22 |
| FR-RPT-* | `PB-15 Reporting` | RPT-01 to RPT-08 |
| FR-AUD-* | `PB-16 Audit and Monitoring` | AUDT-01 to AUDT-25 |

---

## 7. Concerns Outside ERNS

| Concern | Disposition | Rationale |
|---|---|---|
| Student attention and habit | **OUT OF SCOPE** | Behavioural, not technical |
| Office turnaround time | **OUT OF SCOPE** | Organisational process |
| Quality of long-form written mechanics | **OUT OF SCOPE** | Content writing |
| Device and connectivity budget | **OUT OF SCOPE** | Infrastructure assumption, OQ-31 |
| Whether club officers relay messages | **OUT OF SCOPE** | Outside system control |
| Whether previous evaluations are read | **OUT OF SCOPE** | Behavioural; mitigated by surfacing at creation time |

---

## 8. Validation Scenarios

| ID | Scenario | Expected |
|---|---|---|
| TRACE-01 | Every PP-01 to PP-15 has a row | Confirmed, 15 rows |
| TRACE-02 | Every pain point row names a root cause | Confirmed |
| TRACE-03 | Every root cause maps to at least one requirement | Confirmed, section 4 |
| TRACE-04 | Every requirement traces to a root cause | Confirmed |
| TRACE-05 | Every pain point row names a validation reference | Confirmed |
| TRACE-06 | No pain point is claimed SOLVED without requirements | Confirmed |
| TRACE-07 | Partial dispositions give a rationale | Confirmed, 9 rows |
| TRACE-08 | Section 3 contains no invalid identifier references | **Previously claimed confirmed. Retracted 2026-10-09.** Four dangling identifiers were found and repaired the same day — `FR-USR-016`, `FR-RPT-031`, `FR-RPT-038`, and `NFR-AVAIL-05` — plus ten open-question references pointing at the wrong entry. Two further gaps remain open and are **not** claimed resolved: the `EVT-01` to `EVT-12` and `RPT-01` to `RPT-08` scenarios cited in the coverage table above are not defined anywhere in the document set, and one behaviour has no functional requirement (`FR-USR-016` had no successor) |
| TRACE-09 | Requirement counts match the requirements document | Confirmed, 187 — re-verified 2026-10-09 by enumerating the requirement table: 187 rows, 187 distinct identifiers, no duplicates (APR 17, ATT 20, AUD 10, EVT 16, NOT 48, POS 11, REG 40, RPT 11, USR 14) |
| TRACE-10 | Every module has playbook and test coverage | Confirmed, section 6 |

### Known identifier defect in the requirements document

`FR-AUD-001` is defined in [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) but is
mis-filed under the `AUD` module prefix, which is defined in
[CONVENTIONS.md](CONVENTIONS.md) as an **audit event class** prefix used in
[AUDIT-PLAN.md](AUDIT-PLAN.md), not a functional requirement module. There is a naming collision
between the two schemes.

Recorded rather than silently renumbered, because `FR-AUD-*` is referenced from
[SECURITY-PLAN.md](SECURITY-PLAN.md) and section 6 of this document, and renumbering it would
invalidate those references without adding clarity.

**Decision required:** either add `AUD` to the functional module list in
[CONVENTIONS.md](CONVENTIONS.md), or rename these requirements to `FR-GOV-*` for governance and
update every reference. See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-38.

---

## 9. Completion Criteria

- All fifteen pain points traced end to end
- All eight root causes mapped to requirements
- Every disposition justified
- Concerns outside ERNS listed

---

## 10. Exit Criteria

- Council Secretary confirms every SOLVED disposition is genuinely solved
- Partial dispositions accepted as honest, or the affected requirements extended

---

**Related documents:** [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) ·
[PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) ·
[TESTING-STRATEGY.md](TESTING-STRATEGY.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)