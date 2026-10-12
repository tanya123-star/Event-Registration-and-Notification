# PB-ENG-15 — Environment Management

**Playbook:** PB-ENG-15
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** No environment exists. No local setup, no test environment, no staging
> environment, no production environment. No configuration file, no secret store, no deployed instance.
> See the status section.

---

## Purpose

Define how configuration, secrets, data, and external services are supplied to each environment of the
Event Registration and Notification System, and who is responsible for each.

[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) states **what differs**
between environments. This playbook states **who sets it, how, and how it is verified**.

---

## Scope

**Applies to:** every environment, and every configuration value that differs between them.

**Does not apply to:** the structural differences, in `ENVIRONMENT-ARCHITECTURE.md`; secret storage
mechanism, in `PB-ENG-12 Secrets and Configuration`; promotion procedure, in
`PB-ENG-10 CD/Deployment`.

---

## Ownership

**Responsible:** the Developer configuring the environment.
**Accountable:** the Council Secretary for production configuration approval.
**Consulted:** IT, for anything touching hosting or institutional services.

---

## 1. Current State

| Environment | Exists | Configuration mechanism | Blocking |
|---|---|---|---|
| E-1 Local development | **No** | None | OQ-41, OQ-42, OQ-44 |
| E-2 Test / CI | **No** | None | `PB-ENG-09 CI`, OQ-30 |
| E-3 Staging | **No. Existence undecided** | None | **OQ-55** |
| E-4 Production | **No** | None | **OQ-30** |

**No environment has any configuration, because no application exists to configure.**

### 1.1 What is not decided

| Question | Registered |
|---|---|
| Where ERNS is hosted | **OQ-30**, blocking |
| Whether a school server exists | **OQ-31** |
| Whether institutional email may be used | **OQ-32** |
| Whether a staging environment exists | **OQ-55** |
| What the data store engine is | **OQ-44** |
| What holds secrets in production | **OQ-30**, dependent |
| What logs are aggregated | **OQ-53** |

---

## 2. Configuration Structure

**PROPOSED.** Configuration is externalised, supplied per environment, and never committed. Per `EA-1`,
a configuration file inside the deployed artefact is one that can be inspected, cached, or shipped to
production by accident.

| Category | Non-secret | Secret |
|---|---|---|
| Database connection | Host, port, name | Password, credentials |
| Session configuration | Lifetime, timeout values | Signing key |
| Email transport | Host, port, sender address | Transport credentials |
| File storage | Bucket or path, size limit | Access credentials |
| Feature configuration | Approval chains, notification targets, retention values, per `NFR-MAINT-003` | — |
| Observability | Endpoint | Write credentials |

### 2.1 Why approval chains and retention are configuration, not code

`NFR-MAINT-003` requires them configurable without code changes.

**The approval chain is unresolved in a way that makes this necessary.** `OQ-01` through `OQ-04` ask
which offices approve what, and they are BLOCKING. Coding a chain into the application means the answer
becomes a code change, a deployment, and a risk — when the actual answer is a policy decision from
several offices.

**The same applies to retention.** `OQ-26` through `OQ-28` are unresolved, and no policy exists. Coding a
retention period would either delete student records on an arbitrary schedule or never delete anything,
and neither is acceptable without a policy.

### 2.2 Configuration that must not exist

| Configuration | Why prohibited |
|---|---|
| A feature flag that changes core behaviour in production | Behaviour not traceable to a requirement |
| A debug switch exposed to production | `NFR-SEC-012` |
| An environment identifier used to alter behaviour silently | `EA-2` requires it visible in logs; it should not branch logic invisibly |
| Credentials in any non-secret configuration file | `PB-ENG-12` |

---

## 3. Differences Per Environment

Per [ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) section 2.

