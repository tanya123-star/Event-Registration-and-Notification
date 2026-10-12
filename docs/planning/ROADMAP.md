# Roadmap

**Document:** ERNS-RM
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Sequence the implementation of the Event Registration and Notification System so that each phase
produces something usable, and so that the dependency order follows the system rather than
convenience.

---

## Scope

**In scope:** eleven phases with objectives, dependencies, deliverables, acceptance criteria,
risks, and exit criteria.

**Out of scope:** requirement detail, in [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md);
MVP content, in [MVP.md](MVP.md); engineering process rules, in the engineering playbooks.

---

## 1. Sequence Rationale

The suggested sequence in the governance instruction was reviewed and **reordered in two places**.

**Change 1. Security and audit moved earlier.**

The suggested sequence placed Security and Audit at Phase 8, after Reporting. That is wrong for
ERNS. The duplicate-prevention and segregation-of-duty guarantees are enforced by storage
constraints and server-side authorisation. Building registration without the audit trail means
building a system whose records cannot be trusted, then retrofitting accountability.

**Audit and server-side authorisation are therefore established in Phases 1 and 2**, before any
transactional feature exists.

**Change 2. Notification moved before Attendance.**

Attendance depends on registrations existing and on the participant record being complete.
Notification depends only on events existing. Building notification first means the second primary
function is delivered while attendance is still being built, and attendance has a stable
registration base.

**Final order:**

```
Phase 0  Discovery and Requirements        ← blocking questions resolved
Phase 1  Architecture, Data Model, Audit   ← audit established with the schema
Phase 2  Authentication and Roles           ← identity and authorisation
Phase 3  Event Information and Approval    ← authoritative event + gate
Phase 4  Event Registration                ← PRIMARY FUNCTION 1
Phase 5  Notification                      ← PRIMARY FUNCTION 2
Phase 6  Attendance                        ← supporting
Phase 7  Reports and Post-Event Records    ← operating visibility
Phase 8  Security Hardening                ← penetration testing
Phase 9  Testing and Validation            ← full verification
Phase 10 Deployment                        ← release
```

**Phases 0 to 5 are the MVP.** Phases 6 to 10 deliver the SHOULD HAVE items and production
readiness.

---

## 2. Phase Summary

| Phase | Name | Primary function delivered | Blocking questions resolved |
|---|---|---|---|
| 0 | Discovery and Requirements | — | All 8 |
| 1 | Architecture, Data Model, Audit | — | — |
| 2 | Authentication and Roles | — | — |
| 3 | Event Information and Approval | — | — |
| 4 | Event Registration | **1 of 2** | — |
| 5 | Notification | **2 of 2** | — |
| 6 | Attendance | — | — |
| 7 | Reports and Post-Event Records | — | — |
| 8 | Security Hardening | — | — |
| 9 | Testing and Validation | — | — |
| 10 | Deployment | — | — |

---

## Phase 0 — Discovery and Requirements

**Objective.** Resolve every blocking question and ratify the requirements, so that implementation
is not built on assumptions.

**Scope.** Stakeholder consultation on OQ-01 to OQ-32. Requirements review. Validation that the
problem analysis matches organisational reality.

**Dependencies.** None. This phase precedes everything.

**Deliverables.**
- Answers to all eight BLOCKING open questions, recorded in
  [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) with deciding party and date
- Ratified requirement set, with status promoted from PROPOSED where agreed
- At least one approval chain template defined per event type
- Confirmed notification channel
- Confirmed identity and email arrangements

**Acceptance Criteria.**
- No BLOCKING question remains open
- Council Secretary has signed off on [SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) and [MVP.md](MVP.md)
- Every assumption marked ASSUMPTION has been confirmed or accepted as risk
- Requirements baselined

**Testing.** None. This is a decision phase. Validation is documentary: every requirement traces to
a pain point and every pain point has a disposition.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Stakeholders unavailable | Phase cannot start | Escalate through the Council. Do not proceed on assumptions |
| Answers conflict between offices | Approval chain unconfigurable | Council Secretary arbitrates |
| Scope changes mid-phase | Rework | Record as a change request under `PB-ENG-20` |

**Exit Criteria.** All BLOCKING questions answered and recorded. Requirements baselined.

