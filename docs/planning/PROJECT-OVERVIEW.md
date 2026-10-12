# Project Overview

**Document:** ERNS-PO
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Provide the single entry point to the Event Registration and Notification System documentation.
This document states what ERNS is, why it exists, what has been decided, what remains open, and
where each topic is documented.

---

## Scope

**In scope:** orientation and navigation for the whole documentation set.

**Out of scope:** all detail. Every topic below has a dedicated document.

---

## 1. What ERNS Is

**Event Registration and Notification System (ERNS)** is a proposed school-based system for
centralised event information and student event registration.

It has exactly two primary functions:

1. **Event Registration** — a student binds themselves to an event; the binding is validated,
   de-duplicated, and recorded.
2. **Notification** — event information is delivered to an addressable audience, and delivery is
   recorded so dissemination is verifiable.

Everything else in ERNS supports those two functions.

### What ERNS is not

**CONFIRMED.** ERNS is not a generic event-management platform, and not an event calendar. A
calendar would make dates visible without addressing registration, notification, or participation
records, which are the actual problems.

---

## 2. Why It Exists

**CONFIRMED.** The organisation lacks a centralised system for communicating event information
and managing student registration.

The current process distributes information through Facebook pages, group chats, meetings,
letters, and club officers. Because no system records what was sent to whom, the organisation
cannot tell whether a student who missed an announcement was never told or told and did not read.

The full analysis is in [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md).

---

## 3. Source of Requirements

This documentation is derived from an interview with the organisation's council secretary. Fifteen
pain points were identified and are recorded as `PP-01` through `PP-15`.

**No requirement in this document set has been ratified by a stakeholder.** All are PROPOSED.
See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md).

---

## 4. Locked Decisions

These are fixed by the governance instruction and MUST NOT be altered by implementation.

| Decision | Value |
|---|---|
| System title | Event Registration and Notification System (ERNS) |
| Primary functions | Event Registration, Notification |
| System roles | Administrator, Event Officer, Approver, Student, Attendance Staff |
| Club Officer | Not a system login role |
| Registration states | `REGISTERED`, `CANCELLED` |
| Prohibited registration states | `WAITLISTED`, `ATTENDED`, `ABSENT` |
| Attendance | A separate entity, not a registration state |
| Capacity | A hard cap. No waitlist |
| Duplicate safeguard | Uniqueness on `(user_id, event_id)` |
| Validation order | 9 steps, [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) section 4 |
| Notification source of truth | In-app notification centre |
| In-app states | `CREATED`, `READ`, `ACKNOWLEDGED` |
| Email states | `QUEUED`, `SENT`, `FAILED`, `BOUNCED` |
| Prohibited notification states | `Delivered`, `Opened` |
| Acknowledgement | Required only for `IMPORTANT` priority |
| Notification-triggering changes | Date/time, venue, mechanics, requirements, materials, dress code, capacity |
| Silent changes | Title-only, description-only |
| Conceptual entities | 15, per [DATA-MODEL.md](DATA-MODEL.md) |
| Out of scope | Facial recognition, AI planning or attendance, payments, social features, GPS, recommendations, analytics dashboards |

---

## 5. Decisions Taken During This Planning Session

| Decision | Resolution | Basis |
|---|---|---|
| Registration identity | Local accounts seeded by the council | No SIS integration assumed |
| Notification channel | School email as the delivery layer, in-app as source of truth | Only channel with confirmed institutional reach |
| Capacity and waitlist | Hard cap, no waitlist | Not requested; adds untested promotion logic |
| Attendance depth | Registered-participants-only, with designed staff fallback | Interview reported QR unreliability |
| Approval configuration | Configurable per-event-type chain | Interview named offices but not when each applies |
| Technology stack | PROPOSED defaults, each paired with an open question | No stack exists; inventing one silently is forbidden |
| Branching model | Trunk-based. `main` deployable, no `develop` | Greenfield single-branch repo |
| CI | Target state specified, marked not yet implemented | No CI exists; claiming otherwise is false |
| Team size | 2 to 5 developers, one required approval | Governance assumption |

---

## 6. Current Repository State

Observed at the time of writing:

| Item | State |
|---|---|
| Branches | `main` only |
| Commits | One initial commit |
| Application code | None |
| Dependency manifest | None |
| CI configuration | None |
| Tags or releases | None |
| Remote | `github.com/tanya123-star/Event-Registration-and-Notification` |

Every engineering playbook therefore carries a not-yet-implemented banner where it describes a
capability that does not yet exist.

---

## 7. Documentation Structure

```
docs/
├── README.md                     ← this document's index
├── planning/                     WHAT the system must accomplish
├── playbooks/
│   ├── README.md                 ← playbook index and separation rule
│   ├── system/                   HOW ERNS is operated
│   └── engineering/              HOW ERNS is built and maintained
└── architecture/                 Technical structure and standards
```

