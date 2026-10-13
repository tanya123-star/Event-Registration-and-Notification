# Project Guidelines: KASAMA Event Registration and Notification System

Status as of 2026-10-13. Compiled from repo sources only: `docs/MVP-SPEC.md`,
`GLOSSARY.md`, `docs/adr/`, `docs/agents/`, `AGENTS.md`, `docs/planning/`,
`docs/architecture/`, and the live GitHub issue tracker
(`tanya123-star/Event-Registration-and-Notification`, branch `main`).
Anything not found in those sources is marked **Missing**.

## 1. Purpose and problems

ERNS is the central record for KASAMA events, from proposal through approval,
Registration, Attendance, and archiving (`GLOSSARY.md`). It has exactly two primary
functions: **Event Registration** (binding one Student to one Event) and
**Notification** (communicating to Students through an authoritative record).
Everything else supports those two (`docs/planning/PROJECT-OVERVIEW.md`,
`docs/architecture/SYSTEM-ARCHITECTURE.md`). ERNS is not a calendar and not a
generic event-management platform (`docs/planning/PROBLEM-ANALYSIS.md`).

The core problem: the organisation lacks a centralised system for communicating
Event information and managing Student Registration. Information travels through
Facebook pages, group chats, letters, and Club Officers; paper approval stalls
between offices with no visible state; QR and email Registration occasionally fail
with only ad-hoc backup; Attendance sheets carry duplicates; and there is no
central record (`docs/MVP-SPEC.md`, `docs/planning/PROBLEM-ANALYSIS.md`).

The fifteen interview pain points (`PP-01`–`PP-15`) and their root causes:

| Pain points | Root cause | Remedy |
|---|---|---|
| PP-01–PP-04 dissemination, reading, Club Officer dependence, channel sprawl | RC-1 no authoritative channel; RC-2 no delivery record | Notification module, in-app Notification centre with read state |
| PP-05 manual approval | RC-3 no visible approval state | Approval chain with visible current step |
| PP-06–PP-08, PP-12 QR failure, manual Attendance, queues, duplicates | RC-4 Attendance not bound to Registration; RC-5 no designed fallback | Attendance bound to Registration; staff-assisted Attendance as primary path |
| PP-09–PP-11 mechanics, errors, missed announcements | RC-6 no authoritative Event home | Event record with required-field discipline |
| PP-13 working-Student Attendance | RC-7 fixed window assumption | Configurable Attendance windows |
| PP-14–PP-15 backup, learning from past events | RC-8 unstructured post-event knowledge | Automated backup (proposed); structured evaluation (deferred, PP-15 unaddressed in MVP) |

## 2. MVP scope and Phase 2

### MVP user stories (`docs/MVP-SPEC.md`, 37 stories)

- **Event authoring and approval (1–10):** Event Officer drafts, submits, fixes
  refused submissions; Approver acts only on their own office step with
  approve / reject-with-reason / request-revision-with-comments; stall visible
  with current office and wait time; Administrator delegation retaining the
  original assignee; publish only fully APPROVED Events with chain re-verified
  at publication and the final Approver barred from publishing; audited
  exception publish with justification and participant-facing notice.
- **Registration (11–20):** Students browse published Events in their audience,
  register with login, receive a Confirmation reference, are refused duplicates
  with existing status shown and full Events with "event is full"; self-cancel
  until close with the CANCELLED record retained; re-register where a slot is
  free; Event Officer participant list with count and Capacity; manual
  Registration with reason; officer/admin cancellation with reason and
  IMPORTANT-priority Notice; every override reasoned and audited.
- **Attendance, staff-assisted primary path (21–26):** lookup by name,
  Confirmation reference or student number; records only for REGISTERED
  Registrations with recorder identity; duplicates refused with
  "already recorded"; Walk-in with reason counted separately; live
  registered / present / absent / Walk-in counts; Event Officer sees the summary
  with no correction power.
- **Notification (27–32):** in-app Notification as channel of record;
  confirmation carrying Event detail plus Confirmation reference;
  Acknowledgement of IMPORTANT Notifications recording user, Notification and
  timestamp; manual officer reminders at the default lead time; aggregate
  read/Acknowledgement counts for owners (never addresses); email failure
  leaves the in-app record untouched.
- **Administration and reports (33–36):** CSV Student import, no self-service
  path; suspend/revoke refusing or reassigning atomically where in-flight
  obligations exist; operational reports; audited data-fix path for wrong
  Attendance with in-app corrections prohibited.