> **This phase is currently in progress. Eight BLOCKING questions are open. Implementation must
> not begin.**

---

## Phase 1 — Architecture, Data Model, Audit

**Objective.** Establish the technical structure, the storage model with its integrity constraints,
and the audit mechanism.

**Scope.** Physical schema from [DATA-MODEL.md](DATA-MODEL.md). Unique constraints. Approval
audit store. Transaction boundaries. Correlation identifiers.

**Dependencies.** Phase 0 ratified requirements.

**Deliverables.**
- Physical schema with the two authoritative unique constraints
- Transaction boundaries covering validation and write together, per `NFR-INTEG-007`
- Append-only audit store with 25 event classes
- Correlation identifier propagation
- Architecture documents updated from conceptual to concrete

**Acceptance Criteria.**
- Unique constraint on `(user_id, event_id)` enforced
- Unique constraint on registration reference for attendance enforced
- Audit store accepts inserts and reads only
- Concurrency scenarios CON-01 to CON-07 designed and passing against real storage

**Testing.** CON-01 to CON-07, DATA-01 to DATA-20.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Constraints added without transactional boundaries | Capacity can be exceeded under concurrency | CON-01 is a release gate |
| Audit store coupled to operational tables | A bug could destroy audit records | Separate store, append-only |

**Exit Criteria.** Integrity constraints enforced and concurrency-verified. Audit mechanism working.

---

## Phase 2 — Authentication and Roles

**Objective.** Implement identity, authentication, and server-side authorisation for the five
roles.

**Scope.** Authentication, sessions, role assignment, permission enforcement, segregation of
duties, account provisioning.

**Dependencies.** Phase 1.

**Deliverables.**
- Login, logout, session expiry
- Account provisioning and suspension by Administrator
- Role assignment with SD-1 to SD-4 enforced
- Server-side authorisation on every operation
- Session invalidation on role change

**Acceptance Criteria.**
- AUTH-01 to AUTH-15 pass
- ROLE-01 to ROLE-18 pass
- Role revocation takes effect immediately, per AUTH-13
- No operation is protected only by interface restriction

**Testing.** AUTH-01 to AUTH-15, ROLE-01 to ROLE-18, SEC-01 to SEC-13 at unit and service level.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Authorisation enforced only in the interface | Complete bypass | `NFR-SEC-004`. Review specifically for this |
| Session not invalidated on role change | Revocation ineffective | AUTH-13 is a gate |

**Exit Criteria.** No unauthenticated or unauthorised access path exists.

---

## Phase 3 — Event Information and Approval

**Objective.** Implement the authoritative event record and the approval gate.

**Scope.** Event authoring with required-field discipline, lifecycle transitions, approval chains,
publication.

**Dependencies.** Phase 2.

**Deliverables.**
- Event CRUD with validation FR-EVT-002 to FR-EVT-009
- Twelve lifecycle statuses with the transition matrix
- Configurable approval chains with sequential steps
- Revision, rejection, delegation
- Publication with chain re-verification
- Idle approval detection

**Acceptance Criteria.**
- EVT-01 to EVT-12 pass
- APR-01 to APR-32 pass
- LIFE-01 to LIFE-27 pass
- Publication refuses an incomplete chain and refuses self-approval
- No automatic approval advancement

**Testing.** EVT, APR, LIFE groups.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Approval chain templates incomplete because OQ-01 to OQ-04 unresolved | Module unusable | Phase 0 gate |
| Officers bypass approval informally | The gate becomes decorative | Make in-system approval faster than email |

**Exit Criteria.** A complete event can be authored, approved, and published with no bypass path.

---

## Phase 4 — Event Registration — PRIMARY FUNCTION 1

**Objective.** Deliver the first primary function.

**Scope.** Discovery, registration, nine-step validation, three-layer duplicate prevention,
confirmation, cancellation, participant lists.

**Dependencies.** Phase 3.

**Deliverables.**
- Student event discovery and detail view
- Registration with the full validation order
- Storage-layer and application-layer duplicate prevention
- Confirmation notification and reference
- Cancellation with retention
- Participant lists, counts, and capacity
- Manual registration and cancellation override, with reasons