| Concern | E-1 Local | E-2 Test / CI | E-3 Staging | E-4 Production |
|---|---|---|---|---|
| Data | Synthetic, reseeded per run | Synthetic, isolated per run | Anonymised or synthetic | Real |
| Email | Captured, not sent | Captured, not sent | Real transport, internal recipients | Real transport, real recipients |
| Debug output | Permitted | Permitted | Restricted | **Prohibited** |
| Error detail to users | Permitted | Permitted | Minimal | **Prohibited** |
| Rate limits | Relaxed | **Production values** | Production values | Production values |
| Timeouts | Relaxed | **Production values** | Production values | Production values |
| Verbose logging | Permitted | Permitted | Permitted | `NFR-MAINT-004` only |
| Source maps | Permitted | Permitted | Permitted | See below |
| Seed data | Full | Full | Minimal | **None** |
| Secrets | Developer-local | Pipeline store | Managed | Managed, rotated |
| Performance sampling | Optional | **Required** | Optional | Passive only |

### 3.1 Three rules that are not negotiable

| Rule | Requirement | Consequence of breaking it |
|---|---|---|
| **No production data outside E-4** | `PB-ENG-08 Testing` section 6 | Real student records where controls are weakest |
| **No synthetic data in E-4** | Section 2 | Fabricated participation records in the authoritative store |
| **Email never escapes E-1 to E-3** | Section 3.2 | Test notifications sent to real students |

### 3.2 Email capture in non-production

**PROPOSED.** In E-1, E-2, and E-3, the transport is replaced by a capture adapter that records what
would have been sent. The in-app notification is still created, so `FR-NOT-005` behaviour is exercised;
only delivery is intercepted.

**This is the row most likely to cause a real harm.** An E-2 configuration that dispatches through the
real transport sends a test notification to a real student body, and nothing in ERNS can recall it. The
Council Secretary would need to issue a correction, per `PB-06 Notification Publishing`.

### 3.3 Source maps in production

**Undecided, and recorded as such.** Per
[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) section 2.3, source maps
improve incident diagnosis and disclose structure. The recommendation is to store them outside the
served path and retrieve them deliberately, which satisfies `NFR-SEC-010` and `NFR-SEC-012` while
preserving diagnosis for `PB-ENG-17`.

**This is not yet an OPEN QUESTION and does not need to become one** unless a reviewer objects. It is
noted here because the choice must be made deliberately rather than by whichever framework default
applies.

---

## 4. Data Handling

| Concern | Rule | Authority |
|---|---|---|
| Real student data | **E-4 only** | `PB-ENG-08 Testing` section 6 |
| Production data in tests | **Prohibited** | Same |
| Personal data in logs | **Prohibited everywhere** | `NFR-SEC-013` |
| Test data volume | Sufficient for boundaries | `PB-ENG-08` section 7.1 |
| Isolation between runs | Fresh storage layer per run | `PB-ENG-09` section 2.6 |
| Retention enforcement | E-4 only, when a policy exists | `OQ-26`, `OQ-27`, `OQ-28` |
| Backups of non-production data | Not required | `NFR-BACKUP-001` covers participant records |

### 4.1 Test data generation

**PROPOSED.** Generated to the shape needed, never copied from production.

| Boundary | Data required |
|---|---|
| Capacity | Minus one, exactly at, one above |
| Deadline | Before, exactly at, after |
| Attendance window | Before, inside, after |
| Notification audience | Empty, one, the whole student body |

**An organisation-wide dispatch needs a student body sized like the real one.** Testing a fan-out
against five synthetic students proves nothing about `NFR-PERF-005` or `NEG-08`.

### 4.2 No automatic deletion

**Until `OQ-26` through `OQ-28` are answered, no environment deletes anything automatically**, per
[SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md) section 9.1. This includes
non-production environments, where the temptation is stronger because the data is synthetic.

---

## 5. External Services

**PROPOSED.** Per [INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md).

| Service | E-1 | E-2 | E-3 | E-4 | Blocking |
|---|---|---|---|---|---|
| Email transport | Capture | Capture | Real, internal only | Real | OQ-32, OQ-50 |
| Single sign-on | Not used | Not used | If available | If available | OQ-33 |
| Storage for uploads | Local | Local | Storage service | Storage service | OQ-30 |
| Observability | Console | Minimal | Full | Full | OQ-53 |
| Data store | Local instance | Provisioned per run | Production-like | Production | OQ-44 |

