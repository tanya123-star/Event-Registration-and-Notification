# Project Owner Decisions and Governance Amendment

**Document:** ERNS-POD-001
**Area:** governance
**Status:** Baseline
**Date:** 2026-10-09
**Authority:** Project Owner, ERNS
**Relationship to existing documents:** This document does not replace, rewrite, or reinterpret any
prior governance decision. It records decisions taken under project-owner authority and identifies
the clauses amended. Historical documents remain as written except for the specific amendments
listed in section 3, each of which carries a pointer to this document.

---

## 1. Purpose

The existing governance model assumes that ERNS is delivered under institutional authority: a
Council Secretary confirms intent, a Council decides locked questions, offices supply policy
criteria, and IT supplies infrastructure. That model does not describe this project, which is
developed under project-owner authority as a project activity.

This document records what changed, what did not, and who decided what. It exists so that a later
maintainer can reconstruct the reasoning without inferring it from the absence of a record.

---

## 2. Authority of these decisions

| Category | Count | Basis |
|---|---|---|
| Project-owner decisions | 15 questions | Project Owner, 2026-10-09 |
| Reserved — institutional | 3 questions | `PB-ENG-20` §3.3, §2.6 |
| Reserved — external permission | 2 questions | Cannot be granted by the project |
| **Total BLOCKING resolved by this document** | **15 of 17** | |

**No institutional approval is represented as having occurred.** No Council, Council Secretary, IT,
Dean, Student Affairs Office, or Security Office decision has been obtained. The two questions that
remain open are open because the authority to close them has not been exercised.

---

## 3. Amendments to prior clauses

Each amendment changes one clause. No other text in the affected document is altered.

| # | Document | Clause as written | Amended to | Reason |
|---|---|---|---|---|
| A-1 | `PROJECT-OVERVIEW.md` §12 | "Council Secretary confirms the documentation set reflects their intent" | "Project Owner confirms the documentation set reflects project intent" | No institutional charter governs this project |
| A-2 | `PROJECT-OVERVIEW.md` §12 | "Implementation authorised as a separate, explicit decision" | Satisfied by the Project Owner directive dated 2026-10-09 | Same |
| A-3 | `PROJECT-OVERVIEW.md` §12 | "BLOCKING open questions answered" | Fifteen answered here; three remain open and are recorded as accepted, see §5 | Two cannot be self-answered and one requires institutional policy |
| A-4 | `ROADMAP.md` Phase 0 Exit Criteria | "All BLOCKING questions answered and recorded" | "All BLOCKING questions answered and recorded, or recorded as reserved with a named authority" | Phase 0 cannot complete without institutional offices |
| A-5 | `ROADMAP.md` Phase 0 Acceptance | "Council Secretary has signed off on SYSTEM-SCOPE.md and MVP.md" | "Project Owner has signed off on SYSTEM-SCOPE.md and MVP.md" | Same |
| A-6 | `OPEN-QUESTIONS.md` §3.3 | Questions answered by "Council Secretary, IT" for technology selections | Answered by "Project Owner, with IT consulted where a hosting or permission dependency exists" | See §4 |
| A-7 | `TECH-STACK.md` §3 TC-02 recorded as *"Express 5 REST API, separate from rendering"* | *"Next.js 15 Route Handlers in the same application. One deployable"* | The recorded value contradicted `PB-ENG-03:68`, which prohibits monorepo tooling, and `PB-ENG-03:58`, which expects a single `<application root>`. Superseded rather than deleted; the original text is preserved in §8. **The framework has NOT been installed** — see §8.1 |

**Clauses NOT amended, and why**

| Clause | Reason |
|---|---|
| `PB-ENG-20:204` — a locked decision requires Council | A playbook cannot grant its own authority. OQ-56 remains open. This project complies with the locked four-state decision rather than reopening it |
| `PB-ENG-20:141` — adding a system role is prohibited | Not needed. The five-role model is retained unchanged |
| `PB-ENG-19:327` — a BLOCKING question stops the affected module | Retained. It remains the rule for the three reserved questions |
| `PB-ENG-13` — no dependency without an approved row | Retained. Section 4 of this document is that row set |

---

## 4. Technology stack decisions

Recorded per `TECH-STACK.md` §4. Steps 1 to 4 are satisfied here. **Steps 5 and 7 remain formally
unsatisfied**, because the Council Secretary and IT have not recorded agreement. These are recorded
as project-owner selections, not as ratified stack decisions.

| TC | Decision | Support |
|---|---|---|
| TC-01 | Next.js 15 App Router, TypeScript, server components | C-09 low-end Android; C-10 semantic control |
| TC-02 | Next.js 15 Route Handlers in the same application. One deployable; rendering and business logic share a process | `SYSTEM-ARCHITECTURE.md` section 8: *"A single process — L1 through L5 are one deployable; the layer boundaries remain internal contracts"*. `PB-ENG-03:68`: *"One repository, not a monorepo — a monorepo adds tooling nobody here needs"*. Authorisation remains server-side, satisfying NFR-SEC-004. **Amended 2026-10-09; see A-7** |
| TC-03 | Node.js 24 LTS (installed 24.21.0) | Active LTS at decision date; support ends 2028-04-30 |
| TC-04 | PostgreSQL 17 | C-01 composite uniqueness; C-02 serialisable transactions; C-03 `REVOKE`; C-05 `CHECK` domains |
| TC-05 | Institutional single sign-on | Dependent on OQ-45; **not yet implementable** — requires institutional identity, see §6 |
| TC-06 | Plain CSS custom properties, no utility framework | `NFR-A11Y-004` status never by colour alone |
| TC-07 | Vitest | CON-01 to CON-07 require a real database and separate connections |
| TC-08 | `tsc --noEmit`, ESLint | Type checking is a CI stage under `PB-ENG-09` |
| TC-09 | **Undecided.** No hosting arrangement is assumed | OQ-30 and OQ-31 are external. Local Docker Compose only |
| TC-10 | pnpm 11 | Committed lockfile required by `PB-ENG-13` |
| TC-11 | Email transport **undecided** | OQ-32 permission absent. A console transport is used in development only |
| TC-12 | Node `worker_threads` with a PostgreSQL-backed queue | C-06 background dispatch without adding a second stateful service while hosting is undecided |
| TC-13 | Undecided — no remote configured | OQ-52 |
| TC-14 | Pino with `AsyncLocalStorage` correlation identifier | C-07 |
| TC-15 | Node 24 LTS on Linux | Version recorded with end-of-support date |
| TC-16 | **Undecided.** No staging environment | OQ-55 |