### The separation rule

| Area | Question answered | Audience |
|---|---|---|
| `planning/` | Why and what | Stakeholders, analysts, developers |
| `playbooks/system/` | How ERNS is operated | Officers, approvers, attendance staff |
| `playbooks/engineering/` | How ERNS is built | Developers, reviewers, operators |
| `architecture/` | What it is built from and how it is structured | Developers, reviewers, operators |

A playbook is not a requirement list. An architecture document is not a procedure. When two areas
touch the same subject, the architecture document holds the decision and the playbook references
it.

---

## 8. Document Index

### Planning — 22 documents

| Document | Contents |
|---|---|
| [PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md) | This document. Entry point |
| [CONVENTIONS.md](CONVENTIONS.md) | Status labels, identifiers, terminology. Read first |
| [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) | Fifteen pain points, eight root causes, dispositions |
| [STAKEHOLDERS.md](STAKEHOLDERS.md) | Who is affected, who decides, who is consulted |
| [USER-ROLES.md](USER-ROLES.md) | Five roles, permission matrix, segregation of duties |
| [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) | Two primary functions, eight capability areas, exclusions |
| [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) | 187 requirements with identifiers |
| [NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) | 99 quality requirements across 11 categories |
| [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) | Pain point to requirement to test |
| [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) | Twelve statuses, 19 transitions, guards |
| [APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) | Configurable chains, sequential steps, delegation |
| [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) | Primary function 1. Validation order, confirmation |
| [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) | Primary function 2. States, targeting, change notices |
| [ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) | Supporting. QR, fallback, windows, corrections |
| [POST-EVENT-WORKFLOW.md](POST-EVENT-WORKFLOW.md) | Closure, evaluation, archival, lessons learned |
| [DATA-MODEL.md](DATA-MODEL.md) | 15 conceptual entities, constraints, no SQL |
| [SECURITY-PLAN.md](SECURITY-PLAN.md) | Threats, controls, authorisation matrix |
| [AUDIT-PLAN.md](AUDIT-PLAN.md) | Audit event classes, contents, retention |
| [TESTING-STRATEGY.md](TESTING-STRATEGY.md) | Levels, scenarios, requirement-to-test mapping |
| [MVP.md](MVP.md) | Must, should, could, out of scope |
| [ROADMAP.md](ROADMAP.md) | Eleven phases with entry and exit criteria |
| [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) | Canonical registry. 41 entries, 8 blocking |

### System playbooks — 17 documents

| ID | Title |
|---|---|
| [PB-01](../playbooks/system/PB-01-EVENT-CREATION.md) | Event Creation |
| [PB-02](../playbooks/system/PB-02-EVENT-APPROVAL.md) | Event Approval |
| [PB-03](../playbooks/system/PB-03-EVENT-PUBLISHING.md) | Event Publishing |
| [PB-04](../playbooks/system/PB-04-EVENT-REGISTRATION.md) | Event Registration |
| [PB-05](../playbooks/system/PB-05-REGISTRATION-MANAGEMENT.md) | Registration Management |
| [PB-06](../playbooks/system/PB-06-NOTIFICATION-PUBLISHING.md) | Notification Publishing |
| [PB-07](../playbooks/system/PB-07-NOTIFICATION-TARGETING.md) | Notification Targeting |
| [PB-08](../playbooks/system/PB-08-EVENT-REMINDER.md) | Event Reminder |
| [PB-09](../playbooks/system/PB-09-EVENT-UPDATE-NOTIFICATION.md) | Event Update Notification |
| [PB-10](../playbooks/system/PB-10-QR-ATTENDANCE.md) | QR Attendance |
| [PB-11](../playbooks/system/PB-11-ATTENDANCE-BACKUP.md) | Attendance Backup |
| [PB-12](../playbooks/system/PB-12-POST-EVENT-RECORDS.md) | Post-Event Records |
| [PB-13](../playbooks/system/PB-13-EVENT-EVALUATION.md) | Event Evaluation |
| [PB-14](../playbooks/system/PB-14-EVENT-ARCHIVING.md) | Event Archiving |
| [PB-15](../playbooks/system/PB-15-REPORTING.md) | Reporting |
| [PB-16](../playbooks/system/PB-16-AUDIT-MONITORING.md) | Audit and Monitoring |
| [PB-17](../playbooks/system/PB-17-BACKUP-RECOVERY.md) | Backup and Recovery |

### Engineering playbooks — 20 documents

