# Integration Boundaries

**Document:** ERNS-ARCH-INT
**Area:** architecture
**Status:** Baseline
**Last updated:** 2026-10-02
**Owner:** Developer
**Supersedes:** None

> **NOT YET IMPLEMENTED.** This document specifies a target state. No integration exists, has been
> attempted, or has been agreed with any external party. See the integration status section.

---

## Purpose

State every boundary at which the Event Registration and Notification System depends on something it
does not control, and record the risk of each.

**ERNS currently has one confirmed external dependency: email.** Everything else is either unresolved
or explicitly out of scope. That is a deliberate position, not an oversight, and this document
records the reasoning.

---

## Scope

**In scope:** external systems ERNS depends on, dependency characteristics, failure behaviour at each
boundary, and the boundary rules that follow.

**Out of scope:** threat analysis, in [SECURITY-PLAN.md](../planning/SECURITY-PLAN.md); internal
layer boundaries, in [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md); deployment topology, in
[ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md).

---

## 1. Integration Position

**CONFIRMED.** ERNS serves one student organisation. Per
[SYSTEM-SCOPE.md](../planning/SYSTEM-SCOPE.md) section 5, multi-tenancy is excluded.

**Consequence.** The integration surface is not proportional to the number of features. It is
proportional to the number of systems ERNS cannot control, and ERNS controls its own data.

| Category | Count | Note |
|---|---|---|
| Confirmed external dependencies | **1** | Email transport |
| Unresolved potential dependencies | 3 | Institutional sign-on, student information system, hosting |
| Explicitly excluded integrations | 0 | Nothing excluded on technical grounds |
| Internal boundaries | 4 | Between layers, per `SYSTEM-ARCHITECTURE.md` |

---

## 2. Confirmed Dependencies

### IB-1 Email transport

| Property | Value |
|---|---|
| Purpose | Deliver the email delivery layer of **Primary Function 2** |
| Authority | **ERNS.** Email is not the source of truth |
| Blocking question | [OQ-32](../planning/OPEN-QUESTIONS.md) sending permission; [OQ-50](../planning/OPEN-QUESTIONS.md) transport |
| Assurance | **Unverified.** Sending permission, rate limits, and deliverability are all unconfirmed |

**This is the only confirmed dependency, and its in-app counterpart is what makes it survivable.**

| Property | Requirement | Scenario |
|---|---|---|
| Email failure may not remove or downgrade the in-app record | `FR-NOT-005` | `RV-16`, `NOTIF-09`, `FAIL-02` |
| A failed dispatch is queued and retried, not discarded | `NFR-AVAIL-006` | `FAIL-04` |
| Repeated failure reaches `BOUNCED` after bounded retries | `FR-NOT-048` | `NOTIF-10` |
| Dispatch does not block the requesting session | `NFR-PERF-004` | `NFRD-10` |

**The structural requirement.** The boundary MUST be asynchronous and MUST degrade to
record-and-continue. `NFR-AVAIL-004` requires a signposted unavailable state rather than an error, and
scenario `FAIL-02` verifies the in-app notification is created even when transport is unavailable.

**Why this matters more than it looks.** Email is ERNS's only outbound dependency, and it is the one
the organisation has least control over. `OQ-32` asks whether the school permits ERNS to send at all.
**If the answer is no, Primary Function 2 is delivered entirely in-app** — which `FR-NOT-001`
already permits, since the in-app centre is the source of truth. The architecture does not depend on
the answer.

### IB-2 Institutional single sign-on

| Property | Value |
|---|---|
| Purpose | Authentication, if available |
| Authority | The institution |
| Blocking question | [OQ-33](../planning/OPEN-QUESTIONS.md) |
| Status | **Unconfirmed to exist** |

**Conditional.** If it exists, `PB-ENG-11 Security` records that local credential handling reduces. If
it does not, ERNS manages passwords itself and `NFR-SEC-002` governs implementation.

**The architecture must support both.** Authentication sits behind the layer-1 adapter boundary
precisely so that this answer, which is unresolved, does not force a redesign.

### IB-3 Student information system

| Property | Value |
|---|---|
| Purpose | Populate `StudentProfile` rather than manual entry |
| Authority | The institution or Registrar |
| Blocking question | [OQ-33](../planning/OPEN-QUESTIONS.md) |
| Default assumption | **No integration.** Student data is seeded and maintained by the Council |

**Recorded as out of current scope rather than planned.** `AS-05` records that students have no
self-service account creation, which means an integration would change the provisioning model, not
merely the interface. That is a change under `PB-ENG-20 Change Management`.

**Consequence of no integration.** User accounts are provisioned by an Administrator, per
[USER-ROLES.md](../planning/USER-ROLES.md). `FR-USR-005` prohibits self-service creation. This is a
known administrative burden, accepted deliberately: an open registration system for a student
organisation invites junk accounts and weakens every guarantee that depends on identity.

### IB-4 Hosting platform

