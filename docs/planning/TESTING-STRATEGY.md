# Testing Strategy

**Document:** ERNS-TEST
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Developer
**Supersedes:** None

---

## Purpose

Define how the Event Registration and Notification System is verified: what is tested at each
level, which scenarios exist, which requirement each scenario validates, and what must pass
before a change is merged or released.

Tests must validate requirements. A rising coverage number is not evidence that the system does
what the Council needs.

---

## Scope

**In scope:** test levels, scenario catalogue, requirement-to-test mapping, and release gates.

**Out of scope:** the engineering process rules, in `PB-ENG-08 Testing` and `PB-ENG-09 CI`.

---

## 1. Locked Decisions and Principles

**CONFIRMED.** Tests validate requirements, not coverage figures.

**CONFIRMED.** No AI-based or automated analysis. Verification is deterministic and repeatable.

**PROPOSED.** Every functional requirement has at least one test scenario that would fail if the
requirement were unimplemented.

### Why this matters for ERNS specifically

ERNS's value is trustworthy records. A test suite that checks "the endpoint returns 200" would
pass while duplicate registrations were possible and attendance was unverified. The scenarios
below are chosen to fail on exactly those defects.

---

## 2. Test Levels

| Level | Scope | Runs on | Gate |
|---|---|---|---|
| Unit | A single rule or function in isolation | Every commit | Blocks merge |
| Integration | Multiple components against a real database | Every push | Blocks merge |
| Service / API | Request and response contract, authorisation | Every push | Blocks merge |
| End-to-end | Complete user journeys through the interface | Pre-release | Blocks release |
| Security | Authorisation, injection, session handling | Pre-release and on change | Blocks release |
| Regression | Prior defect scenarios | Every release | Blocks release |
| Acceptance | Business scenario with stakeholders | Pre-release | Blocks release |

**PROPOSED.** The integration level is the most important for ERNS, because the guarantees that
matter are enforced by database constraints rather than application logic. Application-level unit
tests cannot prove that duplicate registration is prevented under concurrency; only an integration
test against a real storage layer can.

---

## 3. Scenario Catalogue

### 3.1 Requirement Validation

| ID | Requirement | Scenario | Expected |
|---|---|---|---|
| RV-01 | FR-REG-014 | Duplicate registration refused | Second attempt rejected, existing status shown |
| RV-02 | FR-REG-016 | Storage-layer uniqueness | Direct insert of a duplicate pair rejected |
| RV-03 | FR-REG-005 | Validation order | Each step's failure reported before later steps run |
| RV-04 | FR-REG-004 | Eligible student may register | Registration created |
| RV-05 | FR-REG-017 | Registration fields recorded | All fields present, including the context snapshot |
| RV-06 | FR-REG-019 | Status limited to two values | No third value can be written |
| RV-07 | FR-REG-026 | Cancellation retains the record | Row present with `CANCELLED` |
| RV-08 | FR-REG-033 | Reopen requires a reason | Rejected without one |
| RV-09 | FR-REG-034 | No reopen after event start | Rejected |
| RV-10 | FR-REG-036 | Attendance Staff cannot register | Rejected |
| RV-11 | FR-REG-037 | Capacity cannot fall below registrations | Rejected |
| RV-12 | FR-REG-040 | Students see only their own registrations | Another student's record not returned |
| RV-13 | FR-NOT-002 | In-app states limited | No other value writable |
| RV-14 | FR-NOT-004 | No delivered or opened state | No such field exists in the schema |
| RV-15 | FR-NOT-006 | Acknowledgement only for `IMPORTANT` | Acknowledgement refused otherwise |
| RV-16 | FR-NOT-005 | Email failure preserves in-app | In-app record unchanged, email state `FAILED` |
| RV-17 | FR-NOT-013 | Audience frozen at dispatch | Roster change does not alter the record |
| RV-18 | FR-NOT-014 | One recipient per student per notification | Duplicate insert rejected |
| RV-19 | FR-NOT-024 | Empty audience refused | Dispatch rejected |
| RV-20 | FR-ATT-001 | Attendance requires a registration | Refused without one |
| RV-21 | FR-ATT-002 | Storage-layer attendance uniqueness | Duplicate insert rejected |
| RV-22 | FR-ATT-003 | No attendance for cancelled registration | Rejected |
| RV-23 | FR-ATT-004 | No orphan attendance | Refused without a registration reference |
| RV-24 | FR-ATT-016 | Officers cannot correct attendance | Rejected |
| RV-25 | FR-ATT-018 | Attendance creates no registration | No registration side effect |
| RV-26 | FR-APR-011 | Publication requires a complete chain | Rejected when incomplete |
| RV-27 | FR-APR-012 | Final approver cannot publish | Rejected |
| RV-28 | FR-APR-004 | Sequential approval | Out-of-order decision rejected |
| RV-29 | FR-APR-016 | No automatic advancement | Chain unchanged after timeout |
| RV-30 | FR-EVT-005 | Required fields at submission | Rejected when missing |
| RV-31 | FR-EVT-006 | End time after start time | Rejected |
| RV-32 | FR-POS-001 | Attendance finalised before completion | Rejected |
| RV-33 | FR-POS-007 | Archive requires an evaluation | Rejected |
| RV-34 | FR-AUD-005 | No audit modification path | No such endpoint or method |
| RV-35 | FR-USR-011 | Segregation of duty enforced | Role grant refused |
| RV-36 | FR-NOT-047 | Email detail restricted | Officer access refused |

