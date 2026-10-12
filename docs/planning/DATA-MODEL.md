# Data Model

**Document:** ERNS-DATA
**Area:** planning
**Status:** Baseline
**Last updated:** 2026-10-01
**Owner:** Administrator
**Supersedes:** None

---

## Purpose

Define the conceptual data model of the Event Registration and Notification System: the
entities it holds, what each entity is for, how entities relate, and which structural
constraints make invalid states unrepresentable.

This is a conceptual model. It specifies meaning, cardinality, and integrity intent. It is not a
schema, and it contains no SQL.

---

## Scope

**In scope:** the fifteen locked entities, their attributes, relationships, cardinalities, data
ownership, and the integrity constraints that prevent duplicate registrations, duplicate
attendance, and orphan records.

**Out of scope:** physical storage types, indexes, partitioning, and migration procedure.
Schema change procedure is specified in `PB-ENG-14 Database Changes`. No SQL or migration
artifact is produced by this document.

---

## 1. Locked Decision

**CONFIRMED.** The conceptual model consists of exactly these fifteen entities:

1. User
2. Role
3. Organization/Club
4. StudentProfile
5. Event
6. ApprovalChain
7. ApprovalStep
8. Announcement
9. Notification
10. NotificationRecipient
11. Registration
12. Attendance
13. EventAttachment
14. EventEvaluation
15. AuditLog

**CONFIRMED.** Entities MUST NOT be silently merged or split. A change to this list is a change
request under `PB-ENG-20 Change Management`.

---

## 2. Entity Catalogue

### 2.1 User

**Purpose:** An authenticated identity that can act in the system.

| Attribute | Notes |
|---|---|
| user_id | System-assigned identifier |
| email | Institutional email. Unique. Used for login and email delivery |
| display_name | Name shown in interface and notifications |
| account_status | `ACTIVE` or `SUSPENDED` |
| roles | Reference to Role, many-to-many |
| last_login_at | Operational signal, not authoritative |
| created_at, updated_at | Timestamps |

**Relationships:** has many Role (M:N) · has zero or one StudentProfile · owns many Event ·
performs many ApprovalStep · has many Registration · has many Attendance · receives many
NotificationRecipient.

**Ownership:** Administrator provisions and suspends accounts. No self-service registration.

**Integrity:** email is unique and immutable after first save. A suspended account retains all
historical records; suspension never deletes.

> **OPEN QUESTION:** Is the student number a separate attribute of User, and is it unique? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-07.

---

### 2.2 Role

**Purpose:** A named permission bundle assignable to users.

| Attribute | Notes |
|---|---|
| role_id | Identifier |
| role_code | `ADMINISTRATOR`, `EVENT_OFFICER`, `APPROVER`, `STUDENT`, `ATTENDANCE_STAFF` |
| role_name | Human-readable label |
| permission_set | Capabilities granted |
| is_active | Whether the role may be newly assigned |

**Relationships:** assigned to many User (M:N).

**Ownership:** Administrator.

**Integrity:** the five role codes are fixed and locked. Adding a role is a change request.
Permission sets are defined in [USER-ROLES.md](USER-ROLES.md) and enforced in application logic,
not only in the interface.

---

### 2.3 Organization/Club

**Purpose:** A student organization or club that owns events and provides an audience
segment.

| Attribute | Notes |
|---|---|
| org_id | Identifier |
| name | Organisation or club name |
| org_type | `ORGANIZATION` or `CLUB` |
| adviser_name | Optional. Used in reporting |
| is_active | Whether it may own events |

**Relationships:** has many StudentProfile · has many Event · is an audience segment for
Notification targeting.

**Ownership:** Administrator maintains the list; Event Officer assigns an owner.

**Integrity:** an Event references at most one owning org. An inactive organisation may not own
new events but retains historical ones.

**PROPOSED.** Club Officer is modelled as a descriptive attribute on this entity rather than as a
user, because club officers hold no ERNS login.

---

### 2.4 StudentProfile

