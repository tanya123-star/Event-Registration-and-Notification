/**
 * Persistence primitives for attendance and walk-ins.
 *
 * L2. Constructs queries, reads rows, writes rows. Decides nothing:
 * registration status, window membership and correction policy are judged in
 * `src/l4/`. Every fact a decision needs is read inside the caller's
 * transaction, mirroring `registration-persistence.ts`.
 */

import type { PoolClient } from "pg";

import { UNIQUE_VIOLATION } from "./client.js";
import type { AttendanceWindowLabel } from "../domain/attendance-window.js";

/** Read the database clock. L2 owns all query text (SYSTEM-ARCHITECTURE.md 2.1). */
export async function readDatabaseNow(client: PoolClient): Promise<Date> {
  const { rows } = await client.query<{ now: Date }>("SELECT now() AS now");
  return rows[0]?.now ?? new Date();
}

/** One registration with the facts an attendance decision needs. */
export interface AttendanceFacts {
  readonly registrationId: string;
  readonly userId: string;
  readonly eventId: string;
  readonly status: string;
  readonly attendanceWindowOpen: Date | null;
  readonly attendanceWindowClose: Date | null;
  readonly eventDate: string;
  readonly eventStartTime: string;
  readonly attendanceExists: boolean;
}

/**
 * Read one registration with its event's attendance window and any existing
 * attendance row.
 *
 * MUST be called inside the same transaction as the recording write: the
 * insert re-checks uniqueness at the store, and the window facts must agree
 * with the state the write observes.
 */
export async function readAttendanceFacts(
  client: PoolClient,
  registrationId: string,
): Promise<AttendanceFacts | null> {
  const { rows } = await client.query<{
    registration_id: string;
    user_id: string;
    event_id: string;
    status: string;
    attendance_window_open: Date | null;
    attendance_window_close: Date | null;
    event_date: string;
    start_time: string;
    attendance_exists: boolean;
  }>(
    `SELECT r.registration_id, r.user_id, r.event_id, r.status,
            e.attendance_window_open, e.attendance_window_close,
            e.event_date::text AS event_date, e.start_time::text AS start_time,
            EXISTS (SELECT 1 FROM erns.attendance a
                     WHERE a.registration_id = r.registration_id) AS attendance_exists
       FROM erns.registration r
       JOIN erns.event e ON e.event_id = r.event_id
      WHERE r.registration_id = $1`,
    [registrationId],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    registrationId: row.registration_id,
    userId: row.user_id,
    eventId: row.event_id,
    status: row.status,
    attendanceWindowOpen: row.attendance_window_open,
    attendanceWindowClose: row.attendance_window_close,
    eventDate: row.event_date,
    eventStartTime: row.start_time,
    attendanceExists: row.attendance_exists,
  };
}

export interface AttendanceRowInput {
  readonly registrationId: string;
  readonly userId: string;
  readonly eventId: string;
  readonly recordedByUserId: string;
  readonly window: AttendanceWindowLabel;
}

/**
 * Insert one attendance row.
 *
 * Returns `inserted: false` when the registration already has a row: the
 * UNIQUE on `registration_id` refused despite the pre-read passing, which is
 * the concurrent-duplicate path. Any other error propagates.
 */
export async function insertAttendanceRow(
  client: PoolClient,
  input: AttendanceRowInput,
): Promise<{ inserted: boolean; attendanceId: string | null; recordedAt: Date | null }> {
  try {
    const { rows } = await client.query<{ attendance_id: string; recorded_at: Date }>(
      `INSERT INTO erns.attendance
         (registration_id, user_id, event_id, present, recorded_by, method, attendance_window)
       VALUES ($1, $2, $3, TRUE, $4, 'STAFF_ASSISTED', $5)
       RETURNING attendance_id, recorded_at`,
      [input.registrationId, input.userId, input.eventId, input.recordedByUserId, input.window],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error("insertAttendanceRow returned no row");
    }
    return { inserted: true, attendanceId: row.attendance_id, recordedAt: row.recorded_at };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: unknown }).code === UNIQUE_VIOLATION) {
        return { inserted: false, attendanceId: null, recordedAt: null };
      }
    }
    throw error;
  }
}

/** One event with its attendance window facts for a walk-in decision. */
export interface WalkInFacts {
  readonly eventId: string;
  readonly attendanceWindowOpen: Date | null;
  readonly attendanceWindowClose: Date | null;
  readonly eventDate: string;
  readonly eventStartTime: string;
}

export async function readWalkInFacts(
  client: PoolClient,
  eventId: string,
): Promise<WalkInFacts | null> {
  const { rows } = await client.query<{
    event_id: string;
    attendance_window_open: Date | null;
    attendance_window_close: Date | null;
    event_date: string;
    start_time: string;
  }>(
    `SELECT event_id,
            attendance_window_open, attendance_window_close,
            event_date::text AS event_date, start_time::text AS start_time
       FROM erns.event
      WHERE event_id = $1`,
    [eventId],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    eventId: row.event_id,
    attendanceWindowOpen: row.attendance_window_open,
    attendanceWindowClose: row.attendance_window_close,
    eventDate: row.event_date,
    eventStartTime: row.start_time,
  };
}