---

### 3.2 Concurrency and Integrity

These are the scenarios most likely to be missing and most consequential.

| ID | Scenario | Expected |
|---|---|---|
| CON-01 | Two simultaneous registrations for the last slot | Exactly one succeeds |
| CON-02 | Two simultaneous registrations by the same student | Exactly one succeeds |
| CON-03 | Two simultaneous attendance records for one registration | Exactly one succeeds |
| CON-04 | Capacity reduced while a registration is in flight | Registered count never exceeds capacity |
| CON-05 | Registration cancelled and re-registered simultaneously | Consistent final state |
| CON-06 | Notification dispatched twice concurrently | One recipient set, no duplicates |
| CON-07 | Approval step decided twice concurrently | One decision recorded |

**CON-01 and CON-03 are the tests that justify `NFR-INTEG-007`.** Application-level checks alone
fail these.

---

### 3.3 Authorisation

| ID | Scenario | Expected |
|---|---|---|
| AUTH-01 | Student accesses another student's registration | Denied |
| AUTH-02 | Student accesses an unpublished event | Denied |
| AUTH-03 | Approver edits an event under review | Denied |
| AUTH-04 | Approver publishes | Denied |
| AUTH-05 | Attendance Staff creates a registration | Denied |
| AUTH-06 | Officer reads an unowned event's participants | Denied |
| AUTH-07 | Officer exports an unowned participant list | Denied |
| AUTH-08 | Officer views email addresses | Denied |
| AUTH-09 | Officer corrects attendance | Denied |
| AUTH-10 | Student reads the audit trail | Denied |
| AUTH-11 | Unauthenticated request to any protected resource | Denied |
| AUTH-12 | Suspended account attempts any action | Denied, session invalidated |
| AUTH-13 | Revoked role with an active session | Denied immediately |
| AUTH-14 | Officer accesses a system-wide announcement view they should not see | Denied |
| AUTH-15 | Attendance Staff accesses an event they are not assigned | Denied |

**AUTH-13 is the check that role revocation actually takes effect**, per the session policy in
[SECURITY-PLAN.md](SECURITY-PLAN.md) section 6.

---

### 3.4 Negative and Boundary

| ID | Scenario | Expected |
|---|---|---|
| NEG-01 | Registration exactly at capacity minus one | Succeeds |
| NEG-02 | Registration at exactly the deadline boundary | Policy-consistent outcome |
| NEG-03 | Registration exactly at the opening boundary | Policy-consistent outcome |
| NEG-04 | Capacity of one, two registrations attempted | Second refused |
| NEG-05 | Event with end time equal to start time | Rejected |
| NEG-06 | Zero-length attendance window | Rejected |
| NEG-07 | Notification to a single recipient | Works |
| NEG-08 | Notification to the entire student body | Works, as a background task |
| NEG-09 | Empty event description at submission | Rejected |
| NEG-10 | Extremely long field values | Accepted or rejected per limit, no crash |
| NEG-11 | Special characters in names and fields | Stored and displayed correctly |
| NEG-12 | Non-ASCII and emoji in event content | Handled correctly |
| NEG-13 | Registration at the exact event start time | Refused, window closed |

**NEG-02 and NEG-03 require a stated boundary policy.** Whether the deadline is inclusive or
exclusive is a decision that must be documented and tested, not left to implementation.

---

### 3.5 Failure Handling

| ID | Scenario | Expected |
|---|---|---|
| FAIL-01 | Storage unavailable during registration | Refused, no partial write |
| FAIL-02 | Email transport unavailable | In-app created, email queued |
| FAIL-03 | QR validation service unavailable | Clear unavailable state, staff fallback |
| FAIL-04 | Dispatch interrupted mid-fan-out | Retry creates only missing recipients |
| FAIL-05 | Audit write fails during a state change | State change refused, no silent loss |
| FAIL-06 | Notification centre unavailable | Registration still succeeds |
| FAIL-07 | Session store unavailable | Denied, not bypassed |
| FAIL-08 | File storage unavailable on attachment | Rejected, event unaffected |

