# MVP Definition

**Document:** ERNS-MVP
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Define the smallest version of the Event Registration and Notification System that delivers real
value against the interview's problems, and record what is deliberately excluded from it.

An MVP that attempts everything delivers nothing on time. The exclusions below are decisions, not
oversights.

---

## Scope

**In scope:** MUST, SHOULD, COULD, and OUT OF SCOPE items, with the justification for each
boundary.

**Out of scope:** sequencing, which is in [ROADMAP.md](ROADMAP.md); requirement detail, in
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md).

---

## 1. The MVP Test

An item belongs in the MVP only if removing it would prevent the system from delivering one of the
two primary functions, or would make a record untrustworthy.

Applying that test removed several items that appear in [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) but are
not required to register students or notify them.

---

## 2. MUST HAVE

### 2.1 Foundations

| Capability | Requirements | Why it cannot be deferred |
|---|---|---|
| User authentication | FR-USR-001 | Nothing is possible without identity. Also the basis of duplicate prevention |
| User provisioning | FR-USR-004, FR-USR-005 | Accounts must exist. Self-service is prohibited, so provisioning is a real feature |
| Role management | FR-USR-002, FR-USR-006 | Every other capability is permission-dependent |
| Role revocation effect | FR-USR-009 | A suspended user acting defeats the entire permission model |
| Segregation of duties | SD-1 to SD-4 | Without them, approval and attendance are formality |
| Audit logging | FR-AUD-001 to FR-AUD-010 | ERNS's value is trustworthy records. An unaudited system is a file store with forms |

### 2.2 Event Information

| Capability | Requirements | Why |
|---|---|---|
| Event authoring | FR-EVT-001 | Events must exist |
| Required-field discipline | FR-EVT-002 to FR-EVT-005 | Addresses PP-09 and PP-10. Mechanics cannot be omitted from a published event |
| Field validation | FR-EVT-006 to FR-EVT-009 | Invalid events must not reach participants |
| Audience-based visibility | FR-EVT-013, FR-EVT-014 | Targeting depends on it, and PP-01 depends on it |
| Approval chain mechanism | FR-APR-001 to FR-APR-004 | Publication must be gated |
| Approval decisions | FR-APR-005 to FR-APR-008 | The gate must be operable |
| Publication gate | FR-APR-011, FR-APR-012 | The gate must be real |
| Publication | T-10 | The channel of record must open |

**Note.** Approval is MUST despite being a supporting function, because publishing without a gate
would make every published event an unverified claim. OQ-01 through OQ-04 must still be answered
before approval can be used; the mechanism can be built without them.

### 2.3 Event Registration — Primary Function 1

| Capability | Requirements | Why |
|---|---|---|
| Event discovery | FR-REG-001 to FR-REG-003 | A student must find events |
| Registration | FR-REG-004 | The primary function itself |
| Validation, all nine steps | FR-REG-005 | An unvalidated registration record is worthless |
| Duplicate prevention, all three layers | FR-REG-014, FR-REG-016 | Directly addresses PP-12 |
| Capacity enforcement | FR-REG-013 | Hard cap, per locked decision |
| Registration record | FR-REG-017 | The fact itself |
| Status limited to two values | FR-REG-019 | Locked decision |
| Confirmation notification | FR-REG-021 | A student who does not know they registered may not attend |
| Confirmation reference | FR-REG-020 | Lets staff identify a participant verbally |
| Cancellation by student | FR-REG-024, FR-REG-025 | A student must be able to withdraw |
| Cancellation retains the record | FR-REG-026 | Deleting loses the record of intent |
| Participant list | FR-REG-031 | Officers cannot operate without it |
| Registered count and capacity | FR-REG-030 | Officers cannot operate without it |
| Administrative override with reason | FR-REG-028, FR-REG-039 | Real cases exist; they must be attributable |

### 2.4 Notification — Primary Function 2

