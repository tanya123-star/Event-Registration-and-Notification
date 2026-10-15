# MVP Spec: KASAMA Event Registration and Notification System

Source: 20 grill-with-docs decisions (2026-10-12), `GLOSSARY.md` (13 terms),
`docs/adr/0001-minimum-necessary-exposure.md`. Planning baseline in `docs/planning/`
(MVP, workflows, roles, open-questions registry) remains the requirements authority;
this spec is the build order for the MVP only.

## Problem Statement

Students miss event announcements posted on Facebook and group chats, club officers
relay details late or incompletely, paper approval stalls between the Council, the
Dean, OSA and Security with nobody able to see where an Event sits, QR and email
registration occasionally fail with only an ad-hoc manual backup, attendance sheets
carry duplicate or incomplete entries, and there is no central record of any of it.

## Solution

One system of record where an Event Officer authors an Event, drives it through a
visible sequential Approval chain, and publishes it; Students register with an
authenticated login and receive a Confirmation reference; Attendance Staff record
single-presence Attendance bound to Registrations with a staff-assisted primary
path; and every lifecycle step emits an in-app Notification with email as the
delivery layer. Club Officers stay outside the system as a reinforcement channel.

## User Stories

### Event authoring and approval

1. As an Event Officer, I want to create an Event draft, so that a proposal enters the system instead of paper.
2. As an Event Officer, I want to submit a complete draft for approval, so that an Approval chain instance starts and the assigned Approver is notified.
3. As an Event Officer, I want submission refused with the missing-field list when required fields are absent, so that I fix the draft before it consumes approver time.
4. As an Approver, I want to open only submissions assigned to my office step, so that I never act on another office's decision.
5. As an Approver, I want to approve, reject with a reason, or request revision with comments, so that my decision is recorded with timestamp and identity.
6. As an Event Officer, I want to see which office currently holds my submission and how long it has waited, so that a stall is visible instead of opaque.
7. As an Event Officer, I want to revise a returned draft and resubmit with prior decisions retained, so that history shows what was objected to.
8. As an Administrator, I want to delegate a pending approval step with the original assignee retained, so that absence does not silently block the chain.
9. As an Event Officer, I want to publish only a fully APPROVED Event, with the chain re-verified at publication and the final Approver barred from publishing, so that approval cannot be a formality.
10. As an Administrator, I want a documented exception publish path with mandatory justification and participant-facing notice, so that a late Event is an audited exception rather than a bypass.

### Registration

11. As a Student, I want to browse only published Events in my target audience, so that I find events I can actually join.
12. As a Student, I want to register with my login and receive a Confirmation reference immediately, so that I hold a provable place.
13. As a Student, I want a duplicate attempt refused with my existing Registration status shown, so that I am informed rather than error-told.
14. As a Student, I want a full Event refused with "event is full", so that the Capacity hard cap is honest.
15. As a Student, I want to cancel my own Registration until registration closes and still see the CANCELLED record with its reason, so that I am never left believing I am registered.
16. As a Student, I want to re-register after cancelling where a slot is free, so that a changed plan does not permanently lock me out.
17. As an Event Officer, I want the participant list with registered count and Capacity for my owned Events, so that I can operate the event.
18. As an Event Officer, I want to manually register a named participant with a mandatory reason, so that a Student without device access is still served.
19. As an Event Officer, I want to cancel a participant's Registration with a mandatory reason with the Student notified at IMPORTANT priority, so that no cancellation is ever silent.
20. As an Administrator, I want every override to require a reason and write an audit entry under my identity, so that privileged acts are attributable.

### Attendance (staff-assisted primary path)

21. As Attendance Staff, I want to look up participants by name, Confirmation reference or student number for my assigned Event, seeing Registration status and whether Attendance is recorded, so that I can serve every arrival.
22. As Attendance Staff, I want to record Attendance only for REGISTERED participants with my identity attached to every record, so that the record is accountable.
23. As Attendance Staff, I want a second record for the same Registration refused with "already recorded", so that duplicates are impossible rather than discouraged.
24. As Attendance Staff, I want to record a Walk-in with a mandatory reason counted separately from registrants, so that reality is captured without corrupting the registered count.
25. As Attendance Staff, I want a live count distinguishing registered, present, absent and Walk-ins, so that I can run the event day.
26. As an Event Officer, I want the attendance summary for my owned Events without any correction power, so that the measured number is not owned by the person it measures.

### Notification

