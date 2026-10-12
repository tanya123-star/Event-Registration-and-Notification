-- =============================================================================
-- ERNS migration 0003: tighten the cancellation-consistency constraint.
--
-- Why a separate migration, when 0001 could simply have said this: 0001 and 0002 have already been
-- applied to a development database, and the runner records a checksum per applied file. Editing
-- 0001 would be refused by MigrationChecksumMismatchError — which is the intended behaviour. The
-- runner is forward-only, so a change to an applied schema is a new migration.
--
-- THE DEFECT IN 0001
-- registration_cancellation_fields_check read:
--
--     CHECK (
--       (status = 'CANCELLED' AND cancelled_at IS NOT NULL
--                 AND cancellation_reason IS NOT NULL AND btrim(cancellation_reason) <> '')
--       OR
--       (status = 'REGISTERED')
--     )
--
-- The REGISTERED branch is true for EVERY active registration, whatever its cancellation columns
-- contain. A row with status 'REGISTERED' and a populated `cancelled_at` therefore satisfied the
-- constraint — a half-cancelled row, which is exactly what the constraint was documented to prevent.
-- The intent stated in 0001's comment was not what the SQL expressed.
--
-- The fix requires the cancellation state to be all-or-nothing and to agree with `status`:
--   - CANCELLED requires cancelled_at, a non-blank reason, and cancelled_by.
--   - REGISTERED requires all three to be NULL.
--
-- DATA-MODEL.md line 386 gives `cancelled_at` as "Timestamp when cancelled", so a non-null value on an
-- active row contradicts the attribute definition. Line 401 requires the fields when cancelled. Line
-- 402 requires that cancellation never deletes a row or clears its other fields, which the REGISTERED
-- branch preserves.
-- =============================================================================

ALTER TABLE erns.registration
  DROP CONSTRAINT IF EXISTS registration_cancellation_fields_check;

-- `cancelled_by_present_check` is subsumed: the CANCELLED branch below requires cancelled_by, and the
-- REGISTERED branch requires it to be NULL. Dropping it rather than leaving two constraints covering
-- the same column with different rules.
ALTER TABLE erns.registration
  DROP CONSTRAINT IF EXISTS registration_cancelled_by_present_check;

ALTER TABLE erns.registration
  ADD CONSTRAINT registration_cancellation_fields_check CHECK (
    (
      status = 'CANCELLED'
      AND cancelled_at IS NOT NULL
      AND cancellation_reason IS NOT NULL
      AND btrim(cancellation_reason) <> ''
      AND cancelled_by IS NOT NULL
    )
    OR
    (
      status = 'REGISTERED'
      AND cancelled_at IS NULL
      AND cancellation_reason IS NULL
      AND cancelled_by IS NULL
    )
  );

-- Verification for a human. test/schema.test.ts asserts both directions of this constraint.
--
--   Expected: 0 rows. An active row with cancellation state.
--   SELECT count(*) FROM erns.registration
--    WHERE status = 'REGISTERED' AND (cancelled_at IS NOT NULL OR cancellation_reason IS NOT NULL);
--
--   Expected: 0 rows. A cancelled row missing any part of its cancellation state.
--   SELECT count(*) FROM erns.registration
--    WHERE status = 'CANCELLED'
--      AND (cancelled_at IS NULL OR cancellation_reason IS NULL OR btrim(coalesce(cancellation_reason,'')) = '');