# PB-ENG-11 — Security

**Playbook:** PB-ENG-11
**Type:** Engineering playbook
**Area:** playbooks/engineering
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** **No security control exists in ERNS.** There is no authentication, no
> authorisation, no session management, no input validation, no output encoding, no rate limiting, no
> audit store, and no monitoring. The system has no code. See the status section.

---

## Purpose

Define the security engineering rules every change to the Event Registration and Notification System
must satisfy, and how they are verified.

[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) states what the threats are and who may do what.
[SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md) states where each control
lives. This playbook states **what a developer must do** when writing a change, and what a reviewer
must check.

Governance principle 2 is the reason this playbook exists: security is part of development, not an
afterthought.

---

## Scope

**Applies to:** every change to ERNS that handles input, output, authentication, authorisation,
sessions, storage, uploads, or logging.

**Does not apply to:** threat analysis, in `SECURITY-PLAN.md`; structural placement, in
[SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md); secrets handling, in
`PB-ENG-12 Secrets and Configuration`.

---

## Ownership

**Responsible:** the Developer writing the change.
**Accountable:** the technical owner for the affected module.
**Consulted:** a reviewer who has read the authorisation matrix, per `PB-ENG-07 Code Review` section 2.4.

---

## 1. The Authorisation Matrix Is the Rule

**CONFIRMED.** The authoritative statement of **who may perform what action on which resource** is
section 4 of [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md). **A change that implements an action
not in that matrix is implementing an undocumented capability.**

### 1.1 The three questions every change must answer

| # | Question | If the answer is yes |
|---|---|---|
| 1 | Does this implement an action in the matrix? | Cite the row |
| 2 | Does this implement an action **not** in the matrix? | **Stop.** It needs a decision, per `PB-ENG-20` |
| 3 | Does this alter an existing row? | **Stop.** It widens or narrows a permission, which is a governance decision |

**Question 2 is the one that gets skipped.** A developer adds an endpoint because the interface needs
it, and the permission is whatever the code allows because the matrix was never consulted.

### 1.2 Deny by default

`NFR-SEC-005` requires that any operation not explicitly permitted is denied.

**Structurally:** a permission check finding no explicit grant returns denied. There is no
allow-by-default branch and no implicit inheritance from a broader role.

**This makes a new feature inaccessible to everyone until its grant is defined**, which is the correct
failure mode. A half-configured feature nobody can reach is an operational problem; one everybody can
reach is a security incident.

### 1.3 The five roles are closed

**CONFIRMED.** Administrator, Event Officer, Approver, Student, Attendance Staff. **Club Officer is not
a login role.** `NFR-SEC-016` permits no others.

### 1.4 Ownership scopes every permission

A permission is never role-alone. It combines a role with a relationship to the resource:

| Resource | Scoping relationship |
|---|---|
| Event | Owning Event Officer? |
| Registration | The caller's own registration? |
| Attendance | Assigned to this event? |
| Notification | Owns the event this concerns? |
| Audit | Owns the events the entries describe? |

**"An Event Officer may cancel a registration" is dangerously broad.** The actual rule is "may cancel
another's registration on an event they own, with a reason". Scenario `AUTH-06` and `AUTH-07` verify
the scoping.

---

## 2. The Five Prohibitions

**Each is a separate decision, enforced separately, tested separately.** These are the rules most
likely to be assumed rather than enforced.

| # | Prohibition | Requirement | Enforcement point | Scenario |
|---|---|---|---|---|
| 1 | An officer may not decide approval on their own event | SD-1 | L4 | `SEC-04`, `AUTH-03` |
| 2 | The final approver may not publish | `FR-APR-012` | L4 | `SEC-05`, `RV-27` |
| 3 | Attendance Staff and Approver may not create registrations | `FR-REG-036`, SD-2 | L4 | `SEC-06`, `AUTH-05` |
| 4 | An Event Officer may not correct attendance | `FR-ATT-016` | L4 | `SEC-07`, `AUTH-09` |
| 5 | Officers may not see per-recipient email detail | `FR-NOT-047` | **The query**, not the interface | `SEC-09`, `AUTH-08` |

### 2.1 Prohibition 3 deserves emphasis

