# Technology Stack

**Document:** ERNS-ARCH-TECH
**Area:** architecture
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NO TECHNOLOGY SELECTED.** No technology stack has been approved for the Event Registration and
> Notification System. This document defines the *decision framework* — the categories that must be
> decided, the criteria each decision must satisfy, and the constraints inherited from the
> requirements. It names **no** framework, language, database, or platform as chosen. Every category
> is an open question registered in
> [OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md).
>
> Per [CONVENTIONS.md](../planning/CONVENTIONS.md) section 10, silently choosing a technology is an
> anti-pattern. Any stack named in a code change, a dependency manifest, or a deployment
> configuration before this document is ratified is an undocumented decision.
>
> **NOT YET IMPLEMENTED.** This document specifies a target state. No capability described here is
> currently in operation. See the implementation status table in section 8.

---

## Purpose

Hold the approved technology decisions for ERNS, and — until those decisions exist — hold the
constraints any approved stack must satisfy.

This document is a **decision record**, not a recommendation. It becomes a specification once each
row moves from `OPEN QUESTION` to `CONFIRMED` with a named decider and a date.

---

## Scope

**In scope:** the technology categories listed in section 3, the constraints each must satisfy, the
evidence required to decide, and the change procedure.

**Out of scope:** the procedural rules for using and changing the stack, which are in
`PB-ENG-02 Tech Stack`; dependency lifecycle management, in `PB-ENG-13 Dependency Management`;
infrastructure layout, in [ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md).

---

## 1. Why No Stack Is Named Here

Three reasons, in order of weight.

### 1.1 The requirements constrain the platform, not the reverse

[NON-FUNCTIONAL-REQUIREMENTS.md](../planning/NON-FUNCTIONAL-REQUIREMENTS.md) is written in terms of
properties, deliberately avoiding vendor and product names. NFR-PERF-001 states a target that is
"set before implementation" rather than a number, because a response-time figure asserted before a
hosting arrangement exists is a fiction. Writing a stack now would either contradict that
discipline or invite reverse-engineering requirements from a tool rather than from the Council's
needs.

### 1.2 Deployment and hosting are themselves unresolved

OQ-30 records that no deployment platform has been selected, and OQ-31 that no existing school
server or hosting arrangement is known. A stack chosen before hosting is chosen may be undeliverable
by the party who has to operate it. **The hosting decision constrains the stack; it does not follow
from it.**

### 1.3 Authentication and identity source are unresolved

OQ-33 asks whether an existing student information system or institutional single sign-on exists.
That answer determines whether ERNS manages passwords at all, which changes the language, framework,
and hosting choices in ways that cannot be reversed cheaply.

**The correct order is: hosting and identity → stack → implementation.**

---

## 2. Constraints Inherited From Requirements

Any approved stack MUST satisfy every constraint below. These are not preferences; each is traceable
to a baselined requirement.