**Purpose:** The student-specific attributes needed for eligibility evaluation and notification
targeting.

| Attribute | Notes |
|---|---|
| student_profile_id | Identifier |
| user_id | Reference to User, one-to-one |
| student_number | Institutional identifier |
| program | Degree programme, drives targeting |
| year_level | Drives targeting and eligibility |
| org_id | Primary organisation or club membership |
| is_eligible | Eligibility flag maintained by authorised personnel |

**Relationships:** belongs to exactly one User · belongs to zero or one Organization/Club ·
drives Event audience evaluation.

**Ownership:** Administrator or Event Officer maintain eligibility.

**Integrity:** one StudentProfile per User. A user holding the Student role MUST have a
StudentProfile; otherwise targeting and eligibility cannot be evaluated. Conversely a
StudentProfile MUST NOT exist without the Student role.

**CONFIRMED.** Identity data is seeded from the council rather than integrated with a student
information system. This is why eligibility is a maintained flag rather than a derived value.

---

### 2.5 Event

**Purpose:** The authoritative record of an event, its schedule, its information, and its place
in the lifecycle.

| Attribute | Notes |
|---|---|
| event_id | Identifier |
| title | Required |
| description | Required |
| event_type | Required. Drives which approval chain and which fields are mandatory |
| event_date | Required |
| start_time, end_time | Required |
| venue | Required |
| organizer_org_id | Reference to Organization/Club |
| created_by | Reference to User |
| target_audience | Audience definition, see [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) |
| registration_required | Boolean |
| registration_start | Required if registration required |
| registration_deadline | Required if registration required |
| capacity | Required if registration required. Hard cap |
| event_mechanics | Long-form. Notification-triggering |
| program_flow | Long-form. Notification-triggering |
| requirements | Notification-triggering |
| materials_needed | Notification-triggering |
| dress_code | Notification-triggering |
| contact_person | Contact name and contact detail |
| attendance_window_open, attendance_window_close | Attendance timing |
| status | See [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) |
| registration_open | Boolean flag. See [EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 2.2 |
| published_at | When publication occurred |
| completed_at | When the event concluded |
| cancelled_reason | Required when cancelled |

**Relationships:** belongs to one Organization/Club · created by one User · has many
ApprovalChain · has many Announcement · has many Notification · has many Registration · has
many Attendance · has many EventAttachment · has zero or one EventEvaluation.

**Ownership:** Event Officer who created it, with Administrator override.

**Integrity:**
- `end_time` MUST be later than `start_time`
- `registration_deadline` MUST be earlier than `event_date`
- `registration_start` MUST be earlier than `registration_deadline`
- `capacity` MUST be a positive integer when registration is required
- `capacity` MUST NOT be reduced below the count of existing registrations without
  simultaneous participant removal

**CONFIRMED.** Field edit permissions after publication follow the classes defined in
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) section 6.

---

### 2.6 ApprovalChain

**Purpose:** One instance of an approval requirement for a specific event, capturing the
sequence of steps and their outcome.

| Attribute | Notes |
|---|---|
| chain_id | Identifier |
| event_id | Reference to Event |
| chain_type | Which configured chain this instance follows |
| current_step | Which step is active |
| overall_outcome | `PENDING`, `APPROVED`, `REJECTED`, `RETURNED_FOR_REVISION` |
| is_amendment | Whether this chain covers a post-approval change |
| started_at, completed_at | Timestamps |

**Relationships:** belongs to one Event · has many ApprovalStep · is an instance of the
configured chain template.

**Ownership:** created on submission. Completed by approvers.

**Integrity:** one active chain per event at a time. An event with multiple chains has exactly
one non-amendment chain; further chains are amendments.

**PROPOSED.** The chain template itself is configuration, not an entity in this locked list.
Only the per-event instance is modelled, because the template is system configuration owned by
the Administrator and documented in `PB-ENG-02 Tech Stack` environment configuration.

---

### 2.7 ApprovalStep