**Attendance Staff creating a registration is the most likely of the five to be implemented by
accident.** An Attendance Staff member has a legitimate reason to look at a participant list, and
creating a registration for a walk-in looks like a natural extension of that work.

It is prohibited, and scenario `AUTH-05` exists specifically to catch the assumption. `PB-11
Attendance Backup` records a walk-in as attendance with a reason — **not** as a registration, because
`FR-ATT-018` requires attendance to create no registration side effect.

### 2.2 Prohibition 5 is enforced in the query

`FR-NOT-047` restricts per-recipient email states and addresses to Administrators.

**Hiding the field in the interface is not sufficient** — the value remains in the response payload and
in any network capture. The restriction MUST be expressed as a data-access rule so the value is never
retrieved.

Per `PB-ENG-06` section 4.2, a list of bounced addresses is a list of student contact data.

---

## 3. Authentication

**PROPOSED.** Mechanism per `OQ-45`, subordinate to `OQ-33`. Properties are locked.

| Rule | Requirement |
|---|---|
| Credentials stored non-recoverably | `NFR-SEC-002` |
| Every data access authenticated | `NFR-SEC-001` |
| No unauthenticated endpoint returning participant data | `NFR-SEC-018` |
| Rate limiting on attempts | `NFR-SEC-011`, scenario `SEC-14` |
| **No self-service account creation** | `FR-USR-005` |

### 3.1 No self-service registration

**`FR-USR-005` prohibits it, and this is a deliberate position.** An open registration system for a
student organisation invites junk accounts and weakens every guarantee that depends on identity —
including `NFR-INTEG-001`, whose duplicate protection is only as strong as the identity behind it.

The cost is administrative burden: an Administrator provisions accounts. `OQ-33` would reduce that
burden if institutional single sign-on exists.

### 3.2 Re-authentication for privileged operations

`NFR-SEC-017` requires fresh re-authentication. See [SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md)
section 3.5 for the operation list.

**A reason and re-authentication are different controls.** A reason creates the accountability record
`NFR-AUD-004` requires. Re-authentication proves the person at the keyboard is the account holder
now. Neither substitutes for the other.

---

## 4. Session Management

**PROPOSED.** Properties per [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) section 6.

| Rule | Requirement |
|---|---|
| Session ends on logout and on idle timeout | `NFR-SEC-003` |
| Session identifier replaced on authentication | Scenario `SEC-04`, session fixation |
| Session transport encrypted only | `NFR-SEC-014` |
| Authenticated pages not cached or framed | `NFR-SEC-010` |
| **Role change invalidates existing sessions** | `SEC-20`, `AUTH-13` |
| **Suspension invalidates existing sessions immediately** | `AUTH-12` |

### 4.1 Sessions must be server-side revocable

**A self-contained session token cannot be revoked.** If it carries its own claims, a role change has no
effect until the token expires.

**This is not theoretical.** An account suspended for a security incident would retain full privileges
for the remainder of its token lifetime — which is exactly the window an attacker needs.

### 4.2 Idle timeout differs by role

**PROPOSED.** 30 minutes for officers, longer for students, per `SECURITY-PLAN.md` section 6.

Officer sessions are shorter because officer privileges are greater, and because an unattended officer
session is a more attractive target.

---

## 5. Input Validation

`NFR-SEC-006` requires validation at the server boundary.

**Structural placement:** validation belongs in the domain and application layers, **never the
interface**. A browser check is a courtesy to the user; it is trivially bypassed and protects nothing.

| Input class | Validation | Requirement |
|---|---|---|
| Registration fields | Type, length, format, required | `FR-REG-015` |
| Event content | Type, length | `NFR-SEC-006` |
| Search and filter input | Type, length, permitted characters | `NFR-SEC-006` |
| QR token | Format, validity, expiry, event match | `FR-ATT-002`, `QR-03` |
| Upload | Type, size, storage location | `NFR-SEC-009` |
| Notification targeting criteria | Against the permitted criteria set | `FR-NOT-017` to `FR-NOT-022` |

### 5.1 Validation order is a security property in one case

**For registration, the nine-step order is locked**, per `FR-REG-005` and `PB-04 Event Registration`.