**FAIL-05 is the important one.** If a state change succeeds and its audit entry fails, the
system has produced an unaudited change, which defeats the audit trail. The state change must be
refused.

---

### 3.6 QR and Attendance

| ID | Scenario | Expected |
|---|---|---|
| QR-01 | Valid QR scanned | Attendance recorded |
| QR-02 | Same QR scanned twice | Second refused |
| QR-03 | QR from another event | Refused |
| QR-04 | Expired QR | Refused |
| QR-05 | Malformed QR | Refused, no detail disclosed |
| QR-06 | QR with a tampered token | Refused |
| QR-07 | Automated rapid scanning | Rate limited |
| QR-08 | QR does not disclose identity before scanning | Confirmed |
| QR-09 | Staff-assisted used when QR is unavailable | Works |
| QR-10 | Walk-in recorded | Separate count, reason recorded |

---

### 3.7 Notification

| ID | Scenario | Expected |
|---|---|---|
| NOTIF-01 | Programme targeting | Correct recipients |
| NOTIF-02 | Registered-only targeting | Correct recipients |
| NOTIF-03 | Combined criteria | Conjunctive result |
| NOTIF-04 | Student matching two criteria | One recipient record |
| NOTIF-05 | Empty resolved audience | Refused |
| NOTIF-06 | `IMPORTANT` notification | Acknowledgement required |
| NOTIF-07 | Acknowledgement before read | Refused |
| NOTIF-08 | Acknowledgement after read | Accepted |
| NOTIF-09 | Email failure | In-app unaffected |
| NOTIF-10 | Repeated email failure | `BOUNCED` after bounded retries |
| NOTIF-11 | Student opens their centre | Read state recorded |
| NOTIF-12 | Student reads another's notification | Denied |
| NOTIF-13 | Venue change on published event | Event-update notification sent |
| NOTIF-14 | Title-only change | No notification |
| NOTIF-15 | Description change | Registrants only |
| NOTIF-16 | Audience frozen at dispatch | Later roster change does not alter the record |
| NOTIF-17 | No field exists for delivered or opened | Confirmed by schema inspection |

**NOTIF-17 is verified by inspecting the schema, not by running a request.** The requirement is
that the state does not exist, so the test is that the field is absent.

---

### 3.8 Accessibility and Responsive

| ID | Scenario | Expected |
|---|---|---|
| A11Y-01 | Complete a registration by keyboard only | Fully operable |
| A11Y-02 | 200% zoom, 360px viewport | Operable, no horizontal scroll |
| A11Y-03 | Registration status not conveyed by colour alone | Textual status present |
| A11Y-04 | Validation error associated with its field | Correct association |
| A11Y-05 | Focus indicator visible on all interactive elements | Confirmed |
| A11Y-06 | No hover-only information | Confirmed |
| A11Y-07 | Automated accessibility scan | No violations at AA |
| A11Y-08 | Manual screen reader pass on registration and centre | No blocking barriers |

---

### 3.9 Security

| ID | Scenario | Expected |
|---|---|---|
| SECS-01 | SQL injection attempt in registration fields | Treated as data |
| SECS-02 | Script injection in event content | Encoded, not executed |
| SECS-03 | Cross-site request attempt | Rejected |
| SECS-04 | Session fixation attempt | Session replaced on login |
| SECS-05 | Unauthorised direct object reference | Denied |
| SECS-06 | Oversized upload | Rejected |
| SECS-07 | Disallowed file type upload | Rejected |
| SECS-08 | Path traversal in a filename | Rejected |
| SECS-09 | Error message disclosure | No internal detail |
| SECS-10 | Credential in logs | Absent |
| SECS-11 | Rate limit on authentication | Enforced |
| SECS-12 | Privilege escalation attempt | Denied |
| SECS-13 | Suspended account with active session | Denied |

---

## 4. Requirement-to-Test Mapping

### 4.1 Modules with direct scenario coverage

| Module | Requirement count | Test IDs |
|---|---|---|
| USR | 14 | RV-35, AUTH-01 to AUTH-15, ROLE-01 to ROLE-18 |
| EVT | 16 | RV-30, RV-31, EVT-01 to EVT-12 |
| APR | 17 | RV-26 to RV-29, APR-01 to APR-32 |
| REG | 40 | RV-01 to RV-12, REG-01 to REG-28, CON-01 to CON-05 |
| NOT | 48 | RV-13 to RV-19, NOTIF-01 to NOTIF-17, NOT-01 to NOT-30 |
| ATT | 20 | RV-20 to RV-25, QR-01 to QR-10, ATT-01 to ATT-25 |
| POS | 11 | RV-32, RV-33, POS-01 to POS-22 |
| RPT | 11 | RPT-01 to RPT-08 |
| AUD | 10 | RV-34, AUDT-01 to AUDT-25 |

