# Security Architecture

**Document:** ERNS-ARCH-SEC
**Area:** architecture
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** This document specifies a target state. **No security control described
> here is currently in operation.** ERNS has no authentication, no authorisation, no encryption, no
> audit store, no rate limiting, and no monitoring. See the implementation status section.

---

## Purpose

Describe the structural security design of the Event Registration and Notification System: where each
control must be enforced, how authorisation is structured, and how the guarantees in
[SECURITY-PLAN.md](../planning/SECURITY-PLAN.md) map onto the layers in
[SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md).

**This document holds structural decisions. It does not duplicate the threat catalogue.**
`SECURITY-PLAN.md` states what the threats are; this document states where each control physically
lives and why it cannot live anywhere else.

---

## Scope

**In scope:** enforcement points, the authorisation structure, session structure, the trust
boundaries, defence in depth, and the verification approach for each control.

**Out of scope:** the threat analysis and the authorisation matrix, both in
`SECURITY-PLAN.md`; secure development process, in `PB-ENG-11 Security`; secrets handling, in
`PB-ENG-12 Secrets and Configuration`; audit event catalogue, in
[AUDIT-PLAN.md](../planning/AUDIT-PLAN.md).

---

## 1. Threat Context

ERNS holds three categories of data that make compromise consequential.

| Data | Sensitivity | Consequence of exposure |
|---|---|---|
| Attendance records | **Moderate to high** | Reveals presence *and* absence. Absence from a medical or religious event is itself sensitive |
| Student identity, programme, organisation | Moderate | Personal data about an identifiable individual |
| Officer credentials | **High** | Publication and correction authority over official records |

**Attendance absence is the reason this is not a routine system.** A system that records absences
indiscriminately discloses information a student never chose to share. Retention is therefore
recorded as unresolved, **OQ-27** and **OQ-28**, with the shortest defensible period as the default.

---

## 2. Trust Boundaries

**PROPOSED.** Four boundaries. Each is a place where data changes trust level, and each requires
authorisation to cross.

```
┌─ TB-1 ────────────────────────────────────────────────────────┐
│  UNTRUSTED: the network                                       │
│  Browsers, mobile devices, QR scanners, email clients         │
└──────────────────────────┬───────────────────────────────────┘
                           │  TLS, NFR-SEC-014
┌─ TB-2 ───────────────────▼───────────────────────────────────┐
│  EDGE: the presentation tier                                  │
│  Untrusted input arrives here and is NEVER trusted            │
│  L5 validates nothing it can enforce, per SD-A               │
└──────────────────────────┬───────────────────────────────────┘
                           │  Authenticated session
┌─ TB-3 ───────────────────▼───────────────────────────────────┐
│  APPLICATION: the authorisation tier                          │
│  L4 decides whether the actor may act on the resource        │
│  ★ Every check lives here. This is the enforcement point.    │
└──────────────────────────┬───────────────────────────────────┘
                           │  Role-scoped, least-privilege connection
┌─ TB-4 ───────────────────▼───────────────────────────────────┐
│  DATA: persistence and infrastructure                        │
│  No human authenticates here. No authorisation decided here. │
│  Storage-layer constraints are the last line, not the first. │
└──────────────────────────────────────────────────────────────┘
```

### 2.1 Why TB-3 is the whole design

**NFR-SEC-004** requires authorisation on the server for every operation and forbids relying on
interface-level restriction. **NFR-SEC-005** requires denial by default.

Together these mean: an L5 control that hides a button is a usability feature, not a control. The
same permission is checked in L4 for every request. Scenario `NFRD-14` verifies this by issuing a
direct request that bypasses the interface entirely.

**The stored constraint is a backstop, not the control.** `NFR-INTEG-001` on `(user_id, event_id)` is
the authoritative duplicate safeguard — but a storage constraint cannot know whether the caller was
permitted to write. It stops the accident; it does not stop the attacker.

---

## 3. Authorisation Structure

### 3.1 Roles are fixed

**CONFIRMED.** Exactly five roles: Administrator, Event Officer, Approver, Student, Attendance
Staff. **Club Officer is not a login role.**

