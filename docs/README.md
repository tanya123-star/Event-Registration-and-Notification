# ERNS Documentation

**Document:** ERNS-DOCS-ROOT
**Area:** playbooks
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Administrator
**Supersedes:** None

---

## What This Is

Documentation for the **Event Registration and Notification System (ERNS)**.

ERNS has exactly two primary functions:

1. **Event Registration**
2. **Notification**

Everything else — event information, approval, roles, participants, attendance, post-event records,
evaluation, audit, reporting, backup — is subordinate to those two.

> **NOT YET IMPLEMENTED.** No ERNS application code exists. There is no schema, no interface, no
> pipeline, no deployment, and no backup. Every document in this set describes a **target state or a
> rule to be followed when implementation begins**. Nothing here describes a running system.

---

## Read This First

| If you are | Start with |
|---|---|
| **A student** | `playbooks/system/PB-04-EVENT-REGISTRATION.md` |
| **An Event Officer** | `playbooks/system/PB-01-EVENT-CREATION.md`, then `PB-03` |
| **An Approver** | `playbooks/system/PB-02-EVENT-APPROVAL.md` |
| **Attendance Staff** | `playbooks/system/PB-10-QR-ATTENDANCE.md`, then `PB-11` |
| **The Council Secretary** | `planning/PROJECT-OVERVIEW.md`, then `planning/OPEN-QUESTIONS.md` |
| **A developer** | `planning/CONVENTIONS.md`, then `playbooks/engineering/PB-ENG-01-DEVELOPMENT.md` |
| **Reviewing this documentation** | `planning/CONVENTIONS.md` |

---

## Structure

```
docs/
├── planning/          WHAT and WHY. 22 documents
├── playbooks/
│   ├── system/        HOW ERNS is operated. 17 documents
│   └── engineering/   HOW ERNS is built and maintained. 20 documents
└── architecture/      TECHNICAL STRUCTURE. 5 documents
```

| Area | Answers | Audience | Count |
|---|---|---|---|
| `planning/` | Why the system exists, what it must do, who uses it, what is unresolved | Everyone | 22 |
| `playbooks/system/` | How an activity is performed by a person in the organisation | Officers, approvers, staff, students | 17 |
| `playbooks/engineering/` | How a developer safely builds, reviews, tests, secures, deploys, and maintains ERNS | Developers, reviewers, operators | 20 |
| `architecture/` | What the technical structure is and why | Developers, whoever inherits the system | 5 |

**The separation is mandatory.** The index and the rules are in
[`playbooks/README.md`](playbooks/README.md).

---

## The Four Status Labels

Every planning and architecture document distinguishes:

| Label | Meaning |
|---|---|
| **CONFIRMED** | Supported by the interview or an explicit stakeholder instruction |
| **PROPOSED** | A recommended decision not yet ratified |
| **ASSUMPTION** | A working premise, pending confirmation |
| **OPEN QUESTION** | An unresolved decision |

**An ASSUMPTION is never restated as a CONFIRMED requirement** in a downstream document. This rule
exists because the failure is invisible: a reader sees `CONFIRMED` and acts on it, with no way to know
an assumption was upgraded somewhere in between.

---

## Open Questions

**[`planning/OPEN-QUESTIONS.md`](planning/OPEN-QUESTIONS.md) is the canonical registry.** Every
unresolved decision is registered there with an `OQ-NNN` identifier, who can answer it, what it blocks,
and the default assumption that applies if nobody answers.

**Nothing in this document set has been resolved.** Sixteen questions are BLOCKING.

| Critical path | Questions |
|---|---|
| Approval authority | OQ-01, OQ-02, OQ-04 |
| Registration identity | OQ-07 |
| Notification mechanism | OQ-13, OQ-32, OQ-56 |
| Hosting | **OQ-30**, OQ-31 |
| Technology stack | OQ-41 to OQ-50 |
| Backup responsibility | OQ-29 |

**ERNS should not enter implementation until the BLOCKING questions are answered.**

---

## Locked Decisions

These are not open to change through the engineering process.

| Decision | Value |
|---|---|
| System title | Event Registration and Notification System (ERNS) |
| Primary functions | Event Registration; Notification |
| Roles | Administrator, Event Officer, Approver, Student, Attendance Staff. **Club Officer is not a login role** |
| Registration states | `REGISTERED`, `CANCELLED` only |
| Prohibited registration states | `WAITLISTED`, `ATTENDED`, `ABSENT` |
| Capacity | A hard cap. No waiting list |
| Duplicate safeguard | Unique `(user_id, event_id)` at the storage layer |
| Validation order | Authenticated, account active, event published, registration open, deadline, eligibility, capacity, duplicate, required fields |
| Notification source of truth | The in-app centre |
| In-app states | Created, Read, Acknowledged |
| Email states | Queued, Sent, Failed, Bounced |
| Prohibited notification states | `Delivered`, `Opened` |
| Acknowledgement | Required for `IMPORTANT` priority only |
| Out of scope | Facial recognition, AI planning, AI attendance verification, payments, social networking, GPS, recommendation algorithms, analytics dashboards as a core feature |

---

## Out of Scope

ERNS is **not** a general event-management platform. The following are excluded and are not to be
introduced without Council justification through
[`playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md`](playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md):

- Facial recognition
- AI event planning
- AI attendance verification
- Payments
- Social networking
- GPS tracking
- Recommendation algorithms
- Analytics dashboards as a core feature

---

## Key Indexes

| Index | Location |
|---|---|
| Playbook index and separation rules | [`playbooks/README.md`](playbooks/README.md) |
| Requirement-to-test traceability | [`planning/TRACEABILITY-MATRIX.md`](planning/TRACEABILITY-MATRIX.md) |
| Document conventions and identifier schemes | [`planning/CONVENTIONS.md`](planning/CONVENTIONS.md) |
| Open question registry | [`planning/OPEN-QUESTIONS.md`](planning/OPEN-QUESTIONS.md) |
| Authorisation matrix | [`planning/SECURITY-PLAN.md`](planning/SECURITY-PLAN.md) section 4 |
| Technology decisions | [`architecture/TECH-STACK.md`](architecture/TECH-STACK.md) |

---

## Before Implementation Begins

| # | Requirement |
|---|---|
| 1 | All BLOCKING open questions answered and recorded as RESOLVED |
| 2 | Assumptions AS-01, AS-06, and AS-09 confirmed, since each changes a structural design |
| 3 | The technology stack decided per `architecture/TECH-STACK.md` section 4 |
| 4 | Branch protection verified by a test pull request, per `PB-ENG-03` section 3.2 |
| 5 | CI implemented, per `PB-ENG-09`, before any status check is claimed as required |
| 6 | Backup mechanism implemented with a successful restoration test, per `PB-ENG-18` |
| 7 | Council Secretary and the team have signed off the documented owners |

---

**Related documents:** [CONVENTIONS.md](planning/CONVENTIONS.md) ·
[PROJECT-OVERVIEW.md](planning/PROJECT-OVERVIEW.md) ·
[OPEN-QUESTIONS.md](planning/OPEN-QUESTIONS.md) ·
[playbooks/README.md](playbooks/README.md) ·
[TECH-STACK.md](architecture/TECH-STACK.md)