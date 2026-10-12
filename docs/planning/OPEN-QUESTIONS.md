# Open Questions

**Document:** ERNS-OQ
**Area:** planning
**Status:** Open
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

This is the canonical registry of unresolved decisions for the Event Registration and Notification
System. Every assumption the plan depends on is registered here with the stakeholder who can
resolve it and what it blocks.

Nothing in this document may be deleted. Entries are marked RESOLVED with a date and deciding
party. This file is the project's decision history.

---

## Scope

**In scope:** every unresolved decision affecting planning, architecture, or implementation.

**Out of scope:** resolved decisions, which live in the document that implements them and are
retained here as RESOLVED entries.

---

## 1. How to Use This Register

Inline `> OPEN QUESTION:` references in other documents point to an `OQ-NNN` entry here. An
inline reference without a registry entry is a documentation defect.

Each entry records the question, why it matters, who can answer, what it blocks, and the default
assumption that applies if nobody answers before implementation begins.

**Default assumptions are provisional.** Where an assumption is load-bearing for correctness
rather than convenience, the blocker is marked BLOCKING and the phase must not start until it is
answered.

### 1.1 Counting rules for open and resolved questions

Recorded 2026-10-09 by Developer / Technical Owner. These rules exist because the counts in section
5 were previously derived by hand and did not reconcile with the entries above.

1. **A question closes when its stated scope has been answered by the appropriate
   decision-maker.** Not when it has been answered by anyone.
2. **A technology or architecture question closes only when the Council Secretary and IT have both
   recorded agreement, and the decision is recorded with its date and deciding parties.**
   [PB-ENG-20](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md) section 3.3 assigns
   technology and architecture decisions to *"Council Secretary and IT"*;
   [TECH-STACK.md](../architecture/TECH-STACK.md) section 4 requires steps 5 to 7 before a category is
   decided — recorded agreement, a record naming the deciding parties, and the register entry marked
   RESOLVED in the same change. A recorded technical direction is progress, not closure. Seven
   questions are governed by this rule: OQ-41, OQ-42, OQ-43, OQ-44, OQ-45, OQ-47 and OQ-50.
3. **A question closes only on the answer of the authority its own entry names.** Each entry's
   *Who can answer* field is the operative authority for that entry, per `PB-ENG-20` section 3.3. OQ-07
   names Council Secretary and IT and is therefore not closed by a technical decision. No general
   delegation to the Developer / Technical Owner is assumed; where an entry names an authority, that
   authority decides. Where the governing rules conflict, as at OQ-47, the conflict is recorded as a
   question rather than resolved — see OQ-63.
4. **A question stays open while a precondition named inside it is unresolved.** OQ-50 names
   OQ-32 sending permission as a precondition, so OQ-50 remains open while OQ-32 is open.
5. **A locked decision cannot be silently reopened through a technical playbook.** Where a question
   would reopen a locked decision, it stays open regardless of a project-level answer.
6. **Newly proposed entries are counted separately from the original baseline.** Entries OQ-60
   onward were added after the original register was baselined, and are marked as proposed at the
   point of addition.

**Consequence for decision-making.** A question may be recorded as decided by the Developer /
Technical Owner while the authority named in `PB-ENG-20` section 3.3 has not ratified. Both facts
are recorded. Neither may be represented as the other.

---

## 2. Priority Definitions

| Priority | Meaning |
|---|---|
| BLOCKING | Implementation of the affected module cannot begin without an answer |
| HIGH | A safe default exists, but the default may need rework |
| MEDIUM | Affects quality or effort, not correctness |
| LOW | Documentation clarity or future refinement |

---

## 3. Open Questions

### Approval Authority

**OQ-01 — Who has final approval authority?**
Priority: BLOCKING
Blocks: Approval chain configuration
Why it matters: The interview named Council, Dean, Student Affairs, and Security but never
established who holds final authority. The whole approval module depends on this.
Who can answer: Council Secretary, Dean, Student Affairs Office
Default assumption: Council holds final authority; other offices advise.
Status: OPEN

**OQ-02 — Which events require Dean approval?**
Priority: BLOCKING
Blocks: Per-event-type chain configuration
Who can answer: Dean's office
Default assumption: Events requiring external coordination or off-campus venues require Dean
approval. Event types are not yet enumerated, so this cannot be finalised.
Status: OPEN

**OQ-03 — Which events require Student Affairs approval?**
Priority: HIGH
Blocks: Per-event-type chain configuration
Who can answer: Student Affairs Office
Default assumption: Organization-wide assemblies and events involving minors or external
participants.
Status: OPEN

**OQ-04 — When is Security approval required?**
Priority: BLOCKING
Blocks: Per-event-type chain configuration
Who can answer: Security Office, Council Secretary
Default assumption: Events exceeding a participant threshold, or events at non-standard venues.
The threshold is undefined and must be supplied by the Security Office.
Status: OPEN

