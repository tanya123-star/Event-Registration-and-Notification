# Environment Architecture

**Document:** ERNS-ARCH-ENV
**Area:** architecture
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** This document specifies a target state. **No environment exists.** There
> is no local setup beyond a text editor, no test environment, no staging environment, and no
> production environment. No infrastructure has been provisioned. See the implementation status
> section.

---

## Purpose

Describe the structural differences between the environments ERNS is intended to run in, and the
rules that follow from those differences.

**This document holds the structural differences. `PB-ENG-15 Environment Management` holds the
procedure** for configuring and operating them. Where both cover the same ground, this document states
what must differ and why; the playbook states who does it.

---

## Scope

**In scope:** the environments, the configuration each requires, what must differ between them, data
handling, and the structural constraints.

**Out of scope:** configuration procedure, in `PB-ENG-15 Environment Management`; deployment
mechanics, in `PB-ENG-10 CD/Deployment`; secret storage, in `PB-ENG-12 Secrets and Configuration`;
technology selection, in [TECH-STACK.md](TECH-STACK.md).

---

## 1. Planned Environments

**PROPOSED.** Four, with **staging conditional**.

| # | Environment | Purpose | Exists? |
|---|---|---|---|
| E-1 | Local development | Individual developer work | **No** |
| E-2 | Test / CI | Automated verification | **No** |
| E-3 | Staging | Pre-production verification of migrations and releases | **Conditional — OQ-55** |
| E-4 | Production | Real students, real participation records | **No** |

### 1.1 Staging is not assumed

**OQ-55** asks whether a staging environment will exist. **This document does not assume one.**

Where a rule below depends on staging, it is marked. Per `NFR-INTEG-007`, the correctness guarantees
are enforced by database constraints, and constraints can only be proven against a real storage layer
in E-2. Staging additionally governs whether a migration is rehearsed before production — and
**NFR-INTEG-010 and NFR-AVAIL-003 are both harder to honour when the first execution of a migration is
the production one.**

### 1.2 Why four environments is the right number for this project

Not a general rule. A specific one:

| Environment | Justification |
|---|---|
| E-1 separate from E-2 | A developer's local state is untrusted; the pipeline must prove the change works without it |
| E-2 separate from E-4 | **Test data is synthetic. Production data is real student records.** Mixing them is prohibited by `PB-ENG-08 Testing` section 6 |
| E-3 conditional | Small team, uncertain hosting, and a real cost to maintaining a third deployment. Recorded as a decision, not assumed away |
| No separate demo environment | A demo environment containing realistic data is a production environment with weaker controls. Not proposed |

---

## 2. What Must Differ Between Environments

**This is the substance of the document.** Configuration that is identical across environments is
configuration that is wrong in at least one of them.

| Concern | E-1 Local | E-2 Test / CI | E-3 Staging | E-4 Production |
|---|---|---|---|---|
| Data | Synthetic | Synthetic | Anonymised or synthetic | Real |
| Credentials | Developer-local | Automated, injected | Managed | Managed, rotated |
| Debug output | Permitted | Permitted | Restricted | **Prohibited**, `NFR-SEC-012` |
| Verbose logging | Permitted | Permitted | Permitted | `NFR-MAINT-004` only, no personal data |
| Source maps | Permitted | Permitted | Permitted | **Restricted** — see below |
| Email delivery | Captured, not sent | Captured, not sent | Real transport, internal recipients only | Real transport, real recipients |
| Error detail to users | Permitted | Permitted | Minimal | **Prohibited**, `NFR-SEC-012` |
| Seed data | Full | Full | Minimal | **None.** No synthetic records in production |
| Rate limits | Relaxed | Relaxed | Production values | Production values |
| Timeouts | Relaxed | Production values | Production values | Production values |
| Performance sampling | Optional | **Required** | Optional | Passive only |

### 2.1 Email must not escape a non-production environment

This is the most consequential row in the table. Every notification in E-4 goes to real students.
An E-2 configuration that dispatches through the real transport would send a test notification to a
real student body.

**PROPOSED.** In E-1, E-2, and E-3, the transport is replaced by a capture adapter that records what
*would* have been sent. The in-app notification is still created, so `FR-NOT-005` behaviour is
exercised; only the delivery is intercepted.

**This is the structural reason for the layer-1 adapter boundary** in
[SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) section 2. Without it, switching transport means
changing application code, and the risk is that nobody changes it.

### 2.2 Production values in non-production environments

**Timeouts and rate limits use production values in E-2, E-3, and E-4.**

| Setting | Why production values |
|---|---|
| Rate limits | A limit tested at ten times production is not the limit that protects the system |
| Timeouts | A timeout tuned to a fast network hides the latency that causes `FAIL-01` |
| Batch sizes | A dispatch batch sized for test data completes instantly and proves nothing about `NFR-PERF-005` |

