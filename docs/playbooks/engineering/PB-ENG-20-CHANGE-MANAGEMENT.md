# PB-ENG-20 — Change Management

**Playbook:** PB-ENG-20
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

---

## Purpose

Define how a significant technical or requirement change to the Event Registration and Notification
System is proposed, assessed, approved, implemented, and recorded.

Governance principle 12 requires that no architecture-changing decision be undocumented, and principle 10
that significant technical decisions be documented. **This playbook exists because significant changes
otherwise arrive as a side effect of a feature** — a framework replaced because a package needed it, a
constraint dropped because a test was inconvenient, and no record that anyone decided.

---

## Scope

**Applies to:** any change to requirements, architecture, the technology stack, security design,
core workflows, data model, or the governance framework itself.

**Does not apply to:** routine dependency patches, in `PB-ENG-13`; ordinary defects and features, in
`PB-ENG-01`; documentation corrections that do not change meaning, in `PB-ENG-19`.

---

## Ownership

**Responsible:** whoever raises the change.
**Accountable:** the Council Secretary. **Every change in section 2 requires their agreement.**
**Consulted:** IT for infrastructure or hosting changes; the technical owner for the affected module.

---

## 1. What Does Not Require Change Management

**Stated first, because a change process that catches ordinary work stops being used.**

| Change | Route |
|---|---|
| A defect fix | `PB-ENG-01` |
| A feature implementing an existing baselined requirement | `PB-ENG-01` |
| A dependency patch within the pinned range | `PB-ENG-13` |
| A test addition or correction | `PB-ENG-08` |
| A documentation correction that does not change meaning | `PB-ENG-19` |
| A lint or formatting fix | Automated tooling |
| A minor version bump within an approved range | `PB-ENG-13` |
| A new test scenario for an existing requirement | `PB-ENG-08` |

**The test: does it change what the system must do, or how it is built?**

| Question | If yes |
|---|---|
| Does it change a baselined requirement? | Change management |
| Does it change the architecture? | Change management |
| Does it change the approved stack? | Change management |
| Does it alter a security control? | Change management |
| Does it change a core workflow? | Change management |
| Does it add or remove a data-model entity? | Change management |
| Does it change this playbook or another governance document? | Change management |

---

## 2. What Requires Change Management

### 2.1 Requirements

| Change | Why it is significant |
|---|---|
| A baselined requirement is amended | Requirements are the contract everything references |
| A requirement is retired | Its identifier must be recorded as retired, per `CONVENTIONS.md` section 7 |
| A requirement's status changes from PROPOSED to CONFIRMED | The central act of this documentation |
| **An ASSUMPTION is promoted to a requirement** | The most consequential, because the upgrade may be invisible |
| A scope boundary changes | The two primary functions are the boundary |

**Amending a requirement requires the deciding party named in its `OPEN QUESTION` entry**, per
`CONVENTIONS.md` section 1 rule 4.

### 2.2 Architecture and technology

| Change | Registered |
|---|---|---|
| The framework, language, or data store | [TECH-STACK.md](../../architecture/TECH-STACK.md), OQ-41 to OQ-44 |
| A major version of anything | `PB-ENG-13` section 9 |
| The deployment platform | OQ-30 |
| The layer structure | [SYSTEM-ARCHITECTURE.md](../../architecture/SYSTEM-ARCHITECTURE.md) |
| A new external integration | [INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md) |
| An environment added or removed | [ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) |
| **A constraint that a candidate could not satisfy** | Requires the requirement set to be amended first |

### 2.3 Security

| Change | Requirement |
|---|---|
| The authorisation matrix | [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) section 4 |
| **Adding a role, or granting a new permission** | `NFR-SEC-016` permits only the five |
| Removing or weakening a control | `NFR-SEC-005`, deny by default |
| The authentication mechanism | OQ-45 |
| Session policy | `NFR-SEC-003` |
| Data retention | `NFR-AUD-006`, `OQ-26` to `OQ-28` |
| **Sharing personal data with a new party** | `BR-4` in [INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md) |

### 2.4 Workflows and data

| Change | Registered |
|---|---|
| A lifecycle transition added or removed | [EVENT-LIFECYCLE.md](../../planning/EVENT-LIFECYCLE.md) |
| The registration validation order | Locked. `FR-REG-005` |
| A registration state added | **Prohibited.** `REGISTERED` and `CANCELLED` only |
| A notification state added | **Prohibited.** `Delivered` and `Opened` specifically |
| An entity added, removed, merged, or split | [DATA-MODEL.md](../../planning/DATA-MODEL.md) |
| A storage constraint removed | `PB-ENG-14` section 4.2 |
| Approval chain structure | `NFR-MAINT-003` |

### 2.5 Governance

