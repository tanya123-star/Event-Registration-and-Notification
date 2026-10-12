# System Scope

**Document:** ERNS-SCOPE
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Define what the Event Registration and Notification System will do, what it will not do, and
which capabilities belong in the minimum viable product versus which are deferred.

This document is the boundary. A proposed feature that cannot be traced to a requirement inside
this scope is out of scope and must be handled as a change request under
`PB-ENG-20 Change Management`.

---

## Scope

**In scope:** the eight capability areas A through H, their MVP disposition, and the explicit
exclusions.

**Out of scope:** requirements detail, which is in
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md); implementation sequencing, which is in
[ROADMAP.md](ROADMAP.md).

---

## 1. Primary Functions

**CONFIRMED.** ERNS has exactly two primary system functions:

1. **Event Registration**
2. **Notification**

Everything else is supporting functionality. A capability that does not strengthen one of these
two functions requires justification beyond technical feasibility.

### Function A — Event Registration

A student binds themselves to an event. The system validates the binding, prevents duplicate
bindings, records the binding with a snapshot of their context, and confirms it.

### Function B — Notification

The system delivers event information to an addressable audience and records what was delivered,
so that dissemination is verifiable rather than assumed.

### Priority statement

| Function | Why primary | Failure if absent |
|---|---|---|
| Registration | No reliable participation record exists; attendance cannot be bound to a person | PP-12, PP-04, PP-07 return |
| Notification | Information reaches an audience through a recorded channel rather than through an officer relay | PP-01, PP-02, PP-03, PP-11 return |

---

## 2. Capability Areas

### A. Event Information

**In scope.** Authoritative event record with required-field discipline, structured fields for
mechanics, programme flow, requirements, materials, and dress code, and a change history.

Addresses RC-6. Supports both primary functions: registration needs event detail to validate
against, and notification needs an authoritative source to send.

**MVP:** Yes.

### B. Event Registration

**In scope.** Student registration and cancellation, validation against deadline, capacity,
eligibility, and duplicates, confirmation with a reference number, participant lists, and
registration status.

Primary function. Addresses RC-4.

**MVP:** Yes. This is the core deliverable.

### C. Notification

**In scope.** In-app notification centre as source of truth, email as a delivery layer,
targeting by programme, year level, organisation, club, and registered-only, notification types
for the event lifecycle, read and acknowledgement state, and event-change notifications.

Primary function. Addresses RC-1, RC-2.

**MVP:** Yes. This is the core deliverable.

### D. Registration Monitoring

**In scope.** Registered counts, remaining capacity, participant lists, registration status,
registration timestamps, and export.

Supports the Registration function by giving organisers visibility into it.

**MVP:** Yes, for lists and counts. Export is a SHOULD.

### E. Approval Support

**In scope.** Configurable per-event-type approval chains, sequential approval steps, comments,
revision requests, rejection, resubmission, delegation, and approval history.

Addresses RC-3. **Supporting function.** Approval exists to make publication trustworthy, not as
a product in its own right.

**MVP:** Yes, because publication must be gated on approval to be credible.

### F. Attendance Support

**In scope.** QR attendance bound to registration, staff-assisted fallback, configurable
attendance windows, correction with reason, and attendance summaries.

Addresses RC-4, RC-5, RC-7. **Supporting function.** Attendance supports registration integrity;
it is not itself a primary function.

**MVP:** Yes, staff-assisted first. QR is a SHOULD for MVP and a MUST for post-MVP, because the
interview reported QR reliability problems and the fallback must work before QR is trusted.

**Note on ordering.** This reverses the interview's current practice deliberately. Building the
staff-assisted path first means QR is an accelerator rather than a single point of failure.

### G. Event Records

**In scope.** Post-event closure, structured evaluation capturing problems by category,
recommendations, lessons learned, and archival as read-only retention.

Addresses RC-8. **Supporting function.**

**MVP:** Evaluation structure is a SHOULD. Archival is a MUST but is simple.

### H. Basic Reporting

**In scope.** Upcoming events, open registrations, registration summary, participant list,
attendance summary, notification activity, pending approvals, and problems-and-recommendations
extract.

**MVP:** Operational reports only. Pending approvals and event history are a SHOULD.

---

## 3. MVP Disposition

### MUST HAVE

| Capability | Justification |
|---|---|
| User authentication | Nothing is possible without it; also the basis of duplicate prevention |
| Role management | Every other capability is permission-dependent |
| Event information with required fields | Prerequisite for both primary functions |
| Approval workflow | Publication must be gated to be credible |
| Event publishing | Delivers the authoritative channel |
| Student registration and cancellation | Primary function 1 |
| Registration validation, including duplicate prevention | Primary function 1; without validation the record is worthless |
| Registration management, including participant lists | Operates the primary function |
| In-app notification centre | Primary function 2 and the source of truth |
| Email delivery as a layer | The only channel with confirmed institutional reach |
| Notification targeting | A notification sent to everyone is a broadcast, not targeted dissemination |
| Event reminders | Addresses PP-11 directly |
| Event-change notifications | Addresses PP-10 and PP-11 |
| Staff-assisted attendance | Attendance floor; QR is unreliable per PP-06 |
| Audit logging | The trust basis for all of the above |
| Basic operational reports | Officers cannot operate without participant lists and counts |