### Reuse: do not rebuild (`docs/MVP-SPEC.md`)

Event lifecycle machine (DRAFT–ARCHIVED, T-01–T-20, SD-1, SD-3); nine-step
Registration validation order (eligibility currently passes true — the known
gap); Confirmation reference generator (8-symbol alphabet, UNIQUE storage);
email state machine (QUEUED, SENT, FAILED, BOUNCED; SENT means
accepted-by-transport only); handler-core seam (primary seam, thin routes);
existing use cases and reads; Postgres stores with least-privilege grants;
20-suite test corpus as the pattern for new tests.

### The build list, in order (spec gaps 1–9)

1. Session and identity — **built** (issue #2, closed).
2. Approval chain mechanism. 3. Audience and eligibility. 4. In-app
   Notification centre. 5. Email delivery layer. 6. Staff-assisted Attendance.
3. CSV student import. 8. REST completion and OpenAPI. 9. Mock SMS adapter seam
   (unwired). Gaps 2–9 are open issues #3–#12; see section 7.

### Phase 2 (deferred with reasons)

- **QR attendance:** deferred because QR failed on event day before; building it
  first leaves staff-assisted least-tested when most needed. Returns as an
  accelerator encoding the same Confirmation reference. Reversal: Phase 6 review
  or staff finding staff-assisted too slow.
- **Check-in/check-out pair:** deferred; one presence record per Registration
  keeps storage uniqueness simple. Returns only with a specified missing-exit rule.
- **SMS sending:** deferred; no confirmed availability and contradicts the locked
  in-app-plus-email model. Only the mock seam ships.
- **Structured post-event evaluation:** deferred; evaluation design still open.
  Officers keep current practice; PP-15 stays explicitly unaddressed.
- Also out of scope: facial recognition, AI planning/verification, payments,
  social/chat, GPS, recommendations, analytics dashboards, native mobile apps,
  offline-first, multi-tenancy, waitlists, student self-provisioning, automatic
  approval advancement.

### What the MVP deliberately does not fully solve

Nine pain points only partially addressed (PP-02, PP-04, PP-05, PP-08, PP-09,
PP-11, PP-13, PP-14; PP-06 avoided not solved), PP-15 not addressed
(`docs/planning/MVP.md`). The system removes structural causes, not behavioural
ones: it cannot make a Student read, an Approver decide quickly, or an officer
review last year's evaluation.

## 3. Roles

Exactly five system roles; Club Officer is NOT a login role and stays a
reinforcement channel outside the system (`docs/planning/USER-ROLES.md`,
`GLOSSARY.md`).

| Role | Does | Cannot do |
|---|---|---|
| Administrator | Provision/suspend accounts, assign/revoke roles, configure chains, export audit, correct Attendance with reason, system-wide announcements | Nothing silently; every override needs a reason and audit entry (SD-4) |
| Event Officer | Authors Events, drives approval, publishes, sends owned-Event Notifications, manages owned Registrations with reason, reads owned Attendance | Correct Attendance; approve own Event; see other officers' drafts |
| Approver | Approves, rejects with reason, or requests revision with comments on assigned steps; may delegate | Edit Event content; publish; register; see participant identity data |
| Student | Reads published Events, registers/cancels own Registration, reads own Notifications, acknowledges IMPORTANT ones | Register for another; see others' records or unpublished Events |
| Attendance Staff | Records Attendance via QR or staff-assisted path, corrects with reason within authority | Create Registrations under any circumstance, including Walk-ins (SD-2) |

Segregation of duties, enforced in application logic not the interface:
**SD-1** final Approver cannot publish; **SD-2** Attendance Staff and Approver
cannot create Registrations; **SD-3** Approver cannot be Event Officer for the
same Event; **SD-4** Administrator overrides are attributed and reasoned.
Attendance Staff grants are per-Event or per-term, not permanent. Revocation
with in-flight obligations is refused or reassigned atomically — pending work is
never orphaned.

## 4. Settled decisions

Locked by governance (`docs/planning/PROJECT-OVERVIEW.md` section 4): title;
two primary functions; five roles with Club Officer excluded; Registration
states `REGISTERED`/`CANCELLED` only (`WAITLISTED`, `ATTENDED`, `ABSENT`
prohibited); Attendance a separate entity; Capacity a hard cap with no waitlist;
uniqueness on `(user_id, event_id)`; nine-step validation order; in-app centre
as source of truth with `CREATED`/`READ`/`ACKNOWLEDGED`; email states `QUEUED`/
`SENT`/`FAILED`/`BOUNCED` (`Delivered`/`Opened` prohibited); Acknowledgement
only for IMPORTANT; 15 conceptual entities; the out-of-scope list.

- **ADR-0001** (`docs/adr/0001-minimum-necessary-exposure.md`, RA 10173): officers
  see aggregate read/Acknowledgement counts only; Attendance Staff see name plus
  Confirmation reference for their assigned Event only; QR tokens opaque; email
  detail restricted to Administrators.
- **Spec baseline:** 20 grill-with-docs decisions (2026-10-12); `GLOSSARY.md`
  (13 terms); planning baseline in `docs/planning/` remains the requirements
  authority — the spec is the build order for the MVP only.
- **Project-owner decisions** (`docs/architecture/PROJECT-OWNER-DECISIONS.md`,
  2026-10-09, project-owner authority, no institutional approval represented):
  OQ-10 implemented as partial index `UNIQUE (user_id, event_id) WHERE status =
  'REGISTERED'` (OQ-10 itself stays OPEN); UUID `registration_id` plus 8-character
  Confirmation reference over a 32-symbol alphabet (32⁸ combinations);
  `erns_owner` (NOLOGIN, owns objects) vs `erns_app` (LOGIN, least privilege,
  no update/delete on audit); audit `actor_user_id` FK with `ON DELETE
  RESTRICT`; `student_context` JSONB; forward-only checksummed migrations;
  FR-REG-037 capacity reduction below registered count REFUSED (option A) with
  simultaneous removal in one transaction; FR-EVT-016 `updated_by`/`updated_at`
  set by the application; capacity invariant lives in L4; web framework
  adoption deferred (headless library today); Prisma-plus-`pg` evaluated and
  paused; explicit SQL through `pg`, no ORM.
- **CON-04 gap recorded:** the schema cannot enforce "registered count never
  exceeds reduced Capacity" for in-flight writes; the obligation sits on the
  reduction transaction.

## 5. Stack

Project-owner selections, **not ratified** — ratification needs Council
Secretary plus IT and is outstanding
(`docs/architecture/TECH-STACK.md` section 8.1,
`docs/architecture/PROJECT-OWNER-DECISIONS.md` section 4):

| Decided (selection only) | Undecided |
|---|---|
| TypeScript 5.x on Node.js 24 LTS, support ends 2028-04-30; Node 26 reassess after 2026-10-28 | Hosting / deployment platform (OQ-30, master blocker), existing server (OQ-31) |
| PostgreSQL 17, support ends 2029-11-08; no adoption of v18 without assessment | Email transport (OQ-32, OQ-50); console transport in development only |
| Next.js 15 App Router with Route Handlers in one deployable — **not installed**; version 15 vs 16 deliberately open; no `src/app/`, no TSX today | Authentication mechanism / SSO (OQ-45, blocked by OQ-33); login page cannot be built yet |
| Plain CSS custom properties; Vitest; `tsc --noEmit` + ESLint (L3/L5 boundary enforced, L5 rules dormant); pnpm 11 | Frontend framework install, styling ratification, build tooling ratification |
| Node `worker_threads` + PostgreSQL-backed queue; Pino + `AsyncLocalStorage` correlation id | Repository host/ownership (OQ-52), observability (OQ-53), runtime/OS (OQ-54), staging (OQ-55) |
| Local Docker Compose for development and integration tests | Background execution ratification, package-manager ratification |

Constraints any stack must satisfy: composite uniqueness and serialisable /
repeatable-read transactions at the store; append-only audit; frozen
dispatch audiences as rows; constrained enumerations; background dispatch off
the request path; server-side deny-by-default authorisation; mobile-first
low-end Android with WCAG 2.1 AA; revocable server-side sessions.

## 6. Integration points

(`docs/MVP-SPEC.md`, `docs/architecture/INTEGRATION-BOUNDARIES.md`.)

- **Email provider (IB-1, only confirmed dependency):** behind a send port;
  selection, sending permission, rate limits and deliverability pending IT
  sign-off (A5, A6). Until signed off, dispatch queues and the in-app centre
  stays authoritative; nothing beyond SENT is ever claimed. Boundary is
  asynchronous, degrades to record-and-continue; `FAILED`/`BOUNCED` are recorded
  outcomes, not exceptions. Confirmation carries Event detail but never the
  Registration context snapshot.
- **Institutional sign-on (IB-2):** existence unconfirmed (OQ-33). Architecture
  supports either outcome behind the adapter boundary.
- **Student information system (IB-3):** no integration by decision; Council
  seeds and maintains Student data; no self-service creation (AS-05).
- **Hosting (IB-4):** undecided; widest-reaching open boundary.
- **Background queue (IB-5):** undecided; dispatch runs off the request path
  with observable progress.
- **CSV student import:** file in, validated accounts out; per-row results, no
  silent partial application, full audit.
- **REST API with OpenAPI:** versioned endpoints for Events, Registrations,
  approvals, Attendance, Notifications, reports; docs generated from the
  implemented surface so docs cannot drift.
- **Mock SMS adapter:** port plus mock only; nothing calls it.
- Boundary rules BR-1–BR-5: timeouts on every outbound call; failures recorded
  as state; no dependency trusted with authority; minimum data sent; dispatch
  bounded by rate limits. Session-store failure denies rather than degrades.

## 7. Build roadmap with real issue numbers and current status

Tracker state verified live 2026-10-13: **13 issues, 11 open, 2 closed**
(#2 and #13 closed). Parent: #1 (open). Tracer tickets #3–#12 (open) were cut
from #1 via to-tickets.

| Issue | Spec coverage | Status | Label |
|---|---|---|---|
| #1 MVP Spec: proposal approval, registration, staff-assisted attendance, notifications | Parent tracker; points at `docs/MVP-SPEC.md` | OPEN | ready-for-agent |
| #2 MVP T1: Session and identity resolution | Gap 1: caller resolved to user/status/roles at request time; login-required Registration; immediate suspend/revoke effect | CLOSED | ready-for-agent |
| #3 MVP T2: Approval chain mechanism and publication gate | Gap 2; stories 1–10; assumptions A1–A4 | OPEN, blocked by #2 | ready-for-human (needs OQ-01–OQ-04 sign-off) |
| #4 MVP T3: Student profile, audience and eligibility | Gap 3; closes the eligibility-step gap; ADR-0001 aggregate-only | OPEN, blocked by #2 | ready-for-agent |
| #5 MVP T4: Registration completion flows | Stories 11–20 on the nine-step order; hard cap; cancel-frees-slot | OPEN, blocked by #2 + #4 | ready-for-agent |
| #6 MVP T5: In-app notification centre and manual reminders | Gap 4; stories 27–31; IMPORTANT-only Acknowledgement | OPEN, blocked by #2 + #4 | ready-for-agent |
| #7 MVP T6: Email delivery layer | Gap 5; story 32; assumptions A5–A6 | OPEN, blocked by #6 | ready-for-human (needs OQ-32/OQ-62 sign-off) |
| #8 MVP T7: Staff-assisted attendance with walk-ins and live counts | Gap 6; stories 21–26; corrections prohibited in-app | OPEN, blocked by #2 + #5 | ready-for-agent |
| #9 MVP T8: Administrator CSV student import | Gap 7; story 33 | OPEN, blocked by #2 | ready-for-agent |
| #10 MVP T9: REST completion and OpenAPI docs | Gap 8; all MVP endpoints | OPEN, blocked by #3, #5, #6, #8, #9 | ready-for-agent |
| #11 MVP T10: Operational reports and pending-approval idle view | Stories 34–36; audited export; idle days | OPEN, blocked by #3, #5, #8 | ready-for-agent |
| #12 MVP T11: Mock SMS adapter seam (unwired) | Gap 9; boundary proof only | OPEN, blocked by #6 | ready-for-agent |
| #13 Isolate DB suites for the parallel runner (or serialize them) | Infra: suites serialized; closed with comment "Done in 8b9804c" | CLOSED | ready-for-agent |

What is built: the full reuse inventory (section 2), session/identity (#2,
commit `f0328cd`), serialized DB suites (#13, commit `8b9804c`); full
`pnpm exec vitest` green at 376/376. What is left: gaps 2–9, i.e. issues
#3–#12 in blocked order above. Wayfinder fit note: the skill does not apply to
this chart — there is no loose idea, no `wayfinder:map` issue, and these are
build tickets, not decision tickets — so this section is the manual summary.

## 8. The per-ticket skill loop

`AGENTS.md` requires checking `.agents/skills/` before any task and naming the
skill used. The loop per ticket:

1. **Orient:** `wayfinder` only when charting a loose idea into a decision map;
   otherwise proceed manually.
2. **Plan / specify:** `grill-with-docs`, `to-spec`, `to-tickets` (tickets #3–#12
   were cut this way from #1).
3. **Build:** `tdd` or `implement`.
4. **Check:** `code-review`.
5. **Failures:** `diagnose`.
6. **Issues:** `triage` with the five canonical labels
   (`docs/agents/triage-labels.md`): `needs-triage`, `needs-info`,
   `ready-for-agent`, `ready-for-human`, `wontfix`.
7. **Tracker operations** (`docs/agents/issue-tracker.md`, `gh` CLI): create
   with `gh issue create`; read with `gh issue view <n> --json
   number,title,body,labels,comments`; list with `gh issue list --state ...`;
   sub-issue via `gh issue create --parent` / `--add-sub-issue` (else
   `Part of #<parent>` in the body); comment, label, and close through `gh`.
   PRs are not a triage surface. Wayfinding map/ticket labels exist in the doc
   but no map issue exists — **Missing**.

## 9. Engineering rules

- **Status labels** (`docs/planning/CONVENTIONS.md`): CONFIRMED / PROPOSED /
  ASSUMPTION / OPEN QUESTION. An ASSUMPTION must never be restated as CONFIRMED
  downstream; promotion needs a documented stakeholder decision. Architecture
  docs for unbuilt capabilities carry the NOT-YET-IMPLEMENTED banner.
- **Identifiers:** `FR-<MODULE>-<NNN>`, `NFR-<CATEGORY>-<NNN>`, `OQ-NN`,
  `PP-NN`, `PB-NN` / `PB-ENG-NN`, `TR-NNN`, `TH-NN`, `RK-NN`, `AUD-NN`,
  `AUDT-NN`, `AS-NN`. Stable, never reused. New requirements use `shall`, one
  behaviour each, actor named, verifiable.
- **Terminology:** use `GLOSSARY.md` terms exactly (Event, Event Officer, Club
  Officer, Attendance, Approval chain, Registration, Confirmation reference,
  Notification, Acknowledgement, Walk-in, Capacity, Approver, Student). Never
  `WAITLISTED`, `ATTENDED`/`ABSENT` as Registration states, or `Delivered`/
  `Opened` as Notification states. Every requirement traces to a pain point or a
  recorded driver (`TRACEABILITY-MATRIX.md`); a requirement with no test
  reference is unverified.
- **Testing** (`docs/MVP-SPEC.md`, `docs/planning/TESTING-STRATEGY.md`): assert
  externally visible behaviour (status codes, refusal messages, stored rows,
  audit entries) through the highest seam available; handler-core tests run
  against real storage; pure rules unit-tested at the domain seam; concurrency
  claims proven only by real-storage contention tests. Failed test blocks the
  merge; never delete a test to pass, never mark expected-failure without a
  recorded reason. Test data synthetic only; production data in tests
  prohibited. Merge gates: unit, integration, authorisation-for-changed-resources,
  lint/type, no secrets. Release gates: all tests, SECS-01–SECS-13,
  accessibility, CON-01–CON-07, BLOCKING questions resolved, docs synchronised.
- **Structure** (`docs/architecture/SYSTEM-ARCHITECTURE.md`): five layers
  L1–L5, dependency strictly downward; L5 decides nothing; L3 performs no I/O;
  L2 decides no authorisation and interprets no lifecycle rule; authorisation
  enforced in L4 with deny by default; transaction boundaries per operation
  (Registration validation+write, uniqueness constraints, dispatch+recipients,
  decisions, audit-with-change; audit failure refuses the change).
- **Security** (`docs/architecture/SECURITY-ARCHITECTURE.md`): TB-3 is the
  enforcement point; direct-request bypass verified (NFRD-14); privileged
  actions need reason plus re-authentication; no internal detail or secrets to
  users/logs; deletion not offered until OQ-26–OQ-28 answered.
- **Anti-patterns:** silently choosing technology; copying requirements into
  playbooks; duplicating playbook content into architecture; claiming CI for a
  pipeline that does not exist; scope creep past the two-primary-functions test.
- Commit message convention in repo sources — **Missing** (playbooks were not
  consulted; observed history uses `feat:`/`test:`/`docs:`/`chore:` prefixes).

## 10. Open questions

- `docs/planning/OPEN-QUESTIONS.md`: **63 entries, 0 resolved, 17 BLOCKING**.
  Nothing closes on a technical decision alone; technology questions need
  Council Secretary plus IT agreement; OQ-07 (login requirement) stays OPEN
  with a NOT-APPROVED proposal; OQ-56 (four vs five email states incl.
  `NOT_REQUESTED`) touches a locked decision and stays open — the build
  implements four.
- Spec assumptions pending sign-off (`docs/MVP-SPEC.md` Further Notes):
  A1 final authority with Council (OQ-01); A2 Dean rule (OQ-02); A3 OSA rule
  (OQ-03); A4 Security threshold (OQ-04); A5 hosting/sending unverified, IT
  (OQ-30, OQ-32); A6 sender mailbox unowned, no delegation authorised (OQ-62).
- Reserved to institutions, blocking data-driven workarounds not at all but
  real deployment entirely: approval authority/thresholds (OQ-01, OQ-02, OQ-04),
  hosting (OQ-30), email permission (OQ-32), email-state domain (OQ-56),
  identity strength (OQ-07).
- RA 10173 posture follows ADR-0001 everywhere; venue connectivity for future
  QR assumed adequate pending a walkthrough (AS-06); offline scanning not planned.

## 11. Defense checklist

Drawn from the spec acceptance criteria, `MVP.md` definition of done, and the
release gates. Every item must hold before release is claimed:

- [ ] Approval: complete-draft submit creates chain and notifies; missing
  fields refused with list; out-of-order approval refused; revision without
  comments refused; rejection without reason refused; resubmit retains history;
  delegation retains original; publish with pending step refused; final
  Approver publishing refused; exception publish without justification refused;
  Class A edit returns Event to pending with amendment step.
- [ ] Registration: all nine validation steps refuse in order with specified
  messages; double Registration refused with existing status; last-slot
  contention lets exactly one of two simultaneous attempts succeed; capacity
  reduction below registered count refused; reasonless officer/admin change
  refused; Attendance Staff / Approver Registration refused; email failure
  leaves Registration standing with FAILED state.
- [ ] Attendance: REGISTERED record succeeds with recorder identity; second
  record refused; CANCELLED refused; outside all windows refused; reasonless
  Walk-in refused and counted apart; officer correction refused; live counts
  show four distinct numbers.
- [ ] Notification: one addressed record per audience member, no duplicates;
  IMPORTANT Acknowledgement machinery present; non-IMPORTANT Acknowledgement
  rejected; officer sees counts only; in-app record survives email failure;
  reminder reaches the send-time audience snapshot.
- [ ] Admin/reports: no self-service creation path exists; revocation with
  in-flight obligations refused or reassigned atomically; participant export
  writes an audit entry; audit entries immutable through every interface.
- [ ] Concurrency CON-01–CON-07 and authorisation AUTH-01–AUTH-15 pass against
  real storage; meta-tests TST-01–TST-10 prove the suite can fail; no `Delivered`
  or `Opened` value producible (schema inspection); all BLOCKING questions
  resolved; Council Secretary acceptance signed; officers, Attendance Staff
  trained; Students informed the system is the channel of record; docs
  synchronised — no documented behaviour the system lacks.

## 12. Map of where things live

- `GLOSSARY.md` (root): 13 domain terms, the vocabulary authority.
- `docs/MVP-SPEC.md`: the MVP build order; planning baseline stays the
  requirements authority.
- `docs/adr/`: ADR-0001 minimum-necessary exposure (only ADR).
- `docs/agents/`: `issue-tracker.md`, `triage-labels.md`, `domain.md`
  (single-context layout: root glossary + `docs/adr/`).
- `AGENTS.md` (root): skill check first, issue tracker pointer, triage labels
  pointer, domain layout pointer.
- `docs/planning/` (22 documents): WHY and WHAT — overview, conventions,
  problem analysis, stakeholders, roles, scope, functional + non-functional
  requirements, traceability, lifecycle, four workflows, data model,
  security plan, audit plan, testing strategy, MVP, roadmap, open questions.
- `docs/architecture/` (5 documents): structure — tech stack, system,
  security, environment, integration boundaries; plus
  `PROJECT-OWNER-DECISIONS.md` (governance amendment and milestone record).
- `docs/playbooks/`: HOW — system (17: PB-01–PB-17) and engineering (20:
  PB-ENG-01–PB-ENG-20) per the project overview; contents not consulted for
  this file — **Missing** from this compilation.
- `docs/README.md`, `docs/planning/PROJECT-OVERVIEW.md`: entry points and
  full document index.
- Code layout as recorded in `PROJECT-OWNER-DECISIONS.md` section 8 (headless
  library: `src/domain/` L3, `src/db/` L2 with forward-only `schema/`,
  `src/l4/` use cases; `docker/` local PostgreSQL 17; unit + integration
  Vitest configs; ESLint layer boundary) — not re-verified here.