| Property | Value |
|---|---|
| Purpose | Runs the application, the data store, and the background queue |
| Authority | IT, or a third party |
| Blocking question | [OQ-30](../planning/OPEN-QUESTIONS.md) |
| Default assumption | **None selected.** No platform is assumed anywhere in this documentation |

**The widest-reaching unresolved boundary.** It determines E-4 in
[ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md), the data store in
[TECH-STACK.md](TECH-STACK.md) OQ-44, and whether TLS termination, rate limiting, and least-privilege
grants are ours to configure or the platform's to provide.

### IB-5 Background job execution

| Property | Value |
|---|---|
| Purpose | Organisation-wide notification dispatch, per `NFR-PERF-004` and `NFR-PERF-005` |
| Authority | Depends on OQ-30 |
| Blocking question | [OQ-51](../planning/OPEN-QUESTIONS.md) |

**Internal or external is not yet decided.** The requirement is that dispatch runs outside the request
path with observable progress. `NFR-PERF-005` requires it as a background task; `NFR-PERF-006`
requires browsing to stay usable during it.

---

## 3. Boundary Rules

Five rules apply to every external dependency. They exist because a dependency ERNS does not control
will eventually fail, and the question is only whether ERNS notices.

### BR-1 Timeouts on every outbound call

A call with no timeout waits indefinitely. During a notification dispatch this would hold a worker and,
in a synchronous path, a request — and `NFR-AVAIL-004` requires a degraded state rather than a hang.

### BR-2 Failure is recorded, not raised

**Every outbound dependency failure MUST be recorded as state, not propagated as an exception.** The
email state exists for this reason: `FAILED` and `BOUNCED` are recorded outcomes, not errors.

**The test of whether this rule is followed:** if a dependency is down and a user sees a stack trace,
the rule was violated. If a user sees their notification in the centre and the officer sees `FAILED`
for some recipients, it was followed.

### BR-3 No dependency is trusted with authority

ERNS validates its own authorisation decisions. A dependency may supply data — a profile, an
address, an identity assertion — but never a permission decision.

**Why this is not paranoia.** `FR-NOT-047` restricts per-recipient email detail to Administrators
because a list of bounced addresses is a list of student contact data. A dependency that could widen
access by being misconfigured would defeat a control the application deliberately enforces.

### BR-4 Data sent to a dependency is the minimum needed

| Boundary | Data sent | Data that must not be sent |
|---|---|---|
| IB-1 Email | Recipient address, subject, rendered body | Registration context, attendance, student profile fields |
| IB-2 Sign-on | Authentication assertion | — |
| IB-3 Student information system | **None. No integration** | The entire student population |
| IB-5 Background queue | Notification and recipient identifiers | Notification body, where avoidable |

**The IB-1 row is the one to enforce.** A confirmation email must carry the event detail a participant
needs — per `PB-04 Event Registration`, that is the point at which they are most likely to read it —
and must not carry the registration context snapshot, which is internal to the participation record.

### BR-5 Dispatch is bounded by rate limits

`NFR-SEC-011` requires rate limiting on notification dispatch. Against an external transport, the
limit protects ERNS's sending reputation; scenario `SEC-24` verifies it.

---

## 4. Failure Behaviour

| Dependency | Unavailable | ERNS behaviour | Requirement |
|---|---|---|---|
| Email transport | Dispatch queues, retries, marks `FAILED` then `BOUNCED` | Registration and in-app notification unaffected | `FR-NOT-005`, `NFR-AVAIL-006` |
| Session store | Access denied, never bypassed | Scenario `FAIL-07` — **denied, not degraded** | `NFR-SEC-001` |
| Storage | Request refused, no partial write | Scenario `FAIL-01` | `NFR-AVAIL-005` |
| File storage | Attachment rejected, event unaffected | Scenario `FAIL-08` | `NFR-MAINT-008` |
| Background queue | Dispatch waits, observable | `NFR-PERF-005` | — |

**`FAIL-07` is the outlier and that is deliberate.** For every other dependency, ERNS degrades
gracefully. For the session store it refuses, because allowing a request without session verification
would mean unauthenticated access to student data — which `NFR-SEC-018` prohibits outright.

**A queue that is down blocks dispatch but not registration.** Registration must succeed even when
notification dispatch cannot proceed, because the in-app record is created as part of the same
transaction per [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) §3.2. If registration depended on
the queue, an email outage would stop students registering for events.

---

## 5. Explicitly Not Integrated

Per [SYSTEM-SCOPE.md](../planning/SYSTEM-SCOPE.md), the following are out of scope and are recorded
here so the exclusion is visible in the integration surface rather than assumed.

| Not integrated | Note |
|---|---|
| Payments | Out of scope. No event charges a fee |
| Facial recognition | Out of scope. Attendance is QR plus a staff-assisted path |
| AI attendance verification | Out of scope. Verification is deterministic |
| AI event planning | Out of scope |
| GPS tracking | Out of scope. ERNS records attendance, not location |
| Social networking | Out of scope. Notifications are one-way |
| Recommendation algorithms | Out of scope |
| Analytics dashboards | Out of scope as a core feature. `PB-15 Reporting` provides operational reports |
| Multi-tenancy | Excluded. One organisation, one dataset |

