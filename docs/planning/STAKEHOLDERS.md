# Stakeholders

**Document:** ERNS-SH
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Identify every party affected by or able to influence the Event Registration and Notification
System, what each needs from it, what each controls, and what each must decide before
implementation.

This document exists because most of the blocking questions in
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) cannot be answered by a developer. They require a named
office to decide.

---

## Scope

**In scope:** stakeholders, their interests, influence, system roles where applicable, and the
decisions each owns.

**Out of scope:** role permissions, in [USER-ROLES.md](USER-ROLES.md).

---

## 1. Stakeholder Overview

| ID | Stakeholder | Interest | Influence | Role in ERNS |
|---|---|---|---|---|
| SH-01 | Council Secretary | Event coordination and reliable participation records | High | Event Officer, project sponsor |
| SH-02 | Student Council / Council body | Approval governance | High | Approver |
| SH-03 | Dean's office | Institutional approval | High | Approver |
| SH-04 | Student Affairs Office | Student welfare and conduct | Medium | Approver |
| SH-05 | Security Office | Venue safety and large-event clearance | Medium | Approver |
| SH-06 | Club presidents and officers | Dissemination reinforcement | Medium | None. Not a login role |
| SH-07 | Students | Event information and participation | Low formally, highest in number | Student |
| SH-08 | Event-day attendance staff | Accurate, fast attendance | Low | Attendance Staff |
| SH-09 | School IT | Hosting, email, identity | High technically | External dependency |
| SH-10 | System Administrator | Operability and integrity | High | Administrator |
| SH-11 | Developers | Clear rules and workable process | High | Engineering |
| SH-12 | School administration | Records retention and policy compliance | Medium | Governance |

---

## 2. Detailed Analysis

### SH-01 Council Secretary

**Profile.** The interview source. Holds the organisation's coordination role and is accountable
for events proceeding.

**Needs from ERNS.** One place to see every event and every pending approval. Confidence that
students were informed. Reliable participation records. Less dependence on chasing officers.

**Controls.** Event creation authority, publication authority, approval chain configuration, and
the definition of an acceptable process.

**What they must decide.** OQ-01, OQ-05, OQ-07, OQ-08, OQ-09, OQ-12, OQ-13, OQ-14, OQ-15, OQ-17,
OQ-18, OQ-19, OQ-22, OQ-23, OQ-24, OQ-25, OQ-26, OQ-27, OQ-28, OQ-29, OQ-34, OQ-35, OQ-36,
OQ-37, OQ-39, OQ-40.

**Risk if not engaged.** ERNS becomes a tool the Council does not use, and the process reverts to
Facebook and group chats. This is the single largest organisational risk.

**Power-interest note.** High influence, high interest. Must be consulted at every phase gate.

---

### SH-02 Council Body

**Profile.** The deliberative body that approves proposals.

**Needs from ERNS.** To see events awaiting their decision, with the full information needed to
decide, and a record of what was decided.

**Controls.** Final approval authority, subject to OQ-01.

**What they must decide.** OQ-01, OQ-05.

**Risk if not engaged.** Approval queues stall. The interview already reported this.

---

### SH-03 Dean's Office

**Profile.** Institutional oversight.

**Needs from ERNS.** Visibility of which events need their approval, without email chasing.

**Controls.** Whether and when their approval is required.

**What they must decide.** OQ-02, and the thresholds that determine which event types require
their involvement.

**Risk if not engaged.** OQ-02 remains open, and the approval chain cannot be configured, which
blocks the approval module.

---

### SH-04 Student Affairs Office

**Profile.** Student welfare, conduct, and welfare concerns at events.

**Needs from ERNS.** Awareness of major student events and their expected attendance.

**Controls.** Whether and when their approval is required.

**What they must decide.** OQ-03.

---

### SH-05 Security Office

**Profile.** Venue and crowd safety.

**Needs from ERNS.** Advance notice of large events, with venue and expected attendance, so that
clearance is not requested at the last moment.

**Controls.** Approval thresholds, most likely a participant count.

**What they must decide.** OQ-04, including the threshold value. Without a number, the approval
chain cannot be configured.

**Cross-cutting interest.** OQ-22 and the attendance window design interact with security, because
an extended window means people on site outside core hours.

---

### SH-06 Club Presidents and Officers

**Profile.** The current relay for information. Explicitly identified in the interview as a
dependency and a delay risk.

**Needs from ERNS.** Ideally nothing. Their reinforcement role needs no system access.

