# PB-ENG-12 — Secrets and Configuration

**Playbook:** PB-ENG-12
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No secret exists in ERNS, because no system exists.** No `.env` file, no
> credential store, no environment configuration, no rotation procedure. This playbook specifies rules
> that apply from the first commit.

---

## Purpose

Define how secrets and configuration are handled in the Event Registration and Notification System, so
that a credential is never committed, never logged, and recoverable by rotation if it is exposed.

This playbook exists because of `TH-09` in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md):
credential disclosure through a repository, a log, or an error message. **A secret in git history is not
removed by deleting the commit** — it is in every clone and every mirror, and the only reliable remedy
is rotation.

---

## Scope

**Applies to:** every secret and configuration value ERNS uses, in every environment.

**Does not apply to:** dependency secrets, covered incidentally; deployment mechanics, in
`PB-ENG-10 CD/Deployment`; environment structure, in `PB-ENG-15 Environment Management`.

---

## Ownership

**Responsible:** the Developer handling the secret.
**Accountable:** the Council Secretary for production secret custody.
**Consulted:** IT for anything touching institutional services.

---

## 1. What Is a Secret

**PROPOSED.** A definition precise enough to decide a case.

> A secret is any value whose disclosure would grant access, permit impersonation, or reveal
> credentials — and which cannot be reissued without consequence.

| Is a secret | Not a secret |
|---|---|
| Database password | Database host name |
| Session signing key | Session timeout value |
| Email transport credentials | Sender address |
| Storage access credentials | Bucket name |
| API token | API endpoint URL |
| Private key | Public key |
| Personal access token | Repository URL |
| Production connection string with a password | Connection string template |
| — | A value in `.env.example` |

**The distinguishing question is reissuance cost, not sensitivity.** A value that is trivially
reissuable and grants nothing is configuration. A value that is not reissuable, or whose reissuance is
disruptive, is a secret.

**When in doubt, treat it as a secret.** Over-protecting a configuration value costs one discussion;
under-protecting a credential costs a rotation.

---

## 2. The Central Rule

**Governance principle 7. A secret MUST NOT be committed to the repository, in any form, at any time,
under any circumstances.**

| Location | Prohibited |
|---|---|
| Source code | **Yes** |
| A committed `.env` or variant | **Yes** |
| A committed configuration file | **Yes** |
| A committed example file | **Yes**, if it holds real values |
| Test fixtures | **Yes** |
| Documentation | **Yes** |
| A commit message | **Yes** |
| A pull request description | **Yes** |
| A CI variable visible in logs | **Yes** |
| A container or deployment definition | **Yes** |

### 2.1 No real secret appears in this documentation

**This document contains no secret, and neither may any ERNS document.** Per the master instruction, no
credentials, tokens, private keys, or production values appear anywhere in `docs/`.

**A real value in documentation is worse than one in source**, because documentation is read far more
widely and is more likely to be copied.

---

## 3. Environment Variables

**PROPOSED.**

| Property | Rule |
|---|---|
| Secrets are read from the environment | Never from source |
| Names are stable across environments | The same name, a different value |
| Names are documented in `.env.example` | **Keys only, never values** |
| No default values in code | A default secret is a secret in source |
| Missing secret fails at startup | Not at first use, hours later |
| Values never logged | `NFR-SEC-013` |

### 3.1 Failing at startup is the important rule

**An application that starts without its secrets and fails on first use produces a confusing failure
during an event.** `NFR-AVAIL-004` requires a degraded state rather than an error, but a missing secret
is a configuration fault, not a degraded dependency.

**Fail fast at startup, with a message naming the variable and not its value.**

### 3.2 No default values

**A default secret in code is a secret in source, and it will reach production** — the one environment
where the developer default was never intended to apply, and where it is least likely to be noticed.

```text
PROHIBITED:  SESSION_SECRET = process.env.SESSION_SECRET or "dev-secret-change-me"
REQUIRED:    SESSION_SECRET must be set; refusing to start
```

---

## 4. Secret Storage

**PROPOSED.** Storage location by environment. **The production mechanism depends on OQ-30**, so it is
not decided here.

| Environment | Storage | Notes |
|---|---|---|
| E-1 Local | Developer-local file, git-ignored | Never a shared file with real values |
| E-2 Test / CI | Pipeline secret store | Injected, never in the repository |
| E-3 Staging | Managed store | Distinct values from E-4 |
| E-4 Production | Managed store | **Rotated**, per section 7 |