**Why order is a security property:** if order were a presentation concern, a direct request could
arrive at the capacity check having skipped authentication, account status, and eligibility. A student
who is both ineligible and already registered would receive whichever message the interface produced
first, and the capacity check would have been reached without the checks that precede it.

Scenario `RV-03` verifies the order is observable.

### 5.2 The new-field rule

**A field added to a request is untrusted until validated, regardless of whether the interface
validates it.**

This is the most likely real security defect in this system, and it is not an attack — it is an
ordinary feature that quietly bypasses a control someone wrote carefully. Per `PB-ENG-06` section 4.2
and `PB-ENG-07 Code Review` section 2.4.

---

## 6. Output Handling

`NFR-SEC-007` requires encoding that prevents stored cross-site scripting.

| Control | Requirement |
|---|---|
| All attacker-influenced text encoded on output | `NFR-SEC-007` |
| No internal error detail to any user | `NFR-SEC-012` |
| No stack traces, internal identifiers, or infrastructure detail | `NFR-SEC-012` |
| No credentials, tokens, or personal data in logs | `NFR-SEC-013` |
| Response headers prevent caching and framing | `NFR-SEC-010` |

### 6.1 What is attacker-influenced

**Almost everything a user supplies, because it is displayed to other users:**

| Content | Displayed to |
|---|---|
| Event title, description, requirements | Students in the audience |
| Student name | Officers on a participant list |
| Notification body | Every recipient |
| Evaluation responses | Officers and administrators |
| File name | Officers viewing an attachment |

**Encoding rather than escaping.** Scenario `SEC-02` verifies a script fragment does not execute;
scenario `NEG-12` requires emoji and non-ASCII to display correctly. A system that escapes rather than
encodes passes the first and fails the second.

### 6.2 `NFR-SEC-012` and `NFR-MAINT-004` pull in opposite directions

**Resolved deliberately.** An operator needs enough to diagnose; a user needs none of it.

**The user receives a reference and a plain statement. The detail goes to the log, correlated by
`NFR-MAINT-005`.** `PB-ENG-17 Incident Response` depends on this being true.

---

## 7. SQL Injection Prevention

`NFR-SEC-008` requires parameterised data access for **every** query, without exception.

| Rule | Detail |
|---|---|
| Every query parameterised | No exceptions for "simple" queries |
| No string concatenation into a query | Including for identifiers |
| No query built from user input | Including sort order and column selection |
| Verified by review | There is no runtime test that reliably detects concatenation |

**Verified by review and by test, not by test alone.** Scenario `SEC-01` attempts injection in
registration fields. A passing test means the tested path is parameterised; review is what establishes
that *every* path is.

**A query for a sortable list is the common exception.** If sort order or column selection is
user-supplied, it MUST be mapped from an allowed set rather than interpolated.

---

## 8. CSRF and Cross-Site Request Protection

**PROPOSED.** `NFR-SEC-010` requires headers preventing caching and framing. Scenario `SEC-03` verifies a
cross-site request attempt is rejected.

**State-changing requests additionally require a token an unrelated origin cannot construct.** The
mechanism follows from the stack decision in [TECH-STACK.md](../../architecture/TECH-STACK.md); the
requirement does not.

**Why this matters for ERNS specifically:** a cross-site request could cancel a student's registration
or dispatch a notification in an officer's name. Both are the harm described in `TH-02` and `TH-06`.

---

## 9. Rate Limiting

`NFR-SEC-011` requires it in three places. The choice of three is deliberate.

| Target | Threat | Scenario |
|---|---|---|
| Authentication | `TH-08` account takeover | `SEC-11`, `SEC-14`, `NFRD-06` |
| Notification dispatch | `TH-11` abuse | `SEC-24` |
| QR validation | Automated enumeration | `SEC-25`, `QR-07` |

### 9.1 QR enumeration is the one most easily missed

A guessable token, or an endpoint answering without limit, allows an attacker to establish who attended
which event **without attending anything**.

**The QR token MUST NOT encode or reveal identity before validation**, per scenario `QR-08`. Combined
with rate limiting, that makes bulk enumeration impractical.

---

## 10. File Upload Security

