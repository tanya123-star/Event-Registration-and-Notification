-- =============================================================================
-- ERNS migration 0005: session and role stores for identity resolution (MVP T1).
--
-- Source: docs/MVP-SPEC.md gap 1, issue #2. NFR-SEC-003 requires server-side,
-- revocable sessions; USER-ROLES.md section 6 requires roles read from storage at
-- request time so revocation takes effect immediately (AUTH-13).
--
-- SCOPE, AND WHAT IS DELIBERATELY ABSENT
-- These two tables are the stores identity resolution reads. They are additive:
-- no existing table is altered. Session issuance (login) and revocation endpoints
-- are not part of this migration; rows are written by a future issuance path, and
-- by test fixtures acting as the owner. The application role therefore receives
-- SELECT only: resolution reads, it never mints or revokes.
--
-- ROLES
-- The five values repeat the locked role set (USER-ROLES.md section 1, lifecycle
-- ROLES). Club Officer is not among them: it is not a login role.
-- =============================================================================

CREATE TABLE IF NOT EXISTS erns.user_role (
  -- No ON DELETE action, deliberately: schema.test.ts asserts no FK in the erns schema
  -- cascades, nulls, or defaults on delete (FR-AUD-006 — attribution must survive). Deleting
  -- a user with live roles or sessions is refused; the administrator revokes them first,
  -- which mirrors the USER-ROLES.md rule that revocation with in-flight obligations is
  -- refused or reassigned atomically. A session whose user is gone can never resolve,
  -- because resolution joins app_user.
  user_id UUID NOT NULL REFERENCES erns.app_user (user_id),

  role TEXT NOT NULL
    CONSTRAINT user_role_role_check
    CHECK (role IN ('ADMINISTRATOR', 'EVENT_OFFICER', 'APPROVER', 'STUDENT', 'ATTENDANCE_STAFF')),

  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS erns.session (
  -- SHA-256 hex of the opaque bearer token. The token itself is never stored, so a
  -- read of this table does not yield a credential that can be replayed.
  token_hash TEXT PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES erns.app_user (user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sessions end by expiry or by revocation. Both are evaluated at resolution time.
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS session_user_id_idx ON erns.session (user_id);

-- Resolution reads only. No INSERT, UPDATE or DELETE: issuance and revocation are
-- future paths, and the minimum privilege for this milestone is read access.
GRANT SELECT ON TABLE erns.user_role TO erns_app;
GRANT SELECT ON TABLE erns.session TO erns_app;