| Change | Why |
|---|---|
| This playbook, or another `PB-ENG-*` | The process is itself architecture |
| A status label definition | `CONVENTIONS.md` section 1 |
| An identifier scheme | `CONVENTIONS.md` section 2 |
| A document structure | `PB-ENG-19` section 1 |
| A governance principle | Principles 1 to 15 |

### 2.6 Prohibited changes

**Certain changes cannot be made by this process at all.** They are locked decisions.

| Prohibited | Authority |
|---|---|
| The system title | Governance instruction |
| The two primary functions | Governance instruction |
| Adding a system role | `NFR-SEC-016`, `FR-USR-011` |
| Giving Club Officer a login | Locked decision. **OQ-23** records it as locked unless reopened |
| Adding a registration state | Locked decision |
| Adding a waiting list | Locked decision. **OQ-11** |
| Adding `Delivered` or `Opened` as a notification state | Locked decision, `FR-NOT-004` |
| Changing the registration validation order | Locked decision, `FR-REG-005` |
| Introducing an out-of-scope feature | [SYSTEM-SCOPE.md](../../planning/SYSTEM-SCOPE.md) |

**Reopening a locked decision requires an explicit Council decision**, recorded in
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) with the deciding party and date. **This playbook
cannot be used to reopen one**, because the process is subordinate to the decision.

---

## 3. The Procedure

**REQUIRED.** Nine steps. No step may be skipped, and **the documentation steps are not optional
because the implementation is urgent.**

| # | Step | Output |
|---|---|---|
| 1 | **Raise** | A written proposal |
| 2 | **Assess impact** | Across the seven areas in section 4 |
| 3 | **Record alternatives** | What else was considered, and why it was rejected |
| 4 | **Security impact** | Explicitly, including "none", with a reason |
| 5 | **Testing impact** | What tests change, and what new ones are needed |
| 6 | **Decide** | By the named authority |
| 7 | **Update documentation first** | Per section 6 |
| 8 | **Implement** | Through `PB-ENG-01`, with the change referenced |
| 9 | **Record** | The decision, its rationale, and its date |

### 3.1 Step 1 — the proposal

**REQUIRED** content:

| Element | Detail |
|---|---|
| What is proposed | Specific, not "improve performance" |
| Why now | The trigger |
| Which area | From section 2 |
| Urgency | Real, or the default pace |
| Who is affected | Students, officers, or developers |

**"Improves maintainability" is not a proposal.** It is a direction. A proposal names what would change.

### 3.2 Step 3 — alternatives

**REQUIRED.** At least one alternative, with the reason it was rejected.

**A single-option proposal is not a proposal.** `PB-ENG-02` section 4 step 2 requires the same for
technology decisions, for the same reason: without it, "evaluating alternatives" is a formality
conducted after the decision has been made.

### 3.3 Step 6 — who decides

| Change | Decided by |
|---|---|
| A requirement status change | The party named in its `OPEN QUESTION` entry |
| Anything with security impact | Council Secretary |
| Anything with student-data impact | Council Secretary |
| A technology or architecture decision | Council Secretary and IT |
| An operational process change | Council Secretary |
| A governance document change | Council Secretary |
| **A locked decision** | **Council, explicitly. Not this process** |

### 3.4 Step 7 — documentation first

**The requirement is amended before the implementation.**

**Why the order matters.** Implementing first means that during the window between the change and the
documentation, someone reads the documentation and designs against the old behaviour. The window is
short, but it exists, and it is exactly when the next developer is exploring the codebase.

For a governance document, the same rule applies: this playbook is amended **before** the change it
governs.

---

## 4. Impact Assessment

**REQUIRED.** Every proposal assesses all seven areas. "Not applicable" is an acceptable answer with a
reason; a blank is not.

| Area | Questions |
|---|---|
| **Requirements** | Which requirements change? Which are unaffected? Is any identifier retired? |
| **Workflows** | Does an operational process change? Does a lifecycle transition change? |
| **Data model** | Does an entity change? Does a constraint change? Is data migration needed? |
| **Security** | Does authorisation change? Is personal data affected? Is a control weakened? |
| **Testing** | Which tests change? What new scenarios are needed? Is coverage of a guarantee lost? |
| **Operations** | Does deployment, backup, or monitoring change? Does an environment change? |
| **Documentation** | Which documents change, and which must change first? |

### 4.1 The security question is asked every time

**Every proposal answers the security question explicitly**, including proposals where the answer is
"no impact".

**Why this is stated as a rule.** The most common serious defect in this class of change is a permission
grant or a data exposure that nobody assessed, because the proposal was about something else entirely.
Asking the question every time is cheaper than discovering the gap.

### 4.2 The testing question covers lost coverage

**A change that removes a guarantee removes the test that verified it.** `PB-ENG-14` section 4.2 lists
the constraints that map to specific scenarios; removing any of them removes a scenario.