| Capability | Requirements | Why |
|---|---|---|
| In-app notification centre | FR-NOT-001, FR-NOT-002 | The source of truth |
| Email as delivery layer | FR-NOT-003 | The only channel with confirmed reach |
| No delivered or opened state | FR-NOT-004 | A locked decision, and an honesty requirement |
| Email failure preserves in-app | FR-NOT-005 | The registration must not be invalidated by a mail problem |
| Targeting, all six types | FR-NOT-017 to FR-NOT-022 | Addresses PP-01 and PP-04. An untargeted notification is a broadcast |
| Recipient uniqueness | FR-NOT-014 | A student must not receive the same message twice |
| Notification types | FR-NOT-026 to FR-NOT-035 | Ten types covering the lifecycle |
| Notification centre, student view | FR-NOT-036 to FR-NOT-042 | The channel must be usable |
| Officer activity view | FR-NOT-045 | Officers must see whether it worked |
| Email detail restriction | FR-NOT-047 | Prevents unnecessary personal-data exposure |

### 2.5 Supporting Capability

| Capability | Requirements | Why |
|---|---|---|
| Staff-assisted attendance | FR-ATT-010 to FR-ATT-012 | Attendance without it is unreliable. PP-06, PP-07, PP-08 |
| Attendance bound to registration | FR-ATT-001 to FR-ATT-004 | The rule that makes attendance trustworthy |
| Attendance uniqueness | FR-ATT-002 | Prevents duplicate attendance, PP-12 |
| Live count | FR-ATT-013 | Staff need it during the event |
| Operational reports | FR-RPT-001 to FR-RPT-006 | Officers cannot operate the system without them |

**QR attendance is not in the MVP.** See section 4.

---

## 3. SHOULD HAVE

Deferrable, with the risk of deferral stated.

| Capability | Requirements | Risk of deferral |
|---|---|---|
| QR attendance | FR-ATT-008, FR-ATT-009 | Larger events stay slower. Staff-assisted covers the function |
| Participant list export | FR-REG-038 | Manual extraction possible |
| Structured event evaluation | FR-POS-002, FR-POS-003 | PP-15 not yet addressed. Acceptable initially |
| Pending approvals report | FR-RPT-007 | PP-05 not fully addressed |
| Acknowledgement | FR-NOT-006 to FR-NOT-009 | Read state still recorded |
| Configurable attendance windows | FR-ATT-006 | A single wide window approximates it. PP-13 partially addressed |
| Event history timeline | NFR-USAB-007 | Participants can still see current state |
| Attendance correction | FR-ATT-014, FR-ATT-015 | **Risk: an incorrect record cannot be corrected.** Mitigate by prohibiting corrections in the MVP rather than allowing unaudited ones |
| Approval delegation | FR-APR-009 | Administrator reassigns manually |
| Conditional approval steps | FR-APR-003 | A fixed chain is workable initially |
| QR failure declaration | FR-ATT-019 | Staff simply use staff-assisted |

**Attendance correction is the one SHOULD with a real operational cost.** Without it, a wrong
attendance record stays wrong. The recommendation is to prohibit corrections in the MVP and require
an Administrator data fix, rather than shipping uncorrected-but-editable records.

---

## 4. Why QR Is Not in the MVP

This inverts the interview's current practice, so the reasoning is recorded.

**Current practice.** Large events use QR, small events use manual sign-in. The interview reported
that QR occasionally fails and that a backup is prepared ad hoc.

**The trap.** Building QR first makes it the primary path and staff-assisted the contingency. Then
when QR fails, as it has before, the contingency is the least-tested path at the moment it is most
needed.

**The recommendation.** Build staff-assisted first and completely. It is a MUST, not a fallback.
Once attendance works reliably, QR becomes an accelerator on a working process.

**Consequence.** The MVP is slower at large events than the current QR practice. That is a
deliberate, temporary trade in exchange for a process that works when QR fails.

**Reversal condition.** If staff find staff-assisted too slow at expected volumes, QR moves
forward. This is decided at Phase 6 review, per [ROADMAP.md](ROADMAP.md).

---

## 5. COULD HAVE

| Capability | Requirements | Value | Why not now |
|---|---|---|---|
| Automated reminder scheduling | FR-NOT-030 | Reduces manual work | A manual reminder at the default lead time works initially |
| Attendance window configuration | FR-ATT-005 | Serves working students | A single wide window approximates it |
| Notification digest | — | Reduces inbox volume | Volume is likely low initially |
| Event-type templates | — | Speeds authoring | Creation frequency unquantified |
| Participant list pagination | NFR-RESP-006 | Performance at scale | Volume-dependent |
| Event search | FR-POS-009 | Convenience | Few events initially |

---