### 4.1 Principles regardless of mechanism

| Principle | Reason |
|---|---|
| Secrets are never in the repository | Principle 7 |
| Secrets are never in the artefact | `PB-ENG-09` section 2.11 |
| Secrets are never in an environment variable *default* | Section 3.2 |
| Access to the store is least-privilege | `NFR-SEC-015` |
| Who can read a production secret is recorded | So a departure can be actioned |
| Staging secrets are distinct from production | A staging compromise must not reach production |

### 4.2 No secret in logs

`NFR-SEC-013` prohibits credentials and session tokens in application logs.

**This is verified, not assumed.** Scenario `SEC-10` verifies a credential is absent from log output.
Logging an environment variable wholesale is the common route by which a secret reaches a log.

---

## 5. Local Development Secrets

**PROPOSED.**

| Rule | Detail |
|---|---|
| `.env.example` is committed, with keys only | The documented contract |
| `.env` is git-ignored | Never committed |
| Each developer creates their own | **Never a shared file containing real values** |
| Values need not be real where the dependency permits | A test transport, a local store |
| `.env.example` is updated when a variable is added | Otherwise the next developer cannot start |

### 5.1 `.env.example` — the committed contract

```text
# ERNS environment variables
# Copy to .env and fill in. Never commit .env.

# Required in every environment
DATABASE_URL=
SESSION_SECRET=
STORAGE_ENDPOINT=

# Required where email is configured
EMAIL_TRANSPORT_HOST=
EMAIL_FROM_ADDRESS=

# Production only. Never populated in E-1 or E-2
OBSERVABILITY_WRITE_KEY=
```

**Every entry is a key with an empty value.** The file documents what the application expects without
disclosing anything. It is how a new developer learns the variable names without asking.

### 5.2 The shared-file trap

**The common failure is one developer sending their `.env` to a colleague.** It works, it is convenient,
and it puts production credentials in an email thread and possibly a commit.

**Every developer generates their own values.** Where a real credential is genuinely required in local
development, that is a sign the environment boundary is wrong, and it belongs in a registered question
rather than a workaround.

---

## 6. `.env` Handling

**REQUIRED.**

| Rule | Detail |
|---|---|
| `.env` and `.env.*` are git-ignored | With `.env.example` explicitly negated |
| `.env` is never committed | Under any circumstance |
| `.env` never leaves the developer's machine | Including by email or messaging |
| `.env` is deleted when a developer leaves | Their machine, their responsibility |
| A committed `.env` is an incident, not a fix-forward | Section 8 |
| **Deleting the file does not remove it from history** | Section 8 |

### 6.1 The `.gitignore` requirement

```text
# Secrets
.env
.env.*
!.env.example

# Local database files
*.db

# Local uploads
uploads/local/

# Editor and OS
.DS_Store
*.swp
.idea/
.vscode/
```

**`.env.example` must be explicitly negated.** Without the `!` line, a broad `.env.*` rule excludes the
example file and the documented contract is never committed.

---

## 7. Rotation

**PROPOSED.** Rotation is the only reliable remedy for a disclosed secret.

| Secret | Rotation period | Owner |
|---|---|---|
| Database credentials | Period defined after `OQ-30` answered | IT |
| Session signing key | Period defined after `OQ-30` answered | IT |
| Email transport credentials | Period defined after `OQ-32` answered | IT |
| Storage credentials | Period defined after `OQ-30` answered | IT |
| Personal access tokens | On expiry, and on any departure | Repository owner |

### 7.1 No period is asserted without a basis

**Per [NON-FUNCTIONAL-REQUIREMENTS.md](../../planning/NON-FUNCTIONAL-REQUIREMENTS.md) section 1, no
figure is invented.** These periods depend on a platform that has not been chosen, and on an
institutional policy that has not been confirmed.

**Recorded as `OQ-57`,** which asks IT to set rotation periods together with the storage mechanism.

### 7.2 Rotation procedure

1. Generate the new value
2. Store it in the secret store
3. Deploy or restart with the new value
4. Verify the application starts and functions
5. Invalidate the old value at the issuer
6. Record the rotation in the operational log

**Step 5 is the one that is forgotten, and it is the one that matters.** Storing a new value without
revoking the old one leaves the old value live, and the whole point was to stop the old one working.

### 7.3 Session signing key rotation invalidates sessions

Rotating the signing key invalidates every existing session, which signs every user out.

**PROPOSED.** Where this cannot be done during a published event window, it is scheduled outside one.
An unplanned mass sign-out during an event is `TH-08` in effect, without an attacker.