### 5.1 Timeouts on every outbound call

**PROPOSED**, per `BR-1` in [INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md).

A call with no timeout waits indefinitely, which during a notification dispatch holds a worker and
`NFR-AVAIL-004` requires a degraded state rather than a hang. **This applies in every environment**,
including E-1, because a hang during development costs more time than a timeout.

---

## 6. Logging

| Environment | Detail | Personal data |
|---|---|---|
| E-1 | Verbose permitted | **Prohibited** |
| E-2 | Verbose, captured as artefact | **Prohibited** |
| E-3 | Standard | **Prohibited** |
| E-4 | `NFR-MAINT-004` only, no debug output | **Prohibited** |

**`NFR-SEC-013` prohibits personal data in logs in every environment.** It extends to test output,
where a fixture printed in full leaks exactly what the environment rules exist to prevent.

**`NFR-MAINT-005` requires a correlation identifier** across the request, its audit entries, and its
log entries, in every environment. Without it, diagnosing a failed registration from logs alone is
guesswork, per `PB-ENG-17 Incident Response`.

**`EA-2` requires the environment identity to appear in the log output.** Most environment mix-ups are
prevented by the operator seeing immediately which environment they are in.

---

## 7. Establishing an Environment

**PROPOSED.** Steps, in order. None can be completed yet.

| # | Step | Requirement |
|---|---|---|
| 1 | Confirm the platform decision | **OQ-30** answered |
| 2 | Confirm the data store | OQ-44 answered |
| 3 | Provision according to `ENVIRONMENT-ARCHITECTURE.md` section 2 | — |
| 4 | Supply configuration externally | `EA-1` |
| 5 | Supply secrets through the secret store | `PB-ENG-12` |
| 6 | Seed data, E-1 to E-3 only | Section 2 |
| 7 | Configure the email capture adapter, E-1 to E-3 | Section 3.2 |
| 8 | Set production rate limits and timeouts in E-2 and E-3 | Section 3 |
| 9 | Verify **no real data** is present | Section 4 |
| 10 | Verify email does not leave E-1 to E-3 | Section 3.1 |
| 11 | Verify environment identity appears in logs | `EA-2` |
| 12 | Verify secret scanning covers the artefact | `PB-ENG-09` |
| 13 | Record the environment in documentation | `PB-ENG-19` |

### 7.1 Steps 9 and 10 are the ones that prevent harm

**Steps 9 and 10 verify the absence of real harm before anything is used.** Every other step can be
correct while these two are wrong, and both produce consequences that cannot be undone: real student
records outside E-4, or real students receiving test notifications.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Configuration externalised, never committed | `EA-1`, section 2 |
| Approval chains, notification targets, and retention are configuration | Section 2.1, `NFR-MAINT-003` |
| Production rate limits and timeouts in E-2 and E-3 | Section 3 |
| No real data outside E-4 | Section 3.1 |
| No synthetic data in E-4 | Section 3.1 |
| Email capture adapter in E-1 to E-3 | Section 3.2 |
| Personal data absent from logs in every environment | Section 6 |
| Correlation identifier present in every environment | Section 6, `NFR-MAINT-005` |
| Environment identity visible in logs | `EA-2` |
| Timeouts on every outbound call | Section 5.1 |
| Verification steps 9 to 11 completed before use | Section 7.1 |

## Required Evidence

- The configuration values set, recorded without secrets
- Confirmation that no real data is present, steps 9 and 10
- A log sample showing environment identity and correlation identifier
- The rate limits and timeouts in E-2 and E-3, compared against E-4
- The environment recorded in documentation

## What Blocks Progression

