# ERNS Playbooks

**Document:** ERNS-PB-README
**Area:** playbooks
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Index the Event Registration and Notification System playbooks and explain the mandatory separation
between system playbooks and engineering playbooks.

---

## The Separation Rule

This separation is **mandatory**.

| Playbook set | Directory | Answers | Audience | Written as |
|---|---|---|---|---|
| **System** | `system/` | How ERNS is operated | Officers, approvers, attendance staff, students | Operational process with validation, data, notifications, audit, failure handling, tests |
| **Engineering** | `engineering/` | How ERNS is built, reviewed, tested, secured, deployed, and maintained | Developers, reviewers, operators | Development rule with owner, mandatory validation, evidence, blockers, exception process |

### Why the separation matters

| If merged | Consequence |
|---|---|
| Operational steps in an engineering document | An officer reads a document about pull requests to find out how to publish an event |
| Development rules in a system document | An officer is asked to approve a code review |
| Ambiguity about who is accountable | Nobody is |

**A system playbook has an actor who is a person in the organisation. An engineering playbook has a
responsibility that is a developer's.**

### The one exception

`PB-17 Backup and Recovery` is a **system** playbook because backup and recovery are operational
responsibilities. `PB-ENG-18 Backup and Recovery` is an **engineering** playbook because
implementing the backup mechanism is a technical task. They are different documents with different
owners, and confusing them is how a backup ends up specified but never implemented.

---

## Structure of Every Playbook

### System playbooks

Every system playbook contains these fifteen sections:

| Section | Contents |
|---|---|
| 1. Purpose | Why the playbook exists |
| 2. Scope | What is and is not covered |
| 3. Trigger | What starts the workflow |
| 4. Actors | Which roles participate |
| 5. Preconditions | What must already be true |
| 6. Main Workflow | Numbered steps |
| 7. Alternative Paths | Exceptions and branches |
| 8. Validation Rules | Required system checks |
| 9. Data Affected | Entities created or updated |
| 10. Notifications | Who is notified |
| 11. Audit Requirements | What is logged |
| 12. Failure Handling | What happens when it fails |
| 13. Completion Criteria | When the workflow is complete |
| 14. Test Scenarios | Six scenario types |
| 15. Exit Criteria | What must be true before the next workflow |

### Engineering playbooks

Every engineering playbook contains these, per the design rule in the governance instruction:

| Section | Contents |
|---|---|
| 1. Purpose | Why the rule exists |
| 2. Scope | Applies to / does not apply to |
| 3. Ownership | Who is responsible |
| 4. The Rule | The procedure itself |
| 5. Mandatory Validation | What must be verified |
| 6. Required Evidence | What must be recorded |
| 7. What Blocks Progression | What prevents moving on |
| 8. Exception Process | How to deviate legitimately |
| 9. Completion Criteria | When the rule is satisfied |
| 10. Test Scenarios | Verification of the rule itself |

---

## Test Scenario Types

Every playbook's Test Scenarios section covers these, where applicable:

| Type | Question answered |
|---|---|
| Happy path | Does the normal case work? |
| Invalid input | Are bad inputs rejected correctly? |
| Duplicate action | Is the same action twice handled? |
| Unauthorized action | Are permissions enforced? |
| Boundary condition | Do the limits behave as specified? |
| Failure or recovery | Does it behave correctly when something breaks? |

**A playbook without failure scenarios is incomplete.** The interview's problems include technical
failure, so a playbook that only describes success describes something ERNS does not do.

---

## System Playbooks — 17

| ID | Title | Owner | Primary function served |
|---|---|---|---|
| [PB-01](system/PB-01-EVENT-CREATION.md) | Event Creation | Event Officer | Supporting |
| [PB-02](system/PB-02-EVENT-APPROVAL.md) | Event Approval | Approver | Supporting |
| [PB-03](system/PB-03-EVENT-PUBLISHING.md) | Event Publishing | Event Officer | Supporting |
| [PB-04](system/PB-04-EVENT-REGISTRATION.md) | Event Registration | Student | **Primary 1** |
| [PB-05](system/PB-05-REGISTRATION-MANAGEMENT.md) | Registration Management | Event Officer | **Primary 1** |
| [PB-06](system/PB-06-NOTIFICATION-PUBLISHING.md) | Notification Publishing | Event Officer | **Primary 2** |
| [PB-07](system/PB-07-NOTIFICATION-TARGETING.md) | Notification Targeting | Event Officer | **Primary 2** |
| [PB-08](system/PB-08-EVENT-REMINDER.md) | Event Reminder | Event Officer | **Primary 2** |
| [PB-09](system/PB-09-EVENT-UPDATE-NOTIFICATION.md) | Event Update Notification | Event Officer | **Primary 2** |
| [PB-10](system/PB-10-QR-ATTENDANCE.md) | QR Attendance | Attendance Staff | Supporting |
| [PB-11](system/PB-11-ATTENDANCE-BACKUP.md) | Attendance Backup | Attendance Staff | Supporting |
| [PB-12](system/PB-12-POST-EVENT-RECORDS.md) | Post-Event Records | Event Officer | Supporting |
| [PB-13](system/PB-13-EVENT-EVALUATION.md) | Event Evaluation | Event Officer | Supporting |
| [PB-14](system/PB-14-EVENT-ARCHIVING.md) | Event Archiving | Event Officer | Supporting |
| [PB-15](system/PB-15-REPORTING.md) | Reporting | Event Officer | Supporting |
| [PB-16](system/PB-16-AUDIT-MONITORING.md) | Audit and Monitoring | Administrator | Supporting |
| [PB-17](system/PB-17-BACKUP-RECOVERY.md) | Backup and Recovery | Administrator | Supporting |