| # | Constraint | Source | Consequence for the stack |
|---|---|---|---|
| C-01 | Relational uniqueness on `(user_id, event_id)` and on attendance registration reference | NFR-INTEG-001, NFR-INTEG-002 | The data store MUST support composite unique constraints enforced at the storage layer. A document store that cannot does not qualify. |
| C-02 | Transactional validation boundary around registration writes | NFR-INTEG-007 | The data store MUST support serialisable or repeatable-read transactions around a check-then-write. |
| C-03 | Append-only audit records with no modification or deletion path | NFR-AUD-005; append-only storage rule in [AUDIT-PLAN.md](../planning/AUDIT-PLAN.md) section 8 | The store MUST support insert-and-read access to the audit table with no update or delete grant, or an equivalent append-only mechanism. NFR-AUD-006 governs audit *retention*, not append-only access, and is therefore not cited here. |
| C-04 | Audiences frozen at dispatch and reproducible afterwards | NFR-INTEG-012 | Recipient sets MUST be materialised as rows at dispatch, not computed on read. |
| C-05 | Enforced status domains: registration limited to two values, in-app notification to three, and email states per FR-NOT-003 | FR-REG-019, FR-NOT-002, FR-NOT-003, FR-NOT-004 | The store MUST support constrained enumerations. A third registration state MUST be unwritable, per RV-06, and no `Delivered` or `Opened` state may exist, per NOTIF-17. **The size of the email domain is not settled here.** See [OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md) OQ-56 and section 2.1. |
| C-06 | Background batch dispatch with observable progress | NFR-PERF-004, NFR-PERF-005 | The runtime MUST support queued or scheduled background work separate from the request path. |
| C-07 | Correlation identifier spanning request, audit, and logs | NFR-MAINT-005 | All three layers must accept and propagate a shared identifier. |
| C-08 | Server-side authorisation, deny by default, no role outside the five defined | NFR-SEC-004, NFR-SEC-005, NFR-SEC-016 | Authorisation MUST be expressible in the application or database layer, independent of the interface. |
| C-09 | Mobile-first student experience on low-end Android | NFR-RESP-001, NFR-RESP-004 | The delivered interface budget MUST be assessed against a low-end device, not a developer laptop. |
| C-10 | WCAG 2.1 AA on all student and officer interfaces | NFR-A11Y-001 | The chosen framework MUST permit semantic control of the rendered output. |
| C-11 | Backup and verified restoration of participant records | NFR-BACKUP-001, NFR-BACKUP-004 | The store MUST have a documented, testable logical export and restore path, per OQ-29. |
| C-12 | Operable and diagnosable by an administrator without source access | NFR-MAINT-007 | Administrative operations MUST be reachable through the application or a documented interface, never only through SQL. |
| C-13 | Uploads validated by type and size, stored outside the executable path | NFR-SEC-009 | The hosting arrangement MUST permit separating upload storage from served application paths. |
| C-14 | Session invalidation on role change | [SECURITY-PLAN.md](../planning/SECURITY-PLAN.md) section 6 | Session state MUST be revocable server-side rather than self-contained in the client. |
| C-15 | No direct production database edits to correct records | NFR-MAINT-006 | The application MUST expose every correction path the organisation is permitted to perform. |

**PROPOSED.** C-01 and C-02 together eliminate most non-relational options. They are strong
evidence that the ERNS data store will be relational, and the requirement set is written on that
basis.

**This is a PROPOSED conclusion, not an approved decision.** [DATA-MODEL.md](../planning/DATA-MODEL.md)
is deliberately storage-neutral — it is a conceptual model that "is not a schema, and it contains no
SQL", with physical storage types explicitly out of scope. The engine itself remains OQ-44. A
candidate that satisfied C-01 to C-05 and C-11 by another mechanism would not be excluded by this
document; it would require the requirement set to be amended first, per `PB-ENG-20 Change
Management`.

### 2.1 The email-state domain is unresolved

**The number of email states is currently contradicted across the document set, and this document
does not resolve it.**

| Source | States enumerated |
|---|---|
| Master governance instruction (locked decision) | `QUEUED`, `SENT`, `FAILED`, `BOUNCED` — four |
| [NOTIFICATION-WORKFLOW.md](../planning/NOTIFICATION-WORKFLOW.md) section 3 | `QUEUED`, `SENT`, `FAILED`, `BOUNCED` — four |
| `FR-NOT-003` in [FUNCTIONAL-REQUIREMENTS.md](../planning/FUNCTIONAL-REQUIREMENTS.md) | `QUEUED`, `SENT`, `FAILED`, `BOUNCED`, `NOT_REQUESTED` — five |
| [DATA-MODEL.md](../planning/DATA-MODEL.md) section 2.10 `email_state` | `QUEUED`, `SENT`, `FAILED`, `BOUNCED`, `NOT_REQUESTED` — five |

**The locked decision is not altered here.** Whether `NOT_REQUESTED` is a genuine fifth state or an
artefact of a downstream document is a decision for the Council Secretary, registered as
[OQ-56](../planning/OPEN-QUESTIONS.md). C-05 is deliberately written so that it constrains the
storage layer without depending on the outcome: whatever the domain is, it must be a constrained
enumeration, and `Delivered` and `Opened` must remain absent per `FR-NOT-004`.

---

## 3. Decision Categories

Each row is an **OPEN QUESTION** until a named party decides it. No candidate products are listed,
because naming a candidate at this stage is how a stack becomes chosen by accident.