**Purpose:** One office's decision within an approval chain.

| Attribute | Notes |
|---|---|
| step_id | Identifier |
| chain_id | Reference to ApprovalChain |
| sequence_number | Order within the chain |
| office | Which office this step represents |
| assigned_to | Reference to User |
| status | `PENDING`, `APPROVED`, `REJECTED`, `REVISION_REQUESTED`, `SKIPPED`, `DELEGATED` |
| decided_by | Reference to User |
| decided_at | Decision timestamp |
| comments | Required on rejection and revision |
| delegated_from | Where authority was delegated |

**Relationships:** belongs to one ApprovalChain · decided by one User.

**Ownership:** the assigned approver.

**Integrity:** sequence numbers are unique within a chain. A step cannot be decided before its
predecessor is approved. A decision cannot be edited once recorded; a changed decision is a new
audit event against the same step.

**CONFIRMED.** Approval requirements are configurable per event type rather than fixed, because
the interview reported coordination with several offices without stating which apply when.

---

### 2.8 Announcement

**Purpose:** A communication authored independently of a specific event.

| Attribute | Notes |
|---|---|
| announcement_id | Identifier |
| title | Required |
| body | Required |
| related_event_id | Optional reference to Event |
| priority | `NORMAL`, `HIGH`, `IMPORTANT` |
| requires_acknowledgement | Derived from priority. See [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) |
| published_by | Reference to User |
| published_at | Timestamp |

**Relationships:** optionally related to one Event · generated many Notification · delivered to
many NotificationRecipient.

**Ownership:** Event Officer and Administrator.

**Integrity:** only `IMPORTANT` announcements require acknowledgement. An announcement with a
related event MUST NOT duplicate information already carried by an event-change notification.

---

### 2.9 Notification

**Purpose:** The authored message, independent of who receives it.

| Attribute | Notes |
|---|---|
| notification_id | Identifier |
| announcement_id | Optional reference to Announcement |
| related_event_id | Optional reference to Event |
| notification_type | See [NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) |
| title | Required |
| body | Required |
| priority | `NORMAL`, `HIGH`, `IMPORTANT` |
| requires_acknowledgement | True only when priority is `IMPORTANT` |
| audience_definition | The targeting rule evaluated at dispatch |
| email_requested | Whether an email attempt is made in addition to in-app |
| created_by | Reference to User |
| created_at | Timestamp |
| dispatched_at | When the in-app record was created for recipients |

**Relationships:** optionally originates from one Announcement · optionally related to one
Event · has many NotificationRecipient.

**Ownership:** Event Officer or Administrator.

**Integrity:** the audience definition is stored on the notification as issued. It is NOT
re-evaluated later, because a notification must be reproducible for audit even if the student
population changes afterwards.

---

### 2.10 NotificationRecipient

**Purpose:** The per-student delivery state of a notification. This is the record the in-app
notification centre reads.

| Attribute | Notes |
|---|---|
| recipient_id | Identifier |
| notification_id | Reference to Notification |
| user_id | Reference to User |
| in_app_state | `CREATED`, `READ`, `ACKNOWLEDGED` |
| email_state | `QUEUED`, `SENT`, `FAILED`, `BOUNCED`, `NOT_REQUESTED` |
| email_attempted_at | Timestamp |
| email_error | Failure detail, sanitised |
| read_at | Timestamp |
| acknowledged_at | Timestamp |
| acknowledgement_note | Optional student comment |

**Relationships:** belongs to one Notification · belongs to one User.

**Ownership:** System writes; student may advance in-app state.

**Integrity:**
- Unique on `(notification_id, user_id)` — one recipient record per student per notification
- `acknowledged_at` requires `requires_acknowledgement` to be true
- `acknowledged_at` requires `read_at` to be set
- in-app states may only advance `CREATED` to `READ` to `ACKNOWLEDGED`

**CONFIRMED.** In-app states are `CREATED`, `READ`, `ACKNOWLEDGED` only.