### Event lifecycle order

```
PB-01 Creation → PB-02 Approval → PB-03 Publishing
                                      ↓
        ┌─────────────────────────────┼─────────────────────────────┐
        ↓                             ↓                             ↓
PB-04 Registration            PB-08 Reminder              PB-09 Update
        ↓                             │                             │
PB-05 Registration Mgmt               └──────→ PB-10 Attendance ←────┘
                                              ↓
                                          PB-11 Backup
                                              ↓
                                    PB-12 Post-Event Records
                                              ↓
                                     PB-13 Event Evaluation
                                              ↓
                                      PB-14 Archiving
```

`PB-06 Notification Publishing` and `PB-07 Notification Targeting` are invoked by `PB-03`, `PB-08`,
and `PB-09`. `PB-15 Reporting`, `PB-16 Audit and Monitoring`, and `PB-17 Backup and Recovery` operate
across all events.

---

## Engineering Playbooks — 20

### Development process

| ID | Title | Owner |
|---|---|---|
| [PB-ENG-01](engineering/PB-ENG-01-DEVELOPMENT.md) | Development | Developer |
| [PB-ENG-02](engineering/PB-ENG-02-TECH-STACK.md) | Tech Stack | Developer |

### Version control and review

| ID | Title | Owner |
|---|---|---|
| [PB-ENG-03](engineering/PB-ENG-03-GIT-GITHUB.md) | Git and GitHub | Developer |
| [PB-ENG-04](engineering/PB-ENG-04-BRANCHING.md) | Branching | Developer |
| [PB-ENG-05](engineering/PB-ENG-05-COMMIT-CONVENTIONS.md) | Commit Conventions | Developer |
| [PB-ENG-06](engineering/PB-ENG-06-PULL-REQUESTS.md) | Pull Requests | Developer |
| [PB-ENG-07](engineering/PB-ENG-07-CODE-REVIEW.md) | Code Review | Reviewer |

### Quality

| ID | Title | Owner |
|---|---|---|
| [PB-ENG-08](engineering/PB-ENG-08-TESTING.md) | Testing | Developer |
| [PB-ENG-09](engineering/PB-ENG-09-CI.md) | Continuous Integration | Developer |

### Delivery

| ID | Title | Owner |
|---|---|---|
| [PB-ENG-10](engineering/PB-ENG-10-CD-DEPLOYMENT.md) | Continuous Delivery and Deployment | Developer |
| [PB-ENG-15](engineering/PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) | Environment Management | Developer |
| [PB-ENG-16](engineering/PB-ENG-16-RELEASE-MANAGEMENT.md) | Release Management | Developer |

### Security

| ID | Title | Owner |
|---|---|---|
| [PB-ENG-11](engineering/PB-ENG-11-SECURITY.md) | Security | Developer |
| [PB-ENG-12](engineering/PB-ENG-12-SECRETS-CONFIGURATION.md) | Secrets and Configuration | Developer |
| [PB-ENG-13](engineering/PB-ENG-13-DEPENDENCY-MANAGEMENT.md) | Dependency Management | Developer |
| [PB-ENG-14](engineering/PB-ENG-14-DATABASE-CHANGES.md) | Database Changes | Developer |

### Operations

| ID | Title | Owner |
|---|---|---|
| [PB-ENG-17](engineering/PB-ENG-17-INCIDENT-RESPONSE.md) | Incident Response | Developer, Administrator |
| [PB-ENG-18](engineering/PB-ENG-18-BACKUP-RECOVERY.md) | Backup and Recovery | Developer |
| [PB-ENG-19](engineering/PB-ENG-19-DOCUMENTATION.md) | Documentation | Developer |
| [PB-ENG-20](engineering/PB-ENG-20-CHANGE-MANAGEMENT.md) | Change Management | Developer |

---

## Architecture Documents — 5

Architecture documents describe **technical structure and standards**. They hold the decision; playbooks
reference it and describe the procedure. They do not duplicate playbook content.