27. As a Student, I want every lifecycle event that concerns me as an in-app Notification I can re-read, so that the system is my channel of record.
28. As a Student, I want my registration confirmation to carry event detail (date, venue, mechanics, requirements, dress code) plus my Confirmation reference, so that I arrive prepared.
29. As a Student, I want to acknowledge IMPORTANT Notifications with user, notification and timestamp recorded, so that critical notices are provably received.
30. As an Event Officer, I want to dispatch a manual reminder to my Event audience at the default lead time, so that missed announcements shrink without waiting on automation.
31. As an Event Officer, I want aggregate read and acknowledgement counts for my owned Events, so that I can see whether a notice worked without seeing anyone's email.
32. As an Administrator, I want email send failures to leave the in-app record untouched, so that a mail problem never invalidates a Registration.

### Administration and reports

33. As an Administrator, I want to provision Student accounts by CSV import with no self-service path, so that identity integrity holds.
34. As an Administrator, I want suspend and revoke to refuse where in-flight obligations exist or to force reassignment in the same operation, so that no pending work is orphaned.
35. As an Administrator, I want operational reports (open registrations, participant list, attendance summary, pending approvals with idle days), so that officers can operate without dashboards.
36. As an Administrator, I want an audited data-fix path for wrong Attendance records in the MVP with corrections prohibited in-app, so that no unaudited edit is possible.

## Implementation Decisions

### Reuse (already in the codebase, do not rebuild)

- **Event lifecycle machine** (DRAFT to ARCHIVED, T-01 to T-20 with SD-1 publisher-is-not-final-approver and SD-3 owner-cannot-approve-own-event): the only permitted state changes; new code calls it, never forks it.
- **Nine-step Registration validation order** (authenticated, account active, event published, registration open, deadline, eligibility, Capacity, duplicate, required fields): locked order; the eligibility step currently passes true for lack of a StudentProfile signal and is the known gap below.
- **Confirmation reference generator** (8-symbol unambiguous alphabet, storage UNIQUE constraint): the single student-facing credential; QR later encodes this same value, never a second secret.
- **Email state machine** (QUEUED, SENT, FAILED, BOUNCED; Delivered, Opened and NOT_REQUESTED prohibited by type): SENT means accepted-by-transport and nothing more.
- **Handler-core seam** (explicit pool plus explicit actor, returns a response, no server or session needed): the primary seam for every MVP feature; routes stay thin (parse, resolve identity, delegate).
- **Use cases and reads** (create event, register participant, cancel registration, capacity, registration-open, participant list, summary, counts): extend, do not duplicate.
- **Postgres stores** (users, events, registrations with the unique user-event pair, audit log with least-privilege grants): new tables follow the same migration and grant discipline.
- **Test corpus** (20 suites including real-storage concurrency and handler-core operation tests): the pattern every new test follows.

### Gaps (the build list, in order)

1. **Session and identity**: resolve the caller to user, account status and roles from storage at request time; login-required registration; suspended-account and revoked-role denial effective immediately.
2. **Approval chain mechanism**: per-event-type templates with ordered conditional steps, sequential evaluation with SKIPPED recorded, decisions with comments and reasons, delegation with original assignee retained, publication gate re-verifying the chain at publish time, idle detection surfacing current office plus waiting days.
3. **Audience and eligibility**: StudentProfile (programme, year level, organisation) plus audience evaluation at dispatch and registration time; officer activity view stays aggregate-only per ADR-0001.
4. **In-app Notification centre**: addressed records with CREATED, READ, ACKNOWLEDGED; acknowledgement mandatory for IMPORTANT; manual officer reminders at the default lead time; recipient uniqueness per dispatch.
5. **Email delivery layer**: queued dispatch with SENT/FAILED/BOUNCED transitions; failure preserves the in-app record; email detail restricted to Administrators per ADR-0001.
6. **Staff-assisted Attendance**: records bound to Registration with storage-level uniqueness, recorder identity mandatory, window attribution, CANCELLED refusal, Walk-in exception path counted separately, live counts.
7. **CSV student import**: Administrator-only, validated rows, per-row result, full audit of the import.
8. **REST surface completion and OpenAPI**: remaining MVP endpoints plus generated OpenAPI documentation for the versioned API.
9. **Mock SMS adapter seam**: port plus mock implementation, wired to nothing in the MVP (deferred item 10).

### Integration points

- **Email provider**: behind a send port; provider selection, sending permission, rate limits and deliverability pending IT sign-off (assumptions A5, A6). Until signed off, dispatch queues and the in-app centre stays authoritative; no delivery state beyond SENT is ever claimed.
- **Mock SMS adapter**: interface plus mock only; no MVP send path calls it. Proves the seam for Phase 2 without moving any traffic.
- **CSV student import**: file-in, validated accounts out; duplicate and malformed rows reported per row, never partially applied silently.
- **REST API with OpenAPI docs**: versioned endpoints for events, registrations, approvals, attendance, notifications and reports; OpenAPI generated from the implemented surface so docs cannot drift from behaviour.

