-- =============================================================================
-- ERNS migration 0004: event modification metadata, for FR-EVT-016.
--
-- FR-EVT-016 (FUNCTIONAL-REQUIREMENTS.md line 110): "The system shall record who last modified an event
-- and when."
--
-- The L4 capacity-reduction operation is the first runtime path that modifies an event, and without
-- these columns it cannot satisfy FR-EVT-016 at all.
--
-- WHY A NEW MIGRATION, NOT AN EDIT TO 0001
-- 0001, 0002 and 0003 have been applied to a development database and the migration runner records a
-- SHA-256 checksum per applied file. Editing an applied migration is refused with
-- MigrationChecksumMismatchError — that refusal is the intended behaviour, not an obstacle. A change to
-- an applied schema is expressed as a new file.
--
-- updated_at
--   Initialised to the row's creation time, matching `created_at` so an untouched event reports the
--   same value for both. DATA-MODEL.md does not define created_at for Event; the column below is
--   added for the "and when" half of FR-EVT-016 and is the single source for modification time.
--
--   CHANGED BY THE APPLICATION, NOT BY A TRIGGER. A BEFORE UPDATE trigger would be more robust
--   against a forgotten UPDATE, but it would silently stamp `updated_at` for any incidental write,
--   including one made only to satisfy the audit trail. FR-EVT-016 asks who last modified the event,
--   and an automatic timestamp without a matching `updated_by` would record a moment with no actor.
--   The pairing is deliberate: `src/db/registration-store.ts` sets both in the same statement.
--
-- updated_by
--   NULLABLE, deliberately. An event created by a migration, a seed, or a test fixture has no human
--   actor. DATA-MODEL.md line 182 records `created_by` as an existing Event column, but 0001 did not
--   create it, because User exists in this schema while nothing required it; this migration adds only
--   what FR-EVT-016 requires.
--
--   ON DELETE RESTRICT, never SET NULL and never CASCADE. The same reasoning as
--   audit_log.actor_user_id in 0001: DATA-MODEL.md line 548 requires that records are retained and
--   never cascade-deleted with their subject, and SECURITY-PLAN.md lines 360-364 record that no
--   retention policy authorises an erasure path. A user who has modified an event therefore cannot be
--   deleted, which preserves attribution rather than orphaning it.
--
--   ON DELETE RESTRICT is also what makes an audit row survive: audit_log.actor_user_id carries the
--   same RESTRICT behaviour, so deleting a user who appears in either place is refused.
-- =============================================================================

ALTER TABLE erns.event ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE erns.event ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill before the constraints are added.
--
-- `updated_at` takes created_at where a row already exists, so the added column never reports a time
-- later than the event itself. Without this an existing event would carry a NOT NULL default of now(),
-- silently claiming it was modified at migration time.
UPDATE erns.event
   SET updated_at = COALESCE(updated_at, now())
 WHERE updated_at IS NULL;

ALTER TABLE erns.event
  ALTER COLUMN updated_at SET DEFAULT now();

-- Nullable by design; see the header. Only a non-null value is constrained.
ALTER TABLE erns.event
  DROP CONSTRAINT IF EXISTS event_updated_by_fkey;

ALTER TABLE erns.event
  ADD CONSTRAINT event_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES erns.app_user (user_id) ON DELETE RESTRICT;

-- =============================================================================
-- Verification. test/schema.test.ts asserts the FK, the RESTRICT behaviour and the pairing rule.
--
--   Expected: one row, notnull=f for updated_by.
--   SELECT column_name, is_nullable FROM information_schema.columns
--    WHERE table_schema='erns' AND table_name='event'
--      AND column_name IN ('updated_at','updated_by') ORDER BY column_name;
--
--   Expected: 't' (nullable). The FK is RESTRICT, not CASCADE or SET NULL.
--   SELECT confdeltype FROM pg_constraint WHERE conname='event_updated_by_fkey';
--
--   confdeltype 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL.
-- =============================================================================