`NFR-SEC-016` permits no others. This is a closed set for the same reason the lifecycle transition set
is closed in [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) SD-B: an open-ended role model permits
privilege escalation by configuration rather than by code.

### 3.2 Ownership is a second axis

Authorisation is never role-alone. Every rule in the matrix in `SECURITY-PLAN.md` section 4 combines
a role with a relationship to the specific resource.

| Resource | The relationship that scopes it |
|---|---|
| Event | Is the caller the owning Event Officer? |
| Registration | Is this the caller's own registration? |
| Attendance | Is the caller assigned to this event? |
| Notification | Does the caller own the event this notification concerns? |
| Audit | May the caller see entries for events they do not own? |

**Why this matters.** "An Event Officer may cancel a registration" is dangerously broad — it would
let any officer cancel any student's registration on any event. The actual rule in the matrix is
"may cancel another's registration on an event they own, with a reason". Scenario `AUTH-06` and
`AUTH-07` verify the scoping.

### 3.3 The five prohibitions, and where each is enforced

Every prohibition is a separate decision, not a gap in a permission table.

| Prohibition | Requirement | Enforced at | Scenario |
|---|---|---|---|
| An officer may not decide approval on their own event | SD-1 | L4 | `SEC-04` |
| The final approver may not publish | `FR-APR-012` | L4 | `SEC-05`, `RV-27` |
| Attendance Staff and Approver may not create registrations | `FR-REG-036`, SD-2 | L4 | `SEC-06`, `AUTH-05` |
| An Event Officer may not correct attendance | `FR-ATT-016` | L4 | `SEC-07`, `AUTH-09` |
| Officers may not see per-recipient email detail | `FR-NOT-047` | L4, and the query itself | `SEC-09`, `AUTH-08` |

**`FR-NOT-047` is enforced in the query, not only at the interface.** Restricting a field by not
rendering it leaves it in the response payload. Per `PB-ENG-11 Security`, the restriction must be
expressed as a data-access rule so that the value is never retrieved at all.

### 3.4 Deny by default

`NFR-SEC-005` requires that any operation not explicitly permitted is denied.

**PROPOSED.** Structural consequence: a permission check that does not find an explicit grant returns
denied without evaluating further. There is no allow-by-default branch and no implicit inheritance
from a broader role.

This is the requirement that makes a new feature dangerous. A new operation added without a
corresponding grant is **inaccessible to everyone**, which is the correct failure mode: a
half-configured feature that nobody can reach is an operational problem, whereas one reachable by
everyone is a security incident.

### 3.5 Privileged operations require re-authentication

`NFR-SEC-017` requires fresh re-authentication for privileged administrative operations.

| Operation | Requirement for a reason | Requirement for re-authentication |
|---|---|---|
| Manual registration | `FR-REG-028` | `NFR-SEC-017` |
| Cancel another's registration | `FR-REG-028` | `NFR-SEC-017` |
| Correct attendance | `NFR-AUD-004` | `NFR-SEC-017` |
| Grant or revoke a role | `AUD-02` | `NFR-SEC-017` |
| Configure an approval chain | `AUD-04` | `NFR-SEC-017` |
| Export the audit trail | `AUD-21` | `NFR-SEC-017` |

**A reason and re-authentication are different controls.** A reason creates the accountability record
that `NFR-AUD-004` requires and makes the action reviewable after the fact. Re-authentication proves
the person at the keyboard is the account holder *now*. Neither substitutes for the other.

---

## 4. Session Structure

`PROPOSED.` Properties are specified in [SECURITY-PLAN.md](../planning/SECURITY-PLAN.md) section 6.
This document states the structural requirements.

| Requirement | Property | Structural reason |
|---|---|---|
| `NFR-SEC-002` | Credentials stored non-recoverably | A database disclosure must not yield usable passwords |
| `NFR-SEC-003` | Session ends on logout and on idle timeout | Bounded session lifetime |
| `NFR-SEC-014` | Session cookie transport encrypted only | Session tokens are bearer credentials |
| `NFR-SEC-010` | Authenticated pages not cached or framed | A cached authenticated page is readable by the next user of the device |
| Role change invalidates existing sessions | Server-side revocable session state | See below |