## Testing Decisions

Good tests assert externally visible behaviour (status codes, refusal messages, stored rows, audit entries) through the highest seam available, never implementation internals. New handler-core tests run against real storage following the existing operation-test pattern; pure rules are unit-tested at the domain seam; concurrency claims are proven only by real-storage contention tests.

Acceptance criteria per feature (each becomes Vitest tests):

- **Approval**: submit complete draft creates chain and notifies; missing fields refused with list; out-of-order step approval refused; revision without comments refused; rejection without reason refused; resubmit retains history; delegate retains original; publish with pending step refused; final Approver publishing refused; exception publish without justification refused; Class A edit returns Event to pending with amendment step.
- **Registration**: each of the nine validation steps refuses with its specified message in order; double registration refused with existing status; last-slot contention lets exactly one of two simultaneous attempts succeed; capacity reduction below registered count refused; officer or admin change without reason refused; Attendance Staff or Approver registration refused; email-layer failure leaves Registration standing with FAILED state.
- **Attendance**: record for REGISTERED succeeds with recorder identity; second record for same Registration refused; CANCELLED registration refused; record outside all windows refused; Walk-in without reason refused and counted apart from registrants; officer correction refused; live counts show four distinct numbers.
- **Notification**: dispatch creates one addressed record per audience member with no duplicates; IMPORTANT requires acknowledgement machinery; non-IMPORTANT acknowledgement rejected; officer sees counts only, never addresses; in-app record unaffected by email failure; reminder dispatch reaches the audience snapshot taken at send time.
- **Admin and reports**: CSV import rejects self-service creation path (no such path exists); revocation with in-flight obligations refused or reassigned atomically; participant export writes an audit entry; audit entries are immutable through every interface.

## Out of Scope

Deferred to Phase 2 with reasons (decisions 3, 8, 10, 19):

- **QR attendance (decision 3)**: deferred because QR has failed on event day before; building it first makes staff-assisted the least-tested path at the moment it is most needed. Staff-assisted ships as the complete primary path; QR returns as an accelerator encoding the same Confirmation reference. Reversal condition: Phase 6 review, or staff finding staff-assisted too slow at expected volumes.
- **Check-in/check-out pair (decision 8)**: deferred because one presence record per Registration keeps the storage uniqueness guarantee simple and honest. In/out doubles the state space (missing exits, partial pairs) for value not requested by the interview. Returns only with a specified missing-exit rule.
- **SMS sending (decision 10)**: deferred because no confirmed availability exists and SMS would contradict the locked in-app-plus-email model. Only the mock seam ships, proving the boundary without moving traffic.
- **Structured post-event evaluation (decision 19)**: deferred because operational reports unblock the MVP while evaluation design (owner, window, archive gate) is still open. Officers keep current practice during the MVP; pain point PP-15 stays explicitly unaddressed.
- **Student-number lookup**: deferred because OQ-07 is open and no student-number column exists; staff participant lookup is by name and Confirmation reference only. Returns once OQ-07 is answered and the column lands with its uniqueness decision.

Also out of scope per the locked list: facial recognition, AI planning or attendance verification, payments, social networking or chat, GPS, recommendations, analytics dashboards, native mobile apps, offline-first operation, multi-tenancy, waitlists, student self-provisioning, automatic approval advancement.

## Further Notes

Assumptions pending sign-off (defaults applied; implementation must not silently upgrade them to confirmed):

- **A1 (OQ-01)**: final approval authority rests with the Council; other offices advise. Sign-off: Council Secretary, Dean, OSA.
- **A2 (OQ-02)**: events needing external coordination or off-campus venues need Dean approval; event types not yet enumerated. Sign-off: Dean's office.
- **A3 (OQ-03)**: organisation-wide assemblies and events with minors or external participants need OSA approval. Sign-off: OSA.
- **A4 (OQ-04)**: Security approval above a participant threshold or at non-standard venues; threshold undefined. Sign-off: Security Office, Council Secretary.
- **A5 (OQ-30, OQ-32)**: hosting platform undecided; school email exists but sending permission, limits and deliverability unverified. Sign-off: IT.
- **A6 (OQ-62)**: delegated sender mailbox unowned; no domain-wide delegation authorised; delivery must not be represented as available until answered. Sign-off: Council Secretary, IT.
- **A7 (OQ-07)**: staff participant lookup is by name and Confirmation reference only; student-number lookup is deferred to Phase 2 because no student-number column exists. Sign-off: Council Secretary, IT.

RA 10173 posture: ADR-0001 minimum-necessary exposure governs every report, export and lookup in this spec. Venue connectivity for future QR (AS-06) is assumed adequate pending a walkthrough; offline scanning is not planned.