**CONFIRMED.** Email states are `QUEUED`, `SENT`, `FAILED`, `BOUNCED` only. `Delivered` and
`Opened` are not modelled because they cannot be measured reliably. Rationale in
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md).

**CONFIRMED.** The in-app notification centre is the source of truth. Email is a delivery attempt
layered on top, and an email failure never removes an in-app record.

---

### 2.11 Registration

**Purpose:** The record binding one student to one event for the purpose of attendance and
participation tracking. This is ERNS's primary function alongside Notification.

| Attribute | Notes |
|---|---|
| registration_id | Identifier |
| user_id | Reference to User |
| event_id | Reference to Event |
| status | `REGISTERED` or `CANCELLED` |
| registered_at | Timestamp |
| cancelled_at | Timestamp when cancelled |
| cancellation_reason | Required when cancelled |
| cancelled_by | Reference to User |
| registration_source | `SELF`, `OFFICER`, `ADMINISTRATOR` |
| confirmation_reference | Human-readable reference issued to the student |
| student_context | Program, year level, and org captured at registration time |

**Relationships:** belongs to one User · belongs to one Event · may have zero or one Attendance ·
may generate Notification.

**Ownership:** Student creates their own. Officer and Administrator may override with audit.

**Integrity:**
- **Unique on `(user_id, event_id)`.** This is the authoritative duplicate-registration
  safeguard, per the locked decision in [REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md)
- `cancelled_at` and `cancellation_reason` are required when status is `CANCELLED`
- A record with status `CANCELLED` retains all other fields; cancellation never deletes
- `student_context` is a snapshot, so a later programme change does not rewrite history

**CONFIRMED.** Status is `REGISTERED` or `CANCELLED` only. `WAITLISTED`, `ATTENDED`, and
`ABSENT` MUST NOT be used as registration statuses. Attendance is a separate fact held in
Attendance.

**PROPOSED.** Cancellation by the student releases the slot for re-registration. This is
consistent with capacity being a hard cap on concurrently `REGISTERED` participants. If the
organisation prefers a cancelled registration to permanently consume a slot, the uniqueness
constraint must move to `(user_id, event_id)` partial on active records and this model changes.

> **OPEN QUESTION:** Does a cancelled registration permanently consume a slot, or may the student
> re-register? See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-10.

---

### 2.12 Attendance

**Purpose:** The record that a registered participant was present. Attendance is a fact about a
person at an event, not a registration status.

| Attribute | Notes |
|---|---|
| attendance_id | Identifier |
| registration_id | Reference to Registration |
| user_id | Reference to User, denormalised for query convenience |
| event_id | Reference to Event, denormalised for query convenience |
| present | Boolean presence indicator |
| recorded_at | Timestamp |
| recorded_by | Reference to User. Null when self-recorded via QR |
| method | `QR`, `STAFF_ASSISTED`, `CORRECTION` |
| attendance_window | Which configured window the record belongs to |
| correction_reason | Required when the record is corrected |
| corrected_at, corrected_by | Correction audit |

**Relationships:** belongs to one Registration · belongs to one User · belongs to one Event.

**Ownership:** Attendance Staff records; Administrator corrects.

**Integrity:**
- **Unique on `registration_id`.** One attendance record per registration. This is the
  authoritative duplicate-attendance safeguard
- `registration_id` MUST reference a registration whose status is `REGISTERED` at the time of
  recording
- `recorded_by` MUST be null when `method` is `QR`, and non-null otherwise
- `correction_reason` is required whenever `corrected_at` is set
- A record may not be created for a `CANCELLED` registration

**CONFIRMED.** Only registered participants may have attendance recorded, subject to documented
exceptions in [ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md).

**PROPOSED.** Attendance is retained after registration cancellation. If a participant cancels
after attending, cancelling does not delete the attendance fact.

---

### 2.13 EventAttachment

**Purpose:** Supporting documents for an event, such as the approved proposal, programme
handouts, or material lists.

