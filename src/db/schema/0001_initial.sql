-- =============================================================================
-- ERNS migration 0001: initial persistence scope.
--
-- Source: docs/planning/DATA-MODEL.md. Constraint sources are cited inline.
--
-- SCOPE, AND WHY IT IS NARROWER THAN THE DATA MODEL
-- The data model defines fifteen entities. This migration creates four: User (partial), Event
-- (substitute), Registration, and audit_log. The other eleven depend on unresolved questions and are
-- deliberately absent rather than guessed at:
--   - StudentProfile: OQ-07 leaves the student number's existence and uniqueness undecided, and
--     Registration.student_context snapshots it. Adding it now would require inventing a value.
--   - Role / Organization / ApprovalChain / ApprovalStep: OQ-01, OQ-02 and OQ-04 leave the approval
--     authority and the event-type enumeration undefined. Hard-coding either would invent an
--     institutional process that no source describes.
--   - Notification / NotificationRecipient: FR-NOT-003's state count is contested under OQ-56.
--   - Attendance, EventAttachment, EventEvaluation, Announcement: no integrity rules sufficiently
--     specified to enforce as constraints.
--
-- ROLES
-- SECURITY-ARCHITECTURE.md section 9.2 requires two structural consequences: the audit table
-- receives insert and read grants only, and the application role holds no schema-altering
-- privilege. NFR-SEC-015 requires minimum privilege. Both roles are created here.
--
-- FORWARD ONLY
-- This file is applied, never reverted. PB-ENG-14 requires a documented, tested rollback path; that
-- does not exist yet, so migrate.ts performs no down-migration and claims none.
-- =============================================================================

-- Role creation is conditional because CREATE ROLE has no IF NOT EXISTS before PostgreSQL 17's
-- version of it, and the same migration must be re-runnable on a partially provisioned database.
-- The DO block is idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erns_owner') THEN
    -- NOLOGIN: the owner is a privilege set, not a credential. Migrations connect as the cluster
    -- superuser and SET ROLE to this, so no owner password ever exists.
    CREATE ROLE erns_owner NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erns_app') THEN
    -- LOGIN is required: the permission test in test/audit-permission.test.ts authenticates as this
    -- role over a real connection. The password is never stored in this file or in the repository.
    CREATE ROLE erns_app LOGIN;
  END IF;
END
$$;

-- Both roles need to create objects in the application schema.
CREATE SCHEMA IF NOT EXISTS erns AUTHORIZATION erns_owner;

-- The application role must not be able to create objects in the schema. GRANT CREATE on a schema
-- is the privilege that would let a defect alter or drop data (SECURITY-ARCHITECTURE.md line 380), so
-- it is withheld explicitly rather than left to a default.
REVOKE CREATE ON SCHEMA erns FROM PUBLIC;
GRANT USAGE ON SCHEMA erns TO erns_app;
GRANT ALL ON SCHEMA erns TO erns_owner;