### 4.1 Licence position

No licence cost is asserted. `PB-ENG-13` classifies dependencies by permission tier; only
permissively-licensed and attribution-requiring packages are admitted. Any strong-copyleft package
requires a decision that is not available to the Project Owner and is therefore excluded. The
installed dependency set is restricted to the packages named in the milestone acceptance criteria,
each checked against its published licence before use.

### 4.2 Database access

Explicit SQL through `pg`. An ORM is excluded because the design requires partial unique indexes,
`REVOKE` grants and `CHECK` constraints that are expressed in SQL and must remain visible in the
migration history rather than be generated from a schema model.

---

## 5. Reserved questions and why they remain open

| Question | Authority | Why it cannot be closed here | Effect on this build |
|---|---|---|---|
| **OQ-01** Final approval authority | Council Secretary, Dean, Student Affairs Office | Institutional policy. No technical content to derive | Approval chain is modelled as configurable data, not hard-coded to any office |
| **OQ-02** Events requiring Dean approval | Dean's office | Requires an event-type enumeration **and** a Dean rule. Neither exists | No event type is marked as requiring Dean approval |
| **OQ-04** When Security approval is required | Security Office | Requires a participant threshold. Not established | No threshold is assumed |
| **OQ-30** Hosting | IT | Infrastructure does not exist and cannot be assumed | Development runs locally. No deployment target |
| **OQ-32** Institutional email permission | IT | External permission | A console transport captures email in development. No message is sent |
| **OQ-56** Email-state domain | **Council**, per `PB-ENG-20:204` | Locked decision. This process cannot reopen it | **Four states implemented**, per the locked decision. `NOT_REQUESTED` is not implemented |

**OQ-56 note.** The register records a five-state variant in `FR-NOT-003` and `DATA-MODEL.md`. This
build implements **four**, which is what the locked decision and `NOTIFICATION-WORKFLOW.md` specify.
That is compliance, not a reopening. The conflict remains documented and open.

---

## 6. Consequences of the reserved questions

| Area | Consequence |
|---|---|
| Authentication | TC-05 cannot be implemented. The authentication boundary is defined and mocked; no identity provider is contacted |
| Approval | `OQ-01` open means the chain is data-driven. No office is hard-coded |
| Email | `OQ-32` open means no transport may send. Development uses a console transport |
| Deployment | `OQ-30` open means no deployment target exists |

None of these prevent building the domain layer, the schema, or the API contracts.

---

## 7. Assumptions requiring confirmation

| # | Assumption | If wrong |
|---|---|---|
| A-1 | The Council Secretariat is a named role inside the system rather than an institutional office | Approval routing changes |
| A-2 | A configurable approval chain satisfies the requirement that an authority exists | OQ-01 may need a fixed chain |
| A-3 | Four email states, per the locked decision | Schema changes if Council rules for five |
| A-4 | Registration requires an authenticated identity, per OQ-07 as decided here | `AS-01` is load-bearing for duplicate prevention |
| A-5 | Node 24 LTS and PostgreSQL 17 remain supported through their recorded dates | Reassessment per `PB-ENG-13` |

---

## 8. Repository layout

Adopted 2026-10-09, replacing an initial pnpm workspace that violated `PB-ENG-03:68`.

```
/
├── docs/                # this documentation set, 67 files
├── src/
│   ├── domain/          # L3 — pure logic, no I/O, no external imports
│   ├── db/              # L2 — persistence: client, migrations, primitives
│   │   └── schema/      # forward-only SQL migrations, per PB-ENG-14
│   └── l4/              # L4 — use cases: registration, capacity reduction
├── test/
├── docker/
│   └── postgres-init/   # role provisioning for local PostgreSQL
├── docker-compose.yml   # PostgreSQL 17 for development and integration tests
├── .env.example         # keys only, per PB-ENG-12
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts             # unit tests
├── vitest.integration.config.ts # database tests; fileParallelism off
└── eslint.config.mjs            # enforces the L5/L4/L3 boundary
```

### 8.1 No web framework is installed — Next.js adoption deferred

Recorded 2026-10-09. This corrects a misleading implication of the previous revision of this section,
which listed `src/app/` and `src/app/api/` in the tree and in amendment A-7.

**ERNS currently has no Next.js.** Verified by inspection on 2026-10-09:

| Check | Result |
|---|---|
| `next` or `react` in `package.json` | absent |
| `next` or `react` in `node_modules` | absent |
| `next.config.js` / `.mjs` / `.ts` | absent |
| `src/app/`, `app/`, `src/pages/`, `pages/` | absent |
| `.tsx` / `.jsx` files in the repository | **0** |
| `"use client"` directives | 0 |
| `server-only` / `client-only` imports | 0 |

**What ERNS is today.** A headless TypeScript library: a pure domain layer, a PostgreSQL persistence
layer, and two application use cases, with 264 tests. The architecture is decided in A-7 and TC-01/TC-02,
and those decisions remain valid — the framework simply has not been installed, because no user-facing
surface has been built and none can be until the questions below are answered.

**Why the framework is not installed yet.** Two requirements gate any web surface, and both are blocked:

| Blocker | Effect |
|---|---|
| **OQ-45 / TC-05** — institutional identity source | A login page cannot be built. The session boundary is undefined |
| **OQ-30 / TC-09** — hosting | No deployment target, so no build pipeline to attach a framework to |