**Acceptance Criteria.**
- RV-01 to RV-12 pass
- REG-01 to REG-28 pass
- CON-01 to CON-05 pass
- Registration status limited to `REGISTERED` and `CANCELLED`
- Email failure cannot invalidate a successful registration

**Testing.** REG group, RV group, CON group.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| OQ-07 resolved against login | Duplicate prevention weakens | AS-01 is load-bearing. Escalate if challenged |
| Duplicate prevention implemented only in application logic | Duplicates under concurrency | CON-02 is a gate |
| Capacity check outside the transaction | Overbooking | CON-01 is a gate |

**Exit Criteria.** Registration is correct under concurrency and capacity cannot be exceeded.

---

## Phase 5 — Notification — PRIMARY FUNCTION 2

**Objective.** Deliver the second primary function.

**Scope.** Notification centre, targeting, ten types, email layer, acknowledgement, event-change
notifications.

**Dependencies.** Phase 4.

**Deliverables.**
- Student notification centre with read state
- Targeting by all six audience types with a resolved count
- Ten notification types
- Email as a delivery layer with the four email states
- Acknowledgement for `IMPORTANT` only
- Event-change notifications for the seven triggering fields
- Officer activity view

**Acceptance Criteria.**
- RV-13 to RV-19 pass
- NOTIF-01 to NOTIF-17 pass
- NOT-01 to NOT-30 pass
- No delivered or opened state exists in the schema, per NOTIF-17
- Email failure never removes an in-app record

**Testing.** NOTIF group, NOT group, RV group.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Students do not open notifications | The channel adds nothing | Mobile-first, few consequential notifications |
| Email marked `SENT` presented as proof of receipt | False assurance | Section 2 of the notification workflow forbids this reading |
| Too many notifications | Students ignore the channel | Ten types only. Reserve `IMPORTANT` |

**Exit Criteria.** Both primary functions are delivered. A published event reaches an audience, and
a student can register.

---

## Phase 6 — Attendance

**Objective.** Deliver reliable attendance that does not depend on QR.

**Scope.** Staff-assisted attendance first, then QR. Configurable windows, corrections, summaries.

**Dependencies.** Phase 5. Registrations must exist.

**Deliverables.**
- Staff-assisted attendance with staff identity attribution
- Configurable attendance windows
- Walk-in exception path
- Attendance correction with reason and retention
- Live counts and summaries
- QR attendance, if the phase review approves it
- QR failure declaration

**Acceptance Criteria.**
- RV-20 to RV-25 pass
- ATT-01 to ATT-25 pass
- QR-01 to QR-10 pass if QR is built
- Attendance impossible without a registration
- Duplicate attendance impossible
- Officers cannot correct attendance
- Staff-assisted path works with QR entirely unavailable

**Testing.** ATT group, QR group.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| AS-06 false, venue connectivity inadequate | QR fails at the event | Staff-assisted is primary. Offline becomes a justified Phase 6 follow-up |
| Staff-assisted too slow at expected volume | Queues persist | Phase review decision on QR |
| Correction deferred, per MVP | Wrong records cannot be fixed | Prohibit corrections. Administrator data fix only |

**Phase review decision point.** At the end of this phase, decide whether QR moves forward.

**Exit Criteria.** Attendance works reliably with QR entirely unavailable.

---

## Phase 7 — Reports and Post-Event Records

**Objective.** Deliver operating visibility and the structured learning record.

**Scope.** Operational reports, pending approvals report, event history, evaluation, archival,
evaluation surfacing at event creation.

**Dependencies.** Phases 4 to 6.

**Deliverables.**
- The six operational reports
- Pending approvals and event history reports
- Structured evaluation with the nine fields
- Archival requiring an evaluation
- Previous problems surfaced during event creation

**Acceptance Criteria.**
- RV-32, RV-33 pass
- RPT-01 to RPT-08 pass
- POS-01 to POS-22 pass
- No analytics dashboard or automated analysis exists
- Archival refuses without an evaluation

**Testing.** RPT group, POS group.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Evaluation submitted empty | PP-15 not addressed | Prompt for lessons learned and recommendations specifically |
| Nobody reads surfaced problems | Recurrence continues | Surface at the moment of event creation, where it is actionable |

**Exit Criteria.** Officers can operate the system from reports alone, and past problems are
retrievable.

---