**A proposal that reduces a guarantee must state which scenario now fails**, and that is a decision, not
an implementation detail.

---

## 5. Proposal Template

```markdown
## Change proposal

**Area:** Requirements | Architecture | Security | Workflow | Data | Governance
**Raised by:**
**Date:**
**Urgency:** Routine | Time-critical | Emergency

### What is proposed
Specific, including what would change.

### Why now
The trigger.

### Impact assessment
| Area | Impact |
|---|---|
| Requirements | |
| Workflows | |
| Data model | |
| Security | |
| Testing | |
| Operations | |
| Documentation | |

### Alternatives considered
| Alternative | Why rejected |
|---|---|

### Security impact
Explicit, including "no impact" with a reason.

### Testing impact
Tests changed, tests added, guarantees at risk.

### Decision required from
The named authority.

### Prohibited?
Checked against section 2.6: yes | no
```

---

## 6. Documentation Update

**REQUIRED** before implementation, per step 7.

| Change | Documentation updated first |
|---|---|
| A requirement amended | [FUNCTIONAL-REQUIREMENTS.md](../../planning/FUNCTIONAL-REQUIREMENTS.md) |
| An assumption promoted | The requirement, plus `OPEN-QUESTIONS.md` |
| An open question resolved | The registry entry, **plus every document carrying the inline reference** |
| A technology decided | [TECH-STACK.md](../../architecture/TECH-STACK.md), then `PB-ENG-02` |
| An architecture decision | The relevant document in `architecture/` |
| A security control changed | `PB-ENG-11`, `SECURITY-PLAN.md`, `SECURITY-ARCHITECTURE.md` |
| An entity changed | `DATA-MODEL.md` |
| A workflow changed | The system playbook, per `PB-ENG-19` |
| A governance rule changed | The playbook or `CONVENTIONS.md` |

### 6.1 Resolving an open question is a multi-document change

**Per `PB-ENG-19` section 9.1**, marking an entry RESOLVED while another document still carries the
inline reference produces a contradiction.

**All documents are updated together.** Where a decision resolves several entries, all are updated.

---

## 7. Implementation

**REQUIRED**, through the normal process, per `PB-ENG-01`.

| Rule | Reason |
|---|---|
| Implemented on a topic branch | `PB-ENG-04` |
| Reviewed normally | `PB-ENG-07` |
| All checks passing | `PB-ENG-09` |
| The change reference in the pull request | `PB-ENG-06` section 3.1 |
| Tests for the new behaviour | `PB-ENG-08` |
| Migrations reversible | `PB-ENG-14` |

### 7.1 Urgency does not change the process

**A change-management decision is not implemented by skipping review**, and an urgent implementation that
skips it is `PB-ENG-04` section 2.3 hotfix handling: expedited, not exempt.

**The exception exists for an incident**, per `PB-ENG-17`, and is recorded as such afterwards.

### 7.2 Implementation may reveal the proposal was wrong

**PROPOSED.** If implementation reveals the change is not what the proposal described, the implementation
stops and the proposal is revised.

**This is not a failure of process.** A proposal revised in light of implementation is the process
working. The failure is implementing something different from what was approved and recording the
proposal as though it were what happened.

---

## 8. Recording the Decision

**REQUIRED**, per governance principle 10.

| Record | Contains |
|---|---|
| What was decided | Specific |
| When | Date |
| Who decided | Named authority |
| Why | The rationale |
| Alternatives rejected | And the reason for each |
| Impact | Across the seven areas |
| What it supersedes | If anything |

**Where the record lives:** the document the change affects, and `OPEN-QUESTIONS.md` if an entry was
resolved. **Not in the pull request description**, which is not a decision record.

### 8.1 The commit message is not the record

**A commit message cannot hold a rationale of adequate length**, and it is not where a reader will look.
The decision is in the document, and the commit references it.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| The change is not one of section 1's routine categories | Section 1 |
| The change is not prohibited | Section 2.6 |
| A written proposal exists with all nine steps | Section 3 |
| All seven impact areas assessed | Section 4 |
| The security question answered explicitly | Section 4.1 |
| At least one alternative recorded | Section 3.2 |
| The named authority decided | Section 3.3 |
| **Documentation updated before implementation** | Sections 3.4, 6 |
| Every inline reference updated together | Section 6.1 |
| Implemented through the normal process | Section 7 |
| Urgency did not bypass review | Section 7.1 |
| The decision recorded with rationale and date | Section 8 |

## Required Evidence

- The completed proposal template
- The impact assessment across all seven areas
- The alternatives table
- The decision, with the deciding party and date
- The documentation diff, dated before the implementation diff
- The pull request, referencing the decision

## What Blocks Progression