---

## 8. Secret Exposure Response

**REQUIRED**, and in this order. **Rotation comes first, without exception.**

| # | Step | Rationale |
|---|---|---|
| 1 | **Rotate the credential immediately** | The value is compromised. Nothing else matters until it stops working |
| 2 | Invalidate existing sessions | A leaked signing key means every session is suspect |
| 3 | Assess what was accessed, from the audit trail | `NFR-AUD-007` |
| 4 | Remove the value from the current tree | Prevents a repeat |
| 5 | Remove it from history | Reduces future exposure. **Does not undo step 1** |
| 6 | Review what else used the same value | Password reuse is common |
| 7 | Review how it got committed | Otherwise it happens again |
| 8 | Record the incident | `PB-ENG-17`, `AUD` entries |
| 9 | Assess whether notification is required | If student data was exposed, this is a data-protection matter |

### 8.1 Why rotation is step 1

**Deleting the commit is not remediation.** By the time the commit is removed, the value may already be
in a clone, a mirror, a CI cache, a build artefact, and a backup. Each removal reduces future exposure
and changes nothing about present exposure.

**The value is compromised the moment it is committed.** The only question is whether anyone has
fetched it, and the answer is that a scanner found it before a human usually does.

### 8.2 History rewriting

**Removing a secret from history requires rewriting history, which is itself a change with risks.**

| Consideration | Position |
|---|---|
| Is rotation sufficient? | Usually. **Do this first** |
| Should the history be rewritten? | Only if the value remains valid, which rotation prevents |
| If rewriting, what about `main`? | A force-push, **prohibited** by `PB-ENG-03` section 4 |
| Who authorises a force-push? | Council Secretary, recorded, with notification to all developers |

**In practice: rotate, then leave the history alone unless there is a specific reason not to.** Rewriting
`main` history to remove a value that has already been rotated trades a solved problem for a new set of
divergent clones.

---

## 9. Verification

| Requirement | Method | Scenario |
|---|---|---|
| No secret in the source | Secret scanning | `PB-ENG-09` section 2.10 |
| No secret in the artefact | Artifact validation | `PB-ENG-09` section 2.11 |
| No secret in history | History scan | `PB-ENG-09` section 2.10 |
| No secret in a log | Log inspection | `SEC-10` |
| No secret in a pull request | Diff scan | `PB-ENG-09` section 2.10 |
| `.env` git-ignored | Repository inspection | Section 6.1 |
| `.env.example` committed with keys only | Repository inspection | Section 5.1 |
| Missing secret fails at startup | Test | Section 3.1 |
| No secret defaults in code | Code review | Section 3.2 |
| Access to the secret store is recorded | Store inspection | Section 4.1 |

### 9.1 Scanning must cover history and the diff separately

**Scanning only the current tree is the common gap.** A secret removed in a later commit remains in
history, and **the commit that removed it is visible evidence that it was once there**.

**Scanning only the tip is also insufficient** for a pull request, because a secret introduced and
removed within the same branch leaves no trace in the tip.

---

## 10. What Must Never Be Committed

**PROHIBITED.** Per governance principle 7.

| Item | Reason |
|---|---|
| Any secret, by this playbook's definition | Section 1 |
| `.env` or any variant holding values | Section 6 |
| Private keys | Section 1 |
| Personal access tokens | `PB-ENG-03` section 7 |
| Real student data | `NFR-SEC-013` |
| Production database dumps | Real student records |
| Connection strings containing passwords | Section 1 |

### 10.1 The generated exception

**The dependency lockfile MUST be committed**, per `PB-ENG-13`. It is generated and contains no secret.

Recorded here so the rule in section 10 is not applied mechanically to it.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| No secret committed, in any form | Section 2, principle 7 |
| No secret in documentation | Section 2.1 |
| Secrets read from the environment, never source | Section 3 |
| Missing secret fails at startup | Section 3.1 |
| No default secret values in code | Section 3.2 |
| Secrets stored per environment, distinct values | Section 4 |
| No secret in logs | Section 4.2 |
| `.env.example` committed with keys only | Section 5.1 |
| `.env` git-ignored, `.env.example` negated | Section 6.1 |
| Secret scanning covers history and diff | Section 9.1 |
| Rotation procedure followed in full | Section 7.2 |
| Exposure response rotates first | Section 8 |

## Required Evidence

