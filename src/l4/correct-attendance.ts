/**
 * L4: the audited Administrator data-fix correction path (MVP story 36).
 *
 * FR-ATT-014 (staff or Administrator corrects with a reason), FR-ATT-015
 * (original, corrector, timestamp and reason retained), AUD-16. In-app
 * corrections are prohibited: this use case plus its single handler-core
 * operation is the only correction surface, and role gating (FR-ATT-016)
 * lives in that operation, not here.
 *
 * NO AUTHORIZATION. `correctedByUserId` records who, it decides nothing.
 */

import type { Pool, PoolClient } from "pg";

import { RollbackSignal, withTransaction } from "../db/client.js";
import { appendAuditRow } from "../db/registration-persistence.js";
import {
  readAttendanceById,
  updateAttendanceCorrection,
} from "../db/attendance-persistence.js";
import type {
  CorrectAttendanceInput,
  CorrectAttendanceOutcome,
  CorrectAttendanceRefusal,
} from "../db/attendance-store.types.js";

/** AUD-16, attendance corrected. AUDIT-PLAN.md line 67. */
const ACTION_ATTENDANCE_CORRECTED = "AUD-16";

function refuse(refusal: CorrectAttendanceRefusal): never {
  throw new RollbackSignal({ ok: false, refusal });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Correct one attendance record.
 *
 * Order of operations inside the transaction:
 *   1. refuse a missing or blank reason (nothing written yet)
 *   2. read the row; refuse when missing
 *   3. refuse when already corrected — history is not rewritten
 *   4. write the correction; refuse when the row changed underneath the read
 *   5. append the AUD-16 audit row carrying previous and new values
 */
export async function correctAttendance(
  pool: Pool,
  input: CorrectAttendanceInput,
): Promise<CorrectAttendanceOutcome> {
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason === "") {
    return {
      ok: false,
      refusal: {
        reason: "MISSING_REASON",
        message: "A reason is required to correct an attendance record",
        requirements: "FR-ATT-015",
      },
    };
  }

  return withTransaction(
    pool,
    async (client: PoolClient): Promise<CorrectAttendanceOutcome> => {
      const row = isUuid(input.attendanceId)
        ? await readAttendanceById(client, input.attendanceId)
        : null;
      if (row === null) {
        return refuse({
          reason: "ATTENDANCE_NOT_FOUND",
          message: "Attendance record not found",
          requirements: "FR-ATT-015",
        });
      }
      if (row.correctedAt !== null) {
        return refuse({
          reason: "ALREADY_CORRECTED",
          message: "Attendance has already been corrected; history is not rewritten",
          requirements: "FR-ATT-015",
        });
      }

      const corrected = await updateAttendanceCorrection(client, {
        attendanceId: row.attendanceId,
        correctedByUserId: input.correctedByUserId,
        reason,
        present: input.present,
      });
      if (!corrected.corrected || corrected.correctedAt === null) {
        return refuse({
          reason: "ALREADY_CORRECTED",
          message: "Attendance changed state during the correction",
          requirements: "FR-ATT-015",
        });
      }

      await appendAuditRow(client, {
        actorUserId: input.correctedByUserId,
        action: ACTION_ATTENDANCE_CORRECTED,
        entityType: "Attendance",
        entityId: row.attendanceId,
        previousState: { present: row.present },
        newState: {
          present: input.present,
          correction_reason: reason,
          corrected_by: input.correctedByUserId,
          corrected_at: corrected.correctedAt.toISOString(),
        },
        reason,
      });

      return {
        ok: true,
        attendanceId: row.attendanceId,
        present: input.present,
        correctedAt: corrected.correctedAt,
      };
    },
    { label: "correct-attendance" },
  );
}