- The change is prohibited, section 2.6
- No proposal exists
- The impact assessment is incomplete or blank
- The security question is unanswered
- No alternative was considered
- The wrong authority decided
- Implementation preceded the documentation
- A resolved open question left an inline reference elsewhere
- Review was skipped for urgency
- The decision is not recorded

## Exception Process

**PROPOSED.** An emergency change proceeds under `PB-ENG-17` and is documented retrospectively, with the
proposal completed within five working days.

**No exception exists for** a prohibited change, a change with no impact assessment, an implementation
before the documentation, or a locked decision reopened through this process. Governance principle 12 is
absolute, and the prohibited items are excluded because the process is subordinate to them.

---

## Completion Criteria

- The change is decided and recorded
- All seven impact areas assessed
- Documentation updated, and updated first
- Every affected inline reference updated
- The implementation reviewed and merged normally
- The decision traceable from the requirement to the code

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| CHG-01 | Happy path | Framework change proposed, assessed, approved, documented, implemented | Recorded, merged |
| CHG-02 | Invalid | Major change with no proposal | **Blocked** |
| CHG-03 | Invalid | Proposal with a single option | Rejected, section 3.2 |
| CHG-04 | Invalid | Impact assessment blank for any area | **Blocked**, section 4 |
| CHG-05 | Failure | Security question marked "not applicable" without a reason | **Blocked**, section 4.1 |
| CHG-06 | Failure | Permission added with no security assessment | **Blocked**, section 4.1 |
| CHG-07 | Failure | Constraint removed, no testing impact stated | **Blocked**, section 4.2 |
| CHG-08 | Failure | Implementation precedes documentation | **Blocked**, section 3.4 |
| CHG-09 | Failure | Open question resolved, inline reference left elsewhere | **Blocked**, section 6.1 |
| CHG-10 | Failure | Implementation differs from the proposal | Stopped; proposal revised, section 7.2 |
| CHG-11 | Unauthorized | Requirement status changed by a developer | **Blocked**, section 3.3 |
| CHG-12 | Failure | ASSUMPTION promoted to CONFIRMED without a decision | **Blocked**, section 2.1 |
| CHG-13 | Invalid | Registration state added | **Prohibited**, section 2.6 |
| CHG-14 | Invalid | `Delivered` or `Opened` notification state added | **Prohibited**, section 2.6 |
| CHG-15 | Invalid | Club Officer given a login | **Prohibited**; OQ-23 is locked unless reopened |
| CHG-16 | Invalid | A waiting list added | **Prohibited**; OQ-11 |
| CHG-17 | Invalid | System role added | **Prohibited**, `NFR-SEC-016` |
| CHG-18 | Invalid | Out-of-scope feature introduced | **Prohibited**, `SYSTEM-SCOPE.md` |
| CHG-19 | Invalid | Locked decision reopened through this process | **Blocked**; Council decision required |
| CHG-20 | Failure | Urgency used to skip review | **Blocked**, section 7.1 |
| CHG-21 | Boundary | Emergency change, documented retrospectively | Permitted, with a deadline |
| CHG-22 | Boundary | Dependency patch within the pinned range | **Not** a change-management item, section 1 |
| CHG-23 | Boundary | Defect fix | **Not** a change-management item |
| CHG-24 | Failure | Decision recorded only in a commit message | Rejected, section 8.1 |
| CHG-25 | Failure | Governance playbook changed without change management | **Blocked**, section 2.5 |
| CHG-26 | Failure | Retention period changed without `OQ-28` resolved | **Blocked**, section 2.3 |
| CHG-27 | Failure | Personal data shared with a new party, unassessed | **Blocked**, section 2.3 |
| CHG-28 | Failure | Identifier reused after a requirement was retired | **Blocked**, `PB-ENG-19` section 5.1 |
| CHG-29 | Invalid | Authorisation matrix changed | **Blocked**; Council Secretary |
| CHG-30 | Failure | Entity merged for storage convenience | **Blocked**, section 2.4 |

---

## Exit Criteria

- The change is decided, documented, implemented, and recorded
- The decision is traceable from requirement through documentation to code
- No prohibited change has entered the system
- The procedure has been exercised at least once, so it is known to work
- The "not yet implemented" banner is not needed here, since the process is usable now

---

**Related documents:** [PB-ENG-20 Change Management](PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[PB-ENG-01 Development](PB-ENG-01-DEVELOPMENT.md) ·
[PB-ENG-02 Tech Stack](PB-ENG-02-TECH-STACK.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[PB-ENG-19 Documentation](PB-ENG-19-DOCUMENTATION.md) ·
[CONVENTIONS.md](../../planning/CONVENTIONS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md) ·
[SYSTEM-SCOPE.md](../../planning/SYSTEM-SCOPE.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[TECH-STACK.md](../../architecture/TECH-STACK.md)