**Role.** **CONFIRMED.** Not a system login role. See [USER-ROLES.md](USER-ROLES.md) section 2.

**What they must decide.** OQ-23, whether a limited read-only view is wanted, and OQ-37, whether
reinforcement is officially sanctioned.

**Involvement note.** Their interests matter for adoption even though their permissions do not.
Officers who feel the system replaces their role may resist it. Demonstrating that it removes
them from the critical path, rather than disempowering them, affects adoption.

---

### SH-07 Students

**Profile.** The largest stakeholder group and the intended beneficiaries. Reported as not
checking phones, Facebook pages, or group chats, and as asking "what event?" during events.

**Needs from ERNS.** To find out about events without asking. To register without queueing. To know
requirements, materials, and schedule before arriving. To be told when something changes.

**Controls.** Nothing directly. Influence is collective and real: a system students do not open
does not work, regardless of how well it records things.

**What they must decide.** Nothing at design stage. Their behaviour determines whether
notifications succeed.

**Accessibility consideration.** The reported device mix is mobile-heavy, which drives
NFR-RESP-001 through NFR-RESP-004. OQ-34 confirms this.

**Adoption risk.** The system cannot make a student read a notification. PP-02, PP-04, PP-09, and
PP-11 are all partially solved for this reason.

---

### SH-08 Event-Day Attendance Staff

**Profile.** Staffed at event entry. Often different from the Event Officer.

**Needs from ERNS.** A fast, reliable way to record attendance that works when the network or QR
does not. Clear instructions when something is wrong.

**Controls.** Operational attendance decisions within their assigned event, including recording
walk-ins with a reason.

**What they must decide.** Nothing at design stage.

**Design dependency.** Their requirement that a fallback path exist is why `PB-11 Attendance
Backup` is a MUST rather than a contingency, and why the staff-assisted path is built before QR.

---

### SH-09 School IT

**Profile.** Controls hosting, institutional email, and any existing identity infrastructure.

**Needs from ERNS.** A clear statement of requirements, so they can assess whether the school can
host and support it.

**Controls.** Hosting, email sending permission and limits, network policy, backup infrastructure,
and possibly existing identity systems.

**What they must decide.** OQ-29, OQ-30, OQ-31, OQ-32, OQ-33.

**Criticality.** **OQ-30 and OQ-32 are blocking.** Without a hosting arrangement and a permitted
email sender, neither primary function can be delivered as designed.

---

### SH-10 System Administrator

**Profile.** Operates ERNS. In a small organisation this is likely a technically inclined officer
rather than a dedicated role.

**Needs from ERNS.** To manage accounts and roles, configure approval chains, read the audit
trail, and recover from failures without source-code access, per NFR-MAINT-007.

**Controls.** All system configuration. Holds the highest data access.

**What they must decide.** Nothing at design stage.

**Risk.** Concentration of privilege. SD-4 in [USER-ROLES.md](USER-ROLES.md) exists because an
unattributed administrator is a real threat. OQ-24 and OQ-25 address whether that role should be
split or constrained.

---

### SH-11 Developers

**Profile.** A team of two to five. Building ERNS.

**Needs from ERNS.** Explicit requirements with identifiers, a data model, and governance rules
that prevent undocumented decisions.

**Controls.** Implementation. Effectively veto power over architecture proposals.

**What they must decide.** Technology choices within the constraints in `PB-ENG-02`. Every choice
requires stakeholder approval where marked, but the technical recommendation is theirs.

**Process dependency.** The engineering playbooks are binding on them. In particular,
`PB-ENG-20 Change Management` exists because an undocumented framework or database decision is
the most likely way this project goes wrong.

---

### SH-12 School Administration

**Profile.** Institutional governance.

**Needs from ERNS.** Confidence that student records are retained lawfully and that the system
complies with policy.

**Controls.** Records-retention policy. Any policy supersedes the retention assumptions in this
documentation.

**What they must decide.** OQ-28, whether an existing retention policy applies.

**Risk.** If a policy exists and was not discovered during planning, every retention assumption in
[DATA-MODEL.md](DATA-MODEL.md) section 5 and
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) section 12 must be revised.

---

## 3. Decision Authority Map