| # | Category | What must be decided | Registered as | Depends on |
|---|---|---|---|---|
| TC-01 | Frontend framework | Rendering model, routing, form handling, accessibility primitives, bundle budget against C-09 | OQ-41 | C-09, C-10 |
| TC-02 | Backend approach | Whether rendering and business logic share a process or are separated, and why | OQ-42 | C-06, C-08, C-09 |
| TC-03 | Programming language and runtime version | Language, supported version, and the version's support lifetime at the decision date | OQ-43 | TC-02 |
| TC-04 | Data store engine | Engine meeting C-01 to C-05 and C-11, and the version's support lifetime | OQ-44 | OQ-31 |
| TC-05 | Authentication mechanism | Local credentials, institutional single sign-on, or both; see OQ-07 and OQ-33 | OQ-45 | OQ-33, OQ-07 |
| TC-06 | Styling and UI approach | Token strategy, component reuse, and how NFR-A11Y-004 status-not-by-colour is enforced | OQ-46 | TC-01 |
| TC-07 | Test tooling | Unit, integration, service, end-to-end, and accessibility tooling per [TESTING-STRATEGY.md](../planning/TESTING-STRATEGY.md) section 2 | OQ-47 | TC-01 to TC-04 |
| TC-08 | Build tooling | Build, type-check, lint, and bundle steps that `PB-ENG-09 CI` invokes | OQ-48 | TC-01 to TC-03 |
| TC-09 | Deployment platform | Hosting target and delivery mechanism, including whether CI can reach it | OQ-30 | OQ-31, C-13 |
| TC-10 | Package manager | Dependency acquisition and lockfile format | OQ-49 | TC-03 |
| TC-11 | Email transport | Transport for the email delivery layer, subject to OQ-32 sending permission | OQ-32, OQ-50 | — |
| TC-12 | Background job execution | Mechanism satisfying NFR-PERF-004 and NFR-PERF-005 | OQ-51 | TC-02, TC-09 |
| TC-13 | Repository host and organisation | Where the repository lives and who owns the organisation account | OQ-52 | — |
| TC-14 | Observability tooling | Log aggregation and error reporting sufficient for NFR-MAINT-004 and NFR-MAINT-005 | OQ-53 | TC-09 |
| TC-15 | Runtime and operating system versions | Supported versions and their patch and end-of-support dates | OQ-54 | OQ-31 |
| TC-16 | Staging environment existence | Whether an environment separate from production exists, and who provisions it | OQ-55 | OQ-30, OQ-31 |

**Sixteen decisions.** Each is registered in
[OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md) with its default assumption of "none selected"
so that no downstream document can treat silence as approval.

---

## 4. Decision Procedure

A category is decided when, and only when, all of the following exist.

| Step | Requirement |
|---|---|
| 1 | The constraints in section 2 applicable to that category are enumerated |
| 2 | At least two viable candidates were considered, with the reason the others were rejected |
| 3 | The selected candidate's support lifetime is stated with its end-of-support date |
| 4 | Its licensing cost and licence obligations are recorded |
| 5 | The Council Secretary and IT have both recorded agreement |
| 6 | The decision is recorded here with the date and the deciding parties |
| 7 | Any register entry in [OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md) is marked RESOLVED in the same change, per [CONVENTIONS.md](../planning/CONVENTIONS.md) section 9 |

**Step 3 exists because support lifetime is the failure mode that bites small projects.** A student
organisation's system will be maintained by whoever is available two years from now. A technology
past end of support becomes the previous maintainer's unpaid problem.

**Step 2 exists to prevent the single-candidate case**, where a developer already knows what they
want to use and "considering alternatives" becomes a formality.

---

## 5. Candidate Evaluation Criteria

Applied to every category, in this order.

| # | Criterion | Question |
|---|---|---|
| E-01 | Constraint satisfaction | Does it satisfy every applicable constraint in section 2 without a workaround? |
| E-02 | Operability | Can the Council's IT or an Administrator operate it, per NFR-MAINT-007 and C-12? |
| E-03 | Support lifetime | When does it stop receiving security fixes? |
| E-04 | Licence cost | What does it cost, and what obligations follow? |
| E-05 | Host compatibility | Does it run where ERNS can actually be hosted, per OQ-30 and OQ-31? |
| E-06 | Security track record | How are its own vulnerabilities handled and disclosed? |
| E-07 | Skill availability | Can the Council's developers maintain it, and can a successor learn it? |
| E-08 | Exit cost | What does replacing it later require? |
| E-09 | Requirement fit | Does it make any baselined requirement harder to satisfy? |