**Relaxing these in E-1 only** is deliberate. A developer's own machine should not fail a local build
for a timeout that only matters at scale.

### 2.3 Source maps in production

**PROPOSED, and this is a judgement to confirm.** Source maps improve diagnosis of a production
incident, which `PB-ENG-17 Incident Response` requires. They also disclose application structure to
anyone who can fetch them.

| Option | Gain | Cost |
|---|---|---|
| Restrict maps to authenticated staff | Diagnosis preserved | Not possible if maps are served publicly |
| Store maps outside the served path | No public disclosure | Must be retrieved deliberately during an incident |
| Serve maps publicly | Easiest diagnosis | Discloses structure |

**Recorded as a decision for `PB-ENG-11 Security` and IT, not decided here.** The default
recommendation is to store maps outside the served path and retrieve them deliberately, since
`NFR-SEC-012` and `NFR-SEC-010` both favour minimising disclosure. This is not yet an OPEN QUESTION
and does not need to become one unless a reviewer objects.

### 2.4 Synthetic data in E-2

**PROPOSED.** Synthetic only, per `PB-ENG-08 Testing` section 6.

**No production data is copied into a test environment.** A copy would place real student records
where the access controls are weakest, and `NFR-SEC-013` extends the prohibition to test output.
Where realistic data shape matters — a 400-student organisation-wide dispatch — the test data is
generated to that shape, not copied.

---

## 3. Configuration Structure

**PROPOSED.** Configuration is externalised, supplied per environment, and never committed.

| Category | E-1 | E-2 | E-3 | E-4 |
|---|---|---|---|---|
| Non-secret configuration | Local file, committed as an example | Pipeline variables | Managed | Managed |
| Secrets | Developer-local, never committed | Pipeline secret store | Managed | Managed, rotated |
| Feature flags | Permitted | Permitted | Permitted | **Restricted** |
| Endpoint URLs | Local | Test infrastructure | Staging | Production |

`NFR-MAINT-003` requires approval chains, notification targets, and retention to be configurable
**without code changes**. That means these are data, not code, and they differ per environment.

**Feature flags in E-4 are restricted deliberately.** A flag that changes behaviour in production
means behaviour that cannot be traced to a requirement, and per
[CONVENTIONS.md](../planning/CONVENTIONS.md) section 8, every requirement must be verifiable. Flags
are for staging and rollback, not for shipping unfinished behaviour.

---

## 4. Data Handling by Environment

| Concern | Rule | Authority |
|---|---|---|
| Real student data exists only in E-4 | Prohibited in E-1, E-2, E-3 | `PB-ENG-08 Testing` section 6 |
| Personal data in logs | Prohibited everywhere | `NFR-SEC-013` |
| Synthetic data in E-4 | Prohibited | Section 2.2 |
| Seed data | E-1, E-2, E-3 only | `PB-ENG-14 Database Changes` |
| Backup of non-production data | Not required | NFR-BACKUP-001 covers participant records |
| Retention enforcement | E-4 only | `OQ-26`, `OQ-27`, `OQ-28` unresolved |

**No retention policy exists.** Until `OQ-26` through `OQ-28` are answered, no environment deletes
anything automatically, per the conservative deletion position in
[SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md) section 9.1.

---

## 5. Structural Constraints

### EA-1 The application must not read a configuration file from its source tree in production

**Configuration is injected.** A configuration file inside the deployed artefact is one that can be
inspected, cached, or shipped to E-4 by accident. It is also the mechanism by which a developer's
local settings reach production.

### EA-2 Environment identity must be explicit and visible

A process must be able to state which environment it is in, and that fact must appear in the log
output. Every mistaken-environment incident — writes to the wrong database, test mail to real
students — is preventable by the operator knowing immediately which environment they are in.

### EA-3 No environment may read another environment's secrets

E-2 pipeline credentials MUST NOT grant access to E-4. A test that can reach production data is one
compromised test dependency away from a real breach.

### EA-4 The same artefact is promoted; configuration changes between environments

**PROPOSED.** One build artefact is promoted from E-2 through E-4, and only configuration differs.

**Why this is the rule.** Building separately for each environment means the artefact in production
was never tested. It is the reason `PB-ENG-10` requires the required CI status for the exact commit
being deployed.

The exception is source maps, where the balance in section 2.3 may differ. That is a documented
exception rather than a second build.

---

## 6. Environment Dependency Order