| Attribute | Notes |
|---|---|
| attachment_id | Identifier |
| event_id | Reference to Event |
| file_name | Original name |
| file_type | Content type |
| file_size | Size in bytes |
| stored_reference | Location in storage |
| uploaded_by | Reference to User |
| uploaded_at | Timestamp |
| is_proposal_document | Whether this is the submitted proposal |

**Relationships:** belongs to one Event.

**Ownership:** Event Officer who owns the event.

**Integrity:** only the owner Officer or an Administrator may attach or remove. Removal during
`UNDER_REVIEW` is blocked. Files are validated on type and size before storage.

---

### 2.14 EventEvaluation

**Purpose:** Structured post-event information capturing what went well, what problems occurred,
and what should change. This is how ERNS addresses the recurring-problems finding in
[PROBLEM-ANALYSIS.md](PROBLEM-ANALYSIS.md).

| Attribute | Notes |
|---|---|
| evaluation_id | Identifier |
| event_id | Reference to Event, one-to-one |
| overall_rating | Scale value |
| communication_problems | Text |
| registration_problems | Text |
| attendance_problems | Text |
| technical_problems | Text |
| scheduling_problems | Text |
| recommendations | Text |
| lessons_learned | Text |
| problems_encountered | Text |
| submitted_by | Reference to User |
| submitted_at | Timestamp |
| reviewed_by | Reference to User |
| reviewed_at | Timestamp |

**Relationships:** belongs to exactly one Event.

**Ownership:** Event Officer completes; Administrator or Council reviews.

**Integrity:** one evaluation per event. Archiving requires a submitted evaluation.
Recommendations are stored as structured text fields, not analysed automatically.

**CONFIRMED.** No AI analytics, pattern extraction, or automated insight generation. Structured
reliable records only.

---

### 2.15 AuditLog

**Purpose:** The tamper-evident record of who did what, when, and to which record.

| Attribute | Notes |
|---|---|
| audit_id | Identifier |
| actor_user_id | Reference to User. Null for system-initiated events |
| actor_role | Role at time of action |
| action | Action code, see `AUD-NN` in [AUDIT-PLAN.md](AUDIT-PLAN.md) |
| entity_type | Entity affected |
| entity_id | Identifier of the affected record |
| occurred_at | Timestamp |
| previous_state | Prior value or state, where applicable |
| new_state | New value or state |
| reason | Free-text justification for privileged actions |
| request_context | Origin metadata sufficient to attribute the request |

**Relationships:** references any entity by type and identifier, so no fixed foreign key.

**Ownership:** System writes. Only Administrator reads and exports.

**Integrity:**
- Append-only. No update or delete path exists
- A record with a `reason` requirement MUST have a non-empty reason
- Deletion of an audited entity is itself an audited action

**CONFIRMED.** Audit records are retained and never cascade-deleted with their subject entity.

---

## 3. Relationship Summary

| Relationship | Cardinality | Required | Notes |
|---|---|---|---|
| User → Role | M:N | Yes, one at minimum | Fixed role code set |
| User → StudentProfile | 1:0..1 | Yes iff Student role | Invariant both directions |
| StudentProfile → Organization/Club | N:1 | Optional | Primary membership |
| Organization/Club → Event | 1:N | Optional | One owning org per event |
| Event → ApprovalChain | 1:N | One active non-amendment chain | Amendments additional |
| ApprovalChain → ApprovalStep | 1:N | Yes, ordered by sequence | Sequential decision |
| User → ApprovalStep | 1:N | Optional | Assigned or decided |
| Announcement → Notification | 1:N | Optional origin | Announcement may exist undelivered |
| Notification → NotificationRecipient | 1:N | Yes at dispatch | One per student |
| User → NotificationRecipient | 1:N | Yes | In-app source of truth |
| Event → Notification | 1:N | Optional | Event-scoped notices |
| User → Registration | 1:N | Yes | |
| Event → Registration | 1:N | Yes | |
| Registration → Attendance | 1:0..1 | Optional | Unique per registration |
| User → Attendance | 1:N | Yes | Denormalised |
| Event → Attendance | 1:N | Yes | Denormalised |
| Event → EventAttachment | 1:N | Optional | |
| Event → EventEvaluation | 1:0..1 | Required before archive | One per event |
| Any entity → AuditLog | 1:N | Yes for audited actions | By type and identifier |

