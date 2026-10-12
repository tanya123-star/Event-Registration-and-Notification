# Playbook 15 — Reporting

**Playbook:** PB-15
**Type:** System playbook
**Area:** playbooks/system
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Event Officer
**Supersedes:** None

---

## Purpose

Give each role the operational view it needs: officers what they must act on, approvers what awaits
them, students their own registrations, and the Council what happened.

Reports exist to reduce the time spent assembling answers by hand. They are not analytics.

---

## Scope

**In scope:** the operational reports, who each is for, and the honesty constraint on what they
may show.

**Out of scope:** automated analysis and dashboards, which do not exist, per FR-RPT-011.

---

## Trigger

A user opens the reporting area, or a report is generated for a specific event.

---

## Actors

| Actor | Role in this playbook |
|---|---|
| Student | Views their own registrations |
| Event Officer | Views reports for events they own |
| Approver | Views pending decisions and their own decision history |
| Attendance Staff | Views live counts and attendance summaries for assigned events |
| Administrator | Views all reports |

---

## The Report Set

| # | Report | Requirement | Audience |
|---|---|---|---|
| 1 | My registrations | FR-RPT-001 | Student |
| 2 | Upcoming events | FR-RPT-002 | Any authenticated user |
| 3 | Open registrations | FR-RPT-003 | Officer, Administrator |
| 4 | Registration summary | FR-RPT-004 | Owner, Administrator |
| 5 | Participant list | FR-REG-031 | Owner, Administrator |
| 6 | Attendance summary | FR-RPT-005 | Owner, Administrator |
| 7 | Notification activity | FR-RPT-006 | Owner, Administrator |
| 8 | Pending approvals | FR-RPT-007 | Approver |
| 9 | Approval decision history | FR-RPT-008 | Approver |
| 10 | Event history | FR-RPT-009 | Officer, Administrator |
| 11 | Problems and recommendations | FR-RPT-010 | Officer, Administrator |

**Eleven reports.** Each answers a question someone actually asked. FR-RPT-011 prohibits trend
analysis, dashboards, and predictive reporting.

---

## Why No Dashboards

**FR-RPT-011.** No trend analysis, dashboards, or predictive reporting.

Three reasons:

1. **Nobody requested them.** The problem was that information did not reach people and records were
   not kept. Neither is fixed by a chart.
2. **Charts of small numbers mislead.** An organisation holding a handful of events per term has
   too little data for a trend to mean anything. A line through four points is decoration.
3. **A dashboard encourages treating a report as settled.** The reports here are working views that
   answer a specific question. A wall of metrics invites interpretation the data does not support.

**The problems-and-recommendations report lists records; it does not chart them.** Reading three past
evaluations is more useful than a bar showing "attendance problems: 2".

---

## The Honesty Constraint

**No report may present email send counts as evidence that students were informed.**

Per [NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) section 2, email `SENT`
means the transport accepted the message and nothing more. Most mail clients block tracking, so open
counts would be a systematic undercount rather than a measurement.

**What a notification activity report may show:**

| Permitted | Prohibited |
|---|---|
| Recipients resolved | "Students informed: 214" |
| In-app `CREATED` count | "Reach: 198" |
| In-app `READ` count | Any figure combining email and read state |
| In-app `ACKNOWLEDGED` count | Any delivery-rate percentage |
| Email `SENT`, `FAILED`, `BOUNCED` counts, aggregate | Any per-recipient email detail for officers |
| Outstanding acknowledgements | Any inference about comprehension |

**The distinction matters.** "214 students received this notification" is not a claim ERNS can make.
"214 notifications were created and 138 were opened in the system" is a claim it can make, and it is
more useful because it is true.

---

## Role-Scoped Views

| Report | Student | Officer | Approver | Attendance Staff | Administrator |
|---|---|---|---|---|---|
| My registrations | Own only | Own only | No | No | Any |
| Upcoming events | Audience only | All | Assigned | Assigned | All |
| Open registrations | No | Owned events | No | Assigned | All |
| Registration summary | No | Owned events | No | Assigned | Any |
| Participant list | No | Owned events | No | Assigned | Any |
| Attendance summary | No | Owned events | No | Assigned | Any |
| Notification activity | No | Owned events | No | No | Any |
| Pending approvals | No | Owned events | Own decisions | No | All |
| Approval history | No | Owned events | Own decisions | No | All |
| Event history | Audience only | Owned events | Assigned | Assigned | All |
| Problems and recommendations | No | Owned and comparable | Assigned | Assigned | All |

**Officers see their own events. Not all events.** An officer's access to another officer's
participant list would be an unnecessary personal-data exposure with no operational need.

**Students see only their own data.** FR-REG-040 and FR-NOT-043.

---

## Main Workflow — Registration Summary

1. Officer opens the event
2. System displays the registration summary
3. Summary shows total registered, capacity, remaining slots, cancellations
4. Officer filters the participant list by status if needed
5. Officer exports if required

---

## Main Workflow — Pending Approvals

1. Approver opens pending approvals
2. System lists events awaiting this approver's decision
3. Each row shows event title, date, days since submission, current office
4. **Days since submission is the operational column.** It answers "is this late?"
5. Approver selects an event to act

**PROPOSED.** Idle events beyond the configured threshold are visually distinguished, so a stale
item is visible without reading every row. This is the report that most directly addresses the
interview's approval complaint.

---

## Main Workflow — Problems and Recommendations

1. Officer opens the report
2. Officer selects an event type, or a date range
3. System lists past events matching the filter
4. Each entry shows the event, its recorded problems by category, and its recommendations
5. Officer reads and applies what is relevant to a current event