**OQ-05 — Should an exception path exist for events that cannot obtain approval in time?**
Priority: HIGH
Blocks: `T-11` transition logic in [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md)
Why it matters: The interview reported events stalling between offices. If late events simply
cannot be published, staff will work around the system.
Who can answer: Council Secretary
Default assumption: An Administrator-only exception path with recorded justification, as
specified in [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 5. If rejected, `T-11` has no
exception branch.
Status: OPEN

**OQ-06 — Is an Approver an office account or a personal account?**
Priority: HIGH
Blocks: Role assignment, approval validity on staff change
Why it matters: A personal account means approvals become invalid when staff change hands; an
office account means accountability is weaker.
Who can answer: Council Secretary
Default assumption: Office account, with named delegation recorded per decision.
Status: OPEN

---

### Registration

**OQ-07 — Must registration require login, or is student number plus institutional email
sufficient?**
Priority: BLOCKING
Blocks: `FR-REG-*` authentication requirements, duplicate-prevention strength
Why it matters: Duplicate prevention relies on unique `(user_id, event_id)`. Without a login,
identity is weaker and a duplicate under a second account is possible.
Who can answer: Council Secretary, IT
Default assumption: Login required. This is the only assumption that makes the duplicate
constraint authoritative, so it should not be relaxed without accepting duplicate risk.
Status: OPEN

### OQ-07 Proposed Decision — NOT APPROVED

> **THIS IS NOT A RESOLUTION.** It is a proposal prepared by the Developer / Technical Owner on
> 2026-10-09 and recorded per [PB-ENG-20](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md)
> section 8 for review. **The question remains OPEN.** This entry's *Who can answer* field names
> **Council Secretary and IT**, and `PB-ENG-20` section 3.3 assigns a requirement status change to
> the party named in the entry and anything with security impact to the Council Secretary. A
> Developer / Technical Owner cannot close it. An earlier state of this file marked OQ-07 RESOLVED;
> that was incorrect and has been reverted on 2026-10-09.

| Field | Entry |
|---|---|
| What is proposed | Registration requires an authenticated institutional Google identity. A school email address alone does **not** authorise access. Account authorisation is held by the Administrator and is evaluated separately from identity verification. |
| When proposed | 2026-10-09 |
| Proposed by | Developer / Technical Owner, ERNS |
| Approval required from | Council Secretary and IT, per this entry's *Who can answer* and `PB-ENG-20` section 3.3 |
| Why | Under institutional Google sign-in there is no identity path that bypasses authentication, so a stable `user_id` always exists and the unique `(user_id, event_id)` constraint is authoritative. `AS-01` is satisfied by construction, which resolves PP-12's duplicate-registration risk. |
| Alternatives rejected | **Student number plus institutional email, no login** — rejected: a second account under the same student produces a duplicate, defeating the only authoritative duplicate-prevention layer. **Local passwords** — superseded by OQ-45, which selects institutional single sign-on. **Automatic provisioning on first sign-in** — rejected: it would grant the Student role from an email domain alone and contradict FR-USR-005 and INV-3. |
| Impact — Requirements | FR-USR-001 and FR-REG-006 identified as the applicable requirements. FR-USR-005, FR-USR-009 unchanged and remain the governing provisioning and suspension rules. No identifier retired. |
| Impact — Workflows | Registration step 1 of the locked nine-step order is unchanged. Provisioning becomes an Administrator action preceding first functional use. |
| Impact — Data model | None. An external identity key is proposed under OQ-45 and is not authorised. |
| Impact — Security | Authentication and authorisation are separated. The institutional domain allowlist is enforced on the backend; a successful Google sign-in is never treated as application authorisation. Denial scenarios required (new `AUTH-*` cases). |
| Impact — Testing | New scenarios required for disallowed domain, unverified email, and suspended-account denial. Existing RV-06 and REG-06 unaffected. |
| Impact — Operations | No change. Institutional identity provisioning is tracked under OQ-60 and remains unresolved. |
| Impact — Documentation | This entry; `AS-01` in section 4; `SECURITY-PLAN.md` section 5; `REGISTRATION-WORKFLOW.md`. |
| What it would supersede on approval | The default assumption recorded at this entry, and `AS-01` status PROVISIONAL |

> **NOTHING IS APPROVED BY THIS RECORD.** No institutional approval is represented as granted. OQ-60
> (Workspace tenancy), OQ-62 (sender mailbox and delegation) and OQ-32 (sending permission) remain
> OPEN. `AS-01` remains load-bearing and is **not** confirmed.

**OQ-08 — What information must a student provide at registration?**
Priority: HIGH
Blocks: Registration form fields, `student_context` contents
Who can answer: Council Secretary
Default assumption: No additional input. Name, programme, year level, and organisation are read
from StudentProfile rather than re-entered. Event-specific questions may be added per event type.
Status: OPEN

**OQ-09 — Are there event capacity limits, and who sets them?**
Priority: HIGH
Blocks: Capacity validation
Who can answer: Council Secretary, venue owners
Default assumption: Capacity is optional per event, a hard cap when present, set by the owning
Event Officer at creation and adjustable afterwards with notification on change.
Status: OPEN

**OQ-10 — Does a cancelled registration permanently consume a slot?**
Priority: HIGH
Blocks: `Registration` uniqueness constraint, [DATA-MODEL.md](DATA-MODEL.md) section 2.11
Who can answer: Council Secretary
Default assumption: Cancellation releases the slot and permits re-registration. This requires the
unique constraint on `(user_id, event_id)` to permit a fresh row, which is the simplest reading
of "prevent duplicate registration".
Status: OPEN

**OQ-11 — Should there be a waiting list?**
Priority: MEDIUM
Blocks: Nothing currently; capacity is a hard cap by locked decision
Why it matters: The interview did not request one. Recorded so the decision is deliberate rather
than accidental.
Who can answer: Council Secretary
Default assumption: No waiting list, per locked decision.
Status: OPEN — decision recorded as locked unless reopened

**OQ-12 — Should students be able to cancel their own registration?**
Priority: HIGH
Blocks: Cancellation permission
Who can answer: Council Secretary
Default assumption: Yes, until registration closes. After closure, cancellation requires an
officer.
Status: OPEN

---

### Notification

**OQ-13 — What notification mechanism is officially supported?**
Priority: BLOCKING
Blocks: Entire notification module
Why it matters: Determines which delivery states are measurable. Email alone cannot prove
delivery or opening.
Who can answer: Council Secretary, IT
Default assumption: In-app notification centre as source of truth, with school email as a
delivery layer. Reflects the interview's existing use of email and the inability to verify open
status.
Status: OPEN

**Related:** OQ-56 concerns the size of the email-state domain and is also blocking.

**OQ-14 — Should important announcements require acknowledgement?**
Priority: HIGH
Blocks: Acknowledgement implementation
Who can answer: Council Secretary
Default assumption: Yes for `IMPORTANT` priority only. Acknowledgement records user,
notification, and timestamp.
Status: OPEN

**OQ-15 — How long should notifications remain available to students?**
Priority: MEDIUM
Blocks: Notification retention
Who can answer: Council Secretary
Default assumption: Notifications remain readable for the academic year following
dispatch, then are retained for audit only.
Status: OPEN

**OQ-16 — What lead time should event reminders use?**
Priority: MEDIUM
Blocks: Reminder scheduling
Who can answer: Event Officer
Default assumption: 24 hours before event start, plus 1 hour before when registration is
required.
Status: OPEN

---

### Event Information

**OQ-17 — Who can publish an approved event?**
Priority: HIGH
Blocks: `T-11` authorisation
Who can answer: Council Secretary
Default assumption: Event Officer who created it, or an Administrator. Not the approving user,
per segregation of duties SD-1.
Status: OPEN

**OQ-18 — Who can modify event information after publication?**
Priority: HIGH
Blocks: Post-publication edit permissions
Who can answer: Council Secretary
Default assumption: Owning Officer for notification-triggering fields; Administrator for
date/time and venue; both audited.
Status: OPEN

**OQ-19 — Which event changes require a new approval?**
Priority: HIGH
Blocks: Change classes in [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 6
Who can answer: Council Secretary
Default assumption: Date, time, and venue changes require re-approval. Other
notification-triggering changes do not.
Status: OPEN

---

### Attendance

**OQ-20 — Who can correct an attendance record after the event?**
Priority: HIGH
Blocks: Correction authorisation
Who can answer: Council Secretary
Default assumption: Attendance Staff and Administrator, both with mandatory reason.
Status: OPEN

**OQ-21 — May students who are not registered attend, and under what exception?**
Priority: HIGH
Blocks: Attendance eligibility rule
Who can answer: Council Secretary
Default assumption: Only registered participants, except where an Attendance Staff member records
a walk-in with a reason, which creates an audited exception rather than a silent record.
Status: OPEN

**OQ-22 — How are working students accommodated for attendance?**
Priority: HIGH
Blocks: Attendance window design
Why it matters: The interview reported that working students cannot attend fixed periods, and
that attendance is sometimes kept open before and after the event.
Who can answer: Council Secretary
Default assumption: Configurable attendance windows per event, so an event may permit arrival
before start and departure after end, with each scan attributed to its window.
Status: OPEN

---

### Roles and Access

**OQ-23 — Should club officers receive a limited read-only login?**
Priority: MEDIUM
Blocks: Optional Officer-facing view
Who can answer: Council Secretary
Default assumption: No login. Club Officer is not a system role by locked decision; officers are
reinforcement recipients only.
Status: OPEN — decision recorded as locked unless reopened

**OQ-24 — Should the Administrator role be split into technical and business administrators?**
Priority: MEDIUM
Blocks: Role model refinement
Who can answer: Council Secretary
Default assumption: Single Administrator role, with all privileged actions audited and attributed.
Status: OPEN

**OQ-25 — Should the Administrator be able to edit registrations and attendance directly?**
Priority: HIGH
Blocks: Segregation of duties SD-4
Who can answer: Council Secretary, Council
Default assumption: Yes, but only with a mandatory reason and a full audit trail.
Status: OPEN

---

### Data and Retention

**OQ-26 — How long should registration records be retained?**
Priority: MEDIUM
Blocks: Retention configuration
Who can answer: Council Secretary, school records policy
Default assumption: Retained for the duration of the academic year plus one, then archived.
Status: OPEN

**OQ-27 — How long should attendance records be retained?**
Priority: MEDIUM
Blocks: Retention configuration
Who can answer: Council Secretary, school records policy
Default assumption: Same as registration records.
Status: OPEN

**OQ-28 — Is there an existing school records-retention policy ERNS must comply with?**
Priority: HIGH
Blocks: Entire retention design
Who can answer: School administration
Default assumption: None known. If a policy exists, it supersedes every retention assumption here.
Status: OPEN

**OQ-29 — Who is responsible for backups and restoration?**
Priority: BLOCKING
Blocks: Operational ownership
Who can answer: Council Secretary, IT
Default assumption: IT owns infrastructure backups; Administrator owns verification.
Status: OPEN

---

### Technology and Infrastructure

**OQ-30 — What deployment platform will host ERNS?**
Priority: BLOCKING
Blocks: `PB-ENG-10 CD/Deployment`, `PB-ENG-15 Environment Management`
Who can answer: IT, Council Secretary
Default assumption: None selected. No platform is assumed anywhere in this documentation.
Status: OPEN

**OQ-31 — Is there an existing school server or hosting arrangement?**
Priority: HIGH
Blocks: Hosting decision, cost model
Who can answer: IT
Default assumption: Unknown.
Status: OPEN

**OQ-32 — Does the school provide institutional email that ERNS may send from?**
Priority: BLOCKING
Blocks: Email delivery
Who can answer: IT
Default assumption: School email exists but sending permission, rate limits, and deliverability
are unverified.
Status: OPEN

**OQ-33 — Is there an existing student information system ERNS could read?**
Priority: MEDIUM
Blocks: Identity seeding effort
Who can answer: IT, Registrar
Default assumption: No integration. Student data is seeded and maintained by the council.
Status: OPEN

**OQ-34 — What device and browser mix do students and staff use?**
Priority: MEDIUM
Blocks: Accessibility and responsive targets
Who can answer: Council Secretary
Default assumption: Predominantly mobile phone access for students; desktop for staff. This
assumption drives a mobile-first student interface.
Status: OPEN

---

### Reports and Operations

**OQ-35 — What reports are actually required by the organisation?**
Priority: MEDIUM
Blocks: Reporting scope
Who can answer: Council Secretary
Default assumption: Upcoming events, open registrations, participant list, attendance summary,
notification activity, pending approvals. No analytics dashboards.
Status: OPEN

**OQ-36 — How should post-event evaluation be completed, and by whom?**
Priority: MEDIUM
Blocks: Evaluation workflow
Who can answer: Council Secretary
Default assumption: Event Officer completes within a set window after the event; Administrator
reviews before archiving.
Status: OPEN

**OQ-37 — Are club officers expected to reinforce notifications, and is that officially
sanctioned?**
Priority: LOW
Blocks: Documentation of the reinforcement channel
Who can answer: Council Secretary
Default assumption: Yes, as a secondary channel after official notification, not as the primary
channel.
Status: OPEN

---

### Documentation Governance

**OQ-38 — Which identifier scheme owns the `AUD` prefix?**
Priority: LOW
Blocks: Naming consistency across the document set
Why it matters: `FR-AUD-001` through `FR-AUD-010` are functional requirements using the `AUD`
prefix, while `AUD-01` through `AUD-15` are audit event classes. The same three letters carry two
different meanings. Raised by the verification pass recorded in
[TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md).
Who can answer: Documentation owner, Administrator
Default assumption: Keep both schemes. The numeric suffixes are distinguishable by the `FR-`
prefix, and the audit catalogue reads better as `AUD-NN`. The alternative is renaming the
functional set to `FR-GOV-*` for governance.
Status: OPEN

**OQ-39 — Should event evaluation submission have a deadline after the event?**
Priority: LOW
Blocks: Evaluation workflow design
Who can answer: Council Secretary
Default assumption: No hard deadline, because a deadline nobody meets produces no useful record.
An event may be archived only after an evaluation exists.
Status: OPEN

**OQ-40 — Should officers see per-recipient email state, or aggregate read counts only?**
Priority: MEDIUM
Blocks: Scope of FR-NOT-045, FR-NOT-046, and FR-NOT-047
Why it matters: FR-NOT-047 restricts email addresses and failure detail to Administrators. If
officers need to see which addresses bounced, that restriction must be revisited.
Who can answer: Council Secretary
Default assumption: Officers see aggregate read and acknowledgement counts only, never email
addresses or per-recipient failure detail.
Status: OPEN

---

### Technology Stack

Raised by the architecture review of
[TECH-STACK.md](../architecture/TECH-STACK.md) on 2026-10-02. All sixteen categories in that
document's section 3 are OPEN. **No technology has been selected, and none is named.**

**OQ-41 — Which frontend framework?**
Priority: BLOCKING
Blocks: `TC-01` in [TECH-STACK.md](../architecture/TECH-STACK.md), and all interface implementation
Why it matters: Sets the delivered-asset budget against NFR-RESP-004 for low-end Android, and the
semantic control NFR-A11Y-001 requires.
Who can answer: Council Secretary, IT
Default assumption: None selected.
Status: OPEN

**OQ-42 — What is the backend approach?**
Priority: BLOCKING
Blocks: `TC-02`, and any implementation
Why it matters: Determines whether authorisation and dispatch logic are separable and independently
testable, per NFR-SEC-004 and NFR-PERF-004.
Who can answer: Council Secretary, IT
Default assumption: None selected.
Status: OPEN

**OQ-43 — Which programming language and runtime version?**
Priority: BLOCKING
Blocks: `TC-03`
Why it matters: Determines the support lifetime and whether a successor maintainer can learn it.
Depends on OQ-42.
Who can answer: IT
Default assumption: None selected.
Status: OPEN

**OQ-44 — Which data store engine?**
Priority: BLOCKING
Blocks: `TC-04`, schema design, `PB-ENG-14 Database Changes`
Why it matters: Constrained by NFR-INTEG-001, NFR-INTEG-002, NFR-INTEG-007, and NFR-BACKUP-004,
which together require composite uniqueness at the storage layer and a transactional check-then-write
boundary.
Who can answer: IT
Default assumption: Relational, engine not selected. Recorded as **PROPOSED** in
[TECH-STACK.md](../architecture/TECH-STACK.md) section 2. [DATA-MODEL.md](DATA-MODEL.md) remains
storage-neutral and does not decide this.
Status: OPEN

**OQ-45 — Which authentication mechanism?**
Priority: BLOCKING
Blocks: `TC-05`, all `FR-REG-*` identity guarantees, NFR-SEC-002
Why it matters: Determines whether ERNS manages passwords at all. OQ-07 makes login mandatory for
duplicate-prevention strength, so this decision cannot be deferred past registration implementation.
Who can answer: IT, Council Secretary
Default assumption: Local credentials with non-recoverable storage, per
[SECURITY-PLAN.md](SECURITY-PLAN.md) section 5. Subordinate to OQ-33: if institutional single sign-on
exists, local credential handling reduces.
Status: OPEN

**OQ-46 — What is the styling and UI approach?**
Priority: MEDIUM
Blocks: `TC-06`
Why it matters: Must support NFR-A11Y-004, which forbids conveying registration or attendance status
by colour alone.
Who can answer: Council Secretary
Default assumption: None selected.
Status: OPEN

**OQ-47 — Which test tooling?**
Priority: BLOCKING
Blocks: `TC-07`, `PB-ENG-09 CI`
Why it matters: Must support the integration-level concurrency scenarios CON-01 to CON-07, which are
the only tests that justify NFR-INTEG-007. Unit tests cannot verify a storage-layer constraint.
Who can answer: Developer
Default assumption: None selected.
Status: OPEN

**OQ-48 — Which build tooling?**
Priority: HIGH
Blocks: `TC-08`, every CI step in `PB-ENG-09 CI`
Who can answer: Developer
Default assumption: None selected.
Status: OPEN

**OQ-49 — Which package manager?**
Priority: HIGH
Blocks: `TC-10`, lockfile policy in `PB-ENG-13 Dependency Management`
Who can answer: Developer
Default assumption: None selected.
Status: OPEN

**OQ-50 — Which email transport?**
Priority: BLOCKING
Blocks: `TC-11`, the email delivery layer of Primary Function 2
Why it matters: Depends entirely on OQ-32. Sending permission, rate limits, and deliverability are
unverified, and an unpermitted transport would fail silently in production.
Who can answer: IT
Default assumption: None selected.
Status: OPEN

**OQ-51 — What executes background dispatch work?**
Priority: HIGH
Blocks: `TC-12`, NFR-PERF-004, NFR-PERF-005
Why it matters: Organisation-wide notification dispatch must not block the requesting officer's
session and must run with observable progress.
Who can answer: IT, Developer
Default assumption: None selected.
Status: OPEN

**OQ-52 — Where does the repository live, and who owns the organisation account?**
Priority: HIGH
Blocks: `TC-13`, all of `PB-ENG-03 Git and GitHub`, branch protection, required reviewers
Why it matters: A repository owned by an individual developer becomes unavailable when that
developer leaves, taking the branch protection rules and history with it.
Who can answer: Council Secretary
Default assumption: None selected.
Status: OPEN

**OQ-53 — Which observability tooling?**
Priority: HIGH
Blocks: `TC-14`, NFR-MAINT-004, NFR-MAINT-005
Why it matters: Without log aggregation and a shared correlation identifier, diagnosing a failed
notification dispatch or registration is guesswork.
Who can answer: IT
Default assumption: None selected.
Status: OPEN

**OQ-54 — Which runtime and operating system versions?**
Priority: HIGH
Blocks: `TC-15`, patch and end-of-support exposure
Why it matters: Determines who applies security patches and by when. A version past end of support
becomes the previous maintainer's unpaid problem.
Who can answer: IT
Default assumption: None selected.
Status: OPEN

**OQ-55 — Will a staging environment exist?**
Priority: HIGH
Blocks: `TC-16`, `PB-ENG-10 CD/Deployment`, `PB-ENG-16 Release Management`, migration rehearsal
Why it matters: Without a staging environment, schema migrations and releases reach production
unrehearsed. NFR-INTEG-007 guarantees and NFR-AVAIL-003 maintenance-window constraints are both
harder to honour when the first execution of a migration is the production one.
Who can answer: IT, Council Secretary
Default assumption: None. **No staging environment exists**, and none is assumed anywhere in this
documentation.
Status: OPEN

---

### Engineering Governance Gaps

Raised while writing the engineering playbooks on 2026-10-02. These are gaps in the governance
framework itself, not in the system. Each one has a safe default, so none blocks implementation; each
one should be closed before the corresponding mechanism is built.

**OQ-57 — What is the secret rotation period for each environment?**
Priority: HIGH
Blocks: Rotation periods in `PB-ENG-12 Secrets and Configuration` section 7
Why it matters: `PB-ENG-12` states that no period is asserted without a basis, because rotation
frequency depends on a storage platform that has not been selected. A recorded, agreed period is
better than none; an invented one is not.
Who can answer: IT, Council Secretary
Default assumption: Rotate on any suspicion of exposure, and on the departure of anyone with access.
No calendar period is asserted until IT sets one.
Status: OPEN

**OQ-58 — Which identifier prefix owns the engineering-playbook test scenarios?**
Priority: LOW
Blocks: Naming consistency across the document set
Why it matters: `PB-ENG-11 Security` had to introduce a `SECS-` prefix for its own scenarios because
`SEC-01` through `SEC-26` are already used by the scenario catalogue in
[SECURITY-PLAN.md](SECURITY-PLAN.md) section 9. The two sets are distinguishable by prefix but a
reader encountering `SEC-04` in a code review may not know which set it belongs to. Compare OQ-38,
which records the same problem for the `AUD` prefix.
Who can answer: Documentation owner, Administrator
Default assumption: Keep the `SECS-` prefix for playbook-local scenarios, and rely on the `SEC-nn`
references resolving to [SECURITY-PLAN.md](SECURITY-PLAN.md) section 9. The alternative is a single
unified scenario catalogue.
Status: OPEN

**OQ-59 — What are the dependency update windows?**
Priority: MEDIUM
Blocks: Update frequency in `PB-ENG-13 Dependency Management` section 6
Why it matters: `PB-ENG-13` proposes monthly review and quarterly major-upgrade review, and declines to
state a figure for the window in which a high-severity fix must be applied. The review cadence is a
judgement the team can make; the remediation window depends on how quickly a vulnerable path is reachable
in ERNS, which is not yet known.
Who can answer: Developer, IT
Default assumption: Critical fixes applied as soon as a fix exists. High fixes applied within two weeks.
Recorded as a default rather than a decision because the figure has no basis yet.
Status: OPEN

---

### Notification Model Conflict

**OQ-56 — How many email states does a recipient record have?**
Priority: BLOCKING
Blocks: Notification schema design, the `email_state` domain, and the transition rules in
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md)
Why it matters: The document set contradicts itself on a locked decision. Raised by the architecture
review of [TECH-STACK.md](../architecture/TECH-STACK.md) section 2.1 on 2026-10-02.

| Source | States |
|---|---|
| Master governance instruction, locked decision | `QUEUED`, `SENT`, `FAILED`, `BOUNCED` — four |
| [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) section 3 | `QUEUED`, `SENT`, `FAILED`, `BOUNCED` — four |
| `FR-NOT-003` in [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) | Adds `NOT_REQUESTED` — five |
| [DATA-MODEL.md](DATA-MODEL.md) section 2.10 `email_state` | Adds `NOT_REQUESTED` — five |

The two four-state sources include the locked decision. The two five-state sources are downstream
planning documents. **The conflict is recorded here and deliberately not reconciled.** Neither the
state nor the requirement has been altered, and no locked decision has been reinterpreted.
Who can answer: Council Secretary
Default assumption: Four states, per the locked decision and
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md). `NOT_REQUESTED` is not implemented until
resolved. Note that a recipient for whom no email was attempted is currently indistinguishable from
one whose attempt is merely still `QUEUED`, which is the operational reason the fifth state may have
been introduced. Also note that `Delivered` and `Opened` remain prohibited under `FR-NOT-004`
regardless of the outcome.
Status: OPEN

