/**
 * L4: the standalone staff-assisted attendance use case.
 *
 * FR-ATT-001 (REGISTERED only), FR-ATT-002 (storage uniqueness),
 * FR-ATT-003 (CANCELLED refused), FR-ATT-005 (window attribution),
 * FR-ATT-007 (window refusal), FR-ATT-011 (recorder identity), AUD-15.
 *
 * NO AUTHORIZATION. Whether the caller holds the Attendance Staff or
 * Administrator role is decided by the session layer, mirroring
 * `requestedByUserId` in cancel-registration.ts: `recordedByUserId` records
 * who, it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import { appendAuditRow } from "../db/registration-persistence.js";
import {
  insertAttendanceRow,
  readAttendanceFacts,
} from "../db/attendance-persistence.js";
import { evaluateAttendanceWindow } from "../domain/attendance-window.js";
import type {
  RecordAttendanceInput,
  RecordAttendanceOutcome,
  RecordAttendanceRefusal,
} from "../db/attendance-store.types.js";

/** AUD-15, attendance recorded. AUDIT-PLAN.md line 66. */
const ACTION_ATTENDANCE_RECORDED = "AUD-15";

export interface RecordAttendanceFacts {
  /** Injected so the window check is deterministic. Defaults to the database clock. */
  readonly now?: Date;
}

/**
 * Refuse the recording by rolling the transaction back, mirroring
 * cancel-registration.ts: `withTransaction` commits any resolved body, so a
 * plain `return { ok: false }` after a write would commit it.
 */
function refuse(refusal: RecordAttendanceRefusal): never {
  throw new RollbackSignal({ ok: false, refusal });
}

/** A registration id that is not a UUID can never name a row. Reported as not found. */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Record one staff-assisted attendance.
 *
 * Order of operations inside the transaction:
 *   1. read the registration with its event window and any existing row
 *   2. refuse when the row is missing
 *   3. refuse when the registration is CANCELLED
 *   4. refuse outside the configured window
 *   5. write the row; refuse when a concurrent record won the race
 *   6. append the AUD-15 audit row
 */
export async function recordAttendance(
  pool: Pool,
  input: RecordAttendanceInput,
  facts: RecordAttendanceFacts = {},
): Promise<RecordAttendanceOutcome> {
  let effectiveNow = facts.now;
  if (effectiveNow === undefined) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ now: Date }>("SELECT now() AS now");
      effectiveNow = rows[0]?.now ?? new Date();
    } finally {
      client.release();
    }
  }
  const now = effectiveNow;

  return withTransaction(
    pool,
    async (client: PoolClient): Promise<RecordAttendanceOutcome> => {
      // STEP 1. Read the row with its window and any existing attendance.
      const row = isUuid(input.registrationId)
        ? await readAttendanceFacts(client, input.registrationId)
        : null;
      if (row === null) {
        return refuse({
          reason: "REGISTRATION_NOT_FOUND",
          message: "Registration not found",
          requirements: "FR-ATT-001",
        });
      }

      // STEP 2. A CANCELLED registration can never gain attendance (FR-ATT-003).
      if (row.status !== "REGISTERED") {
        return refuse({
          reason: "CANCELLED_REGISTRATION",
          message: `Registration is ${row.status}; attendance requires a REGISTERED registration`,
          requirements: "FR-ATT-003",
        });
      }

      // STEP 3. The window check, over the pure domain evaluator. The event
      // start is derived from the stored event_date and start_time so the
      // attribution observes the same snapshot as the write.
      const eventStart = new Date(`${row.eventDate}T${row.eventStartTime}Z`);
      const window = evaluateAttendanceWindow({
        open: row.attendanceWindowOpen,
        close: row.attendanceWindowClose,
        now,
        eventStart,
      });
      if (!window.ok) {
        return refuse({
          reason: window.reason,
          message:
            window.reason === "WINDOW_NOT_CONFIGURED"
              ? "The event has no configured attendance window"
              : "Attendance is outside all configured windows",
          requirements: "FR-ATT-007",
        });
      }

      // STEP 4. Already recorded: the friendly pre-read refusal. A concurrent
      // record that commits between this read and the insert collides on the
      // UNIQUE below instead.
      if (row.attendanceExists) {
        return refuse({
          reason: "ALREADY_RECORDED",
          message: "Attendance is already recorded for this registration",
          requirements: "FR-ATT-002",
        });
      }

      // STEP 5. Write. `insertAttendanceRow` reports the UNIQUE collision
      // rather than throwing it, so the race path refuses identically.
      const written = await insertAttendanceRow(client, {
        registrationId: row.registrationId,
        userId: row.userId,
        eventId: row.eventId,
        recordedByUserId: input.recordedByUserId,
        window: window.window,
      });
      if (!written.inserted || written.attendanceId === null || written.recordedAt === null) {
        return refuse({
          reason: "ALREADY_RECORDED",
          message: "Attendance is already recorded for this registration",
          requirements: "FR-ATT-002",
        });
      }

      // STEP 6. AUD-15, in the same transaction: FAIL-05 forbids a state
      // change whose audit entry fails, and the transaction makes that atomic.
      await appendAuditRow(client, {
        actorUserId: input.recordedByUserId,
        action: ACTION_ATTENDANCE_RECORDED,
        entityType: "Attendance",
        entityId: written.attendanceId,
        previousState: null,
        newState: {
          registration_id: row.registrationId,
          present: true,
          method: "STAFF_ASSISTED",
          attendance_window: window.window,
        },
      });

      return {
        ok: true,
        attendanceId: written.attendanceId,
        registrationId: row.registrationId,
        eventId: row.eventId,
        userId: row.userId,
        window: window.window,
        recordedAt: written.recordedAt,
      };
    },
    { label: "record-attendance" },
  );
}
