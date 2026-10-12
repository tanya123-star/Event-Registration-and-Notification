# Non-Functional Requirements

**Document:** ERNS-NFR
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

State the quality attributes the Event Registration and Notification System must satisfy, in
verifiable form, without inventing performance numbers that no evidence supports.

---

## Scope

**In scope:** security, performance, usability, accessibility, responsiveness, availability,
maintainability, scalability, data integrity, auditability, backup, and recovery.

**Out of scope:** functional behaviour, in [FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md);
engineering process, in the engineering playbooks.

---

## 1. Rule on Numbers

**No performance figure in this document is invented.**

Where a number would be arbitrary, the requirement states the property and the method by which
the number will be set, with an open question registering who decides.

Two figures are treated differently:

| Figure | Status | Reason |
|---|---|---|
| Notification fan-out at event publication | Bounded and computable | ERNS serves one student organisation. Concurrency comes from batch dispatch, not user volume |
| Page response time | Open | Depends entirely on the unselected deployment platform, OQ-30 |

> **OPEN QUESTION:** What concurrency and volume does ERNS need to serve? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-30.

---

## 2. Security (SEC)

| ID | Requirement | Status |
|---|---|---|
| NFR-SEC-001 | The system shall authenticate every request that accesses or modifies data, and shall reject unauthenticated access. | PROPOSED |
| NFR-SEC-002 | The system shall authenticate using credentials stored so that they are never recoverable in plaintext. | PROPOSED |
| NFR-SEC-003 | The system shall terminate sessions on explicit logout, and after a period of inactivity. | PROPOSED |
| NFR-SEC-004 | The system shall enforce authorisation on the server for every operation, and shall not rely on interface-level restriction. | PROPOSED |
| NFR-SEC-005 | The system shall deny by default any operation not explicitly permitted by the caller's roles. | PROPOSED |
| NFR-SEC-006 | The system shall validate and sanitise all input at the server boundary. | PROPOSED |
| NFR-SEC-007 | The system shall encode output in a manner that prevents stored cross-site scripting. | PROPOSED |
| NFR-SEC-008 | The system shall use parameterised data access for every query. | PROPOSED |
| NFR-SEC-009 | The system shall validate uploaded file type and size, and shall store uploads outside the executable path. | PROPOSED |
| NFR-SEC-010 | The system shall send response headers that direct browsers not to cache authenticated pages or to embed them in unrelated origins. | PROPOSED |
| NFR-SEC-011 | The system shall apply rate limiting to authentication attempts, notification dispatch, and QR validation. | PROPOSED |
| NFR-SEC-012 | The system shall not disclose internal error detail, stack traces, or infrastructure identifiers to any user. | PROPOSED |
| NFR-SEC-013 | The system shall not log credentials, session tokens, or personal data in application logs. | PROPOSED |
| NFR-SEC-014 | The system shall transmit all traffic over an encrypted channel. | PROPOSED |
| NFR-SEC-015 | The system shall restrict database access to the minimum privilege required by the application component. | PROPOSED |
| NFR-SEC-016 | The system shall permit only the roles defined in [USER-ROLES.md](USER-ROLES.md) and no others. | PROPOSED |
| NFR-SEC-017 | The system shall require a fresh re-authentication for privileged administrative operations. | PROPOSED |
| NFR-SEC-018 | The system shall expose no unauthenticated endpoint that returns participant data. | PROPOSED |

### Specific authorisation matrix

Per [USER-ROLES.md](USER-ROLES.md) and the security plan, the definitive statement of who may
perform what on which resource is in [SECURITY-PLAN.md](SECURITY-PLAN.md) section 4. It MUST be
enforced in application logic.

---

## 3. Performance (PERF)

| ID | Requirement | Status |
|---|---|---|
| NFR-PERF-001 | The system shall complete a registration attempt within a target response time set before implementation, measured at the 95th percentile. | PROPOSED → OQ-30 |
| NFR-PERF-002 | The system shall complete a QR attendance validation within a target time set before implementation, because QR validation occurs in a queue. | PROPOSED → OQ-30 |
| NFR-PERF-003 | The system shall display a notification list of any size without requiring pagination to be used by the user. | PROPOSED |
| NFR-PERF-004 | The system shall handle notification fan-out for a full-organisation publication without blocking the requesting officer's session. | PROPOSED |
| NFR-PERF-005 | The system shall process an organisation-wide notification dispatch as a background task with observable progress. | PROPOSED |
| NFR-PERF-006 | The system shall not degrade event browsing to an unusable state while a dispatch is in progress. | PROPOSED |
| NFR-PERF-007 | The system shall load participant lists without a full re-fetch when a page is revisited within a short interval. | PROPOSED |