- Secret scanning running, covering history and diff
- Artifact validation showing no secret
- Log inspection showing no credential
- The `.gitignore` containing the required patterns
- A recorded secret-access list
- A rotation record for each rotation

## What Blocks Progression

- A secret is present in a diff, a commit, or an artefact
- `.env` is committed
- A secret default exists in code
- `.env.example` contains a value
- A missing secret does not fail at startup
- Secret scanning covers only the current tree
- A production secret is used in E-1, E-2, or E-3
- Rotation was performed without invalidating the old value

## Exception Process

**PROPOSED.** A temporary local file with a real value, when no alternative exists, is recorded with an
owner and a resolution date, and is never committed.

**No exception exists for** committing a secret, placing one in documentation, or leaving one in history
after discovery without rotation. Governance principle 7 is absolute.

---

## Completion Criteria

- `.gitignore` and `.env.example` exist and are correct
- Secret storage established per environment, per `OQ-30`
- Secret scanning implemented, covering history and diff
- OQ-57 answered, so rotation periods are defined
- The exposure procedure has been rehearsed, not merely written
- Section 4 updated once `OQ-30` provides the mechanism

---

## Test Scenarios

| ID | Type | Scenario | Expected |
|---|---|---|---|
| SRT-01 | Happy path | Secret supplied via the environment | Application starts, no secret in the repository |
| SRT-02 | Invalid | Secret committed to source | **Blocked** by secret scanning |
| SRT-03 | Invalid | `.env` committed | **Blocked**; `.gitignore` plus scanning |
| SRT-04 | Invalid | `.env.example` containing a real value | Rejected at review |
| SRT-05 | Invalid | Secret in a commit message | **Blocked** by scanning |
| SRT-06 | Invalid | Secret in a pull request description | **Blocked** |
| SRT-07 | Failure | Secret committed then removed in a later commit | **Detected by history scan** |
| SRT-08 | Failure | Secret introduced and removed within one branch | **Detected by diff scan** |
| SRT-09 | Failure | Secret in the build artefact | **Detected** by artifact validation |
| SRT-10 | Failure | Secret logged at startup | **Detected** by log inspection, `SEC-10` |
| SRT-11 | Invalid | Default secret value in code | Rejected at review |
| SRT-12 | Failure | Missing secret does not fail at startup | Rejected; section 3.1 |
| SRT-13 | Invalid | Production secret used in E-2 | **Blocked**, section 4.1 |
| SRT-14 | Invalid | Staging secret identical to production | **Blocked**, section 4.1 |
| SRT-15 | Failure | Exposure detected, commit deleted, value not rotated | **Blocked**; step 1 of section 8 |
| SRT-16 | Failure | Rotation performed, old value not invalidated | Rejected; step 5 of section 7.2 |
| SRT-17 | Failure | Rotation of the signing key during an event window | **Blocked**; section 7.3 |
| SRT-18 | Boundary | Session signing key rotated outside an event window | Permitted; sessions invalidated |
| SRT-19 | Unauthorized | Force-push to `main` to remove a secret | **Blocked**; `PB-ENG-03` section 4 |
| SRT-20 | Failure | Access to the secret store not recorded | Rejected; section 4.1 |
| SRT-21 | Boundary | Lockfile committed | **Permitted**, section 10.1 |
| SRT-22 | Failure | New environment variable added, `.env.example` not updated | Rejected; section 5.1 |
| SRT-23 | Invalid | `.env.example` git-ignored by the `.env.*` rule | **Detected**; section 6.1 |
| SRT-24 | Failure | Shared `.env` file distributed to a developer | Rejected; section 5.2 |
| SRT-25 | Failure | Real secret in ERNS documentation | Rejected; section 2.1 |

---

## Exit Criteria

- Secret storage established, per `OQ-30`
- Secret scanning covering history and diff, running on every push
- OQ-57 answered, so rotation periods are defined
- A recorded secret-access list exists
- The exposure procedure has been rehearsed
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-09 CI](PB-ENG-09-CI.md) ·
[PB-ENG-03 Git and GitHub](PB-ENG-03-GIT-GITHUB.md) ·
[PB-ENG-11 Security](PB-ENG-11-SECURITY.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-15 Environment Management](PB-ENG-15-ENVIRONMENT-MANAGEMENT.md) ·
[PB-ENG-17 Incident Response](PB-ENG-17-INCIDENT-RESPONSE.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[ENVIRONMENT-ARCHITECTURE.md](../../architecture/ENVIRONMENT-ARCHITECTURE.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)