A third consideration: `TC-01` and `TC-02` are recorded as **unselected** in the staged
`TECH-STACK.md` (they depend on OQ-41 and OQ-42). Installing a major framework version ahead of that
would commit to a version the ratified stack does not yet name, and `PB-ENG-20` requires a migration
assessment before a major version is adopted.

**The version discrepancy, unresolved.** Amendment A-7 and TC-01 name **Next.js 15**. The official
project-structure documentation consulted on 2026-10-09 is version **16.4.0** (last updated
2026-07-21). These are different major versions. Which one ERNS will adopt is **not decided here** and
is deliberately left open: adopting 15 would pin a version the current documentation no longer describes,
and adopting 16 would contradict the written decision. It needs a recorded choice at the milestone that
installs the framework.

**What this means for the layer rules.** `eslint.config.mjs` already scopes the L5 prohibitions to
`src/app/**` and carves out `src/app/api/**`. Those rules are **dormant** — they match no files today,
because `src/app/` does not exist. They are correct and forward-looking: the day L5 is created, the
boundary is already enforced. No change is required now.

**What adopting Next.js will require, when it happens.** Recorded so the later milestone is not
re-derived from scratch:

1. Install the framework and React, and add `next.config.ts` — a new dependency requiring approval per
   `PB-ENG-13`.
2. Create `src/app/layout.tsx`. A root layout is required once `app/` exists.
3. Route Handlers go in `app/**/route.ts`. These are L4 transport and are the correct home for the
   authorization boundary, which `SECURITY-PLAN.md` §4 places in L4.
4. Route segments for the five roles in `USER-ROLES.md` are naturally **route groups** — `(student)`,
   `(officer)`, `(attendance-staff)`, `(approver)`, `(admin)` — which organise by audience without
   appearing in the URL.
5. Anything inside `app/` that is not routing belongs in a **private folder** (`_folder`), which opts the
   subtree out of routing. `src/db` and `src/l4` stay **outside** `app/` so that no route segment can
   import them by accident.
6. Add `import "server-only"` to modules holding `ERNS_APP_URL` or `pg`, so importing one into a Client
   Component fails at build time rather than leaking a connection string. The ESLint rule is the
   existing guard; `server-only` is the belt to that braces.
7. `src/domain`, `src/l4`, and `src/db` move **nowhere**. They are layer-aligned already and satisfy
   the model in `SYSTEM-ARCHITECTURE.md` §2.

**`src/l4/` added 2026-10-09.** §11.4 records why the capacity invariant sits in L4 rather than L2: the
L2 prohibition on interpreting a lifecycle rule (`SYSTEM-ARCHITECTURE.md` line 100) and the L3
prohibition on I/O (line 99) together leave the consistency rule with nowhere else to go.

**What changed and why.** The first structure used pnpm workspaces with `packages/*` and `apps/*`.
`PB-ENG-03:68` rules that out. `SYSTEM-ARCHITECTURE.md` section 8 permits a single deployable in
which *"the layer boundaries remain internal contracts"*, so one application root satisfies both
documents.

**What was lost, and how it is held.** Under a workspace, `packages/domain` had no dependencies, so
an `import from "pg"` in L3 could not compile. That structural guarantee is replaced by
`eslint.config.mjs`: `no-restricted-imports` forbids L3 from importing anything external, and forbids
L5 from importing `pg` or `**/db`. Per `PB-ENG-09` section 5, *"No exception exists for disabling a
check"*, so this is a required CI status rather than a convention.

**The rule has been verified, not just written.** A temporary probe importing `pg` into `src/domain`
was confirmed to fail lint during the first core milestone, as was a probe reaching the database from
`src/app`. The guarantee is enforced, not merely documented.

**Behaviour is unchanged.** The migration moved files and corrected two import paths. No source file,
no assertion and no test count was modified.

---

## 9. First core implementation milestone — decisions

Recorded 2026-10-09. These are **implementation decisions taken under project-owner authority**. None is
institutional approval, and none closes a question in `OPEN-QUESTIONS.md`. OQ-10 in particular remains
OPEN in the register; §9.1 records a decision about *how to implement* it, not an answer to *what the
institution wants*.

### 9.1 OQ-10 — registration uniqueness is a PARTIAL unique index

**Decision.** `UNIQUE (user_id, event_id) WHERE status = 'REGISTERED'`.

**Reading adopted.** Cancellation by the student releases the slot. A cancelled registration does not
consume capacity, and the student may register again provided every other rule in
`REGISTRATION-WORKFLOW.md` §4 is satisfied.

**Sources and why the reading was chosen.** `DATA-MODEL.md` states the constraint twice, under one
heading, with different shapes:

- line 399: *"**Unique on `(user_id, event_id)`.** This is the authoritative duplicate-registration
  safeguard"* — reads as an unconditional constraint.
- line 409: *"**PROPOSED.** Cancellation by the student releases the slot for re-registration… If the
  organisation prefers a cancelled registration to permanently consume a slot, **the uniqueness
  constraint must move to `(user_id, event_id)` partial on active records**"* — the partial form is
  identified there as the slot-release reading.

The two clauses cannot both be implemented, because a partial index is a strictly weaker constraint
than a plain one. This build adopts the partial form because line 409 labels it **PROPOSED**, which is
the project's own record of the intended reading, and because the alternative — a cancelled row
permanently consuming capacity — contradicts `DATA-MODEL.md` line 187, where capacity is a *"Hard cap"*
on participants rather than on historical rows.

**Alternative, and what reversing would cost.** A plain `UNIQUE (user_id, event_id)` would make a
cancelled registration consume its slot permanently. That is one `DROP INDEX` plus one `CREATE UNIQUE
INDEX`, because no column type changes and no data is rewritten. The migration history would need a
fourth file, and existing cancelled rows would be left untouched. The cost is low and the decision is
reversible.