**Fan-out scale.** The organisation is a single student body. An organisation-wide notification
addresses a bounded population, so dispatch is a batch of individual recipient records rather
than a high-concurrency problem. The work is volume, not simultaneous load.

---

## 4. Usability (USAB)

| ID | Requirement | Status |
|---|---|---|
| NFR-USAB-001 | The system shall allow a student to complete registration without training and in a single session. | PROPOSED |
| NFR-USAB-002 | The system shall state the reason for every refusal, naming the failed rule in terms the user can act on. | PROPOSED |
| NFR-USAB-003 | The system shall not require a student to re-enter information already held in their profile during registration. | PROPOSED → OQ-08 |
| NFR-USAB-004 | The system shall present an event's registration state without requiring the student to infer it from dates. | PROPOSED |
| NFR-USAB-005 | The system shall show an officer the approval step an event is currently awaiting without navigating to the event. | PROPOSED |
| NFR-USAB-006 | The system shall make the difference between required and optional event fields visible while authoring. | PROPOSED |
| NFR-USAB-007 | The system shall show an event's change history to registrants so that a participant can see what changed and when. | PROPOSED |
| NFR-USAB-008 | The system shall use terminology matching the organisation's existing practice where such usage is confirmed. | PROPOSED |
| NFR-USAB-009 | The system shall make destructive or privileged actions require deliberate confirmation and state their consequence. | PROPOSED |
| NFR-USAB-010 | The system shall preserve an officer's draft event when submission fails, rather than discarding input. | PROPOSED |

---

## 5. Accessibility (A11Y)

| ID | Requirement | Status |
|---|---|---|
| NFR-A11Y-001 | The system shall meet WCAG 2.1 Level AA for all student and officer interfaces. | PROPOSED |
| NFR-A11Y-002 | The system shall be operable entirely by keyboard. | PROPOSED |
| NFR-A11Y-003 | The system shall maintain sufficient colour contrast for text and interface elements. | PROPOSED |
| NFR-A11Y-004 | The system shall not convey information by colour alone, including attendance and registration status. | PROPOSED |
| NFR-A11Y-005 | The system shall provide text alternatives for non-text content. | PROPOSED |
| NFR-A11Y-006 | The system shall remain usable at 200% browser zoom. | PROPOSED |
| NFR-A11Y-007 | The system shall provide a visible focus indicator on every interactive element. | PROPOSED |
| NFR-A11Y-008 | The system shall associate validation errors with the field that caused them. | PROPOSED |
| NFR-A11Y-009 | The system shall work without reliance on hover to reveal information. | PROPOSED |
| NFR-A11Y-010 | The system shall not auto-advance or auto-submit on a timer. | PROPOSED |

**Note on QR.** A scannable QR code is a convenience, not the sole accessible path. Staff-assisted
attendance is the equivalent accessible route, which is a second reason it is a MUST rather than
a fallback.

---

## 6. Responsiveness (RESP)

| ID | Requirement | Status |
|---|---|---|
| NFR-RESP-001 | The system shall present a usable student registration and notification experience on a mobile viewport. | PROPOSED |
| NFR-RESP-002 | The system shall present officer event-authoring and approval interfaces on both mobile and desktop viewports. | PROPOSED |
| NFR-RESP-003 | The system shall not require horizontal scrolling to complete a registration at a 360-pixel viewport width. | PROPOSED |
| NFR-RESP-004 | The system shall remain usable on a low-end Android device, given the interview's reported student device mix. | PROPOSED → OQ-34 |
| NFR-RESP-005 | The system shall present QR attendance scanning on a mobile viewport without additional software. | PROPOSED |
| NFR-RESP-006 | The system shall degrade participant lists to a summary plus paginated detail on narrow viewports. | PROPOSED |

---

## 7. Availability (AVAIL)

| ID | Requirement | Status |
|---|---|---|
| NFR-AVAIL-001 | The system shall be available during published event windows, from registration opening through event completion. | PROPOSED |
| NFR-AVAIL-002 | The system shall define and publish its supportable maintenance windows outside published event windows. | PROPOSED |
| NFR-AVAIL-003 | The system shall not require a maintenance window during an event's attendance window. | PROPOSED |
| NFR-AVAIL-004 | The system shall degrade to a clearly signposted unavailable state rather than an error when a dependency is unreachable. | PROPOSED |
| NFR-AVAIL-005 | The system shall not lose a registration that has been reported as successful. | PROPOSED |
| NFR-AVAIL-006 | The system shall queue notification dispatch that fails due to a transient dependency and retry it, rather than discarding it. | PROPOSED |

**Event-window availability is the governing constraint.** An outage during an attendance window
is the highest-impact failure ERNS can have, which is why attendance has a staff-assisted path
that does not depend on the notification or email subsystems.

> **OPEN QUESTION:** What availability target can the hosting arrangement actually sustain? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-30, OQ-31.