**The report is a list of records, not a summary of them.**

---

## Alternative Paths

### An officer requests a report for an event they do not own

Refused. Scope is by ownership.

### An approver requests another office's pending events

Refused. An approver sees only their own queue.

### An Attendance Staff member requests notification activity

Refused. They need attendance figures, not communication figures.

### An officer requests a trends dashboard

Not available. FR-RPT-011 prohibits it.

### An officer requests an attendee export with email addresses

**Not permitted.** The participant list contains names, programmes, and organisations. Email
addresses are not part of it, per FR-NOT-047.

### An administrator requests email failure detail per recipient

Permitted. Administrators hold data-quality responsibilities for delivery.

### A report is requested during an event

Live counts are available, per FR-ATT-013. Registration and attendance summaries are available but
will change as the event proceeds, so the officer is told the data is live.

### An event has too many participants for one screen

Paginated, or summarised with detail on request, per NFR-RESP-006.

---

## Validation Rules

| Rule | Requirement | Failure message |
|---|---|---|
| Report scope matches role | Authorisation matrix | You do not have access to this report |
| Students see only their own data | FR-REG-040, FR-NOT-043 | — |
| Officers see only owned events | Authorisation matrix | — |
| Email detail restricted to Administrator | FR-NOT-047 | — |
| No trend or dashboard report exists | FR-RPT-011 | No such capability exists |
| Export audited | `AUD-22` | — |

---

## Data Affected

**Reports read only.** No report creates, modifies, or deletes data.

| Exception | Audit |
|---|---|
| Report exported | `AUD-22` |
| Audit trail exported | `AUD-21` |
| Participant list exported | `AUD-22` |

**Reading a report is not audited.** Per [AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md), browsing is
not a state change. Auditing every report view would bury the state changes that matter.

---

## Notifications

**None.** Reports are read on demand.

**PROPOSED.** Officers receive a notification listing events awaiting post-event steps, since
finalisation, completion, and evaluation are the steps most easily forgotten.

---

## Audit Requirements

| Action | Audit class |
|---|---|
| Report viewed | Not audited |
| Participant list exported | `AUD-22` |
| Attendance summary exported | `AUD-22` |
| Audit trail exported | `AUD-21` |

---

## Failure Handling

**Failure:** a report shows counts that disagree with what staff observed.
**Handling:** the report is assembled from records, so a disagreement means a record is wrong. The
records are corrected, not the report. This is intended.

**Failure:** a report is requested for a scope the user lacks.
**Handling:** refused with the scope explained, not silently omitted.

**Failure:** a report takes too long over a large dataset.
**Handling:** scoped queries with pagination. A report that needs every row at once is the wrong
report.

**Failure:** a notification activity report is read as proving students were informed.
**Handling:** the report is explicit about what each figure means. Where this has caused confusion
before, the column headers state the limitation, per NFR-USAB-002.

**Failure:** an officer requests analytics to support a Council proposal.
**Handling:** the raw records are available through the problems-and-recommendations report. **The
organisation should be able to perform its own analysis; ERNS does not perform it for them.**

---

## Completion Criteria

- Every role has the reports it needs to operate
- No report exceeds the access scope of its role
- No report presents a delivery state ERNS cannot measure
- Every export is audited

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| PBRT-01 | Happy path | Student views their registrations | Own records only |
| PBRT-02 | Happy path | Officer views the registration summary | Counts, capacity, remaining slots |
| PBRT-03 | Happy path | Approver views pending approvals | Own queue, with days waiting |
| PBRT-04 | Happy path | Officer views problems and recommendations | Past records listed |
| PBRT-05 | Happy path | Attendance Staff views the live count | Live figures for assigned events |
| PBRT-06 | Invalid | Officer requests another officer's participant list | Refused |
| PBRT-07 | Invalid | Approver requests another office's queue | Refused |
| PBRT-08 | Invalid | Student requests notification activity for an event | Refused |
| PBRT-09 | Unauthorized | Officer exports with email addresses | Not available in the export |
| PBRT-10 | Invalid | Request a trends dashboard | Not available |
| PBRT-11 | Unauthorized | Attendance Staff requests notification activity | Refused |
| PBRT-12 | Boundary | Officer views a report for an event with zero registrations | Empty result shown clearly |
| PBRT-13 | Boundary | Report spanning five years | Returned with pagination |
| PBRT-14 | Failure | Report disagrees with observed counts | Records corrected, not the report |
| PBRT-15 | Failure | Officer requests analytics for a Council proposal | Raw records provided via the problems report |
| PBRT-16 | Unauthorized | Administrator exports email failure detail | Permitted |
| PBRT-17 | Boundary | Report requested during an event | Marked as live data |
| PBRT-18 | Failure | Report figures read as proof of receipt | Headers state what each figure means |
| PBRT-19 | Unauthorized | Audit trail export attempted by an officer | Refused |
| PBRT-20 | Failure | Participant list export | Permitted, `AUD-22` written |

---

## Exit Criteria

- Officers can operate ERNS from reports alone, without maintaining a parallel spreadsheet
- No report overstates what ERNS knows
- `PB-16 Audit and Monitoring` can produce the audit view

---

**Related documents:** [PB-15 Reporting](PB-15-REPORTING.md) ·
[PB-16 Audit and Monitoring](PB-16-AUDIT-MONITORING.md) ·
[NOTIFICATION-WORKFLOW.md](../../planning/NOTIFICATION-WORKFLOW.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[AUDIT-PLAN.md](../../planning/AUDIT-PLAN.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md)