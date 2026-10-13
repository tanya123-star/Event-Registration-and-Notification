/**
 * MVP T7 (issue #8) — audited Administrator data-fix correction.
 *
 * Seams under test (per the tdd skill; agreed via the directive):
 *   - L4 correctAttendance (real storage): the mandatory reason, the
 *     AUD-16 audit with previous and new values, and the single-correction
 *     terminal rule.
 *   - handler-core correctAttendanceOperation (real storage): the role gate
 *     (Administrator and Attendance Staff correct; Event Officer refused per
 *     FR-ATT-016) and the refusal-to-status mapping.
 *
 * Vocabulary per GLOSSARY.md: Attendance, Event Officer, Administrator,
 * Attendance Staff.
 *
 * MVP story 36: the audited data-fix path for wrong Attendance records, with
 * in-app corrections prohibited — this L4 path plus its single handler-core
 * operation IS that path. There is no other correction surface.
 *
 * REQUIRES POSTGRESQL. Skipped explicitly when the URL variables are unset.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";

import {
  applyMigrationsOnce,
  createAppPoolForTests,
  createOwnerPoolForTests,
  isDatabaseConfigured,
  seedEvent,
  seedRegistration,
  seedUser,
  skipReason,
  truncateAll,
} from "./db-harness.js";
import { recordAttendance } from "../src/l4/record-attendance.js";
import { correctAttendance } from "../src/l4/correct-attendance.js";
import type { AuthenticatedActor } from "../src/app/api/_lib/operations.js";
import { correctAttendanceOperation } from "../src/app/api/_lib/operations.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/correct-attendance.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("audited attendance correction, real PostgreSQL", () => {
  let appPool: Pool;
  let ownerPool: Pool;

  beforeAll(async () => {
    appPool = createAppPoolForTests();
    ownerPool = createOwnerPoolForTests();
    await applyMigrationsOnce(ownerPool);
  });

  beforeEach(async () => {
    await truncateAll(ownerPool);
  });

  afterAll(async () => {
    await appPool?.end();
    await ownerPool?.end();
  });

  function actor(userId: string, roles: AuthenticatedActor["roles"] = ["ADMINISTRATOR"]): AuthenticatedActor {
    return { userId, accountStatus: "ACTIVE", roles };
  }

  function patch(path: string, body: unknown): Request {
    return new Request(`http://test${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function seedRecorded(): Promise<{ attendanceId: string; staffId: string; adminId: string }> {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const adminId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await ownerPool.query(
      `UPDATE erns.event
          SET attendance_window_open = now() - interval '1 hour',
              attendance_window_close = now() + interval '5 hours'
        WHERE event_id = $1`,
      [eventId],
    );
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });
    const recorded = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    if (!recorded.ok) {
      throw new Error("expected recording to succeed");
    }
    return { attendanceId: recorded.attendanceId, staffId, adminId };
  }

  it("corrects a record with a reason, retaining corrector, timestamp and method", async () => {
    const { attendanceId, adminId } = await seedRecorded();

    const outcome = await correctAttendance(appPool, {
      attendanceId,
      correctedByUserId: adminId,
      reason: "Wrong participant marked",
      present: false,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.attendanceId).toBe(attendanceId);
    expect(outcome.present).toBe(false);

    const { rows } = await appPool.query<{
      present: boolean;
      method: string;
      correction_reason: string;
      corrected_by: string;
      corrected_at: Date;
    }>(
      `SELECT present, method, correction_reason, corrected_by, corrected_at
         FROM erns.attendance WHERE attendance_id = $1`,
      [attendanceId],
    );
    expect(rows[0]).toMatchObject({
      present: false,
      method: "CORRECTION",
      correction_reason: "Wrong participant marked",
      corrected_by: adminId,
    });
    expect(rows[0]?.corrected_at).toBeInstanceOf(Date);
  });

  it("refuses a reasonless correction and writes nothing", async () => {
    const { attendanceId, adminId } = await seedRecorded();

    for (const reason of [undefined, "", "   "]) {
      const outcome = await correctAttendance(appPool, {
        attendanceId,
        correctedByUserId: adminId,
        reason: reason as string | undefined,
        present: false,
      });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("MISSING_REASON");
      }
    }
    const { rows } = await appPool.query<{ corrected_at: Date | null }>(
      `SELECT corrected_at FROM erns.attendance WHERE attendance_id = $1`,
      [attendanceId],
    );
    expect(rows[0]?.corrected_at).toBeNull();
  });

  it("refuses a second correction: history is not rewritten", async () => {
    const { attendanceId, adminId } = await seedRecorded();

    const first = await correctAttendance(appPool, {
      attendanceId,
      correctedByUserId: adminId,
      reason: "First fix",
      present: false,
    });
    expect(first.ok).toBe(true);

    const second = await correctAttendance(appPool, {
      attendanceId,
      correctedByUserId: adminId,
      reason: "Second fix",
      present: true,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.refusal.reason).toBe("ALREADY_CORRECTED");
    }
  });

  it("writes an AUD-16 audit row carrying previous and new values", async () => {
    const { attendanceId, adminId } = await seedRecorded();

    const outcome = await correctAttendance(appPool, {
      attendanceId,
      correctedByUserId: adminId,
      reason: "Wrong participant marked",
      present: false,
    });
    expect(outcome.ok).toBe(true);

    const { rows } = await appPool.query<{
      actor_user_id: string;
      action: string;
      previous_state: { present: boolean };
      new_state: { present: boolean };
      reason: string;
    }>(
      `SELECT actor_user_id, action, previous_state, new_state, reason
         FROM erns.audit_log WHERE action = 'AUD-16'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actor_user_id).toBe(adminId);
    expect(rows[0]?.previous_state).toMatchObject({ present: true });
    expect(rows[0]?.new_state).toMatchObject({ present: false });
    expect(rows[0]?.reason).toBe("Wrong participant marked");
  });

  it("refuses an Event Officer correction over the handler core with 403 (FR-ATT-016)", async () => {
    const { attendanceId } = await seedRecorded();
    const officerId = await seedUser(ownerPool);

    const response = await correctAttendanceOperation(
      appPool,
      actor(officerId, ["EVENT_OFFICER"]),
      patch(`/api/v1/attendance/${attendanceId}/correction`, { reason: "Flattering fix", present: false }),
      attendanceId,
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ROLE_NOT_PERMITTED");

    const { rows } = await appPool.query<{ corrected_at: Date | null }>(
      `SELECT corrected_at FROM erns.attendance WHERE attendance_id = $1`,
      [attendanceId],
    );
    expect(rows[0]?.corrected_at).toBeNull();
  });

  it("admits an Administrator correction over the handler core with 200", async () => {
    const { attendanceId, adminId } = await seedRecorded();

    const response = await correctAttendanceOperation(
      appPool,
      actor(adminId, ["ADMINISTRATOR"]),
      patch(`/api/v1/attendance/${attendanceId}/correction`, { reason: "Verified fix", present: false }),
      attendanceId,
    );
    expect(response.status).toBe(200);
  });
});