### 4.1 Why sessions must be server-side

**A self-contained session token cannot be revoked.** If role assignment is changed, a token that
carries its own claims remains valid until it expires. Scenario `AUTH-13` and `SEC-20` verify that
revocation takes effect immediately.

**This is not a theoretical concern.** An account suspended for a security incident would retain full
privileges for the remainder of its token lifetime. `NFR-SEC-001` requires every data access to be
authenticated, and `AUTH-12` verifies that a suspended account is refused even mid-session.

### 4.2 Session fixation

The session identifier MUST be replaced on authentication, per scenario `SEC-04`. An identifier that
survives a login can be pre-set by an attacker and then used after the victim authenticates.

### 4.3 Cross-site request protection

`NFR-SEC-010` requires headers directing browsers not to cache authenticated pages or embed them in
unrelated origins. Scenario `SEC-03` verifies a cross-site request attempt is rejected.

**PROPOSED.** State-changing requests additionally require a token that an unrelated origin cannot
construct. This is noted as a structural requirement rather than a mechanism, because the mechanism
follows from the stack decision in [TECH-STACK.md](TECH-STACK.md).

---

## 5. Input, Output, and Data Access

### 5.1 Input validation

`NFR-SEC-006` requires validation and sanitisation at the server boundary.

**Structural placement.** Validation belongs in L3 (domain) and L4 (application), never L5. A browser
check is a courtesy to the user; it is trivially bypassed and it protects nothing.

| Input class | Validation | Requirement |
|---|---|---|
| Registration fields | Type, length, format, required | `FR-REG-015`, `NFR-SEC-006` |
| Event content | Type, length; encoded on output | `NFR-SEC-007` |
| Search and filter input | Type, length, permitted characters | `NFR-SEC-006` |
| QR token | Format, validity, expiry, event match | `FR-ATT-002`, `QR-03` |
| File upload | Type, size, storage location | `NFR-SEC-009` |

### 5.2 Output encoding

`NFR-SEC-007` requires encoding that prevents stored cross-site scripting. Event titles,
descriptions, and student names are all attacker-influenced text rendered back to other users, so
every one is an encoding obligation.

Scenario `NEG-11` and `NEG-12` require special characters, non-ASCII, and emoji to be stored and
displayed correctly — which is only achievable with correct encoding. **A system that escapes rather
than encodes will pass `SEC-02` and fail `NEG-12`.**

### 5.3 Parameterised data access

`NFR-SEC-008` requires parameterised access for **every** query, without exception. Scenario `SEC-01`
attempts injection in registration fields; the expected result is that the input is treated as data.

**Structural note.** This is a rule about how the persistence layer is written, and it is enforced by
code review, because there is no way to detect a string-concatenated query at runtime without
attempting injection. `PB-ENG-07 Code Review` includes it as a mandatory review item.

### 5.4 Upload handling

`NFR-SEC-009` requires type and size validation, and storage outside the executable path.

| Control | Requirement | Scenario |
|---|---|---|
| Type validated against a permitted list | `NFR-SEC-009` | `SEC-07` |
| Size limited | `NFR-SEC-009` | `SEC-06` |
| Path traversal in filename rejected | Implicit in `NFR-SEC-009` | `SEC-08` |
| Stored outside the served application path | `NFR-SEC-009` | Structural |

**Storing uploads outside the executable path is the control that turns a file upload into a remote
code execution vector.** A permitted type whose content is executable, placed inside a served
application directory, is enough. The storage location is the control; the extension check is not.

---

## 6. Error and Information Disclosure

| Rule | Requirement |
|---|---|
| No stack traces, internal identifiers, or infrastructure detail to any user | `NFR-SEC-012` |
| No credentials, session tokens, or personal data in logs | `NFR-SEC-013` |
| Dependencies degrade to a signposted unavailable state, not an error | `NFR-AVAIL-004` |