| ID | Title | ID | Title |
|---|---|---|---|
| [PB-ENG-01](../playbooks/engineering/PB-ENG-01-DEVELOPMENT.md) | Development | [PB-ENG-11](../playbooks/engineering/PB-ENG-11-SECURITY.md) | Security |
| [PB-ENG-02](../playbooks/engineering/PB-ENG-02-TECH-STACK.md) | Tech Stack | [PB-ENG-12](../playbooks/engineering/PB-ENG-12-SECRETS-CONFIGURATION.md) | Secrets and Configuration |
| [PB-ENG-03](../playbooks/engineering/PB-ENG-03-GIT-GITHUB.md) | Git and GitHub | [PB-ENG-13](../playbooks/engineering/PB-ENG-13-DEPENDENCY-MANAGEMENT.md) | Dependency Management |
| [PB-ENG-04](../playbooks/engineering/PB-ENG-04-BRANCHING.md) | Branching | [PB-ENG-14](../playbooks/engineering/PB-ENG-14-DATABASE-CHANGES.md) | Database Changes |
| [PB-ENG-05](../playbooks/engineering/PB-ENG-05-COMMIT-CONVENTIONS.md) | Commit Conventions | [PB-ENG-15](../playbooks/engineering/PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) | Environment Management |
| [PB-ENG-06](../playbooks/engineering/PB-ENG-06-PULL-REQUESTS.md) | Pull Requests | [PB-ENG-16](../playbooks/engineering/PB-ENG-16-RELEASE-MANAGEMENT.md) | Release Management |
| [PB-ENG-07](../playbooks/engineering/PB-ENG-07-CODE-REVIEW.md) | Code Review | [PB-ENG-17](../playbooks/engineering/PB-ENG-17-INCIDENT-RESPONSE.md) | Incident Response |
| [PB-ENG-08](../playbooks/engineering/PB-ENG-08-TESTING.md) | Testing | [PB-ENG-18](../playbooks/engineering/PB-ENG-18-BACKUP-RECOVERY.md) | Backup and Recovery |
| [PB-ENG-09](../playbooks/engineering/PB-ENG-09-CI.md) | Continuous Integration | [PB-ENG-19](../playbooks/engineering/PB-ENG-19-DOCUMENTATION.md) | Documentation |
| [PB-ENG-10](../playbooks/engineering/PB-ENG-10-CD-DEPLOYMENT.md) | Continuous Delivery | [PB-ENG-20](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md) | Change Management |

### Architecture — 5 documents

| Document | Contents |
|---|---|
| [TECH-STACK.md](../architecture/TECH-STACK.md) | Proposed stack with rationale and open questions |
| [SYSTEM-ARCHITECTURE.md](../architecture/SYSTEM-ARCHITECTURE.md) | Conceptual component structure |
| [SECURITY-ARCHITECTURE.md](../architecture/SECURITY-ARCHITECTURE.md) | Trust boundaries and control placement |
| [ENVIRONMENT-ARCHITECTURE.md](../architecture/ENVIRONMENT-ARCHITECTURE.md) | Environment structure and differences |
| [INTEGRATION-BOUNDARIES.md](../architecture/INTEGRATION-BOUNDARIES.md) | External dependencies and their limits |

---

## 9. How to Read This Documentation Set

| If you are | Read |
|---|---|
| The Council Secretary | This document, then [PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) and [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) |
| A Dean, Student Affairs, or Security approver | [APPROVAL-WORKFLOW.md](APPROVAL-WORKFLOW.md) and `PB-02` |
| An Event Officer | [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) and `PB-01` to `PB-09` |
| Attendance staff | [ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) and `PB-10`, `PB-11` |
| A developer | [CONVENTIONS.md](CONVENTIONS.md), [DATA-MODEL.md](DATA-MODEL.md), then the engineering playbooks |
| A reviewer | [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) and `PB-ENG-07` |
| An operator | `PB-ENG-17`, `PB-ENG-18`, `PB-17` |

---

## 10. Project Status

| Item | Status |
|---|---|
| Requirements | Proposed, not ratified |
| Open questions | 41 entries, 8 blocking |
| Architecture | Conceptual only |
| Implementation | Not started |
| CI | Not implemented |
| Deployment | Not selected |
| Backups | Not implemented |
| Open risks | See [ROADMAP.md](ROADMAP.md) |

**ERNS is not ready for implementation.** Eight blocking questions must be answered first. See
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) section 6 for the recommended resolution sequence.

---

## 11. Completion Criteria

- Every documentation area has a defined purpose
- Locked decisions are recorded in one place
- Every document is indexed
- Current project status is stated honestly

---

## 12. Exit Criteria

- Council Secretary confirms the documentation set reflects their intent
- BLOCKING open questions answered
- Implementation authorised as a separate, explicit decision

---

**Related documents:** [CONVENTIONS.md](CONVENTIONS.md) ·
[PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) ·
[SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) ·
[MVP.md](MVP.md) ·
[ROADMAP.md](ROADMAP.md)