`NFR-SEC-009` requires type and size validation and storage outside the executable path.

| Control | Requirement | Scenario |
|---|---|---|
| Type validated against a permitted list | `NFR-SEC-009` | `SEC-07` |
| Size limited | `NFR-SEC-009` | `SEC-06` |
| Path traversal in the filename rejected | `NFR-SEC-009` | `SEC-08` |
| **Stored outside the served application path** | `NFR-SEC-009` | Structural |

### 10.1 Storage location is the control

**A permitted file type whose content is executable, placed inside a served application directory, is
remote code execution.** The extension check is not the control; the storage location is.

**This is why `C-13` in [TECH-STACK.md](../../architecture/TECH-STACK.md) makes the hosting arrangement a
constraint**: it must permit separating upload storage from served paths.

---

## 11. Audit Logging

[SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md) section 8 holds the structural
detail. The engineering rules:

| Rule | Requirement |
|---|---|
| Every state change is audited | `NFR-AUD-001` |
| Actor, action, entity type, identifier, timestamp | `NFR-AUD-002` |
| Previous and new values | `NFR-AUD-003` |
| Reason for every privileged action | `NFR-AUD-004` |
| No modification or deletion path | `NFR-AUD-005` |
| Read and export are themselves audited | `NFR-AUD-008`, `AUD-21` |
| System and user actions distinguished | `NFR-AUD-009` |
| Correlation identifier across request, audit, and log | `NFR-MAINT-005` |
| **Audit write failure refuses the state change** | Scenario `FAIL-05` |

### 11.1 The reason is required at the point of action

`NFR-AUD-004` requires a reason as part of the request, not added afterwards.

**An administrator who adds a reason later can write whatever justifies the action.** `FR-REG-028` and
`FR-REG-033` require it as part of the request so scenario `RV-08` can verify it is refused without one.

---

## 12. Secrets and Environment Variables

**Detailed in `PB-ENG-12 Secrets and Configuration`.** The engineering rules relevant to writing code:

| Rule | Authority |
|---|---|
| No secret in source | Governance principle 7 |
| No secret in a committed configuration file | `PB-ENG-12` section 1 |
| Configuration externalised, not baked into the artefact | `EA-1` |
| No secret in a log or an error message | `NFR-SEC-013` |

---

## 13. Least Privilege

`NFR-SEC-015` requires minimum privilege for database access. Two structural consequences:

| Consequence | Why |
|---|---|
| Audit table receives insert and read grants only | Makes `NFR-AUD-005` structural rather than conventional |
| The application role holds no schema-altering privilege in production | Prevents an application defect from doing what a human is forbidden to do by convention |

The second is what makes `NFR-MAINT-006` meaningful.

---

## 14. Error Handling

| Rule | Requirement |
|---|---|
| No stack trace, internal identifier, or infrastructure detail to a user | `NFR-SEC-012` |
| Dependency failure is recorded state, not an exception | `BR-2` in [INTEGRATION-BOUNDARIES.md](../../architecture/INTEGRATION-BOUNDARIES.md) |
| Unavailable dependency degrades to a signposted state | `NFR-AVAIL-004` |
| The user receives something actionable | `NFR-USAB-002` |
| The operator receives the detail, correlated | `NFR-MAINT-004`, `NFR-MAINT-005` |

**`NFR-AVAIL-004` is a security control as well as a usability one.** An error page revealing a
connection failure for an internal service discloses infrastructure existence to anyone who can reach the
endpoint.

---

## 15. Sensitive Information Exposure

| Data | Where it must not appear |
|---|---|
| Credentials, session tokens | Logs, error messages, source, responses |
| Student personal data | Logs, `NFR-SEC-013` |
| Email addresses of other students | Officer interfaces, `FR-NOT-047` |
| Per-recipient email failure detail | Officer interfaces, `FR-NOT-047` |
| Another student's registrations | Any student's view, `FR-REG-040` |
| QR token values | Logs |
| Registration context snapshots | Notification bodies, per `BR-4` |

---

## 16. Verification Requirements

**PROPOSED.** Every change touching the areas in this playbook requires:

| Change touches | Required verification |
|---|---|
| Authorisation | A service-level test per affected matrix row, **both directions** |
| Input handling | Negative tests per input class |
| Output | An encoding test with script fragments, and with non-ASCII |
| A query | A parameterisation review, and an injection test |
| A session | A revocation test |
| An upload | Type, size, and traversal tests |
| A state change | An audit entry assertion |
| A dependency | `PB-ENG-13` section 2 |

**A new operation without a denial test is not complete**, because nothing else will exercise its
denial path.

### 16.1 Three controls are verified by inspection

| Control | Method |
|---|---|
| Credential storage, `NFR-SEC-002` | Inspect the storage configuration |
| Transport encryption, `NFR-SEC-014` | Inspect the deployed configuration |
| Database grants, `NFR-SEC-015` | Inspect the grants |

**These cannot be proven by exercising an endpoint.** Recording them as inspection checks prevents them
being reported as passed on the basis that the application seemed secure.

---

## Mandatory Validation

| Requirement | Authority |
|---|---|
| Every action traceable to an authorisation matrix row | Section 1.1 |
| Deny by default implemented structurally | Section 1.2 |
| No role outside the five | Section 1.3 |
| The five prohibitions enforced and tested | Section 2 |
| `FR-NOT-047` enforced in the query | Section 2.2 |
| Credentials non-recoverable | Section 3 |
| Sessions server-side revocable; role change invalidates | Section 4 |
| Validation in the domain layer, not the interface | Section 5 |
| Every query parameterised | Section 7 |
| Rate limiting in three places | Section 9 |
| Uploads stored outside the executable path | Section 10 |
| Audit write failure refuses the state change | Section 11 |
| Least privilege on database access | Section 13 |
| No internal error detail to users | Section 14 |
| Verification per section 16 for the area touched | Section 16 |

## Required Evidence

- The authorisation matrix rows implemented, cited in the pull request
- A service-level test per affected row, both directions
- Negative tests per input class
- Negative tests per storage-layer guarantee, if changed
- The security assessment section of the pull request, per `PB-ENG-06` section 4
- For inspection-based controls, the inspection record

## What Blocks Progression

- An action implemented that is not in the matrix
- An existing matrix row altered without a decision
- A prohibition assumed rather than enforced
- A new request field trusted without validation
- A query not parameterised
- A session that is not server-side revocable
- An upload stored inside the served path
- `FR-NOT-047` enforced only in the interface
- A state change committed when its audit write failed
- Internal error detail reaching a user
- A secret in source, a log, or an artefact
- Security verification omitted for the area touched

## Exception Process

**PROPOSED.** A security control may be temporarily unenforced during incident response only if the
risk is recorded, an owner is named, and a resolution date is set. The exception is reported to the
Council Secretary.

**No exception exists for** disabling authorisation, removing rate limiting, weakening validation,
reverting `FR-NOT-047`, or bypassing a failing security test. Governance principles 2 and 15 are
absolute on those. **The system holds real student data, and these are the controls protecting it.**

---

## Completion Criteria

- Every matrix row implemented and tested in both directions
- The five prohibitions enforced and tested
- Every security control in [SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md)
  section 10 verified
- Section 12 updated to reflect reality

---

## Test Scenarios

**Identifier prefix.** These scenarios are prefixed `SECS-` to distinguish them from the `SEC-01` to
`SEC-26` scenario identifiers in [SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) section 9, which
describe the controls themselves. The `SEC-nn` references elsewhere in this document point to those.