Scenario `SEC-09` verifies no internal detail is disclosed; `SEC-10` verifies no credential appears in
logs.

**`NFR-SEC-012` and `NFR-MAINT-004` pull in opposite directions and must be resolved deliberately.**
An operator needs enough to diagnose a failure; a user needs none of it. The structural resolution is
that the detail goes to the log, correlated by `NFR-MAINT-005`, and the user receives a reference and
a plain statement. `PB-ENG-17 Incident Response` depends on this being true.

**`NFR-AVAIL-004` is a security control as well as a usability one.** An error page that reveals a
connection failure for an internal service discloses infrastructure existence to anyone who can reach
the endpoint.

---

## 7. Rate Limiting and Abuse Control

`NFR-SEC-011` requires rate limiting in three places, and the choice of three is deliberate.

| Target | Threat | Scenario |
|---|---|---|
| Authentication attempts | `TH-08` account takeover, credential stuffing | `SEC-14`, `SEC-11`, `NFRD-06` |
| Notification dispatch | `TH-11` notification abuse | `SEC-24` |
| QR validation | Automated enumeration | `SEC-25`, `QR-07` |

**QR enumeration is the one most easily missed.** A QR token that is guessable, or an endpoint that
answers without limit, allows an attacker to establish who attended which event without ever
attending anything. The token MUST NOT encode or reveal identity before validation, per scenario
`QR-08`.

---

## 8. Audit Architecture

### 8.1 Append-only by construction

`NFR-AUD-005` requires that **no means** of modifying or deleting an audit entry exists. The
structural consequence is stronger than a convention:

| Property | Enforcement |
|---|---|
| No update path in code | Review, scenario `RV-34` |
| No delete path in code | Review, scenario `RV-34` |
| Storage grants exclude update and delete | Append-only storage rule in [AUDIT-PLAN.md](../planning/AUDIT-PLAN.md) section 8 |
| Reads and exports are themselves audited | `FR-AUD-010`, `AUD-21` |

`RV-34` verifies this by confirming no such endpoint or method exists. **This control is hard to test
positively**, because the test asserts an absence. It is listed here as a structural requirement
precisely so it is not forgotten at implementation.

`TH-12` is the threat this addresses: an administrator altering records to conceal an action. Without
append-only storage, the audit trail is worthless to exactly the people who most need it.

### 8.2 Audit write failure refuses the state change

Scenario `FAIL-05`, structural decision SD-E in [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md).

An alternative design commits the state change and logs the audit failure separately. It is rejected:
it produces an unaudited state change, which defeats the purpose of recording it.

### 8.3 Every privileged action carries a reason

`NFR-AUD-004` requires a reason for every privileged override, manual registration, manual
cancellation, and attendance correction. Fifteen of the twenty-five event classes in
[AUDIT-PLAN.md](../planning/AUDIT-PLAN.md) require one.

**A reason is required at the point of action, not afterwards.** An administrator who adds a reason
after the fact can write whatever justifies the action. `FR-REG-028` and `FR-REG-033` require it as
part of the request, so scenario `RV-08` can verify it is refused without one.

---

## 9. Data Protection

| Rule | Requirement |
|---|---|
| All traffic encrypted | `NFR-SEC-014` |
| Database access at minimum privilege | `NFR-SEC-015` |
| Uploads validated and stored outside the executable path | `NFR-SEC-009` |
| Student context snapshotted at registration | `NFR-INTEG-009` |
| Responses carry no-cache and no-embed headers | `NFR-SEC-010` |

### 9.1 Deletion is not offered

**PROPOSED**, and deliberately conservative. Until `OQ-26`, `OQ-27`, and `OQ-28` are answered:

- No role can delete a registration or attendance record
- Corrections are preferred to deletion, and are themselves audited
- Audit records are never deleted

A system whose value is trustworthy records should not offer a convenient erasure path, and no
retention policy currently authorises one. If a policy is produced, this section is revisited under
`PB-ENG-20 Change Management`.

### 9.2 Least privilege at the data layer