---

## 4. Integrity Constraints Summary

These constraints exist specifically to make the failure modes in the interview
unrepresentable rather than merely discouraged.

| Failure mode prevented | Mechanism |
|---|---|
| Duplicate registration | Unique `(user_id, event_id)` on Registration |
| Duplicate attendance | Unique `registration_id` on Attendance |
| Attendance for a cancelled registration | Status check enforced on the Registration reference |
| Registration of an unregistered person at attendance time | Attendance requires a Registration reference |
| Orphan registration | Foreign key to User and Event, both required |
| Orphan attendance | Foreign key to Registration, required |
| Orphan notification recipient | Foreign key to Notification and User, both required |
| Out-of-order approval | Sequence predecessor check on ApprovalStep |
| Self-approval | Publisher identity check at publish time |
| Silent attendance correction | Mandatory correction reason |
| Silent administrative override | Mandatory reason on `AUD-07` and `AUD-10` |
| Rewritten history | Snapshot fields on Registration; append-only AuditLog |
| Unmeasurable delivery claims | Email states limited to `QUEUED`, `SENT`, `FAILED`, `BOUNCED` |
| Capacity overrun | Hard cap check plus unique constraint |
| Non-reproducible notification audience | Audience definition stored on the notification |

---

## 5. Data Ownership

| Data | Owner | Retention driver |
|---|---|---|
| User, Role | Administrator | Account lifetime plus retention |
| StudentProfile | Administrator | Same as User |
| Organization/Club | Administrator | Lifetime plus historical events |
| Event | Event Officer | Permanent for completed events |
| ApprovalChain, ApprovalStep | Approver, held on behalf of Council | Same as Event |
| Announcement, Notification, NotificationRecipient | Event Officer | See OQ-26 |
| Registration | Student, data held by organisation | See OQ-26 |
| Attendance | Attendance Staff, data held by organisation | See OQ-27 |
| EventAttachment | Event Officer | Same as Event |
| EventEvaluation | Event Officer | Same as Event |
| AuditLog | Administrator | Longest retention of any category |

> **OPEN QUESTION:** What retention period applies to notification history, registration
> records, and attendance records? See
> [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) OQ-26, OQ-27, OQ-28.

---

## 6. Modelling Decisions Worth Reviewing

| Decision | Alternative rejected | Why this one |
|---|---|---|
| Attendance as a separate entity from Registration | `ATTENDED`/`ABSENT` as registration statuses | Attendance is an independently observed fact with its own recorder, window, and correction path. Merging them forces registration status to change at event day and conflates two lifecycles |
| `student_context` snapshot on Registration | Read live from StudentProfile | Preserves the state at the time of registration, so later programme changes do not rewrite historical reports |
| `user_id`/`event_id` denormalised on Attendance | Join through Registration | Attendance counts per event are the primary operational query; the denormalisation is a deliberate read optimisation |
| Audience definition stored on Notification | Audience re-evaluated on read | A notification must remain reproducible for audit; re-evaluation would change history as the roster changes |
| No waitlist entity | Waitlist as Registration status | Capacity is a hard cap by locked decision |
| UserRole as a join, not an attribute | Single role per user | Multi-role assignment is needed for real staffing, and segregation-of-duty rules are expressed across roles |
| AuditLog references by type and identifier | Foreign key per audited entity | One audit entity serves fifteen audited entities without fifteen foreign keys |

---

## 7. Test Scenarios