- Real student data found outside E-4
- Synthetic data found in E-4
- Email dispatching from E-1, E-2, or E-3
- A secret committed or present in an artefact
- Configuration baked into the artefact
- Rate limits or timeouts differing between E-2 and E-4
- Personal data in logs
- Environment identity not visible in logs
- `OQ-30` unanswered, so there is no platform to establish

## Exception Process

**PROPOSED.** E-1 may relax rate limits and timeouts, per section 3. No other environment may.

**No exception exists for** placing real data outside E-4, dispatching email from a non-production
environment, committing a secret, or baking configuration into an artefact. These are harm-producing
rather than inconvenient, and the third and fourth also violate governance principle 7.

---

## Completion Criteria

- E-1 and E-2 established before implementation begins, since the merge gates depend on them
- Every environment's configuration supplied externally
- Verification steps 9 to 11 completed for each environment
- Rate limits and timeouts in E-2 match E-4
- Email capture verified in E-1, E-2, and E-3
- OQ-30, OQ-31, and OQ-55 answered

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| ENV-01 | Happy path | E-1 established and verified | Steps 9 to 11 pass; usable |
| ENV-02 | Failure | Real student data found in E-2 | **Blocked**; data removed, incident recorded |
| ENV-03 | Failure | Synthetic data seeded in E-4 | **Blocked**; section 3.1 |
| ENV-04 | Failure | E-2 configured to dispatch real email | **Blocked**; capture adapter required |
| ENV-05 | Failure | Secret committed as configuration | **Blocked**; `PB-ENG-12` |
| ENV-06 | Failure | Configuration baked into the artefact | **Blocked**, `EA-1` |
| ENV-07 | Failure | E-2 rate limits ten times production | **Blocked**; section 3 |
| ENV-08 | Failure | E-2 timeouts tuned to a fast network | **Blocked**; hides `FAIL-01` latency |
| ENV-09 | Failure | Personal data in log output | **Blocked**, `NFR-SEC-013` |
| ENV-10 | Failure | Environment identity absent from logs | **Blocked**, `EA-2` |
| ENV-11 | Failure | Correlation identifier absent | Rejected, `NFR-MAINT-005` |
| ENV-12 | Failure | Approval chain coded rather than configured | Rejected, `NFR-MAINT-003` |
| ENV-13 | Failure | Retention period coded | Rejected; `OQ-26` to `OQ-28` unresolved |
| ENV-14 | Failure | Outbound call with no timeout | Rejected; section 5.1 |
| ENV-15 | Invalid | Debug switch exposed to production | Rejected, `NFR-SEC-012` |
| ENV-16 | Invalid | Production data copied into a test fixture | **Blocked** |
| ENV-17 | Boundary | Organisation-wide dispatch tested with five students | Rejected; `NEG-08` proves nothing |
| ENV-18 | Failure | Test runs sharing a storage layer | **Blocked**; `PB-ENG-09` section 2.6 |
| ENV-19 | Failure | Automatic deletion in any environment | **Blocked** until retention is decided |
| ENV-20 | Failure | Source maps served publicly in production | Rejected pending section 3.3 |
| ENV-21 | Invalid | Feature flag changes core behaviour in production | Rejected; section 2.2 |
| ENV-22 | Boundary | E-1 rate limits relaxed | **Permitted**, section 9 |
| ENV-23 | Failure | E-2 rate limits relaxed | **Blocked**, section 9 |
| ENV-24 | Failure | Environment established without verification steps 9 to 11 | **Blocked**, section 7.1 |

---

## Exit Criteria

- OQ-30, OQ-31, and OQ-55 answered
- E-1 and E-2 established and verified
- Every environment's configuration supplied externally
- Verification steps 9 to 11 completed for each
- Section 1 updated to reflect reality
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-15 Environment Management](PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) ·
[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) ·
[PB-ENG-10 CD/Deployment](PB-ENG-10-CD-DEPLOYMENT.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-14 Database Changes](PB-ENG-14-DATABASE-CHANGES.md) ·
[PB-ENG-19 Documentation](PB-ENG-19-DOCUMENTATION.md) ·
[INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)