`NFR-SEC-015` requires the application's database access to hold the minimum privilege its component
needs. Two structural consequences:

| Consequence | Why |
|---|---|
| Audit table receives insert and read grants only | Makes `NFR-AUD-005` structural rather than conventional |
| The application role holds no schema-altering privilege in production | Prevents an application defect from altering or dropping data |

The second is what makes `NFR-MAINT-006` meaningful. If the application could alter the schema, a
defect could do what a human is forbidden to do by convention.

---

## 10. Verification Approach

Each control names the scenario that would fail if it were removed. A control with no scenario is not
verified.

| Control | Requirement | Scenario |
|---|---|---|
| Server-side authorisation | `NFR-SEC-004` | `NFRD-14`, `AUTH-01` to `AUTH-15` |
| Deny by default | `NFR-SEC-005` | `AUTH-12`, `AUTH-14` |
| Non-recoverable credentials | `NFR-SEC-002` | Structural inspection |
| Session termination | `NFR-SEC-003` | `SEC-13`, `SEC-20` |
| Session replaced on login | Fixation | `SEC-04` |
| Input validation | `NFR-SEC-006` | `SEC-01`, `NFRD-03` |
| Output encoding | `NFR-SEC-007` | `SEC-02`, `NFRD-04`, `NEG-12` |
| Parameterised access | `NFR-SEC-008` | `SEC-01`, `SEC-05` |
| Upload validation | `NFR-SEC-009` | `SEC-06`, `SEC-07`, `SEC-08` |
| Response headers | `NFR-SEC-010` | `SEC-03` |
| Rate limiting | `NFR-SEC-011` | `SEC-11`, `SEC-14`, `SEC-24`, `SEC-25` |
| No error disclosure | `NFR-SEC-012` | `SEC-09` |
| No secrets in logs | `NFR-SEC-013` | `SEC-10` |
| Encrypted transport | `NFR-SEC-014` | Structural inspection |
| Least privilege | `NFR-SEC-015` | Structural inspection |
| Closed role set | `NFR-SEC-016` | `AUTH-12`, `AUTH-14` |
| Re-authentication for privileged actions | `NFR-SEC-017` | `AUTH-05`, `AUTH-09` |
| No unauthenticated data endpoint | `NFR-SEC-018` | `AUTH-11` |
| Audit append-only | `NFR-AUD-005` | `RV-34` |
| Audit retained beyond records | `NFR-AUD-006` | Retention policy, `OQ-28` |
| Reason required for privileged action | `NFR-AUD-004` | `RV-08` |
| Audit of audit access | `NFR-AUD-008` | `AUDT-21` |

**Three controls are verified by structural inspection rather than by a request:** credential storage
(`NFR-SEC-002`), transport encryption (`NFR-SEC-014`), and database grants (`NFR-SEC-015`). These
cannot be proven by exercising an endpoint, so they are verified by inspecting the configuration.
Recording them as inspection checks prevents them being reported as passed on the basis that the
application "seemed secure".

---

## 11. Implementation Status

> **NOT YET IMPLEMENTED.** Nothing in this document is in operation.

| Control family | State | Blocking |
|---|---|---|
| Authentication | Not implemented | OQ-45, blocked by OQ-33 |
| Authorisation | Not implemented. Matrix specified, unenforced | OQ-42 |
| Session management | Not implemented | OQ-45 |
| Input validation | Not implemented | OQ-42 |
| Output encoding | Not implemented | OQ-41 |
| Parameterised access | Not implemented | OQ-44 |
| Upload validation | Not implemented | OQ-41 |
| Response headers | Not implemented | OQ-30 |
| Rate limiting | Not implemented | OQ-30 |
| Encryption in transit | Not implemented | OQ-30 |
| Least-privilege database grants | Not implemented | OQ-44 |
| Append-only audit store | **Not implemented. No audit store exists** | OQ-44 |
| Secret scanning | Not implemented | `PB-ENG-09 CI` |
| Dependency vulnerability scanning | Not implemented | `PB-ENG-13` |
| Audit access auditing | Not implemented | OQ-44 |
| Monitoring and detection | Not implemented | OQ-53 |