---

### Identity Provider and Delegated Sending

> **These three entries are new, added 2026-10-09 by Developer / Technical Owner. They were not
> present in the original register and are marked as proposed at the point of addition.** They arise
> from the institutional Google identity and Gmail delivery direction recorded in
> [TECH-STACK.md](../architecture/TECH-STACK.md). None of the three asserts that an institutional
> approval has been granted.

**OQ-60 — Are the institutional domains one Google Workspace organisation, two separate
organisations, or a primary-domain and alias arrangement?**
Priority: HIGH
Blocks: Finalisation of hosted-domain validation in the identity layer
Why it matters: The `hd` claim is emitted only for accounts in the tenant that issued them. If
`acdeducation.com` and `acd.edu.ph` sit in separate tenants, `hd` will be absent or inconsistent and
cannot be relied upon. The backend must not treat a domain allowlist as proof of the institutional
arrangement.
Who can answer: IT, Google Workspace administrator
Default assumption: The explicit domain allowlist is authoritative and is enforced on the backend.
The `hd` claim is treated as an optional additional signal where present, never as the sole gate.
Status: OPEN — proposed 2026-10-09 (new entry)

**OQ-61 — How is the `BOUNCED` email state determined when the transport reports no delivery
receipt?**
Priority: BLOCKING
Blocks: `email_state` transition rules, `FR-NOT-048`, scenario `NOTIF-10`
Why it matters: The send operation returns an accepted status and a message identifier when the
provider accepts a message. Actual bounces arrive later as separate messages in the sender mailbox;
no delivery-status callback is provided. Under the send-only scope, `BOUNCED` cannot be derived from
the send result, so the state required by `FR-NOT-048` would otherwise be unreachable.
Who can answer: Council Secretary, IT
Default assumption: None decided. A proposal — **not a decision** — is that `BOUNCED` means
*delivery attempts exhausted under the retry policy* rather than *a confirmed bounce*. Confirming a
true bounce would require a broader mailbox-read scope, which widens data access and therefore
requires authorisation. The locked notification-state domain is **not** altered by this entry, and
OQ-56 remains the open question on domain size.
Status: OPEN — proposed 2026-10-09 (new entry)