**E-08 is weighted heavily.** The most likely future event is a change of technology, and a decision
that makes replacement expensive is a decision made once.

---

## 6. What Is Explicitly Not Decided Here

| Not decided | Why |
|---|---|
| Whether ERNS is a single process or separate services | Depends on hosting, OQ-30 |
| Any vendor or product name | No product has been evaluated or approved |
| Any version number | No product selected, so no version can be current |
| Build and deployment vendor | Depends on OQ-30 |
| Whether single sign-on will be used | Depends on OQ-33 |
| Email provider | Depends on OQ-32 |
| Whether a staging environment will exist | Depends on OQ-30 and OQ-55 |

---

## 7. Change Procedure

| Situation | Route |
|---|---|
| A category is decided for the first time | This document updated, OQ marked RESOLVED, `PB-ENG-02` updated |
| A decided category changes | `PB-ENG-20 Change Management` — an architecture decision |
| A version within the approved range is updated | `PB-ENG-13 Dependency Management` |
| A major version is adopted | `PB-ENG-20 Change Management`, with a migration assessment |
| A constraint in section 2 changes | The originating requirement is amended first, per `PB-ENG-20` |

**A technology change never happens as a side effect of a feature.** Governance principle 12.

---

## 8. Implementation Status

> **NOT YET IMPLEMENTED.** ERNS has no application code, no dependency manifest, no configuration
> file, and no build. Nothing in this document describes a running system.

| Item | State |
|---|---|
| Frontend framework | Not selected — OQ-41 |
| Backend approach | Not selected — OQ-42 |
| Language and runtime | **Selected: TypeScript 5.x on Node.js 24 LTS ("Krypton")** — OQ-43. Active LTS at the 2026-10-09 decision date; transitions to Maintenance LTS 2026-10-20; **support ends 2028-04-30**. Node.js 26 enters Active LTS 2026-10-28 with support to 2029-04-30 and **shall be reassessed after that date**; it was not available as an LTS release at the decision date |
| Data store engine | **Selected: PostgreSQL 17** — OQ-44. Supported; current minor 17.11; **support ends 2029-11-08**. PostgreSQL 18 (support to 2030-11-14) **shall not be adopted without a separate compatibility and technical-impact assessment** |
| Authentication mechanism | Not selected — OQ-45, blocked by OQ-33 |
| Styling and UI approach | Not selected — OQ-46 |
| Test tooling | Not selected — OQ-47 |
| Build tooling | Not selected — OQ-48 |
| Deployment platform | Not selected — OQ-30 |
| Package manager | Not selected — OQ-49 |
| Email transport | Not selected — OQ-32, OQ-50 |
| Background job execution | Not selected — OQ-51 |
| Repository host | Not selected — OQ-52 |
| Observability tooling | Not selected — OQ-53 |
| Runtime and OS versions | Not selected — OQ-54 |
| Staging environment existence | Not selected — OQ-55 |

### 8.1 Ratification status of the selections above

> **RATIFICATION OUTSTANDING.** [PB-ENG-20](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md)
> section 3.3 assigns technology and architecture decisions to the **Council Secretary and IT**. The
> Node.js and PostgreSQL selections recorded above are Developer / Technical Owner decisions taken to
> unblock development planning. They are **not** ratified, and must not be represented as approved.
>
> Per the counting rules in [OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md) section 1.1, the
> selection questions close on selection while ratification is tracked here as a separate governance
> item. The two facts are recorded independently; neither implies the other.
>
> **Support-lifetime verification, 2026-10-09.** Node.js release data verified against
> `nodejs.org/en/about/previous-releases` and the `nodejs/Release` schedule. PostgreSQL data verified
> against `postgresql.org/support/versioning`. Both were "subject to change" upstream; re-verify
> before any upgrade decision, per `PB-ENG-13` section 6.

---

## 9. Open Questions Raised Here

