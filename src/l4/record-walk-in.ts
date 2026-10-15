/**
 * L4: the standalone walk-in exception use case.
 *
 * ATTENDANCE-WORKFLOW.md section 3.1: a documented exception, not a second
 * registration path. The reason is mandatory, the staff member is attributed,
 * the record is counted separately, it is audited (AUD-15), and it never
 * creates a registration (FR-ATT-018).
 *
 * NO AUTHORIZATION. Role verification belongs to the session layer;
 * `recordedByUserId` records who, it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import { appendAuditRow } from "../db/registration-persistence.js";
import {
  insertWalkInRow,
  readDatabaseNow,
  readWalkInFacts,
} from "../db/attendance-persistence.js";
import { evaluateAttendanceWindow } from "../domain/attendance-window.js";
import type {
  RecordWalkInInput,
  RecordWalkInOutcome,
  RecordWalkInRefusal,
} from "../db/attendance-store.types.js";

/** AUD-15, attendance recorded. AUDIT-PLAN.md line 66. */
const ACTION_WALK_IN_RECORDED = "AUD-15";

function refuse(refusal: RecordWalkInRefusal): never {
  throw new RollbackSignal({ ok: false, refusal });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Record one walk-in.
 *
 * Order of operations inside the transaction:
 *   1. refuse a missing or blank reason (the store cannot hold one either)
 *   2. read the event with its attendance window; refuse when missing
 *   3. refuse outside the configured window
 *   4. write the walk-in row — never a registration (FR-ATT-018)
 *   5. append the AUD-15 audit row
 */
export async function recordWalkIn(
  pool: Pool,
  input: RecordWalkInInput,
): Promise<RecordWalkInOutcome> {
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason === "") {
    // Refused before the transaction: nothing has been written, so there is
    // nothing to roll back. The store CHECK agrees; this refusal names the
    // requirement instead of leaking a constraint.
    return {
      ok: false,
      refusal: {
        reason: "MISSING_REASON",
        message: "A reason is required to record a walk-in",
        requirements: "ATT-12",
      },
    };
  }

  const client = await pool.connect();
  let now: Date;
  try {
    now = await readDatabaseNow(client);
  } finally {
    client.release();
  }

  return withTransaction(
    pool,
    async (txClient: PoolClient): Promise<RecordWalkInOutcome> => {
      const facts = isUuid(input.eventId) ? await readWalkInFacts(txClient, input.eventId) : null;
      if (facts === null) {
        return refuse({
          reason: "EVENT_NOT_FOUND",
          message: "Event not found",
          requirements: "FR-ATT-001",
        });
      }

      const eventStart = new Date(`${facts.eventDate}T${facts.eventStartTime}Z`);
      const window = evaluateAttendanceWindow({
        open: facts.attendanceWindowOpen,
        close: facts.attendanceWindowClose,
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

      const written = await insertWalkInRow(txClient, {
        eventId: facts.eventId,
        recordedByUserId: input.recordedByUserId,
        reason,
        window: window.window,
      });

      await appendAuditRow(txClient, {
        actorUserId: input.recordedByUserId,
        action: ACTION_WALK_IN_RECORDED,
        entityType: "WalkIn",
        entityId: written.walkInId,
        previousState: null,
        newState: {
          event_id: facts.eventId,
          attendance_window: window.window,
          reason,
        },
        reason,
      });

      return {
        ok: true,
        walkInId: written.walkInId,
        eventId: facts.eventId,
        window: window.window,
        recordedAt: written.recordedAt,
      };
    },
    { label: "record-walk-in" },
  );
}
