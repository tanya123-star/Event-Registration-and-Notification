-- =============================================================================
-- ERNS migration 0008: Attendance and Walk-in stores (MVP T7, issue #8).
--
-- Source: DATA-MODEL.md section 2.12, issue #8, ATTENDANCE-WORKFLOW.md
-- sections 3, 6 and 8. 0001 deferred Attendance because no integrity rule was
-- sufficiently specified; the rules below are now locked: storage-level
-- uniqueness on the registration reference (FR-ATT-002), refusal for
-- CANCELLED registrations (FR-ATT-003) and for rows without a registration
-- reference (FR-ATT-004), window attribution per record (FR-ATT-005),
-- recorder identity on staff-assisted rows (FR-ATT-011), and reasoned,
-- attributed corrections (FR-ATT-015, FR-ATT-016).
--
-- SCOPE, AND WHAT IS DELIBERATELY ABSENT
-- Two tables only: Attendance (one presence record per Registration) and
-- Walk-in (the audited exception for an unregistered presence, counted
-- separately per ATTENDANCE-WORKFLOW.md section 3.1 and GLOSSARY.md).
-- No existing table is altered.
-- No QR token store: QR is a Phase 2 accelerator encoding the same
-- Confirmation reference (MVP-SPEC.md), so no token column is created now.
-- The `method` domain nevertheless admits 'QR' so Phase 2 needs no migration
-- edit; the MVP write path records STAFF_ASSISTED only, and corrections
-- record CORRECTION.
-- No per-event staff-assignment table: ATT-23 (refusal on an unassigned
-- event) cannot be enforced until assignments exist. The assigned event is
-- the session layer's context, not a column here; enforcement belongs to a
-- later milestone with its own store.
-- No student-number lookup column: OQ-07 leaves the student number undecided
-- and 0006 deliberately omits it, so lookup is by name and Confirmation
-- reference only.
-- The cross-row rule "registration status is REGISTERED at recording time"
-- (DATA-MODEL.md lines 445-446, FR-ATT-001/003) cannot be a CHECK: it reads
-- another table. It is enforced by the L4 record path, which reads the
-- registration inside the write transaction — the same placement 0001
-- records for the capacity-below-count rule.
-- Original values on correction (FR-ATT-015) are retained in the AUD-16 audit
-- row's previous_state/new_state, not in extra columns: audit entries are
-- immutable (NFR-AUD-005), so the history is reconstructable without
-- widening this table.
--
-- ADDITIVE AND LEAST-PRIVILEGE. No existing table is altered. The application
-- role receives SELECT, INSERT and UPDATE on Attendance (record, read, and
-- the Administrator data-fix correction) and SELECT and INSERT on Walk-in
-- (record and read; a wrong walk-in has no specified correction path, so no
-- UPDATE is granted until one exists). No DELETE anywhere: attendance facts
-- are retained after cancellation (FR-ATT-020), and a correction is a reasoned
-- update plus audit, never a removal. No grant touches any other table.
-- Ownership is erns_owner (NOLOGIN), consistent with 0001.
--
-- ON DELETE behaviour: the default (NO ACTION). schema.test.ts asserts no FK in
-- the erns schema cascades, nulls, or defaults on delete (FR-AUD-006), so no
-- ON DELETE clause is written here; the default is the assertion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS erns.attendance (
  -- UUID, for the same reason as app_user.user_id in 0001: non-enumerable.
  attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- DATA-MODEL.md lines 427, 443-444 and FR-ATT-002: the authoritative
  -- duplicate-attendance safeguard. One presence record per registration
  -- (no in/out pair in the MVP); a second insert for the same registration
  -- collides here. Required (FR-ATT-004): an attendance row without a
  -- registration reference is refused — walk-ins use erns.walk_in instead,
  -- so no orphan row can exist here (DATA-MODEL.md line 590).
  registration_id UUID NOT NULL UNIQUE REFERENCES erns.registration (registration_id),

  -- DATA-MODEL.md lines 428-429: denormalised for query convenience. The
  -- attendance counts per event are the primary operational query
  -- (DATA-MODEL.md line 631), so the join through Registration is avoided.
  user_id UUID NOT NULL REFERENCES erns.app_user (user_id),
  event_id UUID NOT NULL REFERENCES erns.event (event_id),

  -- DATA-MODEL.md line 430. Single-presence MVP: a recorded row means present.
  -- Absent is derived (registered minus present), never stored.
  present BOOLEAN NOT NULL DEFAULT TRUE,

  -- DATA-MODEL.md line 431.
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- DATA-MODEL.md lines 432-433 and FR-ATT-011: the accountable recorder.
  -- Null exactly when the method is QR (self-recorded); non-null otherwise.
  recorded_by UUID REFERENCES erns.app_user (user_id),

  -- DATA-MODEL.md line 433. 'QR' is admitted for Phase 2 without a future
  -- migration edit; the MVP writes STAFF_ASSISTED, corrections write CORRECTION.
  method TEXT NOT NULL
    CONSTRAINT attendance_method_check
    CHECK (method IN ('QR', 'STAFF_ASSISTED', 'CORRECTION')),

  -- DATA-MODEL.md line 434 and FR-ATT-005: which configured window admitted
  -- the record, derived by src/domain/attendance-window.ts (PRE_EVENT before
  -- the event start, EVENT at or after it).
  attendance_window TEXT NOT NULL
    CONSTRAINT attendance_window_check
    CHECK (attendance_window IN ('PRE_EVENT', 'EVENT')),

  -- DATA-MODEL.md lines 435-436 and FR-ATT-015: a correction carries its
  -- reason, corrector and timestamp together, or none of them. The original
  -- values live on in the AUD-16 audit row.
  correction_reason TEXT,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES erns.app_user (user_id),
  CONSTRAINT attendance_correction_complete_check
    CHECK (corrected_at IS NULL OR (btrim(correction_reason) <> '' AND corrected_by IS NOT NULL)),

  -- Recorder/method coupling (DATA-MODEL.md line 447).
  CONSTRAINT attendance_recorder_method_check
    CHECK ((method = 'QR' AND recorded_by IS NULL) OR (method <> 'QR' AND recorded_by IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS erns.walk_in (
  -- UUID, for the same reason as attendance_id above.
  walk_in_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The event attended. A walk-in never references a registration
  -- (FR-ATT-018 prohibits attendance from producing one), so this table
  -- carries no registration_id at all: the registered count can never
  -- include a walk-in (ATT-13 holds by construction).
  event_id UUID NOT NULL REFERENCES erns.event (event_id),

  -- ATTENDANCE-WORKFLOW.md section 3.1: attributed to the staff member.
  -- Always staff-recorded, so always non-null (unlike Attendance.recorded_by).
  recorded_by UUID NOT NULL REFERENCES erns.app_user (user_id),

  -- The mandatory reason (issue #8: a reasonless walk-in is refused).
  reason TEXT NOT NULL
    CONSTRAINT walk_in_reason_check
    CHECK (btrim(reason) <> ''),

  -- Same attribution as Attendance (FR-ATT-005).
  attendance_window TEXT NOT NULL
    CONSTRAINT walk_in_window_check
    CHECK (attendance_window IN ('PRE_EVENT', 'EVENT')),

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The staff lookup reads one event's participants (registrations with their
-- attendance state); the live count reads one event's attendance and walk-ins.
CREATE INDEX IF NOT EXISTS attendance_event_idx ON erns.attendance (event_id);
CREATE INDEX IF NOT EXISTS walk_in_event_idx ON erns.walk_in (event_id);

ALTER TABLE erns.attendance OWNER TO erns_owner;
ALTER TABLE erns.walk_in OWNER TO erns_owner;

REVOKE ALL ON TABLE erns.attendance, erns.walk_in FROM PUBLIC;

-- Record, read, and the Administrator data-fix correction (AUD-16). Nothing
-- deletes an attendance fact (FR-ATT-020).
GRANT SELECT, INSERT, UPDATE ON TABLE erns.attendance TO erns_app;
-- Record and read. No correction path is specified for a wrong walk-in, so no
-- UPDATE is granted until one exists.
GRANT SELECT, INSERT ON TABLE erns.walk_in TO erns_app;

-- =============================================================================
-- Verification.
--
--   Expected: two tables; UNIQUE on attendance(registration_id); FKs with
--   NO ACTION (FR-AUD-006 — the schema.test.ts "no cascade" assertion).
--   SELECT tc.table_name, tc.constraint_name, rc.delete_rule
--     FROM information_schema.referential_constraints rc
--     JOIN information_schema.table_constraints tc USING (constraint_schema, constraint_name)
--    WHERE tc.table_schema = 'erns'
--      AND tc.table_name IN ('attendance', 'walk_in');
--
--   Expected: SELECT, INSERT, UPDATE for erns_app on attendance;
--   SELECT, INSERT on walk_in; nothing for PUBLIC.
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'erns'
--      AND table_name IN ('attendance', 'walk_in')
--    ORDER BY grantee, privilege_type;
-- =============================================================================