| Question | Why it matters | Who can answer | Default assumption |
|---|---|---|---|
| [OQ-41](../planning/OPEN-QUESTIONS.md) Frontend framework | Sets bundle budget against C-09 and accessibility against C-10 | Council Secretary, IT | None selected |
| [OQ-42](../planning/OPEN-QUESTIONS.md) Backend approach | Determines whether authorisation and dispatch logic are separable and testable | Council Secretary, IT | None selected |
| [OQ-43](../planning/OPEN-QUESTIONS.md) Language and runtime version | Determines support lifetime and skill availability | IT | None selected |
| [OQ-44](../planning/OPEN-QUESTIONS.md) Data store engine | Constrained by C-01 to C-05 and C-11; must support composite uniqueness and transactional check-then-write | IT | Relational, engine not selected |
| [OQ-45](../planning/OPEN-QUESTIONS.md) Authentication mechanism | Determines whether ERNS manages passwords | IT, Council Secretary | Local credentials per the assumption in [SECURITY-PLAN.md](../planning/SECURITY-PLAN.md) section 5 |
| [OQ-46](../planning/OPEN-QUESTIONS.md) Styling and UI approach | Must support NFR-A11Y-004, status conveyed textually | Council Secretary | None selected |
| [OQ-47](../planning/OPEN-QUESTIONS.md) Test tooling | Must support the integration-level concurrency tests that justify NFR-INTEG-007 | Developer | None selected |
| [OQ-48](../planning/OPEN-QUESTIONS.md) Build tooling | Invoked by `PB-ENG-09 CI` | Developer | None selected |
| [OQ-49](../planning/OPEN-QUESTIONS.md) Package manager | Determines lockfile policy under `PB-ENG-13` | Developer | None selected |
| [OQ-50](../planning/OPEN-QUESTIONS.md) Email transport | Depends on OQ-32 sending permission and rate limits | IT | None selected |
| [OQ-51](../planning/OPEN-QUESTIONS.md) Background job execution | Required by NFR-PERF-004 and NFR-PERF-005 | IT, Developer | None selected |
| [OQ-52](../planning/OPEN-QUESTIONS.md) Repository host and ownership | Branch protection and required reviewers depend on it | Council Secretary | None selected |
| [OQ-53](../planning/OPEN-QUESTIONS.md) Observability tooling | Required by NFR-MAINT-004 and NFR-MAINT-005 | IT | None selected |
| [OQ-54](../planning/OPEN-QUESTIONS.md) Runtime and operating system versions | Determines patch and end-of-support exposure | IT | None selected |
| [OQ-55](../planning/OPEN-QUESTIONS.md) Staging environment existence | Determines whether migrations and releases can be rehearsed before production, per `PB-ENG-10` and `PB-ENG-16` | IT, Council Secretary | None. No staging environment exists |
| [OQ-56](../planning/OPEN-QUESTIONS.md) Email-state domain size | `FR-NOT-003` and `DATA-MODEL.md` enumerate five states including `NOT_REQUESTED`; the locked decision and `NOTIFICATION-WORKFLOW.md` specify four. Section 2.1 records the conflict | Council Secretary | Four states per the locked decision. `NOT_REQUESTED` is not implemented until resolved |

**OQ-30 remains the master blocker.** TC-09, and therefore TC-02, TC-04, and TC-12, cannot be decided
before the hosting question is answered.

---

## 10. Completion Criteria

This document is BASELINE when:

- All sixteen categories are registered as open questions with named deciders
- All fifteen constraints in section 2 are traceable to a baselined requirement
- The email-state conflict is registered rather than reconciled, per section 2.1
- The decision procedure, evaluation criteria, and change route are recorded
- No product, vendor, or version is named

---

## 11. Exit Criteria

- OQ-30, OQ-31, and OQ-33 answered
- OQ-56 answered, so the email-state domain is settled before schema design
- Every category in section 3 decided and recorded with a date and deciding parties
- Every version recorded with its support lifetime and end-of-support date
- This document reclassified from `NO TECHNOLOGY SELECTED` to the approved stack
- Section 8 removed, since it exists only while the stack is undecided
- Section 2.1 resolved, once the email-state domain is settled

---

**Related documents:** [TECH-STACK.md](TECH-STACK.md) ·
[SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) ·
[ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md) ·
[INTEGRATION-BOUNDARIES.md](INTEGRATION-BOUNDARIES.md) ·
[PB-ENG-02 Tech Stack](../playbooks/engineering/PB-ENG-02-TECH-STACK.md) ·
[PB-ENG-20 Change Management](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../planning/NON-FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md) ·
[CONVENTIONS.md](../planning/CONVENTIONS.md)