```
E-1 Local  ──can be developed without──►  any other environment
        │
        └──can run against──►  E-2 Test, or a local instance of E-2 dependencies

E-2 Test / CI  ──depends on──►  dependencies provisioned per E-2
        │
        └──promotes to──►  E-3 Staging   (if it exists, OQ-55)

E-3 Staging  ──depends on──►  dependencies matching E-4 topology
        │
        └──promotes to──►  E-4 Production

E-4 Production  ──depends on──►  OQ-30 hosting decision. NOT DECIDED
```

**E-1 must not depend on E-4.** A developer who cannot work without production access will eventually
work with production access, and `NFR-MAINT-006` plus the append-only audit property make production
access a genuine risk rather than a convenience.

**E-4 depends on OQ-30, which is unanswered.** Everything above E-4 in this document is therefore a
target state rather than a plan.

---

## 7. Implementation Status

> **NOT YET IMPLEMENTED.** No environment exists.

| Environment | State | Blocking |
|---|---|---|
| E-1 Local development | Not established. No application code exists | OQ-41, OQ-42, OQ-44 |
| E-2 Test / CI | Not established. No pipeline exists | `PB-ENG-09 CI`, OQ-30 |
| E-3 Staging | **Does not exist. Existence undecided** | OQ-55 |
| E-4 Production | **Does not exist. Hosting undecided** | OQ-30, OQ-31 |

| Structural constraint | State |
|---|---|
| EA-1 externalised configuration | Not implemented |
| EA-2 visible environment identity | Not implemented |
| EA-3 environment secret isolation | Not implemented |
| EA-4 single-artefact promotion | Not implemented |
| Section 2.1 email capture adapter | Not implemented |
| Section 2.2 production values in test | Not implemented |

---

## 8. Verification Approach

| Property | How it is checked |
|---|---|
| No production data in E-1, E-2, E-3 | Data inspection before environment creation; `FAIL-02` confirms capture behaviour |
| No synthetic data in E-4 | Seed execution prohibited by `PB-ENG-14`; verified at deployment |
| No secrets committed | `PB-ENG-12`; secret scanning in `PB-ENG-09 CI` |
| No internal error detail in E-4 | `SEC-09`, `NFRD-04` |
| Production rate limits and timeouts in E-2 | Configuration comparison at environment setup |
| Same artefact promoted | `PB-ENG-10` deployment record names the commit and artefact digest |
| Environment identity visible in logs | Log inspection in each environment |

**Two of these are verified by configuration comparison rather than by test.** That a limit in E-2
matches E-4 cannot be proven by exercising the system; it is proven by comparing the configuration.
Recording it as a check prevents it being assumed.

---

## 9. Open Questions

| Question | Impact on environments | Who can answer |
|---|---|---|
| [OQ-30](../planning/OPEN-QUESTIONS.md) Deployment platform | E-4 cannot be specified at all | IT, Council Secretary |
| [OQ-31](../planning/OPEN-QUESTIONS.md) Existing server arrangement | Whether a self-hosted environment is possible | IT |
| [OQ-55](../planning/OPEN-QUESTIONS.md) Staging existence | Whether E-3 exists; migration rehearsal | IT, Council Secretary |
| [OQ-44](../planning/OPEN-QUESTIONS.md) Data store engine | How E-2 provisions a storage layer with the required constraints | IT |
| [OQ-29](../planning/OPEN-QUESTIONS.md) Backup responsibility | Which environment owns backups | Council Secretary, IT |
| [OQ-26](../planning/OPEN-QUESTIONS.md) Retention policy | Which environments apply retention | School administration |
| [OQ-53](../planning/OPEN-QUESTIONS.md) Observability tooling | Whether E-4 logs are aggregateable during an incident | IT |

**OQ-30 blocks the most.** Until hosting is decided, E-4 has no defined topology, E-3 cannot be
specified as resembling it, and `EA-4` cannot be verified.

---

## 10. Completion Criteria

This document is BASELINE when:

- All four environments are defined with their purpose and existence state
- Every configuration category states what differs between environments and why
- No environment is assumed to exist
- The email capture rule and its structural reason are recorded
- Structural constraints EA-1 to EA-4 are stated
- Implementation status marks every environment as not existing

---

## 11. Exit Criteria

- OQ-30, OQ-31, and OQ-55 answered
- E-1 and E-2 established before implementation begins, since both gates depend on them
- EA-1 to EA-4 verified in each established environment
- Section 7 updated as environments come into existence, never optimistically

---

**Related documents:** [ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md) ·
[SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) ·
[INTEGRATION-BOUNDARIES.md](INTEGRATION-BOUNDARIES.md) ·
[TECH-STACK.md](TECH-STACK.md) ·
[PB-ENG-15 Environment Management](../playbooks/engineering/PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) ·
[PB-ENG-10 CD/Deployment](../playbooks/engineering/PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-12 Secrets and Configuration](../playbooks/engineering/PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../planning/NON-FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md)