**Effect.** One active registration per user per event. Unlimited cancelled rows, which no longer
constrain anything. Validated at the store by
`registration_active_user_event_key` in `src/db/schema/0001_initial.sql`.

### 9.2 Registration identifiers

**Decision.** `registration_id` is a UUID, generated by PostgreSQL's `gen_random_uuid()`. A separate
`confirmation_reference` is the student-facing identifier.

**Why two.** `DATA-MODEL.md` line 381 calls `registration_id` only *"Identifier"* and specifies no
type; the UUID choice is therefore an implementation decision, made so that identifiers are
non-enumerable and cannot be inferred from a sequence. `confirmation_reference` exists for a stated
purpose at `MVP.md` line 84: *"Lets staff identify a participant verbally"*. That is a
presentation concern, not a key, so it is generated in the application layer and constrained by
`UNIQUE`.

**Format.** Eight characters over a Crockford-style 32-symbol alphabet (`0-9`, `A-Z` minus `I`, `L`,
`O`, `U`). Every position varies independently, giving 32⁸ = 1,099,511,627,776 combinations.

**An earlier format was wrong and was corrected.** The first implementation packed a 16-bit value into
the 32-symbol alphabet. Since 2¹⁶ = 32⁴, only the last four characters varied and references took the
form `00007K2M` — which advertises four digits of information and does not have it. A test asserting
the full range failed and exposed the defect. The implementation now draws one entropy byte per
character. Rejection sampling is deliberately **not** used: `byte % 32` is uniform because 32 divides
256, and the short-entropy-read case is handled by throwing rather than by resampling.

### 9.3 Database role separation

**Decision.** Two roles. `erns_owner` is `NOLOGIN` and owns every object; `erns_app` is `LOGIN` and
holds the minimum privilege the application needs.

**This implements an existing documented requirement; it does not create a new one.**
`SECURITY-ARCHITECTURE.md` §9.2 and `PB-ENG-11-SECURITY.md` §13 both state the same two structural
consequences of `NFR-SEC-015`: the audit table receives insert and read grants only, and the application
role holds no schema-altering privilege. `SECURITY-ARCHITECTURE.md` line 382 adds that the second is
what makes `NFR-MAINT-006` meaningful.

**Why `erns_app` must not own `audit_log`.** A PostgreSQL owner can always alter or drop the tables it
owns, so a `REVOKE` from a role that owns the table is meaningless. Ownership is therefore held by
`erns_owner`, which has no login, so no credential can exercise it.

**How the restriction is verified.** Over a real connection authenticated as `erns_app`, asserting
`UPDATE`, `DELETE` and `TRUNCATE` fail with SQLSTATE `42501`. A test connected as the owner would prove
nothing. `SECURITY-ARCHITECTURE.md` line 380's requirement that the app role hold no schema-altering
privilege is asserted the same way, via `has_schema_privilege`.

**Two connection strings, deliberately.** `ERNS_DATABASE_URL` is the owner and is used only by the
migration runner and by test setup. `ERNS_APP_URL` is the application role. No code path falls back
from one to the other, because a silent fallback would let a runtime query run as the schema owner and
void the audit restriction entirely.

### 9.4 `audit_log.actor_user_id` foreign key

**Decision.** A foreign key from `actor_user_id` to `app_user(user_id)` with `ON DELETE RESTRICT`.
The polymorphic `entity_id` has no foreign key.

**The apparent conflict was checked before applying it.** `DATA-MODEL.md` line 539 states *"references
any entity by type and identifier, so no fixed foreign key"*, which reads at first as contradicting
this decision. It does not. That sentence describes the **polymorphic** reference — the
`entity_type` / `entity_id` pair — whereas line 528 names `actor_user_id` explicitly as a *"Reference to
User"*. The two clauses describe different columns. No source contradicts the decision, so it was
applied rather than escalated.

**`RESTRICT`, never `CASCADE`.** `DATA-MODEL.md` line 548 confirms *"Audit records are retained and
never cascade-deleted with their subject entity"* and `FR-AUD-006` forbids deleting an audited record
when its subject is deleted. `SECURITY-PLAN.md` lines 360-364 record that corrections are preferred to
deletion and that no retention policy authorises an erasure path. A user with audit history therefore
cannot be deleted. That is the intended behaviour.

### 9.5 `student_context` is JSONB

**Decision.** `registration.student_context` is `JSONB`, holding the registration-time snapshot.
Normalisation is deferred.