---

## 8. Maintainability (MAINT)

| ID | Requirement | Status |
|---|---|---|
| NFR-MAINT-001 | The system shall separate authorisation logic from interface rendering, so that permission changes do not require interface changes. | PROPOSED |
| NFR-MAINT-002 | The system shall keep business rules for registration validation and lifecycle transitions identifiable as a single unit per rule. | PROPOSED |
| NFR-MAINT-003 | The system shall expose configuration for approval chains, notification targets, and retention without code changes. | PROPOSED |
| NFR-MAINT-004 | The system shall produce application logs sufficient to diagnose a failed notification, registration, or attendance validation. | PROPOSED |
| NFR-MAINT-005 | The system shall record the correlation identifier across a request, its audit entries, and its log entries. | PROPOSED |
| NFR-MAINT-006 | The system shall not require manual database intervention to correct a record that the application allows an operator to change. | PROPOSED |
| NFR-MAINT-007 | The system shall be operable and diagnosable by an administrator without source-code access. | PROPOSED |
| NFR-MAINT-008 | The system shall tolerate a dependency being unavailable without data loss. | PROPOSED |

---

## 9. Scalability (SCAL)

| ID | Requirement | Status |
|---|---|---|
| NFR-SCAL-001 | The system shall support the organisation's full student population in one dataset. | PROPOSED |
| NFR-SCAL-002 | The system shall support concurrent access during an event without per-user serialisation, since the interview reported queues. | PROPOSED |
| NFR-SCAL-003 | The system shall retain and query at least five years of completed event history. | PROPOSED → OQ-26..28 |
| NFR-SCAL-004 | The system shall support growth in the number of events without requiring schema redesign. | PROPOSED |
| NFR-SCAL-005 | The system shall not require vertical scaling of a single service to handle organisation-wide notification dispatch. | PROPOSED |

**Multi-tenancy is explicitly excluded.** ERNS serves one organisation. See
[SYSTEM-SCOPE.md](SYSTEM-SCOPE.md) section 5.

---

## 10. Data Integrity (INTEG)

| ID | Requirement | Status |
|---|---|---|
| NFR-INTEG-001 | The system shall enforce uniqueness of registration on the pair of user and event at the storage layer. | PROPOSED |
| NFR-INTEG-002 | The system shall enforce uniqueness of attendance on the registration reference at the storage layer. | PROPOSED |
| NFR-INTEG-003 | The system shall reject any write that would leave a registration or attendance record without its required parent record. | PROPOSED |
| NFR-INTEG-004 | The system shall apply a transaction boundary to any operation that creates a record and its dependent records together. | PROPOSED |
| NFR-INTEG-005 | The system shall refuse to reduce event capacity below the count of existing registrations. | PROPOSED |
| NFR-INTEG-006 | The system shall prevent approval steps from being decided out of sequence. | PROPOSED |
| NFR-INTEG-007 | The system shall apply all registration validation rules inside the same transaction as the registration write, so that a concurrent request cannot bypass a capacity check. | PROPOSED |
| NFR-INTEG-008 | The system shall retain registration and attendance records as facts that administrative correction does not erase. | PROPOSED |
| NFR-INTEG-009 | The system shall preserve the student's programme, year level, and organisation as captured at registration time. | PROPOSED |
| NFR-INTEG-010 | The system shall reject an invalid state transition for every lifecycle transition. | PROPOSED |
| NFR-INTEG-011 | The system shall not permit a notification recipient record to exist without both a notification and a user. | PROPOSED |
| NFR-INTEG-012 | The system shall preserve the audience definition of a notification as issued, so that dispatch is reproducible. | PROPOSED |

**NFR-INTEG-007 is the concurrency guarantee.** Application-level capacity checks are advisory;
without a transactional boundary two simultaneous registrations for the last remaining slot could
both succeed. The storage-layer uniqueness constraint and the transactional boundary together are
the real control.

---

## 11. Auditability (AUD)

| ID | Requirement | Status |
|---|---|---|
| NFR-AUD-001 | The system shall record an audit entry for every state change to an event, approval, registration, attendance record, notification, and role assignment. | PROPOSED |
| NFR-AUD-002 | The system shall record the actor identity, action, entity type, entity identifier, and timestamp in every audit entry. | PROPOSED |
| NFR-AUD-003 | The system shall record previous and new values for every state change. | PROPOSED |
| NFR-AUD-004 | The system shall record a reason for every privileged override, manual registration, manual cancellation, and attendance correction. | PROPOSED |
| NFR-AUD-005 | The system shall provide no means to modify or delete an audit entry. | PROPOSED |
| NFR-AUD-006 | The system shall retain audit entries for longer than the records they describe. | PROPOSED → OQ-26..28 |
| NFR-AUD-007 | The system shall make the audit trail queryable by actor, action, entity, and time range. | PROPOSED |
| NFR-AUD-008 | The system shall record an audit entry when the audit trail itself is read or exported. | PROPOSED |
| NFR-AUD-009 | The system shall distinguish system-initiated actions from user-initiated actions in the audit trail. | PROPOSED |
| NFR-AUD-010 | The system shall record the request context sufficient to attribute each action to a session and origin. | PROPOSED |