## Phase 8 — Security Hardening

**Objective.** Verify the security posture rather than assume it.

**Scope.** Penetration testing, dependency audit, access review, hardening.

**Dependencies.** Phases 2 to 7.

**Deliverables.**
- Penetration test of registration, notification, and attendance paths
- Dependency vulnerability scan
- Review of every authorisation rule against [SECURITY-PLAN.md](SECURITY-PLAN.md) section 4
- Rate limiting verified
- Backup mechanism implemented, resolving OQ-29

**Acceptance Criteria.**
- No high or critical finding open
- Every scenario in [SECURITY-PLAN.md](SECURITY-PLAN.md) section 9 passes — `SEC-01` through
  `SEC-26`, all twenty-six, verified contiguous with no gaps in that section's catalogue.
- Every scenario in [TESTING-STRATEGY.md](TESTING-STRATEGY.md) section 3.9 passes — `SECS-01` through
  `SECS-13`, all thirteen, verified contiguous with no gaps in that section's catalogue.
- The two catalogues are distinct and are not interchangeable. `SEC-` is defined only in
  SECURITY-PLAN section 9; `SECS-` is defined only in TESTING-STRATEGY section 3.9. They differ by
  one letter and overlap in number: `SEC-04` and `SECS-04` are different scenarios, and neither
  catalogue's numbering may be used for the other. Both sets are required; neither substitutes for
  the other.
- No unauthorised access path found
- Backup exists and **has been restoration-tested**

**Testing.** Both security scenario catalogues — SECURITY-PLAN `SEC-01` to `SEC-26` and
TESTING-STRATEGY `SECS-01` to `SECS-13` — plus penetration testing. Penetration testing is retained
as a separate requirement and is not satisfied by either catalogue.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Backup specified but never restoration-tested | False confidence | `NFR-BACKUP-006`. A backup is not verified until restored |
| Findings deferred as low priority | Accumulated risk | Triage at the phase gate, not at release |

**Exit Criteria.** No open high-severity finding. Backup verified by restoration.

---

## Phase 9 — Testing and Validation

**Objective.** Complete verification and obtain stakeholder acceptance.

**Scope.** Full test suite, accessibility conformance, acceptance testing with stakeholders,
documentation synchronisation.

**Dependencies.** Phases 1 to 8.

**Deliverables.**
- Full suite green
- Accessibility conformance to WCAG 2.1 AA
- Council Secretary acceptance testing
- Officer and staff training materials
- Documentation synchronised with the implementation

**Acceptance Criteria.**
- All release gates in [TESTING-STRATEGY.md](TESTING-STRATEGY.md) section 5.2 pass
- Meta-tests TST-01 to TST-10 pass
- A11Y-01 to A11Y-08 pass
- Council Secretary signs off on acceptance
- No documentation describes behaviour the system does not have

**Testing.** Everything.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Documentation drifts from implementation | Misleading operations | `PB-ENG-19 Documentation`. Synchronisation is a release gate |
| Acceptance deferred for schedule | Unvalidated system released | Hard gate |

**Exit Criteria.** Acceptance signed. Documentation accurate.

---

## Phase 10 — Deployment

**Objective.** Release ERNS and establish operations.

**Scope.** Environment setup, data seeding, migration of any existing records, go-live,
monitoring, operational handover.

**Dependencies.** Phases 8 and 9. Hosting arrangement from OQ-30.

**Deliverables.**
- Production environment per [ENVIRONMENT-ARCHITECTURE.md](../architecture/ENVIRONMENT-ARCHITECTURE.md)
- Seeded user and student data
- Migration of in-progress events, if any
- Monitoring and alerting
- Operational handover per `PB-17` and `PB-ENG-17`
- First-event dry run

**Acceptance Criteria.**
- Post-deployment verification passes
- A complete event runs end to end in production, including attendance
- Officers have confirmed they can operate it
- Students informed that the system is the channel of record
- Monitoring and alerting active

**Testing.** Post-deployment verification. One full event cycle as the acceptance test.

**Risks.**
| Risk | Impact | Mitigation |
|---|---|---|
| Hosting arrangement unresolved | Cannot deploy | OQ-30 is a Phase 0 gate |
| No dry run | First real event is the test | Mandatory dry run |
| Students not informed | Low adoption | Communication plan in [STAKEHOLDERS.md](STAKEHOLDERS.md) section 5 |