### 4.2 Requirements without a dedicated scenario

**Recorded as a gap, not hidden.**

| Requirement group | Gap | Plan |
|---|---|---|
| FR-NOT-036 to FR-NOT-044 | Notification centre read and filter behaviour | NOTIF-11, NOTIF-12 partially cover; filter behaviour needs scenarios at implementation |
| FR-EVT-010 to FR-EVT-016 | Attachment management and event visibility | EVT group partially covers; upload scenarios at implementation |
| FR-RPT-001 to FR-RPT-011 | Report accuracy and scoping | RPT group at implementation |
| FR-USR-012 to FR-USR-014 | Role time-bounding and orphan prevention | ROLE group at implementation |

**PROPOSED.** These are covered when the corresponding module is implemented. The requirement is
explicitly labelled unverified until then, per [CONVENTIONS.md](CONVENTIONS.md) section 8.

---

## 5. Release Gates

### 5.1 Before merge

| Gate | Requirement |
|---|---|
| Unit tests pass | All |
| Integration tests pass | `PB-ENG-08 Testing` |
| Authorisation tests for changed resources pass | `NFR-SEC-004` |
| No new lint or type errors | `PB-ENG-09 CI` |
| No secret committed | `PB-ENG-12` |

### 5.2 Before release

| Gate | Requirement |
|---|---|
| All tests pass | — |
| Security tests pass | SECS-01 to SECS-13 |
| Accessibility scan clean | A11Y-07 |
| Concurrency tests pass | CON-01 to CON-07 |
| All blocking open questions resolved | `PB-ENG-16 Release Management` |
| Documentation synchronised | `PB-ENG-19 Documentation` |

---

## 6. Test Data

**PROPOSED.**

| Category | Rule |
|---|---|
| Personal data | Synthetic only in test environments |
| Production data in tests | **Prohibited** |
| Volume | Enough to exercise boundary conditions: one below capacity, exactly at capacity, one above |
| Concurrency | At least two parallel clients for CON scenarios |
| Dates | Fixed and deterministic, so time-driven transitions are testable |
| Cleanup | Test data is reseeded, not manually edited |

**NFR-SEC-013** requires personal data not to be logged, which extends to test output.

---

## 7. Failure Handling in Testing

**A failed test blocks.** Governance principle 14.

**PROPOSED.** When a test fails:

1. The merge is blocked
2. The failure is triaged as either a real defect or a wrong test
3. A real defect is fixed or the requirement is formally changed first
4. A wrong test is corrected in a separate, visible change
5. A test is not deleted to make a build pass without a recorded reason
6. A failing test is never marked as expected without a recorded reason

**The reason for rule 6.** A skipped or expected-failure test is the easiest way to silently lose
a requirement. Each one requires a written justification that survives review.

---

## 8. Test Scenarios for the Strategy

| ID | Scenario | Expected |
|---|---|---|
| TST-01 | A duplicate registration defect exists | CON-02 or RV-02 fails |
| TST-02 | The storage constraint is removed | CON-02 fails |
| TST-03 | Validation order is reordered | RV-03 fails |
| TST-04 | A new delivered state is added to the schema | NOTIF-17 fails |
| TST-05 | Officer is granted attendance correction | AUTH-09 fails |
| TST-06 | Role revocation does not invalidate sessions | AUTH-13 fails |
| TST-07 | Audit write fails and the state change proceeds | FAIL-05 fails |
| TST-08 | Audience is re-evaluated on read | NOTIF-16 fails |
| TST-09 | Capacity check moves outside the transaction | CON-01 fails |
| TST-10 | Approval chain auto-advances on timeout | RV-29 fails |

**TST-01 through TST-10 are meta-tests.** They verify that the test suite would actually catch each
of the defects that matter most. A suite that cannot fail on these is not providing assurance.

---

## 9. Completion Criteria

- Every functional requirement has at least one scenario, or is labelled unverified
- Concurrency and integrity scenarios exist for every uniqueness constraint
- Every authorisation rule in [SECURITY-PLAN.md](SECURITY-PLAN.md) section 4 has a scenario
- Failure handling is tested, not assumed
- Uncovered requirement groups are explicitly listed

---

## 10. Exit Criteria

- Section 4.2 gaps closed at implementation, or accepted with rationale
- Meta-tests TST-01 to TST-10 pass
- Council Secretary participates in acceptance testing
- Test automation integrated into CI per `PB-ENG-09 CI`

---

**Related documents:** [TESTING-STRATEGY.md](TESTING-STRATEGY.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[TRACEABILITY-MATRIX.md](TRACEABILITY-MATRIX.md) ·
[CONVENTIONS.md](CONVENTIONS.md)