**OQ-62 — Who owns the delegated sender mailbox, and who approves domain-wide delegation?**
Priority: HIGH
Blocks: Outbound email delivery, `IB-1` in [INTEGRATION-BOUNDARIES.md](../architecture/INTEGRATION-BOUNDARIES.md)
Why it matters: Delegated sending requires a Workspace super-admin to authorise the client and the
scope. The sender identity should be a mailbox the institution can revoke without depending on an
individual, ideally an alias of an institutional account.
Who can answer: Council Secretary, IT
Default assumption: None. No sender mailbox is assumed to exist, and no delegation is assumed to be
authorised. Until this is answered, delivery must not be represented as available.
Status: OPEN — proposed 2026-10-09 (new entry)

**OQ-63 — Which authority closes OQ-47, test tooling?**
Priority: HIGH
Blocks: Closure of OQ-47; `TC-07` in [TECH-STACK.md](../architecture/TECH-STACK.md)
Why it matters: OQ-47 names *"Who can answer: Developer"*, and `PB-ENG-20` section 3.3 routes a
requirement status change to the party named in the entry. The same table assigns *"a technology or
architecture decision"* to Council Secretary and IT, and `TECH-STACK.md` section 4 step 5 requires
recorded agreement from both before a category is decided. OQ-47 governs `TC-07`, a stack decision
category. **The two rules point to different authorities and the supplied documents do not settle
which governs.** This question is recorded rather than resolved.
Who can answer: Council Secretary
Default assumption: None. No delegation to the Developer / Technical Owner is assumed, and none is
recorded elsewhere in this document set. Until this is answered, OQ-47 remains OPEN and `TC-07`
remains undecided.
Status: OPEN — proposed 2026-10-09 (new entry)