**The append-only audit property is the most consequential gap.** `TH-12` assumes an audit trail
worth protecting. Until the store exists and its grants are restricted, ERNS has no accountability
record at all — which means every other control in this document is currently unverifiable, because
there is no way to establish after the fact whether it was applied.

---

## 12. Verification Approach for This Document

| Property | How it is checked |
|---|---|
| No control is claimed as operating | Section 11 states each as not implemented |
| Every control is traceable to a requirement | Section 10, one row per requirement |
| Every control has a verification means | Section 10, including the three inspection checks |
| Enforcement point stated | Sections 2 to 4, per layer |
| No technology named | Mechanism referred to structurally; stack is OQ-41 to OQ-55 |
| Matrix not duplicated | Cross-reference to `SECURITY-PLAN.md` section 4 only |

---

## 13. Open Questions

| Question | Security impact | Who can answer |
|---|---|---|
| [OQ-33](../planning/OPEN-QUESTIONS.md) Identity source | Decides whether ERNS manages passwords at all | IT, Registrar |
| [OQ-45](../planning/OPEN-QUESTIONS.md) Authentication mechanism | Governs `NFR-SEC-002` implementation | IT, Council Secretary |
| [OQ-07](../planning/OPEN-QUESTIONS.md) Login requirement | If relaxed, duplicate prevention weakens materially | Council Secretary |
| [OQ-28](../planning/OPEN-QUESTIONS.md) Records retention policy | Governs §9.1 and `NFR-AUD-006` | School administration |
| [OQ-30](../planning/OPEN-QUESTIONS.md) Hosting | Governs TLS, headers, rate limiting, least privilege | IT |
| [OQ-25](../planning/OPEN-QUESTIONS.md) Administrator direct edits | Governs whether `SD-4` override is permitted | Council Secretary, Council |
| [OQ-24](../planning/OPEN-QUESTIONS.md) Administrator role split | A single Administrator holding both technical and business authority weakens `TH-12` | Council Secretary |
| [OQ-53](../planning/OPEN-QUESTIONS.md) Observability tooling | Governs detection for `TH-08`, `TH-09`, `TH-12` | IT |

**OQ-24 deserves particular attention.** `TH-12` assumes the person who can alter data cannot also
erase the evidence. If a single Administrator role holds both capabilities, that assumption fails by
construction, and no audit control can compensate for it.

---

## 14. Completion Criteria

This document is BASELINE when:

- Trust boundaries and the enforcement point at TB-3 are recorded
- Roles, ownership scoping, and the five prohibitions are structurally placed
- Session properties are stated with their structural reasons
- Every control family names its requirement and its verification means
- Inspection-based verifications are distinguished from request-based ones
- No control is claimed as implemented

---

## 15. Exit Criteria

- OQ-07, OQ-25, OQ-28, OQ-30, OQ-33, and OQ-45 answered
- OQ-24 resolved, and the `TH-12` assumption holds under the answer
- Every control in section 10 implemented and its scenario executing
- A security review confirms the authorisation matrix is enforced in L4
- Section 11 removed, once it ceases to be true that nothing is implemented

---

**Related documents:** [SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md) ·
[SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) ·
[INTEGRATION-BOUNDARIES.md](INTEGRATION-BOUNDARIES.md) ·
[TECH-STACK.md](TECH-STACK.md) ·
[SECURITY-PLAN.md](../planning/SECURITY-PLAN.md) ·
[AUDIT-PLAN.md](../planning/AUDIT-PLAN.md) ·
[USER-ROLES.md](../planning/USER-ROLES.md) ·
[PB-ENG-11 Security](../playbooks/engineering/PB-ENG-11-SECURITY.md) ·
[PB-ENG-12 Secrets and Configuration](../playbooks/engineering/PB-ENG-12-SECRETS-CONFIGURATION.md) ·
[TESTING-STRATEGY.md](../planning/TESTING-STRATEGY.md) ·
[OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md)