### SHOULD HAVE

| Capability | Deferral risk |
|---|---|
| QR attendance | Deferrable because staff-assisted covers the function |
| Participant list export | Manual extraction possible |
| Structured event evaluation | Post-event, cannot block the primary functions |
| Pending approvals report | Queryable manually at first |
| Acknowledgement for IMPORTANT notifications | Read state is already recorded |
| Configurable attendance windows | Can default to a single window initially |
| Event history timeline for participants | Desirable but not blocking |

### COULD HAVE

| Capability | Value | Why not now |
|---|---|---|
| Automated reminder scheduling with per-event lead time | Reduces manual reminder work | Default 24-hour rule suffices initially |
| Attendance window configuration per event | Serves working students | A single wide window approximates it |
| Delegation workflow for unavailable approvers | Prevents approval stalls | Administrator can reassign manually |
| Notification digest instead of individual messages | Reduces inbox volume | Volume is likely low initially |
| Event-type templates | Speeds event creation | Creation frequency is unquantified |

### OUT OF SCOPE

See section 5.

---

## 4. Explicit Non-Goals

ERNS will not:

1. Replace Facebook pages, group chats, or meetings. They remain, but are not the channel of
   record.
2. Guarantee that students read notifications. It can record receipt, not comprehension.
3. Reduce the turnaround time of approving offices. It can show where an event is stuck.
4. Replace manual attendance paperwork entirely. It digitises and binds it.
5. Provide an event calendar view beyond listing and filtering events. A calendar UI is not the
   problem.
6. Provide analytics, dashboards, or trends. Structured records only.
7. Manage budgets, procurement, or vendor relationships.
8. Manage club internal affairs, membership, or elections.
9. Manage academic class schedules or coursework.
10. Provide a public, unauthenticated view of events.

---

## 5. Out of Scope

**CONFIRMED.** The following are excluded from ERNS. Each was considered and rejected.

| Feature | Rejection rationale |
|---|---|
| Facial recognition attendance | Biometric data for a student event register is disproportionate. Creates legal, privacy, and consent obligations that ERNS cannot carry |
| AI event planning | The organisation's difficulty is dissemination and records, not idea generation |
| AI attendance verification | The problem is unreliable QR, not an inability to verify identity once a QR is working |
| Payment processing | No confirmed requirement for collecting fees |
| Social networking | ERNS distributes information; it is not a social platform |
| Public chat | Not requested; adds moderation obligation |
| Recommendation algorithms | No basis; would create a privacy surface with no requirement behind it |
| GPS tracking | No requirement, and disproportionate sensitivity |
| Analytics dashboards as a core feature | Explicitly rejected in favour of reliable structured records |
| Full social-media replacement | Outside the organisation's authority and needs |
| Facial or device-based identity verification | Attendance is bound to registration, which is sufficient |
| Native mobile applications | Mobile-responsive web meets the stated need |
| Real-time chat or presence | Not requested |
| Automatic post-event analysis | Would require AI or heuristic analysis; rejected |
| Third-party marketplace or ticketing | Not requested |
| Multi-tenancy across unrelated organisations | Single organisation only |
| Offline-first architecture | Not justified without confirmed connectivity failure, AS-06 |

---

## 6. Module Dependencies

| Module | Depends on | Reason |
|---|---|---|
| C. Notification | A. Event Information | Needs an authoritative event to notify about |
| C. Notification | User Management | Needs an addressable audience |
| B. Event Registration | A. Event Information | Validates against event fields |
| B. Event Registration | User Management | Needs authenticated identity |
| D. Registration Monitoring | B. Event Registration | Summarises what registration created |
| E. Approval Support | A. Event Information | Approves event content |
| E. Approval Support | User Management | Needs identified approvers |
| A. Event Publishing | C. Notification | Publication is the trigger for the authoritative channel |
| A. Event Publishing | E. Approval Support | Only approved events may publish |
| F. Attendance Support | B. Event Registration | Binds attendance to a registration |
| F. Attendance Support | D. Registration Monitoring | Confirms who is expected |
| G. Event Records | A, B, F | Captures the event, participants, and attendance |
| H. Reporting | All of the above | Summarises |
| Audit Trail | All of the above | Records all of the above |

**Critical path:** A → B → C. Event information must be authoritative before registration is
meaningful, and both must precede notification.

---

## 7. Scope Change Control

Any request to add a capability requires:

1. A change request naming the requirement IDs affected
2. Statement of which pain point or organisational need it serves
3. Statement of which primary function it strengthens
4. Impact on scope, security, data model, and testing
5. Approval per `PB-ENG-20 Change Management`

**Rule.** A feature that strengthens neither primary function requires explicit Council
justification before it enters scope.

---

## 8. Completion Criteria

- Two primary functions named and all others marked supporting
- Each capability area marked MVP disposition
- MUST, SHOULD, COULD, and OUT OF SCOPE separated
- Every out-of-scope item has a rejection rationale
- Dependencies stated

---

## 9. Exit Criteria

- Council Secretary confirms the capability areas match organisational priorities
- OQ-01 through OQ-04 answered, since approval configuration depends on them
- No MVP item is challenged without a recorded decision

---

**Related documents:** [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) ·
[PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md) ·
[MVP.md](MVP.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[ROADMAP.md](ROADMAP.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)