**None of these were rejected on integration grounds.** They are outside the two primary functions,
per [SYSTEM-SCOPE.md](../planning/SYSTEM-SCOPE.md). The distinction matters: an integration excluded
for capability reasons might return; one excluded for scope reasons requires
`PB-ENG-20 Change Management` and Council justification.

---

## 6. Integration Test Scenarios

| ID | Boundary | Scenario | Expected |
|---|---|---|---|
| INT-01 | IB-1 | Transport unavailable during dispatch | In-app created, email `FAILED`, queued |
| INT-02 | IB-1 | Repeated transport failure | `BOUNCED` after bounded retries, `NOTIF-10` |
| INT-03 | IB-1 | Transport fails mid-fan-out | Retry creates only missing recipients, `FAIL-04` |
| INT-04 | IB-1 | Registration attempted while transport is down | Registration succeeds |
| INT-05 | IB-1 | Email body inspected for excess data | No registration context or attendance present |
| INT-06 | IB-2 | Identity source unavailable | Denied, not bypassed |
| INT-07 | IB-3 | No integration exists | No outbound student-data request occurs |
| INT-08 | IB-5 | Queue unavailable during dispatch | Dispatch waits, progress observable |
| INT-09 | IB-5 | Organisation-wide dispatch during peak browsing | Browsing stays usable, `NFR-PERF-006` |
| INT-10 | IB-4 | Hosting platform undecided | No platform-specific assumption in any document |

---

## 7. Integration Status

> **NOT YET IMPLEMENTED.** No integration exists.

| Boundary | State | Blocking |
|---|---|---|
| IB-1 Email transport | Not integrated. **Confirmed dependency** | OQ-32, OQ-50 |
| IB-2 Institutional sign-on | **Existence unconfirmed** | OQ-33 |
| IB-3 Student information system | **Not integrated, by decision** | OQ-33, default is no integration |
| IB-4 Hosting platform | **Not selected** | OQ-30 |
| IB-5 Background job execution | **Not selected** | OQ-51 |
| BR-1 to BR-5 | Not implemented | — |
| INT-01 to INT-10 | Specified, not executable | — |

**No external party has been contacted about any integration.** `OQ-32` and `OQ-33` require
conversations with IT that have not occurred.

---

## 8. Open Questions

| Question | Boundary | Who can answer |
|---|---|---|
| [OQ-30](../planning/OPEN-QUESTIONS.md) Deployment platform | IB-4 | IT, Council Secretary |
| [OQ-31](../planning/OPEN-QUESTIONS.md) Existing server | IB-4 | IT |
| [OQ-32](../planning/OPEN-QUESTIONS.md) Sending permission | IB-1 | IT |
| [OQ-33](../planning/OPEN-QUESTIONS.md) Identity and SIS availability | IB-2, IB-3 | IT, Registrar |
| [OQ-50](../planning/OPEN-QUESTIONS.md) Email transport | IB-1 | IT |
| [OQ-51](../planning/OPEN-QUESTIONS.md) Background job execution | IB-5 | IT, Developer |
| [OQ-56](../planning/OPEN-QUESTIONS.md) Email-state domain | IB-1 state recording | Council Secretary |

**OQ-32 is the one that could change the shape of Primary Function 2.** If the school will not permit
ERNS to send, notification is delivered in-app only, and `FR-NOT-001` already makes that sufficient.
The system does not need email to fulfil its primary function. That is a structural decision, not an
optimistic one.

---

## 9. Completion Criteria

This document is BASELINE when:

- Every external dependency is listed with its purpose, authority, and blocking question
- Exactly one confirmed dependency is identified, and its survivability is traced to requirements
- Unresolved dependencies are marked as unconfirmed rather than assumed
- Boundary rules BR-1 to BR-5 are stated
- Failure behaviour is specified per dependency, with `FAIL-07` correctly refused rather than degraded
- Out-of-scope items appear in the integration surface as explicit exclusions
- No integration is claimed as existing

---

## 10. Exit Criteria

- OQ-30, OQ-32, and OQ-33 answered
- IB-1 transport selected and its rate limits established
- IB-2 and IB-3 resolved, with the provisioning model documented either way
- INT-01 to INT-10 executable
- Section 7 updated as integrations come into existence

---

**Related documents:** [INTEGRATION-BOUNDARIES.md](INTEGRATION-BOUNDARIES.md) ·
[SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) ·
[ENVIRONMENT-ARCHITECTURE.md](ENVIRONMENT-ARCHITECTURE.md) ·
[SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md) ·
[NOTIFICATION-WORKFLOW.md](../planning/NOTIFICATION-WORKFLOW.md) ·
[USER-ROLES.md](../planning/USER-ROLES.md) ·
[SYSTEM-SCOPE.md](../planning/SYSTEM-SCOPE.md) ·
[PB-ENG-11 Security](../playbooks/engineering/PB-ENG-11-SECURITY.md) ·
[OPEN-QUESTIONS.md](../planning/OPEN-QUESTIONS.md)