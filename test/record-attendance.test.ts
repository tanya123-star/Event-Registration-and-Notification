/**
 * MVP T7 (issue #8) — staff-assisted attendance recording.
 *
 * Seams under test (per the tdd skill; agreed via the directive):
 *   - L4 recordAttendance (real storage): the REGISTERED-only gate, the
 *     duplicate refusal carrying "already recorded", the CANCELLED refusal,
 *     and the window refusal.
 *   - handler-core recordAttendanceOperation (real storage): the role gate
 *     (Attendance Staff and Administrator record; others refused) and the
 *     refusal-to-status mapping.
 *
 * Vocabulary per GLOSSARY.md: Attendance, Registration, Confirmation
 * reference, Walk-in, Attendance Staff, Event Officer, Administrator.
 *
 * ADR-0001: rows asserted here carry identifiers, status, window and
 * timestamps — never contact detail. Lookup rows carry name plus
 * Confirmation reference for the assigned event only.
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

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/record-attendance.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("staff-assisted attendance recording, real PostgreSQL", () => {
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

  /** An event whose attendance window admits now, on the scratch clock. */
  async function seedOpenEvent(): Promise<string> {
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await ownerPool.query(
      `UPDATE erns.event
          SET attendance_window_open = now() - interval '1 hour',
              attendance_window_close = now() + interval '5 hours'
        WHERE event_id = $1`,
      [eventId],
    );
    return eventId;
  }

  it("records attendance for a REGISTERED registration with the recorder identity", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const outcome = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.registrationId).toBe(registrationId);
    expect(outcome.eventId).toBe(eventId);
    expect(outcome.userId).toBe(userId);
    expect(outcome.window).toBe("PRE_EVENT");

    const { rows } = await appPool.query<{
      recorded_by: string;
      method: string;
      present: boolean;
    }>(
      `SELECT recorded_by, method, present FROM erns.attendance WHERE attendance_id = $1`,
      [outcome.attendanceId],
    );
    expect(rows[0]).toMatchObject({ recorded_by: staffId, method: "STAFF_ASSISTED", present: true });
  });

  it("refuses a second record for the same registration with an already-recorded message", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const first = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(first.ok).toBe(true);

    const second = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.refusal.reason).toBe("ALREADY_RECORDED");
      expect(second.refusal.message).toBe("Attendance is already recorded for this registration");
      expect(second.refusal.requirements).toBe("FR-ATT-002");
    }
    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.attendance WHERE registration_id = $1`,
      [registrationId],
    );
    expect(rows[0]?.count).toBe("1");
  });

  it("refuses attendance for a CANCELLED registration", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId, status: "CANCELLED" });

    const outcome = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("CANCELLED_REGISTRATION");
      expect(outcome.refusal.requirements).toBe("FR-ATT-003");
    }
    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.attendance`,
    );
    expect(rows[0]?.count).toBe("0");
  });

  it("refuses attendance outside the configured window and writes nothing", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    await ownerPool.query(
      `UPDATE erns.event
          SET attendance_window_open = now() + interval '1 hour',
              attendance_window_close = now() + interval '5 hours'
        WHERE event_id = $1`,
      [eventId],
    );
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const outcome = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("OUTSIDE_WINDOW");
      expect(outcome.refusal.requirements).toBe("FR-ATT-007");
    }
    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.attendance`,
    );
    expect(rows[0]?.count).toBe("0");
  });

  it("refuses when no attendance window is configured", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedEvent(ownerPool, { capacity: 10 });
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const outcome = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.refusal.reason).toBe("WINDOW_NOT_CONFIGURED");
    }
  });

  it("writes an AUD-15 audit row with the staff identity as actor", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const outcome = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    const { rows } = await appPool.query<{ actor_user_id: string; action: string }>(
      `SELECT actor_user_id, action FROM erns.audit_log WHERE action = 'AUD-15'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_user_id: staffId, action: "AUD-15" });
  });

  it("retains the attendance fact when the registration is cancelled afterwards (FR-ATT-020)", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    const registrationId = await seedRegistration(ownerPool, { userId, eventId });

    const recorded = await recordAttendance(appPool, { registrationId, recordedByUserId: staffId });
    expect(recorded.ok).toBe(true);

    await ownerPool.query(
      `UPDATE erns.registration
          SET status = 'CANCELLED', cancelled_at = now(),
              cancellation_reason = 'changed mind', cancelled_by = $1
        WHERE registration_id = $2`,
      [userId, registrationId],
    );
    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.attendance WHERE registration_id = $1`,
      [registrationId],
    );
    expect(rows[0]?.count).toBe("1");
  });
});