export interface WalkInRowInput {
  readonly eventId: string;
  readonly recordedByUserId: string;
  readonly reason: string;
  readonly window: AttendanceWindowLabel;
}

export async function insertWalkInRow(
  client: PoolClient,
  input: WalkInRowInput,
): Promise<{ walkInId: string; recordedAt: Date }> {
  const { rows } = await client.query<{ walk_in_id: string; recorded_at: Date }>(
    `INSERT INTO erns.walk_in (event_id, recorded_by, reason, attendance_window)
     VALUES ($1, $2, $3, $4)
     RETURNING walk_in_id, recorded_at`,
    [input.eventId, input.recordedByUserId, input.reason, input.window],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error("insertWalkInRow returned no row");
  }
  return { walkInId: row.walk_in_id, recordedAt: row.recorded_at };
}

export interface AttendanceCorrectionInput {
  readonly attendanceId: string;
  readonly correctedByUserId: string;
  readonly reason: string;
  readonly present: boolean;
}

/** One attendance row with the facts a correction decision needs. */
export interface AttendanceRowFacts {
  readonly attendanceId: string;
  readonly present: boolean;
  readonly correctedAt: Date | null;
}

export async function readAttendanceById(
  client: PoolClient,
  attendanceId: string,
): Promise<AttendanceRowFacts | null> {
  const { rows } = await client.query<{
    attendance_id: string;
    present: boolean;
    corrected_at: Date | null;
  }>(
    `SELECT attendance_id, present, corrected_at
       FROM erns.attendance
      WHERE attendance_id = $1`,
    [attendanceId],
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  return { attendanceId: row.attendance_id, present: row.present, correctedAt: row.corrected_at };
}

/**
 * Apply one audited correction.
 *
 * The `AND corrected_at IS NULL` predicate refuses a second correction over
 * the first: a corrected record is terminal in the MVP, so history cannot be
 * rewritten one fix at a time. Returns whether the row was updated.
 */
export async function updateAttendanceCorrection(
  client: PoolClient,
  input: AttendanceCorrectionInput,
): Promise<{ corrected: boolean; correctedAt: Date | null }> {
  const { rowCount, rows } = await client.query<{ corrected_at: Date }>(
    `UPDATE erns.attendance
        SET present = $2,
            correction_reason = $3,
            corrected_by = $4,
            corrected_at = now(),
            method = 'CORRECTION'
      WHERE attendance_id = $1 AND corrected_at IS NULL
      RETURNING corrected_at`,
    [input.attendanceId, input.present, input.reason, input.correctedByUserId],
  );
  return { corrected: (rowCount ?? 0) === 1, correctedAt: rows[0]?.corrected_at ?? null };
}

/** FR-ATT-017 live counts for one event. Walk-ins counted apart, always. */
export async function readAttendanceCounts(
  client: PoolClient,
  eventId: string,
): Promise<{ registered: number; present: number; walkIns: number }> {
  const { rows } = await client.query<{ registered: number; present: number; walk_ins: number }>(
    `SELECT (SELECT count(*)::int FROM erns.registration r
              WHERE r.event_id = $1 AND r.status = 'REGISTERED') AS registered,
            (SELECT count(*)::int FROM erns.attendance a
              WHERE a.event_id = $1 AND a.present) AS present,
            (SELECT count(*)::int FROM erns.walk_in w
              WHERE w.event_id = $1) AS walk_ins`,
    [eventId],
  );
  const row = rows[0];
  return {
    registered: row?.registered ?? 0,
    present: row?.present ?? 0,
    walkIns: row?.walk_ins ?? 0,
  };
}

/**
 * Staff lookup for one assigned event: name plus Confirmation reference only
 * (ADR-0001). The session layer supplies the assigned event id; this function
 * reads it and nothing else.
 */
export async function lookupParticipants(
  client: PoolClient,
  eventId: string,
  query: string,
): Promise<
  {
    registrationId: string;
    displayName: string;
    confirmationReference: string;
    status: string;
    attendanceRecorded: boolean;
  }[]
> {
  const { rows } = await client.query<{
    registration_id: string;
    display_name: string;
    confirmation_reference: string;
    status: string;
    attendance_recorded: boolean;
  }>(
    `SELECT r.registration_id, u.display_name, r.confirmation_reference, r.status,
            EXISTS (SELECT 1 FROM erns.attendance a
                     WHERE a.registration_id = r.registration_id) AS attendance_recorded
       FROM erns.registration r
       JOIN erns.app_user u ON u.user_id = r.user_id
      WHERE r.event_id = $1
        AND (u.display_name ILIKE '%' || $2 || '%' OR r.confirmation_reference = $2)
      ORDER BY u.display_name, r.registered_at`,
    [eventId, query],
  );
  return rows.map((row) => ({
    registrationId: row.registration_id,
    displayName: row.display_name,
    confirmationReference: row.confirmation_reference,
    status: row.status,
    attendanceRecorded: row.attendance_recorded,
  }));
}