---

## 12. Backup and Recovery (BACKUP)

> **NOT YET IMPLEMENTED.** No backup mechanism exists. The requirements below are target state.
> See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-29.

| ID | Requirement | Status |
|---|---|---|
| NFR-BACKUP-001 | The system shall back up all registration, attendance, approval, notification, and evaluation data. | PROPOSED |
| NFR-BACKUP-002 | The system shall define a backup frequency appropriate to the loss tolerance for each data category, agreed before implementation. | PROPOSED → OQ-29 |
| NFR-BACKUP-003 | The system shall retain backups for a period agreed before implementation. | PROPOSED → OQ-29 |
| NFR-BACKUP-004 | The system shall verify each backup by restoring it, rather than by confirming that a file exists. | PROPOSED |
| NFR-BACKUP-005 | The system shall document a restoration procedure and the roles responsible for it. | PROPOSED |
| NFR-BACKUP-006 | The system shall not treat a backup as verified until a restoration test has succeeded. | PROPOSED |
| NFR-BACKUP-007 | The system shall define and test a recovery point objective and a recovery time objective for participant records. | PROPOSED → OQ-29 |

**PP-14 directly.** The interview reported that backups were made by copying files, with no
evidence of restoration testing. NFR-BACKUP-004 and NFR-BACKUP-006 exist specifically to close
that gap.

---

## 13. Requirement Summary

| Category | Count |
|---|---|
| SEC | 18 |
| PERF | 7 |
| USAB | 10 |
| A11Y | 10 |
| RESP | 6 |
| AVAIL | 6 |
| MAINT | 8 |
| SCAL | 5 |
| INTEG | 12 |
| AUD | 10 |
| BACKUP | 7 |
| **Total** | **99** |

---

## 14. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| NFRD-01 | Unauthenticated request to a participant data endpoint | Rejected, no data returned |
| NFRD-02 | Suspended user attempts any functional action | Rejected |
| NFRD-03 | Registration query containing a crafted payload | Treated as data, no error disclosure |
| NFRD-04 | Output containing a script fragment | Encoded, not executed |
| NFRD-05 | Uploaded file with a disallowed type or oversized | Rejected before storage |
| NFRD-06 | Sustained failed authentication attempts from one source | Rate limited |
| NFRD-07 | Two simultaneous registrations for the last slot | Exactly one succeeds |
| NFRD-08 | Attendance recorded twice for one registration | Second rejected |
| NFRD-09 | Approval of step 2 before step 1 | Rejected |
| NFRD-10 | Organisation-wide dispatch during peak browsing | Dispatch proceeds, browsing stays usable |
| NFRD-11 | Notification dispatch during a dependency outage | Queued and retried, not lost |
| NFRD-12 | Attempt to delete an audit entry | No path exists |
| NFRD-13 | Student programme changed after registration | Original registration snapshot retained |
| NFRD-14 | Interface restriction bypassed by direct request | Server-side authorisation denies |
| NFRD-15 | Registration at 200% zoom on a 360px viewport | Fully operable, no horizontal scroll |
| NFRD-16 | Registration completed by keyboard only | Fully operable |
| NFRD-17 | Registration status conveyed by colour only | Fails, status also conveyed textually |
| NFRD-18 | QR scan during a dependency outage | Documented unavailable state, staff fallback used |
| NFRD-19 | Backup file exists but has never been restored | Treated as unverified per NFR-BACKUP-006 |
| NFRD-20 | Email delivery fails | In-app record unaffected, email state `FAILED` |

---

## 15. Completion Criteria

- All eleven categories covered
- No invented performance figures
- Backup and CI-dependent requirements carry a not-yet-implemented banner
- Every requirement is verifiable

---

## 16. Exit Criteria

- OQ-26 through OQ-31 answered, since they set retention and availability figures
- Target response times agreed with stakeholders and recorded here
- Accessibility target confirmed as WCAG 2.1 AA
- Requirements baselined and thereafter changed only through `PB-ENG-20 Change Management`

---

**Related documents:** [NON-FUNCTIONAL-REQUIREMENTS.md](NON-FUNCTIONAL-REQUIREMENTS.md) ·
[FUNCTIONAL-REQUIREMENTS.md](FUNCTIONAL-REQUIREMENTS.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[TESTING-STRATEGY.md](TESTING-STRATEGY.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)