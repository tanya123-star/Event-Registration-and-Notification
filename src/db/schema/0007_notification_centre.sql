-- =============================================================================
-- ERNS migration 0007: Notification centre stores (MVP T5, issue #6).
--
-- Source: DATA-MODEL.md sections 2.9-2.10, issue #6, NOTIFICATION-WORKFLOW.md
-- sections 3-4. 0001 deferred these tables while OQ-56 left the email state
-- count undecided; the four-state email model is now the locked decision
-- (src/domain/email-state.ts: QUEUED, SENT, FAILED, BOUNCED — Delivered and
-- Opened must never exist, FR-NOT-004), so this migration creates both tables.
--
-- SCOPE, AND WHAT IS DELIBERATELY ABSENT
-- Two tables only: Notification (the authored message with the audience
-- definition as issued, FR-NOT-013) and NotificationRecipient (one addressed
-- record per Student per dispatch, FR-NOT-014). No existing table is altered.
-- No Announcement table: the announcement origin is an optional TEXT
-- reference, not a foreign key, because Announcement is outside this
-- milestone's scope and a foreign key to a non-existent table cannot be
-- created (same reasoning as organizer_org_id in 0001).
-- No notification_type constraint: the ten types in NOTIFICATION-WORKFLOW.md
-- section 5 await Council confirmation (exit criteria), so any CHECK here
-- would invent a closed enumeration no source has locked.
-- The cross-table rule "acknowledged_at requires requires_acknowledgement"
-- (DATA-MODEL.md line 359) cannot be a CHECK: it reads the parent row. It is
-- enforced by the L4 dispatch/acknowledge path over
-- src/domain/notification-state.ts, the same placement 0006 records for the
-- role-profile invariant. In-app advance-only (CREATED to READ to
-- ACKNOWLEDGED) is likewise an application rule over that module; the store
-- constrains the value domain, not the path.
-- Email NOT_REQUESTED is deliberately NOT a state: it appears only in
-- FR-NOT-003 and DATA-MODEL.md section 2.10, and the locked four-state
-- decision (OQ-56) is what this migration enforces. A recipient with
-- email_requested FALSE keeps email_state QUEUED (attempt never scheduled);
-- the send path never transitions such a row.
--
-- ADDITIVE AND LEAST-PRIVILEGE. No existing table is altered. The application
-- role receives SELECT and INSERT on Notification (dispatch writes, reads
-- follow) and SELECT, INSERT and UPDATE on NotificationRecipient (dispatch
-- writes, the Student advances in-app state, the send path advances email
-- state). No DELETE: in-app records are never deleted (NOTIFICATION-WORKFLOW.md
-- section 12 — a correction is a new dispatch, never a removal). No grant
-- touches any other table. Ownership is erns_owner (NOLOGIN), consistent
-- with 0001.
--
-- ON DELETE behaviour: the default (NO ACTION). schema.test.ts asserts no FK in
-- the erns schema cascades, nulls, or defaults on delete (FR-AUD-006), so no
-- ON DELETE clause is written here; the default is the assertion. A user or
-- notification with live recipients cannot be deleted; the administrator
-- revokes or retains first.
-- =============================================================================

CREATE TABLE IF NOT EXISTS erns.notification (
  -- UUID, for the same reason as app_user.user_id in 0001: non-enumerable.
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional reference to Announcement (DATA-MODEL.md line 311). TEXT, not a
  -- foreign key: Announcement does not exist in this schema.
  announcement_id TEXT,

  -- Optional reference to Event (DATA-MODEL.md line 312). Event-scoped
  -- notices carry it; system-wide announcements leave it NULL.
  related_event_id UUID REFERENCES erns.event (event_id),

  -- DATA-MODEL.md line 313: the type from NOTIFICATION-WORKFLOW.md section 5.
  -- Unconstrained TEXT until the Council confirms the ten types.
  notification_type TEXT NOT NULL
    CONSTRAINT notification_type_check
    CHECK (btrim(notification_type) <> ''),

  -- DATA-MODEL.md lines 314-315. Required; an empty body is refused
  -- (FR-NOT-016). No source specifies a maximum length, so none is invented.
  title TEXT NOT NULL
    CONSTRAINT notification_title_check
    CHECK (btrim(title) <> ''),
  body TEXT NOT NULL
    CONSTRAINT notification_body_check
    CHECK (btrim(body) <> ''),

  -- DATA-MODEL.md line 316. Three values, enforced here.
  priority TEXT NOT NULL
    CONSTRAINT notification_priority_check
    CHECK (priority IN ('NORMAL', 'HIGH', 'IMPORTANT')),

  -- DATA-MODEL.md line 317. True exactly when priority is IMPORTANT
  -- (FR-NOT-006). Stored, not derived, so the dispatch-time requirement is
  -- reconstructable for audit even if the priority vocabulary ever changes.
  requires_acknowledgement BOOLEAN NOT NULL
    CONSTRAINT notification_ack_coupling_check
    CHECK (requires_acknowledgement = (priority = 'IMPORTANT')),

  -- DATA-MODEL.md line 318 and FR-NOT-013: the targeting rule evaluated at
  -- dispatch, frozen as issued, never re-evaluated (NFR-INTEG-012, DATA-19).
  -- JSONB without a shape constraint: the audience structure is defined in
  -- NOTIFICATION-WORKFLOW.md section 6 and evaluated by the pure evaluator in
  -- src/domain/audience.ts. NULL means "all students" (FR-NOT-017).
  audience_definition JSONB,

  -- DATA-MODEL.md line 319: whether an email attempt is made in addition to
  -- in-app. Email is a delivery layer only; the in-app record is created
  -- first and unconditionally (FR-NOT-005).
  email_requested BOOLEAN NOT NULL DEFAULT TRUE,

  -- DATA-MODEL.md line 320. Nullable: a system-initiated dispatch has no
  -- author, mirroring audit_log.actor_user_id (DATA-MODEL.md line 528).
  created_by UUID REFERENCES erns.app_user (user_id),

  -- DATA-MODEL.md lines 321-322.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erns.notification_recipient (
  -- UUID, for the same reason as notification_id above.
  recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- DATA-MODEL.md lines 343-344. Both required: an orphan recipient reads as
  -- addressed to nobody (DATA-MODEL.md line 591).
  notification_id UUID NOT NULL REFERENCES erns.notification (notification_id),
  user_id UUID NOT NULL REFERENCES erns.app_user (user_id),

  -- DATA-MODEL.md line 345 and FR-NOT-002: the in-app source of truth.
  -- Three values; the advance path (CREATED to READ to ACKNOWLEDGED) is
  -- enforced by the application over src/domain/notification-state.ts.
  in_app_state TEXT NOT NULL DEFAULT 'CREATED'
    CONSTRAINT notification_recipient_in_app_check
    CHECK (in_app_state IN ('CREATED', 'READ', 'ACKNOWLEDGED')),

  -- DATA-MODEL.md line 346 and FR-NOT-003 as locked: the four email states.
  -- No Delivered, no Opened, no NOT_REQUESTED (FR-NOT-004). Transitions follow
  -- src/domain/email-state.ts; FR-NOT-005 (email failure never removes the
  -- in-app record) holds by construction — this column cannot touch
  -- in_app_state.
  email_state TEXT NOT NULL DEFAULT 'QUEUED'
    CONSTRAINT notification_recipient_email_check
    CHECK (email_state IN ('QUEUED', 'SENT', 'FAILED', 'BOUNCED')),

  -- DATA-MODEL.md lines 347-348. Failure detail is sanitised by the send path;
  -- per-recipient email detail is Administrator-only (FR-NOT-047, ADR-0001).
  email_attempted_at TIMESTAMPTZ,
  email_error TEXT,

  -- DATA-MODEL.md lines 349-350. FR-NOT-007 records user, notification and
  -- timestamp: the user and notification are this row's keys, the timestamp
  -- is acknowledged_at. FR-NOT-009: acknowledgement requires a prior read,
  -- enforced here so a skipped READ is unwritable at the store.
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  CONSTRAINT notification_recipient_ack_requires_read_check
    CHECK (acknowledged_at IS NULL OR read_at IS NOT NULL),

  -- DATA-MODEL.md line 351: optional student comment on acknowledgement.
  acknowledgement_note TEXT,

  -- DATA-MODEL.md line 358 and FR-NOT-014: one recipient record per student
  -- per notification. The retry-after-interruption path (NOTIFICATION-WORKFLOW.md
  -- section 12) creates only missing rows because present rows collide here.
  CONSTRAINT notification_recipient_unique_per_dispatch UNIQUE (notification_id, user_id)
);

-- The student feed reads one student's records with their notification
-- (FR-NOT-036, most recent first); dispatch reads one notification's
-- recipients for the officer counts (FR-NOT-045, FR-NOT-046).
CREATE INDEX IF NOT EXISTS notification_recipient_user_idx
  ON erns.notification_recipient (user_id);
CREATE INDEX IF NOT EXISTS notification_recipient_notification_idx
  ON erns.notification_recipient (notification_id);

ALTER TABLE erns.notification OWNER TO erns_owner;
ALTER TABLE erns.notification_recipient OWNER TO erns_owner;

REVOKE ALL ON TABLE erns.notification, erns.notification_recipient FROM PUBLIC;

-- Dispatch writes notifications and reads them back; it never updates or
-- deletes an authored message (corrections are new dispatches, AUD-18).
GRANT SELECT, INSERT ON TABLE erns.notification TO erns_app;
-- Dispatch writes recipients, the Student advances in-app state, the send
-- path advances email state. Nothing deletes a recipient (FR-NOT-005).
GRANT SELECT, INSERT, UPDATE ON TABLE erns.notification_recipient TO erns_app;

-- =============================================================================
-- Verification.
--
--   Expected: two tables; UNIQUE on (notification_id, user_id); FKs with
--   NO ACTION (FR-AUD-006 — the schema.test.ts "no cascade" assertion).
--   SELECT tc.table_name, tc.constraint_name, rc.delete_rule
--     FROM information_schema.referential_constraints rc
--     JOIN information_schema.table_constraints tc USING (constraint_schema, constraint_name)
--    WHERE tc.table_schema = 'erns'
--      AND tc.table_name IN ('notification', 'notification_recipient');
--
--   Expected: SELECT, INSERT for erns_app on notification;
--   SELECT, INSERT, UPDATE on notification_recipient; nothing for PUBLIC.
--   SELECT grantee, privilege_type FROM information_schema.role_table_grants
--    WHERE table_schema = 'erns'
--      AND table_name IN ('notification', 'notification_recipient')
--    ORDER BY grantee, privilege_type;
-- =============================================================================