---

## 4. Assumptions Register

These assumptions are load-bearing. Each is mirrored from an inline `ASSUMPTION` label in the
relevant document, so the two do not diverge.

| ID | Assumption | Appears in | Resolved by | If wrong |
|---|---|---|---|---|
| AS-01 | Login is required for registration | REGISTRATION-WORKFLOW.md | OQ-07 — OPEN, proposed decision recorded 2026-10-09, not approved | Duplicate prevention weakens materially |
| AS-02 | Capacity is a hard cap with no waitlist | REGISTRATION-WORKFLOW.md | OQ-11 | Registration model changes |
| AS-03 | Email delivery cannot prove open or delivery | NOTIFICATION-WORKFLOW.md | OQ-13 | Additional states could be added |
| AS-04 | A scheduled process can evaluate time-based transitions | EVENT-LIFECYCLE.md | — | Automatic closing and status changes need another mechanism |
| AS-05 | Students have no self-service account creation | USER-ROLES.md | — | Spam accounts and identity verification burden |
| AS-06 | Event-day venue connectivity is adequate for QR | ATTENDANCE-WORKFLOW.md | — | Offline scanning becomes justified |
| AS-07 | Students are primarily mobile | FUNCTIONAL-REQUIREMENTS.md | OQ-34 | Student interface needs desktop-first redesign |
| AS-08 | Notification audience is evaluated at dispatch | DATA-MODEL.md | — | Historical notifications would not be reproducible |
| AS-09 | Retired registrations release their slot | DATA-MODEL.md | OQ-10 | Uniqueness constraint changes |
| AS-10 | Attendance is retained after cancellation | DATA-MODEL.md | — | Attendance facts would be lost |
| AS-11 | Programme and year-level naming in ERNS matches the school's official designations | PB-07 | — | Every targeting criterion silently returns zero or wrong results |
| AS-12 | Manual reminder dispatch is acceptable in the MVP | MVP.md | — | Officers forget to send reminders and PP-11 returns |
| AS-13 | No technology has been selected, and none is assumed by default | TECH-STACK.md | OQ-41 to OQ-55 | Downstream documents could mistake silence for approval |
| AS-14 | The `email_state` domain holds four states pending OQ-56 | NOTIFICATION-WORKFLOW.md, DATA-MODEL.md | OQ-56 | A recipient with no email attempted is indistinguishable from one still queued |
| AS-15 | No staging environment exists, and none is assumed | PB-ENG-10, PB-ENG-16 | OQ-55 | Migrations and releases reach production unrehearsed |

