-- =============================================================================
-- ERNS migration 0006: StudentProfile store for audience and eligibility (MVP T3).
--
-- Source: DATA-MODEL.md section 2.4, issue #4. REGISTRATION-WORKFLOW.md line 100
-- (step 6: in target audience and `is_eligible`) and NOTIFICATION-WORKFLOW.md
-- section 6 (audience types evaluated against programme, year_level and org_id
-- at dispatch time) require a stored profile to evaluate against. 0001 deferred
-- this table while OQ-07 left the student number undecided; the snapshot on
-- Registration already reserves the keys (`programme`, `year_level`,
-- `organization_id`), so this migration adds the parent row those snapshots copy.
--
-- SCOPE, AND WHAT IS DELIBERATELY ABSENT
-- One table only. No Organization/Club table: the organisation is a TEXT
-- membership value, not a foreign key, because the owning-org process that would
-- justify a parent table (OQ-01, OQ-02, OQ-04) does not exist. No student_number
-- column: OQ-07 leaves its existence and uniqueness undecided, and inventing it
-- would reject an identity the requirement allows. No Role invariant in the
-- schema: "Student role MUST have a profile / profile MUST NOT exist without
-- the Student role" (DATA-MODEL.md lines 158-160) is an application rule,
-- not a foreign key, because Role itself is the user_role store from 0005
-- rather than a parent row. It is currently UNENFORCED: the identity layer
-- (issue #2) reads roles and does not check for a StudentProfile, and no
-- other code does. Issue #9 (MVP T8: Administrator CSV student import), the
-- only Student-account creation path, provisions a profile for every imported
-- Student; a runtime check where roles are read has no ticket yet and is
-- flagged for the human to file.
--
-- ADDITIVE AND LEAST-PRIVILEGE. No existing table is altered. The application
-- role receives SELECT, INSERT, UPDATE and DELETE on this table only — the same
-- grant 0001 gives application data — so provisioning, eligibility maintenance
-- and registration-time reads all run as erns_app. No grant touches any other
-- table. Ownership is erns_owner (NOLOGIN), consistent with 0001.
--
-- ON DELETE behaviour: the default (NO ACTION). schema.test.ts asserts no FK in
-- the erns schema cascades, nulls, or defaults on delete (FR-AUD-006), so no
-- ON DELETE clause is written here; the default is the assertion.
-- =============================================================================

CREATE TABLE IF NOT EXISTS erns.student_profile (
  -- One profile per User (DATA-MODEL.md line 158). The primary key IS the
  -- invariant: a second profile for the same user is unwritable.
  user_id UUID PRIMARY KEY REFERENCES erns.app_user (user_id),

  -- DATA-MODEL.md lines 148-150. TEXT with a non-blank check: no source
  -- specifies a maximum length, so none is invented.
  programme TEXT NOT NULL
    CONSTRAINT student_profile_programme_check
    CHECK (btrim(programme) <> ''),

  -- Drives targeting and eligibility. Positive only; no source names a maximum
  -- year, so no upper bound is invented.
  year_level INTEGER NOT NULL
    CONSTRAINT student_profile_year_level_check
    CHECK (year_level >= 1),

  -- Primary organisation or club membership (DATA-MODEL.md line 150). TEXT and
  -- nullable: there is no Organization table to point at, and membership is
  -- optional per the relationship summary (StudentProfile -> Organization N:1
  -- optional). A NULL means "no primary membership", which matches no
  -- organisation-filtered audience and matches every unfiltered one.
  organization_id TEXT,

  -- DATA-MODEL.md line 151: maintained by authorised personnel, not derived.
  -- Default TRUE so that provisioning a profile does not silently bar a
  -- Student before anyone has judged them ineligible; barring is an explicit
  -- write of FALSE.
  is_eligible BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE erns.student_profile OWNER TO erns_owner;

REVOKE ALL ON TABLE erns.student_profile FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erns.student_profile TO erns_app;

-- =============================================================================
-- Verification.
--
--   Expected: one row, PK on user_id, FK to app_user with NO ACTION.
--   SELECT tc.constraint_name, rc.delete_rule
--     FROM information_schema.referential_constraints rc
--     JOIN information_schema.table_constraints tc USING (constraint_schema, constraint_name)
--    WHERE tc.table_schema = 'erns' AND tc.table_name = 'student_profile';
--
--   Expected: SELECT, INSERT, UPDATE, DELETE for erns_app, nothing for PUBLIC.
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'erns' AND table_name = 'student_profile'
--    ORDER BY grantee, privilege_type;
-- =============================================================================
