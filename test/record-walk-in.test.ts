/**
 * MVP T7 (issue #8) — walk-in exception recording.
 *
 * Seams under test (per the tdd skill; agreed via the directive):
 *   - L4 recordWalkIn (real storage): the mandatory reason, the window
 *     refusal, and the apart-from-registrants counting.
 *
 * Vocabulary per GLOSSARY.md: Walk-in, Attendance, Event, Attendance Staff.
 *
 * Requirements covered:
 *   - ATTENDANCE-WORKFLOW.md section 3.1: the documented exception — reason
 *     recorded, staff attributed, counted separately, audited, and never
 *     merged into the registered count (ATT-13).
 *   - FR-ATT-018: no walk-in creates a registration.
 *
 * Issue #8 acceptance criterion: "Walk-in without a reason is refused; with
 * a reason is counted apart from registrants."
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
import { recordWalkIn } from "../src/l4/record-walk-in.js";
import { getAttendanceCounts } from "../src/l4/attendance-reads.js";

const configured = isDatabaseConfigured();

if (!configured) {
  console.error(`\n[SKIPPED] test/record-walk-in.test.ts — ${skipReason()}\n`);
}

describe.skipIf(!configured)("walk-in exception recording, real PostgreSQL", () => {
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

  it("refuses a walk-in without a reason and writes nothing", async () => {
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();

    for (const reason of [undefined, "", "   "]) {
      const outcome = await recordWalkIn(appPool, {
        eventId,
        recordedByUserId: staffId,
        reason: reason as string | undefined,
      });
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) {
        expect(outcome.refusal.reason).toBe("MISSING_REASON");
      }
    }
    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.walk_in`,
    );
    expect(rows[0]?.count).toBe("0");
  });

  it("records a walk-in with a reason, attributed to the staff member", async () => {
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();

    const outcome = await recordWalkIn(appPool, {
      eventId,
      recordedByUserId: staffId,
      reason: "Door guest, no prior registration",
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.eventId).toBe(eventId);

    const { rows } = await appPool.query<{ recorded_by: string; reason: string }>(
      `SELECT recorded_by, reason FROM erns.walk_in WHERE walk_in_id = $1`,
      [outcome.walkInId],
    );
    expect(rows[0]).toMatchObject({
      recorded_by: staffId,
      reason: "Door guest, no prior registration",
    });
  });

  it("counts the walk-in apart from registrants and never creates a registration (FR-ATT-018, ATT-13)", async () => {
    const userId = await seedUser(ownerPool);
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();
    await seedRegistration(ownerPool, { userId, eventId });

    const recorded = await recordWalkIn(appPool, {
      eventId,
      recordedByUserId: staffId,
      reason: "Door guest",
    });
    expect(recorded.ok).toBe(true);

    const counts = await getAttendanceCounts(appPool, eventId);
    expect(counts).toMatchObject({
      eventId,
      registeredCount: 1,
      presentCount: 0,
      absentCount: 1,
      walkInCount: 1,
    });

    const { rows } = await appPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM erns.registration WHERE event_id = $1`,
      [eventId],
    );
    expect(rows[0]?.count).toBe("1");
  });

  it("writes an AUD-15 audit row for the walk-in", async () => {
    const staffId = await seedUser(ownerPool);
    const eventId = await seedOpenEvent();

    const outcome = await recordWalkIn(appPool, {
      eventId,
      recordedByUserId: staffId,
      reason: "Door guest",
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    const { rows } = await appPool.query<{ actor_user_id: string; action: string; entity_type: string }>(
      `SELECT actor_user_id, action, entity_type FROM erns.audit_log WHERE action = 'AUD-15'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_user_id: staffId, action: "AUD-15", entity_type: "WalkIn" });
  });
});