---

## 5. Validation Status

Counts recomputed from the entries in this document on 2026-10-09, per the counting rules in
section 1.1. The previous table over-reported the total by one and mis-stated MEDIUM and LOW.

| Priority | Entries | Resolved | Open |
|---|---|---|---|
| BLOCKING | 17 | 0 | 17 |
| HIGH | 28 | 0 | 28 |
| MEDIUM | 14 | 0 | 14 |
| LOW | 4 | 0 | 4 |
| **Total** | **63** | **0** | **63** |

**Composition of the 63 entries.** Fifty-nine are from the original register. Four — OQ-60, OQ-61,
OQ-62 and OQ-63 — were added on 2026-10-09 and are marked as proposed at the point of addition. OQ-61
was added as BLOCKING, so the open BLOCKING count is seventeen rather than the original baseline of
sixteen. OQ-07 is OPEN.

**No question in this register has been resolved.** All planning decisions in this document set are
therefore PROPOSED or ASSUMPTION status, with the exceptions recorded as locked decisions in the
governance prompt: the system title, the two primary functions, the five roles, the registration
states, the validation order, the notification states, and the out-of-scope list.

**Seventeen BLOCKING questions remain open and must be answered before implementation begins.**
OQ-01, OQ-02 and OQ-04 concern approval authority and require the Council, the Dean's office and the
Security Office respectively; they cannot be answered by a technical decision. OQ-02 and OQ-04
additionally depend on criteria that do not yet exist — enumerated event types and a participant
threshold. OQ-29, OQ-30, OQ-32 and OQ-62 require institutional action outside ERNS. OQ-56 concerns a
locked decision. OQ-61 concerns delivery-state semantics. OQ-07 concerns the authentication requirement
and names Council Secretary and IT as its answerer.