-- Migrations are idempotent, so tables are created conditionally rather than with bare CREATE.
CREATE TABLE IF NOT EXISTS erns.app_user (
  -- Project-owner decision: the key is a UUID. DATA-MODEL.md line 68 says only "System-assigned
  -- identifier" and specifies no type; UUID was chosen so that identifiers are non-enumerable and
  -- cannot be guessed from a sequence.
  user_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- DATA-MODEL.md line 69: "Institutional email. Unique. Used for login and email delivery."
  email       TEXT NOT NULL,

  -- DATA-MODEL.md line 70. Not constrained to length: no source specifies one, and inventing a
  -- maximum would reject a name that the requirement allows.
  display_name TEXT NOT NULL,

  -- DATA-MODEL.md line 71: `ACTIVE` or `SUSPENDED`. Two values, enforced here so that a third is
  -- unwritable at the store rather than only in the type.
  account_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CONSTRAINT app_user_account_status_check
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED')),

  -- DATA-MODEL.md line 73: "Operational signal, not authoritative." No constraint depends on it.
  last_login_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DATA-MODEL.md line 69 requires uniqueness; line 82 requires immutability after first save.
-- Uniqueness is a constraint. Immutability cannot be expressed as a constraint on its own; it is
-- enforced by withholding UPDATE on the email column from the application role in 0002, which is
-- stated there.
CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_key ON erns.app_user (email);


CREATE TABLE IF NOT EXISTS erns.event (
  -- UUID, for the same reason as app_user.user_id.
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- DATA-MODEL.md lines 175-176.
  title       TEXT NOT NULL,
  description TEXT NOT NULL,

  -- DATA-MODEL.md line 177: "Required. Drives which approval chain and which fields are mandatory."
  -- Stored as TEXT with NO domain constraint, deliberately. OQ-02 records that event types are not
  -- enumerated, so any CHECK here would invent institutional categories. Adding the constraint is a
  -- one-line migration once OQ-02 closes.
  event_type  TEXT NOT NULL,

  -- DATA-MODEL.md line 179.
  event_date DATE NOT NULL,

  -- DATA-MODEL.md line 180. Times of day, not timestamps, per the "later than" relationship at
  -- line 208 which compares them to each other rather than to a date.
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,

  -- DATA-MODEL.md line 181.
  venue TEXT NOT NULL,

  -- DATA-MODEL.md line 182. No foreign key: Organization/Club is outside this migration's scope, and
  -- a foreign key to a non-existent table cannot be created. Deliberately unenforced, recorded here
  -- so it is not mistaken for an oversight.
  organizer_org_id UUID,

  -- DATA-MODEL.md line 183. An audience definition whose structure is defined in
  -- NOTIFICATION-WORKFLOW.md and is not yet specified; stored as JSONB without a shape constraint.
  target_audience JSONB,

  -- DATA-MODEL.md line 184.
  registration_required BOOLEAN NOT NULL DEFAULT TRUE,

  -- DATA-MODEL.md lines 185-186: required IF registration is required. The conditional requirement is
  -- enforced by the window_consistency check below.
  registration_start    TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,

  -- DATA-MODEL.md line 187: "Required if registration required. Hard cap".
  -- The positivity requirement (line 211) is this check. The second requirement (line 212-213, that
  -- capacity must not be reduced below the existing registration count) CANNOT be a constraint: it
  -- compares a column against a count of rows in another table. It belongs to the write transaction
  -- and is out of scope for this milestone.
  capacity INTEGER,

  -- DATA-MODEL.md lines 188-193. Long-form notification-triggering content. No constraint is
  -- specified for any of them in the data model, so none is added.
  event_mechanics  TEXT,
  program_flow     TEXT,
  requirements     TEXT,
  materials_needed TEXT,
  dress_code       TEXT,
  contact_person   TEXT,

  -- DATA-MODEL.md lines 194: attendance window timing.
  attendance_window_open  TIMESTAMPTZ,
  attendance_window_close TIMESTAMPTZ,

  -- DATA-MODEL.md line 195 -> EVENT-LIFECYCLE.md section 2. Twelve statuses. The domain constant
  -- EVENT_STATUSES in src/domain/event-status.ts is the same closed set; the constraint is what makes
  -- it true at the store rather than only in the type.
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CONSTRAINT event_status_check
    CHECK (status IN (
      'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'FOR_REVISION', 'PENDING_APPROVAL',
      'APPROVED', 'REJECTED', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED'
    )),

  -- DATA-MODEL.md line 196. A Boolean flag, not a status: EVENT-LIFECYCLE.md section 2.2 records that
  -- transitions T-11, T-12 and T-13 act on this rather than on `status`.
  registration_open BOOLEAN NOT NULL DEFAULT FALSE,

  published_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,

  -- DATA-MODEL.md line 199: required when cancelled.
  cancelled_reason TEXT,

  -- DATA-MODEL.md lines 208-210: the three ordering requirements.
  CONSTRAINT event_time_ordering_check
    CHECK (end_time > start_time),
  CONSTRAINT event_deadline_before_date_check
    CHECK (registration_deadline IS NULL OR registration_start IS NULL
           OR registration_deadline < event_date::timestamptz),
  CONSTRAINT event_window_ordering_check
    CHECK (registration_start IS NULL OR registration_deadline IS NULL
           OR registration_start < registration_deadline),

  -- DATA-MODEL.md line 211: "capacity MUST be a positive integer when registration is required".
  -- A capacity of zero would make an event unregistrable, which contradicts line 184 defaulting
  -- registration_required to TRUE.
  CONSTRAINT event_capacity_positive_check
    CHECK (capacity IS NULL OR capacity > 0),

  -- DATA-MODEL.md lines 185-186 state registration_start and registration_deadline are required IF
  -- registration is required. A CHECK is the correct mechanism for that implication.
  CONSTRAINT event_window_required_check
    CHECK (registration_required = FALSE
           OR (registration_start IS NOT NULL AND registration_deadline IS NOT NULL)),

  -- DATA-MODEL.md line 199: cancelled_reason is required when cancelled. This couples the reason to
  -- the lifecycle status named at line 199.
  CONSTRAINT event_cancelled_reason_check
    CHECK (status <> 'CANCELLED' OR (cancelled_reason IS NOT NULL AND btrim(cancelled_reason) <> ''))
);

CREATE INDEX IF NOT EXISTS event_status_idx ON erns.event (status);
CREATE INDEX IF NOT EXISTS event_registration_open_idx ON erns.event (registration_open);


CREATE TABLE IF NOT EXISTS erns.registration (
  -- Project-owner decision: UUID. Recorded in PROJECT-OWNER-DECISIONS.md. DATA-MODEL.md line 381
  -- specifies only "Identifier" and no type.
  registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- DATA-MODEL.md line 382.
  user_id UUID NOT NULL REFERENCES erns.app_user (user_id),

  -- DATA-MODEL.md line 183, 195: belongs to one Event.
  event_id UUID NOT NULL REFERENCES erns.event (event_id),

  -- DATA-MODEL.md line 384: REGISTERED or CANCELLED only. CONFIRMED at lines 405-407: WAITLISTED,
  -- ATTENDED and ABSENT MUST NOT be used as registration statuses. C-05 requires a third value to be
  -- unwritable.
  status TEXT NOT NULL DEFAULT 'REGISTERED'
    CONSTRAINT registration_status_check
    CHECK (status IN ('REGISTERED', 'CANCELLED')),

  -- DATA-MODEL.md line 385.
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- DATA-MODEL.md lines 386-387, 401: cancelled_at and cancellation_reason are required when status
  -- is CANCELLED.
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- DATA-MODEL.md line 388: reference to the User who cancelled, which for a self-cancellation is the
  -- registering user. No foreign key beyond the presence check below; a cancelled_by may reference a
  -- user that exists, so it does carry one.
  cancelled_by UUID REFERENCES erns.app_user (user_id),

  -- DATA-MODEL.md line 389.
  registration_source TEXT NOT NULL
    CONSTRAINT registration_source_check
    CHECK (registration_source IN ('SELF', 'OFFICER', 'ADMINISTRATOR')),

  -- DATA-MODEL.md line 390, FR-REG-020: "unique to the registration". The format itself is a
  -- project-owner implementation decision, recorded in PROJECT-OWNER-DECISIONS.md.
  confirmation_reference TEXT NOT NULL,

  -- DATA-MODEL.md line 391: "Program, year level, and org captured at registration time."
  -- FR-REG-017 requires the snapshot of programme, year level and organisation.
  --
  -- JSONB rather than typed columns, per an explicit project-owner decision. StudentProfile is not
  -- in this migration because OQ-07 leaves the student number undefined, so there is no parent row
  -- to normalise against and no named type to point at. The expected keys are `programme`,
  -- `year_level` and `organization_id`; they are documented here and NOT constrained, because no
  -- source specifies their representation. Normalisation is deferred to the migration that creates
  -- StudentProfile.
  --
  -- DATA-MODEL.md line 403: this is a snapshot, so a later programme change must not rewrite
  -- history. No source states which fields are required, so no NOT NULL or shape check is added.
  student_context JSONB,

  -- DATA-MODEL.md lines 401-402: cancellation never deletes; a cancelled row retains every other
  -- field. Enforced by requiring the cancellation fields only in the CANCELLED state, and requiring
  -- no field to be cleared when they are present.
  CONSTRAINT registration_cancellation_fields_check CHECK (
    (status = 'CANCELLED' AND cancelled_at IS NOT NULL
              AND cancellation_reason IS NOT NULL AND btrim(cancellation_reason) <> '')
    OR
    (status = 'REGISTERED')
  ),

  -- AUDIT-PLAN.md line 76 (AUD-13): a non-student cancellation requires a reason. The pairing of
  -- source and reason is only enforceable when the canceller is known, which it is not when
  -- cancelled_by IS NULL. That combination is therefore permitted here; the rule belongs to the
  -- application layer, which is out of scope for this milestone.
  CONSTRAINT registration_cancelled_by_present_check CHECK (
    status <> 'CANCELLED' OR cancelled_by IS NOT NULL
  ),

  CONSTRAINT registration_event_required_check CHECK (event_id IS NOT NULL)
);

-- FR-REG-020: a confirmation reference is unique to the registration. The generator makes collisions
-- improbable; this constraint makes them impossible.
CREATE UNIQUE INDEX IF NOT EXISTS registration_confirmation_reference_key
  ON erns.registration (confirmation_reference);

-- THE PROJECT-OWNER DECISION ON OQ-10.
--
-- UNIQUE (user_id, event_id) WHERE status = 'REGISTERED'.
--
-- A PARTIAL unique index, not a plain one. DATA-MODEL.md line 399 states the constraint as "Unique on
-- (user_id, event_id)" but line 409 labels the slot-release reading PROPOSED and line 411 states that
-- preferring a cancelled registration to consume a slot "require[s] the uniqueness constraint to move
-- to (user_id, event_id) partial on active records" - that is, the partial index IS the slot-release
-- reading. The two clauses in the source are therefore describing different constraints under one
-- heading. This migration implements the partial form, adopting the PROPOSED reading that
-- DATA-MODEL.md line 409 records and that the project owner confirmed in
-- PROJECT-OWNER-DECISIONS.md. It is recorded there as a project decision, NOT as institutional
-- approval, and OQ-10 remains open in OPEN-QUESTIONS.md.
--
-- Effect: a student may hold one active registration per event and may re-register after cancelling,
-- since only active rows participate in the index.
CREATE UNIQUE INDEX IF NOT EXISTS registration_active_user_event_key
  ON erns.registration (user_id, event_id)
  WHERE status = 'REGISTERED';

-- Supports the capacity count in validation step 7 and the duplicate check in step 8.
CREATE INDEX IF NOT EXISTS registration_event_status_idx
  ON erns.registration (event_id, status);


-- =============================================================================
-- AuditLog
--
-- Source: DATA-MODEL.md section 2.15, lines 521-548. Append-only per line 544 and C-03.
--
-- Permissions are NOT granted here. 0002_audit_grants.sql grants SELECT and INSERT to erns_app and
-- withholds UPDATE and DELETE, so the restriction is a separate, independently testable step.
-- =============================================================================
CREATE TABLE IF NOT EXISTS erns.audit_log (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- DATA-MODEL.md line 528: "Reference to User. Null for system-initiated events."
  --
  -- A foreign key is present, per an explicit project-owner decision recorded in
  -- PROJECT-OWNER-DECISIONS.md. DATA-MODEL.md line 539 states "no fixed foreign key", but that
  -- sentence describes the POLYMORPHIC reference below ("references any entity by type and
  -- identifier"), not this column; line 528 names User explicitly. No source contradicts the
  -- decision, so it was applied rather than escalated.
  --
  -- ON DELETE RESTRICT, never CASCADE. DATA-MODEL.md line 548 confirms "Audit records are retained
  -- and never cascade-deleted with their subject entity" and FR-AUD-006 forbids deleting an audited
  -- record when the record it references is deleted. SECURITY-PLAN.md lines 360-364 record that
  -- corrections are preferred to deletion and that no retention policy authorises an erasure path, so
  -- a user with audit history cannot be deleted. That is the intended behaviour, not an oversight.
  actor_user_id UUID REFERENCES erns.app_user (user_id) ON DELETE RESTRICT,

  -- DATA-MODEL.md line 529: "Role at time of action." The role set is defined in USER-ROLES.md and is
  -- not reproduced as a constraint here, because Role is outside this migration's scope and the
  -- source records roles as a many-to-many rather than a closed enumeration.
  actor_role TEXT,

  -- DATA-MODEL.md line 530: "Action code, see AUD-NN in AUDIT-PLAN.md". AUDIT-PLAN.md lines 52-76
  -- enumerate exactly twenty-five classes, AUD-01 through AUD-25, and line 78 confirms the count.
  -- The constraint is generated from that list, with no value added and none omitted.
  action TEXT NOT NULL
    CONSTRAINT audit_log_action_check
    CHECK (action IN (
      'AUD-01', 'AUD-02', 'AUD-03', 'AUD-04', 'AUD-05', 'AUD-06', 'AUD-07', 'AUD-08', 'AUD-09',
      'AUD-10', 'AUD-11', 'AUD-12', 'AUD-13', 'AUD-14', 'AUD-15', 'AUD-16', 'AUD-17', 'AUD-18',
      'AUD-19', 'AUD-20', 'AUD-21', 'AUD-22', 'AUD-23', 'AUD-24', 'AUD-25'
    )),

  -- DATA-MODEL.md line 532. No constraint is applied: the entity vocabulary is not enumerated in any
  -- source document, and inventing one would exclude an entity type that later turns out to be valid.
  entity_type TEXT NOT NULL,

  -- DATA-MODEL.md line 533. The polymorphic half of DATA-MODEL.md line 539's "no fixed foreign key",
  -- and deliberately unenforced.
  entity_id TEXT NOT NULL,

  -- DATA-MODEL.md line 534.
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- DATA-MODEL.md lines 535-536: "Prior value or state" and "New value or state". No type is stated,
  -- so JSONB is used to avoid narrowing a state that might be a scalar in one entity and an object
  -- in another. Recorded as a project-owner implementation decision.
  previous_state JSONB,
  new_state JSONB,

  -- DATA-MODEL.md line 537: "Free-text justification for privileged actions".
  -- Line 545: "A record with a reason requirement MUST have a non-empty reason." Which actions
  -- require one is listed in the "Reason required" column of AUDIT-PLAN.md lines 52-76. That mapping
  -- is enforced by the application layer, not here, because AUDIT-PLAN.md records several actions
  -- as conditionally requiring a reason ("Suspension requires reason", "Exception requires
  -- justification") where the condition is not part of the stored action code. The non-empty check is
  -- applied regardless.
  reason TEXT,

  -- DATA-MODEL.md line 537: "Origin metadata sufficient to attribute the request". JSONB, same
  -- reasoning as previous_state and new_state.
  request_context JSONB,

  CONSTRAINT audit_log_reason_not_blank_check
    CHECK (reason IS NULL OR btrim(reason) <> '')
);

-- Supports AUDIT-PLAN.md line 40: "Queryable by actor, action, entity, and time."
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON erns.audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON erns.audit_log (action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON erns.audit_log (entity_type, entity_id);

-- =============================================================================
-- Ownership and runtime grants.
--
-- Ownership matters for C-03. A role that OWNS a table can always alter or drop it, so granting
-- erns_app only SELECT and INSERT would be meaningless if erns_app owned audit_log. Ownership is
-- therefore held by erns_owner, which is NOLOGIN, so no credential can exercise it.
--
-- REVOKE ALL ... FROM PUBLIC is written for every table. PostgreSQL grants no table privileges to
-- PUBLIC by default, but the default is a property of the server version rather than of this schema,
-- and C-03 must not depend on a default that a future upgrade could change.
-- =============================================================================
ALTER TABLE erns.app_user  OWNER TO erns_owner;
ALTER TABLE erns.event     OWNER TO erns_owner;
ALTER TABLE erns.registration OWNER TO erns_owner;
ALTER TABLE erns.audit_log OWNER TO erns_owner;

REVOKE ALL ON TABLE erns.app_user, erns.event, erns.registration, erns.audit_log FROM PUBLIC;

-- The application role may read and write application data. audit_log is excluded on purpose and
-- granted separately in 0002, so that the audit restriction is one reviewable migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erns.app_user, erns.event, erns.registration TO erns_app;