**Expected keys, documented and not constrained:** `programme`, `year_level`, `organization_id`,
per `FR-REG-017` (*"a snapshot of the student's programme, year level, and organisation at registration
time"*) and `DATA-MODEL.md` line 391. No source specifies their representation, so no `CHECK` constrains
them and inventing one would reject a shape no document describes.

**Why deferred rather than typed.** The natural parent table is `StudentProfile`, which is absent from
this milestone because OQ-07 leaves the student number's existence and uniqueness undecided. A typed
column would have nothing to reference and would embed a guessed representation.

### 9.6 Schema types chosen where no source specifies one

| Column | Type | Basis |
|---|---|---|
| `audit_log.previous_state`, `new_state`, `request_context` | `JSONB` | No source states a type. JSONB avoids narrowing a value that is a scalar in one entity and an object in another |
| `event.event_type` | `TEXT`, no constraint | OQ-02 records that event types are not enumerated. A `CHECK` would invent institutional categories |
| `event.start_time`, `end_time` | `TIME` | `DATA-MODEL.md` line 208 compares them to each other, not to a date |
| `audit_log.entity_type` | `TEXT`, no constraint | The entity vocabulary is not enumerated anywhere |

### 9.7 Migration runner is forward-only

**Decision.** `src/db/migrate.ts` implements `up` only. `rollback()` throws.

`PB-ENG-14` requires a documented **and tested** rollback path before a change is complete. No
down-migration exists, so no rollback support is claimed and none is asserted. `pnpm db:migrate
--rollback` prints the reason rather than doing anything, so that typing it produces an explanation
instead of a false success.

Migrations are checksummed. Editing an applied file is refused with
`MigrationChecksumMismatchError`, because a silently edited migration leaves the repository and the
database describing different schemas.

---

## 10. Implementation status

Recorded 2026-10-09, after the first core milestone was built and verified.

### 10.1 Delivered and verified

| Area | Artefact | Verification |
|---|---|---|
| Registration validation | `src/domain/registration-validation.ts` | 9 steps, order, messages, FR-REG-005 through FR-REG-015. **99 unit tests pass** |
| Registration identifiers | `src/domain/registration-reference.ts`, `src/db/identifiers.ts` | Format, uniformity, uniqueness. Tested with scripted and system entropy |
| Schema | `0001_initial.sql`, `0002_audit_grants.sql`, `0003_cancellation_constraint.sql` | **106 real-PostgreSQL tests pass** against PostgreSQL 17 in Docker |
| Audit immutability | `0002` grants | `UPDATE`/`DELETE`/`TRUNCATE` refused as `erns_app` with `42501`, over a real connection |
| Concurrency | `src/db/client.ts` | CON-01, CON-02, CON-04, TST-09 on separate connections with real commits |
| Migrations | `src/db/migrate.ts` | Checksums, idempotency, mismatch refusal, forward-only |

### 10.2 Defects found by the tests and fixed

Recorded because each was found by a test that failed for a real reason, not by inspection.

| Defect | Found by | Fix |
|---|---|---|
| Confirmation references used only 4 of 8 positions (`00007K2M`) | Test asserting the full 16-bit range | Rewrote to one entropy byte per character; 32⁸ combinations |
| `registration_cancellation_fields_check` accepted a half-cancelled row, because its `OR (status = 'REGISTERED')` branch was true for any active row | Test asserting an active row cannot carry `cancelled_at` | **Migration 0003.** The constraint now requires the cancellation state to agree with `status` in both directions |
| TST-03 pair test merged two whole attempts, so the second mutation undid the first and only one step failed per pair | The pair test itself | Mutate with partial patches, not whole attempts. All 36 ordered pairs now checked |
| TST-03 mutant design was unsound — a reverse scan returning first-match agrees with the correct code on single-step failures | Rewriting the pair test | Witness requires two simultaneous failures. The unsound single-step variant is kept, labelled as not a usable witness |
| Migration probes used the repository's own filenames, corrupting the ledger | Probe test | Renamed `9901_probe`, `9902_probe`, plus a cleanup assertion |
| `pnpm test` raced across parallel workers, so one file's `TRUNCATE` landed in another's test | Row counts of 0 where 1 was expected | `vitest.integration.config.ts` with `fileParallelism: false`, plus a PostgreSQL advisory lock around migrations |
| `seedEvent` fixed `event_date` at a constant offset, colliding with the deadline constraint after midnight | Integration tests | `event_date` derived from the deadline |

### 10.3 Known gap — CON-04 is NOT enforced by the schema

`TESTING-STRATEGY.md` line 121 requires, for CON-04, that the registered count never exceeds capacity
when capacity is reduced mid-flight. **This milestone does not enforce it, and the schema cannot.**

An in-flight registration that reads capacity 2, and an officer's reduction to 1, form a legal serial
order: register, then reduce. PostgreSQL correctly permits it. The resulting state — 2 registrations
against capacity 1 — is the overfill CON-04 forbids.

The obligation sits with the **reduction**, per `DATA-MODEL.md` lines 212-213: *"capacity MUST NOT be
reduced below the count of existing registrations without simultaneous participant removal"*. A
cross-row condition cannot be a `CHECK` constraint and is not a foreign key either. Closing it requires
a capacity-reduction check inside the write transaction at L4.

`test/concurrency.test.ts` asserts the behaviour that actually occurs and names the gap, rather than
asserting a guarantee the database cannot provide. The available mitigation — reading capacity inside
the transaction, so a transaction started after the reduction sees the new value — is demonstrated by a
separate passing test.

### 10.4 Entities deliberately absent

Eleven of the fifteen modelled entities are not in this schema, because adding them would require
inventing values no source supplies:

| Entity | Blocked by |
|---|---|
| `StudentProfile` | OQ-07 — student number's existence and uniqueness undecided |
| `Role`, `Organization`, `ApprovalChain`, `ApprovalStep` | OQ-01, OQ-02, OQ-04 — approval authority and event types undefined |
| `Notification`, `NotificationRecipient` | OQ-56 — email-state domain contested |
| `Attendance`, `EventAttachment`, `EventEvaluation`, `Announcement` | No integrity rules specified in the data model |

`event.organizer_org_id` and `audit_log.entity_id` are therefore **deliberately unenforced**, each
marked in the migration as a known omission rather than an oversight.

### 10.5 Not implemented, per scope

Authentication and institutional SSO, email delivery, protected API routes, hosting, and external
institutional integrations. No route handler exists. The four-state email model is unchanged and
`NOT_REQUESTED` is not implemented; OQ-56 is untouched.

### 10.6 Verification actually performed

| Check | Command | Result |
|---|---|---|
| Type check | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0, layer-boundary rules enforced |
| Unit tests | `pnpm test:unit` | **99 passed** |
| Integration tests | `pnpm test:integration` | **106 passed** against PostgreSQL 17 |
| Combined, no database | `pnpm test` | 106 passed, **99 skipped** — the skipped tests are the database ones and are reported as not run |
| TST-03 mutation | steps 2 and 1 deliberately swapped | **4 tests failed as required**, then the correct order was restored and 99 passed again |

---

## 11. L4 registration and capacity milestone — decisions

Recorded 2026-10-09. Project-owner authority. No institutional approval is represented.

### 11.1 FR-REG-037 — capacity reduction below the registered count is REFUSED

**Decision.** Option A. A reduction whose remaining registered count exceeds the requested capacity is
**rejected**. Capacity is never clamped automatically. A refusal leaves the event capacity and every
registration unchanged.

**Sources.** `FUNCTIONAL-REQUIREMENTS.md` line 200 states FR-REG-037 as *"The system shall refuse to
reduce capacity below the count of existing registrations"*, and `TESTING-STRATEGY.md` line 83 records
RV-11 with the expected outcome **"Rejected"**. `DATA-MODEL.md` lines 212-213 permit one carve-out:
*"capacity MUST NOT be reduced below the count of existing registrations **without simultaneous
participant removal**"*.

**Boundary.** A reduction **to** exactly the registered count is accepted. "Never exceeds" is satisfied
when `count === capacity`; refusing there would make the limit unattainable.

**The refusal shape**, as approved: event id, requested capacity, current registered count, remaining
registered count after requested cancellations, and the shortfall.

### 11.2 Simultaneous participant removal

**Decision.** Included, per `DATA-MODEL.md` lines 212-213. Removals and the capacity write are **one
transaction**. If any removal is invalid, or the remaining count still exceeds the request, **nothing
is committed** — neither the cancellations nor the capacity change.

Sequence, in this order and for these reasons: read the event; validate the capacity (FR-EVT-009);
validate **every** removal before applying **any**; apply removals with their AUD-13 entries; recount
from storage in the same transaction; refuse if the count still exceeds the request (FR-REG-037); write
capacity only then (AUD-05).

A removal requires a reason, per FR-REG-028, because a removal during a capacity reduction is never a
student's own cancellation.

**No authorization rules were invented.** Who may reduce capacity is FR-REG-032's territory and belongs
to the milestone that adds route handlers and a session. `actorUserId` records who, for FR-EVT-016; it
decides nothing.

### 11.3 FR-EVT-016 — event modification metadata

**Decision.** Migration `0004_event_modified_by.sql` adds `event.updated_by UUID REFERENCES
app_user(user_id) ON DELETE RESTRICT` and `event.updated_at TIMESTAMPTZ DEFAULT now()`.

`updated_by` is **nullable**: an event created by a migration, a seed or a test fixture has no human
actor, and inventing one would be worse than recording none. `updated_at` is backfilled from creation
time, so an existing event does not report a modification at the moment the migration ran.

`ON DELETE RESTRICT`, never CASCADE or SET NULL, for the same reason as `audit_log.actor_user_id`:
`DATA-MODEL.md` line 548 requires that records are retained and never cascade-deleted with their
subject, and `SECURITY-PLAN.md` lines 360-364 record that no retention policy authorises erasure.

**Set by the application, not by a trigger.** A `BEFORE UPDATE` trigger would also stamp rows modified
by incidental writes, recording modifications with no actor. FR-EVT-016 asks who modified the event, and
an `updated_at` without a matching `updated_by` would record a moment with nobody.

### 11.4 Layer placement

**Decision.** The capacity invariant lives in **L4** (`src/l4/`), with persistence primitives in L2
(`src/db/`).

`SYSTEM-ARCHITECTURE.md` line 100 forbids L2 from "interpret[ing] a lifecycle rule", and line 98 forbids
L4 from holding a rule that belongs to L3. The capacity invariant belongs to neither L2 nor L3: it
compares a stored value against a count of rows, and L3 may not perform I/O. It is a consistency rule
about storage, so it sits in L4 where the read and the write share one transaction.

### 11.5 A real defect: the transaction helper committed refusals

`withTransaction` **commits any resolved body**, whatever it resolves to. That was correct while the
only callers returned refusals without having written anything.

`reduceEventCapacity` cancels participants *before* it can evaluate FR-REG-037, so its `return
{ ok: false }` **committed those cancellations**. The refusal was reported faithfully while two
participants were removed from a reduction that never happened. The all-or-nothing requirement was
violated.

**Fix.** `RollbackSignal`, thrown by the body to roll back and resolve to a refusal. A business refusal
is not an error and never reaches the caller as one. `client.ts` documents the commit semantics so a
future caller does not reintroduce the defect.

**Found by** `test/capacity.test.ts` asserting committed state after a refusal — a return-value
assertion would have passed.

### 11.6 D4 — FR-NOT-031 deferred

`FR-NOT-031` requires a `HIGH` notification when an event's capacity changes. **Deferred.** Notification
implementation is outside this milestone and depends on the unresolved notification design and OQ-56,
which is BLOCKING and remains open. No notification table was added, and the four-state email model is
untouched. `reduceEventCapacity` records AUD-05 for the event modification but emits no notification;
that is a known omission, not an oversight.

### 11.7 D5 — CON-05 deferred

`CON-05` — *"Registration cancelled and re-registered simultaneously | Consistent final state"*
(`TESTING-STRATEGY.md` line 122) — is **deferred to a separate milestone**.

**Relationship to OQ-10.** CON-05's correct outcome depends on which reading of OQ-10 holds: if
cancellation releases the slot, a cancel and a re-register racing must converge on one active row; if a
cancelled registration consumed the slot permanently, the outcome differs. OQ-10 remains **OPEN** in
`OPEN-QUESTIONS.md`, so settling CON-05 now would pre-empt an institutional decision. The partial unique
index is unchanged and the question register is untouched.

### 11.8 OQ-10 remains OPEN

The schema still uses `UNIQUE (user_id, event_id) WHERE status = 'REGISTERED'`. `OPEN-QUESTIONS.md`
line 216 still reads `Status: OPEN`, and the register was not modified. §9.1 records an implementation
choice under project-owner authority; it is not institutional approval.

---

## 12. L4 milestone implementation status

### 12.1 Delivered and verified

| Area | Artefact | Verification |
|---|---|---|
| Registration use case | `src/l4/register-participant.ts` | Reuses the L3 nine-step evaluator; all nine steps reachable and asserted; 22 tests |
| Capacity reduction | `src/l4/capacity.ts` | FR-REG-037, atomic rollback, simultaneous removal; 28 tests |
| Persistence primitives | `src/db/registration-persistence.ts` | L2 queries only, no decisions |
| Refusal contracts | `src/db/registration-store.types.ts` | D1 refusal shape |
| Modification metadata | `0004_event_modified_by.sql` | FR-EVT-016, `RESTRICT` verified in the catalog |
| Concurrency | `test/capacity-concurrency.test.ts` | CON-04, NEG-04, CON-01, CON-02 on independent sessions |

### 12.2 Defects found by the tests and fixed

| Defect | Found by | Fix |
|---|---|---|
| **`withTransaction` committed refusals**, so a refused capacity reduction still cancelled participants | `capacity.test.ts` asserting committed state after a refusal | `RollbackSignal`; documented commit semantics in `client.ts` |
| `seedEvent` passed a bound `null` where `COALESCE($8::timestamptz, …)` was expected, so the default never applied and the deadline was NULL | `event_window_required_check` violation | Resolve the clock once server-side; compute dates in JS |
| A derived `registration_start` of `deadline − 1 day` put the window **29 days in the future**, refusing every registration at `REGISTRATION_OPEN` | 14 `registerParticipant` success tests failing | `min(deadline − 1 day, now − 1 day)` |
| The `invariant()` helper's correlated subquery omitted `WHERE r.event_id = e.event_id` | "missing FROM-clause entry for table r" | Corrected; the omission would also have counted the whole table |
| `RollbackSignal` escaped to the caller from the duplicate-removal check, which runs *outside* the transaction | That path having no transaction to roll back | Plain refusal there; the check writes nothing |
| `test/migration.test.ts` and `test/schema.test.ts` hard-coded migration filenames | Adding `0004` | Both now derive the list from the schema directory |

### 12.3 Verification actually performed

| Check | Command | Result |
|---|---|---|
| Type check | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0, layer boundaries enforced |
| Unit tests | `pnpm test:unit` | **99 passed** |
| Integration tests | `pnpm test:integration` | **165 passed** against real PostgreSQL 17, twice consecutively |
| Baseline re-verified | `pnpm test:integration` | 99 unit + 106 integration before this milestone |
| Audit tamper | `GRANT UPDATE ON audit_log TO erns_app` | **6 permission tests failed**, then passed after `REVOKE` |
| Migration idempotency | `pnpm db:migrate` twice | applied once, then "No pending migrations" |

**No test was skipped.** Every integration test ran against the live database.

**D6 — database safety.** The target was positively identified as disposable before any destructive
command: container `erns-postgres` carries
`com.docker.compose.project.config_files` pointing at this project's `docker-compose.yml`, its
`working_dir` is this project, it is bound to `127.0.0.1` only, and its volume is the project-local
`erns-pgdata`. `ERNS_DATABASE_URL` and `ERNS_APP_URL` are unset in the shell, so nothing connected
automatically. `test/db-harness.ts` truncates through the **owner** pool only; `erns_app` has no
`TRUNCATE` on `audit_log` by design, and attempting it fails with a permission error, which is the
permission model working.

**TST-09 mutation — attempted and INCONCLUSIVE.** Moving the capacity read outside the transaction
deadlocked rather than failing cleanly, because the mutation took a second connection from a
`max: 1` pool while holding the first. The mutation was reverted and verified byte-identical. **The
equivalent witness for CON-01 does exist and is passing**
(`test/concurrency.test.ts`, "TST-09 — moving the capacity check outside the transaction breaks
CON-01"), and the bare-INSERT boundary is documented alongside it. A CON-04-specific mutation witness
is **not** established.

### 12.4 Not implemented, per scope

Authentication, SSO, email delivery, notifications, protected API routes, UI, deployment, and the
remaining eleven entities. No authorization rule was invented. The four-state email model is unchanged
and OQ-56 is untouched.

---

## 13. Change record

| Date | Decision | Authority |
|---|---|---|
| 2026-10-09 | Project-owner authorisation to proceed with implementation | Project Owner |
| 2026-10-09 | Amendments A-1 to A-6 | Project Owner |
| 2026-10-09 | Technology stack recorded per §4 | Project Owner |
| 2026-10-09 | Amendment A-7 and repository layout per §8; pnpm workspace removed | Project Owner |
| 2026-10-09 | First core milestone authorised: OQ-10 partial index, UUID identifiers, role separation, `JSONB` snapshot | Project Owner |
| 2026-10-09 | Milestone implemented and verified; decisions recorded per §9, status per §10 | Project Owner |
| 2026-10-09 | L4 registration and capacity milestone: FR-REG-037 refusal, simultaneous removal, FR-EVT-016 metadata per §11 | Project Owner |
| 2026-10-09 | FR-NOT-031 and CON-05 recorded as deferred per §11.6 and §11.7 | Project Owner |
| 2026-10-09 | L4 milestone implemented and verified; status per §12 | Project Owner |
| 2026-10-09 | Web framework adoption **deferred**; headless structure retained per §8.1 | Project Owner |
| 2026-10-09 | Strategy A (Prisma + `pg`) **evaluated and paused** per §14; §4.2 and A-7 unamended | Project Owner |

**Ratification status.** None of the above has been ratified by Council Secretary, IT, Council,
Dean, Student Affairs Office, or Security Office. The stack selections remain formally unratified
under `TECH-STACK.md` §4 steps 5 and 7. The §9 and §11 decisions are project-owner implementation
decisions and carry no institutional approval. OQ-10 and OQ-56 remain open in `OPEN-QUESTIONS.md`; §9.1
and §11.8 record how the related questions were implemented, not what the institution requires.

**Framework status.** Per §8.1, no web framework is installed and no dependency has been added for one.
TC-01, TC-02, and the Next.js version are **undecided**, and the choice between major versions 15 and 16
is left open deliberately. The staged `TECH-STACK.md` still records TC-01 and TC-02 as unselected.

## 14. Strategy A (Prisma + `pg`) — evaluated and PAUSED

> **NOT APPROVED. NOT IMPLEMENTED.** §4.2 (ORM excluded) and A-7 (one deployable) **remain in force and
> are unamended**. No Prisma dependency was installed, no `prisma/` directory exists, and no database,
> schema, migration, or test was changed by this evaluation. Nothing in this section authorises work.

Recorded 2026-10-09. This entry exists so that a future reader does not repeat the evaluation from
scratch, and so the reason for the pause is not mistaken for a judgement that an ORM would be wrong
for ERNS.

### 14.1 What was evaluated

Strategy A — Prisma Client as primary data access, existing `pg` retained where Prisma is inadequate,
SQL migrations remaining authoritative. The evaluation was **read-only**: repository inspection, npm
registry metadata queries, and official documentation reads. No Prisma command was run.

### 14.2 The three findings that decided it

**Attribution.** The Prisma-side claims below come from official Prisma documentation pages read
during the evaluation on 2026-10-09 (`prisma.io` transactions reference and database-features
reference, and the npm registry metadata for `@prisma/adapter-pg`). They are **documentation-derived,
not verified against an installed Prisma**, because none is installed. They have not been re-verified
since. The ERNS-side facts in the same list were verified directly in this repository and are cited to
file and line.

| # | Finding | Basis |
|---|---|---|
| 1 | Prisma transaction handles are **tx-scoped only**. A query issued through the client rather than the transaction handle runs on its own connection, **outside** the open transaction, and will not roll back with it. Nested transactions do not nest — the inner call is independent. | Prisma transactions documentation, 2026-10-09. **Not re-verified.** |
| 2 | **`CHECK` constraints are not representable** in the Prisma schema *and* are unsupported in Prisma Migrate. ERNS has **24** of them, including the two-value registration status domain. | Prisma database-features reference, 2026-10-09 (**Not re-verified**); constraint count verified in `src/db/schema/0001_initial.sql` and `0003_cancellation_constraint.sql` |
| 3 | `@prisma/adapter-pg` declares a dependency on `pg@^8.16.3` — the driver ERNS already uses (`pg@8.16.3`). **The driver is not the obstacle.** | npm registry metadata, 2026-10-09 (**Not re-verified**) |

### 14.3 Why this decided the pause

Finding 1 is the decisive one, and it is structural rather than a matter of taste.

Every existing business operation is already transactional:

- `src/l4/capacity.ts:152-320` — **seven or more** operations inside one `withTransaction`
- `src/l4/register-participant.ts:103-200` — **three** inside one

Those transactions carry three guarantees built by hand in `src/db/client.ts`:

- `SERIALIZABLE` isolation (`:155`), required by C-02
- bounded retry of SQLSTATE `40001` only, 3 attempts, 50/100 ms (`:159-217`), with an explicit
  distinction between a business refusal and retry exhaustion
- `RollbackSignal` (`:110-118`, `:167-185`), which rolls back and resolves to a refusal — the
  mechanism that makes a refused capacity reduction atomic

There is **no non-transactional CRUD in the current codebase** for Prisma to become "primary" over.
The operations it would suit are the ones not yet built.

The last milestone already fixed a defect in exactly this area: returning a refusal instead of
throwing `RollbackSignal` caused a refused capacity reduction to commit the cancellations it had
already applied. Reimplementing that machinery on a different client is the highest-risk work
available, and it would be undertaken to obtain generated types for queries ERNS does not yet have.

### 14.4 What must be re-verified before reconsideration

Any future attempt to adopt an ORM should re-establish, at minimum:

1. Whether Prisma transaction handles can participate in an existing `pg` transaction in **either**
   direction. The documentation read during the evaluation described only the tx-scoped case; the
   reverse direction was not addressed and is **NOT VERIFIED**.
2. Whether `@prisma/adapter-pg` **shares** an existing `pg` pool or wraps it. **NOT VERIFIED.**
3. That `SERIALIZABLE` plus a hand-written `40001` retry behave equivalently under contention. The
   Prisma transactions reference states the client does not retry write conflicts and has no
   `isolationLevel` option, so both would be hand-rolled. **NOT VERIFIED — requires empirical test.**
4. The current status of Prisma, TypeScript, and adapter versions. During the evaluation the npm
   `latest` tag for `@prisma/client` was 7.10.0 while the documentation's current line was
   **Prisma ORM 8**, and TypeScript `latest` was **7.0.2** against this repository's 5.9.3. Version
   conclusions age fastest of anything recorded here. **NOT RE-VERIFIED.**
5. Whether the `CHECK`-constraint gap has closed. If it has, finding 2 weakens considerably and the
   evaluation should be redone rather than inherited.

### 14.5 What would have to change to reopen this

§4.2 amended by the project owner. A-7 is **not** implicated by Prisma alone; it is implicated only
if a separate Express backend is also introduced, which remains blocked on OQ-30.

None of the following is recommended and none is authorised: installing Prisma, generating a client,
running `prisma db pull`, `prisma migrate dev`, `prisma db push`, `prisma migrate deploy`,
`prisma migrate reset`, or using Prisma Studio against any database.

### 14.6 Alternatives noted, not adopted

Kysely over `pg` was compared and scores at least as well for ERNS's **current** code, because it
composes with an existing `pg` `PoolClient` and keeps a single schema representation. It is recorded
here for completeness only. No alternative is proposed or adopted.

---

**Related documents:** [PROJECT-OWNER-DECISIONS.md](PROJECT-OWNER-DECISIONS.md) ·
[TECH-STACK.md](../architecture/TECH-STACK.md) · [OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md) ·
[PB-ENG-20-CHANGE-MANAGEMENT.md](../playbooks/engineering/PB-ENG-20-CHANGE-MANAGEMENT.md) ·
[ROADMAP.md](../planning/ROADMAP.md) · [PROJECT-OVERVIEW.md](../planning/PROJECT-OVERVIEW.md)