**Seven of the seventeen are technology-selection questions: OQ-41, OQ-42, OQ-43, OQ-44, OQ-45, OQ-47
and OQ-50.** All seven remain open. Per counting rule 2 and [TECH-STACK.md](../architecture/TECH-STACK.md)
section 4 steps 5 to 7, each closes only when the Council Secretary and IT have both recorded
agreement and the decision is recorded with its date and deciding parties. A technical direction
recorded in `TECH-STACK.md` — currently the Node.js and PostgreSQL selections — is recorded progress,
not closure. `TECH-STACK.md` section 8.1 carries the ratification status separately, as
[PB-ENG-20](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md) requires. **OQ-47 additionally
carries a conflict of authority, recorded as OQ-63 rather than resolved.**

**AUDIT NOTE, 2026-10-09. No entry in this register is marked RESOLVED. No question has been closed
on the strength of a technical decision alone, and no institutional approval has been recorded as
granted.** An earlier state of this file marked OQ-07 RESOLVED by the Developer / Technical Owner;
that entry names Council Secretary and IT as its answerer, so the closure was not within the
authority of the deciding party. It has been reverted, its seven-field content retained as a
proposed decision, and `AS-01` returned to unconfirmed. OQ-47's competing authorities are recorded
as OQ-63 rather than resolved.