| ID | Title | Owner | Purpose |
|---|---|---|---|
| [ERNS-ARCH-TECH](../architecture/TECH-STACK.md) | Technology Stack | Developer | The 16 decision categories, and the 15 constraints any approved stack must satisfy |
| [ERNS-ARCH-SYS](../architecture/SYSTEM-ARCHITECTURE.md) | System Architecture | Developer | Layers, dependency direction, transaction boundaries, structural decisions SD-A to SD-F |
| [ERNS-ARCH-SEC](../architecture/SECURITY-ARCHITECTURE.md) | Security Architecture | Developer | Trust boundaries, enforcement points, verification per control |
| [ERNS-ARCH-ENV](../architecture/ENVIRONMENT-ARCHITECTURE.md) | Environment Architecture | Developer | The four environments, what must differ, constraints EA-1 to EA-4 |
| [ERNS-ARCH-INT](../architecture/INTEGRATION-BOUNDARIES.md) | Integration Boundaries | Developer | External dependencies IB-1 to IB-5, boundary rules BR-1 to BR-5 |

**No technology is selected.** All 16 categories in `TECH-STACK.md` are OPEN QUESTION, registered as
OQ-41 to OQ-55. See the document's implementation status section before relying on any statement in the
architecture set.

---

## Governance Principles

The engineering playbooks collectively enforce these fifteen principles from the governance
instruction:

| # | Principle | Primary playbook |
|---|---|---|
| 1 | Requirements come before implementation | PB-ENG-01, PB-ENG-06 |
| 2 | Security is part of development | PB-ENG-11 |
| 3 | Production branches must be protected | PB-ENG-03, PB-ENG-04 |
| 4 | Changes must be reviewed | PB-ENG-06, PB-ENG-07 |
| 5 | Automated checks run before merging | PB-ENG-09 |
| 6 | Tests validate requirements, not coverage numbers | PB-ENG-08 |
| 7 | Secrets must never be committed | PB-ENG-12 |
| 8 | Dependencies must be controlled | PB-ENG-13 |
| 9 | Database changes must be deliberate and recoverable | PB-ENG-14 |
| 10 | Significant technical decisions must be documented | PB-ENG-02, PB-ENG-20 |
| 11 | Documentation must remain synchronised | PB-ENG-19 |
| 12 | No undocumented architecture-changing decisions | PB-ENG-20 |
| 13 | No direct production changes without an approved process | PB-ENG-10 |
| 14 | Failed validation must block promotion | PB-ENG-08, PB-ENG-09, PB-ENG-16 |
| 15 | No bypassing security or CI to make a build pass | PB-ENG-09, PB-ENG-11 |

---

## Relationship to Other Documentation

| Area | Holds | Cross-reference rule |
|---|---|---|
| `../planning/` | What the system must accomplish | Playbooks reference requirements by ID, never restate them |
| `../architecture/` | Technical structure and standards | Playbooks reference decisions, never duplicate them |
| `system/` | How ERNS is operated | — |
| `engineering/` | How ERNS is built | — |

**Scope test for a new document.** If the document's reader is a person in the organisation, it is a
system playbook. If the reader is a person building or running the system, it is an engineering playbook.
If the document states a technical structure rather than a procedure, it belongs in `../architecture/`.

**A playbook is not a requirement list.** It is a process. Where a rule is a requirement, the
requirement ID is cited and the process explains how it is performed.

---

## Current Implementation Status

> **NOT YET IMPLEMENTED.** ERNS has no application code, no dependency manifest, no CI, no deployment
> configuration, and no backups. Every engineering playbook in this set specifies a target state.

Each engineering playbook that describes a capability which does not yet exist carries a banner
stating so, per [CONVENTIONS.md](../planning/CONVENTIONS.md) section 6. No engineering playbook
claims a control is currently operating.

---

## Writing a New Playbook

1. Decide whether it is a **system** or **engineering** playbook. If unsure, ask who the reader is: a
   person in the organisation, or a person building the system.
2. Use the fifteen-section structure for system playbooks, or the ten-section structure for
   engineering playbooks.
3. Include all six test scenario types where applicable, or state why a type does not apply.
4. Reference requirements by identifier rather than restating them.
5. Label unresolved decisions with `> OPEN QUESTION:` and register them in
   [OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md).
6. Add the playbook to the index above.

---

## Completion Criteria

- System and engineering playbooks are in separate directories and never mixed
- Every playbook has the sections its type requires
- Every playbook includes test scenarios
- Every playbook has an owner
- Cross-references use identifiers rather than restated prose

---

## Exit Criteria

- The Council Secretary confirms the system playbooks match how officers work
- The team confirms the engineering playbooks are workable for two to five developers
- Every documented owner accepts responsibility

---

**Related documents:** [CONVENTIONS.md](../planning/CONVENTIONS.md) ·
[PROJECT-OVERVIEW.md](../planning/PROJECT-OVERVIEW.md) ·
[FUNCTIONAL-REQUIREMENTS.md](../planning/FUNCTIONAL-REQUIREMENTS.md) ·
[TESTING-STRATEGY.md](../planning/TESTING-STRATEGY.md) ·
[SECURITY-PLAN.md](../planning/SECURITY-PLAN.md)