**Exit Criteria.** One full event cycle completed successfully in production. Operations handed
over.

---

## 3. Risk Register

| ID | Risk | Impact | Likelihood | Mitigation | Contingency |
|---|---|---|---|---|---|
| RK-01 | Notification not read | The channel adds little value | High | Mobile-first, few consequential notifications, acknowledgement for important ones | Officer reinforcement through clubs, which is a supplementary channel |
| RK-02 | Incorrect event information | Participants act on wrong information | Medium | Required fields, structured changes, change history | Issue a corrective notification |
| RK-03 | Unauthorized publication | An unapproved event gains official endorsement | Low | Publication gate, SD-1, server-side authorisation | Cancel the event and notify |
| RK-04 | Duplicate registration | Record integrity fails | Low | Three-layer prevention, storage constraint | Correct and audit |
| RK-05 | Registration overload at deadline | Timeouts, refused registrations | Medium | Background processing, capacity visibility | Extend the deadline with a reason, which notifies |
| RK-06 | QR failure | Attendance blocked | Medium, and certain if QR exists | Staff-assisted as primary, not fallback | Staff-assisted. No offline commitment |
| RK-07 | Incorrect attendance | Participation record wrong | Medium | Bound to registration, staff attribution, corrections with reason | Correct with reason, retain original |
| RK-08 | Data loss | Records lost | Low | Backups, restoration testing | Restore. Reconciliation from paper where QR failed |
| RK-09 | Unauthorized access to student data | Privacy breach | Low | Role scoping, time-bounded Attendance Staff role, export auditing | Suspend the account, assess exposure from audit |
| RK-10 | Approval delays | Events miss their window | High | Visible current step, idle detection, delegation | Administrator reassignment. Publication exception if OQ-05 permits |
| RK-11 | Notification dispatch failure | Students not informed | Low | Email queued and retried. In-app is source of truth | Officer reinforcement |
| RK-12 | User resistance, especially officers | System not used | High | Demonstrate the officer burden is reduced. Council Secretary as phase gate approver | Training and feedback. Do not proceed without adoption |
| RK-13 | Incomplete requirements | Rework | Medium | Phase 0 gate on BLOCKING questions | Change management under `PB-ENG-20` |
| RK-14 | Email unavailable | Only in-app reaches students | Medium | In-app is the source of truth, not a supplement | Officer reinforcement |
| RK-15 | Hosting unavailable | Cannot deploy | Medium | OQ-30 resolved in Phase 0 | Alternative arrangement, or pause |
| RK-16 | Administrator is a single point of failure | No one can operate the system | Medium | Audit everything privileged, document operations | Second administrator trained before go-live |
| RK-17 | Students register for events they cannot attend | Attendance accuracy | Medium | Eligibility rules, cancellation | Officer-managed adjustment with audit |
| RK-18 | Scope creep during implementation | Timeline and quality | Medium | `PB-ENG-20 Change Management`, the two-primary-functions test | Decline, or defer to post-MVP with justification |

**Note on likelihood.** Ratings are qualitative judgement based on the interview, not measured.
No numerical scoring is used because no scoring method has been agreed. See
[CONVENTIONS.md](CONVENTIONS.md).

**RK-12 deserves particular attention.** Every other risk is technical and mitigable in code.
Resistance to adoption is organisational and cannot be mitigated by implementation quality. It is
the risk most likely to determine whether ERNS succeeds.

---

## 4. Completion Criteria

- Each phase has objective, scope, dependencies, deliverables, acceptance criteria, testing,
  risks, and exit criteria
- The sequence follows system dependencies rather than convenience
- Two deviations from the suggested sequence are justified
- The risk register covers technical and organisational risks

---

## 5. Exit Criteria

- Council Secretary accepts the phase sequence
- Phase 0 completed, meaning all BLOCKING questions answered
- Phase gates enforced, meaning a phase cannot start without the prior exit criteria met

---

**Related documents:** [ROADMAP.md](ROADMAP.md) ·
[MVP.md](MVP.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) ·
[TESTING-STRATEGY.md](TESTING-STRATEGY.md) ·
[TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md)