| ID | Scenario | Expected |
|---|---|---|
| DATA-01 | Insert a second registration for the same user and event | Rejected by unique constraint |
| DATA-02 | Concurrent registration requests for the same user and event | Exactly one succeeds, one rejected |
| DATA-03 | Insert a second attendance record for the same registration | Rejected by unique constraint |
| DATA-04 | Record attendance for a cancelled registration | Rejected |
| DATA-05 | Record attendance with no registration reference | Rejected, no orphan row |
| DATA-06 | Registration for a suspended user | Rejected at application layer before insert |
| DATA-07 | Registration referencing a non-existent event | Rejected, no orphan row |
| DATA-08 | Approve step 2 before step 1 | Rejected |
| DATA-09 | Two active non-amendment approval chains on one event | Rejected |
| DATA-10 | Acknowledge a notification where acknowledgement is not required | Rejected |
| DATA-11 | Acknowledge without a prior read | Rejected |
| DATA-12 | Attempt to update or delete an audit record | No path exists |
| DATA-13 | Cancel a registration then re-register the same user | Depends on OQ-10 decision |
| DATA-14 | Attendance recorded after the student changes programme | Attendance retains original `student_context` |
| DATA-15 | Event with `end_time` before `start_time` | Rejected |
| DATA-16 | `registration_deadline` after `event_date` | Rejected |
| DATA-17 | Capacity reduced below current registration count | Rejected |
| DATA-18 | Archive an event with no evaluation | Rejected |
| DATA-19 | Notification audience re-evaluated after roster change | Original definition used |
| DATA-20 | StudentProfile exists without the Student role | Rejected |

---

## 8. Completion Criteria

- All fifteen locked entities are documented with purpose, attributes, and relationships
- Cardinalities and required-versus-optional relationships are stated for every relationship
- Every integrity constraint that prevents an interview-reported failure is documented
- No SQL or migration artifact is present

---

## 9. Exit Criteria

- Data model reviewed by an engineer against the functional requirements
- OQ-07 and OQ-10 are resolved, because each changes a constraint
- The physical schema is designed under `PB-ENG-14 Database Changes` and traced back to this
  document

> **CORRECTION, 2026-10-09.** This criterion previously read *"OQ-07, OQ-10, OQ-13, OQ-18, and OQ-19
> are resolved, because each changes a constraint."* OQ-13, OQ-18 and OQ-19 have been removed.
>
> **Evidence.** Throughout this document, *constraint* denotes a schema or integrity constraint —
> used that way at section 1, at section 2 (the `Integrity:` blocks for User, Role,
> Organization, StudentProfile, Event, ApprovalChain and AuditLog), and in the failure-mode table.
> Measured against that meaning: OQ-07 supplies the stable `user_id` on which the
> `(user_id, event_id)` uniqueness constraint depends, and OQ-10 determines whether that
> constraint must be partial on active records. Both change a constraint and both are retained.
> OQ-13 concerns the notification mechanism, OQ-18 concerns post-publication edit permissions, and
> OQ-19 concerns which changes require re-approval. None alters an entity, an attribute, a
> cardinality or an integrity constraint; all three are policy or workflow decisions.
>
> **Not substituted.** The retention questions OQ-26, OQ-27 and OQ-28 govern the data ownership
> table in section 7, but they govern retention *configuration* rather than constraints, so they do
> not belong in this criterion either. No replacement gate has been added. Removed by
> Developer / Technical Owner as a documentation defect.

---

**Related documents:** [DATA-MODEL.md](DATA-MODEL.md) ·
[REGISTRATION-WORKFLOW.md](REGISTRATION-WORKFLOW.md) ·
[NOTIFICATION-WORKFLOW.md](NOTIFICATION-WORKFLOW.md) ·
[ATTENDANCE-WORKFLOW.md](ATTENDANCE-WORKFLOW.md) ·
[EVENT-LIFECYCLE.md](EVENT-LIFECYCLE.md) ·
[USER-ROLES.md](USER-ROLES.md) ·
[SECURITY-PLAN.md](SECURITY-PLAN.md) ·
[AUDIT-PLAN.md](AUDIT-PLAN.md) ·
[OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)