**No institutional approval has been granted.** Nothing in this register represents Council,
Workspace, hosting, or delegated-sending authorisation as obtained.

---

## 6. Recommended Resolution Sequence

1. **OQ-01 through OQ-04** with Council Secretary, Dean, Student Affairs, and Security. These
   determine the approval chain configuration and are blocking.
2. **OQ-07 and OQ-13** with Council Secretary and IT. These determine registration identity
   strength and the entire notification module.
3. **OQ-30 through OQ-32** with IT. These determine whether implementation can proceed at all.
   **OQ-33** belongs with this group, because the identity source constrains OQ-45.
4. **OQ-56** with the Council Secretary. A small question with a disproportionate effect: it
   decides the notification schema domain before any notification table is designed.
5. **OQ-41 through OQ-45** with Council Secretary and IT. These are the technology stack, and
   **OQ-42 and OQ-44 cannot be answered before OQ-30**, because hosting constrains the stack rather
   than following from it.
6. **OQ-47** with the Developer. Test tooling must be chosen before implementation, not after,
   because the concurrency scenarios CON-01 to CON-07 need to exist from the first commit.
7. **OQ-22** with Council Secretary. Attendance window design affects the event-day experience
   for working students.
8. **OQ-50, OQ-51, OQ-55** with IT. Transport, background execution, and staging environment.
9. **OQ-46, OQ-48, OQ-49, OQ-52, OQ-53, OQ-54** in priority order.
10. Everything else in priority order.

---

## 7. Sign-Off Table

To be completed by stakeholders. ERNS should not enter implementation until BLOCKING questions
are answered.

| Question | Answer | Decided by | Date | Affects documents |
|---|---|---|---|---|
| OQ-01 | | | | APPROVAL-WORKFLOW.md |
| OQ-02 | | | | APPROVAL-WORKFLOW.md |
| OQ-04 | | | | APPROVAL-WORKFLOW.md |
| OQ-07 | | | | REGISTRATION-WORKFLOW.md |
| OQ-13 | | | | NOTIFICATION-WORKFLOW.md |
| OQ-29 | | | | PB-17 Backup and Recovery |
| OQ-30 | | | | PB-ENG-10, PB-ENG-15, TECH-STACK.md |
| OQ-32 | | | | NOTIFICATION-WORKFLOW.md |
| OQ-33 | | | | SECURITY-PLAN.md, TECH-STACK.md |
| OQ-41 | | | | TECH-STACK.md |
| OQ-42 | | | | TECH-STACK.md |
| OQ-43 | | | | TECH-STACK.md |
| OQ-44 | | | | TECH-STACK.md, DATA-MODEL.md |
| OQ-45 | | | | TECH-STACK.md, SECURITY-PLAN.md |
| OQ-47 | | | | PB-ENG-08, PB-ENG-09 |
| OQ-50 | | | | NOTIFICATION-WORKFLOW.md |
| OQ-56 | | | | NOTIFICATION-WORKFLOW.md, DATA-MODEL.md, FR-NOT-003 |

Non-blocking questions are tracked in the same registry and do not require sign-off before
implementation begins.

---

## 8. Completion Criteria

- Every inline `> OPEN QUESTION:` reference in the document set resolves to an entry here
- Every `ASSUMPTION` label appears in the assumptions register
- Every BLOCKING question names a stakeholder who can answer it

---

## 9. Exit Criteria

- All BLOCKING questions are resolved
- ASSUMPTIONS AS-01, AS-06, and AS-09 are confirmed, because each changes a structural design
- The sign-off table is complete for BLOCKING entries

---

**Related documents:** [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) ·
[CONVENTIONS.md](CONVENTIONS.md) ·
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[DATA-MODEL.md](DATA-MODEL.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) ·
[TECH-STACK.md](../architecture/TECH-STACK.md)