| ID | Type | Scenario | Expected |
|---|---|---|---|
| SECS-01 | Happy path | New operation with a matrix row and tests both ways | Accepted |
| SECS-02 | Invalid | Operation implemented with no matrix row | **Blocked**, section 1.1 question 2 |
| SECS-03 | Unauthorized | Matrix row widened without a decision | **Blocked**, question 3 |
| SECS-04 | Failure | New operation with no grant | Denied to everyone, deliberately |
| SECS-05 | Unauthorized | Final approver publishes | **Blocked**, prohibition 2 |
| SECS-06 | Unauthorized | Attendance Staff creates a registration | **Blocked**, prohibition 3 |
| SECS-07 | Unauthorized | Officer corrects attendance | **Blocked**, prohibition 4 |
| SECS-08 | Unauthorized | Officer reads another's events | **Blocked**, `FR-EVT-013` |
| SECS-09 | Unauthorized | Officer views email addresses or failure detail | **Blocked**, prohibition 5 |
| SECS-10 | Failure | `FR-NOT-047` enforced only in the interface | **Blocked**; value in the payload |
| SECS-11 | Invalid | New request field trusted without validation | **Blocked**, section 5.2 |
| SECS-12 | Failure | Validation order rearranged | **Blocked**; `RV-03` |
| SECS-13 | Failure | Query not parameterised | **Blocked**, `NFR-SEC-008` |
| SECS-14 | Invalid | Script fragment in event content | Encoded, `NFR-SEC-007` |
| SECS-15 | Failure | Emoji or non-ASCII mangled | **Blocked**; `NEG-12` |
| SECS-16 | Failure | Stack trace reaching a user | **Blocked**, `NFR-SEC-012` |
| SECS-17 | Failure | Personal data in logs | **Blocked**, `NFR-SEC-013` |
| SECS-18 | Failure | Session survives role revocation | **Blocked**, section 4.1 |
| SECS-19 | Failure | Suspended account retains privileges mid-session | **Blocked**, `AUTH-12` |
| SECS-20 | Failure | Session identifier survives login | **Blocked**, `SEC-04` |
| SECS-21 | Failure | Sustained authentication attempts | Rate limited, `NFR-SEC-011` |
| SECS-22 | Failure | QR token enumeration | Rate limited; identity not revealed |
| SECS-23 | Invalid | Upload of a disallowed type | Rejected before storage |
| SECS-24 | Invalid | Oversized upload | Rejected |
| SECS-25 | Failure | Path traversal in a filename | Rejected |
| SECS-26 | Failure | Upload stored in the served path | **Blocked**, section 10.1 |
| SECS-27 | Failure | Audit write fails, change commits | **Blocked**, `FAIL-05` |
| SECS-28 | Invalid | Audit entry modified or deleted | No path exists |
| SECS-29 | Failure | Reason added after the action, not at it | **Blocked**, section 11.1 |
| SECS-30 | Failure | Self-service account creation | **Blocked**, `FR-USR-005` |
| SECS-31 | Failure | Cross-site state-changing request | Rejected, `NFR-SEC-010` |
| SECS-32 | Failure | Application role holds schema-altering privilege | **Blocked**, section 13 |
| SECS-33 | Invalid | Unauthenticated endpoint returning participant data | **Blocked**, `NFR-SEC-018` |
| SECS-34 | Failure | Credential storage inspected and found recoverable | **Blocked**, `NFR-SEC-002` |
| SECS-35 | Unauthorized | Security control disabled to unblock a release | **Blocked**, principle 15 |

---

## Exit Criteria

- OQ-07, OQ-33, and OQ-45 answered
- Every control in [SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md) section 10
  implemented and verified
- The matrix enforced server-side, confirmed by a security review
- No outstanding security exception
- Section 12 removed, once it ceases to be true that nothing exists
- The "not yet implemented" banner removed

---

**Related documents:** [PB-ENG-11 Security](PB-ENG-11-SECURITY.md) ·
[SECURITY-PLAN.md](../../planning/SECURITY-PLAN.md) ·
[SECURITY-ARCHITECTURE.md](../../architecture/SECURITY-ARCHITECTURE.md) ·
[PB-ENG-12 Secrets and Configuration](PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[PB-ENG-13 Dependency Management](PB-ENG-13-DEPENDENCY-MANAGEMENT.md) ·
[PB-ENG-07 Code Review](PB-ENG-07-CODE-REVIEW.md) ·
[PB-ENG-06 Pull Requests](PB-ENG-06-PULL-REQUESTS.md) ·
[PB-ENG-08 Testing](PB-ENG-08-TESTING.md) ·
[USER-ROLES.md](../../planning/USER-ROLES.md) ·
[TESTING-STRATEGY.md](../../planning/TESTING-STRATEGY.md) ·
[OPEN-QUESTIONS.md](../../planning/OPEN-QUESTIONS.md)