## 6. OUT OF SCOPE

Confirmed exclusions, repeated from [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) section 5 so the MVP
boundary is unambiguous.

| Excluded | Reason |
|---|---|
| Facial recognition attendance | Disproportionate biometric handling |
| AI event planning | The problem is dissemination, not idea generation |
| AI attendance verification | QR reliability, not identity verification, is the problem |
| Payment processing | No confirmed requirement |
| Social networking, public chat | Not a social platform |
| GPS tracking | Disproportionate, no requirement |
| Recommendation algorithms | No basis, unrequested |
| Analytics dashboards | Rejected in favour of structured records |
| Social-media replacement | Outside organisational authority |
| Native mobile applications | Responsive web meets the need |
| Offline-first architecture | Not justified without evidence, AS-06 |
| Multi-tenancy | Single organisation |
| Real-time chat or presence | Not requested |
| Automated post-event analysis | Requires AI or heuristics, rejected |
| Ticketing or marketplace | Not requested |
| Automatic approval advancement | Would defeat the gate |
| Waitlist | Locked out |
| Student-created accounts | Identity integrity |

---

## 7. What the MVP Deliberately Does Not Solve

Stated plainly, so the Council is not surprised.

| Interview problem | MVP status |
|---|---|
| PP-01 Difficulty disseminating information | **Solved** |
| PP-03 Dependence on club officers | **Solved** |
| PP-07 Manual attendance | **Solved** |
| PP-10 Information dissemination errors | **Solved** |
| PP-12 Duplicate or inaccurate attendance | **Solved** |
| PP-13 Working student attendance | **Partial.** Windows are not configurable yet |
| PP-02 Information not read | **Partial.** Read state is recorded, comprehension is not |
| PP-04 Multiple channels | **Partial.** The system is the record of reference; informal channels persist |
| PP-05 Manual approval | **Partial.** Visibility improves; office turnaround does not |
| PP-06 QR problems | **Avoided**, not solved. QR is deferred, staff-assisted is primary |
| PP-08 Long queues | **Partial.** Smaller events improve; large events unchanged without QR |
| PP-09 Incomplete understanding of mechanics | **Partial.** Information is required and present; reading is behavioural |
| PP-11 Missed announcements | **Partial.** Delivery is recorded; attention is not compelled |
| PP-14 Backup and maintenance | **Partial.** Retention assumed, backup not implemented |
| PP-15 Learning from previous events | **Not addressed.** Evaluation is deferred |

**Nine of fifteen pain points are only partially addressed by the MVP, and two are not addressed at
all.** This is stated in [TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) and repeated here so the
MVP is not oversold.

---

## 8. MVP Definition of Done

The MVP is complete when:

- All MUST HAVE requirements are implemented and tested
- The concurrency scenarios CON-01 to CON-07 pass against real storage
- The authorisation scenarios AUTH-01 to AUTH-15 pass
- The meta-tests TST-01 to TST-10 pass
- All BLOCKING open questions are resolved
- Council Secretary has completed acceptance testing
- Officers and attendance staff have been trained on `PB-01` to `PB-11`
- Students have been informed that the system is the channel of record

---

## 9. Risks Accepted by the MVP

| Accepted risk | Rationale | Mitigation |
|---|---|---|
| Large events remain slow | QR deferred | Staff-assisted, extra staffing |
| No attendance correction | Feature deferred | Prohibit corrections; Administrator data fix |
| No evaluation records | PP-15 unaddressed | Officers keep current practice during the MVP |
| No configurable windows | PP-13 partial | Configure a wide default window per event manually |
| No email delivery | OQ-13 unresolved | In-app remains the source of truth |

---

## 10. Completion Criteria

- Every item is classified MUST, SHOULD, COULD, or OUT OF SCOPE
- Every deferral states its risk
- The unsolvable pain points are stated plainly
- The QR inversion is justified

---

## 11. Exit Criteria

- Council Secretary accepts the MVP scope, including what it does not solve
- OQ-01 through OQ-04 and OQ-07 and OQ-13 resolved
- Phase 6 review decides whether QR moves forward

---

**Related documents:** [MVP.md](MVP.md) ·
[SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[ROADMAP.md](ROADMAP.md) ·
[TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) ·
[TESTING-STRATEGY.md](TESTING-STRATEGY.md)