| Decision | Authority | Consulted |
|---|---|---|
| Final approval authority (OQ-01) | Council body | Dean, Student Affairs, Security |
| Which events need Dean approval (OQ-02) | Dean's office | Council Secretary |
| Which events need Student Affairs approval (OQ-03) | Student Affairs | Council Secretary |
| Security approval threshold (OQ-04) | Security Office | Council Secretary |
| Approval exception path (OQ-05) | Council Secretary | Council body |
| Registration identity (OQ-07) | Council Secretary | IT |
| Notification channel (OQ-13) | Council Secretary | IT |
| Acknowledgement requirement (OQ-14) | Council Secretary | — |
| Publishing authority (OQ-17) | Council Secretary | Council body |
| Post-publication edit rights (OQ-18) | Council Secretary | — |
| Re-approval triggers (OQ-19) | Council Secretary | Approvers |
| Attendance correction authority (OQ-20) | Council Secretary | — |
| Working student accommodation (OQ-22) | Council Secretary | Students, Security |
| Club officer login (OQ-23) | Council Secretary | Club officers |
| Retention periods (OQ-26, OQ-27, OQ-28) | School administration | Council Secretary |
| Backup responsibility (OQ-29) | IT | Council Secretary |
| Hosting platform (OQ-30, OQ-31) | IT | Council Secretary |
| Email sending permission (OQ-32) | IT | — |
| Required reports (OQ-35) | Council Secretary | Officers |
| Technology stack | Developers propose, Council Secretary approves | — |

---

## 4. Adoption Risk

**The system's value depends on behavioural change, not only on software.**

| Risk | Affected stakeholders | Mitigation |
|---|---|---|
| Officers continue relaying through group chats instead of using the system | SH-06 | Make the system faster to use than a group chat; state officially that the system is the channel of record |
| Students do not open notifications | SH-07 | Mobile-first interface; email layer; keep notifications few and consequential |
| Offices continue approving by email outside the system | SH-02, SH-03, SH-04, SH-05 | Make in-system approval faster than email; show idle events |
| Administrator role held by one person with no oversight | SH-10 | Audit everything privileged; OQ-24, OQ-25 |
| Council builds ERNS but never uses it | SH-01 | Council Secretary is a phase-gate approver, not a bystander |

---

## 5. Communication Plan

| Audience | Message | Frequency | Channel |
|---|---|---|---|
| Council Secretary | Planning status and blocking decisions | Per phase gate | Direct review of this documentation |
| Approving offices | Which events need their approval | Once configured | Notification when an event reaches their step |
| Officers | Process changes and training | Before MVP go-live | `PB-01` to `PB-09` |
| Students | What the system does and why | Before launch, then at publication | Notification centre |
| IT | Requirements and open questions | Before implementation | `PB-ENG-15` |
| Developers | Governance rules | On joining, then continuously | Engineering playbooks |

---

## 6. Open Questions by Stakeholder

| Stakeholder | Open questions owned |
|---|---|
| SH-01 Council Secretary | 22 |
| SH-02 Council body | 2 |
| SH-03 Dean's office | 1 |
| SH-04 Student Affairs | 1 |
| SH-05 Security | 1 |
| SH-06 Club officers | 2 |
| SH-07 Students | 0 |
| SH-08 Attendance staff | 0 |
| SH-09 IT | 5 |
| SH-10 Administrator | 1 |
| SH-11 Developers | 0 |
| SH-12 School administration | 1 |
| Joint ownership | 2 (OQ-07, OQ-13) |

---

## 7. Test Scenarios

This is a stakeholder analysis. Validation is documentary.

| ID | Scenario | Expected |
|---|---|---|
| SHK-01 | Every stakeholder from the interview appears | Confirmed, SH-01 to SH-12 |
| SH-02 | Every blocking open question has a named authority | Confirmed, section 3 |
| SH-03 | Every stakeholder with a system role appears in [USER-ROLES.md](USER-ROLES.md) | Confirmed |
| SH-04 | Club Officer appears as a stakeholder without a role | Confirmed, by locked decision |
| SH-05 | Adoption risk is identified for each behavioural dependency | Confirmed, section 4 |
| SHK-06 | No stakeholder is assigned a decision they cannot make | Confirmed |

---

## 8. Completion Criteria

- Every stakeholder identified with interests, influence, and role
- Every open question attributed to an authority
- Adoption risk documented

---

## 9. Exit Criteria

- Council Secretary confirms the stakeholder map is accurate
- Each named authority accepts ownership of their open questions
- A named phase-gate approver is confirmed for the Council

---

**Related documents:** [STAKEHOLDERS.md](STAKEHOLDERS.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) ·
[ROADMAP.md](ROADMAP.md)